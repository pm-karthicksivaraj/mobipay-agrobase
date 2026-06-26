import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const tenantFilter = buildTenantFilter(ctx)
    const { searchParams } = new URL(request.url)

    const cultivationId = searchParams.get('cultivationId')
    const period = searchParams.get('period')
    const commodity = searchParams.get('commodity')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { ...tenantFilter }

    if (cultivationId) {
      where.cultivationId = cultivationId
    } else if (period) {
      where.createdAt = {
        gte: new Date(period.split('-')[0] + '-01-01'),
        lte: new Date(period.split('-')[0] + '-12-31'),
      }
    }

    if (commodity) where.commodity = commodity

    const [data, total] = await Promise.all([
      db.carbonFootprint.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.carbonFootprint.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Carbon footprint list error:', error)
    return NextResponse.json({ error: 'Failed to fetch carbon footprints' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const { cultivationId, commodity, areaHectares, inputs } = body

    if (!cultivationId || !commodity) {
      return NextResponse.json({ error: 'cultivationId and commodity are required' }, { status: 400 })
    }

    // Verify cultivation access through farm -> tenant
    const cultivation = await db.cultivation.findFirst({
      where: { id: cultivationId },
      include: { farm: { include: { farmer: { select: { tenantId: true } } } } },
    })

    if (!cultivation) {
      return NextResponse.json({ error: 'Cultivation not found' }, { status: 404 })
    }

    if (!ctx.isSuperAdmin && cultivation.farm?.farmer && !ctx.tenantScope.includes(cultivation.farm.farmer.tenantId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // TODO: Wire to CarbonEngine.calculateFootprint()
    // Calculate carbon footprint using IPCC Tier 2 methodology (simplified)
    const inp = inputs || {}
    const breakdown: Record<string, number> = {
      FERTILIZER: ((inp.fertilizerKgN || 50) * 1.57 * 44 / 28) + ((inp.fertilizerKgP || 20) * 0.3),  // N2O from N and P
      FUEL: (inp.fuelLiters || 100) * 2.68,  // Diesel CO2
      PESTICIDE: (inp.pesticideKg || 5) * 5.1,  // Manufacturing emissions
      MACHINERY: (inp.machineryHours || 40) * 2.8,  // Diesel per hour
      IRRIGATION: (inp.irrigationKwh || 0) * 0.45,  // Electricity
      DRYING: (inp.dryingKwh || 200) * 0.45,
      TRANSPORT: (inp.transportKm || 50) * 0.12,  // per km per tonne
      LAND_USE_CHANGE: 0,  // Should be 0 for compliant farms
    }

    const totalEmissionsKgCO2e = Object.values(breakdown).reduce((a, b) => a + b, 0)
    const expectedYieldKg = inp.expectedYieldKg || areaHectares * 1200  // default 1200 kg/ha for coffee
    const emissionsPerKg = totalEmissionsKgCO2e / expectedYieldKg
    const emissionsPerHectare = totalEmissionsKgCO2e / (areaHectares || 1)

    // Crop stage breakdown
    const stages = [
      { stage: 'LAND_PREPARATION', emissions: breakdown.MACHINERY * 0.2 + breakdown.FUEL * 0.1, pct: 0.15 },
      { stage: 'SOWING', emissions: breakdown.MACHINERY * 0.1 + breakdown.PESTICIDE * 0.1, pct: 0.08 },
      { stage: 'GROWING', emissions: breakdown.FERTILIZER * 0.8 + breakdown.PESTICIDE * 0.6 + breakdown.IRRIGATION, pct: 0.55 },
      { stage: 'HARVESTING', emissions: breakdown.MACHINERY * 0.5 + breakdown.FUEL * 0.4, pct: 0.12 },
      { stage: 'POST_HARVEST', emissions: breakdown.DRYING + breakdown.TRANSPORT, pct: 0.10 },
    ]

    const footprint = await db.carbonFootprint.create({
      data: {
        tenantId: ctx.tenantId,
        cultivationId,
        commodity,
        totalEmissionsKgCO2e: Math.round(totalEmissionsKgCO2e * 100) / 100,
        emissionsPerKg: Math.round(emissionsPerKg * 1000) / 1000,
        emissionsPerHectare: Math.round(emissionsPerHectare * 100) / 100,
        breakdown: JSON.stringify(breakdown),
        stages: JSON.stringify(stages),
        calculationMethod: 'IPCC_TIER2',
        verificationStatus: 'DRAFT',
      },
    })

    return NextResponse.json(footprint, { status: 201 })
  } catch (error) {
    console.error('Carbon footprint create error:', error)
    return NextResponse.json({ error: 'Failed to calculate carbon footprint' }, { status: 500 })
  }
}