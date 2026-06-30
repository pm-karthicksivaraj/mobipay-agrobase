import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { appendImpactEvent } from '@/lib/impact/hash-chain'

/**
 * POST /api/impact/baseline — Capture a farmer's impact baseline at enrolment.
 * GET  /api/impact/baseline?farmerId=xxx — Fetch a farmer's baseline.
 *
 * The baseline is the comparison anchor for all future impact measurement.
 * Idempotent: if a baseline already exists for the farmer, it's updated.
 * Also appends a BASELINE_CAPTURED event to the impact ledger.
 */
export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const {
      farmerId, baselineIncomeUsd, baselineYieldKgHa, baselineCrop,
      baselinePractices, plotCountBaseline, totalAreaHectares, householdSize,
      womenInLeadership, hasBankAccount, hasMobileMoney, savingsBalanceUsd,
      outstandingLoanUsd, climateRiskExposure, deforestationRisk, notes,
    } = body as Record<string, unknown>

    if (!farmerId) {
      return NextResponse.json({ error: 'farmerId is required' }, { status: 400 })
    }

    const farmer = await db.farmerProfile.findFirst({
      where: { id: farmerId as string, ...buildTenantFilter(ctx, 'tenantId') },
      select: { id: true, firstName: true, lastName: true },
    })
    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
    }

    const practicesArray = Array.isArray(baselinePractices) ? baselinePractices : []

    const baseline = await db.impactBaseline.upsert({
      where: { farmerId: farmerId as string },
      update: {
        baselineIncomeUsd: baselineIncomeUsd as number | null,
        baselineYieldKgHa: baselineYieldKgHa as number | null,
        baselineCrop: baselineCrop as string | null,
        baselinePractices: JSON.stringify(practicesArray),
        practiceCountBaseline: practicesArray.length,
        plotCountBaseline: (plotCountBaseline as number) ?? 0,
        totalAreaHectares: totalAreaHectares as number | null,
        householdSize: householdSize as number | null,
        womenInLeadership: womenInLeadership as boolean,
        hasBankAccount: hasBankAccount as boolean,
        hasMobileMoney: hasMobileMoney as boolean,
        savingsBalanceUsd: savingsBalanceUsd as number | null,
        outstandingLoanUsd: outstandingLoanUsd as number | null,
        climateRiskExposure: climateRiskExposure as string | null,
        deforestationRisk: deforestationRisk as boolean,
        notes: notes as string | null,
        capturedBy: ctx.userId,
      },
      create: {
        tenantId: ctx.tenantId,
        farmerId: farmerId as string,
        capturedBy: ctx.userId,
        captureMethod: 'FLUTTER_FORM',
        baselineIncomeUsd: baselineIncomeUsd as number | null,
        baselineYieldKgHa: baselineYieldKgHa as number | null,
        baselineCrop: baselineCrop as string | null,
        baselinePractices: JSON.stringify(practicesArray),
        practiceCountBaseline: practicesArray.length,
        plotCountBaseline: (plotCountBaseline as number) ?? 0,
        totalAreaHectares: totalAreaHectares as number | null,
        householdSize: householdSize as number | null,
        womenInLeadership: womenInLeadership as boolean,
        hasBankAccount: hasBankAccount as boolean,
        hasMobileMoney: hasMobileMoney as boolean,
        savingsBalanceUsd: savingsBalanceUsd as number | null,
        outstandingLoanUsd: outstandingLoanUsd as number | null,
        climateRiskExposure: climateRiskExposure as string | null,
        deforestationRisk: deforestationRisk as boolean,
        notes: notes as string | null,
      },
    })

    await appendImpactEvent({
      tenantId: ctx.tenantId,
      farmerId: farmerId as string,
      eventType: 'BASELINE_CAPTURED',
      eventData: {
        baselineIncomeUsd,
        baselineYieldKgHa,
        baselineCrop,
        practiceCount: practicesArray.length,
        capturedBy: ctx.userId,
      },
      actorId: ctx.userId,
      actorName: ctx.userId,
      actorType: 'EXTENSION_OFFICER',
    })

    return NextResponse.json({ baseline }, { status: 201 })
  } catch (error) {
    console.error('Impact baseline capture error:', error)
    return NextResponse.json(
      { error: 'Failed to capture baseline', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const farmerId = searchParams.get('farmerId')

    if (!farmerId) {
      return NextResponse.json({ error: 'farmerId is required' }, { status: 400 })
    }

    const farmer = await db.farmerProfile.findFirst({
      where: { id: farmerId, ...buildTenantFilter(ctx, 'tenantId') },
      select: { id: true },
    })
    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
    }

    const baseline = await db.impactBaseline.findUnique({
      where: { farmerId },
      include: {
        farmer: { select: { firstName: true, lastName: true, farmerCode: true, phone: true } },
      },
    })

    if (!baseline) {
      return NextResponse.json({ error: 'Baseline not yet captured' }, { status: 404 })
    }

    return NextResponse.json({
      baseline: { ...baseline, baselinePractices: JSON.parse(baseline.baselinePractices) },
    })
  } catch (error) {
    console.error('Impact baseline fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch baseline' }, { status: 500 })
  }
}
