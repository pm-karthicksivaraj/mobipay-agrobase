import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'

const PLAN_AMOUNTS: Record<string, number> = {
  BASIC: 50,
  STANDARD: 150,
  ENTERPRISE: 500,
}

export async function GET() {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'settings:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const subscription = await db.subscription.findFirst({
      where: { tenantId: ctx.tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: subscription })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'settings:admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { plan, billingCycle, paymentMethod } = body as {
      plan: string
      billingCycle?: string
      paymentMethod?: string
    }

    if (!plan || !['BASIC', 'STANDARD', 'ENTERPRISE'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan. Must be BASIC, STANDARD, or ENTERPRISE' }, { status: 400 })
    }

    const cycle = billingCycle || 'MONTHLY'
    const amount = PLAN_AMOUNTS[plan] || 50

    // Deactivate existing active subscriptions
    await db.subscription.updateMany({
      where: { tenantId: ctx.tenantId, status: 'ACTIVE' },
      data: { status: 'CANCELLED', endDate: new Date() },
    })

    const subscription = await db.subscription.create({
      data: {
        tenantId: ctx.tenantId,
        plan,
        amount,
        billingCycle: cycle,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: cycle === 'ANNUAL'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    return NextResponse.json({ data: subscription }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'settings:admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, plan, status } = body as {
      id: string
      plan?: string
      status?: string
    }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (plan) {
      updateData.plan = plan
      updateData.amount = PLAN_AMOUNTS[plan] || 50
    }
    if (status === 'CANCELLED') {
      updateData.status = 'CANCELLED'
      updateData.endDate = new Date()
    }

    const updated = await db.subscription.update({
      where: { id, tenantId: ctx.tenantId },
      data: updateData,
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'settings:admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const cancelled = await db.subscription.update({
      where: { id, tenantId: ctx.tenantId },
      data: { status: 'CANCELLED', endDate: new Date() },
    })

    return NextResponse.json({ data: cancelled })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }
}