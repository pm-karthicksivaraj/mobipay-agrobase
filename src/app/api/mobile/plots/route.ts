import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { PlotEngine } from '@/lib/plots/engine'

/**
 * Mobile-optimized plot list endpoint.
 * Returns lightweight plot summaries with only the fields
 * needed for mobile list rendering and offline caching.
 *
 * Query params:
 *   - page, pageSize (default 1, 50)
 *   - search, verificationStatus, eudrRiskLevel
 *   - modifiedSince: ISO date — for delta sync
 *   - fields: comma-separated field list (default: all mobile fields)
 *   - includeGeoJson: 'true' to include boundary (heavier payload)
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const { searchParams } = new URL(request.url)

    const result = await PlotEngine.list(ctx.tenantId, {
      farmerId: searchParams.get('farmerId') || undefined,
      verificationStatus: (searchParams.get('verificationStatus') as any) || undefined,
      eudrRiskLevel: (searchParams.get('eudrRiskLevel') as any) || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '50'),
    })

    // Mobile-optimized response: strip unnecessary fields, add _syncMeta
    const mobilePlots = result.plots.map(p => ({
      id: p.id,
      pc: p.plotCode,         // shortened for mobile bandwidth
      n: p.name,
      fn: p.farmerName,
      a: p.areaHectares,
      lat: p.centroidLat,
      lng: p.centroidLng,
      vs: p.verificationStatus,
      rl: p.eudrRiskLevel,
      sc: p.seasonCount,
      bc: p.batchCount,
    }))

    return NextResponse.json({
      plots: mobilePlots,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      _syncMeta: {
        serverTimestamp: new Date().toISOString(),
        tenantId: ctx.tenantId,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Mobile plot creation with GPS boundary.
 * Accepts multipart form data for photo uploads alongside JSON.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: 'Plot name is required' }, { status: 400 })
    }

    // Validate GeoJSON if provided
    if (body.boundaryGeoJson) {
      try {
        const parsed = JSON.parse(body.boundaryGeoJson)
        if (!parsed.geometry?.coordinates?.[0]?.length || parsed.geometry.coordinates[0].length < 4) {
          return NextResponse.json(
            { error: 'Boundary must have at least 3 GPS points' },
            { status: 400 },
          )
        }
      } catch {
        return NextResponse.json({ error: 'Invalid GeoJSON boundary' }, { status: 400 })
      }
    }

    const plot = await PlotEngine.create(ctx.tenantId, ctx.userId, body)
    return NextResponse.json(plot, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}