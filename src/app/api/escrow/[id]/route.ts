import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { EscrowEngine } from '@/lib/escrow'
import { SettlementEngine } from '@/lib/settlement'

/**
 * GET /api/escrow/[id] — Get single escrow with settlements
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
    const escrow = await EscrowEngine.getEscrow(id, ctx.isSuperAdmin ? undefined : ctx.tenantId)

    if (!escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    return NextResponse.json({ data: escrow })
  } catch (error) {
    console.error('[/api/escrow/[id]] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/escrow/[id] — Escrow state transitions
 * Body: { action: 'hold' | 'release' | 'refund' | 'dispute', ... }
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

    // Verify escrow belongs to tenant
    const existing = await EscrowEngine.getEscrow(id, ctx.isSuperAdmin ? undefined : ctx.tenantId)
    if (!existing) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    switch (action) {
      // -------------------------------------------------------------------
      // HOLD: confirm funds received
      // -------------------------------------------------------------------
      case 'hold': {
        const result = await EscrowEngine.holdEscrow(
          id,
          ctx.userId,
          body.paymentTxnId as string | undefined,
        )
        return NextResponse.json({ data: result })
      }

      // -------------------------------------------------------------------
      // RELEASE: full or partial, optionally auto-create settlement
      // -------------------------------------------------------------------
      case 'release': {
        const releaseResult = await EscrowEngine.releaseEscrow({
          escrowId: id,
          amount: body.amount as number | undefined,
          releasedBy: ctx.userId,
          reason: body.reason as string | undefined,
        })

        // Auto-create settlement from the release
        let settlement: Record<string, unknown> | null = null
        if (body.createSettlement !== false && releaseResult.netAmount > 0) {
          try {
            settlement = await SettlementEngine.createFromEscrow(
              id,
              releaseResult.netAmount,
              releaseResult.feeAmount,
              ctx.userId,
            )
          } catch (sError) {
            console.warn(
              '[/api/escrow/[id]] Auto-settlement creation failed:',
              sError instanceof Error ? sError.message : sError,
            )
          }
        }

        return NextResponse.json({
          data: releaseResult,
          settlement,
        })
      }

      // -------------------------------------------------------------------
      // REFUND: return funds to payer
      // -------------------------------------------------------------------
      case 'refund': {
        const result = await EscrowEngine.refundEscrow({
          escrowId: id,
          refundedBy: ctx.userId,
          reason: body.reason as string | undefined,
        })
        return NextResponse.json({ data: result })
      }

      // -------------------------------------------------------------------
      // DISPUTE: flag as disputed
      // -------------------------------------------------------------------
      case 'dispute': {
        if (!body.reason) {
          return NextResponse.json(
            { error: 'reason is required for dispute' },
            { status: 400 },
          )
        }
        const result = await EscrowEngine.disputeEscrow({
          escrowId: id,
          disputedBy: ctx.userId,
          reason: body.reason as string,
        })
        return NextResponse.json({ data: result })
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Use hold, release, refund, or dispute.` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('[/api/escrow/[id]] PATCH error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('not found') ? 404
      : message.includes('Invalid') ? 400
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}