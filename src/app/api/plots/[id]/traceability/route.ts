import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { PlotEngine } from '@/lib/plots/engine'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    const { id } = await params
    const chain = await PlotEngine.getTraceabilityChain(ctx.tenantId, id)
    if (!chain) return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
    return NextResponse.json(chain)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}