-- Migration: Add model reactions
-- Usage: psql $DATABASE_URL -f scripts/migrate-add-model-reactions.sql

-- 1. Create ReactionType enum (idempotent)
DO $$ BEGIN
  CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'AMAZING', 'NOT_UNDERSTAND');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create ModelReaction table (idempotent)
CREATE TABLE IF NOT EXISTS "ModelReaction" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "modelId"   TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "type"      "ReactionType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ModelReaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ModelReaction_modelId_userId_key" UNIQUE ("modelId", "userId")
);

-- 3. Foreign keys (idempotent)
DO $$ BEGIN
  ALTER TABLE "ModelReaction"
    ADD CONSTRAINT "ModelReaction_modelId_fkey"
    FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ModelReaction"
    ADD CONSTRAINT "ModelReaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 4. Index (idempotent)
CREATE INDEX IF NOT EXISTS "ModelReaction_modelId_idx" ON "ModelReaction"("modelId");
