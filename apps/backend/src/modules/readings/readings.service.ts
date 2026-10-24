import { Prisma } from '../../generated/prisma/client.js';
import { env } from '../../config/env.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError, notFound } from '../../common/errors.js';
import { drawCards } from './draw.js';
import type { CreateReadingInput } from './readings.schema.js';

const readingInclude = {
  cards: { orderBy: { position: 'asc' as const }, include: { tarotCard: true } },
  interpretation: true,
};

export async function createReading(userId: string, input: CreateReadingInput) {
  if (input.idempotencyKey) {
    const existing = await prisma.reading.findFirst({ where: { userId, idempotencyKey: input.idempotencyKey }, include: readingInclude });
    if (existing) return existing;
  }
  const deck = await prisma.tarotCard.findMany({ select: { id: true } });
  const drawn = drawCards(deck, input.spreadType);
  try {
    return await prisma.$transaction(async (tx) => tx.reading.create({
      data: {
        userId, querentName: input.querentName,
        querentBirthDate: new Date(`${input.querentBirthDate}T00:00:00.000Z`),
        querentGender: input.querentGender || null,
        question: input.question, topic: input.topic, spreadType: input.spreadType,
        idempotencyKey: input.idempotencyKey ?? null,
        cards: { create: drawn },
      },
      include: readingInclude,
    }));
  } catch (error) {
    if (input.idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.reading.findFirst({ where: { userId, idempotencyKey: input.idempotencyKey }, include: readingInclude });
      if (existing) return existing;
    }
    throw error;
  }
}

export async function listReadings(userId: string, page: number, limit: number, search?: string) {
  const where = { userId, ...(search ? { question: { contains: search } } : {}) };
  const [items, total] = await Promise.all([
    prisma.reading.findMany({ where, include: readingInclude, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.reading.count({ where }),
  ]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getReading(userId: string, id: string) {
  const reading = await prisma.reading.findFirst({ where: { id, userId }, include: readingInclude });
  if (!reading) throw notFound('Reading not found.');
  return reading;
}

export async function deleteReading(userId: string, id: string): Promise<void> {
  const result = await prisma.reading.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw notFound('Reading not found.');
}

export async function claimReading(userId: string, id: string) {
  const reading = await getReading(userId, id);
  if (reading.interpretation) return { reading, claimed: false };
  const staleBefore = new Date(Date.now() - env.GEMINI_TIMEOUT_MS - 60_000);
  let claim = await prisma.reading.updateMany({ where: { id, userId, status: 'DRAWN' }, data: { status: 'INTERPRETING' } });
  if (claim.count === 0) {
    claim = await prisma.reading.updateMany({ where: { id, userId, status: 'INTERPRETING', updatedAt: { lt: staleBefore } }, data: { status: 'INTERPRETING' } });
  }
  if (claim.count === 0) {
    const latest = await getReading(userId, id);
    if (latest.interpretation) return { reading: latest, claimed: false };
    throw new AppError(409, 'INTERPRETATION_IN_PROGRESS', 'An interpretation is already being prepared for this reading.');
  }
  return { reading, claimed: true };
}

export async function releaseReadingClaim(id: string): Promise<void> {
  await prisma.reading.updateMany({ where: { id, status: 'INTERPRETING' }, data: { status: 'DRAWN' } });
}

export async function persistInterpretation(userId: string, id: string, result: {
  summary: string; overallMessage: string; advice: Prisma.InputJsonValue; challenges: Prisma.InputJsonValue; opportunities: Prisma.InputJsonValue;
  interpretationJson: Prisma.InputJsonValue; sources: Prisma.InputJsonValue; modelName: string; promptVersion: string;
}, usage: { promptTokens?: number; outputTokens?: number }, usageId: string) {
  return await prisma.$transaction(async (tx) => {
    const interpretation = await tx.interpretation.create({ data: { readingId: id, ...result } });
    await tx.reading.updateMany({ where: { id, userId }, data: { status: 'INTERPRETED' } });
    await tx.aiUsage.update({ where: { id: usageId }, data: { ...usage, modelName: result.modelName } });
    return interpretation;
  });
}

export async function reserveAiUsage(userId: string, readingId: string, modelName: string, dailyLimit: number) {
  return await prisma.$transaction(async (tx) => {
    const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
    const reservation = await tx.aiUsage.create({ data: { userId, readingId, modelName } });
    const count = await tx.aiUsage.count({ where: { userId, createdAt: { gte: startOfDay } } });
    if (count > dailyLimit) throw new AppError(429, 'AI_DAILY_LIMIT', 'You have reached the daily interpretation limit.');
    return reservation;
  });
}

export async function releaseAiUsage(id: string): Promise<void> {
  await prisma.aiUsage.deleteMany({ where: { id } });
}
