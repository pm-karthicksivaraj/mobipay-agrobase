import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment } from '@/lib/payments/flutterwave'
import { db } from '@/lib/db'

/**
 * GET /api/billing/flutterwave/verify?tx_ref=xxx
 *   Verify a Flutterwave payment after user is redirected back.
 *   Used by the billing callback page.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const txRef = searchParams.get('tx_ref') || searchParams.get('txRef')

    if (!txRef) {
      return NextResponse.json({ error: 'tx_ref is required' }, { status: 400 })
    }

    const result = await verifyPayment(txRef)

    if (result.success) {
      // Find tenant from txRef
      const parts = txRef.split('-')
      if (parts.length >= 2) {
        const tenant = await db.tenant.findFirst({
          where: { id: { startsWith: parts[1] } },
          select: { id: true, name: true },
        })

        if (tenant) {
          const subscription = await db.subscription.findFirst({
            where: { tenantId: tenant.id },
          })

          if (subscription && subscription.status !== 'ACTIVE') {
            await db.subscription.update({
              where: { id: subscription.id },
              data: {
                status: 'ACTIVE',
                trialConvertedAt: subscription.trialStartsAt ? new Date() : null,
                trialEndsAt: null,
              },
            })
          }
        }
      }

      return NextResponse.json({
        success: true,
        status: 'successful',
        amount: result.amount,
        message: 'Payment verified successfully. Your subscription is now active.',
      })
    } else {
      return NextResponse.json({
        success: false,
        status: result.status,
        message: 'Payment verification failed or payment is still pending.',
      })
    }
  } catch (error: any) {
    console.error('Payment verification error:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
