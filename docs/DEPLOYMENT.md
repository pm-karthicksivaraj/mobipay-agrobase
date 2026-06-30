# Agrobase V3 — Deployment Guide

Deploy the full platform to **Vercel** (web app + API) with **Neon.tech** (PostgreSQL) in under 30 minutes.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Flutter Mobile App (separate — not deployed here)  │
│  Android / iOS / Web                                 │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────┐
│  Vercel (Next.js 16)                                 │
│  • Web app (SSR + static)                            │
│  • 237 API routes (serverless functions)             │
│  • Cron jobs (nightly impact computation)            │
│  • Preview deploys per Git branch                    │
└────────────────────┬────────────────────────────────┘
                     │ Prisma + pooled connection
                     ▼
┌─────────────────────────────────────────────────────┐
│  Neon.tech (Serverless PostgreSQL)                   │
│  • 143 Prisma models / 200+ tables                   │
│  • Connection pooling (PgBouncer)                    │
│  • Branchable databases (dev/staging/prod)          │
│  • Auto-scaling compute                              │
└─────────────────────────────────────────────────────┘
```

---

## Step 1: Create Neon Database (5 min)

1. Go to **https://neon.tech** → Sign up (free tier: 0.5 GB, 100 compute hours)
2. Create a new project:
   - **Name:** `agrobase-prod`
   - **Region:** `AWS US East (Ohio)` — closest to Vercel's default region
   - **PostgreSQL version:** 16
3. Create a database:
   - **Name:** `agrobase`
4. Copy BOTH connection strings from the dashboard:
   - **Pooled connection** (has `-pooler-` in the hostname) → this is your `DATABASE_URL`
   - **Direct connection** (no `-pooler-`) → this is your `DIRECT_URL`

Example:
```
DATABASE_URL=postgresql://neondb_owner:npg_XxXxXxXx@ep-mighty-rain-123456-pooler.us-east-2.aws.neon.tech/agrobase?sslmode=require&schema=public
DIRECT_URL=postgresql://neondb_owner:npg_XxXxXxXx@ep-mighty-rain-123456.us-east-2.aws.neon.tech/agrobase?sslmode=require&schema=public
```

> **Why two URLs?** Neon's pooled connection uses PgBouncer (connection pooling) which is required for serverless (Vercel) but doesn't support Prisma migrations. The direct URL is used only for migrations.

---

## Step 2: Deploy to Vercel (10 min)

### 2a. Push to GitHub (already done)
Your repo is at `https://github.com/pm-karthicksivaraj/mobipay-agrobase`

### 2b. Import to Vercel
1. Go to **https://vercel.com** → Sign up / Log in with GitHub
2. Click **Add New** → **Project**
3. Import the `mobipay-agrobase` repository
4. Vercel auto-detects Next.js — **don't change the framework preset**

### 2c. Configure Environment Variables
In the Vercel project settings → **Environment Variables**, add:

| Key | Value | Environments |
|-----|-------|-------------|
| `DATABASE_URL` | Neon pooled connection string | Production, Preview, Development |
| `DIRECT_URL` | Neon direct connection string | Production, Preview, Development |
| `NEXTAUTH_SECRET` | Generate at https://generate-secret.now.sh | Production, Preview |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` (set after first deploy) | Production |
| `IMPACT_CRON_SECRET` | Any long random string | Production |

> **Note:** `CRON_SECRET` is auto-set by Vercel when cron jobs are enabled.

### 2d. Deploy
Click **Deploy**. Vercel will:
1. Run `npm install` (triggers `postinstall` → `prisma generate`)
2. Run `npm run build` (runs `prisma generate && next build`)
3. Deploy the output as serverless functions + static assets

First deploy takes ~3-5 minutes. Subsequent deploys: ~1-2 minutes.

---

## Step 3: Run Database Migrations (3 min)

After the first deploy, you need to push the schema to Neon. Run this from your local machine:

```bash
# Clone the repo (if not already)
git clone https://github.com/pm-karthicksivaraj/mobipay-agrobase.git
cd mobipay-agrobase
npm install

# Set the Neon direct connection (for migrations)
export DIRECT_URL="postgresql://neondb_owner:npg_XxXxXxXx@ep-mighty-rain-123456.us-east-2.aws.neon.tech/agrobase?sslmode=require&schema=public"
export DATABASE_URL="$DIRECT_URL"

# Apply all migrations
npx prisma migrate deploy

# (Optional) Seed with demo data
npx tsx scripts/seed.ts
```

> **Alternatively:** You can use `npx prisma db push` instead of `migrate deploy` if you don't need migration history (faster for initial setup).

Verify in Neon dashboard → Tables tab — you should see 200+ tables.

---

## Step 4: Configure Vercel Cron (2 min)

The `vercel.json` file already declares a nightly cron job:
```json
{
  "crons": [{
    "path": "/api/impact/cron/compute?limit=100",
    "schedule": "0 22 * * *"    // 10 PM UTC = 1 AM East Africa
  }]
}
```

Vercel automatically:
1. Runs the cron every night at 10 PM UTC
2. Sends a `GET` request with `Authorization: Bearer <CRON_SECRET>`
3. The route detects the Vercel Cron header and triggers the computation

**Cron limits:**
- Vercel Hobby: 1 cron job, daily minimum
- Vercel Pro: Up to 40 cron jobs, any schedule
- The cron processes 100 farmers per run (configurable via `?limit=`) to stay within the 60s timeout

For larger farmer counts (>500), split into multiple cron jobs or use an external worker (Railway, Render).

---

## Step 5: Update NEXTAUTH_URL (1 min)

After the first deploy:
1. Copy your Vercel URL (e.g. `https://mobipay-agrobase.vercel.app`)
2. Go to Vercel → Settings → Environment Variables
3. Update `NEXTAUTH_URL` to your Vercel URL
4. Redeploy (push any commit, or click "Redeploy" in Vercel)

---

## Step 6: Add Custom Domain (optional, 5 min)

1. Vercel → Settings → Domains
2. Add `app.agrobase.mobipayagrosys.com` (or your domain)
3. Add the DNS records Vercel shows you (CNAME or A record)
4. Update `NEXTAUTH_URL` to the custom domain
5. Vercel auto-provisions SSL certificates

---

## Step 7: Configure Flutter App (2 min)

Update the Flutter app's API base URL to point to your Vercel deployment:

```bash
cd mobile
flutter run --dart-define=API_BASE_URL=https://mobipay-agrobase.vercel.app
```

Or create `mobile/env/prod.json`:
```json
{
  "API_BASE_URL": "https://mobipay-agrobase.vercel.app"
}
```

Build with:
```bash
flutter build apk --release --dart-define-from-file=env/prod.json
flutter build ipa --release --dart-define-from-file=env/prod.json
```

---

## Ongoing Operations

### Run Migrations After Schema Changes
When you add new Prisma models (like the impact engine migration):

```bash
# Local
export DIRECT_URL="your-neon-direct-url"
npx prisma migrate deploy

# Or via Vercel CLI
vercel env pull .env.vercel
npx prisma migrate deploy
```

### Monitor Cron Jobs
- Vercel → Project → **Cron Jobs** tab — see execution history + logs
- GET `https://your-app.vercel.app/api/impact/cron/compute` — status check (no auth needed)
- The route returns: `{ period, farmerCount, snapshotsComputed, climateScoresComputed, coverage }`

### Monitor Application
- Vercel → Project → **Logs** — real-time serverless function logs
- Vercel → Project → **Analytics** — request volume, status codes, performance
- Neon → Dashboard — database compute, storage, connections

### Database Branching (Neon)
Neon lets you branch the database (like Git branches):
1. Neon → Create branch `staging` from `main`
2. Vercel → Preview deployment gets the staging database URL
3. Test migrations on the branch before merging to production

---

## Cost Estimates

### Vercel
| Plan | Price | Includes |
|------|-------|---------|
| Hobby (Free) | $0 | 100 GB bandwidth, 100 GB-hrs serverless, 1 cron |
| Pro | $20/mo | 1 TB bandwidth, 1000 GB-hrs serverless, 40 crons, 300s timeout |

### Neon
| Plan | Price | Includes |
|------|-------|---------|
| Free | $0 | 0.5 GB storage, 100 compute hours, 1 project |
| Launch | $19/mo | 10 GB storage, 1000 compute hours, branching |
| Scale | $69/mo | 50 GB storage, 5000 compute hours, PITR |

### Total for pilot (first 1000 farmers)
- Vercel Hobby + Neon Free = **$0/month**
- Vercel Pro + Neon Launch = **$39/month** (recommended for production)

---

## Troubleshooting

### "Prisma Client not generated" on Vercel
The `postinstall` script handles this. If it fails:
1. Check that `prisma` is in `dependencies` (not `devDependencies`)
2. Vercel → Settings → Functions → set "Max Duration" to 60s

### "Too many connections" on Neon
- Use the **pooled** connection string (has `-pooler-`) as `DATABASE_URL`
- Neon's PgBouncer handles connection pooling automatically
- The `directUrl` in `schema.prisma` ensures migrations use the direct connection

### Cron job timeout
- Vercel Hobby: 10s limit — reduce `?limit=20` in the cron path
- Vercel Pro: 60s limit (configured in `vercel.json` via `maxDuration: 60`)
- For >500 farmers: split into multiple cron jobs or use a Vercel background function

### NextAuth redirect loop
- Ensure `NEXTAUTH_URL` matches your Vercel domain exactly (including `https://`)
- Check that `NEXTAUTH_SECRET` is set in all environments

### Build fails with "output: standalone"
- The `build` script is `prisma generate && next build` (no standalone copy)
- The `build:docker` script is for Docker only
- Vercel ignores `output: "standalone"` in `next.config.ts` — no conflict

---

## Quick Reference

| What | URL |
|------|-----|
| Vercel Dashboard | https://vercel.com/dashboard |
| Neon Dashboard | https://console.neon.tech |
| NextAuth Secret Generator | https://generate-secret.now.sh |
| Vercel Cron Docs | https://vercel.com/docs/cron-jobs |
| Neon + Prisma Guide | https://neon.tech/docs/guides/prisma |
| This repo | https://github.com/pm-karthicksivaraj/mobipay-agrobase |
