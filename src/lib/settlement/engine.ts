/**
 * Agrobase V3 — Settlement (Disbursement) Engine
 * MobiPay AgroSys Limited
 *
 * SettlementEngine handles the actual payment execution to beneficiaries:
 *   PENDING → APPROVED → PROCESSING → COMPLETED / FAILED / REVERSED
 *
 * Integrates with:
 *   - PaymentGateway for executing mobile money / bank transfers
 *   - AccountingEngine for double-entry journal entries on completion
 *   - EscrowEngine (escrow.releaseEscrow triggers settlement creation)
 *
 * Reference format: SET-{YYYY}-{NNN} (per-tenant, per-year sequential)
 * Batch reference format: BAT-{YYYY}-{NNN}
 */

import { db } from '@/lib/db'
import { roundMoney } from '@/lib/payments/types'
import { PaymentGateway } from '@/lib/payments/gateway'
import type { PaymentRequest, PaymentProvider } from '@/lib/payments/types'
import { AccountingEngine, type JournalEntryInput } from '@/lib/cooperative/accounting'
import type {
  CreateSettlementRequest,
  ApproveSettlementRequest,
  ProcessSettlementRequest,
  CreateBatchSettlementRequest,
  BatchSettlementResult,
  SettlementStatus,
  SettlementSummary,
  SettlementListFilter,
  SettlementPaymentMethod,
} from './types'
import { SETTLEMENT_TRANSITIONS } from './types'

// ---------------------------------------------------------------------------
// Chart of Accounts Codes (defaults)
// ---------------------------------------------------------------------------

const DEFAULT_ACCOUNTS = {
  SETTLEMENTS_PAYABLE: '2102',   // Liability: amounts owed to beneficiaries
  CASH:                  '1001',  // Asset: cash / mobile money
  BANK_CHARGES:          '5202',  // Expense: bank / mobile money charges
} as const

// ---------------------------------------------------------------------------
// SettlementEngine Class
// ---------------------------------------------------------------------------

export class SettlementEngine {
  // -----------------------------------------------------------------------
  // Reference Generation
  // -----------------------------------------------------------------------

  /**
   * Generate a sequential settlement reference: SET-2026-001
   */
  static async generateReference(tenantId: string): Promise<string> {
    const year = new Date().getFullYear()
    const count = await db.settlement.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    })
    return `SET-${year}-${String(count + 1).padStart(3, '0')}`
  }

  /**
   * Generate a sequential batch reference: BAT-2026-001
   */
  static async generateBatchReference(tenantId: string): Promise<string> {
    const year = new Date().getFullYear()
    const batchId = `BAT-${year}-${Date.now()}`
    // Count existing batches this year to determine sequence number
    const existingBatches = await db.settlement.groupBy({
      by: ['batchId'],
      where: {
        tenantId,
        batchId: { not: null },
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    })
    const seq = existingBatches.length + 1
    return `BAT-${year}-${String(seq).padStart(3, '0')}`
  }

  // -----------------------------------------------------------------------
  // Create Settlement
  // -----------------------------------------------------------------------

  /**
   * Create a single settlement record in PENDING state.
   * Net amount = gross - deductions.
   */
  static async createSettlement(params: CreateSettlementRequest) {
    const reference = await SettlementEngine.generateReference(params.tenantId)
    const deductions = params.deductions ?? 0
    const netAmount = roundMoney(params.grossAmount - deductions)
    const currency = params.currency ?? 'UGX'

    const settlement = await db.settlement.create({
      data: {
        tenantId: params.tenantId,
        sourceType: params.sourceType,
        sourceId: params.sourceId ?? null,
        escrowId: params.escrowId ?? null,
        reference,
        beneficiaryId: params.beneficiaryId ?? null,
        beneficiaryName: params.beneficiaryName,
        beneficiaryPhone: params.beneficiaryPhone,
        grossAmount: roundMoney(params.grossAmount),
        deductions: roundMoney(deductions),
        netAmount,
        currency,
        paymentMethod: params.paymentMethod ?? 'MOBILE_MONEY',
        status: 'PENDING',
        initiatedBy: params.initiatedBy,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })

    console.log(
      `[SettlementEngine] Created settlement ${reference}: ${currency} ${netAmount} → ${params.beneficiaryName} (${params.beneficiaryPhone})`,
    )

    return settlement
  }

  // -----------------------------------------------------------------------
  // Create from Escrow Release
  // -----------------------------------------------------------------------

  /**
   * Convenience: create a settlement directly from an escrow release.
   * Used by EscrowEngine callers after releaseEscrow().
   */
  static async createFromEscrow(
    escrowId: string,
    netAmount: number,
    feeAmount: number,
    releasedBy: string,
  ) {
    const escrow = await db.escrow.findUnique({ where: { id: escrowId } })
    if (!escrow) {
      throw new Error(`Escrow not found: ${escrowId}`)
    }

    return SettlementEngine.createSettlement({
      tenantId: escrow.tenantId,
      sourceType: 'ESCROW',
      sourceId: escrowId,
      escrowId: escrow.id,
      beneficiaryId: escrow.payeeId ?? undefined,
      beneficiaryName: escrow.payeeName ?? 'Unknown',
      beneficiaryPhone: escrow.metadata
        ? (JSON.parse(escrow.metadata) as Record<string, string>)?.payeePhone ?? ''
        : '',
      grossAmount: netAmount + feeAmount,
      deductions: feeAmount,
      currency: escrow.currency,
      initiatedBy: releasedBy,
    })
  }

  // -----------------------------------------------------------------------
  // Approve Settlement
  // -----------------------------------------------------------------------

  /**
   * Approve a settlement for processing.
   * Required before actual payment execution.
   */
  static async approveSettlement(params: ApproveSettlementRequest) {
    const settlement = await db.settlement.findUnique({
      where: { id: params.settlementId },
    })

    if (!settlement) {
      throw new Error(`Settlement not found: ${params.settlementId}`)
    }

    SettlementEngine.validateTransition(
      settlement.status as SettlementStatus,
      'APPROVED',
    )

    const updated = await db.settlement.update({
      where: { id: params.settlementId },
      data: {
        status: 'APPROVED',
        approvedBy: params.approvedBy,
        approvedAt: new Date(),
      },
    })

    console.log(
      `[SettlementEngine] Approved settlement ${settlement.reference} by ${params.approvedBy}`,
    )

    return updated
  }

  // -----------------------------------------------------------------------
  // Process (Execute) Settlement
  // -----------------------------------------------------------------------

  /**
   * Execute a settlement by sending funds via PaymentGateway.
   * APPROVED → PROCESSING → COMPLETED / FAILED
   * Creates a PaymentTransaction and links it.
   * On completion, creates a journal entry.
   */
  static async processSettlement(params: ProcessSettlementRequest) {
    const settlement = await db.settlement.findUnique({
      where: { id: params.settlementId },
    })

    if (!settlement) {
      throw new Error(`Settlement not found: ${params.settlementId}`)
    }

    SettlementEngine.validateTransition(
      settlement.status as SettlementStatus,
      'PROCESSING',
    )

    // Move to PROCESSING
    await db.settlement.update({
      where: { id: params.settlementId },
      data: {
        status: 'PROCESSING',
        initiatedAt: new Date(),
        initiatedBy: params.initiatedBy,
      },
    })

    // Determine provider
    const provider = params.provider ?? SettlementEngine.resolveProvider(
      settlement.tenantId,
      settlement.currency,
    )

    // Execute via PaymentGateway
    const paymentRequest: PaymentRequest = {
      provider,
      type: 'FARMER_PAYMENT',
      amount: settlement.netAmount,
      currency: settlement.currency,
      recipientPhone: settlement.beneficiaryPhone ?? '',
      recipientName: settlement.beneficiaryName ?? '',
      description: `Settlement ${settlement.reference}`,
      reference: `STL-${settlement.reference}`,
      tenantId: settlement.tenantId,
      userId: params.initiatedBy,
      metadata: {
        settlementId: settlement.id,
        settlementReference: settlement.reference,
        sourceType: settlement.sourceType,
        batchId: settlement.batchId,
      },
    }

    let paymentResult
    try {
      paymentResult = await PaymentGateway.initiatePayment(paymentRequest)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment initiation failed'

      const failed = await db.settlement.update({
        where: { id: params.settlementId },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: message,
        },
      })

      console.error(
        `[SettlementEngine] Payment failed for ${settlement.reference}: ${message}`,
      )

      return { settlement: failed, success: false, error: message }
    }

    // Link PaymentTransaction
    if (paymentResult.transactionId) {
      await db.settlement.update({
        where: { id: params.settlementId },
        data: { paymentTxnId: paymentResult.transactionId },
      })
    }

    // If completed synchronously, update and create journal entry
    if (paymentResult.status === 'COMPLETED') {
      const completed = await db.settlement.update({
        where: { id: params.settlementId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })

      // Journal entry: DR Settlements Payable, CR Cash
      try {
        const journalLines: JournalEntryInput[] = [
          {
            accountCode: DEFAULT_ACCOUNTS.SETTLEMENTS_PAYABLE,
            entryType: 'DEBIT',
            amount: settlement.netAmount,
            description: `Settlement to ${settlement.beneficiaryName}: ${settlement.reference}`,
          },
          {
            accountCode: DEFAULT_ACCOUNTS.CASH,
            entryType: 'CREDIT',
            amount: settlement.netAmount,
            description: `Payment sent via ${provider}: ${settlement.reference}`,
          },
        ]

        const journal = await AccountingEngine.createJournalEntry(
          settlement.tenantId,
          journalLines,
          `Settlement completed: ${settlement.reference}`,
          settlement.reference,
          params.initiatedBy,
        )

        // Link journal entry to settlement
        await db.settlement.update({
          where: { id: params.settlementId },
          data: { journalEntryId: journal.id },
        })
      } catch (jeError) {
        console.warn(
          `[SettlementEngine] Journal entry failed for ${settlement.reference}:`,
          jeError instanceof Error ? jeError.message : jeError,
        )
      }

      console.log(
        `[SettlementEngine] Completed settlement ${settlement.reference}: ${settlement.currency} ${settlement.netAmount}`,
      )

      return { settlement: completed, success: true }
    }

    // Still processing (async providers like MTN MoMo)
    console.log(
      `[SettlementEngine] Settlement ${settlement.reference} processing via ${provider} (async)`,
    )

    return {
      settlement: await db.settlement.findUnique({ where: { id: params.settlementId } }),
      success: true,
      async: true,
      providerRef: paymentResult.providerRef,
    }
  }

  // -----------------------------------------------------------------------
  // Fail Settlement
  // -----------------------------------------------------------------------

  /**
   * Mark a settlement as failed (e.g., after callback reports failure).
   */
  static async failSettlement(
    settlementId: string,
    reason: string,
  ) {
    const settlement = await db.settlement.findUnique({
      where: { id: settlementId },
    })

    if (!settlement) {
      throw new Error(`Settlement not found: ${settlementId}`)
    }

    SettlementEngine.validateTransition(
      settlement.status as SettlementStatus,
      'FAILED',
    )

    const updated = await db.settlement.update({
      where: { id: settlementId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: reason,
      },
    })

    console.log(
      `[SettlementEngine] Failed settlement ${settlement.reference}: ${reason}`,
    )

    return updated
  }

  // -----------------------------------------------------------------------
  // Reverse Settlement
  // -----------------------------------------------------------------------

  /**
   * Reverse a completed settlement (creates reversal journal entry).
   * The actual payment reversal must be handled externally or via provider API.
   */
  static async reverseSettlement(
    settlementId: string,
    reason: string,
    reversedBy: string,
  ) {
    const settlement = await db.settlement.findUnique({
      where: { id: settlementId },
      include: { journalEntry: true },
    })

    if (!settlement) {
      throw new Error(`Settlement not found: ${settlementId}`)
    }

    SettlementEngine.validateTransition(
      settlement.status as SettlementStatus,
      'REVERSED',
    )

    // Reverse the journal entry if one exists
    if (settlement.journalEntryId && settlement.journalEntry) {
      try {
        await AccountingEngine.reverseJournalEntry(
          settlement.journalEntryId,
          reason,
        )
      } catch (jeError) {
        console.warn(
          `[SettlementEngine] Journal reversal failed for ${settlement.reference}:`,
          jeError instanceof Error ? jeError.message : jeError,
        )
      }
    }

    const updated = await db.settlement.update({
      where: { id: settlementId },
      data: {
        status: 'REVERSED',
        metadata: settlement.metadata
          ? JSON.stringify({
              ...(JSON.parse(settlement.metadata) as Record<string, unknown>),
              reversalReason: reason,
              reversedBy,
              reversedAt: new Date().toISOString(),
            })
          : JSON.stringify({ reversalReason: reason, reversedBy }),
      },
    })

    console.log(
      `[SettlementEngine] Reversed settlement ${settlement.reference}: ${reason}`,
    )

    return updated
  }

  // -----------------------------------------------------------------------
  // Batch Settlement Creation
  // -----------------------------------------------------------------------

  /**
   * Create a batch of settlements from multiple settlement requests.
   * All settlements share a batchId and batchReference.
   * Returns a batch summary.
   */
  static async createBatchSettlement(
    params: CreateBatchSettlementRequest,
  ): Promise<BatchSettlementResult> {
    const batchReference = await SettlementEngine.generateBatchReference(
      params.tenantId,
    )
    const batchId = `batch-${Date.now()}`

    const results: BatchSettlementResult['settlements'] = []
    let totalGross = 0
    let totalDeductions = 0
    let totalNet = 0
    let currency = 'UGX'

    for (const req of params.settlements) {
      try {
        const settlement = await SettlementEngine.createSettlement({
          ...req,
          tenantId: params.tenantId,
          initiatedBy: params.initiatedBy,
        })

        // Assign batch IDs
        await db.settlement.update({
          where: { id: settlement.id },
          data: {
            batchId,
            batchReference,
          },
        })

        results.push({
          id: settlement.id,
          reference: settlement.reference,
          beneficiaryName: settlement.beneficiaryName ?? '',
          netAmount: settlement.netAmount,
          status: settlement.status,
        })

        totalGross += settlement.grossAmount
        totalDeductions += settlement.deductions
        totalNet += settlement.netAmount
        currency = settlement.currency
      } catch (error) {
        console.error(
          `[SettlementEngine] Failed to create settlement in batch:`,
          error instanceof Error ? error.message : error,
        )
      }
    }

    const result: BatchSettlementResult = {
      batchId,
      batchReference,
      totalSettlements: results.length,
      totalGrossAmount: roundMoney(totalGross),
      totalDeductions: roundMoney(totalDeductions),
      totalNetAmount: roundMoney(totalNet),
      currency,
      settlements: results,
    }

    console.log(
      `[SettlementEngine] Created batch ${batchReference}: ${results.length} settlements, ${currency} ${roundMoney(totalNet)}`,
    )

    return result
  }

  // -----------------------------------------------------------------------
  // Process Batch (approve + execute all in batch)
  // -----------------------------------------------------------------------

  /**
   * Approve and process all PENDING settlements in a batch.
   * Processes sequentially to respect provider rate limits.
   * Returns per-settlement results.
   */
  static async processBatch(
    batchId: string,
    approvedBy: string,
  ) {
    const settlements = await db.settlement.findMany({
      where: {
        batchId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
    })

    if (settlements.length === 0) {
      return { batchId, processed: 0, succeeded: 0, failed: 0, results: [] }
    }

    const results: Array<{
      settlementId: string
      reference: string
      success: boolean
      error?: string
    }> = []

    let succeeded = 0
    let failed = 0

    for (const settlement of settlements) {
      try {
        // Approve
        await SettlementEngine.approveSettlement({
          settlementId: settlement.id,
          approvedBy,
        })

        // Process
        const result = await SettlementEngine.processSettlement({
          settlementId: settlement.id,
          initiatedBy: approvedBy,
        })

        if (result.success) {
          succeeded++
          results.push({
            settlementId: settlement.id,
            reference: settlement.reference,
            success: true,
          })
        } else {
          failed++
          results.push({
            settlementId: settlement.id,
            reference: settlement.reference,
            success: false,
            error: result.error,
          })
        }
      } catch (error) {
        failed++
        results.push({
          settlementId: settlement.id,
          reference: settlement.reference,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      // Delay between settlements to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    console.log(
      `[SettlementEngine] Batch ${batchId} processed: ${succeeded}/${settlements.length} succeeded`,
    )

    return {
      batchId,
      processed: settlements.length,
      succeeded,
      failed,
      results,
    }
  }

  // -----------------------------------------------------------------------
  // Query: Get Settlement
  // -----------------------------------------------------------------------

  static async getSettlement(settlementId: string, tenantId?: string) {
    const where: Record<string, unknown> = { id: settlementId }
    if (tenantId) where.tenantId = tenantId

    return db.settlement.findFirst({
      where,
      include: {
        escrow: { select: { id: true, reference: true, sourceType: true } },
        paymentTxn: { select: { id: true, provider: true, status: true, providerTxnRef: true } },
        journalEntry: { select: { id: true, status: true, reference: true } },
      },
    })
  }

  // -----------------------------------------------------------------------
  // Query: List Settlements
  // -----------------------------------------------------------------------

  static async listSettlements(filter: SettlementListFilter) {
    const page = filter.page ?? 1
    const limit = filter.limit ?? 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { tenantId: filter.tenantId }

    if (filter.status) {
      where.status = Array.isArray(filter.status) ? { in: filter.status } : filter.status
    }
    if (filter.sourceType) {
      where.sourceType = filter.sourceType
    }
    if (filter.beneficiaryId) {
      where.beneficiaryId = filter.beneficiaryId
    }
    if (filter.batchId) {
      where.batchId = filter.batchId
    }
    if (filter.startDate || filter.endDate) {
      const dateFilter: Record<string, unknown> = {}
      if (filter.startDate) dateFilter.gte = filter.startDate
      if (filter.endDate) dateFilter.lte = filter.endDate
      where.createdAt = dateFilter
    }

    const [data, total] = await Promise.all([
      db.settlement.findMany({
        where,
        skip,
        take: limit,
        include: {
          escrow: { select: { id: true, reference: true } },
          paymentTxn: { select: { id: true, provider: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.settlement.count({ where }),
    ])

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  // -----------------------------------------------------------------------
  // Query: Summary Statistics
  // -----------------------------------------------------------------------

  static async getSummary(tenantId: string): Promise<SettlementSummary> {
    const settlements = await db.settlement.findMany({
      where: { tenantId },
      select: {
        status: true,
        grossAmount: true,
        netAmount: true,
        deductions: true,
        currency: true,
      },
    })

    const summary: SettlementSummary = {
      totalSettlements: settlements.length,
      pendingCount: 0,
      approvedCount: 0,
      processingCount: 0,
      completedCount: 0,
      failedCount: 0,
      reversedCount: 0,
      totalGrossAmount: 0,
      totalNetAmount: 0,
      totalDeductions: 0,
      currency: 'UGX',
    }

    for (const s of settlements) {
      summary.currency = s.currency
      switch (s.status) {
        case 'PENDING':
          summary.pendingCount++
          break
        case 'APPROVED':
          summary.approvedCount++
          break
        case 'PROCESSING':
          summary.processingCount++
          summary.totalNetAmount += s.netAmount
          break
        case 'COMPLETED':
          summary.completedCount++
          summary.totalGrossAmount += s.grossAmount
          summary.totalNetAmount += s.netAmount
          summary.totalDeductions += s.deductions
          break
        case 'FAILED':
          summary.failedCount++
          break
        case 'REVERSED':
          summary.reversedCount++
          break
      }
    }

    summary.totalGrossAmount = roundMoney(summary.totalGrossAmount)
    summary.totalNetAmount = roundMoney(summary.totalNetAmount)
    summary.totalDeductions = roundMoney(summary.totalDeductions)

    return summary
  }

  // -----------------------------------------------------------------------
  // Internal Helpers
  // -----------------------------------------------------------------------

  /**
   * Resolve the default payment provider based on tenant's country/currency.
   */
  private static resolveProvider(
    tenantId: string,
    currency: string,
  ): PaymentProvider {
    switch (currency) {
      case 'UGX':
        return 'mpay'
      case 'GHS':
        return 'aintel'
      case 'KES':
        return 'mpesa'
      default:
        return 'mpay'
    }
  }

  /**
   * Validate that a status transition is allowed.
   */
  private static validateTransition(
    current: SettlementStatus,
    target: SettlementStatus,
  ): void {
    const allowed = SETTLEMENT_TRANSITIONS[current] ?? []

    if (!allowed.includes(target)) {
      throw new Error(
        `Invalid settlement transition: ${current} → ${target}. Allowed: ${allowed.join(', ') || 'none (terminal)'}`,
      )
    }
  }
}