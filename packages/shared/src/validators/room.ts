import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  maxStudents: z.number().int().min(1).max(100).optional(),
});

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  maxStudents: z.number().int().min(1).max(100).optional(),
});

export const joinRoomSchema = z.object({
  joinCode: z.string().length(6),
});

export const createSessionSchema = z.object({
  title: z.string().max(200).optional(),
});

export const updateSessionSchema = z.object({
  status: z.literal('ENDED'),
});
