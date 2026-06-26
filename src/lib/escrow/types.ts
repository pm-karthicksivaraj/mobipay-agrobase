/**
 * Agrobase V3 — Escrow Engine Types
 * MobiPay AgroSys Limited
 *
 * Type definitions for the escrow holding engine.
 * Supports marketplace transactions, produce purchases, consignment sales,
 * and cooperative payments with conditional release logic.
 */

// ---------------------------------------------------------------------------
// Enums / Union types
// ---------------------------------------------------------------------------

/** Source transaction types that can create an escrow */
export type EscrowSourceType =
  | 'SALE'
  | 'PURCHASE'
  | 'CONSIGNMENT'
  | 'MARKETPLACE_ORDER'
  | 'CONTRACT_FULFILLMENT'
  | 'LOAN_COLLATERAL'

/** Escrow lifecycle states */
export type EscrowStatus =
  | 'PENDING'
  | 'HELD'
  | 'RELEASED'
  | 'PARTIALLY_RELEASED'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'EXPIRED'

/** Valid transitions between escrow statuses */
export const ESCROW_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  PENDING:            ['HELD', 'DISPUTED', 'EXPIRED', 'REFUNDED'],
  HELD:               ['RELEASED', 'PARTIALLY_RELEASED', 'DISPUTED', 'REFUNDED'],
  PARTIALLY_RELEASED: ['RELEASED', 'DISPUTED', 'REFUNDED'],
  DISPUTED:           ['RELEASED', 'PARTIALLY_RELEASED', 'REFUNDED'],
  RELEASED:           [],
  REFUNDED:           [],
  EXPIRED:            [],
}

/** Release condition types */
export type ReleaseConditionType =
  | 'delivery_confirmation'
  | 'quality_inspection'
  | 'manual_approval'
  | 'date_based'
  | 'milestone'
  | 'document_upload'

/** Release condition structure stored as JSON in escrow.releaseConditions */
export interface ReleaseCondition {
  type: ReleaseConditionType
  deliveryId?: string
  milestoneIndex?: number
  documentType?: string
  requiredDocuments?: string[]
  autoReleaseAt?: string  // ISO date
  description?: string
}

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

/** Parameters for creating a new escrow */
export interface CreateEscrowRequest {
  tenantId: string
  sourceType: EscrowSourceType
  sourceId: string
  payerId?: string
  payerName?: string
  payeeId?: string
  payeeName?: string
  payeePhone?: string
  amount: number
  currency?: string
  feeRate?: number           // platform fee %, e.g. 2.5
  releaseConditions?: ReleaseCondition
  autoReleaseAt?: Date
  paymentTxnId?: string      // link to the PaymentTransaction that funded it
  metadata?: Record<string, unknown>
  createdBy: string
}

/** Parameters for releasing (full or partial) an escrow */
export interface ReleaseEscrowRequest {
  escrowId: string
  amount?: number            // omit = full release
  releasedBy: string
  reason?: string
}

/** Parameters for refunding an escrow */
export interface RefundEscrowRequest {
  escrowId: string
  refundedBy: string
  reason?: string
}

/** Parameters for disputing an escrow */
export interface DisputeEscrowRequest {
  escrowId: string
  disputedBy: string
  reason: string
}

/** Summary statistics for a tenant's escrow portfolio */
export interface EscrowSummary {
  totalEscrows: number
  pendingCount: number
  heldCount: number
  releasedCount: number
  disputedCount: number
  expiredCount: number
  refundedCount: number
  totalHeldAmount: number
  totalReleasedAmount: number
  totalRefundedAmount: number
  totalFeesCollected: number
  currency: string
}

/** Filter parameters for listing escrows */
export interface EscrowListFilter {
  tenantId: string
  status?: EscrowStatus | EscrowStatus[]
  sourceType?: EscrowSourceType
  payerId?: string
  payeeId?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}