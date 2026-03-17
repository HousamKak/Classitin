export type UserRole = 'TEACHER' | 'STUDENT';

export type PresenceStatus = 'ONLINE' | 'IDLE' | 'NEEDS_HELP' | 'OFFLINE';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantInfo {
  userId: string;
  displayName: string;
  role: UserRole;
  status: PresenceStatus;
  isSharing: boolean;
}
