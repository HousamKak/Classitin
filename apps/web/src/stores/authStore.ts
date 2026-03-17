import { create } from 'zustand';
import type { User } from '@classitin/shared';
import { api } from '@/services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, role: 'TEACHER' | 'STUDENT') => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = res;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, password, displayName, role) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/register', { email, password, displayName, role });
      const { user, accessToken, refreshToken } = res;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  refreshAuth: async () => {
    const rt = get().refreshToken || localStorage.getItem('refreshToken');
    if (!rt) return;
    try {
      const res = await api.post('/auth/refresh', { refreshToken: rt });
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('refreshToken', res.refreshToken);
      set({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    } catch {
      get().logout();
    }
  },

  loadFromStorage: () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    if (accessToken) {
      set({ accessToken, refreshToken, isAuthenticated: true });
      // Fetch user profile
      api.get('/auth/me').then((res) => {
        set({ user: res.user });
      }).catch(() => {
        // Token expired, try refresh
        get().refreshAuth();
      });
    }
  },
}));
