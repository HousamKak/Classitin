import { create } from 'zustand';
import type { Room, Session } from '@classitin/shared';
import { api } from '@/services/api';

interface RoomState {
  rooms: Room[];
  currentRoom: Room | null;
  currentSession: Session | null;
  isLoading: boolean;
  fetchRooms: () => Promise<void>;
  fetchRoom: (roomId: string) => Promise<void>;
  createRoom: (data: { name: string; description?: string; maxStudents?: number }) => Promise<Room>;
  joinRoom: (joinCode: string) => Promise<void>;
  setCurrentSession: (session: Session | null) => void;
  startSession: (roomId: string, title?: string) => Promise<Session>;
  endSession: (roomId: string, sessionId: string) => Promise<void>;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: [],
  currentRoom: null,
  currentSession: null,
  isLoading: false,

  fetchRooms: async () => {
    set({ isLoading: true });
    const res = await api.get('/rooms');
    set({ rooms: res.rooms, isLoading: false });
  },

  fetchRoom: async (roomId) => {
    const res = await api.get(`/rooms/${roomId}`);
    set({ currentRoom: res, currentSession: res.activeSession ?? null });
  },

  createRoom: async (data) => {
    const res = await api.post('/rooms', data);
    set((s) => ({ rooms: [res.room, ...s.rooms] }));
    return res.room;
  },

  joinRoom: async (joinCode) => {
    const res = await api.post('/rooms/join', { joinCode });
    set((s) => ({ rooms: [res.room, ...s.rooms] }));
  },

  setCurrentSession: (session) => set({ currentSession: session }),

  startSession: async (roomId, title) => {
    const res = await api.post(`/rooms/${roomId}/sessions`, { title });
    set({ currentSession: res.session });
    return res.session;
  },

  endSession: async (roomId, sessionId) => {
    await api.patch(`/rooms/${roomId}/sessions/${sessionId}`, { status: 'ENDED' });
    set({ currentSession: null });
  },
}));
