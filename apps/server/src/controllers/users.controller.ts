import type { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service.js';

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUser(param(req, 'userId'));
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateUser(req.userId!, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
