import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { CarbonCreditsEngine } from '@/lib/carbon/credits/engine'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    const { id } = await params

    const credit = await CarbonCreditsEngine.getCredit(id, ctx.tenantId)
    return NextResponse.json(credit)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch carbon credit'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    console.error('Carbon credit get error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // This POST issues NEW credits — the [id] here is ignored since we need projectId in body
  // Consumers should use POST /api/carbon/credits with projectId in body
  // This endpoint is kept for REST consistency but delegates to the same engine
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { projectId, vintageYear, quantityTonnesCO2 } = body

    if (!projectId || !vintageYear || !quantityTonnesCO2) {
      return NextResponse.json(
        { error: 'projectId, vintageYear, and quantityTonnesCO2 are required' },
        { status: 400 },
      )
    }

    const result = await CarbonCreditsEngine.issueCredits(ctx.tenantId, body)
    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to issue carbon credits'
    console.error('Carbon credits issue error:', error)
    if (message.includes('not found') || message.includes('must be') || message.includes('must be positive')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}