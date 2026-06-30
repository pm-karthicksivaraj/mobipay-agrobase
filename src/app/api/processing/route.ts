import { NextRequest, NextResponse } from 'next/server'
import {
  batches,
  ensureInitialized,
  generateId,
  generateBatchNumber,
  ProcessingBatch,
} from '@/lib/processing-store'

export async function GET(request: NextRequest) {
  ensureInitialized()
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const processType = searchParams.get('processType') || ''
    const commodity = searchParams.get('commodity') || ''
    const search = searchParams.get('search') || ''

    let result = [...batches]
    if (status) result = result.filter(b => b.status === status)
    if (processType) result = result.filter(b => b.processType === processType)
    if (commodity) result = result.filter(b => b.inputCommodity === commodity)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(b =>
        b.batchNumber.toLowerCase().includes(q) ||
        b.inputCommodity.toLowerCase().includes(q) ||
        b.outputProduct.toLowerCase().includes(q)
      )
    }
    // Most recent first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ batches: result, total: result.length })
  } catch (error) {
    console.error('[GET /api/processing] error:', error)
    return NextResponse.json({ error: 'Failed to fetch processing batches' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  ensureInitialized()
  try {
    const body = await request.json()

    // Basic validation
    const required = ['inputCommodity', 'processType', 'outputProduct', 'inputQuantity', 'facility']
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    const now = new Date().toISOString()
    const batch: ProcessingBatch = {
      id: generateId(),
      inputCommodity: String(body.inputCommodity),
      processType: String(body.processType),
      outputProduct: String(body.outputProduct),
      inputQuantity: Number(body.inputQuantity) || 0,
      inputUnit: String(body.inputUnit || 'kg'),
      outputQuantity: Number(body.outputQuantity) || 0,
      outputUnit: String(body.outputUnit || 'kg'),
      qualityGrade: String(body.qualityGrade || 'Grade 2'),
      qualityScore: Number(body.qualityScore) || 0,
      status: (body.status as ProcessingBatch['status']) || 'PENDING',
      batchNumber: String(body.batchNumber || generateBatchNumber()),
      facility: String(body.facility),
      startDate: body.startDate ? new Date(body.startDate).toISOString() : now,
      endDate: body.endDate ? new Date(body.endDate).toISOString() : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      createdAt: now,
    }

    batches.push(batch)
    return NextResponse.json({ batch }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/processing] error:', error)
    return NextResponse.json({ error: 'Failed to create processing batch' }, { status: 500 })
  }
}
