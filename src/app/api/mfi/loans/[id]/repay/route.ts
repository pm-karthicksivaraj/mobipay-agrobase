import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { MfiEngine } from '@/lib/mfi/engine'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(ctx.role, 'mfi:update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: loanId } = await params
    const body = await request.json()

    const repayment = await MfiEngine.recordRepayment(ctx.tenantId, {
      loanId,
      scheduleId: body.scheduleId,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      referenceNumber: body.referenceNumber,
      receivedBy: ctx.userId,
      notes: body.notes,
    })

    return NextResponse.json({ data: repayment })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const status = msg.includes('not found') ? 404
      : msg.includes('exceeds') || msg.includes('more than') ? 400
      : 500
    return NextResponse.json({ error: msg }, { status })
  }
}