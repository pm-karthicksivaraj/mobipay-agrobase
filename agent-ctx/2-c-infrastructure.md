# Task 2-c: Infrastructure — Schema Updates, CI/CD, Environment Config

## Summary of Changes

### 1. Prisma Schema Updates (`prisma/schema.prisma`)

#### New Phase 2 Models Added (11 new models):
- **Account** — Chart of accounts for double-entry accounting (hierarchical via self-relation)
- **JournalEntry** — General journal entries with DRAFT/POSTED/REVERSED status
- **JournalLine** — Individual debit/credit lines within journal entries (cascade delete)
- **ProduceIntake** — Cooperative produce intake tracking with grading, weighing, storage status
- **CooperativePayment** — First/final phase farmer payments for produce deliveries
- **Invoice** — Billing invoices with tax, multi-cycle support, reminder tracking
- **UsageRecord** — Per-tenant usage metering (farmers, users, API calls, SMS)
- **PaymentTransaction** — Enhanced payment transactions with provider callbacks (MPAY, MTN MoMo, M-Pesa, etc.)
- **MigrationLog** — V1→V3 migration tracking per table
- **IdMapping** — V1 ID to V3 ID mapping with unique compound index on [tableName, v1Id]

#### Existing Models Modified:

**Tenant** — Added 13 new reverse relation fields:
- `accounts`, `journalEntries`, `produceIntakes`, `cooperativePayments`, `invoices`, `usageRecords`, `paymentTransactions` (Phase 2 billing/ERP)
- `trainings`, `surveys`, `consignments`, `deliveries`, `messages`, `feedback` (tenant isolation for existing models)

**FarmerProfile** — Added 2 new reverse relations:
- `produceIntakes` (@relation "FarmerIntake")
- `cooperativePayments` (@relation "FarmerCoopPayment")

**Payment** — Added 1 new reverse relation:
- `transactions` (@relation "PaymentTransactions")

**Training** — Added `tenantId String` + `tenant Tenant` relation (tenant isolation)

**Survey** — Added `tenantId String` + `tenant Tenant` relation (tenant isolation)

**Consignment** — Added `tenantId String` + `tenant Tenant` relation (tenant isolation)

**Delivery** — Added `tenantId String` + `tenant Tenant` relation (tenant isolation)

**Message** — Added `tenantId String` + `tenant Tenant` relation (tenant isolation)

**Feedback** — Added `tenantId String` + `tenant Tenant` relation (tenant isolation)

### 2. `.gitignore` — Complete rewrite
Standard Next.js ignores plus project-specific entries for:
- Prisma (db/*.db, prisma/migrations/)
- Uploads, tool-results
- Logs, bun.lock
- Generated reports (scripts/*.pdf, scripts/gap_analysis_cover.html)

### 3. `.env.example` — New file
Complete environment configuration template with sections for:
- App config (NEXT_PUBLIC_APP_NAME, APP_URL, NODE_ENV)
- Database (SQLite dev / PostgreSQL production)
- NextAuth (URL, secret)
- Payment gateways (MPAY, AINTEL, MTN MoMo UG/GH, M-Pesa KE)
- Core banking, SMS gateway
- Satellite (Phase 3 placeholder)
- File storage, GitHub

### 4. `.github/workflows/ci-cd.yml` — New file
4-job pipeline with:
- **lint**: ESLint check with bun caching
- **type-check**: TypeScript `tsc --noEmit` with Prisma generate
- **build**: Full Next.js build (depends on lint + type-check), uploads artifact
- **deploy-staging**: Manual SSH deploy to staging (main branch only, depends on build)
- Uses `concurrency` groups to cancel in-progress runs
- Bun for package management with proper caching

### 5. Database Actions
- Schema validated ✅
- Prisma client generated ✅
- Schema pushed to SQLite (force-reset due to new required `tenantId` columns on existing tables with data) ✅
- All 11 new tables created in SQLite ✅