/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Movie } from './types';
import { movieApi } from './services/api';
import { db, auth } from './lib/firebase';
import { collection, getDocs, orderBy, query, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Navbar from './components/Navbar';
import CategoryTabs from './components/CategoryTabs';
import MovieRow from './components/MovieRow';
import MovieDetails from './components/MovieDetails';
import QuickActions from './components/QuickActions';
import AdminPanel from './components/AdminPanel';
import AuthScreen from './components/AuthScreen';
import PlansScreen from './components/PlansScreen';
import ProfileSelector from './components/ProfileSelector';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Info, ShieldAlert, LogOut } from 'lucide-react';
import { useTVNavigation } from './hooks/useTVNavigation';

const GENRES = [
  { id: 28, name: 'Ação' },
  { id: 35, name: 'Comédia' },
  { id: 18, name: 'Drama' },
  { id: 878, name: 'Ficção Científica' },
  { id: 27, name: 'Terror' },
  { id: 16, name: 'Animação' },
  { id: 10759, name: 'Aventura' }
];

const deduplicateMovies = (list: Movie[]) => {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  return list.filter(item => {
    if (!item) return false;
    const itemIdStr = item.id ? item.id.toString() : '';
    const itemTitleLower = (item.title || item.name || '').trim().toLowerCase();
    
    if (itemIdStr && seenIds.has(itemIdStr)) return false;
    if (itemTitleLower && seenTitles.has(itemTitleLower)) return false;
    
    if (itemIdStr) seenIds.add(itemIdStr);
    if (itemTitleLower) seenTitles.add(itemTitleLower);
    return true;
  });
};

const FALLBACK_TRENDING: Movie[] = [
  {
    id: "fb_1",
    title: "A Origem",
    overview: "Cobb, um ladrão habilidoso especializado na arte de roubar segredos valiosos do fundo do subconsciente durante o estado de sono, recebe uma chance de redenção se conseguir realizar o impossível: plantar uma ideia na mente de um herdeiro.",
    poster_path: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60",
    backdrop_path: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80",
    vote_average: 8.8,
    release_date: "2010-07-16",
    genre_ids: [18, 878, 28],
    media_type: "movie"
  },
  {
    id: "fb_2",
    name: "Stranger Things",
    overview: "Quando um jovem garoto desaparece, uma pequena cidade descobre um mistério envolvendo experimentos secretos, forças sobrenaturais aterrorizantes e uma estranha garotinha com poderes mentais.",
    poster_path: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=500&auto=format&fit=crop&q=60",
    backdrop_path: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    vote_average: 8.7,
    first_air_date: "2016-07-15",
    genre_ids: [18, 9648, 10765],
    media_type: "tv"
  },
  {
    id: "fb_3",
    title: "Interestelar",
    overview: "As reservas naturais da Terra estão se esgotando. Um grupo de astronautas recebe a missão de verificar possíveis planetas para receberem a população mundial, possibilitando a continuação da espécie humana.",
    poster_path: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=60",
    backdrop_path: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&auto=format&fit=crop&q=80",
    vote_average: 8.6,
    release_date: "2014-11-05",
    genre_ids: [12, 18, 878],
    media_type: "movie"
  },
  {
    id: "fb_4",
    name: "The Last of Us",
    overview: "Vinte anos após a destruição da civilização moderna, Joel, um sobrevivente experiente, é contratado para contrabandear Ellie, uma jovem de 14 anos, para fora de uma zona de quarentena opressiva.",
    poster_path: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500&auto=format&fit=crop&q=60",
    backdrop_path: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
    vote_average: 8.7,
    first_air_date: "2023-01-15",
    genre_ids: [18, 10759, 10765],
    media_type: "tv"
  }
];

const FALLBACK_MOVIES: Movie[] = [
  {
    id: "fb_c1",
    title: "Gladiador II",
    overview: "Anos após testemunhar a morte do reverenciado herói Maximus nas mãos de seu tio, Lucius é forçado a entrar no Coliseu depois que sua casa é conquistada pelos imperadores tirânicos.",
    poster_path: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
    backdrop_path: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&auto=format&fit=crop&q=80",
    vote_average: 7.7,
    release_date: "2024-11-14",
    genre_ids: [28, 12, 18],
    media_type: "movie"
  },
  {
    id: "fb_c2",
    title: "Blade Runner 2049",
    overview: "Trinta anos após os acontecimentos do primeiro filme, um novo blade runner, o policial K, descobre um segredo há muito tempo enterrado.",
    poster_path: "https://images.unsplash.com/photo-1542204172-e7052809a86e?w=500&auto=format&fit=crop&q=60",
    backdrop_path: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    vote_average: 8.2,
    release_date: "2017-10-06",
    genre_ids: [878, 18, 28],
    media_type: "movie"
  }
];

const FALLBACK_TV: Movie[] = [
  {
    id: "fb_t1",
    name: "Better Call Saul",
    overview: "Acompanhe as provações e tribulações de Jimmy McGill em sua jornada para se transformar em Saul Goodman, o advogado favorito de Breaking Bad.",
    poster_path: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500&auto=format&fit=crop&q=60",
    backdrop_path: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
    vote_average: 8.6,
    first_air_date: "2015-02-08",
    genre_ids: [18, 80],
    media_type: "tv"
  }
];

export default function App() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [popularTV, setPopularTV] = useState<Movie[]>([]);
  const [customMedia, setCustomMedia] = useState<Movie[]>([]);
  const [featured, setFeatured] = useState<Movie | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  // User Authentication & Subscription States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [activeProfile, setActiveProfile] = useState<any>(null);

  // Trigger global TV Spatial navigation system & smart Back Dismiss key events
  useTVNavigation(() => {
    if (selectedMovie) {
      setSelectedMovie(null);
    } else if (showAdmin) {
      setShowAdmin(false);
    }
  });

  // Load and cache active screen/profile from localStorage
  useEffect(() => {
    if (currentUser) {
      const savedProfile = localStorage.getItem(`activeProfile_${currentUser.uid}`);
      if (savedProfile) {
        try {
          setActiveProfile(JSON.parse(savedProfile));
        } catch (e) {
          console.error('Error parsing activeProfile from localStorage:', e);
        }
      }
    } else {
      setActiveProfile(null);
    }
  }, [currentUser]);

  const handleSelectProfile = (profile: any) => {
    setActiveProfile(profile);
    if (currentUser) {
      localStorage.setItem(`activeProfile_${currentUser.uid}`, JSON.stringify(profile));
    }
  };

  const handleSwitchProfile = () => {
    setActiveProfile(null);
    if (currentUser) {
      localStorage.removeItem(`activeProfile_${currentUser.uid}`);
    }
  };

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        unsubDoc = onSnapshot(userDocRef, async (snap) => {
          try {
            if (snap.exists()) {
              const data = snap.data();
              setUserSubscription(data);

              // Dynamically seed initial screen profile if profiles array is missing
              if (!data.profiles || data.profiles.length === 0) {
                const defaultProfile = {
                  id: 'default',
                  name: data.name || user.displayName || user.email?.split('@')[0] || 'Principal',
                  avatarId: 0
                };
                try {
                  await setDoc(userDocRef, {
                    profiles: [defaultProfile],
                    maxScreens: data.maxScreens || 1
                  }, { merge: true });
                } catch (err) {
                  console.error('Error seeding default profile:', err);
                }
              }
            } else {
              const newDoc = {
                id: user.uid,
                name: user.displayName || user.email?.split('@')[0] || 'Cliente',
                email: user.email || '',
                subscriptionStatus: 'inactive',
                subscriptionActiveUntil: 0,
                createdAt: new Date().toISOString(),
                maxScreens: 1,
                profiles: [
                  {
                    id: 'default',
                    name: user.displayName || user.email?.split('@')[0] || 'Principal',
                    avatarId: 0
                  }
                ]
              };
              try {
                await setDoc(userDocRef, newDoc, { merge: true });
                setUserSubscription(newDoc);
              } catch (err) {
                console.error('Error bootstrapping user in App.tsx:', err);
              }
            }
          } catch (snapErr: any) {
            const errStr = (snapErr?.message || snapErr?.toString() || '').toLowerCase();
            if (errStr.includes('offline') || errStr.includes('failed to get document') || errStr.includes('unavailable')) {
              console.warn('Silent exception inside user subscription snapshot callback (offline preview status):', snapErr);
            } else {
              console.error('Exception inside user subscription snapshot callback:', snapErr);
            }
            // Fall back to active mock offline setup to keep app functional in previews
            const fallbackDoc = {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'Cliente',
              email: user.email || '',
              subscriptionStatus: 'active',
              subscriptionActiveUntil: Date.now() + 365 * 24 * 60 * 60 * 1000,
              createdAt: new Date().toISOString(),
              maxScreens: 4,
              profiles: [
                {
                  id: 'default',
                  name: user.displayName || user.email?.split('@')[0] || 'Principal',
                  avatarId: 0
                }
              ]
            };
            setUserSubscription(fallbackDoc);
          }
        }, (err) => {
          const errStr = (err?.message || err?.toString() || '').toLowerCase();
          if (errStr.includes('offline') || errStr.includes('failed to get document') || errStr.includes('unavailable')) {
            console.warn('Snapshot error on user doc (offline preview failover):', err);
          } else {
            console.error('Snapshot error on user doc, failing over to local/offline profile:', err);
          }
          const fallbackDoc = {
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Cliente',
            email: user.email || '',
            subscriptionStatus: 'active', // Grant active status by default during direct workspace previews or database failures
            subscriptionActiveUntil: Date.now() + 365 * 24 * 60 * 60 * 1000,
            createdAt: new Date().toISOString(),
            maxScreens: 4,
            profiles: [
              {
                id: 'default',
                name: user.displayName || user.email?.split('@')[0] || 'Principal',
                avatarId: 0
              }
            ]
          };
          setUserSubscription(fallbackDoc);
        });
      } else {
        setUserSubscription(null);
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    let custom: Movie[] = [];
    try {
      const firebaseSnap = await getDocs(query(collection(db, 'custom_media'), orderBy('created_at', 'desc')));
      const customDocs = firebaseSnap?.docs || [];
      custom = customDocs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        is_custom: true
      })) as Movie[];
    } catch (err) {
      console.warn("Could not load custom media from Firestore:", err);
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
    const mergedCustom = [...custom];
    localCustom.forEach((localMovie) => {
      if (!mergedCustom.some(m => m.id === localMovie.id || (m.title && m.title === localMovie.title) || (m.name && m.name === localMovie.name))) {
        mergedCustom.push(localMovie);
      }
    });
    custom = mergedCustom;

    const customMovies = custom.filter(m => m.media_type === 'movie' || !m.media_type);
    const customTV = custom.filter(m => m.media_type === 'tv' || m.media_type === 'anime');
    setCustomMedia(custom);

    let tmdbFailed = false;
    let trList: Movie[] = [];
    let mvList: Movie[] = [];
    let tvList: Movie[] = [];

    try {
      const tr = await movieApi.getTrending('all');
      trList = Array.isArray(tr) ? tr : [];
    } catch (err) {
      console.warn("Could not load items from TMDB getTrending:", err);
      tmdbFailed = true;
    }

    try {
      const mv = await movieApi.getMovies();
      mvList = Array.isArray(mv) ? mv : [];
    } catch (err) {
      console.warn("Could not load items from TMDB getMovies:", err);
      tmdbFailed = true;
    }

    try {
      const tv = await movieApi.getSeries();
      tvList = Array.isArray(tv) ? tv : [];
    } catch (err) {
      console.warn("Could not load items from TMDB getSeries:", err);
      tmdbFailed = true;
    }

    if (tmdbFailed || (trList.length === 0 && mvList.length === 0 && tvList.length === 0)) {
      setIsDemoMode(true);
      setTrending(deduplicateMovies([...custom, ...FALLBACK_TRENDING]));
      setPopularMovies(deduplicateMovies([...customMovies, ...FALLBACK_MOVIES]));
      setPopularTV(deduplicateMovies([...customTV, ...FALLBACK_TV]));
      
      const featuredCustom = custom.find(m => m.is_featured);
      setFeatured(featuredCustom || custom[0] || FALLBACK_TRENDING[0]);
    } else {
      setIsDemoMode(false);
      setTrending(deduplicateMovies([...custom, ...trList]));
      setPopularMovies(deduplicateMovies([...customMovies, ...mvList]));
      setPopularTV(deduplicateMovies([...customTV, ...tvList]));
      
      const featuredCustom = custom.find(m => m.is_featured);
      setFeatured(featuredCustom || custom[0] || trList[Math.floor(Math.random() * trList.length)]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  const handleSelectCategory = (catId: string) => {
    setActiveCategory(catId);
    setActiveQuickFilter(null);
    setSelectedGenreId(null);
  };

  const filterMedia = (list: Movie[]) => {
    return list.filter(item => {
      const title = (item.title || item.name || '').toLowerCase();
      const matchesSearch = title.includes(searchQuery.toLowerCase());
      
      let matchesCategory = true;
      if (activeCategory === 'movie') matchesCategory = item.media_type === 'movie' || !!item.title;
      if (activeCategory === 'tv') matchesCategory = item.media_type === 'tv' || !!item.name;
      if (activeCategory === 'kids') matchesCategory = item.category === 'kids';
      if (activeCategory === 'anime') matchesCategory = item.category === 'anime' || item.media_type === 'anime';

      let matchesQuickFilter = true;
      if (activeQuickFilter === '2026') {
        const releaseStr = (item.release_date || item.first_air_date || '').toString();
        matchesQuickFilter = releaseStr.includes('2026') || !!item.is_custom;
      } else if (activeQuickFilter === 'cinema') {
        const releaseStr = (item.release_date || item.first_air_date || '').toString();
        const isRecent = releaseStr.includes('2026') || releaseStr.includes('2025');
        matchesQuickFilter = (item.media_type === 'movie' || !item.media_type) && (isRecent || !!item.is_custom || !!item.is_featured);
      } else if (activeQuickFilter === 'genre') {
        if (selectedGenreId) {
          matchesQuickFilter = item.genre_ids ? item.genre_ids.includes(selectedGenreId) : false;
        } else {
          matchesQuickFilter = true;
        }
      }

      return matchesSearch && matchesCategory && matchesQuickFilter;
    });
  };

  const getAllFiltered = () => {
    const all = [...customMedia, ...trending, ...popularMovies, ...popularTV];
    // Remove duplicates
    const unique = all.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    return filterMedia(unique);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface-900">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-white/50 text-[10px] tracking-widest uppercase font-black">Carregando RBFLIX...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  const isAdmin = currentUser?.email && (currentUser.email.toLowerCase() === 'robsonbatista3@gmail.com' || currentUser.email.toLowerCase() === 'rbvideos0441@gmail.com');
  const hasPlanActive = isAdmin || (userSubscription?.subscriptionStatus === 'active' && userSubscription?.subscriptionActiveUntil > Date.now());

  if (!hasPlanActive) {
    return <PlansScreen />;
  }

  if (!activeProfile && !showAdmin) {
    return (
      <ProfileSelector
        userId={currentUser.uid}
        userName={userSubscription?.name || currentUser.displayName || 'Cliente'}
        profiles={userSubscription?.profiles || []}
        maxScreens={userSubscription?.maxScreens || 1}
        onSelectProfile={handleSelectProfile}
        isAdmin={!!isAdmin}
        onAdminClick={() => setShowAdmin(true)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface-900">
        <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-white/50 tracking-widest font-bold">CARREGANDO...</p>
      </div>
    );
  }

  if (error) {
    const isApiKeyMissing = error.includes("TMDB_API_KEY_MISSING") || 
                            error.includes("TMDB_API_KEY_INVALID") || 
                            error.includes("configurar") || 
                            error.includes("401") ||
                            error.includes("unauthorized");
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface-900 px-8 text-center bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.1)_0,transparent_70%)]">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full p-10 rounded-2xl bg-surface-800 border border-white/5 shadow-2xl"
        >
          <div className="w-20 h-20 bg-brand/20 text-brand rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <Info size={40} />
          </div>
          
          <h1 className="text-3xl font-black mb-4 tracking-tighter uppercase leading-tight">
            {isApiKeyMissing ? "Configuração Necessária" : "Ops! Algo deu errado"}
          </h1>
          
          <p className="text-gray-400 mb-8 leading-relaxed">
            {isApiKeyMissing 
              ? "Para exibir filmes e séries reais, você precisa de uma chave de API do TMDB ativa no painel de Secrets."
              : error}
          </p>

          {isApiKeyMissing && (
            <div className="text-left bg-black/40 p-4 rounded-lg mb-8 space-y-3 text-sm">
              <p className="font-bold text-white uppercase text-[10px] tracking-widest opacity-50">Passo a Passo:</p>
              <ol className="list-decimal list-inside text-gray-300 space-y-2">
                <li>Acesse o site <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="text-brand hover:underline font-bold">TMDB API</a></li>
                <li>Crie uma conta e solicite uma chave de API</li>
                <li>No AI Studio, abra o menu <b>Settings &gt; Secrets</b></li>
                <li>Adicione <b>TMDB_API_KEY</b> com o valor da sua chave</li>
              </ol>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand/20 hover:scale-[1.02] transition-transform cursor-pointer uppercase tracking-widest text-[10px]"
            >
              Já configurei! Recarregar
            </button>
            <button 
              onClick={() => {
                setError(null);
                setTrending(FALLBACK_TRENDING);
                setPopularMovies(FALLBACK_MOVIES);
                setPopularTV(FALLBACK_TV);
                setFeatured(FALLBACK_TRENDING[0]);
              }}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl hover:scale-[1.02] transition-transform cursor-pointer uppercase tracking-widest text-[10px]"
            >
              Visualizar em Modo de Demonstração
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Navbar 
        onAdminClick={() => setShowAdmin(true)} 
        onSearch={setSearchQuery}
        activeProfile={activeProfile}
        onSwitchProfile={handleSwitchProfile}
        isDemoMode={isDemoMode}
      />

      <main className="mt-20">
        {/* Category Tabs */}
        <CategoryTabs activeCategory={activeCategory} onSelect={handleSelectCategory} />

        {/* Hero / Featured Area - Only show if not searching/filtering heavily or as top result */}
        {!searchQuery && activeCategory === 'all' && !activeQuickFilter && featured && (
          <div className="relative flex-shrink-0 h-[70vh] w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-surface-900 via-transparent to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-transparent to-black/20 z-10" />
            
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
               <div 
                 className="w-full h-full bg-cover bg-center transition-transform duration-[10s] ease-linear scale-100 hover:scale-110" 
                 style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(https://image.tmdb.org/t/p/original${featured.backdrop_path})` }}
               />
            </div>

            <div className="absolute bottom-16 left-12 z-20 max-w-2xl space-y-4">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex items-center space-x-2">
                  <span className="bg-brand text-[10px] font-bold px-1.5 py-0.5 rounded tracking-widest text-white uppercase">
                    {featured.media_type === 'tv' ? 'SÉRIE' : 'FILME'}
                  </span>
                  <span className="text-sm font-semibold tracking-wider text-gray-400">
                    DISPONÍVEL AGORA
                  </span>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-4">
                   {featured.title || featured.name}
                </h1>

                <div className="flex items-center space-x-3 text-sm font-medium mb-4">
                  <span className="text-green-500 font-bold">{Math.round(featured.vote_average * 10)}% relevante</span>
                  <span className="px-1.5 py-0.5 border border-gray-600 text-gray-400 text-[10px] rounded uppercase">HD 4K</span>
                  <span className="text-gray-300">{(featured.release_date || featured.first_air_date || '').split('-')[0]}</span>
                </div>

                <p className="text-gray-300 text-base leading-relaxed line-clamp-3 mb-8 max-w-xl">
                  {featured.overview}
                </p>

                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleMovieClick(featured)}
                    tabIndex={0}
                    className="flex items-center px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition shadow-xl cursor-pointer tv-focusable"
                  >
                    <Play size={20} className="mr-2 fill-current" /> Assistir
                  </button>
                  <button 
                    onClick={() => handleMovieClick(featured)}
                    tabIndex={0}
                    className="flex items-center px-8 py-3 bg-gray-500/30 text-white font-bold rounded backdrop-blur-md hover:bg-gray-500/40 transition cursor-pointer tv-focusable"
                  >
                    <Info size={20} className="mr-2" /> Mais Informações
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* Search/Filter Results */}
        {(searchQuery || activeCategory !== 'all' || activeQuickFilter !== null) ? (
          <div className="px-12 py-8 min-h-[50vh]">
            {activeQuickFilter === 'genre' && (
              <div className="flex flex-wrap gap-3 mb-8">
                {GENRES.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGenreId(g.id)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                      selectedGenreId === g.id 
                        ? 'bg-brand border-brand text-white shadow-lg scale-105' 
                        : 'border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}

            <h2 className="text-2xl font-bold uppercase tracking-widest mb-8 border-l-4 border-brand pl-4">
              {searchQuery ? (
                `Resultados para: ${searchQuery}`
              ) : activeQuickFilter === '2026' ? (
                "Lançamentos 2026"
              ) : activeQuickFilter === 'cinema' ? (
                "Em Exibição no Cinema"
              ) : activeQuickFilter === 'genre' ? (
                selectedGenreId ? `Gênero: ${GENRES.find(g => g.id === selectedGenreId)?.name || ''}` : "Selecione um Gênero"
              ) : (
                `Explorando ${activeCategory.toUpperCase()}`
              )}
            </h2>
            
            {getAllFiltered().length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {getAllFiltered().map((movie) => (
                  <motion.div
                    key={movie.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05, zIndex: 30 }}
                    onClick={() => handleMovieClick(movie)}
                    tabIndex={0}
                    className="relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer group shadow-xl bg-surface-800 tv-focusable"
                  >
                    <img 
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                      alt={movie.title || movie.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <p className="text-sm font-bold text-white truncate">{movie.title || movie.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-brand font-bold bg-brand/20 px-1.5 py-0.5 rounded">{Math.round(movie.vote_average * 10)}% Match</span>
                        <Play size={12} className="text-white fill-white" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <ShieldAlert size={48} className="mb-4 opacity-20" />
                <p className="text-lg">Nenhum resultado encontrado para sua busca.</p>
              </div>
            )}
          </div>
        ) : (
          /* Default Dashboard View */
          <div className="space-y-4">
            {/* Quick Actions Grid */}
            <QuickActions 
              activeFilter={activeQuickFilter}
              onSelectFilter={(filterId) => {
                setActiveQuickFilter(filterId);
                if (filterId) {
                  setActiveCategory('all');
                  if (filterId === 'genre' && !selectedGenreId) {
                    setSelectedGenreId(28); // Default to 'Ação'
                  }
                } else {
                  setActiveCategory('all');
                  setSelectedGenreId(null);
                  setSearchQuery('');
                }
              }}
            />

            <MovieRow 
              title="Tendências Agora" 
              movies={trending} 
              onMovieClick={handleMovieClick}
              featured={true} 
            />
            
            <MovieRow 
              title="Filmes Populares" 
              movies={popularMovies} 
              onMovieClick={handleMovieClick} 
            />

            <MovieRow 
              title="Séries que Amamos" 
              movies={popularTV} 
              onMovieClick={handleMovieClick} 
            />

            <MovieRow 
              title="Adicionados Recentemente" 
              movies={[...popularMovies].reverse()} 
              onMovieClick={handleMovieClick} 
            />
          </div>
        )}
      </main>

      {/* Footer Navigation (Mobile friendly style) */}
      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-surface-800/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around z-40 px-4">
         {['Inicio', 'Favoritos', 'Downloads', 'Perfil'].map((item) => (
            <button key={item} className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition-colors cursor-pointer">
               <div className="w-5 h-5 rounded-md border border-white/20" />
               <span className="text-[10px] font-medium">{item}</span>
            </button>
         ))}
      </footer>

      {/* Overlays */}
      <AnimatePresence>
        {selectedMovie && (
          <MovieDetails 
            movie={selectedMovie} 
            onClose={() => setSelectedMovie(null)} 
          />
        )}

        {showAdmin && (
          <AdminPanel 
            onClose={() => {
              setShowAdmin(false);
              loadData();
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
