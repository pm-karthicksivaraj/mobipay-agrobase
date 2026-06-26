/**
 * Agrobase V3 — Escrow Holding Engine
 * MobiPay AgroSys Limited
 *
 * EscrowEngine manages the full lifecycle of funds held in escrow:
 *   PENDING → HELD → RELEASED / PARTIALLY_RELEASED / REFUNDED / DISPUTED / EXPIRED
 *
 * Integrates with:
 *   - AccountingEngine for double-entry journal entries
 *   - PaymentGateway for actual fund movement
 *   - SettlementEngine (via callback) for payee disbursement
 *
 * Reference format: ESC-{YYYY}-{NNN} (per-tenant, per-year sequential)
 */

import { db } from '@/lib/db'
import { roundMoney } from '@/lib/payments/types'
import { AccountingEngine, type JournalEntryInput } from '@/lib/cooperative/accounting'
import type {
  CreateEscrowRequest,
  ReleaseEscrowRequest,
  RefundEscrowRequest,
  DisputeEscrowRequest,
  EscrowStatus,
  EscrowSummary,
  EscrowListFilter,
  ReleaseCondition,
} from './types'
import { ESCROW_TRANSITIONS } from './types'

// ---------------------------------------------------------------------------
// Chart of Accounts Codes (configurable per-tenant, these are defaults)
// ---------------------------------------------------------------------------

const DEFAULT_ACCOUNTS = {
  ESCROW_RECEIVABLE: '1401',   // Asset: money held in escrow (owed to payee)
  ESCROW_PAYABLE:     '2101',   // Liability: owed to payee on release
  PLATFORM_FEE:       '5101',   // Revenue: platform fee income
  CASH:               '1001',   // Asset: cash / mobile money
  REFUND_EXPENSE:     '5201',   // Expense: refund processing costs
} as const

// ---------------------------------------------------------------------------
// EscrowEngine Class
// ---------------------------------------------------------------------------

export class EscrowEngine {
  // -----------------------------------------------------------------------
  // Reference Generation
  // -----------------------------------------------------------------------

  /**
   * Generate a sequential escrow reference: ESC-2026-001
   * Counts existing escrows for the tenant in the current year.
   */
  static async generateReference(tenantId: string): Promise<string> {
    const year = new Date().getFullYear()
    const count = await db.escrow.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    })
    return `ESC-${year}-${String(count + 1).padStart(3, '0')}`
  }

  // -----------------------------------------------------------------------
  // Create Escrow
  // -----------------------------------------------------------------------

  /**
   * Create a new escrow holding record.
   * Status starts as PENDING — funds have not been confirmed yet.
   * Optionally creates a journal entry for the escrow receivable.
   */
  static async createEscrow(params: CreateEscrowRequest) {
    const reference = await EscrowEngine.generateReference(params.tenantId)
    const feeRate = params.feeRate ?? 0
    const feeAmount = roundMoney((params.amount * feeRate) / 100)

    const escrow = await db.escrow.create({
      data: {
        tenantId: params.tenantId,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        reference,
        payerId: params.payerId ?? null,
        payeeId: params.payeeId ?? null,
        payerName: params.payerName ?? null,
        payeeName: params.payeeName ?? null,
        amount: roundMoney(params.amount),
        currency: params.currency ?? 'UGX',
        feeAmount,
        feeRate,
        status: 'PENDING',
        paymentTxnId: params.paymentTxnId ?? null,
        releaseConditions: params.releaseConditions
          ? JSON.stringify(params.releaseConditions)
          : null,
        autoReleaseAt: params.autoReleaseAt ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })

    console.log(
      `[EscrowEngine] Created escrow ${reference}: ${params.currency ?? 'UGX'} ${roundMoney(params.amount)} (${params.sourceType})`,
    )

    return escrow
  }

  // -----------------------------------------------------------------------
  // Hold Escrow
  // -----------------------------------------------------------------------

  /**
   * Confirm that funds have been received and move escrow to HELD state.
   * Creates a journal entry: DR Escrow Receivable / CR Cash
   */
  static async holdEscrow(escrowId: string, heldBy: string, paymentTxnId?: string) {
    const escrow = await db.escrow.findUnique({ where: { id: escrowId } })

    if (!escrow) {
      throw new Error(`Escrow not found: ${escrowId}`)
    }

    EscrowEngine.validateTransition(escrow.status as EscrowStatus, 'HELD')

    const updated = await db.escrow.update({
      where: { id: escrowId },
      data: {
        status: 'HELD',
        heldAt: new Date(),
        heldBy,
        paymentTxnId: paymentTxnId ?? escrow.paymentTxnId,
      },
    })

    // Create journal entry: DR Escrow Receivable, CR Cash
    try {
      const journalLines: JournalEntryInput[] = [
        {
          accountCode: DEFAULT_ACCOUNTS.ESCROW_RECEIVABLE,
          entryType: 'DEBIT',
          amount: escrow.amount,
          description: `Escrow hold: ${escrow.reference} from ${escrow.payerName ?? 'payer'}`,
        },
        {
          accountCode: DEFAULT_ACCOUNTS.CASH,
          entryType: 'CREDIT',
          amount: escrow.amount,
          description: `Funds received into escrow: ${escrow.reference}`,
        },
      ]

      await AccountingEngine.createJournalEntry(
        escrow.tenantId,
        journalLines,
        `Escrow funded: ${escrow.reference}`,
        escrow.reference,
        heldBy,
      )
    } catch (jeError) {
      // Journal entry failure should not block escrow hold
      console.warn(
        `[EscrowEngine] Journal entry failed for ${escrow.reference}:`,
        jeError instanceof Error ? jeError.message : jeError,
      )
    }

    console.log(`[EscrowEngine] Held escrow ${escrow.reference} by ${heldBy}`)
    return updated
  }

  // -----------------------------------------------------------------------
  // Release Escrow (full or partial)
  // -----------------------------------------------------------------------

  /**
   * Release escrow funds to the payee.
   * Full release: releases (amount - fee) to payee.
   * Partial release: releases specified amount (pro-rata fee deduction).
   * Creates journal entry: DR Escrow Payable / CR Escrow Receivable + DR Cash / CR Escrow Payable + DR Platform Fee / CR Revenue
   * Does NOT execute the actual payment — that is the SettlementEngine's job.
   */
  static async releaseEscrow(params: ReleaseEscrowRequest) {
    const escrow = await db.escrow.findUnique({ where: { id: params.escrowId } })

    if (!escrow) {
      throw new Error(`Escrow not found: ${params.escrowId}`)
    }

    const isFullRelease = !params.amount || params.amount >= escrow.amount - escrow.releasedAmount - escrow.refundedAmount
    const targetStatus: EscrowStatus = isFullRelease ? 'RELEASED' : 'PARTIALLY_RELEASED'

    EscrowEngine.validateTransition(escrow.status as EscrowStatus, targetStatus)

    const releasableAmount = roundMoney(
      escrow.amount - escrow.releasedAmount - escrow.refundedAmount,
    )

    const releaseAmount = isFullRelease
      ? releasableAmount
      : roundMoney(Math.min(params.amount!, releasableAmount))

    // Calculate fee: pro-rata based on percentage of total being released
    const releaseRatio = releaseAmount / escrow.amount
    const feeForThisRelease = roundMoney(escrow.feeAmount * releaseRatio)
    const netReleaseAmount = roundMoney(releaseAmount - feeForThisRelease)
    const newReleasedAmount = roundMoney(escrow.releasedAmount + releaseAmount)

    const updated = await db.escrow.update({
      where: { id: params.escrowId },
      data: {
        status: targetStatus,
        releasedAt: isFullRelease ? new Date() : escrow.releasedAt,
        releasedBy: params.releasedBy,
        releasedAmount: newReleasedAmount,
      },
    })

    // Create journal entry for the release
    try {
      const journalLines: JournalEntryInput[] = [
        // Reduce escrow receivable
        {
          accountCode: DEFAULT_ACCOUNTS.ESCROW_RECEIVABLE,
          entryType: 'CREDIT',
          amount: releaseAmount,
          description: `Release escrow: ${escrow.reference} (${isFullRelease ? 'full' : 'partial'})`,
        },
        // Record escrow payable (owed to payee)
        {
          accountCode: DEFAULT_ACCOUNTS.ESCROW_PAYABLE,
          entryType: 'DEBIT',
          amount: netReleaseAmount,
          description: `Owed to ${escrow.payeeName ?? 'payee'}: ${escrow.reference}`,
        },
      ]

      // Add fee line if there's a fee
      if (feeForThisRelease > 0) {
        journalLines.push({
          accountCode: DEFAULT_ACCOUNTS.PLATFORM_FEE,
          entryType: 'CREDIT',
          amount: feeForThisRelease,
          description: `Platform fee on escrow release: ${escrow.reference}`,
        })
      }

      // Balance the entry: the DR side (escrow payable + fee) must equal CR side (escrow receivable)
      const totalDebit = journalLines
        .filter((l) => l.entryType === 'DEBIT')
        .reduce((s, l) => s + l.amount, 0)
      const totalCredit = journalLines
        .filter((l) => l.entryType === 'CREDIT')
        .reduce((s, l) => s + l.amount, 0)

      // If unbalanced due to fee, add the difference to CASH (DR) to absorb
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        const diff = roundMoney(Math.abs(totalDebit - totalCredit))
        journalLines.push({
          accountCode: DEFAULT_ACCOUNTS.CASH,
          entryType: totalDebit > totalCredit ? 'CREDIT' : 'DEBIT',
          amount: diff,
          description: `Balance adjustment: ${escrow.reference}`,
        })
      }

      await AccountingEngine.createJournalEntry(
        escrow.tenantId,
        journalLines,
        `Escrow release: ${escrow.reference}${params.reason ? ` — ${params.reason}` : ''}`,
        `REL-${escrow.reference}`,
        params.releasedBy,
      )
    } catch (jeError) {
      console.warn(
        `[EscrowEngine] Journal entry failed for release ${escrow.reference}:`,
        jeError instanceof Error ? jeError.message : jeError,
      )
    }

    console.log(
      `[EscrowEngine] ${isFullRelease ? 'Fully' : 'Partially'} released escrow ${escrow.reference}: net ${netReleaseAmount} ${escrow.currency} (fee: ${feeForThisRelease})`,
    )

    return {
      escrow: updated,
      releaseAmount,
      feeAmount: feeForThisRelease,
      netAmount: netReleaseAmount,
      isFullRelease,
    }
  }

  // -----------------------------------------------------------------------
  // Refund Escrow
  // -----------------------------------------------------------------------

  /**
   * Refund escrow funds back to the payer.
   * Creates journal entry: DR Cash / CR Escrow Receivable (reverse the hold).
   */
  static async refundEscrow(params: RefundEscrowRequest) {
    const escrow = await db.escrow.findUnique({ where: { id: params.escrowId } })

    if (!escrow) {
      throw new Error(`Escrow not found: ${params.escrowId}`)
    }

    EscrowEngine.validateTransition(escrow.status as EscrowStatus, 'REFUNDED')

    const refundableAmount = roundMoney(
      escrow.amount - escrow.releasedAmount - escrow.refundedAmount,
    )

    const updated = await db.escrow.update({
      where: { id: params.escrowId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundedBy: params.refundedBy,
        refundedAmount: refundableAmount,
      },
    })

    // Create journal entry: reverse the hold
    try {
      const journalLines: JournalEntryInput[] = [
        {
          accountCode: DEFAULT_ACCOUNTS.CASH,
          entryType: 'DEBIT',
          amount: refundableAmount,
          description: `Refund to ${escrow.payerName ?? 'payer'}: ${escrow.reference}`,
        },
        {
          accountCode: DEFAULT_ACCOUNTS.ESCROW_RECEIVABLE,
          entryType: 'CREDIT',
          amount: refundableAmount,
          description: `Release escrow receivable (refund): ${escrow.reference}`,
        },
      ]

      await AccountingEngine.createJournalEntry(
        escrow.tenantId,
        journalLines,
        `Escrow refund: ${escrow.reference}${params.reason ? ` — ${params.reason}` : ''}`,
        `REF-${escrow.reference}`,
        params.refundedBy,
      )
    } catch (jeError) {
      console.warn(
        `[EscrowEngine] Journal entry failed for refund ${escrow.reference}:`,
        jeError instanceof Error ? jeError.message : jeError,
      )
    }

    console.log(
      `[EscrowEngine] Refunded escrow ${escrow.reference}: ${refundableAmount} ${escrow.currency}`,
    )

    return {
      escrow: updated,
      refundAmount: refundableAmount,
    }
  }

  // -----------------------------------------------------------------------
  // Dispute Escrow
  // -----------------------------------------------------------------------

  /**
   * Flag an escrow as disputed. Halts any automatic release.
   */
  static async disputeEscrow(params: DisputeEscrowRequest) {
    const escrow = await db.escrow.findUnique({ where: { id: params.escrowId } })

    if (!escrow) {
      throw new Error(`Escrow not found: ${params.escrowId}`)
    }

    EscrowEngine.validateTransition(escrow.status as EscrowStatus, 'DISPUTED')

    const updated = await db.escrow.update({
      where: { id: params.escrowId },
      data: {
        status: 'DISPUTED',
        disputedAt: new Date(),
        disputedBy: params.disputedBy,
        disputeReason: params.reason,
      },
    })

    console.log(`[EscrowEngine] Disputed escrow ${escrow.reference}: ${params.reason}`)
    return updated
  }

  // -----------------------------------------------------------------------
  // Expire Escrows
  // -----------------------------------------------------------------------

  /**
   * Find and expire all HELD escrows past their autoReleaseAt date.
   * Called by a scheduled job / cron.
   * Expired escrows are NOT auto-refunded — they require manual review.
   * Returns count of expired escrows.
   */
  static async expireOverdueEscrows(): Promise<number> {
    const now = new Date()

    const expiredEscrows = await db.escrow.findMany({
      where: {
        status: 'HELD',
        autoReleaseAt: { lt: now },
      },
    })

    if (expiredEscrows.length === 0) return 0

    const ids = expiredEscrows.map((e) => e.id)

    await db.escrow.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'EXPIRED',
      },
    })

    console.log(
      `[EscrowEngine] Expired ${expiredEscrows.length} overdue escrow(s)`,
    )

    return expiredEscrows.length
  }

  // -----------------------------------------------------------------------
  // Query: Get Escrow
  // -----------------------------------------------------------------------

  /**
   * Get a single escrow with its settlements.
   */
  static async getEscrow(escrowId: string, tenantId?: string) {
    const where: Record<string, unknown> = { id: escrowId }
    if (tenantId) where.tenantId = tenantId

    return db.escrow.findFirst({
      where,
      include: {
        paymentTxn: true,
        settlements: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  // -----------------------------------------------------------------------
  // Query: List Escrows
  // -----------------------------------------------------------------------

  /**
   * List escrows with filtering and pagination.
   */
  static async listEscrows(filter: EscrowListFilter) {
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
    if (filter.payerId) {
      where.payerId = filter.payerId
    }
    if (filter.payeeId) {
      where.payeeId = filter.payeeId
    }
    if (filter.startDate || filter.endDate) {
      const dateFilter: Record<string, unknown> = {}
      if (filter.startDate) dateFilter.gte = filter.startDate
      if (filter.endDate) dateFilter.lte = filter.endDate
      where.createdAt = dateFilter
    }

    const [data, total] = await Promise.all([
      db.escrow.findMany({
        where,
        skip,
        take: limit,
        include: {
          settlements: {
            select: { id: true, status: true, netAmount: true, currency: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.escrow.count({ where }),
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

  /**
   * Get aggregate escrow statistics for a tenant.
   */
  static async getSummary(tenantId: string): Promise<EscrowSummary> {
    const escrows = await db.escrow.findMany({
      where: { tenantId },
      select: {
        status: true,
        amount: true,
        releasedAmount: true,
        refundedAmount: true,
        feeAmount: true,
        currency: true,
      },
    })

    const summary: EscrowSummary = {
      totalEscrows: escrows.length,
      pendingCount: 0,
      heldCount: 0,
      releasedCount: 0,
      disputedCount: 0,
      expiredCount: 0,
      refundedCount: 0,
      totalHeldAmount: 0,
      totalReleasedAmount: 0,
      totalRefundedAmount: 0,
      totalFeesCollected: 0,
      currency: 'UGX',
    }

    for (const e of escrows) {
      summary.currency = e.currency
      switch (e.status) {
        case 'PENDING':
          summary.pendingCount++
          summary.totalHeldAmount += e.amount
          break
        case 'HELD':
          summary.heldCount++
          summary.totalHeldAmount += e.amount
          break
        case 'RELEASED':
        case 'PARTIALLY_RELEASED':
          summary.releasedCount++
          summary.totalReleasedAmount += e.releasedAmount
          summary.totalFeesCollected += e.feeAmount * (e.releasedAmount / e.amount)
          break
        case 'REFUNDED':
          summary.refundedCount++
          summary.totalRefundedAmount += e.refundedAmount
          break
        case 'DISPUTED':
          summary.disputedCount++
          summary.totalHeldAmount += e.amount - e.releasedAmount - e.refundedAmount
          break
        case 'EXPIRED':
          summary.expiredCount++
          break
      }
    }

    // Round all monetary values
    summary.totalHeldAmount = roundMoney(summary.totalHeldAmount)
    summary.totalReleasedAmount = roundMoney(summary.totalReleasedAmount)
    summary.totalRefundedAmount = roundMoney(summary.totalRefundedAmount)
    summary.totalFeesCollected = roundMoney(summary.totalFeesCollected)

    return summary
  }

  // -----------------------------------------------------------------------
  // Internal Helpers
  // -----------------------------------------------------------------------

  /**
   * Validate that a status transition is allowed.
   * @throws Error if transition is invalid
   */
  private static validateTransition(
    current: EscrowStatus,
    target: EscrowStatus,
  ): void {
    const allowed = ESCROW_TRANSITIONS[current] ?? []

    if (!allowed.includes(target)) {
      throw new Error(
        `Invalid escrow transition: ${current} → ${target}. Allowed: ${allowed.join(', ') || 'none (terminal)'}`,
      )
    }
  }
}