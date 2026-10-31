import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth, resolveUserId } from '../middleware/auth';
import { createTransaction, listTransactions } from '../services/transaction.service';
import { amountSchema, idSchema } from '../validation';

export const transactionRouter = Router();
transactionRouter.use(requireAuth);

const createTransactionSchema = z.object({
  cardId: idSchema,
  type: z.enum(['DEBIT', 'CREDIT']),
  amount: amountSchema,
  description: z.string().min(1).max(200),
  merchant: z.string().max(100).optional(),
});

transactionRouter.post('/', async (req, res) => {
  res.status(201).json(await createTransaction(currentUser(req), createTransactionSchema.parse(req.body)));
});

const listQuerySchema = z.object({
  userId: idSchema.optional(),
  cardId: idSchema.optional(),
  type: z.enum(['DEBIT', 'CREDIT']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

transactionRouter.get('/', async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  res.json(await listTransactions({ ...query, userId: resolveUserId(currentUser(req), query.userId) }));
});
