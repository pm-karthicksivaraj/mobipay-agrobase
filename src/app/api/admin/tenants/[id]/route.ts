import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

/**
 * PATCH /api/admin/tenants/[id]
 *   Update tenant: activate/suspend, change name, change plan.
 *   Body: { name?, isActive?, plan?, defaultCurrency?, country? }
 *
 * DELETE /api/admin/tenants/[id]
 *   Suspend a tenant (soft delete — sets isActive=false).
 *   Hard delete is NOT supported for data integrity.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, isActive, plan, defaultCurrency, country } = body as {
      name?: string; isActive?: boolean; plan?: string; defaultCurrency?: string; country?: string
    }

    const tenant = await db.tenant.findUnique({ where: { id } })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Prevent suspending the SUPER_ADMIN tenant
    if (isActive === false && tenant.type === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Cannot suspend the platform root tenant' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (isActive !== undefined) updateData.isActive = isActive
    if (defaultCurrency !== undefined) updateData.defaultCurrency = defaultCurrency
    if (country !== undefined) updateData.country = country

    const updated = await db.tenant.update({
      where: { id },
      data: updateData,
    })

    // If plan changed, update the subscription
    if (plan) {
      const planAmounts: Record<string, number> = {
        BASIC: 0,
        STANDARD: 200,
        ENTERPRISE: 1000,
      }
      const amount = planAmounts[plan] ?? 0

      // Subscription doesn't have a unique on tenantId alone, so use findFirst + update/create
      const existing = await db.subscription.findFirst({ where: { tenantId: id, status: 'ACTIVE' } })
      if (existing) {
        await db.subscription.update({ where: { id: existing.id }, data: { plan, amount, status: 'ACTIVE' } })
      } else {
        await db.subscription.create({
          data: { tenantId: id, plan, amount, billingCycle: 'MONTHLY', status: 'ACTIVE', startDate: new Date() },
        })
      }
    }

    return NextResponse.json({ tenant: updated })
  } catch (error) {
    console.error('Admin tenant update error:', error)
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 })
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })
    }

    const { id } = await params

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        parent: { select: { name: true, type: true } },
        children: { select: { id: true, name: true, type: true, isActive: true } },
        _count: {
          select: {
            users: true, farmerProfiles: true, vslaGroups: true,
            subscriptions: true, moduleEntitlements: true, plots: true,
            companies: true,
            impactBaselines: true, impactEvents: true,
            practiceAdoptions: true, climateResilienceScores: true,
          },
        },
      },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get active subscription
    const subscription = await db.subscription.findFirst({
      where: { tenantId: id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })

    // Get module entitlements
    const entitlements = await db.moduleEntitlement.findMany({
      where: { tenantId: id },
      orderBy: { moduleCode: 'asc' },
    })

    return NextResponse.json({
      tenant,
      subscription,
      entitlements,
    })
  } catch (error) {
    console.error('Admin tenant detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 })
  }
}
