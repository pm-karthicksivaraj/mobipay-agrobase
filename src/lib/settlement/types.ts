/**
 * Agrobase V3 — Settlement Engine Types
 * MobiPay AgroSys Limited
 *
 * Type definitions for the settlement (disbursement) engine.
 * Settlements are the actual payment executions that release held funds
 * to beneficiaries via mobile money, bank transfer, or cash.
 */

import type { PaymentProvider } from '@/lib/payments/types'

// ---------------------------------------------------------------------------
// Enums / Union types
// ---------------------------------------------------------------------------

/** Source types that can generate a settlement */
export type SettlementSourceType =
  | 'ESCROW'
  | 'COOPERATIVE_PAYMENT'
  | 'COMMISSION'
  | 'MARKETPLACE_PAYOUT'
  | 'VSLA_WITHDRAWAL'
  | 'LOAN_DISBURSEMENT'

/** Settlement lifecycle states */
export type SettlementStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED'

/** Valid transitions between settlement statuses */
export const SETTLEMENT_TRANSITIONS: Record<SettlementStatus, SettlementStatus[]> = {
  PENDING:    ['APPROVED', 'FAILED'],
  APPROVED:   ['PROCESSING', 'FAILED'],
  PROCESSING: ['COMPLETED', 'FAILED', 'REVERSED'],
  COMPLETED:  ['REVERSED'],
  FAILED:     [],
  REVERSED:   [],
}

/** Payment methods for settlement execution */
export type SettlementPaymentMethod =
  | 'MOBILE_MONEY'
  | 'BANK'
  | 'CASH'
  | 'WALLET'

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

/** Parameters for creating a single settlement */
export interface CreateSettlementRequest {
  tenantId: string
  sourceType: SettlementSourceType
  sourceId?: string
  escrowId?: string
  beneficiaryId?: string
  beneficiaryName: string
  beneficiaryPhone: string
  grossAmount: number
  deductions?: number       // fees, taxes, penalties
  currency?: string
  paymentMethod?: SettlementPaymentMethod
  provider?: PaymentProvider
  metadata?: Record<string, unknown>
  initiatedBy: string
}

/** Parameters for approving a settlement */
export interface ApproveSettlementRequest {
  settlementId: string
  approvedBy: string
}

/** Parameters for processing (executing) a settlement */
export interface ProcessSettlementRequest {
  settlementId: string
  provider?: PaymentProvider     // override default
  initiatedBy: string
}

/** Parameters for creating a batch of settlements */
export interface CreateBatchSettlementRequest {
  tenantId: string
  settlements: CreateSettlementRequest[]
  initiatedBy: string
}

/** Result of a batch settlement creation */
export interface BatchSettlementResult {
  batchId: string
  batchReference: string
  totalSettlements: number
  totalGrossAmount: number
  totalDeductions: number
  totalNetAmount: number
  currency: string
  settlements: Array<{
    id: string
    reference: string
    beneficiaryName: string
    netAmount: number
    status: string
  }>
}

/** Summary statistics for settlements */
export interface SettlementSummary {
  totalSettlements: number
  pendingCount: number
  approvedCount: number
  processingCount: number
  completedCount: number
  failedCount: number
  reversedCount: number
  totalGrossAmount: number
  totalNetAmount: number
  totalDeductions: number
  currency: string
}

/** Filter parameters for listing settlements */
export interface SettlementListFilter {
  tenantId: string
  status?: SettlementStatus | SettlementStatus[]
  sourceType?: SettlementSourceType
  beneficiaryId?: string
  batchId?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}