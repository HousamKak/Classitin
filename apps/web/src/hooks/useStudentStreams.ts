import { useEffect, useCallback } from 'react';
import { getSocket } from '@/services/socket';
import { consumeStream, setPreferredLayers } from '@/services/mediasoupClient';
import { useMediaStore } from '@/stores/mediaStore';
import type { Transport } from 'mediasoup-client/types';

export function useStudentStreams(
  sessionId: string | null,
  recvTransport: Transport | null
) {
  const addConsumer = useMediaStore((s) => s.addConsumer);
  const removeConsumer = useMediaStore((s) => s.removeConsumer);
  const removeConsumersByUserId = useMediaStore((s) => s.removeConsumersByUserId);
  const focusedStudentId = useMediaStore((s) => s.focusedStudentId);
  const setFocusedStudent = useMediaStore((s) => s.setFocusedStudent);
  const consumers = useMediaStore((s) => s.consumers);

  // Subscribe to a new producer
  const subscribeToProducer = useCallback(async (
    producerId: string,
    userId: string
  ) => {
    console.log('[useStudentStreams] subscribeToProducer called', { producerId, userId, hasRecvTransport: !!recvTransport, sessionId });
    if (!recvTransport || !sessionId) {
      console.warn('[useStudentStreams] SKIPPING subscribe - missing recvTransport or sessionId', { hasRecvTransport: !!recvTransport, sessionId });
      return;
    }

    try {
      console.log('[useStudentStreams] calling consumeStream...');
      const consumer = await consumeStream(recvTransport, sessionId, producerId);
      console.log('[useStudentStreams] consumer created!', {
        consumerId: consumer.id,
        kind: consumer.kind,
        trackId: consumer.track?.id,
        trackReadyState: consumer.track?.readyState,
        trackMuted: consumer.track?.muted,
        trackEnabled: consumer.track?.enabled,
      });
      addConsumer({
        consumerId: consumer.id,
        producerId,
        userId,
        track: consumer.track,
        kind: consumer.kind,
        paused: false,
      });
    } catch (err) {
      console.error('[useStudentStreams] Failed to subscribe to producer:', err);
    }
  }, [recvTransport, sessionId, addConsumer]);

  // Listen for stream events
  useEffect(() => {
    if (!sessionId) return;
    let socket: ReturnType<typeof getSocket>;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    const handleStreamStarted = (payload: { userId: string; producerId: string }) => {
      console.log('[useStudentStreams] >>> stream:started event received!', payload);
      subscribeToProducer(payload.producerId, payload.userId);
    };

    const handleStreamStopped = (payload: { userId: string }) => {
      console.log('[useStudentStreams] >>> stream:stopped event received', payload);
      removeConsumersByUserId(payload.userId);
    };

    console.log('[useStudentStreams] Setting up socket listeners for session:', sessionId);
    socket.on('stream:started', handleStreamStarted);
    socket.on('stream:stopped', handleStreamStopped);

    return () => {
      socket.off('stream:started', handleStreamStarted);
      socket.off('stream:stopped', handleStreamStopped);
    };
  }, [sessionId, subscribeToProducer, removeConsumersByUserId]);

  // Focus / unfocus with layer switching
  const focusStudent = useCallback((userId: string) => {
    setFocusedStudent(userId);
    // Find the consumer for this user and upgrade to high-res
    for (const info of consumers.values()) {
      if (info.userId === userId) {
        setPreferredLayers(info.consumerId, 2, 2);
      }
    }
  }, [consumers, setFocusedStudent]);

  const unfocusStudent = useCallback(() => {
    // Downgrade the currently focused student back to thumbnail
    if (focusedStudentId) {
      for (const info of consumers.values()) {
        if (info.userId === focusedStudentId) {
          setPreferredLayers(info.consumerId, 0, 0);
        }
      }
    }
    setFocusedStudent(null);
  }, [consumers, focusedStudentId, setFocusedStudent]);

  return { subscribeToProducer, focusStudent, unfocusStudent };
}
