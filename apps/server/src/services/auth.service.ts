import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { ConflictError, UnauthorizedError } from '../utils/errors.js';

export async function register(
  email: string,
  password: string,
  displayName: string,
  role: 'TEACHER' | 'STUDENT'
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { id: uuid(), email, passwordHash, displayName, role },
  });

  const tokens = generateTokens(user.id, user.role as 'TEACHER' | 'STUDENT');
  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tokens = generateTokens(user.id, user.role as 'TEACHER' | 'STUDENT');
  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

export async function refreshTokens(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, config.jwt.secret) as {
      sub: string;
      role: 'TEACHER' | 'STUDENT';
      type: string;
    };
    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid refresh token');
    }
    return generateTokens(payload.sub, payload.role);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new UnauthorizedError('User not found');
  }
  return sanitizeUser(user);
}

function generateTokens(userId: string, role: 'TEACHER' | 'STUDENT') {
  const accessToken = jwt.sign(
    { sub: userId, role },
    config.jwt.secret,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { sub: userId, role, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
}

function sanitizeUser(user: {
  id: string;
  email: string;
  displayName: string;
  role: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
