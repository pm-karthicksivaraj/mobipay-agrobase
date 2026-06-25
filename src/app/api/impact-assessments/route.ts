import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || ''
    const farmerId = searchParams.get('farmerId') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (category) where.category = category

    // Filter through farmer tenantId
    if (!ctx.isSuperAdmin) {
      const validFarmerIds = await db.farmerProfile.findMany({
        where: { tenantId: { in: ctx.tenantScope } },
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
      db.impactAssessment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { farmer: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.impactAssessment.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch impact assessments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const assessment = await db.impactAssessment.create({
      data: {
        farmerId: body.farmerId || null,
        assessmentDate: body.assessmentDate ? new Date(body.assessmentDate) : new Date(),
        category: body.category,
        response: typeof body.response === 'string' ? body.response : JSON.stringify(body.response),
        score: body.score ?? null,
        notes: body.notes || null,
        conductedBy: ctx.userId,
      },
      include: { farmer: true },
    })
    return NextResponse.json(assessment, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create impact assessment' }, { status: 500 })
  }
}