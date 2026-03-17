import type { Request, Response, NextFunction } from 'express';
import * as roomService from '../services/room.service.js';

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const room = await roomService.createRoom(req.userId!, req.body);
    res.status(201).json({ room });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const rooms = await roomService.getUserRooms(req.userId!, req.userRole!);
    res.json({ rooms });
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const room = await roomService.getRoom(param(req, 'roomId'));
    res.json(room);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const room = await roomService.updateRoom(param(req, 'roomId'), req.userId!, req.body);
    res.json({ room });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await roomService.deleteRoom(param(req, 'roomId'), req.userId!);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function join(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await roomService.joinRoom(req.userId!, req.body.joinCode);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function roster(req: Request, res: Response, next: NextFunction) {
  try {
    const enrollments = await roomService.getRoster(param(req, 'roomId'));
    res.json({ enrollments });
  } catch (err) {
    next(err);
  }
}

export async function removeEnrollment(req: Request, res: Response, next: NextFunction) {
  try {
    await roomService.removeEnrollment(
      param(req, 'roomId'),
      param(req, 'enrollmentId'),
      req.userId!
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
