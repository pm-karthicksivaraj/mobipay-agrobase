import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    const tf = ctx ? buildTenantFilter(ctx, 'tenantId') as any : {}
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { ...tf }
    if (type) where.type = type

    const [data, total] = await Promise.all([
      db.training.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { attendance: true } } },
        orderBy: { date: 'desc' },
      }),
      db.training.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trainings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const training = await db.training.create({
      data: {
        tenantId: ctx.tenantId,
        topic: body.title || body.topic,
        description: body.description || null,
        date: body.date ? new Date(body.date) : new Date(),
        location: body.location || null,
        trainerName: body.facilitator || body.trainerName || null,
      },
    })
    return NextResponse.json({ data: training }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create training' }, { status: 500 })
  }
}