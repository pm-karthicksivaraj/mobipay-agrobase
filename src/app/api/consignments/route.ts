import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [data, total] = await Promise.all([
      db.consignment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.consignment.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch consignments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const consignment = await db.consignment.create({
      data: {
        product: body.product,
        quantity: body.quantity,
        source: body.source || null,
        destination: body.destination || null,
        status: body.status || 'DRAFT',
        totalValue: body.totalValue ?? null,
      },
    })
    return NextResponse.json(consignment, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create consignment' }, { status: 500 })
  }
}