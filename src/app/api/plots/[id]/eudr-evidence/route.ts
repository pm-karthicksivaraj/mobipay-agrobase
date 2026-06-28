import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { EvidencePackEngine } from '@/lib/eudr/evidence-pack'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext(request)
    const { id } = await params

    const pack = await EvidencePackEngine.generateForPlot(ctx.tenantId, id)
    return NextResponse.json(pack)
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext(request)
    const { id } = await params
    const body = await request.json()

    if (body.action === 'submit-eudr') {
      const result = await EvidencePackEngine.submitFromPlot(ctx.tenantId, id)
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    }

    // Default: generate evidence pack
    const pack = await EvidencePackEngine.generateForPlot(ctx.tenantId, id)
    return NextResponse.json(pack)
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}