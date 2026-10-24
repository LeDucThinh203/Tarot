import { env } from '../../config/env.js';
import { AppError } from '../../common/errors.js';

const apiBase = 'https://openrouter.ai/api/v1';

function requireApiKey(): string {
  if (!env.OPENROUTER_API_KEY) {
    throw new AppError(503, 'OPENROUTER_NOT_CONFIGURED', 'Mình chưa thể hoàn tất câu trả lời lúc này. Bạn thử lại sau nhé.');
  }
  return env.OPENROUTER_API_KEY;
}

async function post(path: string, body: unknown): Promise<Record<string, unknown>> {
  const apiKey = requireApiKey();
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.FRONTEND_URL,
        'X-Title': 'Mystic Tarot AI',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(env.GEMINI_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new AppError(504, 'OPENROUTER_TIMEOUT', 'Mình đang cần thêm thời gian để hoàn tất. Bạn thử lại sau nhé.');
    }
    throw new AppError(502, 'OPENROUTER_CONNECTION_ERROR', 'Mình chưa thể kết nối để hoàn tất câu trả lời. Bạn thử lại sau nhé.');
  }

  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) {
      throw new AppError(503, 'OPENROUTER_CONFIGURATION_ERROR', 'Mình chưa thể hoàn tất câu trả lời lúc này. Bạn thử lại sau nhé.');
    }
    if (status === 402) {
      throw new AppError(503, 'OPENROUTER_CREDITS_REQUIRED', 'Mình chưa thể hoàn tất câu trả lời lúc này. Bạn thử lại sau nhé.');
    }
    if (status === 429) {
      throw new AppError(503, 'OPENROUTER_RATE_LIMITED', 'Mình đang nhận nhiều câu hỏi cùng lúc. Bạn thử lại sau ít phút nhé.');
    }
    throw new AppError(502, 'OPENROUTER_UPSTREAM_ERROR', 'Mình chưa thể hoàn tất câu trả lời. Bạn thử lại sau nhé.');
  }

  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    throw new AppError(502, 'OPENROUTER_INVALID_RESPONSE', 'Mình chưa thể đọc được câu trả lời. Bạn thử lại sau nhé.');
  }
}

function getUsage(value: unknown): { promptTokenCount?: number; candidatesTokenCount?: number } | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const usage = value as Record<string, unknown>;
  const promptTokenCount = typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : undefined;
  const candidatesTokenCount = typeof usage.completion_tokens === 'number' ? usage.completion_tokens : undefined;
  return { ...(promptTokenCount === undefined ? {} : { promptTokenCount }), ...(candidatesTokenCount === undefined ? {} : { candidatesTokenCount }) };
}

export async function generateOpenRouterJson(systemPrompt: string, prompt: string, maxTokens: number) {
  const response = await post('/chat/completions', {
    model: env.OPENROUTER_MODEL,
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_completion_tokens: maxTokens,
    temperature: 0.7,
  });
  const choices = response.choices;
  const choice = Array.isArray(choices) && choices[0] && typeof choices[0] === 'object'
    ? choices[0] as Record<string, unknown>
    : undefined;
  const message = choice?.message && typeof choice.message === 'object'
    ? choice.message as Record<string, unknown>
    : undefined;
  const content = message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new AppError(502, 'OPENROUTER_EMPTY_OUTPUT', 'Mình chưa nhận được câu trả lời. Bạn thử lại sau nhé.');
  }
  return {
    text: content,
    usage: getUsage(response.usage),
    modelName: `openrouter/${env.OPENROUTER_MODEL}`,
  };
}

export async function embedWithOpenRouter(texts: string[], taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'): Promise<number[][]> {
  const response = await post('/embeddings', {
    model: env.OPENROUTER_EMBEDDING_MODEL,
    input: texts,
    dimensions: env.GEMINI_EMBEDDING_DIMENSION,
    input_type: taskType === 'RETRIEVAL_QUERY' ? 'search_query' : 'search_document',
    encoding_format: 'float',
  });
  const data = response.data;
  if (!Array.isArray(data)) throw new AppError(502, 'OPENROUTER_EMBEDDING_INVALID', 'Mình chưa thể tìm lại nguồn phù hợp. Bạn thử lại sau nhé.');
  const rows = data.map((entry) => entry && typeof entry === 'object' ? entry as Record<string, unknown> : {});
  const vectors = rows.map((entry) => Array.isArray(entry.embedding) ? entry.embedding as number[] : []);
  if (vectors.length !== texts.length) throw new AppError(502, 'OPENROUTER_EMBEDDING_INVALID', 'Mình chưa thể tìm lại nguồn phù hợp. Bạn thử lại sau nhé.');
  return vectors;
}
