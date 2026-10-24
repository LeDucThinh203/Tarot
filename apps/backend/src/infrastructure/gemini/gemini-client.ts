import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { AppError } from '../../common/errors.js';
import { logger } from '../../common/logger.js';

let client: GoogleGenAI | undefined;
export function getGeminiClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) throw new AppError(503, 'AI_NOT_CONFIGURED', 'Gemini is not configured. Add GEMINI_API_KEY to the backend environment.');
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, httpOptions: { timeout: env.GEMINI_TIMEOUT_MS } });
  return client;
}

export function geminiError(error: unknown, operation = 'unknown'): AppError {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const nested = record.error && typeof record.error === 'object' ? record.error as Record<string, unknown> : {};
  const message = error instanceof Error ? error.message : typeof record.message === 'string' ? record.message : '';
  const rawStatus = record.status ?? record.statusCode ?? (typeof record.code === 'number' ? record.code : nested.code);
  const status = typeof rawStatus === 'number' ? rawStatus : Number.parseInt(String(rawStatus ?? ''), 10);
  const code = typeof nested.status === 'string' ? nested.status : typeof record.code === 'string' ? record.code : undefined;
  const safeMessage = message
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/(api[-_ ]?key\s*[:=]\s*)[^\s,]+/gi, '$1[REDACTED]')
    .replace(/(authorization:\s*bearer\s+)[^\s]+/gi, '$1[REDACTED]')
    .slice(0, 500);
  logger.error({ operation, providerStatus: Number.isFinite(status) ? status : undefined, providerCode: code, providerMessage: safeMessage }, 'Gemini request failed');
  const diagnostic = `${Number.isFinite(status) ? status : ''} ${code ?? ''} ${safeMessage}`;
  if (/429|resource_exhausted|quota/i.test(diagnostic)) return new AppError(503, 'AI_QUOTA_EXCEEDED', 'Gemini is temporarily rate limited or the configured quota has been reached.');
  if (/401|403|api key|unauthorized|permission_denied/i.test(diagnostic)) return new AppError(503, 'AI_CONFIGURATION_ERROR', 'Gemini credentials are invalid or do not have access to the configured model.');
  if (/504|deadline_exceeded|deadline expired|timeout|timed out|abort/i.test(diagnostic)) return new AppError(504, 'AI_TIMEOUT', 'Gemini xử lý yêu cầu quá lâu. Bài đã rút vẫn được giữ; bạn có thể thử lại sau ít phút.');
  if (/400|invalid_argument|bad request/i.test(diagnostic)) return new AppError(502, 'AI_REQUEST_REJECTED', 'Gemini rejected the request settings. Check the configured model and generation options.');
  if (/404|not_found|model.*not found/i.test(diagnostic)) return new AppError(502, 'AI_MODEL_UNAVAILABLE', 'The configured Gemini model is not available for this API key.');
  return new AppError(502, 'AI_UPSTREAM_ERROR', 'Gemini could not complete the request. Please try again later.');
}
