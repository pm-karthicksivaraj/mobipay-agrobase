import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'
import { EudrEngine } from '@/lib/eudr/engine'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const { plotId, polygonPoints, geolocation, farmerLocation } = body

    if (!plotId) {
      return NextResponse.json({ error: 'plotId is required' }, { status: 400 })
    }

    // Extract polygon points from GeoJSON or use direct points
    let points = polygonPoints
    if (!points && geolocation) {
      try {
        const parsed = typeof geolocation === 'string' ? JSON.parse(geolocation) : geolocation
        const coords = parsed?.geometry?.coordinates?.[0] || parsed?.coordinates?.[0] || []
        points = coords.map(([lng, lat]: [number, number]) => ({ lat, lng }))
      } catch {
        return NextResponse.json({ error: 'Invalid geolocation format' }, { status: 400 })
      }
    }

    if (!points || points.length < 3) {
      return NextResponse.json({ error: 'At least 3 polygon points are required' }, { status: 400 })
    }

    // Verify plot belongs to tenant
    const compliance = await db.eudrCompliance.findFirst({
      where: { plotId },
      include: { farmer: { select: { tenantId: true } } },
    })

    if (!compliance) {
      return NextResponse.json({ error: 'Plot not found in EUDR records' }, { status: 404 })
    }

    if (!ctx.isSuperAdmin && compliance.farmer && !ctx.tenantScope.includes(compliance.farmer.tenantId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Run geolocation verification through the engine
    const enrichedPoints = points.map((p: { lat: number; lng: number; altitude?: number }) => ({
      lat: p.lat,
      lng: p.lng,
      altitude: p.altitude,
    }))

    const result = await EudrEngine.verifyGeolocation(plotId, enrichedPoints, farmerLocation)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify geolocation'
    console.error('EUDR geolocation verify error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
