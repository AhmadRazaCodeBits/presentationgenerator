import api from './api';

export const authService = {
  async register(data) {
    const res = await api.post('/auth/register', data);
    if (res.data.token) {
      localStorage.setItem('slideedge_token', res.data.token);
      localStorage.setItem('slideedge_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async login(data) {
    const res = await api.post('/auth/login', data);
    if (res.data.token) {
      localStorage.setItem('slideedge_token', res.data.token);
      localStorage.setItem('slideedge_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async getProfile() {
    const res = await api.get('/auth/profile');
    return res.data;
  },

  logout() {
    localStorage.removeItem('slideedge_token');
    localStorage.removeItem('slideedge_user');
  },

  getToken() {
    return localStorage.getItem('slideedge_token');
  },

  getUser() {
    const user = localStorage.getItem('slideedge_user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('slideedge_token');
  },
};
