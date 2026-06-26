import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'
import { EudrEngine } from '@/lib/eudr/engine'
import { NextResponse } from 'next/server'

function extractPolygonCoords(geojson: string): Array<{ lat: number; lng: number }> {
  try {
    const parsed = JSON.parse(geojson)
    const coords = parsed?.geometry?.coordinates?.[0] || parsed?.coordinates?.[0] || []
    return coords.map(([lng, lat]: [number, number]) => ({ lat, lng }))
  } catch {
    return []
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const { plotId, plotName, geolocation, areaHectares, polygonPoints } = body

    if (!plotId || !geolocation) {
      return NextResponse.json({ error: 'plotId and geolocation are required' }, { status: 400 })
    }

    const points = polygonPoints || extractPolygonCoords(geolocation)
    if (points.length < 3) {
      return NextResponse.json({ error: 'At least 3 polygon points are required' }, { status: 400 })
    }

    const result = await EudrEngine.assessRisk(plotId, points)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to assess risk'
    console.error('EUDR risk assessment error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()

    // Aggregate risk distribution for tenant
    const records = await db.eudrCompliance.findMany({
      where: {
        farmer: { tenantId: { in: ctx.tenantScope as string[] } },
        riskAssessment: { not: null },
      },
      select: { riskAssessment: true },
    })

    const distribution: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
    for (const r of records) {
      const level = r.riskAssessment as string
      if (level in distribution) {
        distribution[level]++
      }
    }

    // Also include records with null risk assessment as "UNASSESSED"
    const unassessed = await db.eudrCompliance.count({
      where: {
        farmer: { tenantId: { in: ctx.tenantScope as string[] } },
        riskAssessment: null,
      },
    })

    return NextResponse.json({
      ...distribution,
      UNASSESSED: unassessed,
      total: Object.values(distribution).reduce((a, b) => a + b, 0) + unassessed,
    })
  } catch (error) {
    console.error('EUDR risk distribution error:', error)
    return NextResponse.json({ error: 'Failed to fetch risk distribution' }, { status: 500 })
  }
}