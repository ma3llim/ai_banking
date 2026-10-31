import { randomInt } from 'node:crypto';
import type { CardType } from '@prisma/client';
import { prisma } from '../db';
import { HttpError } from '../errors';

/** Dummy 16-digit card number (not a real PAN). */
function generateCardNumber(): string {
  let digits = '4';
  for (let i = 0; i < 15; i++) digits += randomInt(10);
  return digits;
}

export function maskCardNumber(cardNumber: string): string {
  return `**** **** **** ${cardNumber.slice(-4)}`;
}

export async function createCard(userId: number, cardType: CardType) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');

  return prisma.card.create({
    data: { userId, cardType, cardNumber: generateCardNumber() },
  });
}

export async function getCard(id: number) {
  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) throw new HttpError(404, 'Card not found');
  return card;
}

export function listCards(userId: number) {
  return prisma.card.findMany({ where: { userId }, orderBy: { id: 'asc' } });
}
