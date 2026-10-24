import { env } from '../../config/env.js';
import { AppError } from '../../common/errors.js';
import { geminiError, getGeminiClient } from '../../infrastructure/gemini/gemini-client.js';
import { embedWithOpenRouter } from '../../infrastructure/openrouter/openrouter-client.js';

export type EmbeddingTask = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export function assertEmbeddingDimension(vector: number[], expected: number): void {
  if (vector.length !== expected || vector.some((value) => !Number.isFinite(value))) {
    throw new AppError(502, 'EMBEDDING_DIMENSION_MISMATCH', `Expected ${expected} finite embedding values.`);
  }
}

export async function embedTexts(texts: string[], taskType: EmbeddingTask): Promise<number[][]> {
  if (texts.length === 0) return [];
  try {
    const response = await getGeminiClient().models.embedContent({
      model: env.GEMINI_EMBEDDING_MODEL,
      contents: texts,
      config: { outputDimensionality: env.GEMINI_EMBEDDING_DIMENSION, taskType },
    });
    const vectors = response.embeddings?.map((embedding) => embedding.values ?? []) ?? [];
    if (vectors.length !== texts.length) throw new AppError(502, 'EMBEDDING_RESPONSE_INVALID', 'Gemini returned an incomplete embedding response.');
    for (const vector of vectors) assertEmbeddingDimension(vector, env.GEMINI_EMBEDDING_DIMENSION);
    return vectors;
  } catch (error) {
    const geminiFailure = error instanceof AppError ? error : geminiError(error, 'embedding');
    if (geminiFailure.code !== 'AI_QUOTA_EXCEEDED' || !env.OPENROUTER_API_KEY) throw geminiFailure;
    const activeEmbeddingModel = env.GEMINI_EMBEDDING_MODEL.replace(/^models\//, '');
    const fallbackEmbeddingModel = env.OPENROUTER_EMBEDDING_MODEL.split('/').at(-1);
    if (fallbackEmbeddingModel !== activeEmbeddingModel) throw geminiFailure;
    const vectors = await embedWithOpenRouter(texts, taskType);
    for (const vector of vectors) assertEmbeddingDimension(vector, env.GEMINI_EMBEDDING_DIMENSION);
    return vectors;
  }
}

export async function embedText(text: string, taskType: EmbeddingTask): Promise<number[]> {
  return (await embedTexts([text], taskType))[0]!;
}
