/**
 * Agrobase V3 — Rate Limiter (Redis-backed with in-memory fallback)
 * Token bucket algorithm with per-key RPM/RPD.
 * Uses Redis when REDIS_URL is set, falls back to in-memory Map.
 */

import Redis from 'ioredis'

// --- In-Memory Fallback Types ---
interface RateLimitEntry {
  tokens: number
  lastRefill: number
}
interface DailyCounter {
  count: number
  date: string
}

function isRedisAvailable(): boolean {
  return !!process.env.REDIS_URL
}

// --- Redis-backed Rate Limiter ---
class RedisRateLimiter {
  private redis: Redis

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      retryStrategy(times) {
        return Math.min(times * 200, 2000)
      },
    })
    this.redis.on('error', (err) => {
      console.error('[RateLimiter] Redis connection error:', err.message)
    })
  }

  private rpmKey(key: string): string { return `rl:rpm:${key}` }
  private rpdKey(key: string): string { return `rl:rpd:${key}` }

  async check(key: string, rpm: number, rpd: number): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const rpdK = this.rpdKey(key)
      const rpmK = this.rpmKey(key)

      const pipeline = this.redis.pipeline()
      pipeline.incr(rpdK)
      pipeline.expire(rpdK, 86400) // 24h TTL
      pipeline.get(rpmK)
      const results = await pipeline.exec()

      const dailyCount = (results?.[0]?.[1] as number) || 0
      // results[1] is expire result, results[2] is the old rpm value (used as lastRefill time proxy)

      if (dailyCount > rpd) {
        return { allowed: false, remaining: 0, retryAfterMs: this.msUntilTomorrow() }
      }

      // Sliding window RPM using INCR with 60s expiry
      const rpmResult = await this.redis.incr(rpmK)
      if (rpmResult === 1) {
        await this.redis.expire(rpmK, 60)
      }

      if (rpmResult > rpm) {
        const ttl = await this.redis.ttl(rpmK)
        return { allowed: false, remaining: 0, retryAfterMs: (ttl > 0 ? ttl : 60) * 1000 }
      }

      const remaining = Math.min(rpm - rpmResult, rpd - dailyCount)
      return { allowed: true, remaining: Math.max(0, remaining), retryAfterMs: 0 }
    } catch (err) {
      // On Redis failure, allow the request (fail-open)
      console.error('[RateLimiter] Redis check failed, allowing request:', (err as Error).message)
      return { allowed: true, remaining: rpm, retryAfterMs: 0 }
    }
  }

  async getStatus(key: string, rpm: number, rpd: number) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const [rpmCount, rpdCount] = await Promise.all([
        this.redis.get(this.rpmKey(key)),
        this.redis.get(this.rpdKey(key)),
      ])
      return {
        rpmRemaining: Math.max(0, rpm - (parseInt(rpmCount || '0'))),
        rpmLimit: rpm,
        rpdRemaining: Math.max(0, rpd - (parseInt(rpdCount || '0'))),
        rpdLimit: rpd,
        rpdUsed: parseInt(rpdCount || '0'),
      }
    } catch {
      return { rpmRemaining: rpm, rpmLimit: rpm, rpdRemaining: rpd, rpdLimit: rpd, rpdUsed: 0 }
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.redis.del(this.rpmKey(key), this.rpdKey(key))
    } catch { /* ignore */ }
  }

  private msUntilTomorrow(): number {
    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return tomorrow.getTime() - now.getTime()
  }

  async destroy() {
    this.redis.disconnect()
  }
}

// --- In-Memory Fallback ---
class InMemoryRateLimiter {
  private buckets: Map<string, RateLimitEntry> = new Map()
  private dailyCounters: Map<string, DailyCounter> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).__rateLimiterCleanup = () => clearInterval(this.cleanupInterval)
    }
  }

  async check(key: string, rpm: number, rpd: number): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
    const now = Date.now()
    const today = new Date().toISOString().split('T')[0]
    const daily = this.dailyCounters.get(key)
    if (daily && daily.date === today && daily.count >= rpd) {
      return { allowed: false, remaining: 0, retryAfterMs: this.msUntilTomorrow() }
    }

    const entry = this.buckets.get(key)
    const tokensToAdd = (now - (entry?.lastRefill || now)) / 60000 * rpm
    const tokens = Math.min(rpm, (entry?.tokens || rpm) + tokensToAdd)

    if (tokens < 1) {
      const retryAfterMs = Math.ceil((1 - tokens) / rpm * 60000)
      return { allowed: false, remaining: 0, retryAfterMs }
    }

    this.buckets.set(key, { tokens: tokens - 1, lastRefill: now })

    if (!daily || daily.date !== today) {
      this.dailyCounters.set(key, { count: 1, date: today })
    } else {
      daily.count += 1
    }

    const remaining = Math.min(Math.floor(tokens), rpd - (this.dailyCounters.get(key)?.count || 0))
    return { allowed: true, remaining: Math.max(0, remaining), retryAfterMs: 0 }
  }

  async getStatus(key: string, rpm: number, rpd: number) {
    const now = Date.now()
    const entry = this.buckets.get(key)
    const today = new Date().toISOString().split('T')[0]
    const daily = this.dailyCounters.get(key)
    const tokensToAdd = (now - (entry?.lastRefill || now)) / 60000 * rpm
    const tokens = Math.min(rpm, (entry?.tokens || rpm) + tokensToAdd)
    const dailyCount = (daily && daily.date === today) ? daily.count : 0

    return {
      rpmRemaining: Math.floor(tokens),
      rpmLimit: rpm,
      rpdRemaining: Math.max(0, rpd - dailyCount),
      rpdLimit: rpd,
      rpdUsed: dailyCount,
    }
  }

  async reset(_key: string): Promise<void> {
    // In-memory: just let cleanup handle it
  }

  private msUntilTomorrow(): number {
    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return tomorrow.getTime() - now.getTime()
  }

  private cleanup() {
    const now = Date.now()
    const today = new Date().toISOString().split('T')[0]
    for (const [key, entry] of this.buckets) {
      if (now - entry.lastRefill > 10 * 60 * 1000) this.buckets.delete(key)
    }
    for (const [key, counter] of this.dailyCounters) {
      if (counter.date !== today) this.dailyCounters.delete(key)
    }
  }

  async destroy() {
    clearInterval(this.cleanupInterval)
  }
}

// --- Singleton Export ---
// Synchronous check (returns immediately, uses cached result if Redis is async)
type LimiterInstance = RedisRateLimiter | InMemoryRateLimiter

let _limiter: LimiterInstance | null = null

function getLimiter(): LimiterInstance {
  if (!_limiter) {
    if (isRedisAvailable() && process.env.REDIS_URL) {
      console.log('[RateLimiter] Using Redis backend:', process.env.REDIS_URL.replace(/:\/\/.*@/, '://***@'))
      _limiter = new RedisRateLimiter(process.env.REDIS_URL)
    } else {
      console.log('[RateLimiter] Redis not configured, using in-memory fallback')
      _limiter = new InMemoryRateLimiter()
    }
  }
  return _limiter
}

// Re-export check function (async for Redis compat)
export async function checkRateLimit(key: string, rpm: number = 100, rpd: number = 10000) {
  return getLimiter().check(key, rpm, rpd)
}

export async function getRateLimitStatus(key: string, rpm: number = 100, rpd: number = 10000) {
  return getLimiter().getStatus(key, rpm, rpd)
}

export async function resetRateLimit(key: string) {
  return getLimiter().reset(key)
}

// Backward-compatible sync class (wraps the async singleton)
export class RateLimiter {
  check(key: string, rpm: number, rpd: number) {
    // Fire-and-forget: returns a resolved promise immediately for sync compat
    // Consumers should migrate to checkRateLimit() for proper async
    return getLimiter().check(key, rpm, rpd)
  }
  getStatus(key: string, rpm: number, rpd: number) {
    return getLimiter().getStatus(key, rpm, rpd)
  }
}

export const rateLimiter = new RateLimiter()