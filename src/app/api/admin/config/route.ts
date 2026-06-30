import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

/**
 * GET /api/admin/config
 *   Platform configuration: all module entitlements across all tenants,
 *   feature flags, branding configs. SUPER_ADMIN only.
 *
 * PATCH /api/admin/config
 *   Toggle a module entitlement for a tenant.
 *   Body: { tenantId, moduleCode, isEnabled }
 */
export async function GET() {
  try {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })
    }

    const [entitlements, tenants, brandingConfigs] = await Promise.all([
      db.moduleEntitlement.findMany({
        include: { tenant: { select: { name: true, country: true, type: true } } },
        orderBy: [{ tenantId: 'asc' }, { moduleCode: 'asc' }],
      }),
      db.tenant.findMany({
        where: { isActive: true },
        select: { id: true, name: true, country: true, type: true, defaultCurrency: true },
        orderBy: { name: 'asc' },
      }),
      db.brandingConfig.findMany({
        include: { tenant: { select: { name: true } } },
      }),
    ])

    // Module coverage: which modules are enabled across tenants
    const moduleCoverage: Record<string, { enabled: number; disabled: number }> = {}
    for (const e of entitlements) {
      if (!moduleCoverage[e.moduleCode]) moduleCoverage[e.moduleCode] = { enabled: 0, disabled: 0 }
      if (e.isEnabled) moduleCoverage[e.moduleCode].enabled++
      else moduleCoverage[e.moduleCode].disabled++
    }

    // All available modules
    const allModules = [
      'DASHBOARD', 'FARMERS', 'VSLA', 'MARKETPLACE', 'PAYMENTS', 'LOANS',
      'REPORTS', 'TRAINING', 'TRACE', 'COMPLIANCE', 'COMMUNICATION',
      'INPUT_AGGREGATION', 'PURCHASES', 'CONSIGNMENTS', 'SALES',
      'DELIVERIES', 'PROCESSING', 'APPROVALS', 'CARBON', 'MFI',
      'TRANSPORT', 'IMPACT', 'CCRP',
    ]

    return NextResponse.json({
      tenants,
      entitlements: entitlements.map(e => ({
        ...e,
        tenantName: e.tenant.name,
        tenantCountry: e.tenant.country,
        tenantType: e.tenant.type,
      })),
      moduleCoverage: Object.entries(moduleCoverage).map(([moduleCode, counts]) => ({
        moduleCode,
        enabled: counts.enabled,
        disabled: counts.disabled,
        total: counts.enabled + counts.disabled,
        adoptionRate: counts.enabled + counts.disabled > 0
          ? Math.round((counts.enabled / (counts.enabled + counts.disabled)) * 100)
          : 0,
      })),
      allModules,
      brandingConfigs: brandingConfigs.map(b => ({
        ...b,
        tenantName: b.tenant.name,
      })),
    })
  } catch (error) {
    console.error('Admin config error:', error)
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { tenantId, moduleCode, isEnabled } = body as {
      tenantId?: string; moduleCode?: string; isEnabled?: boolean
    }

    if (!tenantId || !moduleCode || isEnabled === undefined) {
      return NextResponse.json(
        { error: 'tenantId, moduleCode, and isEnabled are required' },
        { status: 400 },
      )
    }

    const updated = await db.moduleEntitlement.upsert({
      where: {
        tenantId_moduleCode: { tenantId, moduleCode },
      },
      update: { isEnabled },
      create: { tenantId, moduleCode, isEnabled },
    })

    return NextResponse.json({ entitlement: updated })
  } catch (error) {
    console.error('Admin config update error:', error)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
