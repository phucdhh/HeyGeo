-- Migration: Add comments system
-- Run this on the server after deploying the new build
-- Usage: psql $DATABASE_URL -f scripts/migrate-add-comments.sql

-- 1. Create CommentVisibility enum (idempotent)
DO $$ BEGIN
  CREATE TYPE "CommentVisibility" AS ENUM ('PUBLIC', 'REGISTERED_ONLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Comment table (idempotent)
CREATE TABLE IF NOT EXISTS "Comment" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "content"    TEXT        NOT NULL,
  "visibility" "CommentVisibility" NOT NULL DEFAULT 'REGISTERED_ONLY',
  "isDeleted"  BOOLEAN     NOT NULL DEFAULT false,
  "modelId"    TEXT        NOT NULL,
  "userId"     TEXT,
  "parentId"   TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- 3. Foreign keys (idempotent via DO block)
DO $$ BEGIN
  ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_modelId_fkey"
    FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 4. Indexes (idempotent)
CREATE INDEX IF NOT EXISTS "Comment_modelId_idx"  ON "Comment"("modelId");
CREATE INDEX IF NOT EXISTS "Comment_userId_idx"   ON "Comment"("userId");
CREATE INDEX IF NOT EXISTS "Comment_parentId_idx" ON "Comment"("parentId");
