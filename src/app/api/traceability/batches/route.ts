import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { NextResponse } from 'next/server'

function generateBatchId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'BATCH-'
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const tenantFilter = buildTenantFilter(ctx)
    const { searchParams } = new URL(request.url)

    const farmerId = searchParams.get('farmerId')
    const status = searchParams.get('status')
    const commodity = searchParams.get('commodity')
    const season = searchParams.get('season')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { ...tenantFilter }
    if (farmerId) where.farmerId = farmerId
    if (status) where.status = status
    if (commodity) where.commodity = commodity
    if (season) where.season = season

    const [data, total] = await Promise.all([
      db.productBatch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          farmer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.productBatch.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Product batches list error:', error)
    return NextResponse.json({ error: 'Failed to fetch product batches' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const { farmerId, farmLandId, cultivationId, season, commodity, variety, quantityKg } = body

    if (!commodity) {
      return NextResponse.json({ error: 'commodity is required' }, { status: 400 })
    }

    // Verify farmer access if provided
    if (farmerId) {
      const farmer = await db.farmerProfile.findFirst({
        where: { id: farmerId, ...buildTenantFilter(ctx) },
      })
      if (!farmer) {
        return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
      }
    }

    // Get farm details if farmLandId provided
    let farmName: string | null = null
    if (farmLandId) {
      const farmLand = await db.farmLand.findFirst({
        where: { id: farmLandId },
        select: { name: true },
      })
      farmName = farmLand?.name || null
    }

    const batch = await db.productBatch.create({
      data: {
        tenantId: ctx.tenantId,
        batchId: generateBatchId(),
        farmerId: farmerId || null,
        farmLandId: farmLandId || null,
        farmName,
        commodity,
        variety: variety || null,
        quantityKg: quantityKg || 0,
        season: season || null,
        status: 'GROWING',
        currentStage: 'FARM',
        traceEventCount: 1, // Creation event
      },
    })

    // Create initial trace event
    await db.traceEvent.create({
      data: {
        tenantId: ctx.tenantId,
        productBatchId: batch.id,
        eventType: 'BATCH_CREATED',
        stage: 'FARM',
        actorId: ctx.userId,
        actorName: 'System',
        actorType: 'SYSTEM',
        details: JSON.stringify({
          farmerId,
          farmLandId,
          season,
          commodity,
          variety,
        }),
      },
    })

    return NextResponse.json(batch, { status: 201 })
  } catch (error) {
    console.error('Product batch create error:', error)
    return NextResponse.json({ error: 'Failed to create product batch' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const { batchId, status, currentStage, details } = body

    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 })
    }

    // Verify access
    const existing = await db.productBatch.findFirst({
      where: { id: batchId, ...buildTenantFilter(ctx) },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Batch not found or access denied' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (currentStage !== undefined) updateData.currentStage = currentStage

    const updated = await db.productBatch.update({
      where: { id: batchId },
      data: updateData,
    })

    // Create a trace event for the update
    await db.traceEvent.create({
      data: {
        tenantId: ctx.tenantId,
        productBatchId: batchId,
        eventType: 'BATCH_UPDATED',
        stage: currentStage || updated.currentStage,
        actorId: ctx.userId,
        actorType: 'USER',
        details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : JSON.stringify({ status, currentStage }),
      },
    })

    // Update event count
    const count = await db.traceEvent.count({ where: { productBatchId: batchId } })
    await db.productBatch.update({
      where: { id: batchId },
      data: { traceEventCount: count },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Product batch update error:', error)
    return NextResponse.json({ error: 'Failed to update product batch' }, { status: 500 })
  }
}