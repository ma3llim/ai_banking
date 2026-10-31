import bcrypt from 'bcryptjs';
import { Prisma, type Role } from '@prisma/client';
import { prisma } from '../db';
import { HttpError } from '../errors';

const publicUserFields = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
  balance: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export interface CreateUserInput {
  username: string;
  password: string;
  name: string;
  email: string;
  role?: Role;
  initialBalance?: number;
}

export async function createUser(input: CreateUserInput) {
  try {
    return await prisma.user.create({
      data: {
        username: input.username,
        passwordHash: await bcrypt.hash(input.password, 10),
        name: input.name,
        email: input.email,
        role: input.role ?? 'USER',
        balance: input.initialBalance ?? 0,
      },
      select: publicUserFields,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new HttpError(409, 'Username or email already exists');
    }
    throw err;
  }
}

export async function getUser(id: number) {
  const user = await prisma.user.findUnique({ where: { id }, select: publicUserFields });
  if (!user) throw new HttpError(404, 'User not found');
  return user;
}

export function listUsers() {
  return prisma.user.findMany({ select: publicUserFields, orderBy: { id: 'asc' } });
}
