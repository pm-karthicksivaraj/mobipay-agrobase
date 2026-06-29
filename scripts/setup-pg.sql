-- ============================================================
-- Agrobase V3 — Database Setup for Local PostgreSQL (macOS)
-- 
-- Run this in Navicat, pgAdmin, or psql:
--   psql -f scripts/setup-pg.sql
--   OR: psql -U your_pg_username -f scripts/setup-pg.sql
--
-- Then create tables with:
--   npx prisma db push
--
-- Then seed with:
--   npx tsx scripts/seed.ts
-- ============================================================

-- 1. Create the database (skip if already exists)
-- In psql, you can run: CREATE DATABASE agrobase_v3;
-- In Navicat, right-click Databases → New Database → agrobase_v3

-- 2. Enable UUID extension (required by CarbonProject, CarbonCredit, CarbonVerification)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. The actual tables are created by Prisma:
--    npx prisma db push
--    This reads prisma/schema.prisma and creates ALL 78 tables automatically.

-- ============================================================
-- QUICK START (macOS Terminal):
--
--   cd /path/to/agrobase-v3
--
--   # Step 1: Create database (if not exists)
--   createdb agrobase_v3
--
--   # Step 2: Push schema to PostgreSQL
--   npx prisma db push
--
--   # Step 3: Seed data
--   npx tsx scripts/seed.ts
--
--   # Step 4: Start dev server
--   npm run dev
--
-- ============================================================

-- ============================================================
-- FOR NAVICAT IMPORT:
-- After running `npx prisma db push` and `npx tsx scripts/seed.ts`,
-- you can export the full database as SQL:
--
--   pg_dump -d agrobase_v3 -F p -f agrobase_v3_dump.sql
--
-- Then import that .sql file in Navicat:
--   Connection → PostgreSQL → agrobase_v3 → 
--   Right-click database → Execute SQL File → select agrobase_v3_dump.sql
-- ============================================================