/**
 * Agrobase V3 — Multi-Currency Engine
 * MobiPay AgroSys Limited
 *
 * Central currency utilities for the entire application:
 *   - Currency metadata (symbols, decimals, locale, country mapping)
 *   - Amount formatting (Intl.NumberFormat) with tenant branding support
 *   - Validation helpers
 *   - Conversion delegation to ExchangeRateEngine
 *
 * Supported currencies: UGX, GHS, KES, USD
 * Country mapping: UG→UGX, GH→GHS, KE→KES
 */

import { db } from '@/lib/db'
import { getExchangeRate } from './exchange-rates'

// ─── Currency Metadata Registry ─────────────────────────────────────────────

export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
  decimals: number      // minor units: 0 for UGX, 2 for GHS/KES/USD
  locale: string        // for Intl.NumberFormat
  country: string       // primary country code
}

/** Complete registry of supported currencies */
export const CURRENCIES: Record<string, CurrencyInfo> = {
  UGX: {
    code: 'UGX',
    name: 'Ugandan Shilling',
    symbol: 'USh',
    decimals: 0,
    locale: 'en-UG',
    country: 'UG',
  },
  GHS: {
    code: 'GHS',
    name: 'Ghanaian Cedi',
    symbol: 'GH₵',
    decimals: 2,
    locale: 'en-GH',
    country: 'GH',
  },
  KES: {
    code: 'KES',
    name: 'Kenyan Shilling',
    symbol: 'KSh',
    decimals: 2,
    locale: 'en-KE',
    country: 'KE',
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimals: 2,
    locale: 'en-US',
    country: 'US',
  },
}

/** Valid currency codes set — for quick validation */
export const VALID_CURRENCY_CODES = new Set(Object.keys(CURRENCIES))

/** Country → default currency mapping */
export const COUNTRY_CURRENCY: Record<string, string> = {
  UG: 'UGX',
  GH: 'GHS',
  KE: 'KES',
}

/** Currency code → symbol (backward compat with payments/types.ts) */
export const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  Object.entries(CURRENCIES).map(([code, info]) => [code, info.symbol])
)

// ─── Currency Validation ────────────────────────────────────────────────────

/**
 * Check if a currency code is supported.
 */
export function isValidCurrency(code: string): boolean {
  return VALID_CURRENCY_CODES.has(code)
}

/**
 * Validate a currency code, throwing if invalid.
 * @throws Error if code is not in the supported set
 */
export function requireValidCurrency(code: string): void {
  if (!isValidCurrency(code)) {
    throw new Error(
      `Unsupported currency: "${code}". Supported: ${[...VALID_CURRENCY_CODES].join(', ')}`
    )
  }
}

/**
 * Infer the default currency from a tenant's country.
 * Falls back to UGX if country is not mapped.
 */
export function currencyFromCountry(country: string | null | undefined): string {
  if (!country) return 'UGX'
  return COUNTRY_CURRENCY[country] || 'UGX'
}

// ─── Amount Formatting ──────────────────────────────────────────────────────

export type CurrencyFormatStyle = 'symbol' | 'code' | 'none'

/**
 * Format a monetary amount for display.
 *
 * Uses Intl.NumberFormat for locale-aware formatting.
 * Falls back gracefully if Intl is not available (Edge Runtime edge cases).
 *
 * @param amount  - The numeric amount
 * @param currency - ISO 4217 code (UGX, GHS, KES, USD)
 * @param formatStyle - How to display the currency: 'symbol' (USh 1,000), 'code' (UGX 1,000.00), 'none' (1,000)
 *
 * @example
 * ```ts
 * formatMoney(1500000, 'UGX')             // "USh 1,500,000"
 * formatMoney(250.50, 'GHS')              // "GH₵ 250.50"
 * formatMoney(5000, 'KES', 'code')        // "KES 5,000.00"
 * formatMoney(100, 'USD', 'none')         // "100.00"
 * ```
 */
export function formatMoney(
  amount: number,
  currency: string = 'UGX',
  formatStyle: CurrencyFormatStyle = 'symbol'
): string {
  const info = CURRENCIES[currency]
  if (!info) {
    // Unknown currency — fallback to code + 2 decimals
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Use Intl.NumberFormat for proper locale formatting
  try {
    const formatter = new Intl.NumberFormat(info.locale, {
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals,
    })

    const formatted = formatter.format(amount)

    switch (formatStyle) {
      case 'symbol':
        return `${info.symbol} ${formatted}`
      case 'code':
        return `${info.code} ${formatted}`
      case 'none':
        return formatted
      default:
        return `${info.symbol} ${formatted}`
    }
  } catch {
    // Intl fallback (shouldn't happen but be defensive)
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals,
    })
    return `${info.symbol} ${formatted}`
  }
}

/**
 * Format money with tenant-aware defaults.
 * Reads the tenant's defaultCurrency and currencyFormat branding setting.
 *
 * @param amount   - The numeric amount
 * @param tenantId - The tenant to derive currency/format from
 */
export async function formatMoneyForTenant(
  amount: number,
  tenantId: string
): Promise<string> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { defaultCurrency: true },
  })

  const currency = tenant?.defaultCurrency || 'UGX'
  return formatMoney(amount, currency)
}

// ─── Money Arithmetic (floating-point safe) ─────────────────────────────────

/**
 * Round a monetary amount to the appropriate decimal places for a currency.
 * UGX: 0 decimals (whole shillings), GHS/KES/USD: 2 decimals.
 */
export function roundMoney(amount: number, currency: string = 'UGX'): number {
  const info = CURRENCIES[currency]
  const decimals = info?.decimals ?? 2
  const factor = Math.pow(10, decimals)
  return Math.round((amount + Number.EPSILON) * factor) / factor
}

/**
 * Add two money amounts with proper rounding.
 */
export function addMoney(a: number, b: number, currency?: string): number {
  return roundMoney(a + b, currency)
}

/**
 * Subtract two money amounts with proper rounding.
 */
export function subtractMoney(a: number, b: number, currency?: string): number {
  return roundMoney(a - b, currency)
}

/**
 * Multiply amount by a factor (e.g., quantity × unitPrice) with proper rounding.
 */
export function multiplyMoney(amount: number, factor: number, currency?: string): number {
  return roundMoney(amount * factor, currency)
}

// ─── Currency Conversion ────────────────────────────────────────────────────

/**
 * Convert an amount from one currency to another using the exchange rate engine.
 * Falls back to 1:1 if no rate is found and both currencies are the same.
 *
 * @param amount      - Amount in source currency
 * @param fromCurrency - Source currency code
 * @param toCurrency   - Target currency code
 * @param tenantId     - Optional tenant for tenant-specific rates
 * @param asOf         - Optional date for historical rates
 * @returns Converted amount, or original if no conversion needed/found
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  tenantId?: string,
  asOf?: Date
): Promise<number> {
  // Same currency — no conversion
  if (fromCurrency === toCurrency) return amount

  requireValidCurrency(fromCurrency)
  requireValidCurrency(toCurrency)

  const rate = await getExchangeRate(fromCurrency, toCurrency, tenantId, asOf)

  if (rate === null) {
    // No rate found — return original and log a warning
    console.warn(
      `[Currency] No exchange rate found for ${fromCurrency}→${toCurrency}` +
      (tenantId ? ` (tenant: ${tenantId})` : '') +
      '. Returning original amount.'
    )
    return amount
  }

  return roundMoney(amount * rate, toCurrency)
}

/**
 * Get the tenant's effective currency.
 * Checks Tenant.defaultCurrency first, then infers from country.
 */
export async function getTenantCurrency(tenantId: string): Promise<string> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { defaultCurrency: true, country: true },
  })

  if (tenant?.defaultCurrency && VALID_CURRENCY_CODES.has(tenant.defaultCurrency)) {
    return tenant.defaultCurrency
  }

  return currencyFromCountry(tenant?.country)
}

/**
 * Resolve the effective currency for a request.
 * Accepts an explicit override, falls back to tenant default, then country.
 */
export async function resolveCurrency(
  tenantId: string,
  explicitCurrency?: string | null
): Promise<string> {
  if (explicitCurrency && isValidCurrency(explicitCurrency)) {
    return explicitCurrency
  }
  return getTenantCurrency(tenantId)
}

// ─── Currency List for UI ───────────────────────────────────────────────────

/**
 * Get the list of supported currencies (for dropdowns/settings UI).
 */
export function getSupportedCurrencies(): CurrencyInfo[] {
  return Object.values(CURRENCIES)
}

/**
 * Get currencies relevant to a specific country.
 * Returns the local currency + USD.
 */
export function getCurrenciesForCountry(country: string): CurrencyInfo[] {
  const localCode = COUNTRY_CURRENCY[country]
  const currencies: CurrencyInfo[] = []

  if (localCode && CURRENCIES[localCode]) {
    currencies.push(CURRENCIES[localCode])
  }

  // Always include USD for cross-border / reporting
  currencies.push(CURRENCIES.USD)

  return currencies
}