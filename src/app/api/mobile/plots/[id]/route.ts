import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { PlotEngine } from '@/lib/plots/engine'

/**
 * Mobile-optimized plot detail.
 * Returns full plot data with boundary GeoJSON (for map rendering).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext(request)
    const { id } = await params

    const plot = await PlotEngine.getById(ctx.tenantId, id)
    if (!plot) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...plot,
      _syncMeta: {
        serverTimestamp: new Date().toISOString(),
        entityType: 'plot',
        entityId: plot.id,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}