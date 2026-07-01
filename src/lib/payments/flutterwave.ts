/**
 * Flutterwave Payment Integration
 *
 * SETUP:
 * 1. Create a Flutterwave account at https://flutterwave.com
 * 2. Get your API keys from Dashboard → Settings → API
 * 3. Add to .env:
 *    FLW_PUBLIC_KEY=FLWPUBK-xxxx
 *    FLW_SECRET_KEY=FLWSECK-xxxx
 *    FLW_ENCRYPTION_KEY=FLWSECK_TESTxxxx
 *    FLW_WEBHOOK_HASH=your-webhook-hash
 *    NEXT_PUBLIC_FLW_PUBLIC_KEY=FLWPUBK-xxxx
 *
 * 4. Set up webhook in Flutterwave dashboard:
 *    URL: https://yourdomain.com/api/payments/flutterwave/webhook
 *    Secret Hash: matches FLW_WEBHOOK_HASH
 *
 * SUPPORTED PAYMENT METHODS:
 *   - Mobile Money (UGX, GHS, KES, RWF, TZS, ZMW)
 *   - Card (Visa, Mastercard, Verve)
 *   - Bank Transfer
 *   - USSD
 *   - Bank Account
 *
 * USAGE (subscription billing):
 *   import { chargeSubscription } from '@/lib/payments/flutterwave'
 *   const result = await chargeSubscription({
 *     tenantId: 'abc',
 *     amount: 200,
 *     currency: 'USD',
 *     email: 'admin@cooperative.com',
 *     plan: 'PROFESSIONAL',
 *   })
 */

export const FLW_CONFIG = {
  publicKey: process.env.FLW_PUBLIC_KEY || '',
  secretKey: process.env.FLW_SECRET_KEY || '',
  encryptionKey: process.env.FLW_ENCRYPTION_KEY || '',
  webhookHash: process.env.FLW_WEBHOOK_HASH || '',
  clientPublicKey: process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY || '',
}

export function isFlutterwaveConfigured(): boolean {
  return !!FLW_CONFIG.secretKey
}

// API base URLs
const FLW_API_BASE = process.env.FLW_ENV === 'production'
  ? 'https://api.flutterwave.com/v3'
  : 'https://api.flutterwave.com/v3' // same base, different keys for test/live

// ─── Types ────────────────────────────────────────────────────────

export interface PaymentRequest {
  tenantId: string
  amount: number
  currency: string // USD, UGX, GHS, KES
  email: string
  phone?: string
  name: string
  plan: string // BASIC, PROFESSIONAL, ENTERPRISE
  billingCycle: 'MONTHLY' | 'ANNUAL'
  description?: string
  redirectUrl?: string
}

export interface PaymentResult {
  success: boolean
  paymentLink?: string
  reference: string
  message: string
}

export interface WebhookPayload {
  event: string
  'event.type': string
  data: {
    id: number
    txRef: string
    flwRef: string
    amount: number
    currency: string
    status: string
    customer: {
      email: string
      phone_number: string
      name: string
    }
    paymentType: string
    createdAt: string
  }
}

// ─── Initialize Payment ───────────────────────────────────────────

/**
 * Initialize a subscription payment via Flutterwave Standard.
 * Returns a payment link the user should be redirected to.
 *
 * @example
 * const result = await chargeSubscription({
 *   tenantId: 'abc-123',
 *   amount: 200,
 *   currency: 'USD',
 *   email: 'admin@cooperative.com',
 *   name: 'Agrobase Uganda',
 *   plan: 'PROFESSIONAL',
 *   billingCycle: 'MONTHLY',
 * })
 * if (result.success) {
 *   window.location.href = result.paymentLink!
 * }
 */
export async function chargeSubscription(req: PaymentRequest): Promise<PaymentResult> {
  if (!isFlutterwaveConfigured()) {
    return {
      success: false,
      reference: '',
      message: 'Flutterwave not configured. Set FLW_SECRET_KEY in environment variables.',
    }
  }

  const txRef = `AGB-${req.tenantId.slice(0, 8)}-${Date.now()}`

  try {
    const response = await fetch(`${FLW_API_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLW_CONFIG.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: req.amount,
        currency: req.currency,
        payment_options: 'card,mobilemoneyghana,mobilemoneyuganda,mobilemoneyrwanda,mobilemoneyzambia,mobilemoneytanzania,ussd,banktransfer',
        redirect_url: req.redirectUrl || `${process.env.NEXTAUTH_URL}/billing/callback`,
        customer: {
          email: req.email,
          phone_number: req.phone || '',
          name: req.name,
        },
        customizations: {
          title: 'Agrobase V3 Subscription',
          description: req.description || `${req.plan} Plan — ${req.billingCycle}`,
          logo: 'https://mobipay-agrobase.vercel.app/logo.png',
        },
        meta: {
          tenantId: req.tenantId,
          plan: req.plan,
          billingCycle: req.billingCycle,
          type: 'SUBSCRIPTION',
        },
      }),
    })

    const data = await response.json()

    if (data.status === 'success' && data.data?.link) {
      return {
        success: true,
        paymentLink: data.data.link,
        reference: txRef,
        message: 'Payment link generated',
      }
    } else {
      return {
        success: false,
        reference: txRef,
        message: data.message || 'Failed to initialize payment',
      }
    }
  } catch (error: any) {
    console.error('[Flutterwave] Payment init failed:', error)
    return {
      success: false,
      reference: txRef,
      message: error.message || 'Network error',
    }
  }
}

// ─── Verify Payment ───────────────────────────────────────────────

/**
 * Verify a payment by transaction reference.
 * Called after the user is redirected back from Flutterwave.
 *
 * @example
 * const result = await verifyPayment(txRef)
 * if (result.success) {
 *   // Activate subscription, send receipt
 * }
 */
export async function verifyPayment(txRef: string): Promise<{ success: boolean; status: string; amount: number; data?: any }> {
  if (!isFlutterwaveConfigured()) {
    return { success: false, status: 'error', amount: 0 }
  }

  try {
    const response = await fetch(`${FLW_API_BASE}/transactions/verify_by_reference?tx_ref=${txRef}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLW_CONFIG.secretKey}`,
      },
    })

    const data = await response.json()

    if (data.status === 'success' && data.data?.status === 'successful') {
      return {
        success: true,
        status: 'successful',
        amount: data.data.amount,
        data: data.data,
      }
    } else {
      return {
        success: false,
        status: data.data?.status || 'failed',
        amount: data.data?.amount || 0,
      }
    }
  } catch (error: any) {
    console.error('[Flutterwave] Verification failed:', error)
    return { success: false, status: 'error', amount: 0 }
  }
}

// ─── Create Recurring Subscription (Payment Plan) ─────────────────

/**
 * Create a recurring payment plan in Flutterwave.
 * This allows automatic recurring billing.
 */
export async function createPaymentPlan(
  amount: number,
  currency: string,
  name: string,
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly'
): Promise<{ success: boolean; planId?: number; message: string }> {
  if (!isFlutterwaveConfigured()) {
    return { success: false, message: 'Flutterwave not configured' }
  }

  try {
    const response = await fetch(`${FLW_API_BASE}/payment-plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLW_CONFIG.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        name,
        interval,
      }),
    })

    const data = await response.json()

    if (data.status === 'success') {
      return {
        success: true,
        planId: data.data?.id,
        message: 'Payment plan created',
      }
    } else {
      return { success: false, message: data.message || 'Failed to create plan' }
    }
  } catch (error: any) {
    console.error('[Flutterwave] Plan creation failed:', error)
    return { success: false, message: error.message }
  }
}

// ─── Webhook Verification ─────────────────────────────────────────

/**
 * Verify a Flutterwave webhook signature.
 * The webhook sends a hash in the `verif-hash` header that must match
 * your FLW_WEBHOOK_HASH.
 */
export function verifyWebhookSignature(signature: string | null): boolean {
  if (!FLW_CONFIG.webhookHash || !signature) return false
  return signature === FLW_CONFIG.webhookHash
}

// ─── Supported Currencies & Countries ─────────────────────────────

export const FLW_SUPPORTED_CURRENCIES = ['USD', 'UGX', 'GHS', 'KES', 'RWF', 'TZS', 'ZMW', 'NGN', 'ZAR']

export const FLW_PAYMENT_METHODS_BY_COUNTRY: Record<string, string[]> = {
  Uganda: ['card', 'mobilemoneyuganda', 'banktransfer', 'ussd'],
  Ghana: ['card', 'mobilemoneyghana', 'banktransfer'],
  Kenya: ['card', 'mobilemoneykenya', 'banktransfer', 'ussd'],
  Rwanda: ['card', 'mobilemoneyrwanda'],
  Tanzania: ['card', 'mobilemoneytanzania'],
  Zambia: ['card', 'mobilemoneyzambia'],
  Nigeria: ['card', 'banktransfer', 'ussd', 'bankaccount'],
}

export function getPaymentMethodsForCountry(country: string): string[] {
  return FLW_PAYMENT_METHODS_BY_COUNTRY[country] || ['card', 'banktransfer']
}
