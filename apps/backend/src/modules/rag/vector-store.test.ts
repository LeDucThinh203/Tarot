import { vi } from 'vitest';
import { env } from '../../config/env.js';

const mocked = vi.hoisted(() => ({ findIndex: vi.fn(), findChunks: vi.fn(), createChunk: vi.fn() }));
vi.mock('../../infrastructure/database/prisma.js', () => ({
  prisma: {
    ragIndexState: { findUnique: mocked.findIndex },
    knowledgeChunk: { findMany: mocked.findChunks, create: mocked.createChunk },
  },
}));

import { searchVectors } from './vector-store.js';

function vectorWithCosine(similarity: number): number[] {
  const result = Array.from({ length: env.GEMINI_EMBEDDING_DIMENSION }, () => 0);
  result[0] = similarity;
  result[1] = Math.sqrt(1 - similarity * similarity);
  return result;
}

describe('SQLite embedding retrieval', () => {
  beforeEach(() => {
    mocked.findIndex.mockResolvedValue({ id: 1, embeddingModel: env.GEMINI_EMBEDDING_MODEL, dimension: env.GEMINI_EMBEDDING_DIMENSION });
    mocked.findChunks.mockResolvedValue([
      { id: 'chunk-1', content: 'Same Tarot knowledge chunk with a real source.', embedding: vectorWithCosine(0.86), metadata: { language: 'vi', embeddingModel: env.GEMINI_EMBEDDING_MODEL }, document: { title: 'Card guide', source: 'catalog:the-star' } },
      { id: 'chunk-2', content: 'Same Tarot knowledge chunk with a real source.', embedding: vectorWithCosine(0.82), metadata: { language: 'vi', embeddingModel: env.GEMINI_EMBEDDING_MODEL }, document: { title: 'Card guide duplicate', source: 'catalog:the-star-duplicate' } },
      { id: 'chunk-3', content: 'A different knowledge chunk.', embedding: vectorWithCosine(0.1), metadata: { language: 'vi', embeddingModel: env.GEMINI_EMBEDDING_MODEL }, document: { title: 'Foundations', source: 'file:foundations.md' } },
    ]);
  });

  it('calculates cosine similarity, applies the threshold, and deduplicates context', async () => {
    const query = Array.from({ length: env.GEMINI_EMBEDDING_DIMENSION }, () => 0);
    query[0] = 1;
    const results = await searchVectors(query, 5, 0.25);

    expect(mocked.findChunks).toHaveBeenCalledOnce();
    expect(results.map((row) => row.source)).toEqual(['catalog:the-star']);
    expect(results[0]?.similarity).toBeCloseTo(0.86);
  });
});
