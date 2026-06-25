/**
 * Agrobase V3 — Usage Tracking
 * MobiPay AgroSys Limited
 *
 * UsageTracker class for tracking, reporting, and checking plan limits.
 * Persists usage via Prisma UsageRecord model.
 */

import { db } from '@/lib/db'
import { PLANS } from './plans'

// ---------------------------------------------------------------------------
// Usage Event Types
// ---------------------------------------------------------------------------

export type UsageEventType =
  | 'FARMER_CREATED'
  | 'FARMER_DELETED'
  | 'USER_CREATED'
  | 'USER_DELETED'
  | 'API_CALL'
  | 'SMS_SENT'
  | 'STORAGE_INCREMENT'
  | 'STORAGE_DECREMENT'

// ---------------------------------------------------------------------------
// UsageTracker Class
// ---------------------------------------------------------------------------

export class UsageTracker {
  /**
   * Track a usage event. Upserts UsageRecord for the current period.
   *
   * @param tenantId  - The tenant to track for
   * @param eventType - The type of usage event
   * @param count     - Number of events (default 1)
   */
  static async track(
    tenantId: string,
    eventType: UsageEventType,
    count: number = 1,
  ): Promise<void> {
    const period = UsageTracker.getPeriodKey()

    await db.usageRecord.upsert({
      where: {
        id: `${tenantId}-${eventType}-${period}`,
      },
      create: {
        id: `${tenantId}-${eventType}-${period}`,
        tenantId,
        eventType,
        count,
        period,
      },
      update: {
        count: { increment: count },
      },
    })

    // Also log for monitoring
    if (eventType === 'API_CALL' || eventType === 'SMS_SENT') {
      console.log(`[UsageTracker] ${tenantId}: +${count} ${eventType} (${period})`)
    }
  }

  /**
   * Get an aggregated usage report for a tenant by period.
   *
   * @param tenantId - The tenant
   * @param period   - Period in YYYY-MM format (defaults to current month)
   */
  static async getReport(
    tenantId: string,
    period?: string,
  ): Promise<Record<string, number>> {
    const targetPeriod = period ?? UsageTracker.getPeriodKey()

    const records = await db.usageRecord.findMany({
      where: { tenantId, period: targetPeriod },
    })

    const report: Record<string, number> = {}
    for (const record of records) {
      report[record.eventType] = (report[record.eventType] ?? 0) + record.count
    }

    return report
  }

  /**
   * Compare usage against subscription plan limits.
   *
   * @param tenantId - The tenant to check
   * @returns { withinLimits, warnings, overages }
   */
  static async checkLimits(tenantId: string): Promise<{
    withinLimits: boolean
    warnings: string[]
    overages: string[]
  }> {
    const warnings: string[] = []
    const overages: string[] = []

    // Get the subscription plan
    const subscription = await db.subscription.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })

    const planName = subscription?.plan ?? 'FREE'
    const plan = PLANS[planName]

    if (!plan) {
      return { withinLimits: true, warnings: [], overages: [] }
    }

    // Count farmers and users from DB
    const [farmerCount, userCount] = await Promise.all([
      db.farmerProfile.count({ where: { tenantId } }),
      db.user.count({ where: { tenantId } }),
    ])

    // Check farmer limit
    if (plan.maxFarmers > 0) {
      const pct = (farmerCount / plan.maxFarmers) * 100
      if (farmerCount > plan.maxFarmers) {
        overages.push(`Farmers: ${farmerCount}/${plan.maxFarmers} (${Math.round(pct)}%)`)
      } else if (pct >= 90) {
        warnings.push(`Farmers: ${farmerCount}/${plan.maxFarmers} (${Math.round(pct)}%)`)
      }
    }

    // Check user limit
    if (plan.maxUsers > 0) {
      const pct = (userCount / plan.maxUsers) * 100
      if (userCount > plan.maxUsers) {
        overages.push(`Users: ${userCount}/${plan.maxUsers} (${Math.round(pct)}%)`)
      } else if (pct >= 90) {
        warnings.push(`Users: ${userCount}/${plan.maxUsers} (${Math.round(pct)}%)`)
      }
    }

    return {
      withinLimits: overages.length === 0,
      warnings,
      overages,
    }
  }

  /**
   * Returns the period key as "YYYY-MM" string.
   *
   * @param date - Optional date (defaults to now)
   */
  static getPeriodKey(date?: Date): string {
    const d = date ?? new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
}