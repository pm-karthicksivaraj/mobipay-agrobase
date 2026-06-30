import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { computeAndPersistClimateScore, gatherClimateScoreInputs, calculateClimateScore } from '@/lib/impact/climate-score'
import { db } from '@/lib/db'

/**
 * GET /api/credit-score/[farmerId]
 *   Get the climate resilience score for a farmer.
 *
 *   Query params:
 *     period (default: current month YYYY-MM)
 *     compute (default: false) — if true, recompute on-the-fly
 *
 * Returns the 4-factor score (0-100), risk category, and trend.
 * This is the score Equity Bank / Good Grade Microfinance use for underwriting.
 *
 * Auth: MFI officers + admins. Farmer can view their own.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ farmerId: string }> },
) {
  try {
    const ctx = await getTenantContext()
    const { farmerId } = await params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7)
    const shouldCompute = searchParams.get('compute') === 'true'

    // Verify the farmer belongs to the tenant
    const farmer = await db.farmerProfile.findFirst({
      where: { id: farmerId, ...buildTenantFilter(ctx, 'tenantId') },
      select: {
        id: true, firstName: true, lastName: true, farmerCode: true, phone: true,
        tenantId: true,
      },
    })
    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
    }

    let score = await db.climateResilienceScore.findUnique({
      where: { farmerId_period: { farmerId, period } },
    })

    // Recompute on demand or if no score exists
    if (shouldCompute || !score) {
      const result = await computeAndPersistClimateScore(farmer.tenantId, farmerId, period)
      score = await db.climateResilienceScore.findUnique({
        where: { farmerId_period: { farmerId, period } },
      })
      return NextResponse.json({
        farmer: { id: farmer.id, name: `${farmer.firstName} ${farmer.lastName}`, code: farmer.farmerCode },
        period,
        score,
        computed: result,
      })
    }

    // Return existing score
    const inputs = score.inputs ? JSON.parse(score.inputs) : null
    return NextResponse.json({
      farmer: { id: farmer.id, name: `${farmer.firstName} ${farmer.lastName}`, code: farmer.farmerCode },
      period,
      score: {
        ...score,
        inputs,
      },
    })
  } catch (error) {
    console.error('Climate score fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch score', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

/**
 * POST /api/credit-score/[farmerId]
 *   Force recompute the climate resilience score.
 *   Admin only.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ farmerId: string }> },
) {
  try {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin && ctx.role !== 'COUNTRY_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { farmerId } = await params
    const body = await request.json().catch(() => ({}))
    const period = (body as { period?: string })?.period || new Date().toISOString().slice(0, 7)

    const farmer = await db.farmerProfile.findFirst({
      where: { id: farmerId, ...buildTenantFilter(ctx, 'tenantId') },
      select: { id: true, tenantId: true },
    })
    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
    }

    const result = await computeAndPersistClimateScore(farmer.tenantId, farmerId, period)
    return NextResponse.json({ recomputed: true, period, result })
  } catch (error) {
    console.error('Climate score recompute error:', error)
    return NextResponse.json({ error: 'Failed to recompute' }, { status: 500 })
  }
}
