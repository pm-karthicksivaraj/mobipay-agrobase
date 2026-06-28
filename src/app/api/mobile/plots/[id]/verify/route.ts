import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { PlotEngine } from '@/lib/plots/engine'

/**
 * Mobile plot verification endpoint.
 * Field agents use this after GPS walk-around or drone survey.
 * Supports attaching evidence photos (as URLs from upload).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext(request)
    const { id } = await params
    const body = await request.json()

    if (!body.verificationType) {
      return NextResponse.json({ error: 'verificationType is required (GPS, SATELLITE, DRONE, FIELD_AUDIT)' }, { status: 400 })
    }

    const result = await PlotEngine.verify(ctx.tenantId, id, ctx.userId, {
      verificationType: body.verificationType,
      result: body.result ?? 'PASSED',
      evidence: body.evidence,  // JSON string with photo URLs, notes
      boundaryMatchPercent: body.boundaryMatchPercent,
      accuracyMeters: body.accuracyMeters,
      deforestCheckResult: body.deforestCheckResult,
      notes: body.notes,
    })

    if (!result) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
    }

    return NextResponse.json({
      plot: result.plot,
      verification: result.verification,
      _syncMeta: {
        serverTimestamp: new Date().toISOString(),
        entityType: 'plot_verification',
        entityId: result.verification.id,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}