/**
 * Agrobase V3 — Lightweight Static Currency Rates
 * MobiPay AgroSys Limited
 *
 * A small, synchronous, client-friendly currency utility that uses a static
 * exchange rate table (relative to UGX as the base currency) plus the native
 * `Intl.NumberFormat` API for locale-aware formatting.
 *
 * Public API:
 *   - Constants: `EXCHANGE_RATES`, `CURRENCY_SYMBOLS`, `CURRENCY_LOCALES`,
 *                `CURRENCY_DECIMALS`, `SUPPORTED_CURRENCIES`, `DEFAULT_CURRENCY`,
 *                `BASE_CURRENCY`
 *   - Convert:   `convert(amount, from, to)`
 *   - Format:    `formatCurrency(amount, currency, opts?)`
 *
 * NOTE: For DB-backed / tenant-aware rates and live external sync use
 * `./exchange-rates` (server-side `getExchangeRate`, `syncExternalRates`).
 * This module is intentionally static and synchronous for client rendering.
 */

// ─── Currency Metadata ──────────────────────────────────────────────────────

/** Base currency used for cross conversion (all rates are relative to UGX). */
export const BASE_CURRENCY = 'UGX'

/** Default currency when none has been selected by the user. */
export const DEFAULT_CURRENCY = 'UGX'

/** Per-currency display symbols. */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  UGX: 'USh',
  GHS: 'GH₵',
  KES: 'KSh',
  USD: '$',
}

/** BCP-47 locale tags used to drive `Intl.NumberFormat` grouping. */
export const CURRENCY_LOCALES: Record<string, string> = {
  UGX: 'en-UG',
  GHS: 'en-GH',
  KES: 'en-KE',
  USD: 'en-US',
}

/** Minor-unit precision per currency (UGX has none, others use 2 dp). */
export const CURRENCY_DECIMALS: Record<string, number> = {
  UGX: 0,
  GHS: 2,
  KES: 2,
  USD: 2,
}

/** All supported currency codes. */
export const SUPPORTED_CURRENCIES: readonly string[] = Object.keys(CURRENCY_SYMBOLS)

/**
 * Static exchange rate table, expressed as "1 unit of BASE_CURRENCY (UGX)
 * = N units of `<CODE>`". Update periodically (e.g. monthly) from a
 * trusted FX feed.
 *
 * Example: `USD: 0.00027` means 1 UGX = 0.00027 USD (≈ 3,700 UGX per USD).
 */
export const EXCHANGE_RATES: Record<string, number> = {
  UGX: 1,       // base
  GHS: 0.0042,  // 1 UGX = 0.0042 GHS
  KES: 0.018,   // 1 UGX = 0.018 KES
  USD: 0.00027, // 1 UGX = 0.00027 USD
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Type guard / validator: is `code` one of the supported currency codes?
 */
export function isSupportedCurrency(code: string): boolean {
  return code in CURRENCY_SYMBOLS
}

/**
 * Round a number to a fixed number of decimal places using
 * "round half away from zero" semantics (the standard for monetary rounding).
 */
function roundTo(amount: number, decimals: number): number {
  if (!Number.isFinite(amount)) return 0
  const factor = Math.pow(10, decimals)
  return Math.round((amount + Number.EPSILON) * factor) / factor
}

// ─── Conversion ─────────────────────────────────────────────────────────────

/**
 * Convert a monetary `amount` from one currency to another using the static
 * rate table.
 *
 * Conversion path: amount → base (UGX) → target. If either currency is
 * missing from the table the function falls back to the original amount
 * (and emits a `console.warn` so the gap is visible during development).
 *
 * Same-currency calls are short-circuited and return the amount unchanged.
 *
 * @example
 * ```ts
 * convert(10000, 'UGX', 'USD')  // ≈ 2.7
 * convert(100,  'KES', 'UGX')   // ≈ 5,555
 * ```
 */
export function convert(amount: number, from: string, to: string): number {
  if (from === to) return amount

  const fromRate = EXCHANGE_RATES[from]
  const toRate = EXCHANGE_RATES[to]

  if (fromRate == null || toRate == null) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(
        `[currency] No static rate for ${from}→${to}; returning original amount.`,
      )
    }
    return amount
  }

  // Convert amount → UGX → target currency.
  const inBase = amount / fromRate
  const converted = inBase * toRate

  const decimals = CURRENCY_DECIMALS[to] ?? 2
  return roundTo(converted, decimals)
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export interface FormatCurrencyOptions {
  /**
   * Whether to render the currency symbol ("USh 1,000"), the ISO code
   * ("UGX 1,000"), or no currency prefix at all ("1,000"). Defaults to
   * `"symbol"`.
   */
  style?: 'symbol' | 'code' | 'none'
  /**
   * Override the number of decimal places. Defaults to the currency's
   * native precision (0 for UGX, 2 for GHS/KES/USD).
   */
  decimals?: number
}

/**
 * Format a monetary amount for display using `Intl.NumberFormat` for
 * locale-aware digit grouping and the correct currency symbol.
 *
 * Falls back to `${symbol} ${amount}` if `Intl.NumberFormat` is unavailable
 * (very old runtimes / sandboxed environments).
 *
 * @example
 * ```ts
 * formatCurrency(1500000, 'UGX')             // "USh 1,500,000"
 * formatCurrency(250.5,   'GHS')             // "GH₵ 250.50"
 * formatCurrency(5000,    'KES', { style: 'code' }) // "KES 5,000.00"
 * formatCurrency(100,     'USD', { style: 'none' }) // "100.00"
 * ```
 */
export function formatCurrency(
  amount: number,
  currency: string,
  opts: FormatCurrencyOptions = {},
): string {
  const { style = 'symbol', decimals } = opts
  const symbol = CURRENCY_SYMBOLS[currency]
  const locale = CURRENCY_LOCALES[currency] ?? 'en-US'
  const fractionDigits = decimals ?? CURRENCY_DECIMALS[currency] ?? 2

  // Coerce NaN/Infinity to 0 so the UI never renders "NaN".
  const safeAmount = Number.isFinite(amount) ? amount : 0

  let formatted: string
  try {
    formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(safeAmount)
  } catch {
    // Defensive: fall back to a plain US-English grouping if the locale is
    // rejected by the runtime (some sandboxed environments restrict this).
    formatted = safeAmount.toLocaleString('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
  }

  if (style === 'none') return formatted
  if (style === 'code') return `${currency} ${formatted}`
  // default: symbol
  return symbol ? `${symbol} ${formatted}` : `${currency} ${formatted}`
}
