import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { generateCBAMReport, validateCBAMSubmission } from '@/lib/carbon/reporting'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status') || ''
    const period = searchParams.get('period') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Special: generate report inline
    if (searchParams.get('action') === 'generate') {
      const reportPeriod = searchParams.get('period')
      if (!reportPeriod) {
        return NextResponse.json({ error: 'period is required for action=generate' }, { status: 400 })
      }
      const report = await generateCBAMReport(ctx.tenantId, reportPeriod)
      return NextResponse.json(report)
    }

    const where: Record<string, unknown> = { tenantId: ctx.tenantId }
    if (status) where.status = status
    if (period) where.reportingPeriod = period

    const [data, total] = await Promise.all([
      db.cbamReport.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { farmer: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.cbamReport.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch CBAM reports'
    console.error('CBAM report list error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const mode = body.mode || 'save'

    if (mode === 'generate') {
      // Generate full CBAM report using the reporting engine
      if (!body.reportingPeriod) {
        return NextResponse.json({ error: 'reportingPeriod is required for mode=generate' }, { status: 400 })
      }

      const report = await generateCBAMReport(ctx.tenantId, body.reportingPeriod)

      // Persist to CbamReport model
      for (const comp of report.commodities) {
        await db.cbamReport.create({
          data: {
            tenantId: ctx.tenantId,
            farmerId: null,
            reportingPeriod: report.reportingPeriod,
            commodity: comp.commodity,
            quantityTonnes: comp.quantityTonnes,
            embeddedEmissions: comp.embeddedEmissionsTco2PerTonne,
            totalEmissions: comp.totalEmbeddedEmissions,
            carbonCredits: comp.creditsApplied,
            status: 'DRAFT',
            submittedBy: ctx.userId,
            submittedAt: report.generatedAt,
          },
        })
      }

      return NextResponse.json({ data: report, mode: 'generated' }, { status: 201 })
    }

    if (mode === 'validate') {
      if (!body.reportingPeriod) {
        return NextResponse.json({ error: 'reportingPeriod is required for mode=validate' }, { status: 400 })
      }

      const report = await generateCBAMReport(ctx.tenantId, body.reportingPeriod)
      const validation = validateCBAMSubmission(report)
      return NextResponse.json({ report, validation }, { status: 201 })
    }

    // Default: save a single CBAM report record (legacy CRUD)
    const report = await db.cbamReport.create({
      data: {
        farmerId: body.farmerId || null,
        tenantId: ctx.tenantId,
        reportingPeriod: body.reportingPeriod,
        commodity: body.commodity,
        quantityTonnes: body.quantityTonnes,
        embeddedEmissions: body.embeddedEmissions,
        totalEmissions: body.totalEmissions,
        certificationType: body.certificationType || null,
        carbonCredits: body.carbonCredits ?? null,
        status: body.status || 'DRAFT',
        submittedBy: body.submittedBy || ctx.userId,
        submittedAt: body.submittedAt ? new Date(body.submittedAt) : new Date(),
        verifiedBy: body.verifiedBy || null,
        verifiedAt: body.verifiedAt ? new Date(body.verifiedAt) : null,
      },
      include: { farmer: true },
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create CBAM report'
    console.error('CBAM report create error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}