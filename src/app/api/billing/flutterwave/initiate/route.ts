import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { chargeSubscription } from '@/lib/payments/flutterwave'
import { db } from '@/lib/db'

/**
 * POST /api/billing/flutterwave/initiate
 *   Initialize a subscription payment via Flutterwave.
 *   Returns a payment link for the user to complete payment.
 *
 * Body: { plan, billingCycle, redirectUrl? }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { plan, billingCycle, redirectUrl } = body

    // Get tenant info
    const tenant = await db.tenant.findFirst({
      where: { id: ctx.tenantId },
      select: { id: true, name: true, country: true, defaultCurrency: true },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get user email
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { email: true, phone: true, firstName: true, lastName: true },
    })

    if (!user?.email) {
      return NextResponse.json({ error: 'Email required for billing' }, { status: 400 })
    }

    // Determine amount based on plan
    const PRICES: Record<string, { MONTHLY: number; ANNUAL: number }> = {
      BASIC: { MONTHLY: 50, ANNUAL: 540 },
      PROFESSIONAL: { MONTHLY: 200, ANNUAL: 2160 },
      ENTERPRISE: { MONTHLY: 500, ANNUAL: 5400 },
      MARKETPLACE: { MONTHLY: 0, ANNUAL: 0 },
    }

    const price = PRICES[plan]?.[billingCycle] || PRICES.BASIC.MONTHLY
    if (price === 0) {
      return NextResponse.json({ error: 'Marketplace plan has no subscription fee' }, { status: 400 })
    }

    // Initialize payment
    const result = await chargeSubscription({
      tenantId: tenant.id,
      amount: price,
      currency: 'USD',
      email: user.email,
      phone: user.phone || undefined,
      name: `${user.firstName} ${user.lastName}`,
      plan,
      billingCycle,
      description: `Agrobase V3 ${plan} Plan — ${billingCycle}`,
      redirectUrl,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        paymentLink: result.paymentLink,
        reference: result.reference,
        amount: price,
        currency: 'USD',
      })
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Flutterwave payment init error:', error)
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
  }
}
