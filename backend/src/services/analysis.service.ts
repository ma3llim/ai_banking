import { z } from 'zod';
import type { Transaction } from '@prisma/client';
import { prisma } from '../db';
import { HttpError } from '../errors';
import { chatJson } from '../ai/cloudflare';

export const CATEGORIES = [
  'Groceries',
  'Eating out',
  'Transport',
  'Shopping',
  'Housing',
  'Bills',
  'Health',
  'Subscriptions',
  'Entertainment',
  'Cash',
  'Transfers',
  'Income',
  'Other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface NormalizedTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  merchant?: string | null;
  amount: number; // always positive
  type: 'DEBIT' | 'CREDIT';
  category: Category;
}

export interface SpendingStats {
  period: string;
  transactionCount: number;
  moneyIn: number;
  moneyOut: number;
  net: number;
  /** Money out by category, largest first. */
  byCategory: { category: Category; amount: number; count: number }[];
  daily: { date: string; spent: number; received: number }[];
  topMerchants: { name: string; amount: number; count: number }[];
  largest: NormalizedTransaction[];
}

export interface ExpertSummary {
  headline: string;
  insights: string[];
  recommendations: string[];
}

export interface AnalysisReport {
  source: 'ACCOUNT' | 'STATEMENT';
  title: string;
  stats: SpendingStats;
  summary: ExpertSummary;
  transactions: NormalizedTransaction[];
  generatedAt: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------- categorisation

const CATEGORY_RULES: [RegExp, Category][] = [
  [/salary|payroll|wages/i, 'Income'],
  [/tesco|sainsbury|asda|aldi|lidl|waitrose|morrisons|co-?op|grocer/i, 'Groceries'],
  [/pret|costa|starbucks|greggs|nando|mcdonald|deliveroo|just eat|restaurant|cafe|coffee|lunch|dinner/i, 'Eating out'],
  [/tfl|uber|trainline|national rail|petrol|shell|\bbp\b|esso|parking|travel/i, 'Transport'],
  [/rent|lettings|mortgage/i, 'Housing'],
  [/council tax|octopus|british gas|edf|thames water|utilit|broadband|bt |vodafone|\bee\b|o2/i, 'Bills'],
  [/boots|superdrug|pharmacy|dentist|gym/i, 'Health'],
  [/netflix|spotify|disney|prime video|apple\.com|subscription/i, 'Subscriptions'],
  [/cinema|odeon|vue|ticketmaster|steam|playstation/i, 'Entertainment'],
  [/amazon|argos|john lewis|primark|next |ebay|online order|headphones/i, 'Shopping'],
  [/atm|cash withdrawal/i, 'Cash'],
];

/** Rule-based category for an account transaction. Transfers have no card. */
export function categorize(t: Pick<Transaction, 'description' | 'merchant' | 'cardId' | 'type'>): Category {
  const text = `${t.merchant ?? ''} ${t.description}`;
  for (const [pattern, category] of CATEGORY_RULES) if (pattern.test(text)) return category;
  if (t.cardId === null) return t.type === 'CREDIT' ? 'Income' : 'Transfers';
  return 'Other';
}

function toCategory(value: string | undefined): Category {
  return CATEGORIES.find((c) => c.toLowerCase() === value?.trim().toLowerCase()) ?? 'Other';
}

// ---------------------------------------------------------------- statistics

function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); isoDate(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(isoDate(d));
  }
  return days;
}

export function computeStats(
  period: string,
  txns: NormalizedTransaction[],
  range?: { from: string; to: string },
): SpendingStats {
  const out = txns.filter((t) => t.type === 'DEBIT');
  const moneyIn = round2(txns.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0));
  const moneyOut = round2(out.reduce((s, t) => s + t.amount, 0));

  const byCategory = new Map<Category, { amount: number; count: number }>();
  const byMerchant = new Map<string, { amount: number; count: number }>();
  for (const t of out) {
    const c = byCategory.get(t.category) ?? { amount: 0, count: 0 };
    byCategory.set(t.category, { amount: c.amount + t.amount, count: c.count + 1 });
    const name = t.merchant || t.description;
    const m = byMerchant.get(name) ?? { amount: 0, count: 0 };
    byMerchant.set(name, { amount: m.amount + t.amount, count: m.count + 1 });
  }

  // Fill every day in the range (up to ~2 months) so the daily chart has no gaps.
  const dayTotals = new Map<string, { spent: number; received: number }>();
  if (range && eachDay(range.from, range.to).length <= 62) {
    for (const day of eachDay(range.from, range.to)) dayTotals.set(day, { spent: 0, received: 0 });
  }
  for (const t of txns) {
    const d = dayTotals.get(t.date) ?? { spent: 0, received: 0 };
    if (t.type === 'DEBIT') d.spent += t.amount;
    else d.received += t.amount;
    dayTotals.set(t.date, d);
  }

  return {
    period,
    transactionCount: txns.length,
    moneyIn,
    moneyOut,
    net: round2(moneyIn - moneyOut),
    byCategory: [...byCategory]
      .map(([category, v]) => ({ category, amount: round2(v.amount), count: v.count }))
      .sort((a, b) => b.amount - a.amount),
    daily: [...dayTotals]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, spent: round2(v.spent), received: round2(v.received) })),
    topMerchants: [...byMerchant]
      .map(([name, v]) => ({ name, amount: round2(v.amount), count: v.count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
    largest: [...out].sort((a, b) => b.amount - a.amount).slice(0, 5),
  };
}

// ---------------------------------------------------------------- expert summary

const summarySchema = z.object({
  headline: z.string().min(1),
  insights: z.array(z.string()).min(1).max(6),
  recommendations: z.array(z.string()).min(1).max(5),
});

const EXPERT_PROMPT = `You are an expert UK personal finance analyst reviewing one customer's spending.
You are given figures that have already been calculated. Use ONLY these figures; never invent or recalculate numbers.
Write amounts in GBP like £1,234.56. Be specific, friendly and concise. This is general guidance, not regulated financial advice.
Return JSON only, no other text:
{"headline": "one sentence overall verdict",
 "insights": ["3 to 5 short observations: where the money went, biggest categories and merchants, notable patterns"],
 "recommendations": ["2 to 4 practical, specific suggestions based on the figures"]}`;

function fallbackSummary(stats: SpendingStats): ExpertSummary {
  const gbp = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const top = stats.byCategory[0];
  return {
    headline: `In ${stats.period} you spent ${gbp(stats.moneyOut)} and received ${gbp(stats.moneyIn)} (net ${gbp(stats.net)}).`,
    insights: stats.byCategory.slice(0, 3).map((c) => `${c.category}: ${gbp(c.amount)} across ${c.count} payment(s).`),
    recommendations: top ? [`Review your ${top.category.toLowerCase()} spending, your largest category this period.`] : [],
  };
}

export async function generateExpertSummary(stats: SpendingStats): Promise<ExpertSummary> {
  if (stats.transactionCount === 0) {
    return { headline: `No transactions in ${stats.period}.`, insights: [], recommendations: [] };
  }
  // Daily rows are left out to keep the prompt short; the model only needs the aggregates.
  const { daily, ...figures } = stats;
  const daysWithSpending = daily.filter((d) => d.spent > 0).length;
  try {
    const raw = await chatJson(
      [
        { role: 'system', content: EXPERT_PROMPT },
        { role: 'user', content: JSON.stringify({ ...figures, daysWithSpending }) },
      ],
      { maxTokens: 800, temperature: 0.3 },
    );
    return summarySchema.parse(raw);
  } catch (err) {
    console.warn('Expert summary fell back to the template:', err instanceof Error ? err.message : err);
    return fallbackSummary(stats);
  }
}

// ---------------------------------------------------------------- account: monthly analysis

/** Analyses a user's account transactions for one calendar month (YYYY-MM). */
export async function analyzeAccountMonth(userId: number, month: string): Promise<AnalysisReport> {
  const [year, monthIndex] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, monthIndex - 1, 1));
  const to = new Date(Date.UTC(year, monthIndex, 1));

  const rows = await prisma.transaction.findMany({
    where: { userId, createdAt: { gte: from, lt: to } },
    orderBy: { createdAt: 'asc' },
  });
  const txns: NormalizedTransaction[] = rows.map((r) => ({
    date: isoDate(r.createdAt),
    description: r.description,
    merchant: r.merchant,
    amount: Number(r.amount),
    type: r.type,
    category: categorize(r),
  }));

  // For the current month the daily chart stops at today.
  const lastDay = new Date(Date.UTC(year, monthIndex, 0));
  const end = new Date() < lastDay ? new Date() : lastDay;
  const title = from.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const stats = computeStats(title, txns, { from: isoDate(from), to: isoDate(end < from ? from : end) });
  return {
    source: 'ACCOUNT',
    title,
    stats,
    summary: await generateExpertSummary(stats),
    transactions: txns,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------- statement: PDF / text analysis

const MAX_STATEMENT_CHARS = 15_000;

const EXTRACT_PROMPT = `You extract transactions from UK bank or card statements.
Return JSON only, no other text:
{"period": "the statement period, e.g. October 2026",
 "transactions": [{"date": "YYYY-MM-DD", "description": "text", "merchant": "shop or payee, if any", "amount": 12.34, "type": "DEBIT or CREDIT", "category": "one of: ${CATEGORIES.join(', ')}"}]}
Rules: include every transaction exactly once; amount is always positive; DEBIT = money out (payments, purchases, withdrawals), CREDIT = money in (salary, refunds, deposits);
ignore opening/closing balance and running-balance figures; do not invent transactions.`;

const extractionSchema = z.object({
  period: z.string().optional(),
  transactions: z.array(
    z.object({
      date: z.string(),
      description: z.string(),
      merchant: z.string().nullish(),
      amount: z.coerce.number(),
      type: z.string(),
      category: z.string().optional(),
    }),
  ),
});

function normalizeExtracted(t: z.infer<typeof extractionSchema>['transactions'][number]): NormalizedTransaction | null {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(t.date) ? `${t.date}T00:00:00Z` : t.date);
  if (Number.isNaN(date.getTime()) || !Number.isFinite(t.amount) || t.amount === 0) return null;
  return {
    date: isoDate(date),
    description: t.description.trim(),
    merchant: t.merchant?.trim() || null,
    amount: round2(Math.abs(t.amount)),
    type: /credit|in\b/i.test(t.type) ? 'CREDIT' : 'DEBIT',
    category: toCategory(t.category),
  };
}

/** Extracts transactions from statement text with the model, then analyses them like an account month. */
export async function analyzeStatementText(fileName: string, text: string): Promise<AnalysisReport> {
  let parsed: z.infer<typeof extractionSchema>;
  try {
    parsed = extractionSchema.parse(
      await chatJson(
        [
          { role: 'system', content: EXTRACT_PROMPT },
          { role: 'user', content: text.slice(0, MAX_STATEMENT_CHARS) },
        ],
        { maxTokens: 4096 },
      ),
    );
  } catch (err) {
    console.warn('Statement extraction failed:', err instanceof Error ? err.message : err);
    throw new HttpError(422, 'Could not read transactions from this statement');
  }

  const txns = parsed.transactions
    .map(normalizeExtracted)
    .filter((t): t is NormalizedTransaction => t !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (txns.length === 0) throw new HttpError(422, 'No transactions found in this statement');

  const title = parsed.period?.trim() || fileName;
  const stats = computeStats(title, txns, { from: txns[0].date, to: txns[txns.length - 1].date });
  return {
    source: 'STATEMENT',
    title,
    stats,
    summary: await generateExpertSummary(stats),
    transactions: txns,
    generatedAt: new Date().toISOString(),
  };
}
