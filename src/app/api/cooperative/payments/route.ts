import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()

    const { searchParams } = new URL(request.url)
    const intakeId = searchParams.get('intakeId') || ''
    const phase = searchParams.get('phase') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Filter through farmer tenantId
    const where: Record<string, unknown> = {}
    if (!ctx.isSuperAdmin) {
      where.farmerId = {
        in: (await db.farmerProfile.findMany({
          where: { tenantId: { in: ctx.tenantScope } },
          select: { id: true },
        })).map(f => f.id),
      }
    }
    if (intakeId) where.intakeId = intakeId
    if (phase) where.phase = phase
    if (status) where.status = status

    // Use payments as a proxy until cooperative payment model is added
    const payments = await db.payment.findMany({
      where: ctx.isSuperAdmin ? {} : {
        paymentAccount: { tenantId: { in: ctx.tenantScope } },
        type: { in: ['BULK_PURCHASE', 'BULK_DISBURSEMENT'] },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    const total = await db.payment.count({
      where: ctx.isSuperAdmin ? {} : {
        paymentAccount: { tenantId: { in: ctx.tenantScope } },
        type: { in: ['BULK_PURCHASE', 'BULK_DISBURSEMENT'] },
      },
    })

    return NextResponse.json({
      data: payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      note: 'Full cooperative payment model pending schema update',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch cooperative payments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'payments:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { intakeId, phase, deductions, farmerId, amount, recipientName, recipientPhone } = body as {
      intakeId?: string
      phase: string
      deductions?: Array<{ type: string; amount: number; description?: string }>
      farmerId?: string
      amount?: number
      recipientName?: string
      recipientPhone?: string
    }

    if (!phase || !['FIRST', 'FINAL'].includes(phase)) {
      return NextResponse.json({ error: 'phase must be FIRST or FINAL' }, { status: 400 })
    }

    // Verify farmer belongs to tenant
    if (farmerId && !ctx.isSuperAdmin) {
      const farmer = await db.farmerProfile.findFirst({
        where: { id: farmerId, tenantId: { in: ctx.tenantScope } },
      })
      if (!farmer) {
        return NextResponse.json({ error: 'Farmer not found in your tenant' }, { status: 403 })
      }
    }

    // Create a payment record as a cooperative payment proxy
    const totalDeductions = (deductions || []).reduce((sum, d) => sum + d.amount, 0)
    const paymentAmount = (amount || 0) - totalDeductions

    const payment = await db.payment.create({
      data: {
        type: phase === 'FIRST' ? 'BULK_PURCHASE' : 'BULK_DISBURSEMENT',
        recipientName: recipientName || 'Cooperative Farmer',
        recipientPhone: recipientPhone || '',
        amount: paymentAmount > 0 ? paymentAmount : amount || 0,
        description: `${phase} payment${intakeId ? ` for intake ${intakeId}` : ''}${deductions?.length ? ` (${deductions.length} deductions)` : ''}`,
        transactionRef: `COOP-${phase}-${Date.now()}`,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      data: payment,
      deductions: deductions || [],
      netAmount: paymentAmount,
      note: 'Stored as payment until cooperative payment model is added',
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initiate cooperative payment' }, { status: 500 })
  }
}