import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { EscrowEngine } from '@/lib/escrow'
import type { EscrowSourceType, EscrowStatus } from '@/lib/escrow/types'

/**
 * GET /api/escrow — List escrows + summary
 * Query params: status, sourceType, payerId, payeeId, startDate, endDate, page, limit
 *                ?action=summary for dashboard stats
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'payments:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    // Summary endpoint
    if (action === 'summary') {
      const tenantId = ctx.isSuperAdmin
        ? (searchParams.get('tenantId') ?? ctx.tenantId)
        : ctx.tenantId

      if (!tenantId) {
        return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
      }

      const summary = await EscrowEngine.getSummary(tenantId)
      return NextResponse.json({ data: summary })
    }

    // List endpoint
    const tenantId = ctx.isSuperAdmin
      ? (searchParams.get('tenantId') ?? ctx.tenantId)
      : ctx.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const status = searchParams.get('status')
    const sourceType = searchParams.get('sourceType')
    const payerId = searchParams.get('payerId')
    const payeeId = searchParams.get('payeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const result = await EscrowEngine.listEscrows({
      tenantId,
      status: status ? (status.split(',') as EscrowStatus[]) : undefined,
      sourceType: sourceType as EscrowSourceType | undefined,
      payerId: payerId ?? undefined,
      payeeId: payeeId ?? undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[/api/escrow] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/escrow — Create a new escrow
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'payments:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
      sourceType,
      sourceId,
      payerId,
      payerName,
      payeeId,
      payeeName,
      payeePhone,
      amount,
      currency,
      feeRate,
      releaseConditions,
      autoReleaseAt,
      paymentTxnId,
      metadata,
    } = body as {
      sourceType: EscrowSourceType
      sourceId: string
      payerId?: string
      payerName?: string
      payeeId?: string
      payeeName?: string
      payeePhone?: string
      amount: number
      currency?: string
      feeRate?: number
      releaseConditions?: Record<string, unknown>
      autoReleaseAt?: string
      paymentTxnId?: string
      metadata?: Record<string, unknown>
    }

    if (!sourceType || !sourceId || !amount) {
      return NextResponse.json(
        { error: 'sourceType, sourceId, and amount are required' },
        { status: 400 },
      )
    }

    const escrow = await EscrowEngine.createEscrow({
      tenantId: ctx.tenantId,
      sourceType,
      sourceId,
      payerId,
      payerName,
      payeeId,
      payeeName,
      amount,
      currency,
      feeRate,
      releaseConditions: releaseConditions as import('@/lib/escrow/types').ReleaseCondition | undefined,
      autoReleaseAt: autoReleaseAt ? new Date(autoReleaseAt) : undefined,
      paymentTxnId,
      metadata: metadata ?? { payeePhone },
      createdBy: ctx.userId,
    })

    return NextResponse.json({ data: escrow }, { status: 201 })
  } catch (error) {
    console.error('[/api/escrow] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}