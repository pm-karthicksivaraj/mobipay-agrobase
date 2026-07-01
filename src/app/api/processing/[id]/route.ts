import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getTenantContext(req)
    const tf = buildTenantFilter(ctx, 'tenantId') as Record<string, unknown>

    const batch = await db.processingBatch.findFirst({ where: { id, ...tf } })
    if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ batch })
  } catch (error) {
    console.error('[GET /api/processing/[id]] error:', error)
    return NextResponse.json({ error: 'Failed to fetch processing batch' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getTenantContext(req)
    const tf = buildTenantFilter(ctx, 'tenantId') as Record<string, unknown>

    const existing = await db.processingBatch.findFirst({ where: { id, ...tf } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()

    // Build the update payload, coercing numeric fields and ignoring the id field.
    const data: Record<string, unknown> = {}
    if (body.batchNumber !== undefined) data.batchNumber = String(body.batchNumber)
    if (body.inputCommodity !== undefined) data.inputCommodity = String(body.inputCommodity)
    if (body.processType !== undefined) data.processType = String(body.processType)
    if (body.outputProduct !== undefined) data.outputProduct = body.outputProduct === null ? null : String(body.outputProduct)
    if (body.inputQuantity !== undefined) data.inputQuantity = Number(body.inputQuantity)
    if (body.inputUnit !== undefined) data.inputUnit = String(body.inputUnit)
    if (body.outputQuantity !== undefined) data.outputQuantity = body.outputQuantity === null ? null : Number(body.outputQuantity)
    if (body.outputUnit !== undefined) data.outputUnit = body.outputUnit === null ? null : String(body.outputUnit)
    if (body.qualityGrade !== undefined) data.qualityGrade = body.qualityGrade === null ? null : String(body.qualityGrade)
    if (body.qualityScore !== undefined) data.qualityScore = body.qualityScore === null ? null : Number(body.qualityScore)
    if (body.facility !== undefined) data.facility = body.facility === null ? null : String(body.facility)
    if (body.status !== undefined) data.status = String(body.status)
    if (body.startDate !== undefined) data.startDate = body.startDate === null ? null : new Date(body.startDate)
    if (body.endDate !== undefined) data.endDate = body.endDate === null ? null : new Date(body.endDate)
    if (body.notes !== undefined) data.notes = body.notes === null ? null : String(body.notes)

    const updated = await db.processingBatch.update({ where: { id }, data })
    return NextResponse.json({ batch: updated })
  } catch (error) {
    console.error('[PUT /api/processing/[id]] error:', error)
    return NextResponse.json({ error: 'Failed to update processing batch' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getTenantContext(req)
    const tf = buildTenantFilter(ctx, 'tenantId') as Record<string, unknown>

    const existing = await db.processingBatch.findFirst({ where: { id, ...tf } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.processingBatch.delete({ where: { id } })
    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error('[DELETE /api/processing/[id]] error:', error)
    return NextResponse.json({ error: 'Failed to delete processing batch' }, { status: 500 })
  }
}
