import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth, resolveUserId } from '../middleware/auth';
import { createTransfer, listTransfers } from '../services/transfer.service';
import { amountSchema, idSchema } from '../validation';

export const transferRouter = Router();
transferRouter.use(requireAuth);

const createTransferSchema = z.object({
  toUsername: z.string().min(1),
  amount: amountSchema,
  description: z.string().max(200).optional(),
});

// "Pay to": send money from the logged-in user to another user
transferRouter.post('/', async (req, res) => {
  const body = createTransferSchema.parse(req.body);
  res.status(201).json(await createTransfer(currentUser(req).id, body.toUsername, body.amount, body.description));
});

transferRouter.get('/', async (req, res) => {
  const { userId } = z.object({ userId: idSchema.optional() }).parse(req.query);
  res.json(await listTransfers(resolveUserId(currentUser(req), userId)));
});
