import { NextRequest, NextResponse } from 'next/server'
import { batches, ensureInitialized, ProcessingBatch } from '@/lib/processing-store'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureInitialized()
  const { id } = await params
  const batch = batches.find(b => b.id === id)
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ batch })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureInitialized()
  const { id } = await params
  const idx = batches.findIndex(b => b.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const current = batches[idx]
  const updated: ProcessingBatch = {
    ...current,
    ...body,
    id: current.id, // prevent id mutation
    inputQuantity: body.inputQuantity !== undefined ? Number(body.inputQuantity) : current.inputQuantity,
    outputQuantity: body.outputQuantity !== undefined ? Number(body.outputQuantity) : current.outputQuantity,
    qualityScore: body.qualityScore !== undefined ? Number(body.qualityScore) : current.qualityScore,
  }
  batches[idx] = updated
  return NextResponse.json({ batch: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureInitialized()
  const { id } = await params
  const idx = batches.findIndex(b => b.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  batches.splice(idx, 1)
  return NextResponse.json({ message: 'Deleted' })
}
