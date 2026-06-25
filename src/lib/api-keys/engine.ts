/**
 * Agrobase V3 — API Key Management Engine
 * Handles key generation, validation, rotation, and usage tracking.
 */

import * as crypto from 'node:crypto'
import { db } from '@/lib/db'

export interface ApiKeyCreateInput {
  tenantId: string
  name: string
  userId?: string
  scopes?: string[]
  rateLimitRpm?: number
  rateLimitRpd?: number
  expiresAt?: Date
}

export class ApiKeyEngine {
  /**
   * Generate a new API key for a tenant.
   * Returns the full key only once — it's stored hashed.
   */
  async createKey(input: ApiKeyCreateInput) {
    try {
      const rawKey = `agk_${crypto.randomBytes(24).toString('hex')}`
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
      const keyPrefix = rawKey.slice(0, 12)

      const record = await db.apiKey.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          key: keyHash,
          keyPrefix,
          userId: input.userId || null,
          scopes: JSON.stringify(input.scopes || ['read']),
          rateLimitRpm: input.rateLimitRpm ?? 60,
          rateLimitRpd: input.rateLimitRpd ?? 10000,
          expiresAt: input.expiresAt || null,
          isActive: true,
        },
      })

      // Return the raw key only on creation
      return {
        id: record.id,
        name: record.name,
        key: rawKey,           // Full key — never stored/returned again
        keyPrefix,
        scopes: JSON.parse(record.scopes),
        rateLimitRpm: record.rateLimitRpm,
        rateLimitRpd: record.rateLimitRpd,
        expiresAt: record.expiresAt,
        createdAt: record.createdAt,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create API key: ${msg}`)
    }
  }

  /**
   * Validate an API key and return the key record if valid.
   */
  async validateKey(rawKey: string) {
    try {
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
      const record = await db.apiKey.findUnique({ where: { key: keyHash } })

      if (!record) return null
      if (!record.isActive) return null
      if (record.expiresAt && record.expiresAt < new Date()) return null

      // Update last used and total requests
      await db.apiKey.update({
        where: { id: record.id },
        data: { lastUsedAt: new Date(), totalRequests: { increment: 1 } },
      })

      return record
    } catch (error) {
      return null
    }
  }

  /**
   * List keys for a tenant (never returns the full key hash).
   */
  async listKeys(tenantId: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit
      const [items, total] = await Promise.all([
        db.apiKey.findMany({
          where: { tenantId },
          select: {
            id: true, name: true, keyPrefix: true, userId: true,
            scopes: true, rateLimitRpm: true, rateLimitRpd: true,
            expiresAt: true, lastUsedAt: true, totalRequests: true,
            isActive: true, createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.apiKey.count({ where: { tenantId } }),
      ])

      return {
        items: items.map((item) => ({ ...item, scopes: JSON.parse(item.scopes) })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to list API keys: ${msg}`)
    }
  }

  /**
   * Revoke an API key.
   */
  async revokeKey(keyId: string, tenantId: string) {
    try {
      const existing = await db.apiKey.findFirst({ where: { id: keyId, tenantId } })
      if (!existing) throw new Error('API key not found')
      return await db.apiKey.update({ where: { id: keyId }, data: { isActive: false } })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to revoke API key: ${msg}`)
    }
  }

  /**
   * Regenerate (rotate) an API key. Old key is invalidated, new key is returned.
   */
  async rotateKey(keyId: string, tenantId: string) {
    try {
      const existing = await db.apiKey.findFirst({ where: { id: keyId, tenantId } })
      if (!existing) throw new Error('API key not found')

      const rawKey = `agk_${crypto.randomBytes(24).toString('hex')}`
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
      const keyPrefix = rawKey.slice(0, 12)

      const updated = await db.apiKey.update({
        where: { id: keyId },
        data: { key: keyHash, keyPrefix, updatedAt: new Date() },
      })

      return {
        id: updated.id,
        name: updated.name,
        key: rawKey,
        keyPrefix,
        scopes: JSON.parse(updated.scopes),
        rateLimitRpm: updated.rateLimitRpm,
        rateLimitRpd: updated.rateLimitRpd,
        expiresAt: updated.expiresAt,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to rotate API key: ${msg}`)
    }
  }

  /**
   * Log API key usage for analytics.
   */
  async logUsage(apiKeyId: string, data: { method: string; path: string; statusCode: number; responseMs: number; ipAddress?: string; userAgent?: string }) {
    try {
      await db.apiKeyUsageLog.create({
        data: { apiKeyId, ...data },
      })
    } catch {
      // Usage logging should never block the request
    }
  }

  /**
   * Get usage stats for a key.
   */
  async getUsageStats(apiKeyId: string, tenantId: string, days = 7) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const [total, byStatus, recentLogs] = await Promise.all([
        db.apiKeyUsageLog.count({ where: { apiKeyId, createdAt: { gte: since } } }),
        db.apiKeyUsageLog.groupBy({
          by: ['statusCode'],
          where: { apiKeyId, createdAt: { gte: since } },
          _count: true,
        }),
        db.apiKeyUsageLog.findMany({
          where: { apiKeyId, createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      ])

      const statusBreakdown: Record<string, number> = {}
      for (const row of byStatus) {
        statusBreakdown[String(row.statusCode)] = row._count
      }

      const avgResponseMs = recentLogs.length > 0
        ? Math.round(recentLogs.reduce((sum, l) => sum + l.responseMs, 0) / recentLogs.length)
        : 0

      return { total, statusBreakdown, avgResponseMs, days, recentLogs: recentLogs.slice(0, 20) }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to get usage stats: ${msg}`)
    }
  }
}

export const apiKeyEngine = new ApiKeyEngine()