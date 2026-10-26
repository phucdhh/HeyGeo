-- Migration: Add user roles
-- Run this on the server if prisma db push fails
-- Usage: psql $DATABASE_URL -f scripts/migrate-add-roles.sql

-- Create the Role enum type (idempotent)
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add role column with default USER (idempotent)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'USER';

-- Grant ADMIN to the owner
UPDATE "User"
  SET "role" = 'ADMIN'
  WHERE email = 'nguyendangminhphuc@dhsphue.edu.vn';
