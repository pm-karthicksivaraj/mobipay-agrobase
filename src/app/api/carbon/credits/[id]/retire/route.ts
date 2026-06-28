import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { CarbonCreditsEngine } from '@/lib/carbon/credits/engine'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    if (!body.reason || !['VOLUNTARY', 'COMPLIANCE', 'CBAM_OFFSET'].includes(body.reason)) {
      return NextResponse.json(
        { error: 'reason is required and must be VOLUNTARY, COMPLIANCE, or CBAM_OFFSET' },
        { status: 400 },
      )
    }

    const result = await CarbonCreditsEngine.retireCredits(id, ctx.tenantId, {
      quantity: body.quantity,
      reason: body.reason,
      retiredOnBehalfOf: body.retiredOnBehalfOf,
      retiredById: ctx.userId,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retire carbon credits'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('must be') || message.includes('Cannot retire')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('Carbon credits retire error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}