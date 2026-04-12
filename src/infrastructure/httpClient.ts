import axios from 'axios';

export const httpClient = axios.create({
  baseURL: '/api',
});

httpClient.interceptors.request.use((config) => {
  // Preparado para JWT
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
