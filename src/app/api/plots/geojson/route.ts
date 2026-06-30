import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { db } from '@/lib/db'

/**
 * GET /api/plots/geojson
 *   Returns a GeoJSON FeatureCollection of plot boundaries.
 *   If no Plot records have boundaryGeoJson, falls back to FarmLand polygons
 *   (built from FarmPolygon points) so the map view is never empty.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const { searchParams } = new URL(request.url)

    const tenantFilter = buildTenantFilter(ctx, 'tenantId')
    const where: Record<string, unknown> = {
      ...tenantFilter,
      boundaryGeoJson: { not: null },
    }

    const verificationStatus = searchParams.get('verificationStatus')
    if (verificationStatus) where.verificationStatus = verificationStatus

    const eudrRiskLevel = searchParams.get('eudrRiskLevel')
    if (eudrRiskLevel) where.eudrRiskLevel = eudrRiskLevel

    const farmerId = searchParams.get('farmerId')
    if (farmerId) where.farmerId = farmerId

    const plots = await db.plot.findMany({
      where,
      select: {
        id: true, plotCode: true, name: true, boundaryGeoJson: true,
        verificationStatus: true, eudrRiskLevel: true, areaHectares: true,
        farmer: { select: { firstName: true, lastName: true } },
      },
    })

    const features = plots.map(p => {
      let geometry: any = null
      try {
        const geo = JSON.parse(p.boundaryGeoJson!)
        geometry = geo.geometry || geo
      } catch {
        geometry = null
      }
      return {
        type: 'Feature',
        geometry,
        properties: {
          id: p.id,
          plotCode: p.plotCode,
          name: p.name,
          verificationStatus: p.verificationStatus,
          eudrRiskLevel: p.eudrRiskLevel,
          areaHectares: p.areaHectares,
          farmerName: p.farmer ? `${p.farmer.firstName} ${p.farmer.lastName}` : 'Unassigned',
          source: 'plot',
        },
      }
    }).filter(f => f.geometry !== null)

    // ─── Fallback: include FarmLand polygons if no Plot GeoJSON ───
    if (features.length === 0) {
      const farmLands = await db.farmLand.findMany({
        where: {
          farmer: { ...tenantFilter },
          polygonPoints: { some: {} },
        },
        include: {
          farmer: { select: { firstName: true, lastName: true } },
          polygonPoints: { orderBy: { pointOrder: 'asc' } },
        },
        take: 200,
      })

      for (const fl of farmLands) {
        const pts = fl.polygonPoints
        if (pts.length < 3) continue
        const coordinates = [pts.map(p => [p.longitude, p.latitude])]
        features.push({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates },
          properties: {
            id: fl.id,
            plotCode: fl.name,
            name: fl.name,
            verificationStatus: 'GPS_VERIFIED',
            eudrRiskLevel: 'UNKNOWN',
            areaHectares: fl.sizeHectares,
            farmerName: fl.farmer ? `${fl.farmer.firstName} ${fl.farmer.lastName}` : 'Unassigned',
            source: 'farm-land',
          },
        })
      }
    }

    return NextResponse.json({ type: 'FeatureCollection', features })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
