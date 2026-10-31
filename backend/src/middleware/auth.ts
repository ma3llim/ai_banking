import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { config } from '../config';
import { HttpError } from '../errors';

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Missing bearer token');

  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as AuthUser;
    req.user = { id: payload.id, username: payload.username, role: payload.role };
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (currentUser(req).role !== 'ADMIN') throw new HttpError(403, 'Admin only');
  next();
}

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new HttpError(401, 'Not authenticated');
  return req.user;
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === 'ADMIN';
}

/** Users may only act on their own data; admins may target any user. */
export function resolveUserId(user: AuthUser, requestedUserId?: number): number {
  if (requestedUserId === undefined || requestedUserId === user.id) return user.id;
  if (!isAdmin(user)) throw new HttpError(403, 'You can only access your own data');
  return requestedUserId;
}
