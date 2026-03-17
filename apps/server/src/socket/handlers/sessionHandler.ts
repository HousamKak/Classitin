import type { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger.js';

export function registerSessionHandlers(_socket: Socket, _io: Server) {
  // Session lifecycle events are triggered from REST endpoints
  // and broadcast via io.to(`session:${sessionId}`)
  // This handler is a placeholder for future session-specific socket events
}
