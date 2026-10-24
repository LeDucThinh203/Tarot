import { prisma } from '../../infrastructure/database/prisma.js';
import { ingestKnowledgeDirectory, reindexKnowledge } from './ingestion.service.js';

async function main() {
  const reindex = process.argv.includes('--reindex');
  const result = reindex ? await reindexKnowledge() : await ingestKnowledgeDirectory();
  console.info(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Knowledge ingestion failed.'); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
