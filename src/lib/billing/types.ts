/**
 * Agrobase V3 — Billing Types
 * MobiPay AgroSys Limited
 *
 * Type definitions for plan management, invoicing, and billing cycles.
 */

// ---------------------------------------------------------------------------
// Plan Types
// ---------------------------------------------------------------------------

/** Subscription plan tiers */
export type PlanType = 'FREE' | 'BASIC' | 'STANDARD' | 'ENTERPRISE' | 'CUSTOM'

/** Billing frequency */
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'

/** Invoice lifecycle status */
export type InvoiceStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'PARTIALLY_PAID'

// ---------------------------------------------------------------------------
// Plan Configuration
// ---------------------------------------------------------------------------

/** Full definition of a subscription plan */
export interface PlanConfig {
  name: string
  type: PlanType
  priceMonthly: number       // USD per month
  priceAnnual: number        // USD per month when billed annually (discounted)
  currency: string
  maxUsers: number
  maxFarmers: number
  includedModules: string[]
  features: Record<string, boolean>
}

// ---------------------------------------------------------------------------
// Invoice Types
// ---------------------------------------------------------------------------

/** A single line item on an invoice */
export interface InvoiceItem {
  description: string
  amount: number
  quantity: number
  total: number
}

/** Complete invoice data ready for display or storage */
export interface InvoiceData {
  invoiceNumber: string
  tenantId: string
  planType: PlanType
  billingCycle: BillingCycle
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  dueDate: Date
  status: InvoiceStatus
}

// ---------------------------------------------------------------------------
// Billing Summary
// ---------------------------------------------------------------------------

/** Usage metrics for a billing period */
export interface UsageMetrics {
  farmerCount: number
  userCount: number
  apiCalls: number
  smsSent: number
  storageUsedMb: number
}

/** Overage details for billing */
export interface OverageDetail {
  metric: string
  limit: number
  actual: number
  overage: number
  unitPrice: number
  charge: number
}

/** Full billing dashboard summary */
export interface BillingSummary {
  plan: PlanType
  cycle: BillingCycle
  status: string               // ACTIVE, PAST_DUE, TRIAL, CANCELLED
  currentPeriodStart: Date
  currentPeriodEnd: Date
  daysRemaining: number
  usage: UsageMetrics
  limits: UsageMetrics
  overages: OverageDetail[]
  nextInvoiceDate: Date
  outstandingBalance: number
  totalPaidThisPeriod: number
}

// ---------------------------------------------------------------------------
// Subscription Change
// ---------------------------------------------------------------------------

/** Represents a plan change with proration details */
export interface PlanChangeResult {
  previousPlan: PlanType
  newPlan: PlanType
  prorationCredit: number
  prorationCharge: number
  netAmountDue: number
  effectiveDate: Date
  nextBillingDate: Date
}

// ---------------------------------------------------------------------------
// Dunning
// ---------------------------------------------------------------------------

/** Dunning (payment reminder) configuration */
export interface DunningConfig {
  /** Days after due date for each reminder */
  reminderDays: number[]
  /** Whether to suspend access after final reminder */
  suspendAfterFinal: boolean
  /** Days of grace before suspension */
  gracePeriodDays: number
}

/** A dunning reminder record */
export interface DunningReminder {
  invoiceId: string
  invoiceNumber: string
  tenantId: string
  reminderNumber: number
  sentAt: Date
  daysOverdue: number
  outstandingAmount: number
}