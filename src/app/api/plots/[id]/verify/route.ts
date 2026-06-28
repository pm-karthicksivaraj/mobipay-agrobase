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

    if (!body.verificationType || !body.result) {
      return NextResponse.json(
        { error: 'verificationType and result are required' },
        { status: 400 }
      )
    }

    const result = await PlotEngine.verify(ctx.tenantId, id, ctx.userId, body)
    if (!result) return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    const { id } = await params
    const history = await PlotEngine.getVerificationHistory(ctx.tenantId, id)
    return NextResponse.json({ verifications: history })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}