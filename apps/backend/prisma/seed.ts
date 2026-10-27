import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { env } from '../src/config/env.js';
import { tarotCards } from '../src/modules/tarot-cards/cards-data.js';
import { registerSchema } from '../src/modules/auth/auth.schema.js';
import { hashPassword } from '../src/modules/auth/password.service.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });

async function main() {
  for (const card of tarotCards) {
    await prisma.tarotCard.upsert({
      where: { slug: card.slug },
      create: card,
      update: {
        name: card.name, nameVi: card.nameVi, arcana: card.arcana, suit: card.suit, number: card.number,
        description: card.description, uprightMeaning: card.uprightMeaning, reversedMeaning: card.reversedMeaning, keywords: card.keywords,
      },
    });
  }
  console.info(`Seeded ${tarotCards.length} Tarot cards.`);

  const accounts = [
    { email: process.env.SEED_ADMIN_EMAIL, username: 'mystic_admin', password: process.env.SEED_ADMIN_PASSWORD, displayName: 'Mystic Admin', role: 'ADMIN' as const },
    { email: process.env.SEED_USER_EMAIL, username: 'mystic_user', password: process.env.SEED_USER_PASSWORD, displayName: 'Mystic User', role: 'USER' as const },
  ];
  const hasAccountConfig = accounts.some(({ email, password }) => Boolean(email || password));
  if (hasAccountConfig) {
    if (accounts.some(({ email, password }) => !email || !password)) {
      throw new Error('Set both SEED_*_EMAIL and SEED_*_PASSWORD for both seed accounts, or leave all four empty.');
    }
    for (const account of accounts) {
      const input = registerSchema.parse({ email: account.email, username: account.username, password: account.password, displayName: account.displayName });
      const passwordHash = await hashPassword(input.password);
      await prisma.user.upsert({
        where: { email: input.email },
        create: { email: input.email, username: input.username, passwordHash, displayName: input.displayName, role: account.role },
        update: { username: input.username, passwordHash, displayName: input.displayName, role: account.role },
      });
    }
    console.info('Seeded one ADMIN and one USER account with bcrypt-hashed passwords.');
  } else {
    console.info('Seed accounts skipped; configure SEED_ADMIN_* and SEED_USER_* in .env to create them.');
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
