/**
 * Agrobase V3 — /api/settings/entitlements
 *
 * Manages tenant entitlements and warms the Edge middleware cache.
 *
 *   GET    ?action=list             — List tenant's entitlements
 *   GET    ?action=cache-stats      — Get cache statistics (SUPER_ADMIN)
 *   POST   ?action=grant            — Grant module access
 *   POST   ?action=revoke           — Revoke module access
 *   POST   ?action=sync-cache       — Warm Edge cache for tenant(s) from DB
 *   POST   ?action=sync-all         — Warm Edge cache for ALL tenants (SUPER_ADMIN)
 *   DELETE ?id=<entitlement-id>     — Delete an entitlement record
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { entitlementEngine } from '@/lib/entitlements/engine'
import {
  setTenantEntitlements,
  invalidateTenant,
  clearEntitlementCache,
  getCacheStats,
} from '@/middleware/edge-entitlements'

// ═══════════════════════════════════════════════════════════════════════════════
// GET — List entitlements or cache stats
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Cache stats (admin/monitoring)
    if (action === 'cache-stats') {
      if (!ctx.isSuperAdmin) {
        return NextResponse.json(
          { success: false, error: 'SUPER_ADMIN only' },
          { status: 403 }
        )
      }
      return NextResponse.json({
        success: true,
        data: getCacheStats(),
      })
    }

    // Default: list entitlements for this tenant
    // SUPER_ADMIN can see another tenant's entitlements via ?tenantId=xxx
    const targetTenantId = ctx.isSuperAdmin
      ? (searchParams.get('tenantId') || ctx.tenantId)
      : ctx.tenantId

    if (!targetTenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID required' },
        { status: 400 }
      )
    }

    const entitlements = await entitlementEngine.getEntitlements(targetTenantId)
    const enabledModules = await entitlementEngine.getEnabledModules(targetTenantId)

    return NextResponse.json({
      success: true,
      data: {
        entitlements,
        enabledModules,
        tenantId: targetTenantId,
      },
    })
  } catch (error) {
    console.error('[entitlements GET]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch entitlements' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST — Grant, revoke, or sync cache
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const body = await request.json()
    const { action } = body

    // ── Sync Edge cache for a single tenant ──
    if (action === 'sync-cache') {
      const targetTenantId = body.tenantId || ctx.tenantId
      if (!targetTenantId) {
        return NextResponse.json(
          { success: false, error: 'tenantId is required' },
          { status: 400 }
        )
      }

      // Only SUPER_ADMIN can sync other tenants
      if (targetTenantId !== ctx.tenantId && !ctx.isSuperAdmin) {
        return NextResponse.json(
          { success: false, error: 'Cannot sync another tenant' },
          { status: 403 }
        )
      }

      const enabledModules = await entitlementEngine.getEnabledModules(targetTenantId)
      setTenantEntitlements(targetTenantId, enabledModules)

      // Also auto-warm on first request (called after login, plan change, etc.)
      return NextResponse.json({
        success: true,
        data: {
          tenantId: targetTenantId,
          enabledModules,
          message: `Edge cache warmed with ${enabledModules.length} modules`,
        },
      })
    }

    // ── Sync Edge cache for ALL tenants (SUPER_ADMIN only) ──
    if (action === 'sync-all') {
      if (!ctx.isSuperAdmin) {
        return NextResponse.json(
          { success: false, error: 'SUPER_ADMIN only' },
          { status: 403 }
        )
      }

      const { db } = await import('@/lib/db')
      const tenants = await db.tenant.findMany({
        where: { isActive: true },
        select: { id: true },
      })

      let totalSynced = 0

      for (const tenant of tenants) {
        const enabledModules = await entitlementEngine.getEnabledModules(tenant.id)
        setTenantEntitlements(tenant.id, enabledModules)
        totalSynced++
      }

      return NextResponse.json({
        success: true,
        data: {
          tenantsSynced: totalSynced,
          message: `Edge cache warmed for ${totalSynced} tenants`,
        },
      })
    }

    // ── Grant module access ──
    if (action === 'grant') {
      if (!ctx.isSuperAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only SUPER_ADMIN can grant entitlements' },
          { status: 403 }
        )
      }

      const { tenantId, module, features } = body
      if (!tenantId || !module) {
        return NextResponse.json(
          { success: false, error: 'tenantId and module are required' },
          { status: 400 }
        )
      }

      const record = await entitlementEngine.grantAccess(
        tenantId,
        module,
        features || [],
      )

      // Invalidate Edge cache for this tenant
      invalidateTenant(tenantId)

      return NextResponse.json({ success: true, data: record })
    }

    // ── Revoke module access ──
    if (action === 'revoke') {
      if (!ctx.isSuperAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only SUPER_ADMIN can revoke entitlements' },
          { status: 403 }
        )
      }

      const { tenantId, module } = body
      if (!tenantId || !module) {
        return NextResponse.json(
          { success: false, error: 'tenantId and module are required' },
          { status: 400 }
        )
      }

      await entitlementEngine.revokeAccess(tenantId, module)

      // Invalidate Edge cache for this tenant
      invalidateTenant(tenantId)

      return NextResponse.json({
        success: true,
        message: `Module '${module}' revoked for tenant ${tenantId}`,
      })
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}. Use: sync-cache, sync-all, grant, revoke` },
      { status: 400 }
    )
  } catch (error) {
    console.error('[entitlements POST]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE — Remove an entitlement record
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)

    if (!ctx.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only SUPER_ADMIN can delete entitlements' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Entitlement ID required' },
        { status: 400 }
      )
    }

    const { db } = await import('@/lib/db')
    const record = await db.moduleEntitlement.findUnique({ where: { id } })

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Entitlement not found' },
        { status: 404 }
      )
    }

    await db.moduleEntitlement.delete({ where: { id } })

    // Invalidate Edge cache for this tenant
    invalidateTenant(record.tenantId)

    return NextResponse.json({
      success: true,
      message: 'Entitlement deleted',
    })
  } catch (error) {
    console.error('[entitlements DELETE]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete entitlement' },
      { status: 500 }
    )
  }
}