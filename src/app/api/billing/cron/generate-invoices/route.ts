import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * GET /api/billing/cron/generate-invoices
 *
 * Daily cron that walks every ACTIVE subscription whose current billing-cycle
 * start date has passed and — if no invoice has been created for the current
 * cycle yet — generates a new PENDING invoice.
 *
 * Auth pattern (mirrors /api/impact/cron/compute):
 *   - Vercel Cron: sends `Authorization: Bearer <CRON_SECRET>` + `x-vercel-cron: 1`.
 *   - Manual / external scheduler: send `x-cron-secret: <CRON_SECRET>`.
 *   - Dev fallback (no CRON_SECRET configured): require SUPER_ADMIN session.
 *
 * Invoice number format: INV-YYYYMM-XXXX  (4-digit sequence per calendar month).
 * Due date: now + 7 days.
 */
export async function GET(request: Request) {
  try {
    // ─── Auth ────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization') || ''
    const vercelCronHeader = request.headers.get('x-vercel-cron')
    const cronSecretHeader = request.headers.get('x-cron-secret')
    const isVercelCron = vercelCronHeader === '1' || authHeader.startsWith('Bearer ')

    const configuredSecret =
      process.env.CRON_SECRET || process.env.BILLING_CRON_SECRET

    if (isVercelCron || cronSecretHeader) {
      if (configuredSecret) {
        const provided = cronSecretHeader || authHeader.replace('Bearer ', '')
        if (provided !== configuredSecret) {
          return NextResponse.json(
            { error: 'Invalid cron secret' },
            { status: 401 },
          )
        }
      }
      // If no secret configured, allow the cron through (Vercel-managed auth).
    } else {
      // No cron headers — require SUPER_ADMIN.
      const { getTenantContext } = await import('@/lib/tenant')
      const ctx = await getTenantContext()
      if (!ctx.isSuperAdmin) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 },
        )
      }
    }

    // ─── Find ACTIVE subscriptions whose cycle start has passed ─────────
    const now = new Date()
    const subscriptions = await db.subscription.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: now },
      },
    })

    // Pre-fetch invoice-number prefix counts for the current month so we can
    // generate sequential `INV-YYYYMM-XXXX` numbers without a round-trip per
    // subscription. We re-count after each insert to stay accurate.
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const prefix = `INV-${yyyymm}-`
    let sequence = await db.invoice.count({
      where: { invoiceNumber: { startsWith: prefix } },
    })

    const generated: Array<{ subscriptionId: string; invoiceId: string; invoiceNumber: string }> = []
    const errors: string[] = []

    for (const sub of subscriptions) {
      try {
        // Compute the current billing cycle's start date by walking forward
        // from sub.startDate in cycle-length increments.
        const cycleMonths =
          sub.billingCycle === 'ANNUAL' ? 12
            : sub.billingCycle === 'QUARTERLY' ? 3
              : 1

        const cycleStart = new Date(sub.startDate)
        // Advance cycleStart by `cycleMonths` until the next cycle would
        // start in the future.
        while (true) {
          const next = new Date(cycleStart)
          next.setMonth(next.getMonth() + cycleMonths)
          if (next.getTime() <= now.getTime()) {
            cycleStart.setTime(next.getTime())
          } else {
            break
          }
        }

        // Skip if an invoice already exists for this subscription in the
        // current cycle (idempotent — safe to run multiple times per day).
        const existing = await db.invoice.findFirst({
          where: {
            subscriptionId: sub.id,
            createdAt: { gte: cycleStart },
          },
          select: { id: true },
        })
        if (existing) continue

        // Determine currency from tenant country (UG → UGX, GH → GHS, KE → KES).
        const tenant = await db.tenant.findUnique({
          where: { id: sub.tenantId },
          select: { country: true, name: true },
        })
        const currency =
          tenant?.country === 'GH' ? 'GHS'
            : tenant?.country === 'KE' ? 'KES'
              : 'UGX'

        // Generate sequential invoice number INV-YYYYMM-XXXX.
        sequence += 1
        const invoiceNumber = `${prefix}${String(sequence).padStart(4, '0')}`

        const dueDate = new Date(now.getTime() + 7 * 86400 * 1000)

        const items = [
          {
            description: `${sub.plan} plan — ${sub.billingCycle} billing cycle`,
            amount: sub.amount,
            quantity: 1,
            total: sub.amount,
          },
        ]

        const invoice = await db.invoice.create({
          data: {
            tenantId: sub.tenantId,
            subscriptionId: sub.id,
            invoiceNumber,
            plan: sub.plan,
            billingCycle: sub.billingCycle,
            items: JSON.stringify(items),
            subtotal: sub.amount,
            tax: 0,
            taxRate: 0,
            total: sub.amount,
            currency,
            status: 'PENDING',
            dueDate,
          },
        })

        generated.push({
          subscriptionId: sub.id,
          invoiceId: invoice.id,
          invoiceNumber,
        })
      } catch (err) {
        errors.push(
          `Subscription ${sub.id}: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    return NextResponse.json({
      generatedAt: now.toISOString(),
      subscriptionsScanned: subscriptions.length,
      invoicesGenerated: generated.length,
      generated,
      errors,
    })
  } catch (error) {
    console.error('Invoice generation cron error:', error)
    return NextResponse.json(
      {
        error: 'Cron failed',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
