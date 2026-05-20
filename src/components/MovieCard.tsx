import React from 'react';
import { Movie, POSTER_BASE_URL, IMAGE_BASE_URL } from '../types';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
  featured?: boolean;
}

const getImageUrl = (path: string | undefined | null, baseUrl: string): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick, featured = false }) => {
  const isMovie = !!movie.title;
  const title = movie.title || movie.name;

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(movie)}
      tabIndex={0}
      className={`relative group cursor-pointer overflow-hidden rounded-2xl flex-shrink-0 transition-all duration-300 shadow-2xl tv-focusable ${
        featured ? 'w-[400px] h-[225px]' : 'w-[200px] h-[300px]'
      }`}
    >
      <img
        src={
          featured
            ? getImageUrl(movie.backdrop_path, IMAGE_BASE_URL)
            : getImageUrl(movie.poster_path, POSTER_BASE_URL)
        }
        alt={title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      
      {/* Selection Border - matched to Sleek design's border style */}
      <div className="absolute inset-0 border border-white/10 group-hover:border-white/30 rounded-2xl pointer-events-none z-20 transition-colors" />

      {/* Info Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider truncate">{title}</h3>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-green-500">{Math.round(movie.vote_average * 10)}% relevante</span>
          </div>
          <span className="text-[8px] text-white/50 border border-white/20 px-1 rounded uppercase">
            {isMovie ? 'Filme' : 'Série'}
          </span>
        </div>
      </div>

      {featured && (
         <div className="absolute bottom-4 left-4 z-30">
            <h2 className="text-3xl font-display font-black text-white drop-shadow-xl uppercase">
              {title}
            </h2>
         </div>
      )}
    </motion.div>
  );
};

export default MovieCard;
