import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { generateCBAMReport, exportCBAMXml, exportCBAMCsv } from '@/lib/carbon/reporting'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    if (!body.reportingPeriod) {
      return NextResponse.json({ error: 'reportingPeriod is required (e.g. 2026-Q1)' }, { status: 400 })
    }

    const report = await generateCBAMReport(ctx.tenantId, body.reportingPeriod)
    return NextResponse.json(report, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate CBAM report'
    console.error('CBAM report generate error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)

    const period = searchParams.get('period')
    const format = searchParams.get('format') || 'json'

    if (!period) {
      return NextResponse.json({ error: 'period is required (e.g. 2026-Q1)' }, { status: 400 })
    }

    const report = await generateCBAMReport(ctx.tenantId, period)

    if (format === 'xml') {
      const xml = exportCBAMXml(report)
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="cbam-report-${period}.xml"`,
        },
      })
    }

    if (format === 'csv') {
      const csv = exportCBAMCsv(report)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="cbam-report-${period}.csv"`,
        },
      })
    }

    // Default: JSON
    return NextResponse.json(report)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export CBAM report'
    console.error('CBAM report export error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}