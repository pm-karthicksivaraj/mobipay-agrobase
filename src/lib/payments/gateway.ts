/**
 * Agrobase V3 — Payment Gateway (Provider Registry + Core Engine)
 * MobiPay AgroSys Limited
 *
 * Central gateway that delegates to registered provider handlers.
 * Provides transaction logging, retry with exponential backoff (3 retries, 1s/2s/4s),
 * idempotency via reference check, and bulk operations.
 * Creates PaymentTransaction records via Prisma.
 */

import { db } from '@/lib/db'
import type {
  PaymentProvider,
  PaymentProviderConfig,
  PaymentRequest,
  PaymentResult,
  PaymentCallback,
  BulkPaymentRequest,
  BulkPaymentResult,
  TransactionStatus,
} from './types'
import { roundMoney } from './types'

// ---------------------------------------------------------------------------
// Provider Handler Interface
// ---------------------------------------------------------------------------

/**
 * Each payment provider must implement this interface.
 * The gateway delegates actual API calls to the registered handler.
 */
export interface PaymentProviderHandler {
  /** Initiate a single payment */
  initiate(request: PaymentRequest, config: PaymentProviderConfig): Promise<PaymentResult>

  /** Check the current status of a transaction */
  checkStatus(transactionId: string, providerRef: string, config: PaymentProviderConfig): Promise<PaymentResult>

  /** Process an incoming webhook/callback from the provider */
  processCallback(callback: PaymentCallback, config: PaymentProviderConfig): Promise<void>
}

// ---------------------------------------------------------------------------
// Retry Configuration
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [1000, 2000, 4000]
const RETRYABLE_STATUSES: TransactionStatus[] = ['FAILED']

// ---------------------------------------------------------------------------
// Payment Gateway Class
// ---------------------------------------------------------------------------

/**
 * Central payment gateway with static provider registry pattern.
 *
 * @example
 * ```ts
 * PaymentGateway.registerProvider('mpay', mpayHandler)
 * const result = await PaymentGateway.initiatePayment(request)
 * ```
 */
export class PaymentGateway {
  /** Static provider registry: Map of PaymentProvider to handler */
  private static providers = new Map<PaymentProvider, PaymentProviderHandler>()

  /** In-memory idempotency cache: reference → transactionId */
  private static processedRefs = new Map<string, string>()

  // -----------------------------------------------------------------------
  // Provider Registry
  // -----------------------------------------------------------------------

  /**
   * Register a payment provider handler.
   */
  static registerProvider(provider: PaymentProvider, handler: PaymentProviderHandler): void {
    PaymentGateway.providers.set(provider, handler)
    console.log(`[PaymentGateway] Registered provider: ${provider}`)
  }

  /**
   * Get a registered provider handler.
   * @throws Error if the provider is not registered
   */
  static getProvider(provider: PaymentProvider): PaymentProviderHandler {
    const handler = PaymentGateway.providers.get(provider)
    if (!handler) {
      throw new Error(`Payment provider not registered: ${provider}`)
    }
    return handler
  }

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  /**
   * Resolve the provider config from environment variables / DB for a tenant.
   */
  static async getProviderConfig(
    tenantId: string,
    provider: PaymentProvider,
  ): Promise<PaymentProviderConfig> {
    const account = await db.paymentAccount.findFirst({
      where: { tenantId, isActive: true },
    })

    const envKey = (suffix: string) =>
      process.env[`PAYMENT_${provider.toUpperCase()}_${suffix}`] ?? ''

    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { country: true } })
    const country = tenant?.country ?? 'UG'

    return {
      apiKey: (envKey('API_KEY') || account?.address) ?? '',
      apiSecret: envKey('API_SECRET') || '',
      baseUrl: envKey('BASE_URL') || '',
      merchantId: envKey('MERCHANT_ID') || account?.id,
      callbackUrl: envKey('CALLBACK_URL') || `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback/${provider}`,
      webhookSecret: envKey('WEBHOOK_SECRET') || '',
      isEnabled: true,
      country,
    }
  }

  // -----------------------------------------------------------------------
  // Single Payment
  // -----------------------------------------------------------------------

  /**
   * Initiate a payment via the specified provider.
   * Handles idempotency (reference check), logging to PaymentTransaction, and retry.
   */
  static async initiatePayment(request: PaymentRequest): Promise<PaymentResult> {
    // Idempotency: if the same reference was already processed, return cached result
    if (request.reference && PaymentGateway.processedRefs.has(request.reference)) {
      const existingTxId = PaymentGateway.processedRefs.get(request.reference)!
      const existing = await db.paymentTransaction.findUnique({ where: { id: existingTxId } })
      if (existing) {
        console.log(`[PaymentGateway] Idempotent hit for reference: ${request.reference}`)
        return {
          success: existing.status === 'COMPLETED',
          transactionId: existing.id,
          providerRef: existing.providerTxnRef ?? undefined,
          status: existing.status as TransactionStatus,
          message: 'Transaction already processed (idempotent)',
          amount: existing.amount,
          timestamp: existing.createdAt,
        }
      }
    }

    const handler = PaymentGateway.getProvider(request.provider)
    const config = await PaymentGateway.getProviderConfig(request.tenantId, request.provider)

    // Determine transaction type for DB
    const isDisbursement = [
      'FARMER_PAYMENT',
      'BULK_DISBURSEMENT',
      'VSLA_LOAN_DISBURSEMENT',
      'LOAN_DISBURSEMENT',
    ].includes(request.type)

    // Create PaymentTransaction record
    const txn = await db.paymentTransaction.create({
      data: {
        tenantId: request.tenantId,
        provider: request.provider.toUpperCase(),
        type: isDisbursement ? 'DISBURSEMENT' : 'COLLECTION',
        amount: roundMoney(request.amount),
        currency: request.currency,
        recipientPhone: request.recipientPhone,
        recipientName: request.recipientName,
        status: 'PENDING',
        initiatedBy: request.userId,
        metadata: request.metadata ? JSON.stringify(request.metadata) : null,
      },
    })

    console.log(`[PaymentGateway] Created PaymentTransaction ${txn.id} for ${request.provider}`)

    // Execute with retry (1s, 2s, 4s exponential backoff)
    const result = await PaymentGateway.executeWithRetry(
      () => handler.initiate(request, config),
      txn.id,
    )

    // Update PaymentTransaction record
    await db.paymentTransaction.update({
      where: { id: txn.id },
      data: {
        status: result.status,
        providerTxnRef: result.providerRef ?? null,
        completedAt: result.status === 'COMPLETED' ? new Date() : null,
        failureReason: result.success ? null : result.message,
      },
    })

    // Cache reference for idempotency
    if (request.reference) {
      PaymentGateway.processedRefs.set(request.reference, txn.id)
    }

    console.log(`[PaymentGateway] PaymentTransaction ${txn.id} → ${result.status}`)
    return { ...result, transactionId: txn.id }
  }

  // -----------------------------------------------------------------------
  // Status Check
  // -----------------------------------------------------------------------

  /**
   * Check the current status of a payment transaction.
   */
  static async checkStatus(transactionId: string): Promise<PaymentResult> {
    const txn = await db.paymentTransaction.findUnique({ where: { id: transactionId } })
    if (!txn) {
      return { success: false, status: 'FAILED', message: 'Transaction not found' }
    }

    // Manual transactions don't have a provider to check
    if (txn.provider === 'MANUAL' || txn.provider === 'BANK_TRANSFER') {
      return {
        success: txn.status === 'COMPLETED',
        transactionId: txn.id,
        status: txn.status as TransactionStatus,
        message: 'Manual/bank transaction – check externally',
        amount: txn.amount,
      }
    }

    const provider = txn.provider.toLowerCase() as PaymentProvider
    const handler = PaymentGateway.getProvider(provider)
    const config = await PaymentGateway.getProviderConfig(txn.tenantId, provider)
    const providerRef = txn.providerTxnRef ?? ''

    const result = await handler.checkStatus(transactionId, providerRef, config)

    // Update DB if status changed
    if (result.status !== txn.status) {
      await db.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          status: result.status,
          providerTxnRef: result.providerRef ?? txn.providerTxnRef,
          completedAt: result.status === 'COMPLETED' ? new Date() : null,
        },
      })
    }

    return { ...result, transactionId, amount: txn.amount }
  }

  // -----------------------------------------------------------------------
  // Callback Processing
  // -----------------------------------------------------------------------

  /**
   * Process an incoming webhook/callback from a payment provider.
   */
  static async processCallback(callback: PaymentCallback): Promise<void> {
    console.log(`[PaymentGateway] Processing callback from ${callback.provider}: ${callback.providerRef}`)

    // Find the corresponding PaymentTransaction by provider reference
    const txn = await db.paymentTransaction.findFirst({
      where: { providerTxnRef: callback.providerRef },
    })

    if (!txn) {
      console.warn(`[PaymentGateway] No PaymentTransaction found for providerRef: ${callback.providerRef}`)
      return
    }

    const provider = txn.provider.toLowerCase() as PaymentProvider
    const handler = PaymentGateway.getProvider(provider)
    const config = await PaymentGateway.getProviderConfig(txn.tenantId, provider)

    // Delegate to provider handler for verification
    await handler.processCallback(callback, config)

    // Persist status update
    await db.paymentTransaction.update({
      where: { id: txn.id },
      data: {
        status: callback.status,
        providerTxnRef: callback.providerRef,
        callbackReceived: true,
        callbackBody: callback.rawBody ? JSON.stringify(callback.rawBody) : null,
        completedAt: callback.status === 'COMPLETED' ? new Date() : null,
      },
    })

    console.log(`[PaymentGateway] Callback processed: ${txn.id} → ${callback.status}`)
  }

  // -----------------------------------------------------------------------
  // Bulk Payment
  // -----------------------------------------------------------------------

  /**
   * Initiate a bulk disbursement to multiple recipients.
   * Processes recipients sequentially to respect provider rate limits.
   */
  static async initiateBulkPayment(request: BulkPaymentRequest): Promise<BulkPaymentResult> {
    const batchId = `BULK-${Date.now()}`
    console.log(`[PaymentGateway] Starting bulk payment ${batchId} with ${request.recipients.length} recipients`)

    const results: Array<PaymentResult & { recipientPhone: string }> = []
    let totalProcessed = 0
    let totalFailed = 0
    const totalRequested = request.recipients.length

    for (const recipient of request.recipients) {
      const singleRequest: PaymentRequest = {
        ...request,
        recipientPhone: recipient.phone,
        recipientName: recipient.name,
        amount: recipient.amount,
        reference: recipient.reference ?? request.reference,
      }

      try {
        const result = await PaymentGateway.initiatePayment(singleRequest)
        results.push({ ...result, recipientPhone: recipient.phone })
        if (result.success) {
          totalProcessed++
        } else {
          totalFailed++
        }
      } catch (error) {
        totalFailed++
        results.push({
          success: false,
          recipientPhone: recipient.phone,
          status: 'FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    console.log(
      `[PaymentGateway] Bulk payment ${batchId} complete: ${totalProcessed}/${totalRequested} succeeded`,
    )

    return { totalRequested, totalProcessed, totalFailed, results, batchId }
  }

  // -----------------------------------------------------------------------
  // Internal Helpers
  // -----------------------------------------------------------------------

  /**
   * Execute an async operation with exponential backoff retry.
   * 3 retries with delays of 1s, 2s, 4s.
   */
  private static async executeWithRetry<T extends PaymentResult>(
    fn: () => Promise<T>,
    _transactionId: string,
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await fn()

        if (
          !result.success &&
          RETRYABLE_STATUSES.includes(result.status) &&
          attempt < MAX_RETRIES
        ) {
          lastError = new Error(result.message)
          const delay = RETRY_DELAYS_MS[attempt] ?? 4000
          console.log(
            `[PaymentGateway] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms: ${result.message}`,
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS_MS[attempt] ?? 4000
          console.log(
            `[PaymentGateway] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms: ${lastError.message}`,
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
      }
    }

    return {
      success: false,
      status: 'FAILED',
      message: lastError?.message ?? 'Max retries exceeded',
    } as T
  }
}

// ---------------------------------------------------------------------------
// Singleton helper
// ---------------------------------------------------------------------------

let _gatewayInstance: PaymentGateway | null = null

/**
 * Get or create a PaymentGateway instance.
 * Provider handlers must be registered before use via PaymentGateway.registerProvider.
 */
export function getPaymentGateway(): PaymentGateway {
  if (!_gatewayInstance) {
    _gatewayInstance = new PaymentGateway()
  }
  return _gatewayInstance
}