import type { Request, Response, NextFunction } from 'express';
import * as sessionService from '../services/session.service.js';
import { getIO } from '../socket/index.js';
import { logger } from '../utils/logger.js';

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const roomId = param(req, 'roomId');
    const session = await sessionService.createSession(
      roomId,
      req.userId!,
      req.body
    );

    // Broadcast to all sockets — clients filter by roomId
    try {
      const io = getIO();
      io.emit('session:started', { session, roomId });
      logger.info({ roomId, sessionId: session.id }, 'Broadcast session:started');
    } catch {
      // io not ready
    }

    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const roomId = param(req, 'roomId');
    const sessionId = param(req, 'sessionId');
    const session = await sessionService.endSession(
      roomId,
      sessionId,
      req.userId!
    );

    // Broadcast to session participants and room viewers
    try {
      const io = getIO();
      io.to(`session:${sessionId}`).emit('session:ended', { sessionId, roomId });
      io.emit('session:ended', { sessionId, roomId });
      logger.info({ roomId, sessionId }, 'Broadcast session:ended');
    } catch {
      // io not ready
    }

    res.json({ session });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const sessions = await sessionService.getSessions(param(req, 'roomId'));
    res.json({ sessions, total: sessions.length });
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await sessionService.getSession(
      param(req, 'roomId'),
      param(req, 'sessionId')
    );
    res.json({ session });
  } catch (err) {
    next(err);
  }
}
