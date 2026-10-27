import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../common/logger.js';
import { chunkText, cleanText, documentMetadata } from './text-processing.js';
import { embedTexts } from './embedding.service.js';
import { ensureIndexState, saveChunks, type IndexedChunk } from './vector-store.js';
import { loadKnowledgeFiles, type LoadedDocument } from './document-loader.js';

async function prepareChunks(document: LoadedDocument, documentId: string): Promise<IndexedChunk[]> {
  const pieces = chunkText(document.content, env.RAG_CHUNK_SIZE, env.RAG_CHUNK_OVERLAP);
  const vectors: number[][] = [];
  for (let start = 0; start < pieces.length; start += 16) vectors.push(...await embedTexts(pieces.slice(start, start + 16), 'RETRIEVAL_DOCUMENT'));
  return pieces.map((content, chunkIndex) => ({
    id: randomUUID(), documentId, chunkIndex, content, embedding: vectors[chunkIndex]!,
    metadata: { ...document.metadata, title: document.title, chunkIndex },
  }));
}

async function replaceIndexedDocument(document: LoadedDocument, chunks: IndexedChunk[], existingId: string): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    const dbDocument = await tx.knowledgeDocument.update({
      where: { id: existingId },
      data: { title: document.title, content: document.content, checksum: document.checksum, metadata: document.metadata, status: 'READY' },
    });
    await tx.knowledgeChunk.deleteMany({ where: { documentId: dbDocument.id } });
    await tx.ragIndexState.upsert({ where: { id: 1 }, create: { id: 1, embeddingModel: env.GEMINI_EMBEDDING_MODEL, dimension: env.GEMINI_EMBEDDING_DIMENSION }, update: {} });
    await saveChunks(tx, chunks.map((chunk) => ({ ...chunk, documentId: dbDocument.id })));
    return dbDocument.id;
  });
}

export async function ingestDocument(input: { title: string; source: string; content: string; metadata?: Record<string, string | number | boolean | null> }) {
  const content = cleanText(input.content);
  if (!content) throw new Error('Knowledge document is empty.');
  const checksum = createHash('sha256').update(content).digest('hex');
  const existing = await prisma.knowledgeDocument.findUnique({ where: { source: input.source } });
  if (existing?.checksum === checksum && existing.status === 'READY') {
    const chunkCount = await prisma.knowledgeChunk.count({ where: { documentId: existing.id } });
    if (chunkCount > 0) return { id: existing.id, skipped: true, chunks: chunkCount };
  }
  await ensureIndexState();
  const metadata = { ...documentMetadata(input.source, content), ...input.metadata };
  const document: LoadedDocument = { title: input.title, source: input.source, content, checksum, metadata: metadata as LoadedDocument['metadata'] };
  const processing = existing
    ? await prisma.knowledgeDocument.update({ where: { id: existing.id }, data: { title: input.title, content, checksum, metadata: metadata as Prisma.InputJsonValue, status: 'PROCESSING' } })
    : await prisma.knowledgeDocument.create({ data: { title: input.title, source: input.source, content, checksum, metadata: metadata as Prisma.InputJsonValue, status: 'PROCESSING' } });
  logger.info({ source: input.source }, 'Embedding knowledge document');
  try {
    const chunks = await prepareChunks(document, processing.id);
    const id = await replaceIndexedDocument(document, chunks, processing.id);
    logger.info({ source: input.source, chunkCount: chunks.length }, 'Knowledge document indexed');
    return { id, skipped: false, chunks: chunks.length };
  } catch (error) {
    await prisma.knowledgeDocument.update({ where: { id: processing.id }, data: { status: 'FAILED' } });
    logger.error({ source: input.source, err: error }, 'Knowledge document ingestion failed');
    throw error;
  }
}

export async function ingestKnowledgeDirectory() {
  await ensureIndexState();
  const documents = await loadKnowledgeFiles();
  const results = [];
  for (const document of documents) results.push(await ingestDocument(document));
  return { documents: results.length, indexed: results.filter((result) => !result.skipped).length, skipped: results.filter((result) => result.skipped).length, chunks: results.reduce((sum, result) => sum + result.chunks, 0) };
}

export async function reindexKnowledge() {
  const documents = await prisma.knowledgeDocument.findMany({ orderBy: { source: 'asc' } });
  const prepared: Array<{ id: string; chunks: IndexedChunk[] }> = [];
  for (const [index, row] of documents.entries()) {
    logger.info({ source: row.source, step: index + 1, total: documents.length }, 'Preparing reindex');
    const document: LoadedDocument = { title: row.title, source: row.source, content: row.content, checksum: row.checksum, metadata: row.metadata as LoadedDocument['metadata'] };
    prepared.push({ id: row.id, chunks: await prepareChunks(document, row.id) });
  }
  await prisma.$transaction(async (tx) => {
    await tx.knowledgeChunk.deleteMany();
    await tx.ragIndexState.upsert({ where: { id: 1 }, create: { id: 1, embeddingModel: env.GEMINI_EMBEDDING_MODEL, dimension: env.GEMINI_EMBEDDING_DIMENSION }, update: { embeddingModel: env.GEMINI_EMBEDDING_MODEL, dimension: env.GEMINI_EMBEDDING_DIMENSION } });
    for (const entry of prepared) await saveChunks(tx, entry.chunks);
    await tx.knowledgeDocument.updateMany({ data: { status: 'READY' } });
  }, { timeout: 120000 });
  return { documents: documents.length, chunks: prepared.reduce((sum, entry) => sum + entry.chunks.length, 0), model: env.GEMINI_EMBEDDING_MODEL, dimension: env.GEMINI_EMBEDDING_DIMENSION };
}
