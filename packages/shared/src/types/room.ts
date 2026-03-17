export type EnrollmentStatus = 'ACTIVE' | 'REMOVED' | 'PENDING';
export type SessionStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED';

export interface Room {
  id: string;
  name: string;
  description?: string | null;
  joinCode: string;
  ownerId: string;
  isArchived: boolean;
  maxStudents: number;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  roomId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
}

export interface Session {
  id: string;
  roomId: string;
  status: SessionStatus;
  title?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
}
