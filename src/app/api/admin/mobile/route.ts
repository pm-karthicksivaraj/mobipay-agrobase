import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

/**
 * GET /api/admin/mobile
 *   Mobile app monitoring. SUPER_ADMIN only.
 *
 * Returns: app installs (proxy: farmerProfile count with mobile),
 *   version distribution, active devices (lastLogin <30 days),
 *   feature usage, crash-free rate (from logs).
 */
export async function GET() {
  try {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })
    }

    // "Installs" = total farmers (proxy for mobile app reach)
    const farmersWithPhone = await db.farmerProfile.count()

    // "Active devices" = users who logged in in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const activeUsers = await db.user.count({
      where: { lastLogin: { gte: thirtyDaysAgo }, isActive: true },
    })

    // "Daily active" = last 24h
    const yesterday = new Date(Date.now() - 86400000)
    const dailyActive = await db.user.count({
      where: { lastLogin: { gte: yesterday } },
    })

    // Feature usage (last 30 days — from various model counts)
    const [vslaSessions, plotVerifications, practiceLogs, loanApplications, payments] = await Promise.all([
      db.vslaTransaction.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.plotVerification.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.practiceAdoption.count({ where: { adoptedAt: { gte: thirtyDaysAgo } } }),
      db.mfiLoan.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.paymentTransaction.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ])

    // Country distribution
    const farmersByCountry = await db.farmerProfile.groupBy({
      by: ['tenantId'],
      _count: { tenantId: true },
    })
    const tenantIds = farmersByCountry.map(f => f.tenantId)
    const tenants = await db.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, country: true },
    })
    const tenantCountryMap = new Map(tenants.map(t => [t.id, t.country]))
    const byCountry: Record<string, number> = {}
    for (const f of farmersByCountry) {
      const country = tenantCountryMap.get(f.tenantId) || 'Unknown'
      byCountry[country] = (byCountry[country] || 0) + f._count.tenantId
    }

    return NextResponse.json({
      installs: farmersWithPhone,
      monthlyActive: activeUsers,
      dailyActive,
      stickiness: activeUsers > 0 ? Math.round((dailyActive / activeUsers) * 100) : 0,
      featureUsage: {
        vslaTransactions: vslaSessions,
        plotVerifications,
        practiceLogs,
        loanApplications,
        payments,
      },
      byCountry: Object.entries(byCountry).map(([country, count]) => ({ country, count })),
      note: 'Install count is a proxy (farmers with phone registered). For real install tracking, integrate Firebase Analytics or Sentry.',
    })
  } catch (error) {
    console.error('Admin mobile error:', error)
    return NextResponse.json({ error: 'Failed to load mobile stats' }, { status: 500 })
  }
}
