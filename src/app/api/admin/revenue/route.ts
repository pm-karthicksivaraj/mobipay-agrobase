import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

/**
 * GET /api/admin/revenue
 *   Platform-wide revenue analytics. SUPER_ADMIN only.
 *
 * Returns: MRR, ARR, revenue by plan, revenue by country, churn,
 * recent invoices, revenue trend (last 12 months).
 */
export async function GET() {
  try {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })
    }

    // All subscriptions
    const subscriptions = await db.subscription.findMany({
      include: { tenant: { select: { name: true, country: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const active = subscriptions.filter(s => s.status === 'ACTIVE')
    const mrr = active.reduce((sum, s) => sum + (s.billingCycle === 'ANNUAL' ? s.amount / 12 : s.amount), 0)
    const arr = mrr * 12

    // Revenue by plan
    const byPlan = active.reduce((acc, s) => {
      if (!acc[s.plan]) acc[s.plan] = { count: 0, mrr: 0 }
      acc[s.plan].count++
      acc[s.plan].mrr += s.billingCycle === 'ANNUAL' ? s.amount / 12 : s.amount
      return acc
    }, {} as Record<string, { count: number; mrr: number }>)

    // Revenue by country
    const byCountry = active.reduce((acc, s) => {
      const c = s.tenant.country || 'Unknown'
      if (!acc[c]) acc[c] = { count: 0, mrr: 0 }
      acc[c].count++
      acc[c].mrr += s.billingCycle === 'ANNUAL' ? s.amount / 12 : s.amount
      return acc
    }, {} as Record<string, { count: number; mrr: number }>)

    // Revenue by tenant type
    const byType = active.reduce((acc, s) => {
      if (!acc[s.tenant.type]) acc[s.tenant.type] = { count: 0, mrr: 0 }
      acc[s.tenant.type].count++
      acc[s.tenant.type].mrr += s.billingCycle === 'ANNUAL' ? s.amount / 12 : s.amount
      return acc
    }, {} as Record<string, { count: number; mrr: number }>)

    // Churn (subscriptions cancelled in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const churned = subscriptions.filter(s =>
      s.status !== 'ACTIVE' && s.updatedAt >= thirtyDaysAgo
    ).length
    const churnRate = active.length + churned > 0
      ? Math.round((churned / (active.length + churned)) * 100)
      : 0

    // Revenue trend (last 12 months — based on subscription start dates)
    const trend: { month: string; mrr: number; newSubs: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthStr = d.toISOString().slice(0, 7)
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const newSubs = subscriptions.filter(s =>
        s.createdAt >= monthStart && s.createdAt < monthEnd
      ).length
      // MRR = sum of all active subscriptions that existed in this month
      const monthMrr = active
        .filter(s => s.createdAt < monthEnd)
        .reduce((sum, s) => sum + (s.billingCycle === 'ANNUAL' ? s.amount / 12 : s.amount), 0)
      trend.push({ month: monthStr, mrr: Math.round(monthMrr), newSubs })
    }

    return NextResponse.json({
      summary: {
        mrr: Math.round(mrr),
        arr: Math.round(arr),
        activeSubscriptions: active.length,
        churnedThisMonth: churned,
        churnRate,
      },
      byPlan: Object.entries(byPlan).map(([plan, d]) => ({
        plan, count: d.count, mrr: Math.round(d.mrr),
      })),
      byCountry: Object.entries(byCountry).map(([country, d]) => ({
        country, count: d.count, mrr: Math.round(d.mrr),
      })),
      byType: Object.entries(byType).map(([type, d]) => ({
        type, count: d.count, mrr: Math.round(d.mrr),
      })),
      trend,
      recent: subscriptions.slice(0, 10).map(s => ({
        id: s.id,
        tenant: s.tenant.name,
        country: s.tenant.country,
        type: s.tenant.type,
        plan: s.plan,
        amount: s.amount,
        cycle: s.billingCycle,
        status: s.status,
        startDate: s.startDate,
        endDate: s.endDate,
      })),
    })
  } catch (error) {
    console.error('Admin revenue error:', error)
    return NextResponse.json({ error: 'Failed to load revenue' }, { status: 500 })
  }
}
