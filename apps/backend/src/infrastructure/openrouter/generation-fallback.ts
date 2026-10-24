import { AppError } from '../../common/errors.js';
import { geminiError } from '../gemini/gemini-client.js';
import { env } from '../../config/env.js';
import { generateOpenRouterJson } from './openrouter-client.js';

type GeminiGeneration = { text?: string | undefined | null; usageMetadata?: { promptTokenCount?: number | undefined; candidatesTokenCount?: number | undefined } | null | undefined };

export async function generateJsonWithFallback(
  generateWithGemini: () => Promise<GeminiGeneration>,
  systemPrompt: string,
  prompt: string,
  maxTokens: number,
) {
  try {
    const response = await generateWithGemini();
    return {
      text: response.text,
      usage: response.usageMetadata,
      modelName: env.GEMINI_MODEL,
    };
  } catch (error) {
    const geminiFailure = error instanceof AppError ? error : geminiError(error, 'generation');
    if (geminiFailure.code !== 'AI_QUOTA_EXCEEDED' || !env.OPENROUTER_API_KEY) throw geminiFailure;
    return await generateOpenRouterJson(systemPrompt, prompt, maxTokens);
  }
}
