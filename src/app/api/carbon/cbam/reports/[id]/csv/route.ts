import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { CbamEngine } from '@/lib/cbam'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:export')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await params // resolve for tenant context only
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')

    if (!period) {
      return NextResponse.json(
        { error: 'period query parameter is required (e.g. "2026-Q1")' },
        { status: 400 },
      )
    }

    const csv = await CbamEngine.exportReportCsv(ctx.tenantId, period)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=cbam-report-${period}.csv`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export CBAM report as CSV'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('No data') || message.includes('Invalid period')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('CBAM CSV export error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}