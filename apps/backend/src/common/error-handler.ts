import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from './errors.js';
import { logger } from './logger.js';

function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; name?: unknown; cause?: unknown };
  if (candidate.code === 'ECONNREFUSED' || candidate.code === 'P1001' || candidate.name === 'PrismaClientInitializationError') return true;
  return candidate.cause !== error && isDatabaseUnavailable(candidate.cause);
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  void _next;
  if (error instanceof ZodError) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request.', details: error.issues } });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message, details: error.details ?? [] } });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found.', details: [] } });
    return;
  }
  if (isDatabaseUnavailable(error)) {
    logger.error({ err: error }, 'Database unavailable');
    res.status(503).json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'The database is unavailable. Please try again shortly.', details: [] } });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ success: false, error: { code: 'INVALID_JSON', message: 'Yêu cầu chứa định dạng JSON không hợp lệ.', details: [] } });
    return;
  }
  logger.error({ err: error }, 'Request failed');
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error.', details: [] } });
};
