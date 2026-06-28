import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { CbamEngine } from '@/lib/cbam'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params

    const report = await CbamEngine.getCalculation(id)
    return NextResponse.json(report)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch CBAM report'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    console.error('CBAM report get error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
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
    const { status, reason } = body

    if (!status || !['SUBMITTED', 'VERIFIED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'status is required and must be SUBMITTED, VERIFIED, or REJECTED' },
        { status: 400 },
      )
    }

    let result

    if (status === 'SUBMITTED') {
      result = await CbamEngine.submitReport(id, ctx.userId)
    } else if (status === 'VERIFIED') {
      result = await CbamEngine.verifyReport(id, ctx.userId)
    } else {
      if (!reason) {
        return NextResponse.json(
          { error: 'reason is required when rejecting a report' },
          { status: 400 },
        )
      }
      result = await CbamEngine.rejectReport(id, ctx.userId, reason)
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update CBAM report status'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('Cannot') || message.includes('cannot') || message.includes('Invalid')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('CBAM report status update error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}