import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAdmin, requireAuth, resolveUserId } from '../middleware/auth';
import { createUser, getUser, listUsers } from '../services/user.service';
import { idSchema } from '../validation';

export const userRouter = Router();
userRouter.use(requireAuth);

const createUserSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(6),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  initialBalance: z.coerce.number().min(0).max(1_000_000).optional(),
});

// Create test users (admin only)
userRouter.post('/', requireAdmin, async (req, res) => {
  res.status(201).json(await createUser(createUserSchema.parse(req.body)));
});

userRouter.get('/', requireAdmin, async (_req, res) => {
  res.json(await listUsers());
});

userRouter.get('/:id', async (req, res) => {
  const userId = resolveUserId(currentUser(req), idSchema.parse(req.params.id));
  res.json(await getUser(userId));
});
