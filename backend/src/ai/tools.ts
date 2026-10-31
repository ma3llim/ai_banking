import { z } from 'zod';
import type { AuthUser } from '../middleware/auth';
import { getUser } from '../services/user.service';
import { listCards, maskCardNumber } from '../services/card.service';
import { listTransactions } from '../services/transaction.service';
import { listTransfers } from '../services/transfer.service';
import { searchChunks } from '../services/rag.service';
import type { ToolDefinition } from './cloudflare';

export interface Source {
  documentId: number;
  fileName: string;
}

/**
 * Every tool runs as the logged-in user. The user id comes from the JWT, never from
 * the model's arguments, so the model can't read another user's data.
 */
export interface ToolContext {
  user: AuthUser;
  sources: Source[];
}

interface Tool {
  definition: ToolDefinition;
  run(args: unknown, ctx: ToolContext): Promise<unknown>;
}

function defineTool<S extends z.ZodTypeAny>(
  name: string,
  description: string,
  parameters: Record<string, unknown>,
  schema: S,
  run: (args: z.infer<S>, ctx: ToolContext) => Promise<unknown>,
): Tool {
  return {
    definition: { type: 'function', function: { name, description, parameters } },
    run: (args, ctx) => run(schema.parse(args ?? {}), ctx),
  };
}

const noParams = { type: 'object', properties: {} };

// v1: read-only tools only.
const tools: Tool[] = [
  defineTool(
    'get_my_profile',
    "Get the current user's profile, including name, email and account balance in GBP.",
    noParams,
    z.object({}),
    (_args, ctx) => getUser(ctx.user.id),
  ),

  defineTool(
    'list_my_cards',
    "List the current user's cards (masked number, type, status).",
    noParams,
    z.object({}),
    async (_args, ctx) =>
      (await listCards(ctx.user.id)).map((c) => ({ ...c, cardNumber: maskCardNumber(c.cardNumber) })),
  ),

  defineTool(
    'get_my_transactions',
    "Get the current user's transactions, newest first. Optional filters: limit, type, cardId, fromDate, toDate.",
    {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'Max results (1-50). Default 10.' },
        type: { type: 'string', enum: ['DEBIT', 'CREDIT'], description: 'DEBIT = money out, CREDIT = money in' },
        cardId: { type: 'integer', description: 'Only transactions for this card' },
        fromDate: { type: 'string', description: 'ISO date, e.g. 2026-10-01' },
        toDate: { type: 'string', description: 'ISO date, e.g. 2026-10-31' },
      },
    },
    z.object({
      limit: z.coerce.number().int().min(1).max(50).default(10),
      type: z.enum(['DEBIT', 'CREDIT']).optional(),
      cardId: z.coerce.number().int().optional(),
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
    }),
    (args, ctx) =>
      listTransactions({
        userId: ctx.user.id,
        cardId: args.cardId,
        type: args.type,
        from: args.fromDate,
        to: args.toDate,
        limit: args.limit,
      }),
  ),

  defineTool(
    'get_my_transfers',
    'Get money transfers the current user has sent or received, newest first.',
    { type: 'object', properties: { limit: { type: 'integer', description: 'Max results (1-50). Default 10.' } } },
    z.object({ limit: z.coerce.number().int().min(1).max(50).default(10) }),
    (args, ctx) => listTransfers(ctx.user.id, args.limit),
  ),

  defineTool(
    'search_documents',
    'Search bank documents (FAQs, fees, policies, and documents the user uploaded) for information relevant to a question.',
    {
      type: 'object',
      properties: { query: { type: 'string', description: 'What to search for' } },
      required: ['query'],
    },
    z.object({ query: z.string().min(1) }),
    async (args, ctx) => {
      const hits = await searchChunks(ctx.user, args.query);
      for (const hit of hits) {
        if (!ctx.sources.some((s) => s.documentId === hit.documentId)) {
          ctx.sources.push({ documentId: hit.documentId, fileName: hit.fileName });
        }
      }
      return hits.map((h) => ({ source: h.fileName, text: h.text }));
    },
  ),
];

export const toolDefinitions = tools.map((t) => t.definition);

export async function runTool(name: string, rawArgs: unknown, ctx: ToolContext): Promise<unknown> {
  const tool = tools.find((t) => t.definition.function.name === name);
  if (!tool) return { error: `Unknown tool: ${name}` };

  try {
    const args = typeof rawArgs === 'string' ? JSON.parse(rawArgs || '{}') : rawArgs;
    return await tool.run(args, ctx);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
