import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const tenantFilter = buildTenantFilter(ctx)
    const { searchParams } = new URL(request.url)

    const action = searchParams.get('action')
    const status = searchParams.get('status') || ''
    const riskAssessment = searchParams.get('riskAssessment') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Special action: get near-expiry records
    if (action === 'expiring') {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const where: Record<string, unknown> = {
        status: 'VERIFIED',
        expiryDate: { lte: thirtyDaysFromNow },
      }

      // Tenant isolation through farmer relation
      if (!ctx.isSuperAdmin) {
        where.farmer = { tenantId: { in: ctx.tenantScope } }
      }

      const data = await db.eudrCompliance.findMany({
        where,
        include: {
          farmer: { select: { id: true, firstName: true, lastName: true, tenantId: true } },
          documents: true,
        },
        orderBy: { expiryDate: 'asc' },
      })

      return NextResponse.json({ data, action: 'expiring', total: data.length })
    }

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (riskAssessment) where.riskAssessment = riskAssessment

    // Tenant isolation through farmer relation
    if (!ctx.isSuperAdmin) {
      where.farmer = { tenantId: { in: ctx.tenantScope } }
    }

    const [data, total] = await Promise.all([
      db.eudrCompliance.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          farmer: { select: { id: true, firstName: true, lastName: true, tenantId: true } },
          documents: true,
          auditLogs: { orderBy: { performedAt: 'desc' }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.eudrCompliance.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('EUDR list error:', error)
    return NextResponse.json({ error: 'Failed to fetch EUDR records' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()

    // If farmerId provided, verify tenant access
    if (body.farmerId) {
      const farmer = await db.farmerProfile.findFirst({
        where: { id: body.farmerId, ...buildTenantFilter(ctx) },
      })
      if (!farmer) {
        return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
      }
    }

    const record = await db.eudrCompliance.create({
      data: {
        farmerId: body.farmerId || null,
        plotId: body.plotId,
        plotName: body.plotName,
        geolocation: typeof body.geolocation === 'string' ? body.geolocation : JSON.stringify(body.geolocation),
        areaHectares: body.areaHectares,
        commodities: typeof body.commodities === 'string' ? body.commodities : JSON.stringify(body.commodities),
        deforestationFree: body.deforestationFree ?? false,
        deforestationDate: body.deforestationDate ? new Date(body.deforestationDate) : null,
        legalDocuments: body.legalDocuments ? (typeof body.legalDocuments === 'string' ? body.legalDocuments : JSON.stringify(body.legalDocuments)) : null,
        riskAssessment: body.riskAssessment || null,
        dueDiligenceRef: body.dueDiligenceRef || null,
        status: body.status || 'PENDING',
        verifiedBy: body.verifiedBy || null,
        verifiedAt: body.verifiedAt ? new Date(body.verifiedAt) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      },
      include: { farmer: true },
    })

    // Create audit log
    await db.eudrAuditLog.create({
      data: {
        eudrComplianceId: record.id,
        action: 'CREATED',
        performedBy: ctx.userId,
        details: `EUDR compliance record created for plot ${body.plotId}`,
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('EUDR create error:', error)
    return NextResponse.json({ error: 'Failed to create EUDR compliance record' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const { id, status, riskAssessment, deforestationFree, expiryDate } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Verify access through farmer tenant
    const existing = await db.eudrCompliance.findFirst({
      where: { id },
      include: { farmer: { select: { tenantId: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    if (!ctx.isSuperAdmin && existing.farmer && !ctx.tenantScope.includes(existing.farmer.tenantId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (riskAssessment !== undefined) updateData.riskAssessment = riskAssessment
    if (deforestationFree !== undefined) updateData.deforestationFree = deforestationFree
    if (expiryDate !== undefined) updateData.expiryDate = new Date(expiryDate)

    if (status === 'VERIFIED') {
      updateData.verifiedBy = ctx.userId
      updateData.verifiedAt = new Date()
    }

    const updated = await db.eudrCompliance.update({
      where: { id },
      data: updateData,
      include: { farmer: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('EUDR update error:', error)
    return NextResponse.json({ error: 'Failed to update EUDR record' }, { status: 500 })
  }
}