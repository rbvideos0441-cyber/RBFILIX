export interface Movie {
  id: string | number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  media_type?: 'movie' | 'tv' | 'anime';
  video_url?: string;
  category?: string;
  is_custom?: boolean;
  is_featured?: boolean;
  tmdb_id?: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Episode {
  id?: string;
  title: string;
  season_number: number;
  episode_number: number;
  video_url: string;
  overview?: string;
  created_at?: any;
}

export const CATEGORIES = [
  { id: 'all', name: 'INICIO' },
  { id: 'movie', name: 'FILMES' },
  { id: 'tv', name: 'SÉRIES' },
  { id: 'kids', name: 'KIDS' },
  { id: 'anime', name: 'ANIME' },
  { id: 'explore', name: 'EXPLORAR' },
];

export const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";
export const POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500";
