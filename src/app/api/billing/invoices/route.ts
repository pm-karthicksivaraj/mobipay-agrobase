import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'settings:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {
      ...buildTenantFilter(ctx, 'tenantId'),
    }
    if (status) where.status = status
    if (startDate || endDate) {
      where.createdAt = {} as Record<string, unknown>
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate)
    }

    const [data, total] = await Promise.all([
      db.subscription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.subscription.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'settings:admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Manual invoice generation — creates a subscription record as an invoice proxy
    const body = await request.json()
    const { plan, billingCycle } = body as {
      plan?: string
      billingCycle?: string
    }

    const PLAN_AMOUNTS: Record<string, number> = {
      BASIC: 50,
      STANDARD: 150,
      ENTERPRISE: 500,
    }

    const activeSub = await db.subscription.findFirst({
      where: { tenantId: ctx.tenantId, status: 'ACTIVE' },
    })

    const invoice = await db.subscription.create({
      data: {
        tenantId: ctx.tenantId,
        plan: plan || activeSub?.plan || 'BASIC',
        amount: PLAN_AMOUNTS[plan || activeSub?.plan || 'BASIC'] || 50,
        billingCycle: billingCycle || activeSub?.billingCycle || 'MONTHLY',
        status: 'PENDING',
        startDate: new Date(),
      },
    })

    return NextResponse.json({ data: invoice }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
  }
}