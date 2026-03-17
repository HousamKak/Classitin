import { v4 as uuid } from 'uuid';
import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { JOIN_CODE_LENGTH } from '@classitin/shared';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createRoom(
  ownerId: string,
  data: { name: string; description?: string; maxStudents?: number }
) {
  let joinCode = generateJoinCode();
  // Ensure uniqueness
  while (await prisma.room.findUnique({ where: { joinCode } })) {
    joinCode = generateJoinCode();
  }

  return prisma.room.create({
    data: {
      id: uuid(),
      name: data.name,
      description: data.description,
      maxStudents: data.maxStudents ?? 30,
      joinCode,
      ownerId,
    },
  });
}

export async function getUserRooms(userId: string, role: string) {
  if (role === 'TEACHER') {
    return prisma.room.findMany({
      where: { ownerId: userId, isArchived: false },
      orderBy: { createdAt: 'desc' },
    });
  }
  // Students: find rooms they're enrolled in
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: 'ACTIVE' },
    include: { room: true },
  });
  return enrollments.map((e) => e.room);
}

export async function getRoom(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      enrollments: {
        where: { status: 'ACTIVE' },
        include: { user: { select: { id: true, email: true, displayName: true, role: true, avatarUrl: true } } },
      },
      sessions: {
        where: { status: 'ACTIVE' },
        take: 1,
      },
    },
  });
  if (!room) throw new NotFoundError('Room not found');

  return {
    ...room,
    activeSession: room.sessions[0] ?? null,
    sessions: undefined,
  };
}

export async function updateRoom(
  roomId: string,
  ownerId: string,
  data: { name?: string; description?: string | null; maxStudents?: number }
) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new NotFoundError('Room not found');
  if (room.ownerId !== ownerId) throw new ForbiddenError('Not the room owner');

  return prisma.room.update({ where: { id: roomId }, data });
}

export async function deleteRoom(roomId: string, ownerId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new NotFoundError('Room not found');
  if (room.ownerId !== ownerId) throw new ForbiddenError('Not the room owner');

  await prisma.room.delete({ where: { id: roomId } });
}

export async function joinRoom(userId: string, joinCode: string) {
  const room = await prisma.room.findUnique({ where: { joinCode } });
  if (!room) throw new NotFoundError('Invalid join code');

  const existing = await prisma.enrollment.findUnique({
    where: { userId_roomId: { userId, roomId: room.id } },
  });
  if (existing) {
    if (existing.status === 'ACTIVE') {
      throw new ConflictError('Already enrolled in this room');
    }
    // Re-activate removed enrollment
    const enrollment = await prisma.enrollment.update({
      where: { id: existing.id },
      data: { status: 'ACTIVE' },
    });
    return { room, enrollment };
  }

  const enrollmentCount = await prisma.enrollment.count({
    where: { roomId: room.id, status: 'ACTIVE' },
  });
  if (enrollmentCount >= room.maxStudents) {
    throw new ConflictError('Room is full');
  }

  const enrollment = await prisma.enrollment.create({
    data: { id: uuid(), userId, roomId: room.id },
  });
  return { room, enrollment };
}

export async function getRoster(roomId: string) {
  return prisma.enrollment.findMany({
    where: { roomId, status: 'ACTIVE' },
    include: {
      user: {
        select: { id: true, email: true, displayName: true, role: true, avatarUrl: true },
      },
    },
  });
}

export async function removeEnrollment(
  roomId: string,
  enrollmentId: string,
  ownerId: string
) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new NotFoundError('Room not found');
  if (room.ownerId !== ownerId) throw new ForbiddenError('Not the room owner');

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: 'REMOVED' },
  });
}
