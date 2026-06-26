import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'
import { CarbonCalculator } from '@/lib/carbon/calculator'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)

    const period = searchParams.get('period')
    const commodity = searchParams.get('commodity')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { tenantId: ctx.tenantId }
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
    const { commodity, originCountry, quantityTonnes, reportingPeriod, cbamReportId, carbonCredits } = body

    if (!commodity || !originCountry || !quantityTonnes || !reportingPeriod) {
      return NextResponse.json(
        { error: 'commodity, originCountry, quantityTonnes, and reportingPeriod are required' },
        { status: 400 },
      )
    }

    // Use CarbonCalculator engine instead of hardcoded factors
    const calculator = new CarbonCalculator().setCountry(originCountry)
    const cbam = await calculator.calculateCBAM(commodity, originCountry, quantityTonnes, reportingPeriod)

    // Apply any additional carbon credits from request body (on top of engine's auto-detected)
    const additionalCredits = carbonCredits || 0
    const totalCreditsApplied = cbam.carbonCreditsApplied + additionalCredits
    const creditsValue = totalCreditsApplied * cbam.euCarbonPrice
    const adjustedNetCost = Math.max(0, cbam.cbamCertificateCost - creditsValue)

    const calculation = await db.cbamCalculation.create({
      data: {
        tenantId: ctx.tenantId,
        cbamReportId: cbamReportId || null,
        commodity,
        originCountry,
        quantityTonnes,
        embeddedEmissionsPerTonne: cbam.embeddedEmissionsTco2PerTonne,
        totalEmbeddedEmissions: cbam.totalEmbeddedEmissions,
        euCarbonPrice: cbam.euCarbonPrice,
        cbamCertificateCost: cbam.cbamCertificateCost,
        carbonCreditsApplied: Math.round(totalCreditsApplied * 1000) / 1000,
        netCost: Math.round(adjustedNetCost * 100) / 100,
        reportingPeriod,
        status: 'DRAFT',
      },
      include: { cbamReport: true },
    })

    return NextResponse.json(calculation, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to calculate CBAM'
    console.error('CBAM calculation create error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}