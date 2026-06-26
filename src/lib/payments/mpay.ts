/**
 * Agrobase V3 — mPay Gateway Integration
 * MobiPay AgroSys Limited
 *
 * mPay is MobiPay's proprietary gateway from V1.
 * Supports mobile money disbursements and collections across Uganda, Ghana, and Kenya.
 * Uses HMAC-SHA256 signature generation for API authentication.
 * Signature format: base64(hmac_sha256(apiSecret, sortedParams))
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
// mPay API Types
// ---------------------------------------------------------------------------

interface MpayDisburseRequest {
  merchant_id: string
  reference: string
  amount: number
  currency: string
  phone: string
  name: string
  type: 'DISBURSEMENT' | 'COLLECTION'
  callback_url: string
  timestamp: string
  signature: string
}

interface MpayDisburseResponse {
  status: 'ACCEPTED' | 'REJECTED' | 'ERROR'
  message: string
  transaction_id?: string
  reference?: string
}

interface MpayStatusResponse {
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  message: string
  amount?: number
  transaction_id?: string
  fee?: number
}

// ---------------------------------------------------------------------------
// Signature Generation
// ---------------------------------------------------------------------------

/**
 * Generate an HMAC-SHA256 signature for mPay API authentication.
 * Signature = base64(hmac_sha256(apiSecret, sortedParams))
 * where sortedParams is the concatenation of sorted key=value pairs.
 */
function generateSignature(payload: Record<string, string | number>, apiSecret: string): string {
  const sortedKeys = Object.keys(payload).sort()
  const signingString = sortedKeys
    .map((key) => `${key}=${payload[key]}`)
    .join('&')

  const hmac = crypto
    .createHmac('sha256', apiSecret)
    .update(signingString)
    .digest()

  return Buffer.from(hmac).toString('base64')
}

// ---------------------------------------------------------------------------
// HTTP Helper
// ---------------------------------------------------------------------------

async function mpayRequest<T>(
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
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`mPay API error (${response.status}): ${text}`)
  }

  return response.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// mPay Provider Handler
// ---------------------------------------------------------------------------

/**
 * mPay payment provider implementation.
 * Implements PaymentProviderHandler for mPay's proprietary API.
 */
export class MpayProvider implements PaymentProviderHandler {
  // -----------------------------------------------------------------------
  // initiate: POST /payments/disburse with signature auth (HMAC-SHA256)
  // -----------------------------------------------------------------------

  async initiate(request: PaymentRequest, config: PaymentProviderConfig): Promise<PaymentResult> {
    const timestamp = new Date().toISOString()
    const reference = request.reference ?? `MPAY-${Date.now()}`

    const isDisbursement = [
      'FARMER_PAYMENT',
      'BULK_DISBURSEMENT',
      'VSLA_LOAN_DISBURSEMENT',
      'LOAN_DISBURSEMENT',
    ].includes(request.type)

    const signingPayload: Record<string, string | number> = {
      merchant_id: config.merchantId ?? '',
      reference,
      amount: roundMoney(request.amount),
      currency: request.currency,
      phone: request.recipientPhone,
      name: request.recipientName,
      type: isDisbursement ? 'DISBURSEMENT' : 'COLLECTION',
      callback_url: config.callbackUrl ?? '',
      timestamp,
    }

    const signature = generateSignature(signingPayload, config.apiSecret)

    const body: MpayDisburseRequest = {
      ...signingPayload,
      signature,
    }

    console.log(
      `[mPay] Initiating ${signingPayload.type} of ${request.currency} ${request.amount} to ${request.recipientPhone}`,
    )

    try {
      const response = await mpayRequest<MpayDisburseResponse>(
        config.baseUrl,
        '/payments/disburse',
        config.apiKey,
        body,
      )

      const statusMap: Record<string, PaymentResult['status']> = {
        ACCEPTED: 'PROCESSING',
        REJECTED: 'FAILED',
        ERROR: 'FAILED',
      }

      return {
        success: response.status === 'ACCEPTED',
        providerRef: response.transaction_id ?? reference,
        status: statusMap[response.status] ?? 'PENDING',
        message: response.message,
        amount: request.amount,
        timestamp: new Date(),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'mPay initiation failed'
      console.error(`[mPay] Initiation error: ${message}`)
      return { success: false, status: 'FAILED', message, timestamp: new Date() }
    }
  }

  // -----------------------------------------------------------------------
  // checkStatus: GET /payments/status/{ref}
  // -----------------------------------------------------------------------

  async checkStatus(
    _transactionId: string,
    providerRef: string,
    config: PaymentProviderConfig,
  ): Promise<PaymentResult> {
    try {
      const timestamp = new Date().toISOString()
      const signingPayload = { transaction_id: providerRef, timestamp }
      const signature = generateSignature(signingPayload, config.apiSecret)

      const response = await mpayRequest<MpayStatusResponse>(
        config.baseUrl,
        `/payments/status/${providerRef}`,
        config.apiKey,
        { ...signingPayload, signature },
      )

      return {
        success: response.status === 'COMPLETED',
        providerRef: response.transaction_id ?? providerRef,
        status: response.status as PaymentResult['status'],
        message: response.message,
        amount: response.amount,
        fee: response.fee,
        timestamp: new Date(),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'mPay status check failed'
      return { success: false, status: 'FAILED', message }
    }
  }

  // -----------------------------------------------------------------------
  // processCallback: verify signature, update PaymentTransaction
  // -----------------------------------------------------------------------

  async processCallback(callback: PaymentCallback, config: PaymentProviderConfig): Promise<void> {
    // Verify webhook signature if available
    const rawBody = callback.rawBody as Record<string, unknown> | undefined
    if (rawBody && config.webhookSecret) {
      const expectedSignature = rawBody.signature as string | undefined
      const signingPayload = { ...rawBody, signature: undefined } as Record<string, string | number>
      const computedSignature = generateSignature(signingPayload, config.webhookSecret)

      if (expectedSignature && expectedSignature !== computedSignature) {
        console.warn('[mPay] Webhook signature verification failed')
        throw new Error('Invalid webhook signature')
      }
    }

    // Find and update the PaymentTransaction
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

    console.log(`[mPay] Callback processed: ${callback.providerRef} → ${callback.status}`)
  }
}