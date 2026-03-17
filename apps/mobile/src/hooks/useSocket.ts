import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

export function useSocket(): {
  socket: Socket | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  reconnectAttempt: number;
} {
  const socketRef = useRef<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionState('connected');
      setReconnectAttempt(0);
    });

    socket.on('disconnect', () => {
      setConnectionState('reconnecting');
    });

    socket.io.on('reconnect_attempt', (attempt: number) => {
      setReconnectAttempt(attempt);
      setConnectionState('reconnecting');
    });

    socket.io.on('reconnect_failed', () => {
      setConnectionState('disconnected');
    });

    socket.io.on('reconnect', () => {
      setConnectionState('connected');
      setReconnectAttempt(0);
    });

    return () => {
      disconnectSocket();
      setConnectionState('disconnected');
    };
  }, [accessToken]);

  return {
    socket: socketRef.current,
    isConnected: connectionState === 'connected',
    connectionState,
    reconnectAttempt,
  };
}
