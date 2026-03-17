import { useRoomStore } from '@/stores/roomStore';
import type { Room, Session } from '@classitin/shared';

interface RoomStateReturn {
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

export function useRoomState(): RoomStateReturn {
  return useRoomStore();
}
