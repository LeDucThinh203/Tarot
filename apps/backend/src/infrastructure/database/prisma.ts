import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { env } from '../../config/env.js';

// 10-connection pool — tối ưu cho Neon free tier (max 10 concurrent connections)
// PrismaPg nhận connectionString + poolConfig trực tiếp thay vì tạo Pool riêng
// để tránh xung đột @types/pg giữa root và workspace
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: 10,                    // tối đa 10 kết nối đồng thời
  idleTimeoutMillis: 30_000,  // đóng connection nhàn rỗi sau 30s
  connectionTimeoutMillis: 5_000, // timeout khi không lấy được connection sau 5s
});

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
