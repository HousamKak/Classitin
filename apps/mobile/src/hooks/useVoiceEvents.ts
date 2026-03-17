import { useEffect, useState } from 'react';
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

  // Note: On React Native, audio tracks from mediasoup consumers
  // are played automatically by the WebRTC module. No explicit
  // audio element management is needed (unlike the web version).

  return voiceState;
}
