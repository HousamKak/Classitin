import type { PresenceStatus, ParticipantInfo, UserRole } from '@classitin/shared';

interface PresenceEntry {
  userId: string;
  displayName: string;
  role: UserRole;
  status: PresenceStatus;
  socketId: string;
  lastSeen: number;
  isSharing: boolean;
}

class PresenceService {
  // sessionId -> Map<userId, PresenceEntry>
  private sessions = new Map<string, Map<string, PresenceEntry>>();

  setOnline(
    sessionId: string,
    userId: string,
    socketId: string,
    displayName: string,
    role: UserRole
  ): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Map());
    }
    const session = this.sessions.get(sessionId)!;
    session.set(userId, {
      userId,
      displayName,
      role,
      status: 'ONLINE',
      socketId,
      lastSeen: Date.now(),
      isSharing: false,
    });
  }

  setStatus(sessionId: string, userId: string, status: PresenceStatus): void {
    const entry = this.sessions.get(sessionId)?.get(userId);
    if (entry) {
      entry.status = status;
      entry.lastSeen = Date.now();
    }
  }

  setSharing(sessionId: string, userId: string, isSharing: boolean): void {
    const entry = this.sessions.get(sessionId)?.get(userId);
    if (entry) {
      entry.isSharing = isSharing;
      entry.lastSeen = Date.now();
    }
  }

  removeUser(sessionId: string, userId: string): void {
    this.sessions.get(sessionId)?.delete(userId);
  }

  getSocketId(sessionId: string, userId: string): string | undefined {
    return this.sessions.get(sessionId)?.get(userId)?.socketId;
  }

  getRoster(sessionId: string): ParticipantInfo[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return Array.from(session.values()).map((e) => ({
      userId: e.userId,
      displayName: e.displayName,
      role: e.role,
      status: e.status,
      isSharing: e.isSharing,
    }));
  }

  getUserSessions(socketId: string): Array<{ sessionId: string; userId: string }> {
    const result: Array<{ sessionId: string; userId: string }> = [];
    for (const [sessionId, users] of this.sessions) {
      for (const [userId, entry] of users) {
        if (entry.socketId === socketId) {
          result.push({ sessionId, userId });
        }
      }
    }
    return result;
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getStats(): { activeSessions: number; totalUsers: number } {
    let totalUsers = 0;
    for (const session of this.sessions.values()) {
      totalUsers += session.size;
    }
    return { activeSessions: this.sessions.size, totalUsers };
  }
}

export const presenceService = new PresenceService();
