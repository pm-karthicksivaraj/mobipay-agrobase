/**
 * Agrobase V3 — Edge-Compatible Entitlement Cache
 *
 * In-memory cache of tenant entitlements for use in Edge Runtime middleware.
 * Cannot use Prisma/DB in Edge, so this cache is:
 *   - Warmed by a Node.js API route (/api/settings/entitlements?action=sync-cache)
 *   - Checked synchronously in middleware (zero DB queries per request)
 *   - Auto-invalidated after a configurable TTL (default 5 minutes)
 *   - Fail-open: if cache is empty/stale, allow request (avoids locking tenants out)
 *
 * Route → Entitlement Module Mapping:
 *   Maps URL prefixes (/api/vsla/*) to entitlement module codes (VSLA).
 *   Routes NOT in the map are considered "core" and always allowed.
 */

// ─── Route → Entitlement Module Mapping ──────────────────────────────────────
//
// Only routes listed here require entitlement checks.
// Everything else (dashboard, users, settings, health, auth, etc.) is core/free.

/** Maps URL path prefix → entitlement module code (UPPERCASE) */
const ROUTE_TO_MODULE: Record<string, string> = {
  '/api/vsla':               'VSLA',
  '/api/market':             'MARKETPLACE',
  '/api/marketplace':        'MARKETPLACE',
  '/api/trainings':          'TRAINING',
  '/api/loans':              'LOANS',
  '/api/traceability':       'TRACE',
  '/api/compliance':         'COMPLIANCE',
  '/api/inputs':             'INVENTORY',
  '/api/input-dealers':      'INVENTORY',
  '/api/input-products':     'INVENTORY',
  '/api/input-requests':     'INVENTORY',
  '/api/inventory':          'INVENTORY',
  '/api/warehouse':          'INVENTORY',
  '/api/cooperative':        'COOPERATIVE',
  '/api/purchases':          'COOPERATIVE',
  '/api/analytics':          'REPORTS',
  '/api/reports':            'REPORTS',
  '/api/carbon':             'CARBON',
  '/api/satellite':          'SATELLITE',
  '/api/contracts':          'CONTRACTS',
  '/api/consignments':       'CONTRACTS',
  '/api/logistics':          'LOGISTICS',
  '/api/deliveries':         'LOGISTICS',
  '/api/quality':            'QUALITY',
  '/api/payments':           'PAYMENTS',
  '/api/billing':            'BILLING',
  '/api/api-keys':           'API_ACCESS',
  '/api/surveys':            'SURVEYS',
  '/api/farm-visits':        'SURVEYS',       // farm-visits is a survey sub-feature
  '/api/feedback':           'SURVEYS',
  '/api/notifications':      'REPORTS',       // notifications ships with reports module
  '/api/sales':              'MARKETPLACE',
  '/api/partners':           'CONTRACTS',
  '/api/impact-assessments': 'REPORTS',
}

/**
 * Resolve a URL path to its entitlement module code.
 * Returns null for core/free routes (no entitlement needed).
 */
export function resolveModuleForPath(pathname: string): string | null {
  for (const [prefix, moduleCode] of Object.entries(ROUTE_TO_MODULE)) {
    if (pathname.startsWith(prefix)) return moduleCode
  }
  return null
}

// ─── Entitlement Cache ───────────────────────────────────────────────────────

interface TenantEntitlements {
  /** Set of enabled module codes (uppercase) */
  modules: Set<string>
  /** Timestamp when this entry was last synced */
  syncedAt: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_TENANTS = 500

/** tenantId → TenantEntitlements */
const entitlementCache = new Map<string, TenantEntitlements>()

/**
 * Check if a tenant has a specific module enabled.
 *
 * Resolution:
 *   1. If cache entry exists and is fresh (within TTL), check the Set
 *   2. If cache is stale or missing, FAIL-OPEN (allow the request)
 *      to avoid locking tenants out during cache cold-start
 *   3. SUPER_ADMIN tenant scope ('all') always passes
 *
 * @returns true if allowed, false if explicitly denied
 */
export function checkEntitlement(
  tenantId: string,
  moduleCode: string,
  tenantScope?: string | null
): boolean {
  // SUPER_ADMIN bypasses all entitlement checks
  if (tenantScope === 'all') return true

  const entry = entitlementCache.get(tenantId)
  if (!entry) {
    // Cache miss — fail open (don't block on cold start)
    return true
  }

  // Check TTL — if stale, fail open
  if (Date.now() - entry.syncedAt > CACHE_TTL_MS) {
    return true
  }

  return entry.modules.has(moduleCode.toUpperCase())
}

/**
 * Get all cached entitlements for a tenant (for admin/debug endpoints).
 * Returns null if not cached.
 */
export function getCachedEntitlements(tenantId: string): Set<string> | null {
  const entry = entitlementCache.get(tenantId)
  if (!entry) return null
  if (Date.now() - entry.syncedAt > CACHE_TTL_MS) return null
  return entry.modules
}

/**
 * Warm/update the entitlement cache for a specific tenant.
 * Called by the Node.js API route after DB reads.
 */
export function setTenantEntitlements(
  tenantId: string,
  enabledModules: string[]
): void {
  // Evict oldest entries if cache is full
  if (!entitlementCache.has(tenantId) && entitlementCache.size >= MAX_TENANTS) {
    // Simple: clear all (a proper LRU would be better but adds complexity)
    // In practice, 500 tenants is generous for this SaaS
    const firstKey = entitlementCache.keys().next().value
    if (firstKey !== undefined) entitlementCache.delete(firstKey)
  }

  entitlementCache.set(tenantId, {
    modules: new Set(enabledModules.map(m => m.toUpperCase())),
    syncedAt: Date.now(),
  })
}

/**
 * Invalidate a single tenant's cache entry.
 */
export function invalidateTenant(tenantId: string): void {
  entitlementCache.delete(tenantId)
}

/**
 * Clear the entire entitlement cache.
 * Used after bulk entitlement changes (plan upgrade, admin sync).
 */
export function clearEntitlementCache(): void {
  entitlementCache.clear()
}

/**
 * Get cache statistics (for admin/monitoring).
 */
export function getCacheStats(): {
  tenantCount: number
  ttlMs: number
  maxTenants: number
} {
  return {
    tenantCount: entitlementCache.size,
    ttlMs: CACHE_TTL_MS,
    maxTenants: MAX_TENANTS,
  }
}