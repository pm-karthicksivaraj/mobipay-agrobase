import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { getPlanLimits } from '@/lib/billing/plans'

/**
 * GET /api/billing/usage
 *
 * Returns current usage metrics for the caller's tenant, the plan limits from
 * their active subscription, percentage-used per metered metric, and a list
 * of overage warnings (one per metric that exceeds the plan limit).
 *
 * Response shape:
 *   {
 *     period:        string,                 // "YYYY-MM"
 *     usage: {
 *       farmerCount, userCount, vslaGroupCount,
 *       trainingCount, transactionCount,     // sales + purchases
 *       apiCallCount                          // from UsageRecord (current month)
 *     },
 *     plan: { plan, limits: { maxFarmers, maxUsers, price, modules } },
 *     percentages: { farmers, users },       // 0–100, or null if unlimited
 *     warnings: string[]                     // overage messages
 *   }
 */
export async function GET() {
  try {
    const ctx = await getTenantContext()

    // Super admins have no single tenant — return an empty aggregate so the
    // billing dashboard doesn't crash. (Super admins use the platform-level
    // Revenue view instead.)
    if (ctx.isSuperAdmin) {
      return NextResponse.json({
        period: currentPeriod(),
        usage: {
          farmerCount: 0,
          userCount: 0,
          vslaGroupCount: 0,
          trainingCount: 0,
          transactionCount: 0,
          apiCallCount: 0,
        },
        plan: { plan: 'ENTERPRISE', limits: getPlanLimits('ENTERPRISE') },
        percentages: { farmers: null, users: null },
        warnings: [],
      })
    }

    const tenantWhere = buildTenantFilter(ctx, 'tenantId')

    // Look up the tenant's active (or trial) subscription for plan limits.
    const subscription = await db.subscription.findFirst({
      where: {
        tenantId: ctx.tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      orderBy: { createdAt: 'desc' },
    })
    const planName = subscription?.plan ?? 'BASIC'
    const limits = getPlanLimits(planName)
    const period = currentPeriod()

    // Gather usage metrics in parallel. Sales + Purchases go through their
    // farmer relations (no direct tenantId on Purchase, optional on Sale).
    const [
      farmerCount,
      userCount,
      vslaGroupCount,
      trainingCount,
      saleCount,
      purchaseCount,
      apiCallAgg,
    ] = await Promise.all([
      db.farmerProfile.count({ where: { ...tenantWhere } }),
      db.user.count({ where: { tenantId: ctx.tenantId } }),
      db.vslaGroup.count({ where: { ...tenantWhere } }),
      db.training.count({ where: { ...tenantWhere } }),
      db.sale.count({
        where: { tenantId: ctx.tenantId },
      }),
      db.purchase.count({
        where: {
          farmer: { tenantId: ctx.tenantId },
        },
      }),
      db.usageRecord.aggregate({
        where: {
          tenantId: ctx.tenantId,
          eventType: 'API_CALL',
          period,
        },
        _sum: { count: true },
      }),
    ])

    const transactionCount = saleCount + purchaseCount
    const apiCallCount = apiCallAgg._sum.count ?? 0

    // Percentage used (null = unlimited / not metered for this plan).
    const farmersPct =
      limits.maxFarmers === Infinity || limits.maxFarmers === 0
        ? null
        : Math.round((farmerCount / limits.maxFarmers) * 100)
    const usersPct =
      limits.maxUsers === Infinity || limits.maxUsers === 0
        ? null
        : Math.round((userCount / limits.maxUsers) * 100)

    // Overage warnings: farmers / users beyond the plan limit, plus a soft
    // warning at >= 90 % usage so tenants can upgrade before hitting the wall.
    const warnings: string[] = []
    if (limits.maxFarmers !== Infinity && limits.maxFarmers > 0) {
      if (farmerCount > limits.maxFarmers) {
        warnings.push(
          `Farmers over plan limit: ${farmerCount}/${limits.maxFarmers} (overage ${farmerCount - limits.maxFarmers}). Upgrade to avoid access restrictions.`,
        )
      } else if (farmersPct !== null && farmersPct >= 90) {
        warnings.push(
          `Farmers approaching plan limit: ${farmerCount}/${limits.maxFarmers} (${farmersPct}% used).`,
        )
      }
    }
    if (limits.maxUsers !== Infinity && limits.maxUsers > 0) {
      if (userCount > limits.maxUsers) {
        warnings.push(
          `Users over plan limit: ${userCount}/${limits.maxUsers} (overage ${userCount - limits.maxUsers}). Disable inactive users or upgrade.`,
        )
      } else if (usersPct !== null && usersPct >= 90) {
        warnings.push(
          `Users approaching plan limit: ${userCount}/${limits.maxUsers} (${usersPct}% used).`,
        )
      }
    }

    return NextResponse.json({
      period,
      usage: {
        farmerCount,
        userCount,
        vslaGroupCount,
        trainingCount,
        transactionCount,
        apiCallCount,
      },
      plan: {
        plan: planName,
        billingCycle: subscription?.billingCycle ?? null,
        status: subscription?.status ?? null,
        limits,
      },
      percentages: {
        farmers: farmersPct,
        users: usersPct,
      },
      warnings,
    })
  } catch (error) {
    console.error('Usage metering error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch usage report',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

/** Returns the current month key as "YYYY-MM". */
function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
