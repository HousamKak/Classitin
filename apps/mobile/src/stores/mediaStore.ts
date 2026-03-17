import { create } from 'zustand';

interface ConsumerInfo {
  consumerId: string;
  producerId: string;
  userId: string;
  track: MediaStreamTrack;
  kind: string;
  paused: boolean;
}

interface MediaState {
  localScreenTrack: MediaStreamTrack | null;
  localProducerId: string | null;
  consumers: Map<string, ConsumerInfo>;
  focusedStudentId: string | null;
  setLocalScreenTrack: (track: MediaStreamTrack | null) => void;
  setLocalProducerId: (id: string | null) => void;
  addConsumer: (info: ConsumerInfo) => void;
  removeConsumer: (consumerId: string) => void;
  removeConsumersByUserId: (userId: string) => void;
  setFocusedStudent: (userId: string | null) => void;
  clearAll: () => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  localScreenTrack: null,
  localProducerId: null,
  consumers: new Map(),
  focusedStudentId: null,

  setLocalScreenTrack: (track) => set({ localScreenTrack: track }),
  setLocalProducerId: (id) => set({ localProducerId: id }),

  addConsumer: (info) =>
    set((s) => {
      const consumers = new Map(s.consumers);
      consumers.set(info.consumerId, info);
      return { consumers };
    }),

  removeConsumer: (consumerId) =>
    set((s) => {
      const consumers = new Map(s.consumers);
      consumers.delete(consumerId);
      return { consumers };
    }),

  removeConsumersByUserId: (userId) =>
    set((s) => {
      const consumers = new Map(s.consumers);
      for (const [id, info] of consumers) {
        if (info.userId === userId) consumers.delete(id);
      }
      return { consumers };
    }),

  setFocusedStudent: (userId) => set({ focusedStudentId: userId }),

  clearAll: () =>
    set({
      localScreenTrack: null,
      localProducerId: null,
      consumers: new Map(),
      focusedStudentId: null,
    }),
}));
