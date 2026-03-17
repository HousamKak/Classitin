import type { Server, Socket } from 'socket.io';
import { presenceService } from '../../services/presence.service.js';
import { logger } from '../../utils/logger.js';

export function registerPresenceHandlers(socket: Socket, io: Server) {
  socket.on('presence:update', (payload) => {
    try {
      const { sessionId, status } = payload;
      const userId = socket.data.userId;

      presenceService.setStatus(sessionId, userId, status);

      socket.to(`session:${sessionId}`).emit('presence:changed', {
        userId,
        status,
        lastSeen: Date.now(),
      });
    } catch (err) {
      logger.error(err, 'Error updating presence');
    }
  });
}
