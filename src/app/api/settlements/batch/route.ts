import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { SettlementEngine } from '@/lib/settlement'
import type { SettlementSourceType, SettlementPaymentMethod } from '@/lib/settlement/types'
import type { PaymentProvider } from '@/lib/payments/types'

/**
 * POST /api/settlements/batch — Create batch settlements
 * Body: { settlements: [...], autoProcess?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'payments:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { settlements, autoProcess } = body as {
      settlements: Array<{
        sourceType: SettlementSourceType
        sourceId?: string
        escrowId?: string
        beneficiaryId?: string
        beneficiaryName: string
        beneficiaryPhone: string
        grossAmount: number
        deductions?: number
        currency?: string
        paymentMethod?: SettlementPaymentMethod
        provider?: PaymentProvider
        metadata?: Record<string, unknown>
      }>
      autoProcess?: boolean
    }

    if (!settlements || !Array.isArray(settlements) || settlements.length === 0) {
      return NextResponse.json(
        { error: 'settlements array is required and must not be empty' },
        { status: 400 },
      )
    }

    if (settlements.length > 200) {
      return NextResponse.json(
        { error: 'Maximum 200 settlements per batch' },
        { status: 400 },
      )
    }

    // Create batch
    const batch = await SettlementEngine.createBatchSettlement({
      tenantId: ctx.tenantId,
      settlements: settlements.map((s) => ({
        ...s,
        tenantId: ctx.tenantId,
        initiatedBy: ctx.userId,
      })),
      initiatedBy: ctx.userId,
    })

    // Optionally auto-approve and process
    if (autoProcess) {
      const processResult = await SettlementEngine.processBatch(
        batch.batchId,
        ctx.userId,
      )

      return NextResponse.json({
        data: batch,
        processing: processResult,
      })
    }

    return NextResponse.json({ data: batch }, { status: 201 })
  } catch (error) {
    console.error('[/api/settlements/batch] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/settlements/batch — Process an existing batch
 * Body: { batchId: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'payments:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { batchId } = body as { batchId: string }

    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId is required' },
        { status: 400 },
      )
    }

    const result = await SettlementEngine.processBatch(batchId, ctx.userId)
    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('[/api/settlements/batch] PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}