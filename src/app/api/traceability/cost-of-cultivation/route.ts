import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { NextResponse } from 'next/server'

// Cost benchmarks per hectare by commodity and country (UGX)
const COST_BENCHMARKS: Record<string, Record<string, {
  landPrep: number; seeds: number; fertilizer: number; pesticide: number
  labor: number; irrigation: number; harvest: number; transport: number
  processing: number; other: number
}>> = {
  Coffee: {
    UG: {
      landPrep: 150000, seeds: 100000, fertilizer: 350000, pesticide: 120000,
      labor: 800000, irrigation: 50000, harvest: 400000, transport: 80000,
      processing: 200000, other: 100000,
    },
    GH: {
      landPrep: 180000, seeds: 120000, fertilizer: 400000, pesticide: 150000,
      labor: 900000, irrigation: 60000, harvest: 450000, transport: 100000,
      processing: 250000, other: 120000,
    },
  },
  Cocoa: {
    UG: {
      landPrep: 120000, seeds: 80000, fertilizer: 250000, pesticide: 100000,
      labor: 600000, irrigation: 40000, harvest: 350000, transport: 70000,
      processing: 180000, other: 80000,
    },
  },
  Vanilla: {
    UG: {
      landPrep: 200000, seeds: 500000, fertilizer: 200000, pesticide: 150000,
      labor: 1200000, irrigation: 80000, harvest: 600000, transport: 100000,
      processing: 400000, other: 150000,
    },
  },
  Maize: {
    UG: {
      landPrep: 100000, seeds: 80000, fertilizer: 200000, pesticide: 60000,
      labor: 300000, irrigation: 30000, harvest: 150000, transport: 50000,
      processing: 50000, other: 50000,
    },
  },
}

// Price benchmarks per kg (UGX)
const PRICE_BENCHMARKS: Record<string, number> = {
  Coffee: 8000,
  Cocoa: 12000,
  Vanilla: 200000,
  Maize: 1500,
  Sesame: 5000,
  Tea: 4000,
  Cotton: 3500,
}

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const tenantFilter = buildTenantFilter(ctx)
    const { searchParams } = new URL(request.url)

    const farmerId = searchParams.get('farmerId')
    const commodity = searchParams.get('commodity')
    const status = searchParams.get('status')
    const season = searchParams.get('season')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { ...tenantFilter }
    if (farmerId) where.farmerId = farmerId
    if (commodity) where.commodity = commodity
    if (status) where.status = status
    if (season) where.season = season

    const [data, total] = await Promise.all([
      db.costOfCultivation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.costOfCultivation.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Cost of cultivation list error:', error)
    return NextResponse.json({ error: 'Failed to fetch cost records' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const tenantFilter = buildTenantFilter(ctx)
    const body = await request.json()
    const { farmerId, farmId, commodity, country, areaHectares, season, inputs } = body

    if (!commodity || !country || !areaHectares) {
      return NextResponse.json({ error: 'commodity, country, and areaHectares are required' }, { status: 400 })
    }

    // Verify farmer access if provided
    if (farmerId) {
      const farmer = await db.farmerProfile.findFirst({
        where: { id: farmerId, ...tenantFilter },
      })
      if (!farmer) {
        return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
      }
    }

    // Get benchmarks for this commodity/country
    const countryCode = country.toUpperCase() === 'UGANDA' ? 'UG' : country.toUpperCase()
    const commodityCosts = COST_BENCHMARKS[commodity]
    const benchmark = commodityCosts?.[countryCode] || commodityCosts?.[Object.keys(commodityCosts || {})[0]] || null

    // Use provided inputs or fallback to benchmarks
    const inp = inputs || {}
    const costBreakdown: Record<string, number> = {
      landPreparation: inp.landPrep ?? benchmark?.landPrep ?? 100000,
      seeds: inp.seeds ?? benchmark?.seeds ?? 100000,
      fertilizer: inp.fertilizer ?? benchmark?.fertilizer ?? 200000,
      pesticide: inp.pesticide ?? benchmark?.pesticide ?? 100000,
      labor: inp.labor ?? benchmark?.labor ?? 500000,
      irrigation: inp.irrigation ?? benchmark?.irrigation ?? 50000,
      harvesting: inp.harvest ?? benchmark?.harvest ?? 300000,
      transport: inp.transport ?? benchmark?.transport ?? 80000,
      processing: inp.processing ?? benchmark?.processing ?? 200000,
      other: inp.other ?? benchmark?.other ?? 100000,
    }

    const totalCost = Object.values(costBreakdown).reduce((a, b) => a + b, 0)

    // Yield and revenue estimation
    const yieldPerHectare = inp.expectedYieldKgPerHa || {
      Coffee: 1200, Cocoa: 600, Vanilla: 80, Maize: 3000, Sesame: 800, Tea: 2500, Cotton: 1500,
    }[commodity] || 1000

    const expectedYield = yieldPerHectare * areaHectares
    const pricePerKg = inp.pricePerKg || PRICE_BENCHMARKS[commodity] || 5000
    const expectedRevenue = expectedYield * pricePerKg

    const record = await db.costOfCultivation.create({
      data: {
        tenantId: ctx.tenantId,
        farmerId: farmerId || null,
        farmId: farmId || null,
        commodity,
        country,
        areaHectares,
        season: season || null,
        costBreakdown: JSON.stringify(costBreakdown),
        totalCost: Math.round(totalCost),
        expectedYield: Math.round(expectedYield),
        expectedRevenue: Math.round(expectedRevenue),
        status: 'ESTIMATED',
      },
    })

    return NextResponse.json({
      ...record,
      costBreakdown: JSON.parse(record.costBreakdown),
      revenueProjection: {
        expectedYield: Math.round(expectedYield),
        pricePerKg,
        expectedRevenue: Math.round(expectedRevenue),
        grossMargin: Math.round(expectedRevenue - totalCost),
        roi: Math.round(((expectedRevenue - totalCost) / totalCost) * 100 * 100) / 100,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Cost of cultivation create error:', error)
    return NextResponse.json({ error: 'Failed to calculate cost of cultivation' }, { status: 500 })
  }
}