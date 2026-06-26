import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { SettlementEngine } from '@/lib/settlement'

/**
 * GET /api/settlements/[id] — Get single settlement with relations
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'payments:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const settlement = await SettlementEngine.getSettlement(
      id,
      ctx.isSuperAdmin ? undefined : ctx.tenantId,
    )

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }

    return NextResponse.json({ data: settlement })
  } catch (error) {
    console.error('[/api/settlements/[id]] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/settlements/[id] — Settlement state transitions
 * Body: { action: 'approve' | 'process' | 'fail' | 'reverse', ... }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'payments:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { action } = body as { action: string; [key: string]: unknown }

    // Verify settlement belongs to tenant
    const existing = await SettlementEngine.getSettlement(
      id,
      ctx.isSuperAdmin ? undefined : ctx.tenantId,
    )
    if (!existing) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }

    switch (action) {
      // -------------------------------------------------------------------
      // APPROVE: approve for processing
      // -------------------------------------------------------------------
      case 'approve': {
        const result = await SettlementEngine.approveSettlement({
          settlementId: id,
          approvedBy: ctx.userId,
        })
        return NextResponse.json({ data: result })
      }

      // -------------------------------------------------------------------
      // PROCESS: execute payment via gateway
      // -------------------------------------------------------------------
      case 'process': {
        const result = await SettlementEngine.processSettlement({
          settlementId: id,
          provider: body.provider as import('@/lib/payments/types').PaymentProvider | undefined,
          initiatedBy: ctx.userId,
        })
        return NextResponse.json({ data: result })
      }

      // -------------------------------------------------------------------
      // FAIL: mark as failed
      // -------------------------------------------------------------------
      case 'fail': {
        if (!body.reason) {
          return NextResponse.json(
            { error: 'reason is required for failure' },
            { status: 400 },
          )
        }
        const result = await SettlementEngine.failSettlement(
          id,
          body.reason as string,
        )
        return NextResponse.json({ data: result })
      }

      // -------------------------------------------------------------------
      // REVERSE: reverse a completed settlement
      // -------------------------------------------------------------------
      case 'reverse': {
        if (!body.reason) {
          return NextResponse.json(
            { error: 'reason is required for reversal' },
            { status: 400 },
          )
        }
        const result = await SettlementEngine.reverseSettlement(
          id,
          body.reason as string,
          ctx.userId,
        )
        return NextResponse.json({ data: result })
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Use approve, process, fail, or reverse.` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('[/api/settlements/[id]] PATCH error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('not found') ? 404
      : message.includes('Invalid') ? 400
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}