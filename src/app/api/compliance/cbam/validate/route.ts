import { getTenantContext } from '@/lib/tenant'
import { generateCBAMReport, validateCBAMSubmission } from '@/lib/carbon/reporting'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()

    let reportData: Parameters<typeof validateCBAMSubmission>[0]

    // If full report data is provided, validate directly
    if (body.tenantId && body.commodities && Array.isArray(body.commodities)) {
      // Convert date strings to Date objects
      reportData = {
        ...body,
        generatedAt: body.generatedAt ? new Date(body.generatedAt) : new Date(),
      }
    } else if (body.reportingPeriod) {
      // Generate report first, then validate
      const report = await generateCBAMReport(ctx.tenantId, body.reportingPeriod)
      reportData = report
    } else {
      return NextResponse.json(
        { error: 'Provide either reportingPeriod (to auto-generate) or full report data with commodities' },
        { status: 400 },
      )
    }

    const validation = validateCBAMSubmission(reportData)

    return NextResponse.json({
      isValid: validation.isValid,
      score: validation.score,
      errors: validation.errors,
      warnings: validation.warnings,
      reportSummary: {
        tenantId: reportData.tenantId,
        reportingPeriod: reportData.reportingPeriod,
        totalEmissions: reportData.totalEmissions,
        totalQuantity: reportData.totalQuantity,
        commodityCount: reportData.commodities.length,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to validate CBAM report'
    console.error('CBAM validation error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}