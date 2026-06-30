import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

/**
 * GET /api/admin/dashboard
 *
 * Platform-wide overview for SUPER_ADMIN. Aggregates across ALL tenants.
 * Returns: tenant counts, farmer counts, MRR, impact summary, compliance
 * summary, platform health, mobile app stats.
 *
 * Auth: SUPER_ADMIN only.
 */
export async function GET() {
  try {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })
    }

    // ─── Tenant stats ───────────────────────────────────────
    const tenants = await db.tenant.findMany({
      select: {
        id: true, name: true, type: true, country: true, isActive: true,
        createdAt: true, parentId: true,
        _count: {
          select: {
            users: true,
            farmerProfiles: true,
            vslaGroups: true,
            subscriptions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const activeTenants = tenants.filter(t => t.isActive)
    const tenantsByType = tenants.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const tenantsByCountry = tenants.reduce((acc, t) => {
      const c = t.country || 'Unknown'
      acc[c] = (acc[c] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // ─── Farmer + user stats ────────────────────────────────
    const [totalFarmers, activeFarmers, totalUsers, activeUsers] = await Promise.all([
      db.farmerProfile.count(),
      db.farmerProfile.count({ where: { status: 'ACTIVE' } }),
      db.user.count(),
      db.user.count({ where: { isActive: true } }),
    ])

    // ─── Revenue (from Subscriptions) ───────────────────────
    const subscriptions = await db.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { tenant: { select: { name: true, country: true, type: true } } },
    })
    const mrr = subscriptions.reduce((sum, s) => {
      // Annual subscriptions contribute 1/12 to MRR
      return sum + (s.billingCycle === 'ANNUAL' ? s.amount / 12 : s.amount)
    }, 0)
    const arr = mrr * 12

    const subscriptionsByPlan = subscriptions.reduce((acc, s) => {
      acc[s.plan] = (acc[s.plan] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // ─── Impact summary (platform-wide) ─────────────────────
    const currentPeriod = new Date().toISOString().slice(0, 7)
    const [impactSnapshots, climateScores, practiceAdoptions, impactEvents, carbonCredits] = await Promise.all([
      db.impactKpiSnapshot.count({ where: { period: currentPeriod } }),
      db.climateResilienceScore.count({ where: { period: currentPeriod } }),
      db.practiceAdoption.count({ where: { verificationStatus: 'VERIFIED' } }),
      db.impactEvent.count(),
      db.carbonCredit.count({ where: { status: 'ISSUED' } }),
    ])

    // ─── Compliance summary ─────────────────────────────────
    const [eudrCompliant, eudrTotal, cbamReports, rainforestCerts, globalGapCerts] = await Promise.all([
      db.eudrCompliance.count({ where: { status: 'VERIFIED' } }),
      db.eudrCompliance.count(),
      db.cbamReport.count({ where: { status: 'SUBMITTED' } }),
      db.rainforestCertification.count({ where: { status: 'ACTIVE' } }),
      db.globalGapCertification.count({ where: { status: 'ACTIVE' } }),
    ])
    const activeCerts = rainforestCerts + globalGapCerts

    // ─── Platform health ────────────────────────────────────
    const [totalPlots, verifiedPlots, totalCoops, activeVslaGroups] = await Promise.all([
      db.plot.count(),
      db.plot.count({ where: { verificationStatus: { in: ['GPS_VERIFIED', 'SATELLITE_VERIFIED', 'VERIFIED'] } } }),
      db.company.count({ where: { type: 'Cooperative' } }),
      db.vslaGroup.count({ where: { isActive: true, isClosed: false } }),
    ])

    // ─── Recent activity (last 30 days) ─────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const [newFarmers, newTenants, newLoans, newPayments] = await Promise.all([
      db.farmerProfile.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.mfiLoan.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.paymentTransaction.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ])

    return NextResponse.json({
      tenants: {
        total: tenants.length,
        active: activeTenants.length,
        suspended: tenants.length - activeTenants.length,
        byType: tenantsByType,
        byCountry: tenantsByCountry,
        recent: tenants.slice(0, 5),
      },
      farmers: {
        total: totalFarmers,
        active: activeFarmers,
        newLast30Days: newFarmers,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      revenue: {
        mrr: Math.round(mrr),
        arr: Math.round(arr),
        activeSubscriptions: subscriptions.length,
        byPlan: subscriptionsByPlan,
        recent: subscriptions.slice(0, 5).map(s => ({
          tenant: s.tenant.name,
          plan: s.plan,
          amount: s.amount,
          cycle: s.billingCycle,
          country: s.tenant.country,
        })),
      },
      impact: {
        snapshotsComputed: impactSnapshots,
        climateScoresComputed: climateScores,
        verifiedPractices: practiceAdoptions,
        totalImpactEvents: impactEvents,
        carbonCreditsIssued: carbonCredits,
      },
      compliance: {
        eudrCompliant,
        eudrTotal,
        eudrRate: eudrTotal > 0 ? Math.round((eudrCompliant / eudrTotal) * 100) : 0,
        cbamReports,
        activeCerts,
      },
      platform: {
        totalPlots,
        verifiedPlots,
        plotVerificationRate: totalPlots > 0 ? Math.round((verifiedPlots / totalPlots) * 100) : 0,
        totalCoops,
        activeVslaGroups,
      },
      recentActivity: {
        newFarmers,
        newTenants,
        newLoans,
        newPayments,
      },
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to load dashboard', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
