/**
 * Agrobase V3 — aIntel Gateway Integration
 * MobiPay AgroSys Limited
 *
 * aIntel is an existing V1 payment partner supporting mobile money
 * and bank transfers across Uganda and Ghana.
 * Uses API key header authentication and webhook secret verification.
 */

import crypto from 'crypto'
import { db } from '@/lib/db'
import type {
  PaymentRequest,
  PaymentResult,
  PaymentCallback,
  PaymentProviderConfig,
} from './types'
import type { PaymentProviderHandler } from './gateway'
import { roundMoney } from './types'

// ---------------------------------------------------------------------------
// aIntel API Types
// ---------------------------------------------------------------------------

interface AintelTransferResponse {
  success: boolean
  message: string
  data?: {
    transaction_id: string
    reference: string
    status: string
  }
}

interface AintelStatusResponse {
  success: boolean
  message: string
  data?: {
    transaction_id: string
    status: string
    amount: number
    currency: string
    phone: string
    fee: number
    completed_at?: string
  }
}

// ---------------------------------------------------------------------------
// Webhook Signature Verification
// ---------------------------------------------------------------------------

/**
 * Verify aIntel webhook signature using HMAC-SHA256.
 * aIntel sends an X-aIntel-Signature header containing the HMAC of the raw body.
 */
export function verifyAintelSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, 'hex'),
      Buffer.from(expected, 'hex'),
    )
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// HTTP Helper
// ---------------------------------------------------------------------------

async function aintelRequest<T>(
  baseUrl: string,
  endpoint: string,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = `${baseUrl}${endpoint}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`aIntel API error (${response.status}): ${text}`)
  }

  return response.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// aIntel Provider Handler
// ---------------------------------------------------------------------------

/**
 * aIntel payment provider implementation.
 * Supports mobile money and bank transfer payments in Uganda and Ghana.
 */
export class AintelProvider implements PaymentProviderHandler {
  // -----------------------------------------------------------------------
  // initiate: POST /api/v1/transfer with API key header
  // -----------------------------------------------------------------------

  async initiate(request: PaymentRequest, config: PaymentProviderConfig): Promise<PaymentResult> {
    const reference = request.reference ?? `AINTEL-${Date.now()}`
    const isBankTransfer = !!request.recipientBankCode && !!request.recipientAccountNumber

    const body: Record<string, unknown> = {
      reference,
      amount: roundMoney(request.amount),
      currency: request.currency,
      recipient_name: request.recipientName,
      callback_url: config.callbackUrl ?? '',
      metadata: request.metadata ?? {},
    }

    if (isBankTransfer) {
      body.payment_method = 'bank_transfer'
      body.bank_code = request.recipientBankCode
      body.account_number = request.recipientAccountNumber
    } else {
      body.payment_method = 'mobile_money'
      body.phone_number = request.recipientPhone
    }

    console.log(
      `[aIntel] Initiating ${isBankTransfer ? 'bank transfer' : 'mobile money'}: ${request.currency} ${request.amount}`,
    )

    try {
      const response = await aintelRequest<AintelTransferResponse>(
        config.baseUrl,
        '/api/v1/transfer',
        config.apiKey,
        body,
      )

      return {
        success: response.success && (response.data?.status === 'ACCEPTED' || response.data?.status === 'PENDING'),
        providerRef: response.data?.transaction_id ?? reference,
        status: this.mapStatus(response.data?.status ?? 'PENDING'),
        message: response.message,
        amount: request.amount,
        timestamp: new Date(),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'aIntel initiation failed'
      console.error(`[aIntel] Initiation error: ${message}`)
      return { success: false, status: 'FAILED', message, timestamp: new Date() }
    }
  }

  // -----------------------------------------------------------------------
  // checkStatus: GET /api/v1/transfer/{ref}
  // -----------------------------------------------------------------------

  async checkStatus(
    _transactionId: string,
    providerRef: string,
    config: PaymentProviderConfig,
  ): Promise<PaymentResult> {
    try {
      const response = await aintelRequest<AintelStatusResponse>(
        config.baseUrl,
        `/api/v1/transfer/${providerRef}`,
        config.apiKey,
        {},
      )

      return {
        success: response.success && response.data?.status === 'COMPLETED',
        providerRef: response.data?.transaction_id ?? providerRef,
        status: this.mapStatus(response.data?.status ?? 'UNKNOWN'),
        message: response.message,
        amount: response.data?.amount,
        fee: response.data?.fee,
        timestamp: response.data?.completed_at ? new Date(response.data.completed_at) : new Date(),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'aIntel status check failed'
      return { success: false, status: 'FAILED', message }
    }
  }

  // -----------------------------------------------------------------------
  // processCallback: verify webhook secret
  // -----------------------------------------------------------------------

  async processCallback(callback: PaymentCallback, config: PaymentProviderConfig): Promise<void> {
    // Verify webhook secret if available
    if (config.webhookSecret && callback.rawBody) {
      const rawBodyStr = typeof callback.rawBody === 'string'
        ? callback.rawBody
        : JSON.stringify(callback.rawBody)

      const rawObj = callback.rawBody as Record<string, string>
      if (rawObj.signature) {
        const isValid = verifyAintelSignature(rawBodyStr, rawObj.signature, config.webhookSecret)
        if (!isValid) {
          console.warn('[aIntel] Webhook signature verification failed')
          throw new Error('Invalid webhook signature')
        }
      }
    }

    // Update PaymentTransaction
    const txn = await db.paymentTransaction.findFirst({
      where: { providerTxnRef: callback.providerRef },
    })

    if (txn) {
      await db.paymentTransaction.update({
        where: { id: txn.id },
        data: {
          status: callback.status,
          callbackReceived: true,
          callbackBody: callback.rawBody ? JSON.stringify(callback.rawBody) : null,
          completedAt: callback.status === 'COMPLETED' ? new Date() : null,
        },
      })
    }

    console.log(`[aIntel] Callback processed: ${callback.providerRef} → ${callback.status}`)
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private mapStatus(aintelStatus: string): PaymentResult['status'] {
    const map: Record<string, PaymentResult['status']> = {
      ACCEPTED: 'PROCESSING',
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      COMPLETED: 'COMPLETED',
      SUCCESS: 'COMPLETED',
      FAILED: 'FAILED',
      CANCELLED: 'CANCELLED',
      REVERSED: 'REFUNDED',
    }
    return map[aintelStatus] ?? 'PENDING'
  }
}