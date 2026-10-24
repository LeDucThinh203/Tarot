import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/async-handler.js';
import { notFound } from '../../common/errors.js';
import { success } from '../../common/response.js';
import { validate } from '../../common/validate.js';
import { prisma } from '../../infrastructure/database/prisma.js';

export const tarotCardsRouter = Router();
const listSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  search: z.string().trim().max(100).optional(),
  arcana: z.enum(['MAJOR', 'MINOR']).optional(),
  suit: z.enum(['WANDS', 'CUPS', 'SWORDS', 'PENTACLES']).optional(),
}).strict();
const idSchema = z.object({ id: z.string().uuid() }).strict();
const slugSchema = z.object({ slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) }).strict();

tarotCardsRouter.get('/', validate(listSchema, 'query'), asyncHandler(async (req, res) => {
  const query = req.query as unknown as z.infer<typeof listSchema>;
  const where = {
    ...(query.arcana ? { arcana: query.arcana } : {}),
    ...(query.suit ? { suit: { equals: query.suit } } : {}),
    ...(query.search ? { OR: [
      { name: { contains: query.search } },
      { nameVi: { contains: query.search } },
      { slug: { contains: query.search } },
    ] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.tarotCard.findMany({ where, orderBy: [{ arcana: 'asc' }, { number: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.tarotCard.count({ where }),
  ]);
  success(res, items, 200, { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) });
}));
tarotCardsRouter.get('/slug/:slug', validate(slugSchema, 'params'), asyncHandler(async (req, res) => {
  const card = await prisma.tarotCard.findUnique({ where: { slug: String(req.params.slug) } });
  if (!card) throw notFound('Tarot card not found.');
  success(res, card);
}));
tarotCardsRouter.get('/:id', validate(idSchema, 'params'), asyncHandler(async (req, res) => {
  const card = await prisma.tarotCard.findUnique({ where: { id: String(req.params.id) } });
  if (!card) throw notFound('Tarot card not found.');
  success(res, card);
}));
