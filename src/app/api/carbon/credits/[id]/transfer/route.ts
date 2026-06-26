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

    if (!body.transferTo) {
      return NextResponse.json({ error: 'transferTo (receiving registry/account) is required' }, { status: 400 })
    }

    const result = await CarbonCreditsEngine.transferCredits(id, ctx.tenantId, {
      quantity: body.quantity,
      transferTo: body.transferTo,
      transferDate: body.transferDate,
      notes: body.notes,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to transfer carbon credits'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('must be') || message.includes('Cannot transfer')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('Carbon credits transfer error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}