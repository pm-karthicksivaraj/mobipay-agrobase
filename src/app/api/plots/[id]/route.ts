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
    const plot = await PlotEngine.getById(ctx.tenantId, id)
    if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
    return NextResponse.json(plot)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    const { id } = await params
    const body = await request.json()

    const plot = await PlotEngine.update(ctx.tenantId, id, body)
    if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
    return NextResponse.json(plot)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    const { id } = await params
    const ok = await PlotEngine.delete(ctx.tenantId, id)
    if (!ok) return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}