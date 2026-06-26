/**
 * Agrobase V3 — Analytics Engine
 * Provides KPI calculations, trend analysis, and dashboard data aggregation.
 */

import { db } from '@/lib/db'
import type { TrendRequest, TrendDataPoint } from './types'

export class AnalyticsEngine {
  /**
   * Get tenant-wide KPIs across all modules.
   */
  async getKPIs(tenantId: string, period: 'month' | 'quarter' | 'year' = 'month') {
    try {
      const now = new Date()
      const startDate = period === 'year'
        ? new Date(now.getFullYear(), 0, 1)
        : period === 'quarter'
          ? new Date(now.getFullYear(), now.getMonth() - 3, 1)
          : new Date(now.getFullYear(), now.getMonth(), 1)

      const tf = { tenantId }

      const [farmerCount, purchaseStats, activeShipments, stockSummary, partnerCount, contractStats] = await Promise.all([
        db.farmerProfile.count({ where: tf }),
        db.purchase.aggregate({
          where: { farmer: { tenantId }, createdAt: { gte: startDate }, status: 'APPROVED' },
          _sum: { totalAmount: true },
          _count: true,
        }),
        db.shipment.count({ where: { ...tf, status: 'IN_TRANSIT' } }),
        db.stockItem.aggregate({
          where: { ...tf, status: 'AVAILABLE' },
          _sum: { quantity: true },
          _count: true,
        }),
        db.partner.count({ where: { ...tf, isActive: true } }),
        db.contract.aggregate({
          where: { ...tf, status: 'ACTIVE' },
          _sum: { totalValue: true },
          _count: true,
        }),
      ])

      return {
        period,
        dateRange: { from: startDate.toISOString(), to: now.toISOString() },
        farmers: {
          total: farmerCount,
        },
        purchases: {
          count: purchaseStats._count || 0,
          revenue: purchaseStats._sum?.totalAmount ?? 0,
        },
        shipments: {
          inTransit: activeShipments,
        },
        inventory: {
          totalItems: stockSummary._count || 0,
          totalQuantity: stockSummary._sum?.quantity ?? 0,
        },
        partners: {
          active: partnerCount,
        },
        contracts: {
          active: contractStats._count || 0,
          totalValue: contractStats._sum?.totalValue ?? 0,
        },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to get KPIs: ${msg}`)
    }
  }

  /**
   * Get trend data for a metric over time.
   */
  async getTrends(tenantId: string, request: TrendRequest): Promise<TrendDataPoint[]> {
    try {
      const months = request.months || 6
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)

      const results: TrendDataPoint[] = []

      switch (request.metric) {
        case 'farmer-registrations': {
          const data = await db.farmerProfile.groupBy({
            by: ['createdAt'],
            where: { tenantId, createdAt: { gte: startDate } },
            _count: true,
          })
          return this.groupByMonth(data, 'createdAt', months, now)
        }
        case 'purchases': {
          const data = await db.purchase.findMany({
            where: { farmer: { tenantId }, createdAt: { gte: startDate } },
            select: { createdAt: true, totalAmount: true },
          })
          return this.aggregateByMonth(data.map((p) => ({ date: p.createdAt, value: p.totalAmount || 0 })), months, now, 'sum')
        }
        case 'shipments': {
          const data = await db.shipment.findMany({
            where: { tenantId, createdAt: { gte: startDate } },
            select: { createdAt: true },
          })
          return this.groupByMonth(data, 'createdAt', months, now)
        }
        default: {
          return results
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to get trends: ${msg}`)
    }
  }

  /**
   * Get dashboard summary data.
   */
  async getDashboard(tenantId: string) {
    try {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const tf = { tenantId }

      const [monthlyPurchases, monthlyRevenue, activePartners, inTransitShipments] = await Promise.all([
        db.purchase.aggregate({
          where: { ...tf, createdAt: { gte: startOfMonth } },
          _count: true,
        }),
        db.purchase.aggregate({
          where: { ...tf, createdAt: { gte: startOfMonth }, status: 'APPROVED' },
          _sum: { totalAmount: true },
        }),
        db.partner.count({ where: { ...tf, isActive: true } }),
        db.shipment.count({ where: { ...tf, status: 'IN_TRANSIT' } }),
      ])

      return {
        monthlyPurchases: monthlyPurchases._count || 0,
        monthlyRevenue: monthlyRevenue._sum?.totalAmount ?? 0,
        activePartners,
        inTransitShipments,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to get dashboard: ${msg}`)
    }
  }

  // --- Helpers ---

  private groupByMonth(data: Array<Record<string, any>>, dateField: string, months: number, now: Date): TrendDataPoint[] {
    const grouped = this.initMonthBuckets(months, now)
    for (const item of data) {
      const d = new Date(item[dateField])
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const bucket = grouped.get(key)
      if (bucket) bucket.value += 1
    }
    return Array.from(grouped.values()).reverse()
  }

  private aggregateByMonth(items: Array<{ date: Date; value: number }>, months: number, now: Date, mode: 'sum' | 'avg' = 'sum'): TrendDataPoint[] {
    const grouped = this.initMonthBuckets(months, now)
    const counts = new Map<string, number>()

    for (const item of items) {
      const key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`
      const bucket = grouped.get(key)
      if (bucket) {
        bucket.value += item.value
        counts.set(key, (counts.get(key) || 0) + 1)
      }
    }

    if (mode === 'avg') {
      for (const [key, bucket] of grouped) {
        const count = counts.get(key) || 0
        if (count > 0) bucket.value = Math.round((bucket.value / count) * 100) / 100
      }
    }

    return Array.from(grouped.values()).reverse()
  }

  private initMonthBuckets(months: number, now: Date): Map<string, TrendDataPoint> {
    const map = new Map<string, TrendDataPoint>()
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      map.set(key, { period: key, value: 0 })
    }
    return map
  }
}

export const analyticsEngine = new AnalyticsEngine()