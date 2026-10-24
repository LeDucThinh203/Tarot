-- Add temporary guest sessions and a per-reading guest chat allowance.
ALTER TABLE "User" ADD COLUMN "isGuest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "guestClaimTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "guestExpiresAt" DATETIME;
CREATE UNIQUE INDEX "User_guestClaimTokenHash_key" ON "User"("guestClaimTokenHash");

ALTER TABLE "Reading" ADD COLUMN "guestChatCount" INTEGER NOT NULL DEFAULT 0;
