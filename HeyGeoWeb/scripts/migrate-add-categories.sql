-- Migration: Add categories array to Model
-- Run this on the server after deploying the new build
-- Usage: psql $DATABASE_URL -f scripts/migrate-add-categories.sql

-- Add categories column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Model' AND column_name = 'categories'
  ) THEN
    ALTER TABLE "Model" ADD COLUMN "categories" TEXT[] NOT NULL DEFAULT '{}';
  END IF;
END $$;
