import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth, resolveUserId } from '../middleware/auth';
import { analyzeAccountMonth } from '../services/analysis.service';
import { idSchema } from '../validation';

export const analysisRouter = Router();
analysisRouter.use(requireAuth);

const monthlyQuerySchema = z.object({
  userId: idSchema.optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM')
    .default(() => new Date().toISOString().slice(0, 7)),
});

// Spending summary + AI expert review for one month (defaults to the current month)
analysisRouter.get('/monthly', async (req, res) => {
  const { userId, month } = monthlyQuerySchema.parse(req.query);
  res.json(await analyzeAccountMonth(resolveUserId(currentUser(req), userId), month));
});
