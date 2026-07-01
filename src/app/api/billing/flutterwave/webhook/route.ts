import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, type WebhookPayload } from '@/lib/payments/flutterwave'
import { db } from '@/lib/db'

/**
 * POST /api/billing/flutterwave/webhook
 *   Flutterwave webhook endpoint for payment events.
 *
 * Flutterwave sends a POST with:
 *   - `verif-hash` header: must match FLW_WEBHOOK_HASH
 *   - Body: { event, 'event.type', data: { txRef, amount, status, ... } }
 *
 * Events handled:
 *   - charge.completed: payment successful → activate subscription
 *   - transfer.completed: payout completed
 *
 * Setup:
 *   1. Go to Flutterwave Dashboard → Settings → Webhooks
 *   2. Set URL to: https://yourdomain.com/api/billing/flutterwave/webhook
 *   3. Set Secret Hash (must match FLW_WEBHOOK_HASH env var)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('verif-hash')
    if (!verifyWebhookSignature(signature)) {
      console.warn('[Flutterwave Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload: WebhookPayload = await request.json()

    console.log(`[Flutterwave Webhook] Event: ${payload.event}, TxRef: ${payload.data?.txRef}`)

    // Only process completed charges (successful payments)
    if (payload.event === 'charge.completed' && payload.data?.status === 'successful') {
      const { txRef, amount, currency, customer } = payload.data

      // Extract tenantId from the txRef (format: AGB-{tenantIdShort}-{timestamp})
      const txRefParts = txRef.split('-')
      if (txRefParts.length >= 2) {
        const tenantIdPrefix = txRefParts[1]

        // Find the tenant by prefix (first 8 chars of tenantId)
        const tenant = await db.tenant.findFirst({
          where: { id: { startsWith: tenantIdPrefix } },
          select: { id: true, name: true },
        })

        if (tenant) {
          // Find the subscription for this tenant
          const subscription = await db.subscription.findFirst({
            where: { tenantId: tenant.id, status: { in: ['TRIAL', 'PENDING', 'ACTIVE'] } },
          })

          if (subscription) {
            // Activate the subscription
            await db.subscription.update({
              where: { id: subscription.id },
              data: {
                status: 'ACTIVE',
                trialConvertedAt: subscription.trialStartsAt ? new Date() : null,
                trialEndsAt: null,
              },
            })

            // Create a paid invoice
            await db.invoice.create({
              data: {
                tenantId: tenant.id,
                subscriptionId: subscription.id,
                invoiceNumber: `INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
                plan: subscription.plan,
                billingCycle: subscription.billingCycle,
                items: JSON.stringify([{ description: `${subscription.plan} Plan - ${subscription.billingCycle}`, amount: amount, quantity: 1, total: amount }]),
                subtotal: amount,
                total: amount,
                currency,
                status: 'PAID',
                paidAt: new Date(),
                paidAmount: amount,
                dueDate: new Date(),
              },
            })

            console.log(`[Flutterwave Webhook] Subscription activated for tenant ${tenant.name}`)
          }
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[Flutterwave Webhook] Error:', error)
    // Still return 200 to prevent retries
    return NextResponse.json({ received: true, error: error.message })
  }
}
