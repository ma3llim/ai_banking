import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../middleware/auth';
import { login } from '../services/auth.service';
import { getUser } from '../services/user.service';

export const authRouter = Router();

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

authRouter.post('/login', async (req, res) => {
  const { username, password } = loginSchema.parse(req.body);
  res.json(await login(username, password));
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json(await getUser(currentUser(req).id));
});
