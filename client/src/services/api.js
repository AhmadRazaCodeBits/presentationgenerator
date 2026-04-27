import axios from 'axios';

function normalizeApiBase(input) {
  if (!input) return '/api';

  const trimmed = String(input).trim();
  if (!trimmed) return '/api';

  if (trimmed.startsWith('/')) {
    return trimmed.replace(/\/$/, '');
  }

  try {
    const url = new URL(trimmed);
    const pathname = url.pathname.replace(/\/$/, '');
    const basePath = pathname && pathname !== '/' ? pathname : '/api';
    url.pathname = basePath;
    return url.toString().replace(/\/$/, '');
  } catch {
    return '/api';
  }
}

export function resolveApiBase() {
  return normalizeApiBase(import.meta.env.VITE_API_URL || '/api');
}

export const API_BASE = resolveApiBase();

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('slideedge_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('slideedge_token');
      localStorage.removeItem('slideedge_user');
      // Only redirect if not already on login/signup
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
