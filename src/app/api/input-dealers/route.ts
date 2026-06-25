import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    const tf = buildTenantFilter(ctx, 'tenantId') as any
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { location: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const [data, total] = await Promise.all([
      db.inputDealer.findMany({
        where: { ...tf, ...where },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.inputDealer.count({ where: { ...tf, ...where } }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dealers' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    const tf = buildTenantFilter(ctx, 'tenantId') as any
    const body = await request.json()
    const dealer = await db.inputDealer.create({
      data: {
        tenantId: ctx.tenantId,
        name: body.name,
        phone: body.phone || null,
        location: body.location || null,
        isActive: body.isActive ?? true,
      },
    })
    return NextResponse.json(dealer, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create dealer' }, { status: 500 })
  }
}