import { Router } from 'express';
import { z } from 'zod';
import { runChat } from '../ai/orchestrator';
import { currentUser, requireAuth } from '../middleware/auth';

export const chatRouter = Router();
chatRouter.use(requireAuth);

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .max(10)
    .default([]),
});

chatRouter.post('/', async (req, res) => {
  const { message, history } = chatSchema.parse(req.body);
  res.json(await runChat(currentUser(req), message, history));
});
