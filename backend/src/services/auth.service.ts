import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { HttpError } from '../errors';
import { signToken } from '../middleware/auth';
import { getUser } from './user.service';

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid username or password');
  }

  const token = signToken({ id: user.id, username: user.username, role: user.role });
  return { token, user: await getUser(user.id) };
}
