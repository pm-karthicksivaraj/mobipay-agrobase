/**
 * Agrobase V3 — Mobile API Layer
 * Provides optimized endpoints for Flutter/mobile apps:
 * - Consolidated sync endpoints (reduce round trips)
 * - Offline-first data bundles
 * - Delta sync with last-sync timestamps
 * - Lightweight farmer profile cards
 */

import { db } from '@/lib/db'

export class MobileSyncEngine {
  /**
   * Get all data a mobile app needs for offline use, based on what changed since lastSync.
   * Returns a consolidated bundle to minimize API calls.
   */
  async getSyncBundle(tenantId: string, userId: string, lastSync?: string) {
    const since = lastSync ? new Date(lastSync) : undefined
    const where = since ? { tenantId, updatedAt: { gte: since } } : { tenantId }

    // Parallel fetch all mobile-relevant data
    const [farmers, groups, purchases, notifications, user] = await Promise.all([
      // Farmer cards (lightweight)
      db.farmerProfile.findMany({
        where,
        select: {
          id: true, firstName: true, lastName: true, phone: true,
          farmerCode: true, gender: true, status: true, villageId: true,
          gpsLatitude: true, gpsLongitude: true, updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 500,
      }),
      // VSLA groups summary
      db.vslaGroup.findMany({
        where,
        select: { id: true, name: true, isActive: true, isClosed: true, updatedAt: true },
        take: 100,
      }),
      // Recent purchases
      db.purchase.findMany({
        where: { farmer: { tenantId }, ...(since ? { updatedAt: { gte: since } } : {}) },
        select: { id: true, commodity: true, quantity: true, totalAmount: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      // Recent notifications
      db.notification.findMany({
        where: { tenantId, userId, ...(since ? { createdAt: { gte: since } } : {}) },
        select: { id: true, channel: true, category: true, subject: true, body: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      // User profile
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, firstName: true, lastName: true, phone: true, role: true, avatarUrl: true, tenantId: true },
      }),
    ])

    const serverTimestamp = new Date().toISOString()

    return {
      serverTimestamp,
      lastSync: lastSync || null,
      counts: {
        farmers: farmers.length,
        groups: groups.length,
        purchases: purchases.length,
        notifications: notifications.length,
      },
      user,
      farmers,
      groups,
      purchases,
      notifications,
    }
  }

  /**
   * Get a farmer's complete profile for the mobile detail view.
   * Includes farm lands, recent purchases, and credit score.
   */
  async getFarmerProfile(farmerId: string, tenantId: string) {
    const farmer = await db.farmerProfile.findFirst({
      where: { id: farmerId, tenantId },
      include: {
      },
    })

    if (!farmer) return null

    const [purchases, creditScore] = await Promise.all([
      db.purchase.findMany({
        where: { farmerId, status: 'APPROVED' },
        select: { id: true, commodity: true, quantity: true, totalAmount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      db.creditScore.findFirst({
        where: { farmerId },
        orderBy: { scoreDate: 'desc' },
        select: { id: true, totalScore: true, scoreDate: true },
      }),
    ])

    return {
      ...farmer,
      recentPurchases: purchases,
      creditScore,
    }
  }

  /**
   * Get dashboard summary for mobile home screen.
   * Single call replaces 5+ individual API calls.
   */
  async getMobileDashboard(tenantId: string, userId: string) {
    const [farmerCount, purchaseStats, activeShipments, pendingNotifications] = await Promise.all([
      db.farmerProfile.count({ where: { tenantId } }),
      db.purchase.aggregate({
        where: { farmer: { tenantId }, status: 'APPROVED' },
        _sum: { totalAmount: true },
        _count: true,
      }),
      db.shipment.count({ where: { tenantId, status: 'IN_TRANSIT' } }),
      db.notification.count({ where: { tenantId, userId, status: 'PENDING' } }),
    ])

    return {
      farmers: { total: farmerCount },
      purchases: {
        count: purchaseStats._count || 0,
        revenue: purchaseStats._sum?.totalAmount ?? 0,
      },
      shipments: { inTransit: activeShipments },
      notifications: { pending: pendingNotifications },
      lastRefreshed: new Date().toISOString(),
    }
  }

  /**
   * Search farmers by name or phone (mobile-optimized with minimal fields).
   */
  async searchFarmers(tenantId: string, query: string, limit = 20) {
    if (!query || query.length < 2) return []

    return db.farmerProfile.findMany({
      where: {
        tenantId,
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { phone: { contains: query } },
          { farmerCode: { contains: query } },
        ],
        status: 'ACTIVE',
      },
      select: {
        id: true, firstName: true, lastName: true, phone: true,
        farmerCode: true, gender: true, villageId: true,
      },
      take: limit,
    })
  }
}

export const mobileSyncEngine = new MobileSyncEngine()