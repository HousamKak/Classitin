import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'https';
import { socketAuth } from '../middleware/socketAuth.js';
import { registerRoomHandlers } from './handlers/roomHandler.js';
import { registerSignalingHandlers } from './handlers/signalingHandler.js';
import { registerPresenceHandlers } from './handlers/presenceHandler.js';
import { registerSessionHandlers } from './handlers/sessionHandler.js';
import { registerChatHandlers } from './handlers/chatHandler.js';
import { presenceService } from '../services/presence.service.js';
import { roomManager } from '../mediasoup/roomManager.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { PRESENCE_BROADCAST_INTERVAL_MS } from '@classitin/shared';

let ioInstance: SocketServer | null = null;

export function getIO(): SocketServer {
  if (!ioInstance) throw new Error('Socket.IO not initialized');
  return ioInstance;
}

export function createSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps)
        if (!origin) return callback(null, true);
        if (config.cors.origin.includes(origin)) return callback(null, true);
        callback(null, false);
      },
      credentials: true,
    },
    transports: ['websocket'],
  });

  ioInstance = io;

  // Auth middleware
  io.use(socketAuth);

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id, userId: socket.data.userId }, 'Socket connected');

    registerRoomHandlers(socket, io);
    registerSignalingHandlers(socket, io);
    registerPresenceHandlers(socket, io);
    registerSessionHandlers(socket, io);
    registerChatHandlers(socket, io);

    socket.on('disconnect', () => {
      const userId = socket.data.userId;
      const sessions = presenceService.getUserSessions(socket.id);

      for (const { sessionId } of sessions) {
        presenceService.removeUser(sessionId, userId);
        roomManager.removePeer(sessionId, userId);
        socket.to(`session:${sessionId}`).emit('room:peer-left', { userId });
        socket.to(`session:${sessionId}`).emit('stream:stopped', {
          userId,
          producerId: '',
        });
      }

      logger.info({ socketId: socket.id, userId }, 'Socket disconnected');
    });
  });

  // Periodic presence roster broadcast
  setInterval(() => {
    // Get all active socket rooms that start with "session:"
    for (const [roomName] of io.sockets.adapter.rooms) {
      if (roomName.startsWith('session:')) {
        const sessionId = roomName.replace('session:', '');
        const roster = presenceService.getRoster(sessionId);
        if (roster.length > 0) {
          io.to(roomName).emit('presence:roster', { participants: roster });
        }
      }
    }
  }, PRESENCE_BROADCAST_INTERVAL_MS);

  return io;
}
