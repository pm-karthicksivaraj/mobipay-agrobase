import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { MfiEngine } from '@/lib/mfi/engine'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(ctx.role, 'mfi:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const loan = await MfiEngine.getLoan(id, ctx.tenantId)
    return NextResponse.json({ data: loan })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const status = msg.includes('not found') ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(ctx.role, 'mfi:update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const action = body.action

    if (action === 'approve') {
      const loan = await MfiEngine.approveLoan(id, ctx.tenantId, {
        approvedBy: ctx.userId,
        approvedAmount: body.approvedAmount,
      })
      return NextResponse.json({ data: loan })
    }

    if (action === 'reject') {
      const loan = await MfiEngine.rejectLoan(id, ctx.tenantId, {
        rejectedBy: ctx.userId,
        reason: body.reason,
      })
      return NextResponse.json({ data: loan })
    }

    if (action === 'disburse') {
      const loan = await MfiEngine.disburseLoan(id, ctx.tenantId, {
        disbursedBy: ctx.userId,
      })
      return NextResponse.json({ data: loan })
    }

    return NextResponse.json({ error: 'Invalid action. Use: approve, reject, or disburse' }, { status: 400 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const status = msg.includes('not found') ? 404
      : msg.includes('Only') || msg.includes('already') ? 409
      : 500
    return NextResponse.json({ error: msg }, { status })
  }
}