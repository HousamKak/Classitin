import type { Socket, Server } from 'socket.io';
import { randomUUID } from 'crypto';
import { logger } from '../../utils/logger.js';

export function registerChatHandlers(socket: Socket, io: Server) {
  socket.on('chat:send', (payload) => {
    try {
      const { sessionId, text, isAnnouncement } = payload;
      const userId = socket.data.userId;
      const displayName = socket.data.displayName || 'Unknown';
      const role = socket.data.role || 'STUDENT';

      if (!text || !text.trim() || !sessionId) return;

      // Only teachers can send announcements
      const announcement = role === 'TEACHER' && isAnnouncement === true;

      const message = {
        id: randomUUID(),
        sessionId,
        userId,
        displayName,
        role,
        text: text.trim().slice(0, 500), // Limit message length
        isAnnouncement: announcement,
        timestamp: Date.now(),
      };

      // Broadcast to entire room including sender
      io.to(`session:${sessionId}`).emit('chat:message', { message });

      logger.info({ sessionId, userId, announcement }, 'Chat message sent');
    } catch (err) {
      logger.error(err, 'Error sending chat message');
    }
  });
}
