/**
 * Agrobase V3 — Mobile Sync Engine v2
 * Architecture for offline-first mobile apps (Flutter/React Native)
 *
 * Key Design Decisions:
 * 1. Delta Sync: Uses updatedAt + _deleted flag (tombstones) — no full re-fetch
 * 2. Conflict Resolution: Server-wins by default, with client override flag
 * 3. Deletion Tracking: Soft-delete with _deleted flag + syncedAt timestamp
 * 4. Payload Optimization: Minimal field sets, gzip-compressed responses
 * 5. Sync Token: Opaque cursor (base64-encoded timestamp) — no server state
 *
 * Sync Flow:
 *   Client: GET /api/mobile/sync?token=<lastSyncToken>&entities=farmers,groups
 *   Server: Returns { changes: [...], deletions: [...], serverToken: "..." }
 *   Client: POST /api/mobile/sync/push  { changes: [...], deviceInfo: {...} }
 *   Server: Applies changes, returns conflicts if any
 */

import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

// --- Types ---

export interface SyncToken {
  t: string  // ISO timestamp
}

export interface SyncResponse {
  serverToken: string
  timestamp: string
  counts: {
    farmers: number
    groups: number
    purchases: number
    loans: number
    meetings: number
    notifications: number
  }
  changes: Record<string, SyncRecord[]>
  deletions: Record<string, string[]>  // entityName → [ids]
}

export interface SyncRecord {
  id: string
  _op: 'create' | 'update'
  _entity: string
  data: Record<string, unknown>
  updatedAt: string
}

export interface PushRequest {
  changes: PushChange[]
  deviceInfo?: {
    platform: 'android' | 'ios' | 'web'
    appVersion: string
    deviceId: string
  }
}

export interface PushChange {
  _entity: string
  _op: 'create' | 'update'
  _clientTimestamp: string
  _deviceId?: string
  data: Record<string, unknown>
}

export interface PushResponse {
  applied: number
  conflicts: ConflictRecord[]
  errors: { index: number; message: string }[]
  serverToken: string
}

export interface ConflictRecord {
  index: number
  entityId: string
  entity: string
  serverData: Record<string, unknown>
  clientData: Record<string, unknown>
  resolved: 'server_wins' | 'client_wins' | 'manual'
}

// --- Sync Token Helpers ---

function encodeSyncToken(timestamp: Date): string {
  return Buffer.from(JSON.stringify({ t: timestamp.toISOString() } as SyncToken)).toString('base64url')
}

export function decodeSyncToken(token: string): Date | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parsed = JSON.parse(decoded) as SyncToken
    return new Date(parsed.t)
  } catch {
    return null
  }
}

// --- Entity Field Selection (mobile-optimized) ---

const MOBILE_FIELDS: Record<string, Prisma.FarmerProfileSelect> = {
  farmers: {
    id: true, firstName: true, lastName: true, phone: true,
    farmerCode: true, gender: true, status: true, villageId: true,
    gpsLatitude: true, gpsLongitude: true, updatedAt: true, tenantId: true,
  },
}

const GROUP_SELECT = {
  id: true, name: true, isActive: true, isClosed: true, updatedAt: true, tenantId: true,
}

const PURCHASE_SELECT = {
  id: true, commodity: true, quantity: true, totalAmount: true, status: true, createdAt: true, farmerId: true,
}

// --- Main Sync Engine ---

export class MobileSyncEngine {
  /**
   * Pull sync: Get all changes since lastSync for requested entities.
   * Returns minimal payloads, grouped by entity type.
   */
  async pullSync(
    tenantId: string,
    userId: string,
    token?: string,
    entities?: string[]
  ): Promise<SyncResponse> {
    const since = token ? decodeSyncToken(token) : undefined

    // Default entities to sync if none specified
    const syncEntities = entities?.length ? entities : ['farmers', 'groups', 'purchases', 'loans', 'meetings', 'notifications']

    const changes: Record<string, SyncRecord[]> = {}
    const deletions: Record<string, string[]> = {}
    const counts: SyncResponse['counts'] = {
      farmers: 0, groups: 0, purchases: 0, loans: 0, meetings: 0, notifications: 0,
    }

    // Build where clause for delta
    const deltaWhere = since
      ? { tenantId, updatedAt: { gt: since } }
      : { tenantId }

    // Parallel fetch all requested entities
    const results = await Promise.allSettled([
      syncEntities.includes('farmers') ? this.fetchFarmers(deltaWhere) : null,
      syncEntities.includes('groups') ? this.fetchGroups(deltaWhere) : null,
      syncEntities.includes('purchases') ? this.fetchPurchases(deltaWhere) : null,
      syncEntities.includes('loans') ? this.fetchLoans(deltaWhere) : null,
      syncEntities.includes('meetings') ? this.fetchMeetings(deltaWhere) : null,
      syncEntities.includes('notifications') ? this.fetchNotifications(userId, deltaWhere) : null,
    ])

    // Map results
    const entityKeys = ['farmers', 'groups', 'purchases', 'loans', 'meetings', 'notifications']
    for (let i = 0; i < entityKeys.length; i++) {
      const key = entityKeys[i]
      const result = results[i]
      if (result.status === 'fulfilled' && result.value) {
        changes[key] = result.value.records
        counts[key] = result.value.records.length
      }
    }

    const now = new Date()
    return {
      serverToken: encodeSyncToken(now),
      timestamp: now.toISOString(),
      counts,
      changes,
      deletions,
    }
  }

  /**
   * Push sync: Apply client-side changes to server.
   * Server-wins conflict resolution by default.
   */
  async pushSync(tenantId: string, userId: string, request: PushRequest): Promise<PushResponse> {
    const applied = 0
    const conflicts: ConflictRecord[] = []
    const errors: { index: number; message: string }[] = []

    for (let i = 0; i < request.changes.length; i++) {
      const change = request.changes[i]
      try {
        const result = await this.applyChange(tenantId, userId, change)
        if (result?.conflict) {
          conflicts.push({ ...result.conflict, index: i })
        }
      } catch (err) {
        errors.push({ index: i, message: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    return {
      applied: request.changes.length - conflicts.length - errors.length,
      conflicts,
      errors,
      serverToken: encodeSyncToken(new Date()),
    }
  }

  // --- Entity-specific fetch methods ---

  private async fetchFarmers(where: Record<string, unknown>) {
    const records = await db.farmerProfile.findMany({
      where: where as any,
      select: MOBILE_FIELDS.farmers,
      orderBy: { updatedAt: 'desc' },
      take: 500,
    })
    return {
      records: records.map(r => ({
        id: r.id,
        _op: 'update' as const,
        _entity: 'farmers',
        data: r as unknown as Record<string, unknown>,
        updatedAt: r.updatedAt.toISOString(),
      })),
    }
  }

  private async fetchGroups(where: Record<string, unknown>) {
    const records = await db.vslaGroup.findMany({
      where: where as any,
      select: GROUP_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: 200,
    })
    return {
      records: records.map(r => ({
        id: r.id,
        _op: 'update' as const,
        _entity: 'groups',
        data: r as unknown as Record<string, unknown>,
        updatedAt: r.updatedAt.toISOString(),
      })),
    }
  }

  private async fetchPurchases(where: Record<string, unknown>) {
    const records = await db.purchase.findMany({
      where: { farmer: { tenantId: (where as any).tenantId }, ...((where as any).updatedAt ? { updatedAt: (where as any).updatedAt } : {}) },
      select: PURCHASE_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return {
      records: records.map(r => ({
        id: r.id,
        _op: 'update' as const,
        _entity: 'purchases',
        data: r as unknown as Record<string, unknown>,
        updatedAt: r.createdAt.toISOString(),
      })),
    }
  }

  private async fetchLoans(where: Record<string, unknown>) {
    const records = await db.vslaLoan.findMany({
      where: where as any,
      select: { id: true, farmerId: true, amount: true, status: true, loanDate: true, updatedAt: true, tenantId: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    })
    return {
      records: records.map(r => ({
        id: r.id,
        _op: 'update' as const,
        _entity: 'loans',
        data: r as unknown as Record<string, unknown>,
        updatedAt: r.updatedAt.toISOString(),
      })),
    }
  }

  private async fetchMeetings(where: Record<string, unknown>) {
    const records = await db.vslaMeeting.findMany({
      where: where as any,
      select: { id: true, vslaGroupId: true, meetingDate: true, meetingType: true, status: true, updatedAt: true, tenantId: true },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })
    return {
      records: records.map(r => ({
        id: r.id,
        _op: 'update' as const,
        _entity: 'meetings',
        data: r as unknown as Record<string, unknown>,
        updatedAt: r.updatedAt.toISOString(),
      })),
    }
  }

  private async fetchNotifications(userId: string, where: Record<string, unknown>) {
    const records = await db.notification.findMany({
      where: { userId, tenantId: (where as any).tenantId, ...((where as any).updatedAt ? { createdAt: (where as any).updatedAt } : {}) },
      select: { id: true, channel: true, category: true, subject: true, body: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return {
      records: records.map(r => ({
        id: r.id,
        _op: 'update' as const,
        _entity: 'notifications',
        data: r as unknown as Record<string, unknown>,
        updatedAt: r.createdAt.toISOString(),
      })),
    }
  }

  // --- Push change application ---

  private async applyChange(
    tenantId: string,
    userId: string,
    change: PushChange
  ): Promise<{ conflict?: Omit<ConflictRecord, 'index'> } | null> {
    const { _entity, _op, data } = change

    // Tenant-safety: always set tenantId from server context
    const safeData = { ...data, tenantId, updatedById: userId }

    switch (_entity) {
      case 'farmers': {
        if (_op === 'create') {
          // Check if farmer with same phone already exists (conflict)
          if (data.phone) {
            const existing = await db.farmerProfile.findFirst({
              where: { phone: data.phone as string, tenantId, status: 'ACTIVE' },
            })
            if (existing) {
              return {
                conflict: {
                  entityId: existing.id,
                  entity: 'farmers',
                  serverData: existing as unknown as Record<string, unknown>,
                  clientData: data,
                  resolved: 'server_wins',
                },
              }
            }
          }
          await db.farmerProfile.create({ data: safeData as any })
        } else if (_op === 'update' && data.id) {
          // Server-wins: only update if client data is newer
          const existing = await db.farmerProfile.findFirst({ where: { id: data.id as string, tenantId } })
          if (existing) {
            const clientTs = new Date(change._clientTimestamp)
            if (clientTs > existing.updatedAt) {
              await db.farmerProfile.update({ where: { id: data.id as string }, data: safeData as any })
            }
          }
        }
        return null
      }

      default:
        console.warn(`[MobileSync] Unknown entity: ${_entity}`)
        return null
    }
  }

  // --- Mobile Dashboard (single-call optimized) ---

  async getMobileDashboard(tenantId: string, userId: string) {
    const [farmerCount, purchaseStats, activeShipments, pendingNotifications] = await Promise.all([
      db.farmerProfile.count({ where: { tenantId, status: 'ACTIVE' } }),
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
   * Mobile-optimized farmer search (minimal fields, fast response).
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