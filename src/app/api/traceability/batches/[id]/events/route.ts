import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    const tenantFilter = buildTenantFilter(ctx)
    const { id } = await params

    // Verify batch access
    const batch = await db.productBatch.findFirst({
      where: { id, ...tenantFilter },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found or access denied' }, { status: 404 })
    }

    const events = await db.traceEvent.findMany({
      where: { productBatchId: id, ...tenantFilter },
      orderBy: { timestamp: 'asc' },
    })

    return NextResponse.json({
      batchId: batch.batchId,
      data: events,
      total: events.length,
    })
  } catch (error) {
    console.error('Trace events list error:', error)
    return NextResponse.json({ error: 'Failed to fetch trace events' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    const tenantFilter = buildTenantFilter(ctx)
    const { id } = await params
    const body = await request.json()
    const { eventType, details, evidence, actorName, actorType, location, latitude, longitude } = body

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 })
    }

    // Verify batch access
    const batch = await db.productBatch.findFirst({
      where: { id, ...tenantFilter },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found or access denied' }, { status: 404 })
    }

    const event = await db.traceEvent.create({
      data: {
        tenantId: ctx.tenantId,
        productBatchId: id,
        eventType,
        stage: body.stage || batch.currentStage,
        actorId: ctx.userId || null,
        actorName: actorName || null,
        actorType: actorType || 'USER',
        locationName: location || null,
        latitude: latitude || null,
        longitude: longitude || null,
        details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
        evidence: evidence ? (typeof evidence === 'string' ? evidence : JSON.stringify(evidence)) : null,
      },
    })

    // Update batch event count and potentially current stage
    await db.productBatch.update({
      where: { id },
      data: {
        traceEventCount: { increment: 1 },
        ...(body.stage ? { currentStage: body.stage } : {}),
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Trace event create error:', error)
    return NextResponse.json({ error: 'Failed to create trace event' }, { status: 500 })
  }
}