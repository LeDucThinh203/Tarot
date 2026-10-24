import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/async-handler.js';
import { authenticate, requireAdmin } from '../../common/middleware.js';
import { notFound } from '../../common/errors.js';
import { success } from '../../common/response.js';
import { validate } from '../../common/validate.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { ingestDocument, ingestKnowledgeDirectory, reindexKnowledge } from '../rag/ingestion.service.js';
import { embedText } from '../rag/embedding.service.js';
import { searchVectors } from '../rag/vector-store.js';

export const knowledgeRouter = Router();
knowledgeRouter.use(authenticate, requireAdmin);
const documentSchema = z.object({
  title: z.string().trim().min(2, 'Title must contain at least 2 characters.').max(250),
  content: z.string().trim().min(30, 'Content must contain at least 30 characters.').max(100_000),
  metadata: z.record(z.string().max(80), z.union([z.string().max(2000), z.number().finite(), z.boolean(), z.null()])).optional()
    .refine((value) => !value || Object.keys(value).length <= 40, 'Metadata can contain at most 40 entries.'),
}).strict();
const listSchema = z.object({ page: z.coerce.number().int().min(1).max(100_000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }).strict();
const idSchema = z.object({ id: z.string().uuid() }).strict();
const searchSchema = z.object({ query: z.string().trim().min(3).max(1000), topK: z.coerce.number().int().min(1).max(20).optional() }).strict();

knowledgeRouter.post('/documents', validate(documentSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof documentSchema>;
  const result = await ingestDocument({ title: body.title, source: `admin:${randomUUID()}`, content: body.content, ...(body.metadata ? { metadata: body.metadata } : {}) });
  const document = await prisma.knowledgeDocument.findUnique({ where: { id: result.id } });
  success(res, { document, indexedChunks: result.chunks }, 201);
}));
knowledgeRouter.get('/documents', validate(listSchema, 'query'), asyncHandler(async (req, res) => {
  const query = req.query as unknown as z.infer<typeof listSchema>;
  const [items, total] = await Promise.all([
    prisma.knowledgeDocument.findMany({ select: { id: true, title: true, source: true, checksum: true, status: true, createdAt: true, updatedAt: true, _count: { select: { chunks: true } } }, orderBy: { updatedAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.knowledgeDocument.count(),
  ]);
  success(res, items, 200, { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) });
}));
knowledgeRouter.post('/ingest', asyncHandler(async (_req, res) => success(res, await ingestKnowledgeDirectory(), 200)));
knowledgeRouter.post('/reindex', asyncHandler(async (_req, res) => success(res, await reindexKnowledge(), 200)));
knowledgeRouter.post('/search', validate(searchSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof searchSchema>;
  const vector = await embedText(body.query, 'RETRIEVAL_QUERY');
  success(res, await searchVectors(vector, body.topK));
}));
knowledgeRouter.delete('/documents/:id', validate(idSchema, 'params'), asyncHandler(async (req, res) => {
  const result = await prisma.knowledgeDocument.deleteMany({ where: { id: String(req.params.id) } });
  if (!result.count) throw notFound('Knowledge document not found.');
  success(res, { deleted: true });
}));
