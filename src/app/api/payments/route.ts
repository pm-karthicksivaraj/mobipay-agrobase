import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.type = type
    // Filter through paymentAccount tenantId
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
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const payment = await db.payment.create({
      data: {
        type: body.type,
        recipientName: body.recipientName,
        recipientPhone: body.recipientPhone,
        amount: body.amount,
        description: body.description,
        transactionRef: `PAY-${Date.now()}`,
        status: 'PENDING',
      }
    })
    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}