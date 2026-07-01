import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

/**
 * Generates a unique processing batch number of the form `PCH-YYYY-NNNNNN`
 * where NNNNNN is a random base-36 suffix (collision-resistant for practical
 * purposes; uniqueness is enforced at the DB layer via `@unique`).
 */
function generateBatchNumber(): string {
  const year = new Date().getFullYear()
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `PCH-${year}-${suffix}`
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const tf = buildTenantFilter(ctx, 'tenantId') as Record<string, unknown>

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const processType = searchParams.get('processType') || ''
    const commodity = searchParams.get('commodity') || ''
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = { ...tf }
    if (status) where.status = status
    if (processType) where.processType = processType
    if (commodity) where.inputCommodity = commodity
    if (search) {
      where.OR = [
        { batchNumber: { contains: search, mode: 'insensitive' } },
        { inputCommodity: { contains: search, mode: 'insensitive' } },
        { outputProduct: { contains: search, mode: 'insensitive' } },
      ]
    }

    const result = await db.processingBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ batches: result, total: result.length })
  } catch (error) {
    console.error('[GET /api/processing] error:', error)
    return NextResponse.json({ error: 'Failed to fetch processing batches' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const ctx = await getTenantContext(request)

    // Basic validation — keep parity with the previous in-memory implementation.
    const required = ['inputCommodity', 'processType', 'outputProduct', 'inputQuantity', 'facility']
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    const batch = await db.processingBatch.create({
      data: {
        tenantId: ctx.tenantId,
        batchNumber: String(body.batchNumber || generateBatchNumber()),
        inputCommodity: String(body.inputCommodity),
        processType: String(body.processType),
        outputProduct: String(body.outputProduct),
        inputQuantity: Number(body.inputQuantity) || 0,
        inputUnit: String(body.inputUnit || 'kg'),
        outputQuantity: body.outputQuantity !== undefined && body.outputQuantity !== null
          ? Number(body.outputQuantity)
          : null,
        outputUnit: body.outputUnit ? String(body.outputUnit) : null,
        qualityGrade: body.qualityGrade ? String(body.qualityGrade) : null,
        qualityScore: body.qualityScore !== undefined && body.qualityScore !== null
          ? Number(body.qualityScore)
          : null,
        facility: String(body.facility),
        status: body.status ? String(body.status) : 'PENDING',
        startDate: body.startDate ? new Date(body.startDate) : (body.startDate === null ? null : new Date()),
        endDate: body.endDate ? new Date(body.endDate) : null,
        notes: body.notes ? String(body.notes) : null,
      },
    })

    return NextResponse.json({ batch }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/processing] error:', error)
    return NextResponse.json({ error: 'Failed to create processing batch' }, { status: 500 })
  }
}
