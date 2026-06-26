/**
 * Agrobase V3 — Exchange Rate Engine
 * MobiPay AgroSys Limited
 *
 * Manages currency exchange rates with:
 *   - DB-backed CRUD (manual rates)
 *   - In-memory LRU cache (TTL-based) to avoid hammering DB
 *   - External rate fetching (Frankfurter API — free, no API key)
 *   - Tenant-specific rate overrides (fall back to system-wide base rates)
 *   - Historical rate support via validFrom/validTo
 *
 * Rate resolution order:
 *   1. Tenant-specific active rate (tenantId + fromCurrency + toCurrency, validTo IS NULL)
 *   2. System-wide base rate (isBase=true, validTo IS NULL)
 *   3. In-memory fallback cache (from last external fetch)
 *   4. null (caller decides what to do)
 */

import { db } from '@/lib/db'
import { requireValidCurrency } from './engine'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExchangeRateInfo {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  source: string
  validFrom: Date
  validTo: Date | null
  isBase: boolean
}

export interface ExternalRateResponse {
  base: string
  rates: Record<string, number>
  timestamp: number
}

// ─── In-Memory Cache ────────────────────────────────────────────────────────

interface CacheEntry {
  rate: number
  fetchedAt: number
}

const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes
const MAX_CACHE_SIZE = 200

/**
 * Simple LRU-like cache for exchange rates.
 * Key format: "FROM:TO" or "FROM:TO:tenantId"
 */
class RateCache {
  private cache = new Map<string, CacheEntry>()

  get(key: string): number | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
      this.cache.delete(key)
      return null
    }
    return entry.rate
  }

  set(key: string, rate: number): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) this.cache.delete(oldestKey)
    }
    this.cache.set(key, { rate, fetchedAt: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

const rateCache = new RateCache()

// ─── Rate Resolution (Core) ────────────────────────────────────────────────

/**
 * Get the exchange rate for a currency pair.
 * Resolution order: tenant-specific → system base → cache → null.
 *
 * @param fromCurrency - Source currency (e.g., "USD")
 * @param toCurrency   - Target currency (e.g., "UGX")
 * @param tenantId     - Optional tenant for tenant-specific overrides
 * @param asOf         - Optional date for historical rates
 * @returns The exchange rate (e.g., 3750 means 1 USD = 3750 UGX), or null
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  tenantId?: string,
  asOf?: Date
): Promise<number | null> {
  requireValidCurrency(fromCurrency)
  requireValidCurrency(toCurrency)

  if (fromCurrency === toCurrency) return 1

  // Build cache key
  const cacheKey = tenantId
    ? `${fromCurrency}:${toCurrency}:${tenantId}`
    : `${fromCurrency}:${toCurrency}`

  // 1. Check cache first (skip for historical queries)
  if (!asOf) {
    const cached = rateCache.get(cacheKey)
    if (cached !== null) return cached
  }

  // 2. Query DB
  const where: Record<string, unknown> = {
    fromCurrency,
    toCurrency,
    validTo: null, // active rate
  }

  if (tenantId) {
    where.tenantId = tenantId
  }

  // Try tenant-specific first
  let record = tenantId
    ? await db.exchangeRate.findFirst({
        where: { ...where, tenantId },
        orderBy: { validFrom: 'desc' },
      })
    : null

  // 3. Fall back to system-wide base rate
  if (!record) {
    record = await db.exchangeRate.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        isBase: true,
        validTo: null,
      },
      orderBy: { validFrom: 'desc' },
    })
  }

  // 4. Historical: find rate valid at the given date
  if (!record && asOf) {
    record = await db.exchangeRate.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        validFrom: { lte: asOf },
        OR: [
          { validTo: null },
          { validTo: { gte: asOf } },
        ],
      },
      orderBy: { validFrom: 'desc' },
    })
  }

  if (record) {
    rateCache.set(cacheKey, record.rate)
    return record.rate
  }

  return null
}

// ─── CRUD Operations ────────────────────────────────────────────────────────

/**
 * Create or update an exchange rate.
 * If a rate already exists for the same pair+tenant (active), it soft-expires it
 * (sets validTo) and creates a new record.
 */
export async function upsertExchangeRate(params: {
  fromCurrency: string
  toCurrency: string
  rate: number
  source?: string
  tenantId?: string
  isBase?: boolean
  validFrom?: Date
}): Promise<ExchangeRateInfo> {
  const {
    fromCurrency,
    toCurrency,
    rate,
    source = 'manual',
    tenantId,
    isBase = false,
    validFrom = new Date(),
  } = params

  requireValidCurrency(fromCurrency)
  requireValidCurrency(toCurrency)

  if (rate <= 0) {
    throw new Error('Exchange rate must be positive')
  }

  // Soft-expire any existing active rate for this pair+tenant
  await db.exchangeRate.updateMany({
    where: {
      fromCurrency,
      toCurrency,
      tenantId: tenantId ?? null,
      validTo: null,
    },
    data: { validTo: new Date() },
  })

  // Create new rate record
  const record = await db.exchangeRate.create({
    data: {
      fromCurrency,
      toCurrency,
      rate,
      source,
      tenantId: tenantId ?? null,
      isBase,
      validFrom,
    },
  })

  // Invalidate cache for this pair
  const cacheKey = tenantId
    ? `${fromCurrency}:${toCurrency}:${tenantId}`
    : `${fromCurrency}:${toCurrency}`
  rateCache.set(cacheKey, record.rate)

  return toExchangeRateInfo(record)
}

/**
 * List exchange rates with optional filters.
 */
export async function listExchangeRates(params?: {
  tenantId?: string
  fromCurrency?: string
  toCurrency?: string
  includeExpired?: boolean
  baseOnly?: boolean
}): Promise<ExchangeRateInfo[]> {
  const {
    tenantId,
    fromCurrency,
    toCurrency,
    includeExpired = false,
    baseOnly = false,
  } = params || {}

  const where: Record<string, unknown> = {}

  if (tenantId) where.tenantId = tenantId
  if (fromCurrency) where.fromCurrency = fromCurrency
  if (toCurrency) where.toCurrency = toCurrency
  if (baseOnly) where.isBase = true
  if (!includeExpired) where.validTo = null

  const records = await db.exchangeRate.findMany({
    where: where as any,
    orderBy: [{ fromCurrency: 'asc' }, { toCurrency: 'asc' }, { validFrom: 'desc' }],
  })

  return records.map(toExchangeRateInfo)
}

/**
 * Delete an exchange rate by ID.
 */
export async function deleteExchangeRate(id: string, tenantId?: string): Promise<boolean> {
  const where: Record<string, unknown> = { id }
  if (tenantId) where.tenantId = tenantId

  try {
    await db.exchangeRate.delete({ where: where as any })
    rateCache.clear() // broad clear — safe and simple
    return true
  } catch {
    return false
  }
}

/**
 * Soft-expire a rate (sets validTo to now).
 */
export async function expireExchangeRate(id: string, tenantId?: string): Promise<boolean> {
  const where: Record<string, unknown> = { id }
  if (tenantId) where.tenantId = tenantId

  try {
    await db.exchangeRate.updateMany({
      where: { ...where, validTo: null } as any,
      data: { validTo: new Date() },
    })
    rateCache.clear()
    return true
  } catch {
    return false
  }
}

// ─── External Rate Fetching ─────────────────────────────────────────────────

/**
 * Fetch live exchange rates from the Frankfurter API (free, no key required).
 * Returns rates relative to the base currency.
 *
 * Frankfurter API: https://www.frankfurter.app/
 * Data sourced from European Central Bank.
 *
 * @param base - Base currency (default: "USD")
 * @returns Map of currency → rate, or null on failure
 */
export async function fetchExternalRates(
  base: string = 'USD'
): Promise<Record<string, number> | null> {
  requireValidCurrency(base)

  try {
    const url = `https://api.frankfurter.app/latest?from=${base}`
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000), // 10s timeout
    })

    if (!response.ok) {
      console.warn(
        `[ExchangeRates] Frankfurter API returned ${response.status} for base=${base}`
      )
      return null
    }

    const data = await response.json() as ExternalRateResponse

    if (!data.rates || typeof data.rates !== 'object') {
      console.warn('[ExchangeRates] Frankfurter API returned unexpected format')
      return null
    }

    // Cache all returned rates
    for (const [currency, rate] of Object.entries(data.rates)) {
      if (VALID_CACHE_CURRENCIES.has(currency)) {
        rateCache.set(`${base}:${currency}`, rate)
      }
    }

    return data.rates
  } catch (err) {
    console.warn(
      '[ExchangeRates] Failed to fetch external rates:',
      err instanceof Error ? err.message : String(err)
    )
    return null
  }
}

/**
 * Fetch and persist external rates as system-wide base rates.
 * Useful for a cron job or admin "Sync Rates" action.
 *
 * @param base - Base currency to fetch rates for (default: "USD")
 * @returns Number of rates upserted
 */
export async function syncExternalRates(base: string = 'USD'): Promise<number> {
  const rates = await fetchExternalRates(base)
  if (!rates) return 0

  let count = 0

  for (const [currency, rate] of Object.entries(rates)) {
    if (!VALID_CACHE_CURRENCIES.has(currency)) continue

    await upsertExchangeRate({
      fromCurrency: base,
      toCurrency: currency,
      rate,
      source: 'frankfurter',
      isBase: true,
    })
    count++
  }

  // Also create inverse rates
  for (const [currency, rate] of Object.entries(rates)) {
    if (!VALID_CACHE_CURRENCIES.has(currency) || rate === 0) continue

    await upsertExchangeRate({
      fromCurrency: currency,
      toCurrency: base,
      rate: 1 / rate,
      source: 'frankfurter',
      isBase: true,
    })
    count++
  }

  return count
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

const VALID_CACHE_CURRENCIES = new Set(['UGX', 'GHS', 'KES', 'USD'])

function toExchangeRateInfo(record: {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  source: string
  validFrom: Date
  validTo: Date | null
  isBase: boolean
}): ExchangeRateInfo {
  return {
    id: record.id,
    fromCurrency: record.fromCurrency,
    toCurrency: record.toCurrency,
    rate: record.rate,
    source: record.source,
    validFrom: record.validFrom,
    validTo: record.validTo,
    isBase: record.isBase,
  }
}