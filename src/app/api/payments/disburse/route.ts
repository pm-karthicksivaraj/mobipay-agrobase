import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'payments:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''
    const recipient = searchParams.get('recipient') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.type = type
    if (recipient) {
      where.OR = [
        { recipientPhone: { contains: recipient } },
        { recipientName: { contains: recipient } },
      ]
    }
    if (startDate || endDate) {
      where.createdAt = {} as Record<string, unknown>
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate)
    }
    // Tenant isolation through paymentAccount
    if (!ctx.isSuperAdmin) {
      where.paymentAccount = { tenantId: { in: ctx.tenantScope as string[] } }
    }

    const [data, total] = await Promise.all([
      db.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { paymentAccount: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.payment.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch disbursements' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'payments:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { provider, type, amount, currency, recipientPhone, recipientName, description, reference, metadata, recipients } = body as {
      provider?: string
      type: string
      amount?: number
      currency?: string
      recipientPhone?: string
      recipientName?: string
      description?: string
      reference?: string
      metadata?: Record<string, unknown>
      recipients?: Array<{ phone: string; name: string; amount: number; reference?: string }>
    }

    if (type === 'BULK_DISBURSEMENT' && recipients && recipients.length > 0) {
      // Bulk disbursement
      const payments = await db.$transaction(
        recipients.map((r) =>
          db.payment.create({
            data: {
              type,
              recipientName: r.name,
              recipientPhone: r.phone,
              amount: r.amount,
              description: description || `Bulk disbursement to ${r.name}`,
              transactionRef: r.reference || `DISB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              status: 'PENDING',
            },
          })
        )
      )
      return NextResponse.json({ data: payments, count: payments.length }, { status: 201 })
    }

    // Single disbursement
    if (!recipientPhone || !recipientName || !amount) {
      return NextResponse.json({ error: 'recipientPhone, recipientName, and amount are required' }, { status: 400 })
    }

    const payment = await db.payment.create({
      data: {
        type: type || 'BULK_DISBURSEMENT',
        recipientName,
        recipientPhone,
        amount,
        description: description || null,
        transactionRef: reference || `DISB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ data: payment }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initiate disbursement' }, { status: 500 })
  }
}