import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const farmerId = searchParams.get('farmerId') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    // Filter through farmer tenantId
    if (!ctx.isSuperAdmin) {
      const validFarmerIds = await db.farmerProfile.findMany({
        where: { tenantId: { in: ctx.tenantScope as string[] } },
        select: { id: true },
      })
      const idList = validFarmerIds.map(f => f.id)
      where.farmerId = farmerId
        ? { in: idList.filter(id => id === farmerId) }
        : { in: idList }
    } else if (farmerId) {
      where.farmerId = farmerId
    }

    const [data, total] = await Promise.all([
      db.farmVisit.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { farmer: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.farmVisit.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch farm visits' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const farmVisit = await db.farmVisit.create({
      data: {
        farmerId: body.farmerId || null,
        extensionOfficerId: ctx.userId,
        visitDate: body.visitDate ? new Date(body.visitDate) : new Date(),
        topic: body.topic,
        observations: body.observations || null,
        recommendations: body.recommendations || null,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
        status: body.status || 'COMPLETED',
      },
      include: { farmer: true },
    })
    return NextResponse.json(farmVisit, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create farm visit' }, { status: 500 })
  }
}