import { prisma } from '../db';
import { embed } from '../ai/cloudflare';
import { isAdmin, type AuthUser } from '../middleware/auth';

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

export interface ChunkHit {
  chunkId: number;
  documentId: number;
  fileName: string;
  text: string;
  score: number;
}

/**
 * Vector search restricted to what the user may see:
 * PUBLIC documents, their own PRIVATE documents, or everything for admins.
 * The access filter is applied in SQL, so other users' chunks are never returned.
 */
export async function searchChunks(user: AuthUser, query: string, limit = 5): Promise<ChunkHit[]> {
  const [queryEmbedding] = await embed([query]);
  const vector = toVectorLiteral(queryEmbedding);

  return prisma.$queryRaw<ChunkHit[]>`
    SELECT c.id AS "chunkId", c.document_id AS "documentId", d.file_name AS "fileName",
           c.chunk_text AS "text", 1 - (c.embedding <=> ${vector}::vector) AS score
    FROM document_chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE ${isAdmin(user)} OR d.visibility = 'PUBLIC' OR d.uploaded_by = ${user.id}
    ORDER BY c.embedding <=> ${vector}::vector
    LIMIT ${limit}`;
}
