import { create } from 'zustand';
import type { User } from '@classitin/shared';
import { api } from '@/services/api';
import { storage } from '@/utils/storage';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, role: 'TEACHER' | 'STUDENT') => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
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
      await storage.set('accessToken', accessToken);
      await storage.set('refreshToken', refreshToken);
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
      await storage.set('accessToken', accessToken);
      await storage.set('refreshToken', refreshToken);
      set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await storage.remove('accessToken');
    await storage.remove('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  refreshAuth: async () => {
    const rt = get().refreshToken || await storage.get('refreshToken');
    if (!rt) return;
    try {
      const res = await api.post('/auth/refresh', { refreshToken: rt });
      await storage.set('accessToken', res.accessToken);
      await storage.set('refreshToken', res.refreshToken);
      set({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    } catch {
      await get().logout();
    }
  },

  loadFromStorage: async () => {
    const accessToken = await storage.get('accessToken');
    const refreshToken = await storage.get('refreshToken');
    if (accessToken) {
      set({ accessToken, refreshToken, isAuthenticated: true });
      try {
        const res = await api.get('/auth/me');
        set({ user: res.user });
      } catch {
        await get().refreshAuth();
      }
    }
  },
}));
