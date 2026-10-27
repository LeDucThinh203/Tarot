import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { env } from '../../config/env.js';

// DATABASE_URL trỏ tới Neon pooler endpoint (-pooler.neon.tech)
// Neon đã có PgBouncer transaction-mode phía trước nên không tạo thêm pool riêng
// Chỉ cần 1 connection từ adapter — PgBouncer lo việc multiplexing
//
// Lưu ý: prisma migrate / db push chạy qua DIRECT endpoint (bỏ -pooler),
// xử lý trong prisma7.config.ts, vì PgBouncer tx-mode không giữ được advisory
// lock session-level mà migrate cần.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
