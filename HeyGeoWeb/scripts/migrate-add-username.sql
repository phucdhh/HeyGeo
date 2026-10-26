-- Migration: Add username slug to User
-- Run this on the server after deploying the new build
-- Usage: psql $DATABASE_URL -f scripts/migrate-add-username.sql

-- 1. Add column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'username'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "username" TEXT;
  END IF;
END $$;

-- 2. Populate existing users from email local-part, resolving collisions with a suffix
DO $$
DECLARE
  rec     RECORD;
  base    TEXT;
  slug    TEXT;
  counter INT;
BEGIN
  FOR rec IN
    SELECT id, email FROM "User"
    WHERE username IS NULL
    ORDER BY "createdAt"
  LOOP
    base    := regexp_replace(split_part(rec.email, '@', 1), '[^a-z0-9_]', '', 'g');
    base    := lower(base);
    IF base = '' THEN base := 'user'; END IF;
    slug    := base;
    counter := 1;

    WHILE EXISTS (SELECT 1 FROM "User" WHERE username = slug) LOOP
      slug    := base || counter::TEXT;
      counter := counter + 1;
    END LOOP;

    UPDATE "User" SET username = slug WHERE id = rec.id;
  END LOOP;
END $$;

-- 3. Add UNIQUE constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'User_username_key'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_username_key" UNIQUE (username);
  END IF;
END $$;
