/**
 * Agrobase V3 — Redis Cache Layer
 *
 * Provides TTL-based caching for API responses using Redis.
 * Falls back to no-cache (passthrough) when Redis is unavailable.
 *
 * Usage in API routes:
 *   import { cache } from '@/lib/cache'
 *
 *   // GET handler
 *   const data = await cache.getOrSet('dashboard:stats', 60, async () => {
 *     return await db.farmerProfile.count(...)
 *   })
 *
 * Cache keys are auto-namespaced with tenantId for isolation.
 */

import Redis from 'ioredis'

let redis: Redis | null = null
let redisAvailable = false

function getRedis(): Redis | null {
  if (redis) return redis

  if (!process.env.REDIS_URL) {
    if (!redisAvailable) {
      console.log('[Cache] REDIS_URL not set — cache disabled (passthrough mode)')
      redisAvailable = false
    }
    return null
  }

  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      retryStrategy(times) {
        return Math.min(times * 200, 2000)
      },
    })
    redis.on('error', (err) => {
      console.error('[Cache] Redis error:', err.message)
      redisAvailable = false
    })
    redis.on('connect', () => {
      console.log('[Cache] Redis connected')
      redisAvailable = true
    })
    redisAvailable = true
    return redis
  } catch (err) {
    console.error('[Cache] Failed to create Redis client:', err)
    redisAvailable = false
    return null
  }
}

function buildKey(tenantId: string, key: string): string {
  return `agrobase:${tenantId}:${key}`
}

/**
 * Get a value from cache, or compute and cache it.
 * Returns null on cache miss when compute is not provided.
 */
export async function get<T>(tenantId: string, key: string): Promise<T | null> {
  const r = getRedis()
  if (!r) return null

  try {
    const raw = await r.get(buildKey(tenantId, key))
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch (err) {
    console.error('[Cache] get() error:', err)
    return null
  }
}

/**
 * Get from cache, or compute + store the result.
 * This is the primary API — use it for all cached responses.
 *
 * @param tenantId - Current tenant (for cache key namespacing)
 * @param key - Cache key (e.g., 'dashboard:stats', 'farmers:list:page=1')
 * @param ttlSeconds - Time-to-live in seconds (default: 60)
 * @param compute - Async function to compute the value on cache miss
 */
export async function getOrSet<T>(
  tenantId: string,
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<T> {
  const r = getRedis()
  if (!r) return compute() // Passthrough when Redis unavailable

  const fullKey = buildKey(tenantId, key)

  try {
    // Try cache first
    const raw = await r.get(fullKey)
    if (raw) {
      return JSON.parse(raw) as T
    }

    // Cache miss — compute
    const value = await compute()

    // Store in cache (fire-and-forget — don't block response on cache write)
    r.set(fullKey, JSON.stringify(value), 'EX', ttlSeconds).catch((err) => {
      console.error('[Cache] set() error:', err)
    })

    return value
  } catch (err) {
    console.error('[Cache] getOrSet() error:', err)
    return compute() // Fallback to direct computation
  }
}

/**
 * Invalidate cache entries for a tenant (or specific key).
 */
export async function invalidate(tenantId: string, key?: string): Promise<void> {
  const r = getRedis()
  if (!r) return

  try {
    if (key) {
      await r.del(buildKey(tenantId, key))
    } else {
      // Clear all keys for this tenant
      const pattern = buildKey(tenantId, '*')
      const stream = r.scanStream({ match: pattern, count: 100 })
      const pipeline = r.pipeline()
      stream.on('data', (keys: string[]) => {
        for (const k of keys) pipeline.del(k)
      })
      stream.on('end', async () => {
        await pipeline.exec()
      })
    }
  } catch (err) {
    console.error('[Cache] invalidate() error:', err)
  }
}

export const cache = { get, getOrSet, invalidate }