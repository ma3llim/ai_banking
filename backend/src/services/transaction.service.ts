import type { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../db';
import { HttpError } from '../errors';
import { isAdmin, type AuthUser } from '../middleware/auth';

/** Debits a user's balance, failing if funds are insufficient. Call inside a DB transaction. */
export async function debitBalance(tx: Prisma.TransactionClient, userId: number, amount: number) {
  const { count } = await tx.user.updateMany({
    where: { id: userId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (count === 0) throw new HttpError(400, 'Insufficient funds');
}

export async function creditBalance(tx: Prisma.TransactionClient, userId: number, amount: number) {
  await tx.user.update({ where: { id: userId }, data: { balance: { increment: amount } } });
}

export interface CreateTransactionInput {
  cardId: number;
  type: TransactionType;
  amount: number;
  description: string;
  merchant?: string;
}

/** Simulates a card purchase (DEBIT) or refund/top-up (CREDIT) and updates the card owner's balance. */
export async function createTransaction(actor: AuthUser, input: CreateTransactionInput) {
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({ where: { id: input.cardId } });
    if (!card) throw new HttpError(404, 'Card not found');
    if (card.userId !== actor.id && !isAdmin(actor)) throw new HttpError(403, 'Not your card');
    if (card.status !== 'ACTIVE') throw new HttpError(400, 'Card is blocked');

    if (input.type === 'DEBIT') await debitBalance(tx, card.userId, input.amount);
    else await creditBalance(tx, card.userId, input.amount);

    return tx.transaction.create({
      data: {
        userId: card.userId,
        cardId: card.id,
        type: input.type,
        amount: input.amount,
        description: input.description,
        merchant: input.merchant,
      },
    });
  });
}

export interface TransactionFilter {
  userId: number;
  cardId?: number;
  type?: TransactionType;
  from?: Date;
  to?: Date;
  limit?: number;
}

export function listTransactions(filter: TransactionFilter) {
  return prisma.transaction.findMany({
    where: {
      userId: filter.userId,
      cardId: filter.cardId,
      type: filter.type,
      createdAt: { gte: filter.from, lte: filter.to },
    },
    orderBy: { createdAt: 'desc' },
    take: filter.limit ?? 50,
  });
}
