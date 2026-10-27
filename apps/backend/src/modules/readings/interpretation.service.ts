import { Prisma } from '../../generated/prisma/client.js';
import { env } from '../../config/env.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import type { SearchResult } from '../rag/vector-store.js';
import { buildRetrievalQuery, promptVersion, type ReadingContext } from '../rag/prompt-builder.js';
import { retrieveContext } from '../rag/retriever.js';
import { verifiedCitations } from '../rag/citation-formatter.js';
import { generateInterpretation } from '../rag/generation.service.js';
import { AppError } from '../../common/errors.js';
import { claimReading, persistInterpretation, releaseAiUsage, releaseReadingClaim, reserveAiUsage } from './readings.service.js';

function toContext(reading: Awaited<ReturnType<typeof claimReading>>['reading']): ReadingContext {
  return {
    querentName: reading.querentName,
    querentBirthDate: reading.querentBirthDate?.toISOString().slice(0, 10) ?? null,
    querentGender: reading.querentGender,
    question: reading.question, topic: reading.topic, spreadType: reading.spreadType,
    cards: reading.cards.map((entry) => ({
      id: entry.tarotCard.id, name: entry.tarotCard.name, nameVi: entry.tarotCard.nameVi,
      positionName: entry.positionName, orientation: entry.orientation,
      meaning: entry.orientation === 'UPRIGHT' ? entry.tarotCard.uprightMeaning : entry.tarotCard.reversedMeaning,
    })),
  };
}

export async function getInterpretation(userId: string, readingId: string) {
  const reading = await prisma.reading.findFirst({ where: { id: readingId, userId }, include: { interpretation: true } });
  if (!reading) throw new AppError(404, 'NOT_FOUND', 'Reading not found.');
  return reading.interpretation;
}

export async function interpretReading(userId: string, readingId: string) {
  const claim = await claimReading(userId, readingId);
  if (!claim.claimed) return claim.reading.interpretation;
  let completed = false;
  let usageReservationId: string | undefined;
  try {
    const reading = claim.reading;
    const context = toContext(reading);
    const usageReservation = await reserveAiUsage(userId, readingId, env.GEMINI_MODEL, env.AI_DAILY_LIMIT_PER_USER);
    usageReservationId = usageReservation.id;
    const retrieved: SearchResult[] = await retrieveContext(buildRetrievalQuery(context), context.topic);
    const generated = await generateInterpretation(context, retrieved);
    const cardsFromModel = new Map(generated.result.cards.map((card) => [card.cardId, card]));
    const interpretationCards = context.cards.map((card) => {
      const modelCard = cardsFromModel.get(card.id);
      if (!modelCard) throw new AppError(502, 'AI_CARD_MISMATCH', 'Gemini omitted a drawn card.');
      return { cardId: card.id, position: card.positionName, orientation: card.orientation, meaning: modelCard.meaning, interpretation: modelCard.interpretation };
    });
    const sources = verifiedCitations(retrieved, generated.result.sources);
    const interpretationJson = {
      cards: interpretationCards, connections: generated.result.connections, disclaimer: generated.result.disclaimer,
      citations: sources, limitedContext: retrieved.length === 0,
    };
    const result = await persistInterpretation(userId, readingId, {
      summary: generated.result.summary,
      overallMessage: generated.result.overallMessage,
      advice: generated.result.advice,
      challenges: generated.result.challenges,
      opportunities: generated.result.opportunities,
      interpretationJson: interpretationJson as Prisma.InputJsonValue,
      sources: sources as Prisma.InputJsonValue,
      modelName: generated.modelName,
      promptVersion,
    }, {
      ...(generated.usage?.promptTokenCount === undefined ? {} : { promptTokens: generated.usage.promptTokenCount }),
      ...(generated.usage?.candidatesTokenCount === undefined ? {} : { outputTokens: generated.usage.candidatesTokenCount }),
    }, usageReservation.id);
    completed = true;
    return { ...result, interpretationJson, sources };
  } catch (error) {
    throw error;
  } finally {
    if (!completed) {
      await releaseReadingClaim(readingId);
      if (usageReservationId) await releaseAiUsage(usageReservationId);
    }
  }
}
