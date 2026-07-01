/**
 * Agrobase V3 — Lightweight Client-Side Currency Module
 * MobiPay AgroSys Limited
 *
 * Re-exports the static rate table and formatting utilities from `./rates`,
 * and adds a `useCurrency` React hook backed by `localStorage`
 * (`agrobase_currency`) so any client component can read the user's preferred
 * display currency and format amounts in a single call.
 *
 * Public API:
 *   - Re-exports: `EXCHANGE_RATES`, `CURRENCY_SYMBOLS`, `CURRENCY_LOCALES`,
 *                 `CURRENCY_DECIMALS`, `SUPPORTED_CURRENCIES`, `BASE_CURRENCY`,
 *                 `DEFAULT_CURRENCY`, `convert`, `formatCurrency`,
 *                 `isSupportedCurrency`, `FormatCurrencyOptions`
 *   - Storage:    `getCurrencyFromStorage()`, `setCurrencyToStorage(currency)`,
 *                 `CURRENCY_STORAGE_KEY`
 *   - Hook:       `useCurrency()` → `{ currency, setCurrency, format, convert }`
 *
 * NOTE: For DB-backed / tenant-aware rates use the deep imports
 * `@/lib/currency/engine` and `@/lib/currency/exchange-rates`. This index
 * is intentionally client-only so it can be safely imported from client
 * components without dragging Prisma into the browser bundle.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BASE_CURRENCY,
  CURRENCY_DECIMALS,
  CURRENCY_LOCALES,
  CURRENCY_SYMBOLS,
  DEFAULT_CURRENCY,
  EXCHANGE_RATES,
  SUPPORTED_CURRENCIES,
  convert as convertFn,
  formatCurrency as formatCurrencyFn,
  isSupportedCurrency,
  type FormatCurrencyOptions,
} from './rates'

// ─── Re-exports from rates.ts ───────────────────────────────────────────────

export {
  BASE_CURRENCY,
  CURRENCY_DECIMALS,
  CURRENCY_LOCALES,
  CURRENCY_SYMBOLS,
  DEFAULT_CURRENCY,
  EXCHANGE_RATES,
  SUPPORTED_CURRENCIES,
  convertFn as convert,
  formatCurrencyFn as formatCurrency,
  isSupportedCurrency,
  type FormatCurrencyOptions,
}

// ─── localStorage Helpers ───────────────────────────────────────────────────

/** localStorage key under which the user's preferred display currency is stored. */
export const CURRENCY_STORAGE_KEY = 'agrobase_currency'

/**
 * Read the user's preferred display currency from `localStorage`.
 * Returns `DEFAULT_CURRENCY` ("UGX") when:
 *   - localStorage is unavailable (SSR, restricted environments)
 *   - the stored value is missing or not a supported currency code
 */
export function getCurrencyFromStorage(): string {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY
  try {
    const raw = window.localStorage.getItem(CURRENCY_STORAGE_KEY)
    if (raw && isSupportedCurrency(raw)) return raw
  } catch {
    // localStorage access can throw in private-mode browsers / sandboxed iframes
  }
  return DEFAULT_CURRENCY
}

/**
 * Persist the user's preferred display currency to `localStorage`.
 * Silently no-ops when `localStorage` is unavailable (SSR / sandboxed) or
 * when the supplied code is not in the supported set.
 */
export function setCurrencyToStorage(currency: string): void {
  if (typeof window === 'undefined') return
  if (!isSupportedCurrency(currency)) return
  try {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
  } catch {
    // ignore — currency choice is a UX preference, not critical data
  }
}

// ─── React Hook ─────────────────────────────────────────────────────────────

export interface UseCurrency {
  /** The currently active display currency code (e.g. "UGX", "USD"). */
  currency: string
  /** Switch the active currency and persist it to localStorage. */
  setCurrency: (currency: string) => void
  /**
   * Format an amount in the active currency using `Intl.NumberFormat`.
   * Pass an `amountInCurrency` of `{ amount, from }` to also convert from
   * another currency before formatting.
   */
  format: (amount: number, opts?: FormatCurrencyOptions) => string
  /** Convert an amount from one currency to another (uses the static rate table). */
  convert: (amount: number, from: string, to?: string) => number
}

/**
 * React hook for components that need to display monetary values in the
 * user's preferred currency.
 *
 * - Reads from `localStorage` on mount (defaults to `UGX` during SSR so the
 *   first paint is deterministic and hydration-safe).
 * - Persists every change back to `localStorage`.
 * - Returns `format` bound to the active currency and `convert` which
 *   defaults the *target* currency to the active one.
 *
 * @example
 * ```tsx
 * const { currency, setCurrency, format, convert } = useCurrency()
 * return <span>{format(1500000)}</span>            // "USh 1,500,000"
 *        <span>{convert(100, 'USD')}</span>         // 370370.370...
 * ```
 */
export function useCurrency(): UseCurrency {
  // Start with the default to keep SSR/first-paint deterministic.
  const [currency, setCurrencyState] = useState<string>(DEFAULT_CURRENCY)

  // After mount, sync from localStorage (client-only).
  useEffect(() => {
    setCurrencyState(getCurrencyFromStorage())
  }, [])

  const setCurrency = useCallback((next: string) => {
    if (!isSupportedCurrency(next)) return
    setCurrencyState(next)
    setCurrencyToStorage(next)
  }, [])

  const format = useCallback(
    (amount: number, opts?: FormatCurrencyOptions) =>
      formatCurrencyFn(amount, currency, opts),
    [currency],
  )

  const convert = useCallback(
    (amount: number, from: string, to: string = currency) =>
      convertFn(amount, from, to),
    [currency],
  )

  return { currency, setCurrency, format, convert }
}
