import type { Server, Socket } from 'socket.io';
import { prisma } from '../../config/database.js';
import { presenceService } from '../../services/presence.service.js';
import { roomManager } from '../../mediasoup/roomManager.js';
import { logger } from '../../utils/logger.js';

export function registerRoomHandlers(socket: Socket, io: Server) {
  socket.on('room:join', async (payload, ack) => {
    try {
      const { roomId, sessionId } = payload;
      const userId = socket.data.userId;
      const role = socket.data.role;

      // Verify session is active
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { room: true },
      });
      if (!session || session.status !== 'ACTIVE') {
        return ack({ error: 'Session not active' });
      }

      // Verify access
      if (role === 'STUDENT') {
        const enrollment = await prisma.enrollment.findUnique({
          where: { userId_roomId: { userId, roomId: session.roomId } },
        });
        if (!enrollment || enrollment.status !== 'ACTIVE') {
          return ack({ error: 'Not enrolled in this room' });
        }
      } else if (role === 'TEACHER') {
        if (session.room.ownerId !== userId) {
          return ack({ error: 'Not the room owner' });
        }
      }

      // Get user info
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return ack({ error: 'User not found' });

      // Join Socket.IO room
      socket.join(`session:${sessionId}`);
      socket.data.sessionId = sessionId;
      socket.data.roomId = roomId;
      socket.data.displayName = user.displayName;

      // Set presence
      presenceService.setOnline(sessionId, userId, socket.id, user.displayName, role);

      // Get or create mediasoup router
      const router = await roomManager.getOrCreateRoom(sessionId);
      roomManager.addPeer(sessionId, userId);

      // Broadcast to room
      socket.to(`session:${sessionId}`).emit('room:peer-joined', {
        userId,
        displayName: user.displayName,
        role,
      });

      // Return room state
      const roster = presenceService.getRoster(sessionId);
      const existingProducers = roomManager.getActiveProducers(sessionId);

      ack({
        roster,
        rtpCapabilities: router.rtpCapabilities,
        existingProducers,
      });

      logger.info({ sessionId, userId, role }, 'Peer joined room');
    } catch (err) {
      logger.error(err, 'Error in room:join');
      ack({ error: 'Failed to join room' });
    }
  });

  socket.on('room:leave', async (payload) => {
    try {
      const { sessionId } = payload;
      const userId = socket.data.userId;

      socket.leave(`session:${sessionId}`);
      presenceService.removeUser(sessionId, userId);
      roomManager.removePeer(sessionId, userId);

      socket.to(`session:${sessionId}`).emit('room:peer-left', { userId });
      socket.to(`session:${sessionId}`).emit('stream:stopped', {
        userId,
        producerId: '',
      });

      logger.info({ sessionId, userId }, 'Peer left room');
    } catch (err) {
      logger.error(err, 'Error in room:leave');
    }
  });
}
