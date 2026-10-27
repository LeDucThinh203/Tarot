-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Arcana" AS ENUM ('MAJOR', 'MINOR');

-- CreateEnum
CREATE TYPE "Orientation" AS ENUM ('UPRIGHT', 'REVERSED');

-- CreateEnum
CREATE TYPE "ReadingTopic" AS ENUM ('LOVE', 'CAREER', 'FINANCE', 'PERSONAL_GROWTH', 'GENERAL');

-- CreateEnum
CREATE TYPE "SpreadType" AS ENUM ('ONE_CARD', 'THREE_CARDS', 'FIVE_CARDS');

-- CreateEnum
CREATE TYPE "ReadingStatus" AS ENUM ('DRAWN', 'INTERPRETING', 'INTERPRETED');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "KnowledgeStatus" AS ENUM ('READY', 'PROCESSING', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "disabledAt" TIMESTAMP(3),
    "guestClaimTokenHash" TEXT,
    "guestExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarotCard" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameVi" TEXT NOT NULL,
    "arcana" "Arcana" NOT NULL,
    "suit" TEXT,
    "number" INTEGER,
    "description" TEXT NOT NULL,
    "uprightMeaning" TEXT NOT NULL,
    "reversedMeaning" TEXT NOT NULL,
    "keywords" JSONB NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TarotCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reading" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "querentName" TEXT,
    "querentBirthDate" TIMESTAMP(3),
    "querentGender" TEXT,
    "question" TEXT NOT NULL,
    "topic" "ReadingTopic" NOT NULL,
    "spreadType" "SpreadType" NOT NULL,
    "status" "ReadingStatus" NOT NULL DEFAULT 'DRAWN',
    "idempotencyKey" TEXT,
    "guestChatCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingChatMessage" (
    "id" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingCard" (
    "id" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,
    "tarotCardId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "positionName" TEXT NOT NULL,
    "orientation" "Orientation" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interpretation" (
    "id" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "overallMessage" TEXT NOT NULL,
    "advice" JSONB NOT NULL,
    "challenges" JSONB NOT NULL,
    "opportunities" JSONB NOT NULL,
    "interpretationJson" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "modelName" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interpretation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "status" "KnowledgeStatus" NOT NULL DEFAULT 'READY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagIndexState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "embeddingModel" TEXT NOT NULL,
    "dimension" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagIndexState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "outputTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_guestClaimTokenHash_key" ON "User"("guestClaimTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshSession_userId_expiresAt_idx" ON "RefreshSession"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TarotCard_slug_key" ON "TarotCard"("slug");

-- CreateIndex
CREATE INDEX "TarotCard_arcana_suit_number_idx" ON "TarotCard"("arcana", "suit", "number");

-- CreateIndex
CREATE INDEX "TarotCard_nameVi_idx" ON "TarotCard"("nameVi");

-- CreateIndex
CREATE INDEX "Reading_userId_createdAt_idx" ON "Reading"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Reading_userId_idempotencyKey_key" ON "Reading"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ReadingChatMessage_readingId_createdAt_idx" ON "ReadingChatMessage"("readingId", "createdAt");

-- CreateIndex
CREATE INDEX "ReadingCard_readingId_idx" ON "ReadingCard"("readingId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingCard_readingId_position_key" ON "ReadingCard"("readingId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingCard_readingId_tarotCardId_key" ON "ReadingCard"("readingId", "tarotCardId");

-- CreateIndex
CREATE UNIQUE INDEX "Interpretation_readingId_key" ON "Interpretation"("readingId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeDocument_source_key" ON "KnowledgeDocument"("source");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_status_updatedAt_idx" ON "KnowledgeDocument"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_documentId_idx" ON "KnowledgeChunk"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeChunk_documentId_chunkIndex_key" ON "KnowledgeChunk"("documentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_readingId_idx" ON "AiUsage"("readingId");

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingChatMessage" ADD CONSTRAINT "ReadingChatMessage_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingCard" ADD CONSTRAINT "ReadingCard_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingCard" ADD CONSTRAINT "ReadingCard_tarotCardId_fkey" FOREIGN KEY ("tarotCardId") REFERENCES "TarotCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interpretation" ADD CONSTRAINT "Interpretation_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
