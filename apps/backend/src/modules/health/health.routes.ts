import { Router } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { success } from '../../common/response.js';
import { prisma } from '../../infrastructure/database/prisma.js';

export const healthRouter = Router();
healthRouter.get('/', (_req, res) => success(res, { status: 'ok' }));
healthRouter.get('/ready', asyncHandler(async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const index = await prisma.ragIndexState.findUnique({ where: { id: 1 } });
    success(res, { status: 'ready', database: 'ok', vectorSearch: 'sqlite-cosine', knowledgeIndexed: Boolean(index) });
  } catch {
    res.status(503).json({ success: false, error: { code: 'NOT_READY', message: 'Database is unavailable.', details: [] } });
  }
}));
