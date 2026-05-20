import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { Movie, POSTER_BASE_URL } from '../types';
import { movieApi } from '../services/api';
import { X, Search, Plus, Trash2, ShieldCheck, LogIn, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ADMIN_EMAILS = ['robsonbatista3@gmail.com', 'rbvideos0441@gmail.com'];

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaList, setMediaList] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form State
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedResult, setSelectedResult] = useState<Movie | null>(null);
  const [managingEpisodesFor, setManagingEpisodesFor] = useState<Movie | null>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  
  // Custom Subscription and User management state
  const [activeTab, setActiveTab] = useState<'content' | 'users'>('content');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  const [newEpisode, setNewEpisode] = useState({
    title: '',
    season_number: 1,
    episode_number: 1,
    video_url: '',
    overview: ''
  });

  const [selectedCategory, setSelectedCategory] = useState('movie');
  const [isFeatured, setIsFeatured] = useState(false);

  const [manualData, setManualData] = useState({
    title: '',
    overview: '',
    poster_path: '',
    backdrop_path: '',
    media_type: 'movie' as 'movie' | 'tv' | 'anime'
  });

  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Custom Confirmation Dialog State
  const [confirmation, setConfirmation] = useState<{
    id: string;
    mediaId?: string; // only for episodes
    title: string;
    type: 'media' | 'episode';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4500);
  };

  const fetchWhatsappConfig = async () => {
    try {
      const snap = await getDoc(doc(db, 'app_config', 'settings'));
      if (snap.exists() && snap.data().whatsappNumber) {
        setWhatsappNumber(snap.data().whatsappNumber);
      } else {
        setWhatsappNumber('5511999999999');
      }
    } catch (err: any) {
      const errStr = (err?.message || err?.toString() || '').toLowerCase();
      if (errStr.includes('offline') || errStr.includes('failed to get document') || errStr.includes('unavailable')) {
        console.warn('Could not fetch whatsapp config (offline fallback applied):', err);
      } else {
        console.error('Error fetching whatsapp config:', err);
      }
    }
  };

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(list);
    } catch (err: any) {
      const errStr = (err?.message || err?.toString() || '').toLowerCase();
      if (errStr.includes('offline') || errStr.includes('failed to get document') || errStr.includes('unavailable')) {
        console.warn('Could not fetch users (offline fallback applied):', err);
      } else {
        console.error('Error fetching users:', err);
      }
    }
  };

  const saveWhatsappConfig = async () => {
    setSavingWhatsapp(true);
    try {
      const configRef = doc(db, 'app_config', 'settings');
      await setDoc(configRef, { whatsappNumber: whatsappNumber }, { merge: true });
      showToast('NÚMERO DO WHATSAPP DE VENDAS ATUALIZADO!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao atualizar número do WhatsApp.', 'error');
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const activateUserSubscription = async (userId: string, email: string, currentMaxScreens?: number) => {
    try {
      const docRef = doc(db, 'users', userId);
      // set 30 days from now
      const activeUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;
      await setDoc(docRef, {
        subscriptionStatus: 'active',
        subscriptionActiveUntil: activeUntil,
        maxScreens: currentMaxScreens || 1
      }, { merge: true });
      
      showToast(`ACESSO DE 30 DIAS ATIVADO PARA: ${email}`, 'success');
      fetchUsers(); // reload list
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao ativar assinatura do usuário.', 'error');
    }
  };

  const deactivateUserSubscription = async (userId: string, email: string) => {
    try {
      const docRef = doc(db, 'users', userId);
      await setDoc(docRef, {
        subscriptionStatus: 'inactive',
        subscriptionActiveUntil: 0
      }, { merge: true });
      
      showToast(`ACESSO SUSPENSO PARA: ${email}`, 'success');
      fetchUsers(); // reload list
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao suspender assinatura.', 'error');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u && u.email && ADMIN_EMAILS.includes(u.email)) {
        fetchCustomMedia();
        fetchWhatsappConfig();
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && user.email && ADMIN_EMAILS.includes(user.email) && activeTab === 'users') {
      fetchUsers();
    }
  }, [user, activeTab]);

  const fetchEpisodes = async (mediaId: string) => {
    let list: any[] = [];
    try {
      const querySnapshot = await getDocs(collection(db, 'custom_media', mediaId, 'episodes'));
      list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err: any) {
      const errStr = (err?.message || err?.toString() || '').toLowerCase();
      if (errStr.includes('offline') || errStr.includes('failed to get document') || errStr.includes('unavailable')) {
        console.warn('Could not fetch episodes (offline fallback applied):', err);
      } else {
        console.error('Error fetching episodes:', err);
      }
    }

    // Load local episodes fallback
    try {
      const localEpSaved = localStorage.getItem('local_episodes');
      if (localEpSaved) {
        const localEpMap = JSON.parse(localEpSaved);
        const localEps = localEpMap[mediaId] || [];
        localEps.forEach((localEp: any) => {
          if (!list.some(ep => ep.id === localEp.id || (ep.episode_number === localEp.episode_number && ep.season_number === localEp.season_number))) {
            list.push(localEp);
          }
        });
      }
    } catch (e) {
      console.error('Error loading local episodes:', e);
    }

    // Sort by season and episode number
    list.sort((a: any, b: any) => {
      if (a.season_number !== b.season_number) return a.season_number - b.season_number;
      return a.episode_number - b.episode_number;
    });
    setEpisodes(list);
  };

  const addEpisode = async () => {
    if (!managingEpisodesFor || !newEpisode.video_url) return;
    const mediaId = managingEpisodesFor.id as string;
    const epDocRef = doc(collection(db, 'custom_media', mediaId, 'episodes'));
    const epId = epDocRef.id;

    const newLocalEp = {
      id: epId,
      ...newEpisode,
      created_at: { toMillis: () => Date.now(), seconds: Math.floor(Date.now() / 1000) }
    };

    // Save to localStorage as immediate offline cache
    try {
      const localEpSaved = localStorage.getItem('local_episodes') || '{}';
      const localEpMap = JSON.parse(localEpSaved);
      if (!localEpMap[mediaId]) {
        localEpMap[mediaId] = [];
      }
      localEpMap[mediaId].push(newLocalEp);
      localStorage.setItem('local_episodes', JSON.stringify(localEpMap));
    } catch (e) {
      console.error('Error saving local episode:', e);
    }

    // Write to Firestore asynchronously if connected
    setDoc(epDocRef, {
      ...newEpisode,
      created_at: serverTimestamp()
    })
      .then(() => {
        console.log('Episódio sincronizado com o Firestore com sucesso!');
      })
      .catch((err: any) => {
        console.warn('Firestore setDoc for episode failed, but saved locally:', err);
        const errStr = (err?.message || err?.toString() || '').toLowerCase();
        if (errStr.includes('permission')) {
          showToast('Permissão insuficiente no Firestore para salvar online.', 'success');
        }
      });

    setNewEpisode({
      title: '',
      season_number: 1,
      episode_number: episodes.length > 0 ? (episodes[episodes.length - 1].episode_number + 1) : 1,
      video_url: '',
      overview: ''
    });
    showToast('Episódio adicionado com sucesso!', 'success');
    await fetchEpisodes(mediaId);
  };

  const requestDeleteEpisode = (mediaId: string, episodeId: string, episodeTitle: string) => {
    setConfirmation({
      id: episodeId,
      mediaId,
      title: episodeTitle,
      type: 'episode'
    });
  };

  const requestDeleteMedia = (mediaId: string, mediaTitle: string) => {
    setConfirmation({
      id: mediaId,
      title: mediaTitle,
      type: 'media'
    });
  };

  const executeDelete = async () => {
    if (!confirmation) return;
    const { id, mediaId, type } = confirmation;
    setConfirmation(null); // Clear confirmation state to close modal immediately

    if (type === 'episode' && mediaId) {
      console.log(`Deletando episódio CONFIRMADO: mediaId=${mediaId}, episodeId=${id}`);
      
      // Delete from localStorage
      try {
        const localEpSaved = localStorage.getItem('local_episodes');
        if (localEpSaved) {
          const localEpMap = JSON.parse(localEpSaved);
          if (localEpMap[mediaId]) {
            localEpMap[mediaId] = localEpMap[mediaId].filter((ep: any) => ep.id !== id);
            localStorage.setItem('local_episodes', JSON.stringify(localEpMap));
          }
        }
      } catch (e) {
        console.error('Error deleting local episode:', e);
      }

      // Delete from Firestore asynchronously if it is not a local-only segment
      if (!id.startsWith('local_')) {
        deleteDoc(doc(db, 'custom_media', mediaId, 'episodes', id))
          .then(() => {
            console.log('Sucesso ao excluir episódio no Firestore');
          })
          .catch((err: any) => {
            console.warn('Erro ao excluir episódio no Firestore (já excluído localmente):', err);
          });
      }
      showToast('Episódio excluído com sucesso!', 'success');
      await fetchEpisodes(mediaId);
    } else if (type === 'media') {
      console.log(`Deletando mídia CONFIRMADA: id=${id}`);
      
      // Delete from localStorage
      try {
        const localSaved = localStorage.getItem('local_custom_media');
        if (localSaved) {
          const localCustom = JSON.parse(localSaved);
          const filtered = localCustom.filter((m: any) => m.id !== id);
          localStorage.setItem('local_custom_media', JSON.stringify(filtered));
        }
      } catch (e) {
        console.error('Error deleting local custom media:', e);
      }

      // Delete from Firestore asynchronously if it is not a local-only segment
      if (!id.startsWith('local_')) {
        deleteDoc(doc(db, 'custom_media', id))
          .then(() => {
            console.log('Sucesso ao excluir mídia no Firestore');
          })
          .catch((err: any) => {
            console.warn('Erro ao excluir mídia no Firestore (já excluído localmente):', err);
          });
      }
      showToast('Mídia excluída com sucesso!', 'success');
      await fetchCustomMedia();
    }
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCustomMedia = async () => {
    let list: Movie[] = [];
    try {
      const querySnapshot = await getDocs(collection(db, 'custom_media'));
      list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Movie[];
    } catch (err: any) {
      const errStr = (err?.message || err?.toString() || '').toLowerCase();
      if (errStr.includes('offline') || errStr.includes('failed to get document') || errStr.includes('unavailable')) {
        console.warn('Could not fetch custom media (offline fallback applied):', err);
      } else {
        console.error("Fetch Custom Media Error:", err);
      }
    }

    // Load local custom media fallback
    let localCustom: Movie[] = [];
    try {
      const localSaved = localStorage.getItem('local_custom_media');
      if (localSaved) {
        localCustom = JSON.parse(localSaved);
      }
    } catch (e) {
      console.error('Error loading local custom media:', e);
    }

    // Merge custom from Firestore with localCustom, avoiding duplicates
    const mergedList = [...list];
    localCustom.forEach((localMovie) => {
      if (!mergedList.some(m => m.id === localMovie.id || (m.title && m.title === localMovie.title) || (m.name && m.name === localMovie.name))) {
        mergedList.push(localMovie);
      }
    });

    // Sort by created_at descending
    mergedList.sort((a: any, b: any) => {
      const timeA = a.created_at?.toMillis?.() || a.created_at?.seconds * 1000 || 0;
      const timeB = b.created_at?.toMillis?.() || b.created_at?.seconds * 1000 || 0;
      return timeB - timeA;
    });

    setMediaList(mergedList);
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const results = await movieApi.search(searchQuery);
      const resultsList = Array.isArray(results) ? results : [];
      setSearchResults(resultsList.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv' || r.media_type === 'anime'));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const addMedia = async () => {
    const isEpisodic = isManualMode ? 
      (manualData.media_type === 'tv' || manualData.media_type === 'anime') : 
      (selectedResult?.media_type === 'tv' || selectedResult?.media_type === 'anime' || !selectedResult?.title);
    
    if (isManualMode) {
      if (!manualData.title) {
        showToast('Por favor, insira o título.', 'error');
        return;
      }
      if (!videoUrl && !isEpisodic) {
        showToast('A URL do vídeo é obrigatória para filmes.', 'error');
        return;
      }
    } else {
      if (!selectedResult) {
        showToast('Nenhum título selecionado.', 'error');
        return;
      }
      if (!videoUrl && !isEpisodic) {
        showToast('A URL do vídeo é obrigatória para filmes.', 'error');
        return;
      }
    }
    
    const rawMediaData = isManualMode ? {
      ...manualData,
      category: selectedCategory,
      is_featured: isFeatured,
      video_url: videoUrl,
      is_custom: true,
      created_at: null,
      tmdb_id: null
    } : {
      title: selectedResult!.title || null,
      name: selectedResult!.name || null,
      overview: selectedResult!.overview || null,
      poster_path: selectedResult!.poster_path || null,
      backdrop_path: selectedResult!.backdrop_path || null,
      vote_average: selectedResult!.vote_average || null,
      media_type: selectedResult!.media_type || (selectedResult!.title ? 'movie' : 'tv'),
      category: selectedCategory,
      is_featured: isFeatured,
      video_url: videoUrl,
      is_custom: true,
      created_at: null,
      tmdb_id: selectedResult!.id || null
    };

    // Sanitize any remaining undefined properties to null for Firestore safety
    const mediaData: any = {};
    Object.keys(rawMediaData).forEach(key => {
      mediaData[key] = (rawMediaData as any)[key] === undefined ? null : (rawMediaData as any)[key];
    });

    const customDocRef = doc(collection(db, 'custom_media'));
    const mediaId = customDocRef.id;

    const newLocalItem = {
      ...mediaData,
      id: mediaId,
      created_at: { toMillis: () => Date.now(), seconds: Math.floor(Date.now() / 1000) }
    };

    // Prepend to localStorage immediately for instant offline update
    try {
      const localSaved = localStorage.getItem('local_custom_media');
      const localCustom = localSaved ? JSON.parse(localSaved) : [];
      localCustom.unshift(newLocalItem);
      localStorage.setItem('local_custom_media', JSON.stringify(localCustom));
    } catch (e) {
      console.error('Error saving local custom media:', e);
    }

    // Attempt to upload online asynchronously
    const firestoreMediaData = {
      ...mediaData,
      created_at: serverTimestamp()
    };
    setDoc(customDocRef, firestoreMediaData)
      .then(() => {
        console.log('Mídia sincronizada com o Firestore com sucesso!');
      })
      .catch((err: any) => {
        console.warn('Firestore setDoc for media failed, but saved locally:', err);
        const errStr = (err?.message || err?.toString() || '').toLowerCase();
        if (errStr.includes('permission')) {
          showToast('Permissão insuficiente no Firestore para salvar online.', 'success');
        }
      });

    setSelectedResult(null);
    setVideoUrl('');
    setSearchQuery('');
    setSearchResults([]);
    setManualData({ title: '', overview: '', poster_path: '', backdrop_path: '', media_type: 'movie' });
    await fetchCustomMedia();
    showToast('Mídia adicionada com sucesso!', 'success');
  };

  if (loading) return null;

  if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
    return (
      <div className="fixed inset-0 z-[200] bg-surface-900 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-surface-800 p-10 rounded-2xl border border-white/5 text-center">
          <div className="w-20 h-20 bg-brand/20 text-brand rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter">Painel Restrito</h2>
          <p className="text-gray-400 mb-8">Apenas administradores podem acessar esta área para gerenciar o conteúdo.</p>
          <button 
            onClick={login}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform cursor-pointer"
          >
            <LogIn size={20} />
            {user ? 'TROCAR DE CONTA' : 'LOGIN COM GOOGLE'}
          </button>
          
          {user && (
            <button 
              onClick={() => auth.signOut()}
              className="mt-6 text-xs text-red-500 font-bold hover:underline"
            >
              SAIR DA CONTA ATUAL
            </button>
          )}

          <div className="mt-8 pt-8 border-t border-white/5">
             <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-sm">Voltar para o Início</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-surface-900 overflow-y-auto">
      <nav className="sticky top-0 bg-surface-800/80 backdrop-blur-md border-b border-white/5 p-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center text-white font-black">AD</div>
          <div>
            <h1 className="font-bold text-white uppercase tracking-wider">Painel Administrativo</h1>
            <p className="text-xs text-brand font-bold">{user.email}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
          <X size={24} />
        </button>
      </nav>

      <div className="p-8 max-w-6xl mx-auto space-y-12">
        {/* Tab Selection */}
        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 w-fit mx-auto mb-4 relative z-10">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'content' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-gray-400 hover:text-white'}`}
          >
            📺 Conteúdo
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'users' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-gray-400 hover:text-white'}`}
          >
            👥 Usuários & Assinaturas
          </button>
        </div>

        {activeTab === 'content' ? (
          <>
            {/* Step 1: Add Content */}
            <section className="bg-surface-800 rounded-2xl p-8 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-3">
               <Plus className="text-brand" /> Adicionar Filme ou Série
            </h2>
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setIsManualMode(false)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!isManualMode ? 'bg-brand text-white' : 'text-gray-500 hover:text-white'}`}
              >
                BUSCAR TMDB
              </button>
              <button 
                onClick={() => setIsManualMode(true)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isManualMode ? 'bg-brand text-white' : 'text-gray-500 hover:text-white'}`}
              >
                ENTRADA MANUAL
              </button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-6">
              {!isManualMode ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">1. Buscar no TMDB</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Ex: Matrix, Breaking Bad..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors text-sm"
                      />
                      <button onClick={handleSearch} className="px-6 bg-brand text-white font-bold rounded-xl hover:brightness-110 cursor-pointer">
                        <Search size={20} />
                      </button>
                    </div>
                  </div>

                  {searchResults.length > 0 && !selectedResult && (
                    <div className="bg-black/20 rounded-xl max-h-[300px] overflow-y-auto p-2 space-y-2 border border-white/5">
                      {searchResults.map(result => (
                        <button 
                          key={result.id}
                          onClick={() => setSelectedResult(result)}
                          className="w-full flex gap-4 p-2 hover:bg-white/5 rounded-lg text-left transition-colors items-center"
                        >
                          <img src={`${POSTER_BASE_URL}${result.poster_path}`} className="w-12 h-16 object-cover rounded shadow" />
                          <div>
                            <p className="font-bold text-sm">{result.title || result.name}</p>
                            <p className="text-[10px] text-gray-500 uppercase">
                              {result.media_type === 'anime' ? 'Anime' : result.media_type === 'tv' ? 'Série' : 'Filme'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedResult && (
                    <div className="bg-brand/5 border border-brand/20 p-6 rounded-2xl relative">
                      <button onClick={() => setSelectedResult(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={16} /></button>
                      <div className="flex gap-4 mb-4">
                        <img src={`${POSTER_BASE_URL}${selectedResult.poster_path}`} className="w-16 h-24 object-cover rounded" />
                        <div>
                          <h3 className="font-black text-lg leading-tight">{selectedResult.title || selectedResult.name}</h3>
                          <p className="text-xs text-gray-400 mt-2 line-clamp-2">{selectedResult.overview}</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                          2. URL do Vídeo (M3U8 ou MP4) {(selectedResult.media_type === 'tv' || selectedResult.media_type === 'anime') && <span className="text-[10px] text-brand lowercase font-normal">(opcional para séries/animes)</span>}
                        </label>
                        <input 
                          type="text" 
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="https://suaplatyforma.com/video.m3u8"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">3. Categoria</label>
                          <select 
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand text-sm"
                          >
                            <option value="movie">Filmes</option>
                            <option value="tv">Séries</option>
                            <option value="kids">Kids</option>
                            <option value="anime">Anime</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">4. Destaque?</label>
                          <button 
                            onClick={() => setIsFeatured(!isFeatured)}
                            className={`w-full py-3 rounded-xl border font-bold text-[10px] uppercase transition-all ${isFeatured ? 'bg-brand/20 border-brand text-brand' : 'bg-black/20 border-white/5 text-gray-500'}`}
                          >
                            {isFeatured ? 'Sim, Destacar' : 'Não'}
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={addMedia}
                        disabled={!videoUrl && !(selectedResult?.media_type === 'tv' || selectedResult?.media_type === 'anime' || !selectedResult?.title)}
                        className="w-full mt-6 py-4 bg-brand text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
                      >
                        PUBLICAR AGORA
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Tipo de Mídia</label>
                    <div className="flex gap-2">
                      {['movie', 'tv', 'anime'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setManualData({...manualData, media_type: type as any})}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${manualData.media_type === type ? 'bg-brand border-brand text-white' : 'border-white/10 text-gray-400 hover:text-white'}`}
                        >
                          {type === 'movie' ? 'Filme' : type === 'tv' ? 'Série' : 'Anime'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Título</label>
                    <input 
                      type="text" 
                      value={manualData.title}
                      onChange={(e) => setManualData({...manualData, title: e.target.value})}
                      placeholder="Nome do Filme ou Série"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                      URL do Vídeo (M3U8 / MP4) {(manualData.media_type === 'tv' || manualData.media_type === 'anime') && <span className="text-[10px] text-brand lowercase font-normal">(opcional para séries/animes)</span>}
                    </label>
                    <input 
                      type="text" 
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://suaplatyforma.com/video.m3u8"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">URL do Poster (Opcional)</label>
                    <input 
                      type="text" 
                      value={manualData.poster_path}
                      onChange={(e) => setManualData({...manualData, poster_path: e.target.value})}
                      placeholder="https://imagem.com/poster.jpg"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Sinopse (Opcional)</label>
                    <textarea 
                      value={manualData.overview}
                      onChange={(e) => setManualData({...manualData, overview: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand text-sm h-24 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 my-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Categoria</label>
                      <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand text-xs"
                      >
                        <option value="movie">Filmes</option>
                        <option value="tv">Séries</option>
                        <option value="kids">Kids</option>
                        <option value="anime">Anime</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Destaque?</label>
                      <button 
                        onClick={() => setIsFeatured(!isFeatured)}
                        className={`w-full py-2 rounded-xl border font-bold text-[10px] uppercase transition-all ${isFeatured ? 'bg-brand/20 border-brand text-brand' : 'bg-black/20 border-white/5 text-gray-500'}`}
                      >
                        {isFeatured ? 'Sim' : 'Não'}
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={addMedia}
                    disabled={!manualData.title || (!videoUrl && !(manualData.media_type === 'tv' || manualData.media_type === 'anime'))}
                    className="w-full mt-2 py-4 bg-brand text-white font-bold rounded-xl disabled:opacity-50 hover:brightness-110 transition-all font-mono tracking-widest"
                  >
                    PUBLICAR MANUALMENTE
                  </button>
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center justify-center bg-black/20 rounded-2xl border border-dashed border-white/10 p-10 text-center">
               <div>
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
                     <Plus size={32} />
                  </div>
                  <p className="text-gray-500 text-sm">
                    {isManualMode 
                      ? "Preencha os campos ao lado para adicionar conteúdo que não está no TMDB."
                      : "Selecione um título do TMDB para importar metadados automáticos."}
                  </p>
               </div>
            </div>
          </div>
        </section>

        {/* Step 2: Manage Content */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold uppercase tracking-widest">Conteúdo Gerenciado ({mediaList.length})</h2>
            <button onClick={fetchCustomMedia} className="text-xs text-brand hover:underline font-bold">Atualizar Lista</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {mediaList.map((media) => (
              <div key={media.id} className="relative group bg-surface-800 rounded-xl overflow-hidden border border-white/5">
                <img 
                  src={`${POSTER_BASE_URL}${media.poster_path}`} 
                  className="w-full aspect-[2/3] object-cover" 
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${media.media_type === 'movie' ? 'bg-blue-500' : 'bg-green-500'}`}>
                      {media.media_type === 'movie' ? 'Filme' : 'Série'}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        requestDeleteMedia(media.id as string, media.title || media.name || 'Mídia sem título');
                      }}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
                      title="Excluir Mídia"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs truncate">{media.title || media.name}</h4>
                    <p className="text-[10px] text-gray-500 truncate mt-1">{media.video_url || 'Múltiplos Episódios'}</p>
                    
                    {(media.media_type === 'tv' || media.media_type === 'anime') && (
                      <button 
                        onClick={() => {
                          setManagingEpisodesFor(media);
                          fetchEpisodes(media.id as string);
                        }}
                        className="w-full mt-2 py-1.5 bg-brand/20 text-brand text-[10px] font-bold rounded-lg hover:bg-brand hover:text-white transition-all flex items-center justify-center gap-1"
                      >
                        <Plus size={12} /> EPISÓDIOS
                      </button>
                    )}

                    <a href={media.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-brand mt-2 hover:underline">
                      Abrir Link <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
          </>
        ) : (
          <div className="space-y-8">
            {/* WhatsApp Configuration */}
            <section className="bg-surface-800 rounded-2xl p-8 border border-white/5">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-2">
                 📲 WhatsApp para Cobrança / Atendimento
              </h2>
              <p className="text-xs text-gray-400 mb-6 max-w-2xl">
                Configure o número de WhatsApp que os usuários irão contatar para solicitar a ativação do plano. Digite apenas números com código de área (ex: 5511999999999).
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input 
                  type="text" 
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 5511999999999"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors text-sm font-mono"
                />
                <button 
                  onClick={saveWhatsappConfig}
                  disabled={savingWhatsapp}
                  className="px-6 py-3 bg-brand text-white font-bold rounded-xl hover:brightness-110 disabled:opacity-50 cursor-pointer text-xs uppercase tracking-wider transition-all"
                >
                  {savingWhatsapp ? 'Salvando...' : 'Salvar Número'}
                </button>
              </div>
            </section>

            {/* Users Directory */}
            <section className="bg-surface-800 rounded-2xl p-8 border border-white/5 pb-12">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-3">
                     👥 Usuários Cadastrados
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 pb-2">
                    Visualize todos os clientes cadastrados e ative os planos manuais de 30 dias após confirmação do Pix.
                  </p>
                </div>

                <div className="relative max-w-xs w-full">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Search size={16} />
                  </div>
                  <input 
                    type="text" 
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Buscar por e-mail ou nome..."
                    className="w-full bg-black/40 border border-white/10 focus:border-brand rounded-xl pl-10 pr-4 py-2.5 outline-none text-xs transition-all"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-white/5 bg-black/20">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-[10px] uppercase font-bold tracking-wider text-gray-400">
                      <th className="p-4">Nome / Email</th>
                      <th className="p-4">Cadastro</th>
                      <th className="p-4">Status da Assinatura</th>
                      <th className="p-4">Expira em</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(usersList) ? usersList : [])
                      .filter(u => {
                        const search = userSearchTerm.toLowerCase();
                        return (u.email || '').toLowerCase().includes(search) || 
                               (u.name || '').toLowerCase().includes(search);
                      })
                      .map(u => {
                        const isUserActive = u.subscriptionStatus === 'active' && u.subscriptionActiveUntil > Date.now();
                        const expiracyDate = u.subscriptionActiveUntil ? new Date(u.subscriptionActiveUntil) : null;
                        
                        let remainingDays = 0;
                        if (isUserActive && u.subscriptionActiveUntil) {
                          remainingDays = Math.ceil((u.subscriptionActiveUntil - Date.now()) / (1000 * 60 * 60 * 24));
                        }

                        return (
                          <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-white">{u.name || 'Sem nome'}</div>
                              <div className="text-[10px] text-gray-500">{u.email}</div>
                              <div className="mt-2 text-left">
                                <span className="text-[8px] uppercase font-black tracking-wider text-gray-500 mr-1.5">Telas:</span>
                                <select
                                  value={u.maxScreens || 1}
                                  onChange={async (e) => {
                                    const newVal = parseInt(e.target.value);
                                    try {
                                      await setDoc(doc(db, 'users', u.id), { maxScreens: newVal }, { merge: true });
                                      showToast(`Limite de ${newVal} tela(s) configurado para ${u.email}`, 'success');
                                      fetchUsers();
                                    } catch (err) {
                                      console.error(err);
                                      showToast('Erro ao atualizar limite de telas.', 'error');
                                    }
                                  }}
                                  className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-bold text-brand focus:outline-none focus:border-brand cursor-pointer"
                                >
                                  <option value={1} className="bg-surface-800 text-white">1 Tela (Básico)</option>
                                  <option value={2} className="bg-surface-800 text-white">2 Telas</option>
                                  <option value={3} className="bg-surface-800 text-white">3 Telas</option>
                                  <option value={4} className="bg-surface-800 text-white">4 Telas (Premium)</option>
                                  <option value={5} className="bg-surface-800 text-white">5 Telas</option>
                                </select>
                              </div>
                            </td>
                            <td className="p-4 text-xs text-gray-400">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : 'Desconhecido'}
                            </td>
                            <td className="p-4">
                              {isUserActive ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                                  ● Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full animate-pulse">
                                  ● Inativo
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-xs">
                              {isUserActive && expiracyDate ? (
                                <div className="text-gray-300">
                                  {expiracyDate.toLocaleDateString('pt-BR')} {expiracyDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  <div className="text-[10px] text-brand font-bold mt-0.5">{remainingDays} dia(s) restante(s)</div>
                                </div>
                              ) : (
                                <span className="text-gray-500">Sem plano liberado</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => activateUserSubscription(u.id, u.email, u.maxScreens || 1)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors shadow-lg cursor-pointer"
                                >
                                  Liberar 30 Dias
                                </button>
                                {isUserActive && (
                                  <button
                                    onClick={() => deactivateUserSubscription(u.id, u.email)}
                                    className="px-3 py-1.5 bg-surface-700 hover:bg-red-650 hover:text-white text-gray-400 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                                  >
                                    Remover
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {usersList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                          Nenhum usuário registrado ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Episode Management Overlay */}
      <AnimatePresence>
        {managingEpisodesFor && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] bg-black/95 flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface-800 w-full max-w-4xl max-h-[90vh] rounded-3xl border border-white/5 overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Episódios: {managingEpisodesFor.title || managingEpisodesFor.name}</h3>
                  <p className="text-xs text-brand font-bold uppercase tracking-widest mt-1">Gerenciar temporadas e capítulos</p>
                </div>
                <button 
                  onClick={() => setManagingEpisodesFor(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Add New Episode */}
                <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Plus size={16} className="text-brand" /> Adicionar Novo Episódio
                  </h4>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Temporada</label>
                      <input 
                        type="number" 
                        value={newEpisode.season_number}
                        onChange={(e) => setNewEpisode({...newEpisode, season_number: parseInt(e.target.value)})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Episódio</label>
                      <input 
                        type="number" 
                        value={newEpisode.episode_number}
                        onChange={(e) => setNewEpisode({...newEpisode, episode_number: parseInt(e.target.value)})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Título (Opcional)</label>
                      <input 
                        type="text" 
                        value={newEpisode.title}
                        onChange={(e) => setNewEpisode({...newEpisode, title: e.target.value})}
                        placeholder="Ex: O Início"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">URL do Vídeo (M3U8 / MP4)</label>
                      <input 
                        type="text" 
                        value={newEpisode.video_url}
                        onChange={(e) => setNewEpisode({...newEpisode, video_url: e.target.value})}
                        placeholder="https://servidor.com/video.m3u8"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand"
                      />
                    </div>
                    <div className="md:col-span-4 flex justify-end">
                      <button 
                        onClick={addEpisode}
                        disabled={!newEpisode.video_url}
                        className="px-8 py-3 bg-brand text-white font-bold rounded-xl text-xs hover:brightness-110 transition-all disabled:opacity-50"
                      >
                        SALVAR EPISÓDIO
                      </button>
                    </div>
                  </div>
                </div>

                {/* Episodes List */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Lista de Episódios ({episodes.length})</h4>
                  <div className="space-y-2">
                    {episodes.map((ep) => (
                      <div key={ep.id} className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="w-12 h-12 bg-brand/20 text-brand rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                          S{ep.season_number} E{ep.episode_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{ep.title || `Episódio ${ep.episode_number}`}</p>
                          <p className="text-[10px] text-gray-500 truncate">{ep.video_url}</p>
                        </div>
                        <button 
                          onClick={() => requestDeleteEpisode(managingEpisodesFor.id as string, ep.id, ep.title || `Episódio ${ep.episode_number}`)}
                          className="p-2 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                          title="Excluir Episódio"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {episodes.length === 0 && (
                      <div className="py-12 text-center text-gray-500 italic text-sm">
                        Nenhum episódio cadastrado ainda.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border ${
              toast.type === 'success' 
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200' 
                : 'bg-red-950/95 border-red-500 text-red-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
            <span className="text-xs font-bold uppercase tracking-wider">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 text-white"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-surface-800 w-full max-w-sm border border-white/5 rounded-3xl overflow-hidden shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-600/15 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/10">
                <Trash2 size={28} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tighter mb-2">Confirmar Exclusão</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-6">
                Tem certeza que deseja excluir <strong className="text-white">"{confirmation.title}"</strong>?<br/>
                Esta ação é permanente e não poderá ser revertida.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmation(null)}
                  className="flex-1 py-3 border border-white/10 rounded-xl font-bold text-xs hover:bg-white/5 text-gray-400 hover:text-white transition-all uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <Trash2 size={14} /> Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
