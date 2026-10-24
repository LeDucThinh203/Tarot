-- Add usernames while retaining email as a supported login identifier.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Give existing accounts a stable, unique username derived from their UUID.
UPDATE "User"
SET "username" = 'u' || substr(lower(replace("id", '-', '')), 1, 22)
WHERE "username" IS NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
