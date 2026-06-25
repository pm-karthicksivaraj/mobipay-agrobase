/**
 * Agrobase V3 — In-Memory Rate Limiter
 * Token bucket algorithm with per-key sliding window.
 */

interface RateLimitEntry {
  tokens: number
  lastRefill: number
}

interface DailyCounter {
  count: number
  date: string // YYYY-MM-DD
}

export class RateLimiter {
  private buckets: Map<string, RateLimitEntry> = new Map()
  private dailyCounters: Map<string, DailyCounter> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).__rateLimiterCleanup = () => clearInterval(this.cleanupInterval)
    }
  }

  /**
   * Check if a request is allowed.
   * Returns { allowed, remaining, retryAfterMs }
   */
  check(key: string, rpm: number, rpd: number): { allowed: boolean; remaining: number; retryAfterMs: number } {
    const now = Date.now()

    // Check daily limit
    const today = new Date().toISOString().split('T')[0]
    const daily = this.dailyCounters.get(key)
    if (daily && daily.date === today && daily.count >= rpd) {
      return { allowed: false, remaining: 0, retryAfterMs: this.msUntilTomorrow() }
    }

    // Check per-minute limit (token bucket)
    const entry = this.buckets.get(key)
    const tokensToAdd = (now - (entry?.lastRefill || now)) / 60000 * rpm
    const tokens = Math.min(rpm, (entry?.tokens || rpm) + tokensToAdd)

    if (tokens < 1) {
      const retryAfterMs = Math.ceil((1 - tokens) / rpm * 60000)
      return { allowed: false, remaining: 0, retryAfterMs }
    }

    this.buckets.set(key, { tokens: tokens - 1, lastRefill: now })

    // Increment daily counter
    if (!daily || daily.date !== today) {
      this.dailyCounters.set(key, { count: 1, date: today })
    } else {
      daily.count += 1
    }

    const remaining = Math.min(Math.floor(tokens), rpd - (this.dailyCounters.get(key)?.count || 0))
    return { allowed: true, remaining: Math.max(0, remaining), retryAfterMs: 0 }
  }

  /**
   * Get current usage info for a key.
   */
  getStatus(key: string, rpm: number, rpd: number) {
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

  private msUntilTomorrow(): number {
    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return tomorrow.getTime() - now.getTime()
  }

  private cleanup() {
    const now = Date.now()
    const today = new Date().toISOString().split('T')[0]

    // Remove stale buckets (older than 10 minutes)
    for (const [key, entry] of this.buckets) {
      if (now - entry.lastRefill > 10 * 60 * 1000) {
        this.buckets.delete(key)
      }
    }

    // Remove old daily counters
    for (const [key, counter] of this.dailyCounters) {
      if (counter.date !== today) {
        this.dailyCounters.delete(key)
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval)
  }
}

// Singleton
export const rateLimiter = new RateLimiter()