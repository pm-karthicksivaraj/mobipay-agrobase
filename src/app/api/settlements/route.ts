import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { SettlementEngine } from '@/lib/settlement'
import type { SettlementStatus, SettlementSourceType } from '@/lib/settlement/types'

/**
 * GET /api/settlements — List settlements + summary
 * Query params: status, sourceType, beneficiaryId, batchId, startDate, endDate, page, limit
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

    const tenantId = ctx.isSuperAdmin
      ? (searchParams.get('tenantId') ?? ctx.tenantId)
      : ctx.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    // Summary endpoint
    if (action === 'summary') {
      const summary = await SettlementEngine.getSummary(tenantId)
      return NextResponse.json({ data: summary })
    }

    // List endpoint
    const status = searchParams.get('status')
    const sourceType = searchParams.get('sourceType')
    const beneficiaryId = searchParams.get('beneficiaryId')
    const batchId = searchParams.get('batchId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const result = await SettlementEngine.listSettlements({
      tenantId,
      status: status ? (status.split(',') as SettlementStatus[]) : undefined,
      sourceType: sourceType as SettlementSourceType | undefined,
      beneficiaryId: beneficiaryId ?? undefined,
      batchId: batchId ?? undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[/api/settlements] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/settlements — Create a single settlement
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
      escrowId,
      beneficiaryId,
      beneficiaryName,
      beneficiaryPhone,
      grossAmount,
      deductions,
      currency,
      paymentMethod,
      provider,
      metadata,
    } = body as {
      sourceType: SettlementSourceType
      sourceId?: string
      escrowId?: string
      beneficiaryId?: string
      beneficiaryName: string
      beneficiaryPhone: string
      grossAmount: number
      deductions?: number
      currency?: string
      paymentMethod?: string
      provider?: string
      metadata?: Record<string, unknown>
    }

    if (!sourceType || !beneficiaryName || !beneficiaryPhone || !grossAmount) {
      return NextResponse.json(
        { error: 'sourceType, beneficiaryName, beneficiaryPhone, and grossAmount are required' },
        { status: 400 },
      )
    }

    const settlement = await SettlementEngine.createSettlement({
      tenantId: ctx.tenantId,
      sourceType,
      sourceId,
      escrowId,
      beneficiaryId,
      beneficiaryName,
      beneficiaryPhone,
      grossAmount,
      deductions,
      currency,
      paymentMethod: paymentMethod as import('@/lib/settlement/types').SettlementPaymentMethod | undefined,
      provider: provider as import('@/lib/payments/types').PaymentProvider | undefined,
      metadata,
      initiatedBy: ctx.userId,
    })

    return NextResponse.json({ data: settlement }, { status: 201 })
  } catch (error) {
    console.error('[/api/settlements] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}