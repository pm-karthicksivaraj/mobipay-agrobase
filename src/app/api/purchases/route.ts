import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const commodity = searchParams.get('commodity') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (commodity) where.commodity = commodity

    // Filter through farmer tenantId
    if (!ctx.isSuperAdmin) {
      const validFarmerIds = await db.farmerProfile.findMany({
        where: { tenantId: { in: ctx.tenantScope } },
        select: { id: true },
      })
      where.farmerId = { in: validFarmerIds.map(f => f.id) }
    }

    const [data, total] = await Promise.all([
      db.purchase.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { farmer: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.purchase.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const purchase = await db.purchase.create({
      data: {
        groupId: body.groupId || null,
        farmerId: body.farmerId || null,
        commodity: body.commodity,
        variety: body.variety || null,
        quantity: body.quantity,
        unitPrice: body.unitPrice ?? null,
        totalAmount: body.totalAmount ?? null,
        status: body.status || 'PENDING',
        initiatedBy: ctx.userId,
        reviewedBy: body.reviewedBy || null,
        approvedBy: body.approvedBy || null,
      },
      include: { farmer: true },
    })
    return NextResponse.json(purchase, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status, reviewedBy, approvedBy } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status, updatedAt: new Date() }
    if (reviewedBy) updateData.reviewedBy = reviewedBy
    if (approvedBy) updateData.approvedBy = approvedBy

    const updated = await db.purchase.update({
      where: { id },
      data: updateData,
      include: { farmer: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update purchase' }, { status: 500 })
  }
}