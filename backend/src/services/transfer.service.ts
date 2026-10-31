import { prisma } from '../db';
import { HttpError } from '../errors';
import { creditBalance, debitBalance } from './transaction.service';

/** Moves money between users atomically and records it on both sides. */
export async function createTransfer(fromUserId: number, toUsername: string, amount: number, description?: string) {
  return prisma.$transaction(async (tx) => {
    const [from, to] = await Promise.all([
      tx.user.findUnique({ where: { id: fromUserId } }),
      tx.user.findUnique({ where: { username: toUsername } }),
    ]);
    if (!from) throw new HttpError(404, 'Sender not found');
    if (!to) throw new HttpError(404, `No user named "${toUsername}"`);
    if (to.id === from.id) throw new HttpError(400, 'Cannot transfer to yourself');

    await debitBalance(tx, from.id, amount);
    await creditBalance(tx, to.id, amount);

    const transfer = await tx.transfer.create({
      data: { fromUserId: from.id, toUserId: to.id, amount, description },
    });
    await tx.transaction.createMany({
      data: [
        { userId: from.id, type: 'DEBIT', amount, description: description ?? `Transfer to ${to.username}` },
        { userId: to.id, type: 'CREDIT', amount, description: description ?? `Transfer from ${from.username}` },
      ],
    });
    return transfer;
  });
}

export function listTransfers(userId: number, limit = 50) {
  return prisma.transfer.findMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    include: {
      fromUser: { select: { id: true, username: true, name: true } },
      toUser: { select: { id: true, username: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
