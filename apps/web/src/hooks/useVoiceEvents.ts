import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '@/services/socket';

interface VoiceState {
  isBroadcasting: boolean;
  broadcastUserId: string | null;
  inPrivateCall: boolean;
  privateCallFromUserId: string | null;
  privateCallFromName: string | null;
}

export function useVoiceEvents(sessionId: string | null) {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isBroadcasting: false,
    broadcastUserId: null,
    inPrivateCall: false,
    privateCallFromUserId: null,
    privateCallFromName: null,
  });

  // Audio elements for remote audio playback
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (!sessionId) return;
    let socket: ReturnType<typeof getSocket>;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    const handleBroadcastStarted = (payload: { userId: string }) => {
      setVoiceState((prev) => ({
        ...prev,
        isBroadcasting: true,
        broadcastUserId: payload.userId,
      }));
    };

    const handleBroadcastEnded = () => {
      setVoiceState((prev) => ({
        ...prev,
        isBroadcasting: false,
        broadcastUserId: null,
      }));
    };

    const handleCallIncoming = (payload: { fromUserId: string; fromDisplayName: string }) => {
      setVoiceState((prev) => ({
        ...prev,
        inPrivateCall: true,
        privateCallFromUserId: payload.fromUserId,
        privateCallFromName: payload.fromDisplayName,
      }));
    };

    const handleCallEnded = () => {
      setVoiceState((prev) => ({
        ...prev,
        inPrivateCall: false,
        privateCallFromUserId: null,
        privateCallFromName: null,
      }));
    };

    socket.on('voice:broadcast-started', handleBroadcastStarted);
    socket.on('voice:broadcast-ended', handleBroadcastEnded);
    socket.on('voice:call-incoming', handleCallIncoming);
    socket.on('voice:call-ended', handleCallEnded);

    return () => {
      socket.off('voice:broadcast-started', handleBroadcastStarted);
      socket.off('voice:broadcast-ended', handleBroadcastEnded);
      socket.off('voice:call-incoming', handleCallIncoming);
      socket.off('voice:call-ended', handleCallEnded);
    };
  }, [sessionId]);

  // Play a remote audio track through speakers
  const playAudioTrack = useCallback((consumerId: string, track: MediaStreamTrack) => {
    // Clean up existing element for this consumer
    const existing = audioElementsRef.current.get(consumerId);
    if (existing) {
      existing.srcObject = null;
      existing.remove();
    }

    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.srcObject = new MediaStream([track]);
    audio.play().catch(() => {
      // Autoplay may be blocked
    });
    audioElementsRef.current.set(consumerId, audio);
  }, []);

  // Stop playing a specific audio track
  const stopAudioTrack = useCallback((consumerId: string) => {
    const audio = audioElementsRef.current.get(consumerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      audioElementsRef.current.delete(consumerId);
    }
  }, []);

  // Cleanup all audio elements on unmount
  useEffect(() => {
    return () => {
      for (const audio of audioElementsRef.current.values()) {
        audio.srcObject = null;
        audio.remove();
      }
      audioElementsRef.current.clear();
    };
  }, []);

  return {
    ...voiceState,
    playAudioTrack,
    stopAudioTrack,
  };
}
