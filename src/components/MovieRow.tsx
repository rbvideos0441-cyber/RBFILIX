import { Movie } from '../types';
import MovieCard from './MovieCard';

interface MovieRowProps {
  title: string;
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  featured?: boolean;
}

export default function MovieRow({ title, movies, onMovieClick, featured = false }: MovieRowProps) {
  if (!movies || movies.length === 0) return null;

  return (
    <div className="py-6 px-8">
      <h2 className="text-xl font-bold mb-4 tracking-tight uppercase">
        {title}
      </h2>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-8 -mx-4 px-4">
        {movies.map((movie) => (
          <MovieCard 
            key={movie.id} 
            movie={movie} 
            onClick={onMovieClick} 
            featured={featured}
          />
        ))}
      </div>
    </div>
  );
}
