import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { PlotEngine } from '@/lib/plots/engine'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    const { id } = await params
    const body = await request.json()

    if (!body.docType) {
      return NextResponse.json({ error: 'docType is required' }, { status: 400 })
    }

    const doc = await PlotEngine.addDocument(ctx.tenantId, id, body)
    if (!doc) return NextResponse.json({ error: 'Failed to add document' }, { status: 500 })
    return NextResponse.json(doc, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}