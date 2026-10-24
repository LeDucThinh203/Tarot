import 'dotenv/config';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: resolve(process.cwd(), '../../.env'), override: false });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.5-flash-lite'),
  GEMINI_EMBEDDING_MODEL: z.string().min(1).default('gemini-embedding-001'),
  GEMINI_EMBEDDING_DIMENSION: z.coerce.number().int().min(128).max(3072).default(768),
  OPENROUTER_API_KEY: z.string().optional().default(''),
  OPENROUTER_MODEL: z.string().min(1).default('openai/gpt-4o-mini'),
  OPENROUTER_EMBEDDING_MODEL: z.string().min(1).default('google/gemini-embedding-001'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().regex(/^\d+[smhd]$/, 'Use a short duration such as 15m.').default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  COOKIE_SECURE: z.string().default('false').transform((v) => v === 'true'),
  RAG_TOP_K: z.coerce.number().int().min(1).max(20).default(5),
  RAG_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.25),
  RAG_CHUNK_SIZE: z.coerce.number().int().min(200).max(5000).default(1100),
  RAG_CHUNK_OVERLAP: z.coerce.number().int().min(0).max(1000).default(160),
  RAG_MAX_CONTEXT_CHARS: z.coerce.number().int().min(1000).max(30000).default(9000),
  AI_DAILY_LIMIT_PER_USER: z.coerce.number().int().min(1).default(8),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(90000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}
if (parsed.data.NODE_ENV === 'production' && (!parsed.data.COOKIE_SECURE || parsed.data.JWT_ACCESS_SECRET.includes('replace-') || parsed.data.JWT_REFRESH_SECRET.includes('replace-'))) {
  throw new Error('Production requires secure cookies and generated JWT secrets.');
}
if (parsed.data.RAG_CHUNK_OVERLAP >= parsed.data.RAG_CHUNK_SIZE) {
  throw new Error('RAG_CHUNK_OVERLAP must be less than RAG_CHUNK_SIZE.');
}
export const env = parsed.data;
