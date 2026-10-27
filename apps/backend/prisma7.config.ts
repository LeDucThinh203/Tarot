import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { defineConfig, env as prismaEnv } from 'prisma/config';

dotenv.config({ path: resolve(process.cwd(), '../../.env'), override: false });
process.env.RUST_LOG ??= 'info';

/**
 * Build the datasource URL the Prisma CLI uses for migrate / db push / introspect.
 *
 * Neon's pooled endpoint (hostname contains "-pooler") runs PgBouncer in
 * transaction mode, which does NOT preserve session-level state across
 * transactions. prisma migrate deploy acquires a session-level advisory lock
 * (pg_advisory_lock(72707369)); through the pooler that call hangs and times
 * out after the engine's hardcoded 10s -> P1002.
 *
 * Fix: run CLI commands over Neon's DIRECT endpoint (same as the pooler host
 * with "-pooler" stripped). The runtime PrismaClient keeps using the pooler
 * URL (see src/infrastructure/database/prisma.ts) for query multiplexing.
 *
 * connect_timeout=30 also tolerates Neon free-tier cold starts during connect.
 * Non-postgres URLs (e.g. local SQLite `file:./prisma/dev.db`) are returned
 * unchanged.
 */
function cliDatasourceUrl(url: string): string {
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    return url;
  }
  let out = url.replace(/@([^/?#]*?)-pooler\./, '@$1.');
  if (!/[?&]connect_timeout=/.test(out)) {
    out += (out.includes('?') ? '&' : '?') + 'connect_timeout=30';
  }
  return out;
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: cliDatasourceUrl(prismaEnv('DATABASE_URL')) },
});
