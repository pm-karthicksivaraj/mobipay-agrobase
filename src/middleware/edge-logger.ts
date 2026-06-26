/**
 * Agrobase V3 — Edge-Compatible Request Logger
 *
 * Structured JSON logging for Next.js Edge Runtime middleware.
 * Uses only Web APIs (console, TextEncoder, crypto) — no Node.js dependencies.
 *
 * Output format (production):
 *   {"level":"info","ts":1719412800000,"msg":"request","method":"GET",
 *    "path":"/api/farmers","status":200,"durationMs":12,"userId":"abc",
 *    "tenantId":"t1","ip":"1.2.3.4","service":"agrobase-edge"}
 *
 * Output format (development):
 *   [info] GET /api/farmers 200 12ms userId=abc tenantId=t1
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MIN_LEVEL: LogLevel =
  (process.env.EDGE_LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL]
}

const isProduction = process.env.NODE_ENV === 'production'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getClientIp(request: Request): string {
  // Cloudflare / Vercel / Fly.io standard headers
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf

  const fly = request.headers.get('fly-client-ip')
  if (fly) return fly

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  const real = request.headers.get('x-real-ip')
  if (real) return real

  return 'unknown'
}

function redactPath(pathname: string): string {
  // Redact sensitive segments like token/userId in URLs
  if (pathname.includes('/passport/verify/')) {
    return pathname.replace(/\/passport\/verify\/[^/]+/, '/passport/verify/[REDACTED]')
  }
  return pathname
}

// ─── Structured Log Entry ────────────────────────────────────────────────────

interface LogEntry {
  level: LogLevel
  ts: number
  msg: string
  service: string
  [key: string]: unknown
}

function emit(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return

  if (isProduction) {
    // Structured JSON — one line per event
    console.log(JSON.stringify(entry))
  } else {
    // Human-readable colored output
    const color = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    }[entry.level]
    const reset = '\x1b[0m'
    const { level, ts, msg, service, ...rest } = entry
    const extras = Object.entries(rest)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ')
    console.log(`${color}[${level}]${reset} ${msg} ${extras}`)
  }
}

// ─── Request Logger ──────────────────────────────────────────────────────────

interface RequestContext {
  method: string
  path: string
  userId?: string
  tenantId?: string
  role?: string
  ip: string
  userAgent?: string
  startedAt: number
}

interface ResponseContext {
  status: number
}

/**
 * Log an API request with duration and context.
 * Called after the response status is determined.
 */
export function logRequest(
  req: RequestContext,
  res?: ResponseContext,
  error?: unknown
): void {
  const durationMs = Date.now() - req.startedAt
  const safePath = redactPath(req.path)

  const entry: LogEntry = {
    level: res ? (res.status >= 500 ? 'error' : res.status >= 400 ? 'warn' : 'info') : 'info',
    ts: Date.now(),
    msg: res ? 'request' : 'request_start',
    service: 'agrobase-edge',
    method: req.method,
    path: safePath,
    durationMs,
    ip: req.ip,
  }

  if (res) {
    entry.status = res.status
  }

  if (req.userId) entry.userId = req.userId
  if (req.tenantId) entry.tenantId = req.tenantId
  if (req.role) entry.role = req.role
  if (req.userAgent) {
    // Truncate user-agent to avoid bloating logs
    entry.userAgent = req.userAgent.length > 120
      ? req.userAgent.slice(0, 120) + '...'
      : req.userAgent
  }

  if (error) {
    entry.error = error instanceof Error ? error.message : String(error)
    entry.level = 'error'
  }

  // Also log rate-limit hits at warn level
  emit(entry)
}

/**
 * Log a rate-limit rejection.
 */
export function logRateLimit(
  req: Pick<RequestContext, 'path' | 'ip' | 'userId'>,
  retryAfterMs: number
): void {
  emit({
    level: 'warn',
    ts: Date.now(),
    msg: 'rate_limit_exceeded',
    service: 'agrobase-edge',
    path: redactPath(req.path),
    ip: req.ip,
    retryAfterMs,
    ...(req.userId ? { userId: req.userId } : {}),
  })
}

/**
 * Log an auth failure.
 */
export function logAuthFailure(req: Pick<RequestContext, 'method' | 'path' | 'ip' | 'userAgent'>): void {
  emit({
    level: 'warn',
    ts: Date.now(),
    msg: 'auth_failed',
    service: 'agrobase-edge',
    method: req.method,
    path: redactPath(req.path),
    ip: req.ip,
    userAgent: req.userAgent,
  })
}

/**
 * Log a permission denial.
 */
export function logPermissionDenied(
  req: Pick<RequestContext, 'method' | 'path' | 'ip' | 'userId' | 'role'>
): void {
  emit({
    level: 'warn',
    ts: Date.now(),
    msg: 'permission_denied',
    service: 'agrobase-edge',
    method: req.method,
    path: redactPath(req.path),
    ip: req.ip,
    userId: req.userId,
    role: req.role,
  })
}

/**
 * Log an entitlement denial (module not in tenant's plan).
 */
export function logEntitlementDenied(
  req: Pick<RequestContext, 'method' | 'path' | 'ip' | 'userId'>,
  moduleCode: string,
  tenantId: string
): void {
  emit({
    level: 'warn',
    ts: Date.now(),
    msg: 'entitlement_denied',
    service: 'agrobase-edge',
    method: req.method,
    path: redactPath(req.path),
    ip: req.ip,
    userId: req.userId,
    moduleCode,
    tenantId,
  })
}

export { getClientIp }