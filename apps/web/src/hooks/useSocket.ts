import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';

export function useSocket(): { socket: Socket | null; isConnected: boolean } {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      disconnectSocket();
      setIsConnected(false);
    };
  }, [accessToken]);

  return { socket: socketRef.current, isConnected };
}
