import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './common/logger.js';
import { prisma } from './infrastructure/database/prisma.js';

const server = app.listen(env.PORT, () => logger.info({ port: env.PORT, environment: env.NODE_ENV }, 'Mystic Tarot API listening'));

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down');
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
