import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { computeAllKpisForFarmer, KPI_DEFINITIONS } from '@/lib/impact/kpi-definitions'

/**
 * GET /api/impact/snapshot?farmerId=xxx&period=2026-06
 *   Get the latest KPI snapshot for a farmer.
 *   If no snapshot exists, compute on-the-fly and persist.
 *
 * GET /api/impact/snapshot?period=2026-06 (no farmerId)
 *   Get aggregated KPI snapshot across the whole tenant.
 *
 * POST /api/impact/snapshot
 *   Trigger on-demand recomputation for a farmer (admin/debug).
 *   Body: { farmerId, period }
 */
export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const farmerId = searchParams.get('farmerId')
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7) // default: current month

    if (farmerId) {
      // Per-farmer snapshot
      const farmer = await db.farmerProfile.findFirst({
        where: { id: farmerId, ...buildTenantFilter(ctx, 'tenantId') },
        select: { id: true, firstName: true, lastName: true, farmerCode: true },
      })
      if (!farmer) {
        return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
      }

      // Fetch existing snapshots for this period
      let snapshots = await db.impactKpiSnapshot.findMany({
        where: { farmerId, period },
      })

      // If no snapshots exist for this period, compute on-the-fly
      if (snapshots.length === 0) {
        const results = await computeAllKpisForFarmer(farmerId, period)
        // Persist the computed snapshots
        await db.impactKpiSnapshot.createMany({
          data: results.map(r => ({
            tenantId: ctx.tenantId,
            farmerId,
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
        snapshots = await db.impactKpiSnapshot.findMany({ where: { farmerId, period } })
      }

      return NextResponse.json({
        farmer,
        period,
        kpis: snapshots.map(s => ({
          code: s.kpiCode,
          pillar: s.pillar,
          value: s.value,
          unit: s.unit,
          baseline: s.baselineValue,
          attribution: s.attributionMethod,
          confidence: s.confidenceScore,
          definition: KPI_DEFINITIONS.find(d => d.code === s.kpiCode),
        })),
      })
    }

    // Tenant-wide aggregation
    const allSnapshots = await db.impactKpiSnapshot.findMany({
      where: { ...buildTenantFilter(ctx, 'tenantId'), period },
      select: { kpiCode: true, pillar: true, value: true, unit: true, baselineValue: true },
    })

    // Aggregate: average per KPI code
    const byKpi: Record<string, { values: number[]; pillar: string; unit: string }> = {}
    for (const s of allSnapshots) {
      if (!byKpi[s.kpiCode]) byKpi[s.kpiCode] = { values: [], pillar: s.pillar, unit: s.unit }
      byKpi[s.kpiCode].values.push(s.value)
    }

    const aggregated = Object.entries(byKpi).map(([code, data]) => ({
      code,
      pillar: data.pillar,
      unit: data.unit,
      avg: data.values.length > 0 ? Math.round(data.values.reduce((s, v) => s + v, 0) / data.values.length * 100) / 100 : 0,
      count: data.values.length,
      definition: KPI_DEFINITIONS.find(d => d.code === code),
    }))

    return NextResponse.json({ period, kpis: aggregated, farmerCount: allSnapshots.length > 0 ? new Set(allSnapshots.map(s => s.kpiCode)).size : 0 })
  } catch (error) {
    console.error('Impact snapshot fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch snapshot', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { farmerId, period } = await request.json() as { farmerId?: string; period?: string }

    if (!farmerId || !period) {
      return NextResponse.json({ error: 'farmerId and period are required' }, { status: 400 })
    }

    // Only admins can trigger recomputation
    if (!ctx.isSuperAdmin && ctx.role !== 'COUNTRY_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const farmer = await db.farmerProfile.findFirst({
      where: { id: farmerId, ...buildTenantFilter(ctx, 'tenantId') },
      select: { id: true },
    })
    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
    }

    // Delete existing snapshots for this farmer+period and recompute
    await db.impactKpiSnapshot.deleteMany({ where: { farmerId, period } })
    const results = await computeAllKpisForFarmer(farmerId, period)

    await db.impactKpiSnapshot.createMany({
      data: results.map(r => ({
        tenantId: ctx.tenantId,
        farmerId,
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

    return NextResponse.json({ recomputed: results.length, period, farmerId })
  } catch (error) {
    console.error('Impact snapshot recompute error:', error)
    return NextResponse.json({ error: 'Failed to recompute' }, { status: 500 })
  }
}
