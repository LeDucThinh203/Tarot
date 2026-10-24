import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { defineConfig, env as prismaEnv } from 'prisma/config';

dotenv.config({ path: resolve(process.cwd(), '../../.env'), override: false });
process.env.RUST_LOG ??= 'info';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: prismaEnv('DATABASE_URL') },
});
