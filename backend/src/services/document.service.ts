import type { DocumentType, Prisma, Visibility } from '@prisma/client';
import { prisma } from '../db';
import { HttpError } from '../errors';
import { chat, embed } from '../ai/cloudflare';
import { chunkText } from '../rag/chunker';
import { isAdmin, type AuthUser } from '../middleware/auth';
import { toVectorLiteral } from './rag.service';
import { analyzeStatementText, type AnalysisReport } from './analysis.service';

const EMBED_BATCH_SIZE = 50;

// Large columns are only loaded when needed.
const omitLargeFields = { content: true, analysis: true } as const;

export interface IngestInput {
  fileName: string;
  fileType: string;
  text: string;
  visibility: Visibility;
  /** AUTO asks the model whether the text is a statement or a general document. */
  docType: DocumentType | 'AUTO';
  uploadedById: number;
}

/** Heuristic backup for classification: several lines that each contain a date and a money amount. */
function looksLikeStatement(text: string): boolean {
  const datePattern = /\b\d{1,2}[/\-. ](\d{1,2}|[A-Za-z]{3,9})[/\-. ]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/;
  const amountPattern = /£?\s?\d{1,3}(,\d{3})*\.\d{2}\b/;
  const lines = text.split('\n').filter((l) => datePattern.test(l) && amountPattern.test(l));
  return lines.length >= 5;
}

export async function classifyDocument(text: string): Promise<DocumentType> {
  try {
    const reply = await chat(
      [
        { role: 'system', content: 'You classify documents. Reply with exactly one word: STATEMENT or GENERAL.' },
        {
          role: 'user',
          content:
            "STATEMENT = a bank or card statement, or a list of a customer's transactions with dates and amounts.\n" +
            'GENERAL = anything else (FAQs, policies, fee lists, letters, guides, offers).\n\n' +
            `Document:\n${text.slice(0, 4000)}`,
        },
      ],
      undefined,
      { maxTokens: 5, temperature: 0 },
    );
    const answer = reply.content?.toUpperCase() ?? '';
    if (answer.includes('STATEMENT')) return 'STATEMENT';
    if (answer.includes('GENERAL')) return 'GENERAL';
  } catch (err) {
    console.warn('Document classification fell back to heuristics:', err instanceof Error ? err.message : err);
  }
  return looksLikeStatement(text) ? 'STATEMENT' : 'GENERAL';
}

/** Upload pipeline: classify -> chunk -> embed -> store document + chunks in pgvector. */
export async function ingestDocument(input: IngestInput) {
  const chunks = chunkText(input.text);
  if (chunks.length === 0) throw new HttpError(400, 'Document has no text');

  const docType = input.docType === 'AUTO' ? await classifyDocument(input.text) : input.docType;

  // Embed before opening the DB transaction so we don't hold it during network calls.
  const embeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    embeddings.push(...(await embed(chunks.slice(i, i + EMBED_BATCH_SIZE))));
  }

  return prisma.$transaction(
    async (tx) => {
      const doc = await tx.document.create({
        data: {
          fileName: input.fileName,
          fileType: input.fileType,
          visibility: input.visibility,
          docType,
          content: input.text,
          uploadedById: input.uploadedById,
          metadata: { chunkCount: chunks.length, charCount: input.text.length },
        },
        omit: omitLargeFields,
      });
      for (let i = 0; i < chunks.length; i++) {
        await tx.$executeRaw`
          INSERT INTO document_chunks (document_id, chunk_index, chunk_text, embedding)
          VALUES (${doc.id}, ${i}, ${chunks[i]}, ${toVectorLiteral(embeddings[i])}::vector)`;
      }
      return doc;
    },
    { timeout: 30_000 },
  );
}

export function listDocuments(user: AuthUser) {
  const where: Prisma.DocumentWhereInput = isAdmin(user)
    ? {}
    : { OR: [{ visibility: 'PUBLIC' }, { uploadedById: user.id }] };
  return prisma.document.findMany({
    where,
    omit: omitLargeFields,
    include: { uploadedBy: { select: { id: true, username: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

/** Same access rule as search: PUBLIC, your own PRIVATE, or anything for admins. */
async function getAccessibleDocument(user: AuthUser, id: number) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc || !(isAdmin(user) || doc.visibility === 'PUBLIC' || doc.uploadedById === user.id)) {
    throw new HttpError(404, 'Document not found');
  }
  return doc;
}

/** Analyses a STATEMENT document. The result is cached on the document unless refresh is set. */
export async function analyzeDocument(user: AuthUser, id: number, refresh = false): Promise<AnalysisReport> {
  const doc = await getAccessibleDocument(user, id);
  if (doc.docType !== 'STATEMENT') throw new HttpError(400, 'Only statement documents can be analysed');
  if (doc.analysis && !refresh) return doc.analysis as unknown as AnalysisReport;
  if (!doc.content) throw new HttpError(400, 'The text of this document is not stored; please upload it again');

  const report = await analyzeStatementText(doc.fileName, doc.content);
  await prisma.document.update({
    where: { id },
    data: { analysis: report as unknown as Prisma.InputJsonValue, analyzedAt: new Date() },
  });
  return report;
}
