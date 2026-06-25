import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Routes that are publicly accessible without authentication
const PUBLIC_ROUTES = [
  '/api/auth/',
  '/api/health',
  '/api/route',        // basic health check
]

// Routes that only need auth (no tenant isolation) — system-level
const SYSTEM_ROUTES = [
  '/api/settings/geo/',
  '/api/seed',
]

/**
 * Check if a route path matches any pattern in the list.
 */
function matchesRoute(path: string, patterns: string[]): boolean {
  return patterns.some(p => path.startsWith(p))
}

/**
 * Get the tenant IDs accessible to a user based on their tenant
 * and its children in the hierarchy. For now, returns the user's
 * own tenantId. Full recursive hierarchy will be added when
 * PostgreSQL with CTEs is available.
 *
 * SUPER_ADMIN: no filtering (returns null = all data)
 * COUNTRY_ADMIN: all tenants under their country
 * TENANT_ADMIN: own tenant only
 * Others: own tenant only
 */
function getAllowedTenantIds(
  role: string | undefined,
  tenantId: string | undefined
): string[] | null {
  // SUPER_ADMIN sees everything — return null (no filter)
  if (role === 'SUPER_ADMIN') return null
  if (!tenantId) return []

  return [tenantId]
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip non-API routes
  if (!pathname.startsWith('/api/')) return NextResponse.next()

  // Allow public routes
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next()
  }

  // ─── 1. AUTHENTICATION CHECK ───────────────────────────────────────────
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token?.userId) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    )
  }

  // ─── 2. PERMISSION CHECK (basic module access) ─────────────────────────
  const role = token.role as string | undefined
  const userTenantId = token.tenantId as string | undefined

  // Extract module from URL: /api/farmers → "farmers"
  const moduleMatch = pathname.match(/^\/api\/([a-z_-]+)/)
  if (moduleMatch) {
    const moduleName = moduleMatch[1]
    // System routes bypass module permission check
    if (!matchesRoute(pathname, SYSTEM_ROUTES)) {
      // Dynamic import to avoid circular dependency
      const { hasPermission } = await import('@/lib/permissions')
      const canRead = hasPermission(role || '', `${moduleName}:read`)
      if (!canRead) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions for this module' },
          { status: 403 }
        )
      }
    }
  }

  // ─── 3. TENANT ISOLATION HEADER ────────────────────────────────────────
  // Instead of filtering at the middleware level (which would require
  // parsing request bodies for POST), we inject tenant context headers
  // that API routes should use to scope their queries.
  const allowedTenantIds = getAllowedTenantIds(role, userTenantId)

  // Clone request headers and add tenant context
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', (token.userId as string) || '')
  requestHeaders.set('x-user-role', role || '')
  requestHeaders.set('x-tenant-id', userTenantId || '')

  if (allowedTenantIds === null) {
    // SUPER_ADMIN: pass 'all' to indicate no filtering
    requestHeaders.set('x-tenant-scope', 'all')
  } else {
    requestHeaders.set('x-tenant-scope', allowedTenantIds.join(','))
  }

  // ─── 4. AUDIT LOGGING (async, non-blocking) ────────────────────────────
  // Fire and forget — API routes can also log specific actions
  if (pathname !== '/api/route') {
    // Use waitUntil-like pattern: set a header so the API route can log
    requestHeaders.set('x-request-started-at', new Date().toISOString())
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
}