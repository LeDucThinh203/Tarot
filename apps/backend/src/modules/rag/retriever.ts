import { env } from '../../config/env.js';
import { embedText } from './embedding.service.js';
import { searchVectors, type SearchResult } from './vector-store.js';

export async function retrieveContext(query: string, topic?: string): Promise<SearchResult[]> {
  const vector = await embedText(query, 'RETRIEVAL_QUERY');
  const results = await searchVectors(vector, env.RAG_TOP_K, env.RAG_SIMILARITY_THRESHOLD, { language: 'vi', ...(topic ? { topic } : {}) });
  let chars = 0;
  return results.filter((result) => {
    if (chars >= env.RAG_MAX_CONTEXT_CHARS) return false;
    const remaining = env.RAG_MAX_CONTEXT_CHARS - chars;
    if (result.content.length > remaining) result.content = result.content.slice(0, remaining);
    chars += result.content.length;
    return result.content.length > 0;
  });
}
