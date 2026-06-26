import { headers } from 'next/headers'
import { db } from '@/lib/db'
import type { NextRequest } from 'next/server'

/**
 * Extract tenant context from request headers injected by middleware.
 * Use this in API routes to scope database queries.
 */
export interface TenantContext {
  userId: string
  role: string
  tenantId: string
  tenantScope: 'all' | string[]  // 'all' for SUPER_ADMIN, or list of allowed tenant IDs
  isSuperAdmin: boolean
}

/**
 * Get the current user's tenant context from the request headers.
 * Reads from Next.js headers() API (set by middleware).
 *
 * Accepts an optional NextRequest for backward compatibility — it is NOT used
 * since Next.js 13+ Route Handlers can access headers via the `headers()` API.
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const ctx = await getTenantContext()  // or getTenantContext(request) — both work
 *   const farmers = await db.farmerProfile.findMany({
 *     where: { ...buildTenantFilter(ctx) },
 *   })
 * }
 * ```
 */
export async function getTenantContext(_req?: NextRequest | Request): Promise<TenantContext> {
  const headersList = await headers()
  const userId = headersList.get('x-user-id') || ''
  const role = headersList.get('x-user-role') || ''
  const tenantId = headersList.get('x-tenant-id') || ''
  const tenantScope = headersList.get('x-tenant-scope') || ''

  const isSuperAdmin = tenantScope === 'all'

  // Validate: non-super-admin must have a tenantId
  if (!isSuperAdmin && !tenantId) {
    console.warn('[TenantContext] Non-super-admin user has no tenantId — queries will return empty')
  }

  return {
    userId,
    role,
    tenantId,
    tenantScope: isSuperAdmin ? 'all' : tenantScope.split(',').filter(Boolean),
    isSuperAdmin,
  }
}

/**
 * Build a Prisma where clause for tenant-scoped queries.
 * Returns an empty object for SUPER_ADMIN (no filtering),
 * or an `in` filter for the allowed tenant IDs.
 *
 * @param field - The Prisma field name to filter on (default: 'tenantId')
 *
 * @example
 * ```ts
 * const ctx = await getTenantContext()
 * const data = await db.farmerProfile.findMany({
 *   where: { ...ctx.tenantFilter() },
 * })
 * ```
 */
export function buildTenantFilter(ctx: TenantContext, field: string = 'tenantId'): Record<string, unknown> {
  if (ctx.isSuperAdmin || ctx.tenantScope === 'all') {
    return {} // No filtering for super admin
  }
  return { [field]: { in: ctx.tenantScope } }
}

/**
 * Get all descendant tenant IDs for a given tenant (recursive).
 * Uses iterative approach to avoid stack overflow on deep hierarchies.
 *
 * For PostgreSQL production, this should use a CTE query.
 * For SQLite dev, this does in-memory traversal.
 */
export async function getDescendantTenantIds(tenantId: string): Promise<string[]> {
  const ids: string[] = [tenantId]

  // Fetch all tenants to build in-memory tree
  const allTenants = await db.tenant.findMany({
    select: { id: true, parentId: true },
  })

  // Build children map
  const childrenMap = new Map<string, string[]>()
  for (const t of allTenants) {
    if (t.parentId) {
      const siblings = childrenMap.get(t.parentId) || []
      siblings.push(t.id)
      childrenMap.set(t.parentId, siblings)
    }
  }

  // BFS to find all descendants
  const queue = [tenantId]
  while (queue.length > 0) {
    const current = queue.shift()!
    const children = childrenMap.get(current) || []
    for (const childId of children) {
      if (!ids.includes(childId)) {
        ids.push(childId)
        queue.push(childId)
      }
    }
  }

  return ids
}

/**
 * Augment TenantContext with a tenantFilter helper method.
 * Allows: `ctx.tenantFilter()` or `ctx.tenantFilter('farmer.tenantId')`
 */
export function createTenantContextWithHelper(ctx: TenantContext): TenantContext & {
  tenantFilter: (field?: string) => Record<string, unknown>
} {
  return {
    ...ctx,
    tenantFilter: (field = 'tenantId') => buildTenantFilter(ctx, field),
  }
}