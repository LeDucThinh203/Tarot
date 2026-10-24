import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../../generated/prisma/client.js';
import { env } from '../../config/env.js';
import { getRuntimeDatabaseUrl } from './database-url.js';

const adapter = new PrismaBetterSqlite3({ url: getRuntimeDatabaseUrl(env.DATABASE_URL) });
export const prisma = new PrismaClient({ adapter,
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
