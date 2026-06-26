import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const tenantFilter = buildTenantFilter(ctx)
    const { searchParams } = new URL(request.url)

    const farmId = searchParams.get('farmId')
    const months = parseInt(searchParams.get('months') || '12')

    if (!farmId) {
      return NextResponse.json({ error: 'farmId is required' }, { status: 400 })
    }

    // Verify farm access
    const farm = await db.farmLand.findFirst({
      where: { id: farmId, ...tenantFilter },
    })
    if (!farm) {
      return NextResponse.json({ error: 'Farm not found or access denied' }, { status: 404 })
    }

    // Try to fetch from DB first
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - months)

    const dbRecords = await db.ndvTimeSeries.findMany({
      where: {
        farmId,
        ...tenantFilter,
        date: { gte: cutoffDate.toISOString().split('T')[0] },
      },
      orderBy: { date: 'asc' },
    })

    // If we have DB data, return it
    if (dbRecords.length > 0) {
      const points = dbRecords.map((r) => ({
        date: r.date,
        ndvi: r.ndviValue,
        evi: r.eviValue,
      }))

      const ndviValues = points.map((p) => p.ndvi)
      const trend = ndviValues.length >= 6
        ? (ndviValues.slice(-3).reduce((a, b) => a + b, 0) / 3 > ndviValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3 ? 'IMPROVING' : 'DECLINING')
        : 'INSUFFICIENT_DATA'

      return NextResponse.json({
        farmId,
        points,
        trend,
        average: ndviValues.reduce((a, b) => a + b, 0) / ndviValues.length,
        min: Math.min(...ndviValues),
        max: Math.max(...ndviValues),
      })
    }

    // TODO: Wire to SatelliteEngine.getNdviTimeSeries()
    // Return placeholder mock data
    const points: { date: string; ndvi: number; evi: number }[] = []
    const now = new Date()
    for (let i = months; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - i)
      const monthProgress = d.getMonth() / 12
      const ndvi = 0.4 + 0.3 * Math.sin(monthProgress * Math.PI * 2) + (Math.random() * 0.1 - 0.05)
      points.push({
        date: d.toISOString().split('T')[0],
        ndvi: Math.round(ndvi * 1000) / 1000,
        evi: Math.round((ndvi * 0.85) * 1000) / 1000,
      })
    }

    const ndviValues = points.map((p) => p.ndvi)
    return NextResponse.json({
      farmId,
      points,
      trend: 'STABLE',
      average: Math.round((ndviValues.reduce((a, b) => a + b, 0) / ndviValues.length) * 1000) / 1000,
      min: Math.round(Math.min(...ndviValues) * 1000) / 1000,
      max: Math.round(Math.max(...ndviValues) * 1000) / 1000,
    })
  } catch (error) {
    console.error('NDVI timeseries error:', error)
    return NextResponse.json({ error: 'Failed to fetch NDVI data' }, { status: 500 })
  }
}