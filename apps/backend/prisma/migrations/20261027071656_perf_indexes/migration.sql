-- CreateIndex
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Reading_status_createdAt_idx" ON "Reading"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Reading_createdAt_idx" ON "Reading"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "User_isGuest_createdAt_idx" ON "User"("isGuest", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "User_role_isGuest_disabledAt_idx" ON "User"("role", "isGuest", "disabledAt");
