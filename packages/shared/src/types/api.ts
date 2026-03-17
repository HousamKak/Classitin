import type { User } from './user.js';
import type { Room, Enrollment, Session } from './room.js';
import type { LiveStream } from './stream.js';

// --- Auth ---

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  role: 'TEACHER' | 'STUDENT';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// --- Rooms ---

export interface CreateRoomRequest {
  name: string;
  description?: string;
  maxStudents?: number;
}

export interface UpdateRoomRequest {
  name?: string;
  description?: string;
  maxStudents?: number;
}

export interface JoinRoomRequest {
  joinCode: string;
}

export interface RoomWithDetails extends Room {
  enrollments?: (Enrollment & { user?: User })[];
  activeSession?: Session | null;
}

// --- Sessions ---

export interface CreateSessionRequest {
  title?: string;
}

export interface UpdateSessionRequest {
  status: 'ENDED';
}

export interface SessionWithDetails extends Session {
  liveStreams?: LiveStream[];
}

// --- Generic ---

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}
