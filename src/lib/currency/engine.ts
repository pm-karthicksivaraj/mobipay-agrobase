/**
 * Agrobase V3 — Multi-Currency Engine
 *
 * Converts between East African currencies (UGX, GHS, KES) and USD.
 * Uses an in-memory cache with 1-hour TTL backed by the ExchangeRate
 * Prisma model for persistence. In production, Redis would replace
 * the in-memory Map.
 *
 * Default rates (hardcoded fallback):
 *   1 USD = 3,800 UGX
 *   1 USD = 15 GHS
 *   1 USD = 153 KES
 */

import { db } from '@/lib/db'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExchangeRate {
  fromCurrency: string
  toCurrency: string
  rate: number
  source: string
  validFrom: Date
}

export interface CachedRate {
  rate: number
  expiresAt: number // Unix timestamp in ms
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Supported currency codes */
export const SUPPORTED_CURRENCIES = ['UGX', 'GHS', 'KES', 'USD'] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

/** Default rates against USD (fallback when DB has no data) */
const DEFAULT_RATES: Record<string, number> = {
  'USD-UGX': 3800,
  'USD-GHS': 15,
  'USD-KES': 153,
  'UGX-USD': 1 / 3800,
  'GHS-USD': 1 / 15,
  'KES-USD': 1 / 153,
  'UGX-UGX': 1,
  'GHS-GHS': 1,
  'KES-KES': 1,
  'USD-USD': 1,
}

/** In-memory cache TTL: 1 hour */
const CACHE_TTL_MS = 60 * 60 * 1000

/** Currency display configurations */
const CURRENCY_CONFIG: Record<string, { symbol: string; code: boolean; decimals: number; thousandsSep: string; decimalSep: string }> = {
  UGX: { symbol: 'UGX', code: true, decimals: 0, thousandsSep: ',', decimalSep: '.' },
  GHS: { symbol: 'GHS', code: true, decimals: 2, thousandsSep: ',', decimalSep: '.' },
  KES: { symbol: 'KES', code: true, decimals: 0, thousandsSep: ',', decimalSep: '.' },
  USD: { symbol: '$', code: false, decimals: 2, thousandsSep: ',', decimalSep: '.' },
}

// ─── Currency Engine ─────────────────────────────────────────────────────────

export class CurrencyEngine {
  /** In-memory rate cache. Key: "FROM-TO" (uppercase) */
  private cache: Map<string, CachedRate> = new Map()

  /**
   * Convert an amount from one currency to another.
   * Uses the cross-rate via USD when no direct rate exists.
   */
  async convert(amount: number, from: string, to: string): Promise<number> {
    const fromUpper = from.toUpperCase()
    const toUpper = to.toUpperCase()

    if (fromUpper === toUpper) return amount

    // Try direct rate first
    const directKey = `${fromUpper}-${toUpper}`
    const directRate = await this.getRate(directKey)
    if (directRate !== null) {
      return amount * directRate
    }

    // Cross-rate via USD
    const toUsdKey = `${fromUpper}-USD`
    const fromUsdKey = `USD-${toUpper}`
    const toUsdRate = await this.getRate(toUsdKey)
    const fromUsdRate = await this.getRate(fromUsdKey)

    if (toUsdRate !== null && fromUsdRate !== null) {
      return amount * toUsdRate * fromUsdRate
    }

    // Use default rates as final fallback
    const defaultRate = DEFAULT_RATES[directKey] ?? DEFAULT_RATES[toUsdKey] * (DEFAULT_RATES[fromUsdKey] ?? 0)
    if (defaultRate && defaultRate > 0) {
      return amount * defaultRate
    }

    throw new Error(`No exchange rate found for ${fromUpper} → ${toUpper}`)
  }

  /**
   * Get all current exchange rates (all pairs stored in DB).
   */
  async getExchangeRates(): Promise<ExchangeRate[]> {
    // Try to load from DB
    try {
      const rates = await db.exchangeRate.findMany({
        orderBy: { validFrom: 'desc' },
      })
      if (rates.length > 0) {
        // Update cache
        for (const r of rates) {
          const key = `${r.fromCurrency}-${r.toCurrency}`
          this.cache.set(key, { rate: r.rate, expiresAt: Date.now() + CACHE_TTL_MS })
        }
        return rates.map((r) => ({
          fromCurrency: r.fromCurrency,
          toCurrency: r.toCurrency,
          rate: r.rate,
          source: r.source,
          validFrom: r.validFrom,
        }))
      }
    } catch {
      // DB not available — fall through to defaults
    }

    // Return defaults when DB has no rates
    return this.getDefaultRates()
  }

  /**
   * Format an amount with the appropriate currency symbol and formatting.
   *
   * Examples:
   *   formatAmount(1000000, 'UGX') → "UGX 1,000,000"
   *   formatAmount(1000, 'GHS')   → "GHS 1,000.00"
   *   formatAmount(100000, 'KES') → "KES 100,000"
   *   formatAmount(1000, 'USD')   → "$1,000.00"
   */
  formatAmount(amount: number, currency: string): string {
    const upper = currency.toUpperCase()
    const config = CURRENCY_CONFIG[upper] || { symbol: upper, code: true, decimals: 2, thousandsSep: ',', decimalSep: '.' }

    const formatted = this.formatNumber(amount, config.decimals, config.thousandsSep, config.decimalSep)

    if (config.code) {
      return `${config.symbol} ${formatted}`
    }
    return `${config.symbol}${formatted}`
  }

  /**
   * Set (upsert) an exchange rate. Admin-only operation.
   * Also updates the in-memory cache.
   */
  async setExchangeRate(from: string, to: string, rate: number): Promise<void> {
    const fromUpper = from.toUpperCase()
    const toUpper = to.toUpperCase()

    await db.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: fromUpper,
          toCurrency: toUpper,
        },
      },
      create: {
        fromCurrency: fromUpper,
        toCurrency: toUpper,
        rate,
        source: 'manual',
        validFrom: new Date(),
      },
      update: {
        rate,
        source: 'manual',
        validFrom: new Date(),
      },
    })

    // Update cache
    const key = `${fromUpper}-${toUpper}`
    this.cache.set(key, { rate, expiresAt: Date.now() + CACHE_TTL_MS })
  }

  /**
   * Bulk seed default rates into the database.
   * Called once during initial setup.
   */
  async seedDefaultRates(): Promise<void> {
    const defaults: Array<{ from: string; to: string; rate: number }> = [
      { from: 'USD', to: 'UGX', rate: 3800 },
      { from: 'USD', to: 'GHS', rate: 15 },
      { from: 'USD', to: 'KES', rate: 153 },
      { from: 'UGX', to: 'USD', rate: 1 / 3800 },
      { from: 'GHS', to: 'USD', rate: 1 / 15 },
      { from: 'KES', to: 'USD', rate: 1 / 153 },
    ]

    for (const d of defaults) {
      await db.exchangeRate.upsert({
        where: {
          fromCurrency_toCurrency: {
            fromCurrency: d.from,
            toCurrency: d.to,
          },
        },
        create: {
          fromCurrency: d.from,
          toCurrency: d.to,
          rate: d.rate,
          source: 'default',
        },
        update: {}, // Don't overwrite existing manual rates
      })

      // Also cache
      const key = `${d.from}-${d.to}`
      this.cache.set(key, { rate: d.rate, expiresAt: Date.now() + CACHE_TTL_MS })
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  /**
   * Get a rate by key ("FROM-TO"). Checks cache first, then DB, then defaults.
   */
  private async getRate(key: string): Promise<number | null> {
    // 1. Check in-memory cache
    const cached = this.cache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.rate
    }

    // 2. Try DB
    try {
      const [from, to] = key.split('-')
      const record = await db.exchangeRate.findUnique({
        where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
      })
      if (record) {
        this.cache.set(key, { rate: record.rate, expiresAt: Date.now() + CACHE_TTL_MS })
        return record.rate
      }
    } catch {
      // DB not available
    }

    // 3. Default rates
    if (key in DEFAULT_RATES) {
      return DEFAULT_RATES[key]
    }

    return null
  }

  /**
   * Get default exchange rates as ExchangeRate objects.
   */
  private getDefaultRates(): ExchangeRate[] {
    return Object.entries(DEFAULT_RATES).map(([key, rate]) => {
      const [from, to] = key.split('-')
      return {
        fromCurrency: from,
        toCurrency: to,
        rate,
        source: 'default',
        validFrom: new Date(),
      }
    })
  }

  /**
   * Format a number with thousands separator and decimal places.
   */
  private formatNumber(
    value: number,
    decimals: number,
    thousandsSep: string,
    decimalSep: string,
  ): string {
    const fixed = value.toFixed(decimals)
    const [intPart, decPart] = fixed.split('.')

    // Add thousands separators
    const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep)

    if (decPart) {
      return `${withSep}${decimalSep}${decPart}`
    }
    return withSep
  }
}

/** Singleton instance for application-wide use */
export const currencyEngine = new CurrencyEngine()