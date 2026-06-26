import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()

    const { searchParams } = new URL(request.url)
    const cooperativeId = searchParams.get('cooperativeId') || ''
    const farmerId = searchParams.get('farmerId') || ''
    const commodity = searchParams.get('commodity') || ''
    const status = searchParams.get('status') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause — filter through company (cooperative) tenantId
    const where: Record<string, unknown> = {}
    if (!ctx.isSuperAdmin) {
      // Intake is linked through farmer → tenant
      const validFarmerIds = await db.farmerProfile.findMany({
        where: { tenantId: { in: ctx.tenantScope } },
        select: { id: true },
      })
      where.farmerId = { in: validFarmerIds.map(f => f.id) }
    }
    if (cooperativeId) where.cooperativeId = cooperativeId
    if (farmerId) where.farmerId = farmerId
    if (commodity) where.commodity = commodity
    if (status) where.status = status
    if (startDate || endDate) {
      where.createdAt = {} as Record<string, unknown>
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate)
    }

    // Since ProduceIntake model may not exist in schema yet, use a generic approach
    // This will work with a ProduceIntake model when added to the schema
    const intakes = await db.farmerProfile.findMany({
      where: ctx.isSuperAdmin ? {} : { tenantId: { in: ctx.tenantScope } },
      select: { id: true, firstName: true, lastName: true, mainCrops: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    const total = await db.farmerProfile.count({
      where: ctx.isSuperAdmin ? {} : { tenantId: { in: ctx.tenantScope } },
    })

    return NextResponse.json({
      data: intakes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      note: 'Full intake model pending schema update',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch intakes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'purchases:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { cooperativeId, farmerId, commodity, variety, quantityKg, pricePerKg, qualityNotes } = body as {
      cooperativeId?: string
      farmerId?: string
      commodity: string
      variety?: string
      quantityKg: number
      pricePerKg?: number
      qualityNotes?: string
    }

    if (!commodity || !quantityKg) {
      return NextResponse.json({ error: 'commodity and quantityKg are required' }, { status: 400 })
    }

    // Verify farmer belongs to tenant
    if (farmerId && !ctx.isSuperAdmin) {
      const farmer = await db.farmerProfile.findFirst({
        where: { id: farmerId, tenantId: { in: ctx.tenantScope } },
      })
      if (!farmer) {
        return NextResponse.json({ error: 'Farmer not found in your tenant' }, { status: 403 })
      }
    }

    // Create a purchase record as an intake proxy until ProduceIntake model is added
    const intake = await db.purchase.create({
      data: {
        farmerId: farmerId || null,
        commodity,
        variety: variety || null,
        quantity: String(quantityKg),
        unitPrice: pricePerKg ?? null,
        totalAmount: pricePerKg ? pricePerKg * quantityKg : null,
        status: 'PENDING',
        initiatedBy: ctx.userId,
      },
      include: { farmer: true },
    })

    return NextResponse.json({ data: intake, note: 'Stored as purchase until ProduceIntake model is added' }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create intake' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getTenantContext()

    const body = await request.json()
    const { id, grade, status, warehouse } = body as {
      id: string
      grade?: string
      status?: string
      warehouse?: string
    }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (grade) updateData.description = grade
    updateData.updatedAt = new Date()

    const updated = await db.purchase.update({
      where: { id },
      data: updateData,
      include: { farmer: true },
    })

    return NextResponse.json({ data: updated, note: 'Updated via purchase model' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update intake' }, { status: 500 })
  }
}