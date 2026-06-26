import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId') || ''

    // Tenant isolation: only return polygons for farms owned by this tenant's farmers
    const validFarmIds = await db.farmLand.findMany({
      where: { farmer: { tenantId: { in: ctx.tenantScope as string[] } } },
      select: { id: true },
    })
    const idList = validFarmIds.map(f => f.id)

    const where: Record<string, unknown> = { farmId: { in: idList } }
    if (farmId) where.farmId = { in: idList.filter(id => id === farmId) }

    const data = await db.farmPolygon.findMany({
      where,
      orderBy: { pointOrder: 'asc' },
    })

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch polygon points' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const { points } = body

    if (!Array.isArray(points) || points.length === 0) {
      return NextResponse.json({ error: 'points array is required' }, { status: 400 })
    }

    // Verify all farms belong to this tenant
    const validFarmIds = await db.farmLand.findMany({
      where: { farmer: { tenantId: { in: ctx.tenantScope as string[] } } },
      select: { id: true },
    })
    const allowedIds = new Set(validFarmIds.map(f => f.id))

    const authorizedPoints = points.filter(
      (p: { farmId: string }) => allowedIds.has(p.farmId)
    )

    if (authorizedPoints.length === 0) {
      return NextResponse.json({ error: 'No authorized farm IDs provided' }, { status: 403 })
    }

    const created = await db.$transaction(
      authorizedPoints.map((p: { farmId: string; pointOrder: number; latitude: number; longitude: number; altitude?: number }) =>
        db.farmPolygon.create({
          data: {
            farmId: p.farmId,
            pointOrder: p.pointOrder,
            latitude: p.latitude,
            longitude: p.longitude,
            altitude: p.altitude ?? null,
          },
        })
      )
    )

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create polygon points' }, { status: 500 })
  }
}