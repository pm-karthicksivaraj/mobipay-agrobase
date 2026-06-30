import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { KPI_DEFINITIONS, PILLAR_META, type ImpactPillar } from '@/lib/impact/kpi-definitions'

/**
 * GET /api/impact/dashboard?tier=farmer|cooperative|stakeholder
 *
 * Returns the impact dashboard data for a given tier:
 *   farmer     — single farmer's KPIs + climate score + practice count + passport summary
 *   cooperative — aggregated KPIs across all cooperative members
 *   stakeholder — tenant-wide aggregated impact (IRIS+ aligned, donor-grade)
 *
 * Query params:
 *   tier (default: stakeholder)
 *   farmerId (required for farmer tier)
 *   period (default: current month YYYY-MM)
 */
export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const tier = (searchParams.get('tier') || 'stakeholder') as 'farmer' | 'cooperative' | 'stakeholder'
    const farmerId = searchParams.get('farmerId')
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7)

    if (tier === 'farmer') {
      if (!farmerId) {
        return NextResponse.json({ error: 'farmerId is required for farmer tier' }, { status: 400 })
      }
      const farmer = await db.farmerProfile.findFirst({
        where: { id: farmerId, ...buildTenantFilter(ctx, 'tenantId') },
        select: {
          id: true, firstName: true, lastName: true, farmerCode: true, phone: true, gender: true,
          createdAt: true,
        },
      })
      if (!farmer) {
        return NextResponse.json({ error: 'Farmer not found' }, { status: 404 })
      }

      const [snapshots, climateScore, practices, baseline, passport, eventCount] = await Promise.all([
        db.impactKpiSnapshot.findMany({ where: { farmerId, period } }),
        db.climateResilienceScore.findUnique({ where: { farmerId_period: { farmerId, period } } }),
        db.practiceAdoption.count({ where: { farmerId, verificationStatus: { in: ['VERIFIED', 'PENDING'] } } }),
        db.impactBaseline.findUnique({ where: { farmerId } }),
        db.farmPassport.findUnique({ where: { farmerId } }),
        db.impactEvent.count({ where: { farmerId } }),
      ])

      // Group snapshots by pillar
      const byPillar: Record<string, typeof snapshots> = {}
      for (const s of snapshots) {
        if (!byPillar[s.pillar]) byPillar[s.pillar] = []
        byPillar[s.pillar].push(s)
      }

      return NextResponse.json({
        tier: 'farmer',
        farmer,
        period,
        climateScore,
        practiceCount: practices,
        baseline: baseline ? { ...baseline, baselinePractices: JSON.parse(baseline.baselinePractices) } : null,
        passport: passport ? { passportId: passport.passportId, verificationUrl: passport.verificationUrl, qrCodeUrl: passport.qrCodeUrl } : null,
        impactEventCount: eventCount,
        kpis: Object.fromEntries(
          (Object.keys(PILLAR_META) as ImpactPillar[]).map(pillar => [
            pillar,
            (byPillar[pillar] || []).map(s => ({
              code: s.kpiCode,
              value: s.value,
              unit: s.unit,
              baseline: s.baselineValue,
              definition: KPI_DEFINITIONS.find(d => d.code === s.kpiCode),
            })),
          ]),
        ),
      })
    }

    // cooperative + stakeholder tiers — aggregated across tenant
    const tenantFilter = buildTenantFilter(ctx, 'tenantId')
    const [allSnapshots, farmerCount, totalClimateScores, totalPractices, totalEvents] = await Promise.all([
      db.impactKpiSnapshot.findMany({
        where: { ...tenantFilter, period },
        select: { kpiCode: true, pillar: true, value: true, unit: true, baselineValue: true },
      }),
      db.farmerProfile.count({ where: { ...tenantFilter, status: 'ACTIVE' } }),
      db.climateResilienceScore.count({ where: { ...tenantFilter, period } }),
      db.practiceAdoption.count({ where: { ...tenantFilter, verificationStatus: 'VERIFIED' } }),
      db.impactEvent.count({ where: tenantFilter }),
    ])

    // Aggregate per KPI
    const byKpi: Record<string, { values: number[]; pillar: string; unit: string; baselines: number[] }> = {}
    for (const s of allSnapshots) {
      if (!byKpi[s.kpiCode]) byKpi[s.kpiCode] = { values: [], pillar: s.pillar, unit: s.unit, baselines: [] }
      byKpi[s.kpiCode].values.push(s.value)
      if (s.baselineValue != null) byKpi[s.kpiCode].baselines.push(s.baselineValue)
    }

    const pillarSummary = (Object.keys(PILLAR_META) as ImpactPillar[]).map(pillar => {
      const kpisInPillar = Object.entries(byKpi).filter(([, d]) => d.pillar === pillar)
      const totalKpis = KPI_DEFINITIONS.filter(k => k.pillar === pillar).length
      const computedCount = kpisInPillar.length
      return {
        pillar,
        label: PILLAR_META[pillar].label,
        color: PILLAR_META[pillar].color,
        description: PILLAR_META[pillar].description,
        computedCount,
        totalKpis,
        coverage: totalKpis > 0 ? Math.round((computedCount / totalKpis) * 100) : 0,
      }
    })

    const kpiAverages = Object.entries(byKpi).map(([code, data]) => ({
      code,
      pillar: data.pillar,
      unit: data.unit,
      avg: data.values.length > 0 ? Math.round(data.values.reduce((s, v) => s + v, 0) / data.values.length * 100) / 100 : 0,
      avgBaseline: data.baselines.length > 0 ? Math.round(data.baselines.reduce((s, v) => s + v, 0) / data.baselines.length * 100) / 100 : null,
      sampleCount: data.values.length,
      definition: KPI_DEFINITIONS.find(d => d.code === code),
    }))

    return NextResponse.json({
      tier,
      period,
      tenantStats: {
        farmerCount,
        climateScoreCount: totalClimateScores,
        verifiedPractices: totalPractices,
        impactEvents: totalEvents,
      },
      pillarSummary,
      kpis: kpiAverages,
    })
  } catch (error) {
    console.error('Impact dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to load dashboard', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
