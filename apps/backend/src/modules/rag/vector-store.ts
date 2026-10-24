import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { env } from '../../config/env.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError } from '../../common/errors.js';

type Db = Pick<PrismaClient, 'ragIndexState' | 'knowledgeChunk'>;
export type IndexedChunk = { id?: string; documentId: string; chunkIndex: number; content: string; embedding: number[]; metadata: Record<string, string | number | boolean | null> };
export type SearchResult = { id: string; content: string; title: string; source: string; metadata: Record<string, unknown>; similarity: number };
export type SearchFilters = { language?: string; topic?: string; documentType?: string };

export async function ensureIndexState(db: Db = prisma): Promise<void> {
  const state = await db.ragIndexState.findUnique({ where: { id: 1 } });
  if (state && (state.embeddingModel !== env.GEMINI_EMBEDDING_MODEL || state.dimension !== env.GEMINI_EMBEDDING_DIMENSION)) {
    throw new AppError(409, 'RAG_REINDEX_REQUIRED', `The active index uses ${state.embeddingModel}/${state.dimension}. Run the explicit reindex command for ${env.GEMINI_EMBEDDING_MODEL}/${env.GEMINI_EMBEDDING_DIMENSION}.`);
  }
}

export async function saveChunks(db: Db, chunks: IndexedChunk[]): Promise<void> {
  for (const chunk of chunks) {
    if (chunk.embedding.length !== env.GEMINI_EMBEDDING_DIMENSION || chunk.embedding.some((value) => !Number.isFinite(value))) {
      throw new AppError(500, 'EMBEDDING_DIMENSION_MISMATCH', 'Refusing to store a vector with an unexpected dimension.');
    }
    const metadata = { ...chunk.metadata, embeddingModel: env.GEMINI_EMBEDDING_MODEL, embeddingDimension: env.GEMINI_EMBEDDING_DIMENSION };
    await db.knowledgeChunk.create({
      data: {
        id: chunk.id ?? randomUUID(),
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: chunk.embedding as Prisma.InputJsonValue,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}

function asMetadata(value: Prisma.JsonValue): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function cosineSimilarity(left: number[], right: number[]): number {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index]!;
    const b = right[index]!;
    dot += a * b;
    leftMagnitude += a * a;
    rightMagnitude += b * b;
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / Math.sqrt(leftMagnitude * rightMagnitude);
}

export async function searchVectors(queryVector: number[], topK = env.RAG_TOP_K, threshold = env.RAG_SIMILARITY_THRESHOLD, filters: SearchFilters = {}): Promise<SearchResult[]> {
  if (queryVector.length !== env.GEMINI_EMBEDDING_DIMENSION || queryVector.some((value) => !Number.isFinite(value))) {
    throw new AppError(500, 'EMBEDDING_DIMENSION_MISMATCH', 'Query vector dimension does not match the configured index.');
  }
  await ensureIndexState();
  const chunks = await prisma.knowledgeChunk.findMany({
    where: { document: { status: 'READY' } },
    select: { id: true, content: true, embedding: true, metadata: true, document: { select: { title: true, source: true } } },
  });
  const candidates: SearchResult[] = [];
  for (const chunk of chunks) {
    if (!Array.isArray(chunk.embedding) || chunk.embedding.length !== queryVector.length || !chunk.embedding.every((value): value is number => typeof value === 'number' && Number.isFinite(value))) continue;
    const metadata = asMetadata(chunk.metadata);
    if (metadata.embeddingModel !== env.GEMINI_EMBEDDING_MODEL) continue;
    if (filters.language && metadata.language !== filters.language) continue;
    if (filters.topic && metadata.topic !== filters.topic && metadata.topic !== 'GENERAL') continue;
    if (filters.documentType && metadata.documentType !== filters.documentType) continue;
    const similarity = cosineSimilarity(queryVector, chunk.embedding);
    if (similarity < threshold) continue;
    candidates.push({ id: chunk.id, content: chunk.content, title: chunk.document.title, source: chunk.document.source, metadata, similarity });
  }
  candidates.sort((left, right) => right.similarity - left.similarity);
  const unique = new Set<string>();
  return candidates.filter((row) => {
    const normalized = row.content.toLowerCase().replace(/\s+/g, ' ').slice(0, 220);
    if (unique.has(normalized)) return false;
    unique.add(normalized);
    return true;
  }).slice(0, topK);
}
