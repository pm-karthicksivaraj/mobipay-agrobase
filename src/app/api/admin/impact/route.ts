import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { KPI_DEFINITIONS, PILLAR_META, type ImpactPillar } from '@/lib/impact/kpi-definitions'

/**
 * GET /api/admin/impact
 *   Platform-wide impact aggregation across ALL tenants. SUPER_ADMIN only.
 *
 * Returns: 5-pillar summary, KPI averages, top performing tenants,
 * impact event count, climate score distribution.
 */
export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7)

    // ─── All KPI snapshots for this period ───────────────────
    const snapshots = await db.impactKpiSnapshot.findMany({
      where: { period },
      select: {
        kpiCode: true, pillar: true, value: true, unit: true,
        baselineValue: true, farmerId: true, tenantId: true,
      },
    })

    // Aggregate per KPI
    const byKpi: Record<string, { values: number[]; pillar: string; unit: string; baselines: number[]; farmerIds: Set<string> }> = {}
    for (const s of snapshots) {
      if (!byKpi[s.kpiCode]) {
        byKpi[s.kpiCode] = { values: [], pillar: s.pillar, unit: s.unit, baselines: [], farmerIds: new Set() }
      }
      byKpi[s.kpiCode].values.push(s.value)
      if (s.baselineValue != null) byKpi[s.kpiCode].baselines.push(s.baselineValue)
      byKpi[s.kpiCode].farmerIds.add(s.farmerId)
    }

    const kpiAverages = Object.entries(byKpi).map(([code, data]) => {
      const def = KPI_DEFINITIONS.find(d => d.code === code)
      const avg = data.values.length > 0 ? data.values.reduce((s, v) => s + v, 0) / data.values.length : 0
      const avgBaseline = data.baselines.length > 0 ? data.baselines.reduce((s, v) => s + v, 0) / data.baselines.length : null
      return {
        code,
        pillar: data.pillar,
        name: def?.name ?? code,
        unit: data.unit,
        avg: Math.round(avg * 100) / 100,
        avgBaseline: avgBaseline != null ? Math.round(avgBaseline * 100) / 100 : null,
        sampleCount: data.values.length,
        farmerCount: data.farmerIds.size,
        target: def?.target ?? '',
        irisPlus: def?.irisPlus,
      }
    })

    // ─── Pillar summary ──────────────────────────────────────
    const pillarSummary = (Object.keys(PILLAR_META) as ImpactPillar[]).map(pillar => {
      const kpisInPillar = kpiAverages.filter(k => k.pillar === pillar)
      const totalDefined = KPI_DEFINITIONS.filter(k => k.pillar === pillar).length
      return {
        pillar,
        label: PILLAR_META[pillar].label,
        color: PILLAR_META[pillar].color,
        description: PILLAR_META[pillar].description,
        computedCount: kpisInPillar.length,
        totalDefined,
        coverage: totalDefined > 0 ? Math.round((kpisInPillar.length / totalDefined) * 100) : 0,
        farmerCount: kpisInPillar.reduce((max, k) => Math.max(max, k.farmerCount), 0),
      }
    })

    // ─── Climate score distribution ─────────────────────────
    const climateScores = await db.climateResilienceScore.findMany({
      where: { period },
      select: { score: true, riskCategory: true, farmerId: true, tenantId: true },
    })
    const riskDistribution = climateScores.reduce((acc, s) => {
      acc[s.riskCategory] = (acc[s.riskCategory] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const avgScore = climateScores.length > 0
      ? Math.round(climateScores.reduce((s, c) => s + c.score, 0) / climateScores.length)
      : 0

    // ─── Top performing tenants (by climate score avg) ──────
    const tenantIds = [...new Set(climateScores.map(s => s.tenantId))]
    const tenantPerformance: { tenantId: string; avgScore: number; farmerCount: number }[] = []
    for (const tenantId of tenantIds) {
      const tenantScores = climateScores.filter(s => s.tenantId === tenantId)
      if (tenantScores.length > 0) {
        tenantPerformance.push({
          tenantId,
          avgScore: Math.round(tenantScores.reduce((s, c) => s + c.score, 0) / tenantScores.length),
          farmerCount: tenantScores.length,
        })
      }
    }
    // Fetch tenant names
    const tenantNames = await db.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, country: true, type: true },
    })
    const tenantNameMap = new Map(tenantNames.map(t => [t.id, t]))
    const topTenants = tenantPerformance
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10)
      .map(t => ({
        ...t,
        tenant: tenantNameMap.get(t.tenantId),
      }))

    // ─── Impact event + practice totals ─────────────────────
    const [totalEvents, totalPractices, verifiedPractices, totalBaselines] = await Promise.all([
      db.impactEvent.count(),
      db.practiceAdoption.count(),
      db.practiceAdoption.count({ where: { verificationStatus: 'VERIFIED' } }),
      db.impactBaseline.count(),
    ])

    return NextResponse.json({
      period,
      summary: {
        totalKpiSnapshots: snapshots.length,
        farmersWithScores: climateScores.length,
        avgClimateScore: avgScore,
        totalImpactEvents: totalEvents,
        totalPractices,
        verifiedPractices,
        totalBaselines,
      },
      pillarSummary,
      kpis: kpiAverages,
      riskDistribution,
      topTenants,
    })
  } catch (error) {
    console.error('Admin impact error:', error)
    return NextResponse.json({ error: 'Failed to load impact' }, { status: 500 })
  }
}
