import type { Prisma, Visibility } from '@prisma/client';
import { prisma } from '../db';
import { HttpError } from '../errors';
import { embed } from '../ai/cloudflare';
import { chunkText } from '../rag/chunker';
import { isAdmin, type AuthUser } from '../middleware/auth';
import { toVectorLiteral } from './rag.service';

const EMBED_BATCH_SIZE = 50;

export interface IngestInput {
  fileName: string;
  fileType: string;
  text: string;
  visibility: Visibility;
  uploadedById: number;
}

/** Upload pipeline: extract text -> chunk -> embed -> store document + chunks in pgvector. */
export async function ingestDocument(input: IngestInput) {
  const chunks = chunkText(input.text);
  if (chunks.length === 0) throw new HttpError(400, 'Document has no text');

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
          uploadedById: input.uploadedById,
          metadata: { chunkCount: chunks.length, charCount: input.text.length },
        },
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
    include: { uploadedBy: { select: { id: true, username: true } } },
    orderBy: { createdAt: 'desc' },
  });
}
