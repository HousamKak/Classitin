import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const SERVER_URL = `https://${window.location.hostname}:3001`;

export function getSocket(): Socket {
  if (!socket) {
    throw new Error('Socket not connected. Call connectSocket() first.');
  }
  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SERVER_URL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
