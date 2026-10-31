/**
 * Resets the database and loads dummy data:
 *   admin / admin123   (ADMIN)
 *   alice / password123
 *   bob   / password123
 * Document embeddings need Cloudflare credentials in .env; if that fails the banking data is still seeded.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Visibility } from '@prisma/client';
import { prisma } from '../src/db';
import { createUser } from '../src/services/user.service';
import { createCard } from '../src/services/card.service';
import { ingestDocument } from '../src/services/document.service';

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function main() {
  // Cascades to cards, transactions, transfers, documents and chunks.
  await prisma.user.deleteMany();

  const admin = await createUser({
    username: 'admin', password: 'admin123', name: 'Admin User', email: 'admin@demobank.test', role: 'ADMIN',
  });
  const alice = await createUser({
    username: 'alice', password: 'password123', name: 'Alice Smith', email: 'alice@demobank.test', initialBalance: 2450.75,
  });
  const bob = await createUser({
    username: 'bob', password: 'password123', name: 'Bob Jones', email: 'bob@demobank.test', initialBalance: 980.2,
  });

  const aliceDebit = await createCard(alice.id, 'DEBIT');
  const aliceCredit = await createCard(alice.id, 'CREDIT');
  const bobDebit = await createCard(bob.id, 'DEBIT');

  // Historical transactions; the balances above are treated as the current balance.
  await prisma.transaction.createMany({
    data: [
      { userId: alice.id, cardId: aliceDebit.id, type: 'DEBIT', amount: 42.18, description: 'Weekly shop', merchant: 'Tesco', createdAt: daysAgo(1) },
      { userId: alice.id, cardId: aliceDebit.id, type: 'DEBIT', amount: 6.4, description: 'Coffee and sandwich', merchant: 'Pret A Manger', createdAt: daysAgo(2) },
      { userId: alice.id, cardId: aliceDebit.id, type: 'DEBIT', amount: 8.1, description: 'Travel', merchant: 'TfL', createdAt: daysAgo(3) },
      { userId: alice.id, cardId: aliceCredit.id, type: 'DEBIT', amount: 129.99, description: 'Headphones', merchant: 'Amazon UK', createdAt: daysAgo(6) },
      { userId: alice.id, cardId: aliceCredit.id, type: 'CREDIT', amount: 25.0, description: 'Refund', merchant: 'Amazon UK', createdAt: daysAgo(4) },
      { userId: alice.id, type: 'CREDIT', amount: 2800.0, description: 'Salary - Acme Ltd', createdAt: daysAgo(10) },
      { userId: alice.id, cardId: aliceDebit.id, type: 'DEBIT', amount: 950.0, description: 'Rent', merchant: 'Rightmove Lettings', createdAt: daysAgo(9) },
      { userId: bob.id, cardId: bobDebit.id, type: 'DEBIT', amount: 23.5, description: 'Groceries', merchant: "Sainsbury's", createdAt: daysAgo(1) },
      { userId: bob.id, cardId: bobDebit.id, type: 'DEBIT', amount: 55.0, description: 'Petrol', merchant: 'Shell', createdAt: daysAgo(5) },
      { userId: bob.id, type: 'CREDIT', amount: 1900.0, description: 'Salary - Widget Co', createdAt: daysAgo(12) },
    ],
  });

  await prisma.transfer.create({
    data: { fromUserId: alice.id, toUserId: bob.id, amount: 30, description: 'Dinner split', createdAt: daysAgo(7) },
  });
  await prisma.transaction.createMany({
    data: [
      { userId: alice.id, type: 'DEBIT', amount: 30, description: 'Dinner split', createdAt: daysAgo(7) },
      { userId: bob.id, type: 'CREDIT', amount: 30, description: 'Dinner split', createdAt: daysAgo(7) },
    ],
  });

  console.log('Seeded users, cards, transactions and transfers.');

  const docs: { file: string; visibility: Visibility; ownerId: number }[] = [
    { file: 'bank-faq.md', visibility: 'PUBLIC', ownerId: admin.id },
    { file: 'fees-and-charges.md', visibility: 'PUBLIC', ownerId: admin.id },
    { file: 'alice-mortgage-offer.md', visibility: 'PRIVATE', ownerId: alice.id },
  ];
  try {
    for (const doc of docs) {
      await ingestDocument({
        fileName: doc.file,
        fileType: 'md',
        text: fs.readFileSync(path.join(__dirname, 'seed-docs', doc.file), 'utf8'),
        visibility: doc.visibility,
        docType: 'GENERAL',
        uploadedById: doc.ownerId,
      });
      console.log(`Ingested ${doc.file} (${doc.visibility})`);
    }
  } catch (err) {
    console.warn('Skipped document ingestion (check Cloudflare settings in .env):', err instanceof Error ? err.message : err);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
