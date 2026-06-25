import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// TODO: Add tenantId to this model for full multi-tenant isolation
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const relatedType = searchParams.get('relatedType') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (relatedType) where.relatedType = relatedType

    const [data, total] = await Promise.all([
      db.delivery.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.delivery.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const delivery = await db.delivery.create({
      data: {
        relatedId: body.relatedId || null,
        relatedType: body.relatedType || null,
        status: body.status || 'PENDING',
        driverName: body.driverName || null,
        vehicleReg: body.vehicleReg || null,
        dispatchedAt: body.dispatchedAt ? new Date(body.dispatchedAt) : null,
        deliveredAt: body.deliveredAt ? new Date(body.deliveredAt) : null,
      },
    })
    return NextResponse.json(delivery, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create delivery' }, { status: 500 })
  }
}