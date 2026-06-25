import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { NextResponse } from 'next/server'

// EU CBAM carbon price tiers (placeholder — will be updated from external source)
const EU_CARBON_PRICE_PER_TONNE = 75 // EUR/tCO2 as of 2026

// Embedded emission factors by commodity (tCO2e per tonne of product)
const EMISSION_FACTORS: Record<string, { default: number; organic: number; uganda: number }> = {
  Coffee: { default: 1.8, organic: 1.2, uganda: 2.1 },
  Cocoa: { default: 2.5, organic: 1.8, uganda: 2.8 },
  Tea: { default: 1.2, organic: 0.9, uganda: 1.4 },
  Vanilla: { default: 3.2, organic: 2.5, uganda: 3.5 },
  Sesame: { default: 0.8, organic: 0.6, uganda: 0.9 },
  Cotton: { default: 4.5, organic: 3.0, uganda: 5.0 },
}

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const tenantFilter = buildTenantFilter(ctx)
    const { searchParams } = new URL(request.url)

    const period = searchParams.get('period')
    const commodity = searchParams.get('commodity')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { ...tenantFilter }
    if (period) where.reportingPeriod = period
    if (commodity) where.commodity = commodity
    if (status) where.status = status

    const [data, total] = await Promise.all([
      db.cbamCalculation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { cbamReport: { select: { id: true, reportingPeriod: true, status: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.cbamCalculation.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('CBAM calculation list error:', error)
    return NextResponse.json({ error: 'Failed to fetch CBAM calculations' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const { commodity, originCountry, quantityTonnes, reportingPeriod, certificationType, cbamReportId, carbonCredits } = body

    if (!commodity || !originCountry || !quantityTonnes || !reportingPeriod) {
      return NextResponse.json(
        { error: 'commodity, originCountry, quantityTonnes, and reportingPeriod are required' },
        { status: 400 },
      )
    }

    // TODO: Wire to CarbonEngine.calculateCBAM()
    // Calculate embedded emissions
    const factors = EMISSION_FACTORS[commodity] || { default: 2.0, organic: 1.5, uganda: 2.2 }
    const isOrganic = certificationType?.toLowerCase() === 'organic'
    const isUganda = originCountry.toUpperCase() === 'UG' || originCountry.toLowerCase() === 'uganda'

    let embeddedEmissionsPerTonne = factors.default
    if (isOrganic) embeddedEmissionsPerTonne = factors.organic
    if (isUganda) embeddedEmissionsPerTonne = factors.uganda

    const totalEmbeddedEmissions = embeddedEmissionsPerTonne * quantityTonnes
    const cbamCertificateCost = totalEmbeddedEmissions * EU_CARBON_PRICE_PER_TONNE
    const carbonCreditsApplied = carbonCredits || 0
    const netCost = Math.max(0, cbamCertificateCost - (carbonCreditsApplied * EU_CARBON_PRICE_PER_TONNE))

    const calculation = await db.cbamCalculation.create({
      data: {
        tenantId: ctx.tenantId,
        cbamReportId: cbamReportId || null,
        commodity,
        originCountry,
        quantityTonnes,
        embeddedEmissionsPerTonne: Math.round(embeddedEmissionsPerTonne * 1000) / 1000,
        totalEmbeddedEmissions: Math.round(totalEmbeddedEmissions * 100) / 100,
        euCarbonPrice: EU_CARBON_PRICE_PER_TONNE,
        cbamCertificateCost: Math.round(cbamCertificateCost * 100) / 100,
        carbonCreditsApplied,
        netCost: Math.round(netCost * 100) / 100,
        reportingPeriod,
        status: 'DRAFT',
      },
      include: { cbamReport: true },
    })

    return NextResponse.json(calculation, { status: 201 })
  } catch (error) {
    console.error('CBAM calculation create error:', error)
    return NextResponse.json({ error: 'Failed to calculate CBAM' }, { status: 500 })
  }
}