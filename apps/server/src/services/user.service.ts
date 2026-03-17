import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, role: true, avatarUrl: true },
  });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

export async function updateUser(
  userId: string,
  data: { displayName?: string; avatarUrl?: string | null }
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, displayName: true, role: true, avatarUrl: true },
  });
}
