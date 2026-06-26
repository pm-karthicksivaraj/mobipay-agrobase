import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || ''
    const product = searchParams.get('product') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (category) where.product = category
    if (product) where.product = product

    // Filter through farmer tenantId
    if (!ctx.isSuperAdmin) {
      const validFarmerIds = await db.farmerProfile.findMany({
        where: { tenantId: { in: ctx.tenantScope } },
        select: { id: true },
      })
      where.farmerId = { in: validFarmerIds.map(f => f.id) }
    }

    const [data, total] = await Promise.all([
      db.sale.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { farmer: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.sale.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const sale = await db.sale.create({
      data: {
        farmerId: body.farmerId || null,
        customerId: body.customerId || null,
        customerName: body.customerName || null,
        product: body.product,
        quantity: body.quantity,
        unitPrice: body.unitPrice ?? null,
        totalAmount: body.totalAmount ?? null,
        status: body.status || 'COMPLETED',
      },
      include: { farmer: true },
    })
    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 })
  }
}