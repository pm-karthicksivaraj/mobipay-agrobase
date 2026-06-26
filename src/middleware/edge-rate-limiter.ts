/**
 * Agrobase V3 — Edge-Compatible In-Memory Rate Limiter
 *
 * Designed for Next.js Edge Runtime middleware (no Node.js APIs).
 * Uses a sliding-window counter with per-key RPM/RPD limits.
 *
 * - Keys are auto-cleaned after 10 min of inactivity (RPM buckets)
 *   and at day boundaries (RPD counters).
 * - SUPER_ADMIN role bypasses rate limiting.
 * - Fail-open: if anything throws, the request is allowed.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterMs: number
  limit: number
  reset: number // unix-ms when the RPM window resets
}

interface RpmBucket {
  count: number
  windowStart: number // unix-ms
}

interface RpdCounter {
  count: number
  date: string // YYYY-MM-DD
}

interface RateLimitConfig {
  rpm: number  // requests per minute
  rpd: number  // requests per day
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_RPM = 120
const DEFAULT_RPD = 5000
const WINDOW_MS = 60_000 // 1 minute sliding window
const CLEANUP_INTERVAL_MS = 5 * 60_000 // 5 minutes
const BUCKET_TTL_MS = 10 * 60_000 // 10 minutes

// ─── Override configs per route prefix ──────────────────────────────────────
// Routes with stricter limits (auth attempts, public endpoints, etc.)
const ROUTE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/auth/': { rpm: 20, rpd: 500 },       // login/signup brute-force protection
  '/api/health': { rpm: 30, rpd: 1000 },     // health checks can be frequent
}

// Roles that bypass rate limiting entirely
const BYPASS_ROLES = new Set(['SUPER_ADMIN'])

// ─── In-Memory Store ────────────────────────────────────────────────────────

const rpmStore = new Map<string, RpmBucket>()
const rpdStore = new Map<string, RpdCounter>()

// Periodic cleanup to prevent memory leaks in long-running Edge instances
let lastCleanup = Date.now()

function maybeCleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  const today = new Date().toISOString().split('T')[0]
  for (const [key, bucket] of rpmStore) {
    if (now - bucket.windowStart > BUCKET_TTL_MS) rpmStore.delete(key)
  }
  for (const [key, counter] of rpdStore) {
    if (counter.date !== today) rpdStore.delete(key)
  }
}

// ─── Core Logic ─────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function msUntilTomorrow(): number {
  const now = new Date()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return tomorrow.getTime() - now.getTime()
}

function getLimitForRoute(pathname: string): RateLimitConfig {
  for (const prefix of Object.keys(ROUTE_LIMITS)) {
    if (pathname.startsWith(prefix)) return ROUTE_LIMITS[prefix]
  }
  return { rpm: DEFAULT_RPM, rpd: DEFAULT_RPD }
}

/**
 * Check rate limit for a given key + route.
 * Uses the caller's IP (or userId) as the key.
 *
 * Returns a result with standard X-RateLimit-* header values.
 */
export function checkRateLimit(
  key: string,
  pathname: string,
  role?: string
): RateLimitResult {
  // Bypass for super admins
  if (role && BYPASS_ROLES.has(role)) {
    return { allowed: true, remaining: Infinity, retryAfterMs: 0, limit: 0, reset: 0 }
  }

  const { rpm, rpd } = getLimitForRoute(pathname)
  const now = Date.now()
  const today = getToday()

  maybeCleanup()

  // ── RPM: sliding window ──
  let bucket = rpmStore.get(key)
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    // Start a fresh window
    bucket = { count: 0, windowStart: now }
    rpmStore.set(key, bucket)
  }

  bucket.count++

  if (bucket.count > rpm) {
    const retryAfterMs = bucket.windowStart + WINDOW_MS - now
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(1, retryAfterMs),
      limit: rpm,
      reset: bucket.windowStart + WINDOW_MS,
    }
  }

  // ── RPD: daily counter ──
  let daily = rpdStore.get(key)
  if (!daily || daily.date !== today) {
    daily = { count: 0, date: today }
    rpdStore.set(key, daily)
  }

  daily.count++

  if (daily.count > rpd) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: msUntilTomorrow(),
      limit: rpd,
      reset: Date.now() + msUntilTomorrow(),
    }
  }

  const remaining = Math.min(rpm - bucket.count, rpd - daily.count)

  return {
    allowed: true,
    remaining: Math.max(0, remaining),
    retryAfterMs: 0,
    limit: rpm,
    reset: bucket.windowStart + WINDOW_MS,
  }
}