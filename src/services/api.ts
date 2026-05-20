import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export const movieApi = {
  getTrending: async (type: string = 'all', time: string = 'day') => {
    const res = await api.get(`/movies/trending-${type}-${time}`);
    return res.data.results;
  },
  getMovies: async (params = {}) => {
    const res = await api.get('/movies/discover-movie', { params });
    return res.data.results;
  },
  getSeries: async (params = {}) => {
    const res = await api.get('/movies/discover-tv', { params });
    return res.data.results;
  },
  getDetails: async (type: 'movie' | 'tv', id: number) => {
    const res = await api.get(`/movies/details/${type}/${id}`);
    return res.data;
  },
  search: async (query: string) => {
    const res = await api.get('/movies/search-multi', { params: { query } });
    return res.data.results;
  }
};
