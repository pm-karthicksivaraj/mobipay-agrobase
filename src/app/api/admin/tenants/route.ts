import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

/**
 * GET /api/admin/tenants
 *   List all tenants with stats. SUPER_ADMIN only.
 *
 * POST /api/admin/tenants
 *   Create a new tenant. SUPER_ADMIN only.
 *   Body: { name, type, country, defaultCurrency, parentId? }
 */
export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const country = searchParams.get('country')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (country) where.country = country
    if (status === 'active') where.isActive = true
    if (status === 'suspended') where.isActive = false

    const tenants = await db.tenant.findMany({
      where,
      select: {
        id: true, name: true, type: true, country: true, isActive: true,
        defaultCurrency: true, createdAt: true, updatedAt: true,
        parentId: true,
        parent: { select: { name: true } },
        _count: {
          select: {
            users: true,
            farmerProfiles: true,
            vslaGroups: true,
            subscriptions: true,
            moduleEntitlements: true,
            plots: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch active subscription per tenant
    const tenantIds = tenants.map(t => t.id)
    const subscriptions = await db.subscription.findMany({
      where: { tenantId: { in: tenantIds }, status: 'ACTIVE' },
      select: { tenantId: true, plan: true, amount: true, billingCycle: true, endDate: true },
    })
    const subByTenant = new Map(subscriptions.map(s => [s.tenantId, s]))

    const result = tenants.map(t => {
      const sub = subByTenant.get(t.id)
      return {
        ...t,
        subscription: sub || null,
        mrr: sub ? (sub.billingCycle === 'ANNUAL' ? sub.amount / 12 : sub.amount) : 0,
      }
    })

    return NextResponse.json({ tenants: result, total: result.length })
  } catch (error) {
    console.error('Admin tenants list error:', error)
    return NextResponse.json({ error: 'Failed to list tenants' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, type, country, defaultCurrency, parentId } = body as {
      name?: string; type?: string; country?: string; defaultCurrency?: string; parentId?: string
    }

    if (!name || !type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 })
    }

    const validTypes = ['SUPER_ADMIN', 'COUNTRY', 'NGO', 'COOPERATIVE', 'AGRIBUSINESS', 'EXPORTER', 'MFI', 'BANK', 'INPUT_SUPPLIER', 'PROCESSING']
    if (!validTypes.includes(type!)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    // Derive currency from country if not provided
    const countryCurrency: Record<string, string> = { Uganda: 'UGX', Ghana: 'GHS', Kenya: 'KES' }
    const currency = defaultCurrency || (country ? countryCurrency[country] : 'UGX')

    const tenant = await db.tenant.create({
      data: {
        name: name!,
        type: type!,
        country: country || null,
        defaultCurrency: currency,
        parentId: parentId || null,
        isActive: true,
      },
    })

    // Auto-create default module entitlements for the new tenant
    const defaultModules = [
      'DASHBOARD', 'FARMERS', 'VSLA', 'MARKETPLACE', 'PAYMENTS', 'LOANS',
      'REPORTS', 'TRAINING', 'TRACE', 'COMPLIANCE', 'COMMUNICATION',
    ]
    await db.moduleEntitlement.createMany({
      data: defaultModules.map(moduleCode => ({
        tenantId: tenant.id,
        moduleCode,
        isEnabled: true,
      })),
      skipDuplicates: true,
    })

    // Auto-create a default ACTIVE subscription (BASIC plan, free)
    await db.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: 'BASIC',
        amount: 0,
        billingCycle: 'MONTHLY',
        status: 'ACTIVE',
        startDate: new Date(),
      },
    })

    return NextResponse.json({ tenant }, { status: 201 })
  } catch (error) {
    console.error('Admin tenant create error:', error)
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
  }
}
