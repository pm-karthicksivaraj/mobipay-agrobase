import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { checkRateLimit } from '@/middleware/edge-rate-limiter'
import {
  getClientIp,
  logRequest,
  logRateLimit,
  logAuthFailure,
  logPermissionDenied,
  logEntitlementDenied,
} from '@/middleware/edge-logger'
import { resolveModuleForPath, checkEntitlement } from '@/middleware/edge-entitlements'

// ─── Route Categories ──────────────────────────────────────────────────────

// Routes that are publicly accessible without authentication
const PUBLIC_ROUTES = [
  '/api/auth/',
  '/api/health',
  '/api/route', // basic health check
]

// Routes that only need auth (no tenant isolation) — system-level
const SYSTEM_ROUTES = [
  '/api/settings/geo/',
  '/api/seed',
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function matchesRoute(path: string, patterns: string[]): boolean {
  return patterns.some(p => path.startsWith(p))
}

function getAllowedTenantIds(
  role: string | undefined,
  tenantId: string | undefined,
  tokenTenantScope: string[] | undefined
): string[] | null {
  if (role === 'SUPER_ADMIN') return null
  // For COUNTRY_ADMIN, use the pre-computed tenantScope from the JWT token
  // (resolved at login time via getDescendantTenantIds)
  if (role === 'COUNTRY_ADMIN' && tokenTenantScope && tokenTenantScope.length > 0) {
    return tokenTenantScope
  }
  if (!tenantId) return []
  return [tenantId]
}

/**
 * Build standard X-RateLimit-* response headers.
 */
function rateLimitHeaders(
  result: { remaining: number; limit: number; reset: number; retryAfterMs: number }
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': String(result.remaining === Infinity ? -1 : result.remaining),
    'X-RateLimit-Limit': String(result.limit || 120),
    'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
  }
  if (result.retryAfterMs > 0) {
    headers['Retry-After'] = String(Math.ceil(result.retryAfterMs / 1000))
  }
  return headers
}

// ─── Main Middleware ────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const startedAt = Date.now()
  const clientIp = getClientIp(request)
  const method = request.method

  // Common request context for logging
  const reqCtx = {
    method,
    path: pathname,
    ip: clientIp,
    userAgent: request.headers.get('user-agent') || undefined,
    startedAt,
  }

  // Skip non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // ─── 0. RATE LIMITING (before auth — protect auth endpoints too) ─────────
  const isPublic = matchesRoute(pathname, PUBLIC_ROUTES)
  const rlKey = isPublic ? `pub:${clientIp}` : `ip:${clientIp}`

  const rlResult = checkRateLimit(rlKey, pathname)
  if (!rlResult.allowed) {
    logRateLimit(reqCtx, rlResult.retryAfterMs)
    logRequest(reqCtx, { status: 429 })

    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil(rlResult.retryAfterMs / 1000),
      },
      {
        status: 429,
        headers: rateLimitHeaders(rlResult),
      }
    )
  }

  // Allow public routes (after rate limiting)
  if (isPublic) {
    logRequest(reqCtx, { status: 200 })
    const response = NextResponse.next()
    // Attach rate-limit info headers to public responses too
    for (const [k, v] of Object.entries(rateLimitHeaders(rlResult))) {
      response.headers.set(k, v)
    }
    return response
  }

  // ─── 1. AUTHENTICATION CHECK ─────────────────────────────────────────────
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token?.userId) {
    logAuthFailure(reqCtx)
    logRequest(reqCtx, { status: 401 })

    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    )
  }

  // Now we have a user — switch rate-limit key from IP to userId
  // This prevents one user from amplifying via multiple IPs
  const role = token.role as string | undefined
  const userTenantId = token.tenantId as string | undefined

  // ─── 1b. PER-USER RATE LIMITING (authenticated) ─────────────────────────
  const userRlKey = `user:${token.userId}`
  const userRlResult = checkRateLimit(userRlKey, pathname, role)

  if (!userRlResult.allowed) {
    logRateLimit({ ...reqCtx, userId: token.userId as string }, userRlResult.retryAfterMs)
    logRequest({ ...reqCtx, userId: token.userId as string }, { status: 429 })

    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil(userRlResult.retryAfterMs / 1000),
      },
      {
        status: 429,
        headers: rateLimitHeaders(userRlResult),
      }
    )
  }

  // ─── 2. PERMISSION CHECK (basic module access) ───────────────────────────
  const moduleMatch = pathname.match(/^\/api\/([a-z_-]+)/)
  if (moduleMatch) {
    const moduleName = moduleMatch[1]
    if (!matchesRoute(pathname, SYSTEM_ROUTES)) {
      const { hasPermission } = await import('@/lib/permissions')
      const canRead = hasPermission(role || '', `${moduleName}:read`)
      if (!canRead) {
        logPermissionDenied({ ...reqCtx, userId: token.userId as string, role })
        logRequest({ ...reqCtx, userId: token.userId as string }, { status: 403 })

        return NextResponse.json(
          { success: false, error: 'Insufficient permissions for this module' },
          { status: 403 }
        )
      }
    }
  }

  // ─── 2b. ENTITLEMENT CHECK (module access based on tenant's plan) ──────
  // Resolves /api/vsla/* → VSLA module, then checks the in-memory entitlement cache.
  // Core routes (dashboard, users, settings, etc.) are not mapped → always allowed.
  // SUPER_ADMIN bypasses entitlement checks. Fail-open on cache miss/stale.
  if (userTenantId && moduleMatch && role !== 'SUPER_ADMIN') {
    const entitlementModule = resolveModuleForPath(pathname)
    if (entitlementModule) {
      const hasEntitlement = checkEntitlement(userTenantId, entitlementModule)
      if (!hasEntitlement) {
        logEntitlementDenied(
          { ...reqCtx, userId: token.userId as string },
          entitlementModule,
          userTenantId,
        )
        logRequest({ ...reqCtx, userId: token.userId as string }, { status: 403 })

        return NextResponse.json(
          {
            success: false,
            error: `Module '${entitlementModule}' is not included in your current plan. Contact your administrator to upgrade.`,
            module: entitlementModule,
          },
          { status: 403 }
        )
      }
    }
  }

  // ─── 3. TENANT ISOLATION HEADER ─────────────────────────────────────────
  const tokenTenantScope = token.tenantScope as string[] | undefined
  const allowedTenantIds = getAllowedTenantIds(role, userTenantId, tokenTenantScope)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', (token.userId as string) || '')
  requestHeaders.set('x-user-role', role || '')
  requestHeaders.set('x-tenant-id', userTenantId || '')

  if (allowedTenantIds === null) {
    requestHeaders.set('x-tenant-scope', 'all')
  } else {
    requestHeaders.set('x-tenant-scope', allowedTenantIds.join(','))
  }

  // ─── 4. REQUEST TIMING HEADER (for API route-level duration logging) ─────
  requestHeaders.set('x-request-started-at', new Date().toISOString())

  // ─── 5. LOG + PASS THROUGH ───────────────────────────────────────────────
  const authedReqCtx = {
    ...reqCtx,
    userId: token.userId as string,
    tenantId: userTenantId || undefined,
    role: role || undefined,
  }
  logRequest(authedReqCtx, { status: 200 })

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // Attach rate-limit headers to successful responses
  for (const [k, v] of Object.entries(rateLimitHeaders(userRlResult))) {
    response.headers.set(k, v)
  }

  // Attach request ID for correlation
  const requestId = crypto.randomUUID()
  response.headers.set('X-Request-Id', requestId)
  requestHeaders.set('x-request-id', requestId)

  return response
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
}