import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    const tf = buildTenantFilter(ctx, 'tenantId') as any
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const period = searchParams.get('period') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (period) where.reportingPeriod = period

    const [data, total] = await Promise.all([
      db.cbamReport.findMany({
        where: { ...tf, ...where },
        skip: (page - 1) * limit,
        take: limit,
        include: { farmer: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.cbamReport.count({ where: { ...tf, ...where } }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch CBAM reports' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    const tf = buildTenantFilter(ctx, 'tenantId') as any
    const body = await request.json()
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
        submittedBy: body.submittedBy || null,
        submittedAt: body.submittedAt ? new Date(body.submittedAt) : null,
        verifiedBy: body.verifiedBy || null,
        verifiedAt: body.verifiedAt ? new Date(body.verifiedAt) : null,
      },
      include: { farmer: true },
    })
    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create CBAM report' }, { status: 500 })
  }
}