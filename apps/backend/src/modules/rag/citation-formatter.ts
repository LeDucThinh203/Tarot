import type { SearchResult } from './vector-store.js';

export type ModelCitation = { chunkId: string; title: string };

export function verifiedCitations(retrieved: SearchResult[], modelCitations: ModelCitation[]) {
  const allowedIds = new Set(retrieved.map((item) => item.id));
  const citedIds = new Set(modelCitations.filter((citation) => allowedIds.has(citation.chunkId)).map((citation) => citation.chunkId));
  return retrieved.filter((item) => citedIds.has(item.id)).map((item) => ({
    chunkId: item.id, title: item.title, source: item.source, excerpt: item.content.slice(0, 420), similarity: Number(item.similarity.toFixed(4)),
  }));
}
