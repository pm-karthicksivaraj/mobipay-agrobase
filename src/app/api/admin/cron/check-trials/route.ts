import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/cron/check-trials
 *
 * Suspends any subscription whose trial period has expired. Designed to be
 * invoked by Vercel Cron once per day.
 *
 * Selects subscriptions where:
 *   status = 'TRIAL' AND trialEndsAt < now()
 *
 * For each match:
 *   - Sets subscription `status = 'SUSPENDED'`
 *   - Also suspends the related tenant (only if currently `isActive = true`,
 *     so previously-manually-suspended tenants are not reactivated)
 *
 * Returns the count of suspended subscriptions and the list of suspended
 * subscription IDs.
 *
 * Auth (mirrors /api/impact/cron/compute pattern):
 *   - If `CRON_SECRET` is set in env, the request must include either the
 *     `x-cron-secret` header or `?secret=` query string matching it.
 *   - If `CRON_SECRET` is not set, falls back to requiring SUPER_ADMIN
 *     (useful for manual invocation in dev).
 */
export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const { searchParams } = new URL(request.url)
      const headerSecret = request.headers.get('x-cron-secret')
      const querySecret = searchParams.get('secret')
      if (headerSecret !== cronSecret && querySecret !== cronSecret) {
        return NextResponse.json({ error: 'Invalid cron secret' }, { status: 401 })
      }
    } else {
      // No secret configured — require super admin (dev convenience)
      const { getTenantContext } = await import('@/lib/tenant')
      const ctx = await getTenantContext()
      if (!ctx.isSuperAdmin) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    const now = new Date()

    // Find every TRIAL subscription that has passed its trialEndsAt.
    const expired = await db.subscription.findMany({
      where: {
        status: 'TRIAL',
        trialEndsAt: { lt: now },
      },
      select: {
        id: true,
        tenantId: true,
        plan: true,
        trialStartsAt: true,
        trialEndsAt: true,
      },
    })

    if (expired.length === 0) {
      return NextResponse.json({
        checkedAt: now.toISOString(),
        suspendedCount: 0,
        suspended: [],
      })
    }

    // Flip each expired trial to SUSPENDED in parallel.
    const suspended = await Promise.all(
      expired.map(s =>
        db.subscription.update({
          where: { id: s.id },
          data: { status: 'SUSPENDED' },
          select: { id: true, tenantId: true, plan: true, trialEndsAt: true },
        })
      )
    )

    // Also suspend the tenant itself so the platform-wide isActive flag
    // reflects the trial expiry. Only flip tenants that are currently
    // active so we don't accidentally reactivate previously-manually-suspended
    // tenants.
    const tenantIds = Array.from(new Set(suspended.map(s => s.tenantId)))
    if (tenantIds.length > 0) {
      await db.tenant.updateMany({
        where: { id: { in: tenantIds }, isActive: true },
        data: { isActive: false },
      })
    }

    return NextResponse.json({
      checkedAt: now.toISOString(),
      suspendedCount: suspended.length,
      suspended: suspended.map(s => ({
        id: s.id,
        tenantId: s.tenantId,
        plan: s.plan,
        trialEndsAt: s.trialEndsAt,
      })),
    })
  } catch (error) {
    console.error('check-trials cron error:', error)
    return NextResponse.json({ error: 'Failed to check trials' }, { status: 500 })
  }
}
