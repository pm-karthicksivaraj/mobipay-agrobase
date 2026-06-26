import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    const tf = buildTenantFilter(ctx, 'tenantId') as any
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [data, total] = await Promise.all([
      db.inputRequest.findMany({
        where: { ...tf, ...where },
        skip: (page - 1) * limit,
        take: limit,
        include: { dealer: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.inputRequest.count({ where: { ...tf, ...where } }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch input requests' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    const tf = buildTenantFilter(ctx, 'tenantId') as any
    const body = await request.json()
    const inputRequest = await db.inputRequest.create({
      data: {
        tenantId: ctx.tenantId,
        dealerId: body.dealerId || null,
        farmerId: body.farmerId || null,
        farmerName: body.farmerName,
        farmerPhone: body.farmerPhone,
        product: body.product,
        quantity: body.quantity,
        unitPrice: body.unitPrice ?? null,
        totalPrice: body.totalPrice ?? null,
        status: 'PENDING',
      },
      include: { dealer: true },
    })
    return NextResponse.json(inputRequest, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create input request' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
    }

    const updated = await db.inputRequest.update({
      where: { id },
      data: { status, updatedAt: new Date() },
      include: { dealer: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update input request' }, { status: 500 })
  }
}