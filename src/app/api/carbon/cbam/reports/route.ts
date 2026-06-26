import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { CbamEngine } from '@/lib/cbam'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)

    const result = await CbamEngine.listReports(ctx.tenantId, {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      status: searchParams.get('status') || undefined,
      period: searchParams.get('period') || undefined,
    })

    return NextResponse.json({
      data: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    })
  } catch (error) {
    console.error('CBAM reports list error:', error)
    return NextResponse.json({ error: 'Failed to fetch CBAM reports' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { period, autoValidate, autoExportXml, autoExportCsv } = body

    if (!period) {
      return NextResponse.json(
        { error: 'period is required (e.g. "2026-Q1")' },
        { status: 400 },
      )
    }

    const report = await CbamEngine.generateReport(ctx.tenantId, {
      period,
      autoValidate: autoValidate ?? false,
      autoExportXml: autoExportXml ?? false,
      autoExportCsv: autoExportCsv ?? false,
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate CBAM report'
    console.error('CBAM report generate error:', error)
    if (message.includes('not found') || message.includes('already exists') || message.includes('Invalid period')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}