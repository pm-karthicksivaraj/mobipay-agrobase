/**
 * Agrobase V3 — Payment Gateway Types
 * MobiPay AgroSys Limited
 *
 * Core type definitions for the multi-provider payment gateway framework.
 * Supports mobile money, bank transfers, and manual payment reconciliation
 * across Uganda (UGX), Ghana (GHS), and Kenya (KES).
 */

// ---------------------------------------------------------------------------
// Enums / Union types
// ---------------------------------------------------------------------------

/** Supported payment gateway providers */
export type PaymentProvider =
  | 'mpay'
  | 'aintel'
  | 'mtn_momo'
  | 'mpesa'
  | 'bank_transfer'
  | 'manual'

/** Lifecycle status of a payment transaction */
export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'

/** Semantic payment type used for categorisation & accounting */
export type PaymentType =
  | 'FARMER_PAYMENT'
  | 'BULK_DISBURSEMENT'
  | 'MARKETPLACE_PAYMENT'
  | 'VSLA_SAVING'
  | 'VSLA_LOAN_DISBURSEMENT'
  | 'VSLA_LOAN_REPAYMENT'
  | 'LOAN_DISBURSEMENT'
  | 'LOAN_REPAYMENT'
  | 'SUBSCRIPTION_PAYMENT'
  | 'INPUT_PURCHASE'

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

/** Incoming payment initiation request */
export interface PaymentRequest {
  provider: PaymentProvider
  type: PaymentType
  amount: number
  currency: string
  recipientPhone: string
  recipientName: string
  recipientBankCode?: string
  recipientAccountNumber?: string
  description?: string
  reference?: string
  metadata?: Record<string, unknown>
  tenantId: string
  userId: string
}

/** Result returned after initiating a payment */
export interface PaymentResult {
  success: boolean
  transactionId?: string
  providerRef?: string
  status: TransactionStatus
  message: string
  amount?: number
  fee?: number
  timestamp?: Date
}

/** Payload received from a provider webhook / callback */
export interface PaymentCallback {
  provider: PaymentProvider
  providerRef: string
  status: TransactionStatus
  amount?: number
  currency?: string
  phone?: string
  transactionId?: string
  rawBody?: unknown
}

/** Configuration required to connect to a payment provider */
export interface PaymentProviderConfig {
  apiKey: string
  apiSecret: string
  baseUrl: string
  merchantId?: string
  callbackUrl?: string
  webhookSecret?: string
  isEnabled: boolean
  country: string
}

// ---------------------------------------------------------------------------
// Bulk payment types
// ---------------------------------------------------------------------------

/** Request for disbursing to multiple recipients in one batch */
export interface BulkPaymentRequest extends Omit<PaymentRequest, 'recipientPhone' | 'recipientName'> {
  recipients: Array<{
    phone: string
    name: string
    amount: number
    reference?: string
  }>
}

/** Aggregated result of a bulk disbursement */
export interface BulkPaymentResult {
  totalRequested: number
  totalProcessed: number
  totalFailed: number
  results: Array<PaymentResult & { recipientPhone: string }>
  batchId: string
}

// ---------------------------------------------------------------------------
// Currency helpers
// ---------------------------------------------------------------------------

/** Map of currency codes to their display symbols */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  UGX: 'USh',
  GHS: 'GH₵',
  KES: 'KSh',
}

/** Map of currency codes to country codes */
export const CURRENCY_COUNTRY: Record<string, string> = {
  UGX: 'UG',
  GHS: 'GH',
  KES: 'KE',
}

/** Map of country codes to default currencies */
export const COUNTRY_CURRENCY: Record<string, string> = {
  UG: 'UGX',
  GH: 'GHS',
  KE: 'KES',
}

/**
 * Format a monetary amount in the given currency.
 * Uses 0 decimals for UGX and 2 for GHS/KES.
 */
export function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  const decimals = currency === 'UGX' ? 0 : 2
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${symbol} ${formatted}`
}

/**
 * Round a monetary amount to 2 decimal places to avoid floating-point issues.
 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}