import { v4 as uuid } from 'uuid';
import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';

export async function createSession(
  roomId: string,
  ownerId: string,
  data: { title?: string }
) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new NotFoundError('Room not found');
  if (room.ownerId !== ownerId) throw new ForbiddenError('Not the room owner');

  // Check for already active session
  const active = await prisma.session.findFirst({
    where: { roomId, status: 'ACTIVE' },
  });
  if (active) throw new ConflictError('Room already has an active session');

  return prisma.session.create({
    data: {
      id: uuid(),
      roomId,
      title: data.title,
      status: 'ACTIVE',
      startedAt: new Date(),
    },
  });
}

export async function endSession(
  roomId: string,
  sessionId: string,
  ownerId: string
) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new NotFoundError('Room not found');
  if (room.ownerId !== ownerId) throw new ForbiddenError('Not the room owner');

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.roomId !== roomId) {
    throw new NotFoundError('Session not found');
  }

  return prisma.session.update({
    where: { id: sessionId },
    data: { status: 'ENDED', endedAt: new Date() },
  });
}

export async function getSessions(roomId: string) {
  return prisma.session.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSession(roomId: string, sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { liveStreams: true },
  });
  if (!session || session.roomId !== roomId) {
    throw new NotFoundError('Session not found');
  }
  return session;
}
