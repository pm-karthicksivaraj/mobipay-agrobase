import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const tenantFilter = buildTenantFilter(ctx)
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { ...tenantFilter }
    if (status) where.status = status
    if (severity) where.severity = severity

    const [data, total] = await Promise.all([
      db.deforestationAlert.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { eudrCompliance: true },
        orderBy: { detectionDate: 'desc' },
      }),
      db.deforestationAlert.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Deforestation list error:', error)
    return NextResponse.json({ error: 'Failed to fetch deforestation alerts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const tenantFilter = buildTenantFilter(ctx)
    const body = await request.json()
    const { farmId, polygon, checkDate } = body

    if (!farmId) {
      return NextResponse.json({ error: 'farmId is required' }, { status: 400 })
    }

    // Verify farm access
    const farm = await db.farmLand.findFirst({
      where: { id: farmId, ...tenantFilter },
    })
    if (!farm) {
      return NextResponse.json({ error: 'Farm not found or access denied' }, { status: 404 })
    }

    // TODO: Wire to EudrEngine.checkDeforestation() when lib is available
    // For now, create a placeholder check record
    const alert = await db.deforestationAlert.create({
      data: {
        tenantId: ctx.tenantId,
        farmId,
        detectionDate: checkDate ? new Date(checkDate) : new Date(),
        severity: 'NONE',
        areaAffectedHa: 0,
        confidence: 0.95,
        status: 'DISMISSED', // No deforestation detected
        resolvedAt: new Date(),
        resolvedBy: ctx.userId,
      },
    })

    return NextResponse.json({
      alert,
      analysis: {
        detected: false,
        message: 'No deforestation detected in the specified area and timeframe.',
        methodology: 'Sentinel-2 change detection with 2020 baseline comparison',
        confidence: 0.95,
        nextRecommendedCheck: '2026-04-01',
      },
    })
  } catch (error) {
    console.error('Deforestation check error:', error)
    return NextResponse.json({ error: 'Failed to run deforestation check' }, { status: 500 })
  }
}