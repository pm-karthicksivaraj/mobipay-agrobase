import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId') || ''

    const where: Record<string, unknown> = {}
    if (farmId) where.farmId = farmId

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
    const body = await request.json()
    const { points } = body

    if (!Array.isArray(points) || points.length === 0) {
      return NextResponse.json({ error: 'points array is required' }, { status: 400 })
    }

    const created = await db.$transaction(
      points.map((p: { farmId: string; pointOrder: number; latitude: number; longitude: number; altitude?: number }) =>
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