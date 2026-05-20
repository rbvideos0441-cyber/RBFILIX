import { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Movie, Episode, IMAGE_BASE_URL, POSTER_BASE_URL } from '../types';
import { movieApi } from '../services/api';
import { X, Play, Plus, Star, Calendar, Clock as ClockIcon, Heart, Download, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HLSPlayer from './HLSPlayer';

const getImageUrl = (path: string | undefined | null, baseUrl: string): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

interface MovieDetailsProps {
  movie: Movie;
  onClose: () => void;
}

export default function MovieDetails({ movie: initialMovie, onClose }: MovieDetailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentMovie, setCurrentMovie] = useState<Movie>(initialMovie);
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

  const [playerError, setPlayerError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setCurrentMovie(initialMovie);
    setIsPlaying(false);
    setPlayerError(false);
    setEpisodes([]);
    setCurrentVideoUrl(initialMovie.video_url || null);

    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [initialMovie]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    const fetchEpisodes = async () => {
      if ((currentMovie.media_type === 'tv' || currentMovie.media_type === 'anime') && currentMovie.is_custom) {
        let list: Episode[] = [];
        try {
          const querySnapshot = await getDocs(collection(db, 'custom_media', currentMovie.id as string, 'episodes'));
          list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Episode[];
        } catch (err: any) {
          const errStr = (err?.message || err?.toString() || '').toLowerCase();
          if (errStr.includes('offline') || errStr.includes('failed to get document') || errStr.includes('unavailable')) {
            console.warn("Could not fetch episodes (client is offline):", err);
          } else {
            console.error("Error fetching episodes:", err);
          }
        }

        // Load local episodes fallback
        try {
          const localEpSaved = localStorage.getItem('local_episodes');
          if (localEpSaved) {
            const localEpMap = JSON.parse(localEpSaved);
            const localEps = localEpMap[currentMovie.id] || [];
            localEps.forEach((localEp: Episode) => {
              if (!list.some(ep => ep.id === localEp.id || (ep.episode_number === localEp.episode_number && ep.season_number === localEp.season_number))) {
                list.push(localEp);
              }
            });
          }
        } catch (e) {
          console.error('Error loading local episodes in MovieDetails:', e);
        }

        list.sort((a, b) => {
          if (a.season_number !== b.season_number) return a.season_number - b.season_number;
          return a.episode_number - b.episode_number;
        });

        setEpisodes(list);
        if (list.length > 0 && !currentMovie.video_url) {
          setCurrentVideoUrl(list[0].video_url);
        }
      }
    };
    fetchEpisodes();
  }, [currentMovie]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (currentMovie.is_custom && !currentMovie.tmdb_id) {
        setDetails(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const idToFetch = currentMovie.tmdb_id || currentMovie.id;
        const mediaType = currentMovie.media_type === 'anime' ? 'tv' : (currentMovie.media_type || (currentMovie.title ? 'movie' : 'tv'));
        const data = await movieApi.getDetails(mediaType as any, Number(idToFetch));
        setDetails(data);
      } catch (err) {
        console.error("TMDB Details Error:", err);
      } finally {
        setLoading(false);
      }
    };
    if (currentMovie) {
      fetchDetails();
    }
  }, [currentMovie]);

  if (!currentMovie) return null;

  const handleClose = () => {
    setIsPlaying(false);
    onClose();
  };

  const handlePlay = () => {
    if (currentVideoUrl) {
      setPlayerError(false);
      setIsPlaying(true);
    } else {
      setToastMessage("Vídeo indisponível para este título no momento.");
    }
  };

  return (
    <>
      {/* Toast Notification for Iframe Sandbox safety */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[250] bg-red-600 border border-white/10 text-white px-6 py-3.5 rounded-xl shadow-2xl font-bold flex items-center gap-2.5 text-sm uppercase tracking-wider text-center"
          >
            <span className="w-2 h-2 bg-white rounded-full animate-ping" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Immersive Video Player Overlay (Scroll-proof) */}
      <AnimatePresence>
        {isPlaying && currentVideoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
          >
            <button 
              id="player-close-btn"
              onClick={() => {
                setIsPlaying(false);
                setPlayerError(false);
              }}
              tabIndex={0}
              className="absolute top-8 left-8 p-3 rounded-full bg-black/50 text-white hover:bg-white hover:text-black transition-all z-[210] cursor-pointer"
            >
              <X size={24} />
            </button>
            <div className="w-full h-full flex items-center justify-center">
              <HLSPlayer 
                url={currentVideoUrl}
                playing={isPlaying}
                onError={() => setPlayerError(true)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-surface-900 overflow-y-auto"
      >
        {/* Backdrop Section */}
        <div className="relative w-full h-[60vh] md:h-[80vh] bg-black">
          <img
            src={getImageUrl(currentMovie.backdrop_path, IMAGE_BASE_URL)}
            className="w-full h-full object-cover"
            alt={currentMovie.title || currentMovie.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-surface-900/40 to-transparent pointer-events-none" />
          
          <button
            id="movie-details-close-btn"
            onClick={handleClose}
            tabIndex={0}
            className="absolute top-8 right-8 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors z-50 cursor-pointer tv-focusable"
          >
            <X size={24} />
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 max-w-5xl">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-5xl md:text-8xl font-black mb-6 leading-none tracking-tighter uppercase">
              {currentMovie.title || currentMovie.name}
            </h1>

            <div className="flex flex-wrap items-center gap-6 mb-8 text-white/80">
              <div className="flex items-center gap-1">
                <Star size={18} className="text-brand fill-brand" />
                <span className="font-bold">{(currentMovie.vote_average || 0).toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={18} />
                <span>{(currentMovie.release_date || currentMovie.first_air_date || '').split('-')[0] || 'N/A'}</span>
              </div>
              {details?.runtime && (
                <div className="flex items-center gap-1">
                  <ClockIcon size={18} />
                  <span>{details.runtime} min</span>
                </div>
              )}
              {(details?.number_of_seasons || (episodes.length > 0 ? [...new Set(episodes.map(e => e.season_number))].length : 0)) > 0 && (
                <span>{(details?.number_of_seasons || [...new Set(episodes.map(e => e.season_number))].length)} Temporadas</span>
              )}
              {currentMovie.is_custom && (
                <span className="px-2 py-0.5 bg-brand text-white text-[10px] font-black rounded uppercase">Premium</span>
              )}
            </div>

            <p className="text-lg text-white/70 max-w-2xl mb-8 leading-relaxed">
              {currentMovie.overview}
            </p>

            <div className="flex flex-wrap gap-4">
              {!(currentMovie.media_type === 'tv' || currentMovie.media_type === 'anime') && (
                <button 
                  onClick={handlePlay}
                  tabIndex={0}
                  className="flex items-center gap-2 px-10 py-4 rounded bg-white font-bold text-black hover:bg-gray-200 transition-colors shadow-2xl cursor-pointer uppercase tracking-wider tv-focusable"
                >
                  <Play size={20} fill="currentColor" />
                  Assistir
                </button>
              )}
              <button tabIndex={0} className="flex items-center gap-2 px-6 py-4 rounded bg-gray-500/30 backdrop-blur-md font-bold text-white hover:bg-gray-500/40 transition-colors cursor-pointer uppercase tracking-wider tv-focusable">
                <Heart size={20} />
              </button>
              <button tabIndex={0} className="flex items-center gap-2 px-6 py-4 rounded bg-gray-500/30 backdrop-blur-md font-bold text-white hover:bg-gray-500/40 transition-colors cursor-pointer uppercase tracking-wider tv-focusable">
                <Download size={20} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-8 md:px-16 py-12 max-w-7xl mx-auto">
         {/* Episodes Section */}
         {(currentMovie.media_type === 'tv' || currentMovie.media_type === 'anime') && episodes.length > 0 && (
           <div className="mb-12">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-bold">Episódios</h2>
               <div className="text-xs text-gray-500 font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">
                 {episodes.length} Episódios Disponíveis
               </div>
             </div>
             <div className="grid gap-3">
               {episodes.map((ep) => (
                 <button 
                   key={ep.id}
                   onClick={() => {
                     setCurrentVideoUrl(ep.video_url);
                     setIsPlaying(true);
                     setPlayerError(false);
                     window.scrollTo({ top: 0, behavior: 'smooth' });
                   }}
                   tabIndex={0}
                   className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left group tv-focusable ${currentVideoUrl === ep.video_url ? 'bg-brand/80 border-brand ring-2 ring-brand' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}
                 >
                   <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${currentVideoUrl === ep.video_url ? 'bg-white text-brand' : 'bg-white/10 text-white'}`}>
                     S{ep.season_number} E{ep.episode_number}
                   </div>
                   <div className="flex-1 min-w-0">
                     <h3 className={`font-bold truncate ${currentVideoUrl === ep.video_url ? 'text-white' : 'text-gray-200'}`}>
                       {ep.title || `Episódio ${ep.episode_number}`}
                     </h3>
                     {ep.overview && (
                       <p className={`text-xs mt-1 line-clamp-1 ${currentVideoUrl === ep.video_url ? 'text-white/80' : 'text-gray-500'}`}>
                         {ep.overview}
                       </p>
                     )}
                   </div>
                   <div className={`opacity-0 group-hover:opacity-100 transition-opacity ${currentVideoUrl === ep.video_url ? 'opacity-100' : ''}`}>
                     <Play size={20} fill="currentColor" className={currentVideoUrl === ep.video_url ? 'text-white' : 'text-brand'} />
                   </div>
                 </button>
               ))}
             </div>
           </div>
         )}

         {details?.credits?.cast && (
            <div className="mb-12">
               <h2 className="text-2xl font-bold mb-6">Elenco Principal</h2>
               <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4">
                  {details.credits.cast.slice(0, 10).map((person: any) => (
                     <div key={person.id} className="flex-shrink-0 w-24 text-center">
                        <div className="w-24 h-24 rounded-full overflow-hidden mb-2 border-2 border-white/10">
                           <img 
                              src={person.profile_path ? `${POSTER_BASE_URL}${person.profile_path}` : 'https://via.placeholder.com/150'} 
                              className="w-full h-full object-cover"
                              alt={person.name}
                           />
                        </div>
                        <p className="text-xs font-medium truncate">{person.name}</p>
                        <p className="text-[10px] text-white/50 truncate">{person.character}</p>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {details?.similar?.results && (
            <div>
               <h2 className="text-2xl font-bold mb-6">Títulos Semelhantes</h2>
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {details.similar.results.slice(0, 10).map((similar: Movie) => (
                     <div 
                        key={similar.id} 
                        className="relative group cursor-pointer aspect-[2/3] rounded-lg overflow-hidden"
                        onClick={() => {
                           setDetails(null);
                           setIsPlaying(false);
                           setCurrentMovie(similar);
                           window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                     >
                        <img 
                           src={getImageUrl(similar.poster_path, POSTER_BASE_URL)} 
                           className="w-full h-full object-cover transition-transform group-hover:scale-110"
                           alt={similar.title || similar.name}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                           <Play size={40} className="text-brand" />
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}
      </div>
    </motion.div>
  </>
);
}
