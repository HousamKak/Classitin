import { useEffect, useState, useCallback } from 'react';
import type { ParticipantInfo, PresenceStatus } from '@classitin/shared';
import { getSocket } from '@/services/socket';

export function usePresence(sessionId: string | null) {
  const [participants, setParticipants] = useState<Map<string, ParticipantInfo>>(new Map());

  useEffect(() => {
    if (!sessionId) return;
    let socket: ReturnType<typeof getSocket>;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    const handlePeerJoined = (payload: { userId: string; displayName: string; role: string }) => {
      setParticipants((prev) => {
        const next = new Map(prev);
        next.set(payload.userId, {
          userId: payload.userId,
          displayName: payload.displayName,
          role: payload.role as 'TEACHER' | 'STUDENT',
          status: 'ONLINE',
          isSharing: false,
        });
        return next;
      });
    };

    const handlePeerLeft = (payload: { userId: string }) => {
      setParticipants((prev) => {
        const next = new Map(prev);
        next.delete(payload.userId);
        return next;
      });
    };

    const handlePresenceChanged = (payload: { userId: string; status: PresenceStatus }) => {
      setParticipants((prev) => {
        const next = new Map(prev);
        const existing = next.get(payload.userId);
        if (existing) {
          next.set(payload.userId, { ...existing, status: payload.status });
        }
        return next;
      });
    };

    const handleRoster = (payload: { participants: ParticipantInfo[] }) => {
      const map = new Map<string, ParticipantInfo>();
      for (const p of payload.participants) {
        map.set(p.userId, p);
      }
      setParticipants(map);
    };

    socket.on('room:peer-joined', handlePeerJoined);
    socket.on('room:peer-left', handlePeerLeft);
    socket.on('presence:changed', handlePresenceChanged);
    socket.on('presence:roster', handleRoster);

    return () => {
      socket.off('room:peer-joined', handlePeerJoined);
      socket.off('room:peer-left', handlePeerLeft);
      socket.off('presence:changed', handlePresenceChanged);
      socket.off('presence:roster', handleRoster);
    };
  }, [sessionId]);

  const updateMyStatus = useCallback((status: PresenceStatus) => {
    if (!sessionId) return;
    try {
      const socket = getSocket();
      socket.emit('presence:update', { sessionId, status });
    } catch {
      // Socket not connected
    }
  }, [sessionId]);

  const initRoster = useCallback((roster: ParticipantInfo[]) => {
    const map = new Map<string, ParticipantInfo>();
    for (const p of roster) {
      map.set(p.userId, p);
    }
    setParticipants(map);
  }, []);

  return { participants, updateMyStatus, initRoster };
}
