/**
 * Agrobase V3 — MTN MoMo & M-Pesa Integrations
 * MobiPay AgroSys Limited
 *
 * Two providers implementing PaymentProviderHandler:
 *
 * MTN MoMo: OAuth2 token, POST /collections/v1_0/requesttopay or /disbursements/v1_0/request
 *   - Uganda: api.mtn.co.ug
 *   - Ghana: api.mtn.com.gh
 *
 * M-Pesa (Safaricom Kenya):
 *   - C2B: POST /mpesa/stkpush/v1/processrequest (collection via STK Push)
 *   - B2C: POST /mpesa/b2c/v3/paymentrequest (disbursement)
 *   - OAuth via consumer_key/secret
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

// ===========================================================================
// Shared: Token Cache
// ===========================================================================

/** Simple in-memory token cache with TTL */
class TokenCache {
  private token = ''
  private expiresAt = 0

  get isExpired(): boolean {
    return Date.now() >= this.expiresAt
  }

  set(token: string, expiresInMs: number): void {
    this.token = token
    this.expiresAt = Date.now() + expiresInMs - 60_000 // refresh 60s before expiry
  }

  get(): string {
    return this.token
  }
}

// ===========================================================================
// MTN MoMo
// ===========================================================================

const MTN_BASE_URLS: Record<string, string> = {
  UG: 'https://api.mtn.co.ug',
  GH: 'https://api.mtn.com.gh',
}

interface MomoTokenResponse {
  access_token: string
  expires_in: number
}

/** Token caches keyed by API key */
const momoTokenCaches = new Map<string, TokenCache>()

async function getMomoToken(config: PaymentProviderConfig): Promise<string> {
  const cacheKey = config.apiKey
  let cache = momoTokenCaches.get(cacheKey)
  if (!cache) {
    cache = new TokenCache()
    momoTokenCaches.set(cacheKey, cache)
  }

  if (!cache.isExpired && cache.get()) {
    return cache.get()
  }

  const baseUrl = MTN_BASE_URLS[config.country] ?? MTN_BASE_URLS.UG
  const url = `${baseUrl}/collections/token/`
  const auth = Buffer.from(`${config.apiKey}:`).toString('base64')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
      'Ocp-Apim-Subscription-Key': config.apiKey,
    },
    body: JSON.stringify({}),
  })

  if (!response.ok) {
    throw new Error(`MTN MoMo token request failed (${response.status})`)
  }

  const data = (await response.json()) as MomoTokenResponse
  cache.set(data.access_token, data.expires_in * 1000)

  return data.access_token
}

// ---------------------------------------------------------------------------
// MTN MoMo Provider Handler
// ---------------------------------------------------------------------------

/**
 * MTN MoMo: OAuth2 token, then POST to /collections/v1_0/requesttopay (C2B)
 * or /disbursements/v1_0/request (disbursement).
 */
export class MtnMomoProvider implements PaymentProviderHandler {
  async initiate(request: PaymentRequest, config: PaymentProviderConfig): Promise<PaymentResult> {
    const referenceId = crypto.randomUUID()
    const baseUrl = MTN_BASE_URLS[config.country] ?? MTN_BASE_URLS.UG

    const isDisbursement = [
      'FARMER_PAYMENT',
      'BULK_DISBURSEMENT',
      'VSLA_LOAN_DISBURSEMENT',
      'LOAN_DISBURSEMENT',
    ].includes(request.type)

    const token = await getMomoToken(config)
    const phone = request.recipientPhone.replace(/\+/g, '')

    const endpoint = isDisbursement
      ? `${baseUrl}/disbursements/v1_0/request`
      : `${baseUrl}/collections/v1_0/requesttopay`

    const body = {
      amount: String(roundMoney(request.amount)),
      currency: request.currency,
      externalId: request.reference ?? referenceId,
      payer: {
        partyIdType: 'MSISDN',
        partyId: phone,
      },
      payerMessage: request.description ?? `Payment to ${request.recipientName}`,
      payeeNote: `Agrobase ${request.type}`,
    }

    console.log(
      `[MTN MoMo] Initiating ${isDisbursement ? 'disbursement' : 'collection'}: ${request.currency} ${request.amount} to ${phone}`,
    )

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': config.country === 'GH' ? 'mtnghana' : 'mtnuganda',
          'Ocp-Apim-Subscription-Key': config.apiKey,
        },
        body: JSON.stringify(body),
      })

      if (response.status === 202) {
        return {
          success: true,
          providerRef: referenceId,
          status: 'PROCESSING',
          message: 'Payment request accepted',
          amount: request.amount,
          timestamp: new Date(),
        }
      }

      const errorText = await response.text()
      return {
        success: false,
        providerRef: referenceId,
        status: 'FAILED',
        message: `MTN MoMo returned ${response.status}: ${errorText}`,
        timestamp: new Date(),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MTN MoMo initiation failed'
      console.error(`[MTN MoMo] Error: ${message}`)
      return { success: false, status: 'FAILED', message, timestamp: new Date() }
    }
  }

  async checkStatus(
    _transactionId: string,
    providerRef: string,
    config: PaymentProviderConfig,
  ): Promise<PaymentResult> {
    const baseUrl = MTN_BASE_URLS[config.country] ?? MTN_BASE_URLS.UG
    const token = await getMomoToken(config)

    try {
      for (const path of [
        `${baseUrl}/collections/v1_0/requesttopay/${providerRef}`,
        `${baseUrl}/disbursements/v1_0/request/${providerRef}`,
      ]) {
        const response = await fetch(path, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Reference-Id': providerRef,
            'X-Target-Environment': config.country === 'GH' ? 'mtnghana' : 'mtnuganda',
            'Ocp-Apim-Subscription-Key': config.apiKey,
          },
        })

        if (response.ok) {
          const data = (await response.json()) as Record<string, string>
          return {
            success: data.status === 'COMPLETED' || data.status === 'SUCCESSFUL',
            providerRef,
            status: this.mapStatus(data.status),
            message: data.reason ?? data.status,
            timestamp: new Date(),
          }
        }
      }

      return { success: false, providerRef, status: 'FAILED', message: 'Transaction not found' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MTN MoMo status check failed'
      return { success: false, status: 'FAILED', message }
    }
  }

  async processCallback(callback: PaymentCallback, _config: PaymentProviderConfig): Promise<void> {
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

    console.log(`[MTN MoMo] Callback: ${callback.providerRef} → ${callback.status}`)
  }

  private mapStatus(momoStatus: string): PaymentResult['status'] {
    const map: Record<string, PaymentResult['status']> = {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      COMPLETED: 'COMPLETED',
      SUCCESSFUL: 'COMPLETED',
      FAILED: 'FAILED',
      REJECTED: 'FAILED',
      TIMEOUT: 'FAILED',
      CANCELLED: 'CANCELLED',
    }
    return map[momoStatus] ?? 'PENDING'
  }
}

// ===========================================================================
// M-Pesa (Safaricom Kenya — Daraja API)
// ===========================================================================

const MPESA_BASE_URL = 'https://sandbox.safaricom.co.ke'

interface MpesaTokenResponse {
  access_token: string
  expires_in: string
}

interface MpesaStkResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

interface MpesaB2CResponse {
  ConversationID: string
  OriginatorConversationID: string
  ResponseCode: string
  ResponseDescription: string
}

const mpesaTokenCache = new TokenCache()

async function getMpesaToken(config: PaymentProviderConfig): Promise<string> {
  if (!mpesaTokenCache.isExpired && mpesaTokenCache.get()) {
    return mpesaTokenCache.get()
  }

  const url = `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`
  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')

  const response = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  })

  if (!response.ok) {
    throw new Error(`M-Pesa token request failed (${response.status})`)
  }

  const data = (await response.json()) as MpesaTokenResponse
  mpesaTokenCache.set(data.access_token, parseInt(data.expires_in, 10) * 1000)

  return data.access_token
}

// ---------------------------------------------------------------------------
// M-Pesa Provider Handler
// ---------------------------------------------------------------------------

/**
 * M-Pesa: OAuth via consumer_key/secret.
 * C2B: POST /mpesa/stkpush/v1/processrequest
 * B2C: POST /mpesa/b2c/v3/paymentrequest
 */
export class MpesaProvider implements PaymentProviderHandler {
  async initiate(request: PaymentRequest, config: PaymentProviderConfig): Promise<PaymentResult> {
    const token = await getMpesaToken(config)
    const isDisbursement = [
      'FARMER_PAYMENT',
      'BULK_DISBURSEMENT',
      'VSLA_LOAN_DISBURSEMENT',
      'LOAN_DISBURSEMENT',
    ].includes(request.type)

    if (isDisbursement) {
      return this.initiateB2C(request, config, token)
    }
    return this.initiateStkPush(request, config, token)
  }

  /**
   * C2B: POST /mpesa/stkpush/v1/processrequest
   */
  private async initiateStkPush(
    request: PaymentRequest,
    config: PaymentProviderConfig,
    token: string,
  ): Promise<PaymentResult> {
    const phone = request.recipientPhone.replace(/\+/g, '').replace(/^0/, '254')
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, -3)

    const shortcode = config.merchantId ?? '174379'
    const passkey = config.webhookSecret ?? 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')

    const body = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(request.amount),
      PartyA: phone,
      PartyB: parseInt(shortcode, 10),
      PhoneNumber: phone,
      CallBackURL: config.callbackUrl ?? '',
      AccountReference: request.reference ?? 'AGROBASE',
      TransactionDesc: request.description ?? `Agrobase ${request.type}`,
    }

    console.log(`[M-Pesa] Initiating STK Push: KES ${request.amount} from ${phone}`)

    try {
      const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = (await response.json()) as MpesaStkResponse

      if (data.ResponseCode === '0') {
        return {
          success: true,
          providerRef: data.CheckoutRequestID,
          status: 'PROCESSING',
          message: data.ResponseDescription,
          amount: request.amount,
          timestamp: new Date(),
        }
      }

      return {
        success: false,
        status: 'FAILED',
        message: data.ResponseDescription ?? `M-Pesa error: ${data.ResponseCode}`,
        timestamp: new Date(),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'M-Pesa STK Push failed'
      console.error(`[M-Pesa] STK Push error: ${message}`)
      return { success: false, status: 'FAILED', message, timestamp: new Date() }
    }
  }

  /**
   * B2C: POST /mpesa/b2c/v3/paymentrequest
   */
  private async initiateB2C(
    request: PaymentRequest,
    config: PaymentProviderConfig,
    token: string,
  ): Promise<PaymentResult> {
    const phone = request.recipientPhone.replace(/\+/g, '').replace(/^0/, '254')
    const securityCredential = Buffer.from(config.apiSecret).toString('base64')

    const body = {
      InitiatorName: config.merchantId ?? 'agrobase',
      SecurityCredential: securityCredential,
      CommandID: 'BusinessPayment',
      Amount: Math.round(request.amount),
      PartyA: '174379',
      PartyB: phone,
      Remarks: request.description ?? `Payment to ${request.recipientName}`,
      QueueTimeOutURL: `${config.callbackUrl}/b2c/timeout`,
      ResultURL: `${config.callbackUrl}/b2c/result`,
      Occasion: `Agrobase ${request.type}`,
    }

    console.log(`[M-Pesa] Initiating B2C: KES ${request.amount} to ${phone}`)

    try {
      const response = await fetch(`${MPESA_BASE_URL}/mpesa/b2c/v3/paymentrequest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = (await response.json()) as MpesaB2CResponse

      return {
        success: data.ResponseCode === '0',
        providerRef: data.ConversationID,
        status: data.ResponseCode === '0' ? 'PROCESSING' : 'FAILED',
        message: data.ResponseDescription,
        amount: request.amount,
        timestamp: new Date(),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'M-Pesa B2C initiation failed'
      console.error(`[M-Pesa] B2C error: ${message}`)
      return { success: false, status: 'FAILED', message, timestamp: new Date() }
    }
  }

  async checkStatus(
    _transactionId: string,
    providerRef: string,
    config: PaymentProviderConfig,
  ): Promise<PaymentResult> {
    const token = await getMpesaToken(config)
    const securityCredential = Buffer.from(config.apiSecret).toString('base64')

    try {
      const response = await fetch(`${MPESA_BASE_URL}/mpesa/transactionstatus/v1/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          InitiatorName: config.merchantId ?? 'agrobase',
          SecurityCredential: securityCredential,
          CommandID: 'TransactionStatusQuery',
          TransactionID: providerRef,
          OriginatorConversationID: providerRef,
          PartyA: '174379',
          IdentifierType: '4',
          ResultURL: `${config.callbackUrl}/status/result`,
          QueueTimeOutURL: `${config.callbackUrl}/status/timeout`,
          Remarks: 'Status query',
          Occasion: 'Agrobase',
        }),
      })

      if (response.ok) {
        const data = await response.json() as Record<string, unknown>
        const resultCode = data.ResultCode as string | undefined
        return {
          success: resultCode === '0',
          providerRef,
          status: resultCode === '0' ? 'COMPLETED' : 'FAILED',
          message: (data.ResultDesc as string) ?? 'Status checked',
          timestamp: new Date(),
        }
      }

      return { success: false, providerRef, status: 'FAILED', message: 'Status query failed' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'M-Pesa status check failed'
      return { success: false, status: 'FAILED', message }
    }
  }

  async processCallback(callback: PaymentCallback, _config: PaymentProviderConfig): Promise<void> {
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

    console.log(`[M-Pesa] Callback: ${callback.providerRef} → ${callback.status}`)
  }
}