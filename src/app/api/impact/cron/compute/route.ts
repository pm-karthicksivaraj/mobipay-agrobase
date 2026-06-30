import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { computeAllKpisForFarmer } from '@/lib/impact/kpi-definitions'
import { computeAndPersistClimateScore } from '@/lib/impact/climate-score'
import { KPI_DEFINITIONS } from '@/lib/impact/kpi-definitions'

/**
 * POST /api/impact/cron/compute
 *
 * Nightly cron job that:
 *   1. Computes all 32 KPI snapshots for every active farmer in the period
 *   2. Computes the climate resilience score for every active farmer
 *
 * Auth: callable by cron via a shared secret header, or by SUPER_ADMIN.
 *       In production, set IMPACT_CRON_SECRET env var and pass it as
 *       `x-cron-secret` header.
 *
 * Query params:
 *   period (default: current month YYYY-MM)
 *   farmerId (optional — limit to one farmer, for testing)
 *   limit (default: 500 — max farmers per run)
 */
export async function POST(request: Request) {
  try {
    // Auth: either cron secret or super admin
    const cronSecret = process.env.IMPACT_CRON_SECRET
    if (cronSecret) {
      const provided = request.headers.get('x-cron-secret')
      if (provided !== cronSecret) {
        return NextResponse.json({ error: 'Invalid cron secret' }, { status: 401 })
      }
    } else {
      // No secret configured — require super admin
      const { getTenantContext } = await import('@/lib/tenant')
      const ctx = await getTenantContext()
      if (!ctx.isSuperAdmin) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7)
    const farmerId = searchParams.get('farmerId')
    const limit = parseInt(searchParams.get('limit') || '500')

    // Fetch farmers to process
    const farmers = farmerId
      ? await db.farmerProfile.findMany({ where: { id: farmerId, status: 'ACTIVE' }, select: { id: true, tenantId: true } })
      : await db.farmerProfile.findMany({ where: { status: 'ACTIVE' }, select: { id: true, tenantId: true }, take: limit })

    const results = {
      period,
      farmersProcessed: 0,
      kpisComputed: 0,
      climateScoresComputed: 0,
      errors: [] as string[],
    }

    for (const farmer of farmers) {
      try {
        // 1. Compute all KPI snapshots
        const kpiResults = await computeAllKpisForFarmer(farmer.id, period)
        // Delete existing snapshots for this farmer+period and re-insert
        await db.impactKpiSnapshot.deleteMany({ where: { farmerId: farmer.id, period } })
        if (kpiResults.length > 0) {
          await db.impactKpiSnapshot.createMany({
            data: kpiResults.map(r => ({
              tenantId: farmer.tenantId,
              farmerId: farmer.id,
              kpiCode: r.kpiCode,
              pillar: r.pillar,
              value: r.computation.value,
              unit: KPI_DEFINITIONS.find(d => d.code === r.kpiCode)?.unit ?? '',
              period,
              attributionMethod: r.computation.attributionMethod,
              baselineValue: r.computation.baseline,
            })),
            skipDuplicates: true,
          })
          results.kpisComputed += kpiResults.length
        }

        // 2. Compute climate resilience score
        await computeAndPersistClimateScore(farmer.tenantId, farmer.id, period)
        results.climateScoresComputed += 1
        results.farmersProcessed += 1
      } catch (err) {
        results.errors.push(`Farmer ${farmer.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Impact cron error:', error)
    return NextResponse.json(
      { error: 'Cron failed', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

/**
 * GET /api/impact/cron/compute
 *   Two modes:
 *   1. With Vercel Cron auth (Authorization: Bearer <CRON_SECRET>) → triggers computation
 *   2. Without auth → returns status only (for monitoring dashboards)
 *
 * Vercel Cron sends a GET request with `Authorization: Bearer <CRON_SECRET>`.
 * The CRON_SECRET env var is automatically set by Vercel when you enable crons.
 */
export async function GET(request: Request) {
  // Check if this is a Vercel Cron invocation
  const authHeader = request.headers.get('authorization') || ''
  const vercelCronHeader = request.headers.get('x-vercel-cron')
  const isVercelCron = vercelCronHeader === '1' || authHeader.startsWith('Bearer ')

  if (isVercelCron) {
    // Verify the Vercel CRON_SECRET
    const cronSecret = process.env.CRON_SECRET || process.env.IMPACT_CRON_SECRET
    if (cronSecret) {
      const provided = authHeader.replace('Bearer ', '')
      if (provided !== cronSecret) {
        return NextResponse.json({ error: 'Invalid cron secret' }, { status: 401 })
      }
    }

    // Trigger the computation (same as POST)
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7)
    const limit = parseInt(searchParams.get('limit') || '100') // lower default for serverless

    const farmers = await db.farmerProfile.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, tenantId: true },
      take: limit,
    })

    const results = {
      period,
      farmersProcessed: 0,
      kpisComputed: 0,
      climateScoresComputed: 0,
      errors: [] as string[],
    }

    for (const farmer of farmers) {
      try {
        const kpiResults = await computeAllKpisForFarmer(farmer.id, period)
        await db.impactKpiSnapshot.deleteMany({ where: { farmerId: farmer.id, period } })
        if (kpiResults.length > 0) {
          await db.impactKpiSnapshot.createMany({
            data: kpiResults.map(r => ({
              tenantId: farmer.tenantId,
              farmerId: farmer.id,
              kpiCode: r.kpiCode,
              pillar: r.pillar,
              value: r.computation.value,
              unit: KPI_DEFINITIONS.find(d => d.code === r.kpiCode)?.unit ?? '',
              period,
              attributionMethod: r.computation.attributionMethod,
              baselineValue: r.computation.baseline,
            })),
            skipDuplicates: true,
          })
          results.kpisComputed += kpiResults.length
        }
        await computeAndPersistClimateScore(farmer.tenantId, farmer.id, period)
        results.climateScoresComputed += 1
        results.farmersProcessed += 1
      } catch (err) {
        results.errors.push(`Farmer ${farmer.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return NextResponse.json(results)
  }

  // Status-only mode (no auth)
  const period = new Date().toISOString().slice(0, 7)
  const [snapshotCount, climateScoreCount, farmerCount] = await Promise.all([
    db.impactKpiSnapshot.count({ where: { period } }),
    db.climateResilienceScore.count({ where: { period } }),
    db.farmerProfile.count({ where: { status: 'ACTIVE' } }),
  ])

  return NextResponse.json({
    period,
    farmerCount,
    snapshotsComputed: snapshotCount,
    climateScoresComputed: climateScoreCount,
    coverage: farmerCount > 0 ? Math.round((climateScoreCount / farmerCount) * 100) : 0,
  })
}
