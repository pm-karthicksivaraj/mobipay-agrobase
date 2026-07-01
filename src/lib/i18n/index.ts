/**
 * Agrobase V3 — Lightweight Client-Side i18n
 * MobiPay AgroSys Limited
 *
 * A simple, synchronous translation utility for client components. Reads the
 * user's preferred language from `localStorage` (`agrobase_language`) and
 * looks up strings in the static dictionary in `./translations`.
 *
 * Public API:
 *   - Types:     `Language`
 *   - Constants: `LANGUAGES`, `DEFAULT_LANGUAGE`, `LANGUAGE_STORAGE_KEY`
 *   - Lookups:   `t(key, lang?)`, `tForStorage(key)`
 *   - Storage:   `getLanguageFromStorage()`, `setLanguageToStorage(lang)`
 *   - Hook:      `useLanguage()` → `{ language, setLanguage, t }`
 *
 * Fallback chain for `t()`:
 *   1. Requested language's dictionary
 *   2. English dictionary
 *   3. The key itself
 *
 * NOTE: For DB-backed / tenant-customisable translations use `./engine`
 * (server-side `I18nEngine`). This module is intentionally synchronous and
 * client-only so it can be used inside React render without network calls.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  TRANSLATIONS,
  isLanguage,
  type Language,
} from './translations'

// ─── Public Constants ───────────────────────────────────────────────────────

export type { Language }

/** localStorage key under which the user's preferred language is persisted. */
export const LANGUAGE_STORAGE_KEY = 'agrobase_language'

/** Default language used when no preference is stored or the value is invalid. */
export const DEFAULT_LANGUAGE: Language = 'en'

/** Metadata for the language switcher dropdown. */
export const LANGUAGES: ReadonlyArray<{ code: Language; name: string; flag: string }> = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
  { code: 'lg', name: 'Luganda', flag: '🇺🇬' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
]

// ─── Core Translation Function ──────────────────────────────────────────────

/**
 * Translate a dotted key (e.g. `"farmers.add"`) into the requested language.
 *
 * Fallback chain:
 *   1. `TRANSLATIONS[lang][key]`
 *   2. `TRANSLATIONS.en[key]`  (English is the source-of-truth language)
 *   3. the `key` itself (so missing keys are visible but never crash the UI)
 *
 * @param key  - Dotted translation key (e.g. `"common.save"`)
 * @param lang - Target language (defaults to English)
 * @returns The translated string, or the key itself if no translation exists.
 */
export function t(key: string, lang: Language = DEFAULT_LANGUAGE): string {
  return (
    TRANSLATIONS[lang]?.[key] ??
    TRANSLATIONS.en[key] ??
    key
  )
}

// ─── localStorage Helpers ───────────────────────────────────────────────────

/**
 * Read the user's preferred language from `localStorage`.
 * Returns `DEFAULT_LANGUAGE` ("en") when:
 *   - localStorage is unavailable (SSR, restricted environments)
 *   - the stored value is missing or not a valid language code
 */
export function getLanguageFromStorage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  try {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (raw && isLanguage(raw)) return raw
  } catch {
    // localStorage access can throw in private-mode browsers / sandboxed iframes
  }
  return DEFAULT_LANGUAGE
}

/**
 * Persist the user's preferred language to `localStorage`.
 * Silently no-ops when `localStorage` is unavailable (SSR / sandboxed).
 */
export function setLanguageToStorage(lang: Language): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  } catch {
    // ignore — language choice is a UX preference, not critical data
  }
}

// ─── React Hook ─────────────────────────────────────────────────────────────

export interface UseLanguage {
  /** The currently active language. */
  language: Language
  /** Switch the active language and persist it to localStorage. */
  setLanguage: (lang: Language) => void
  /** Translation function bound to the active language. */
  t: (key: string) => string
}

/**
 * React hook for components that need access to the active language.
 *
 * - Reads from `localStorage` on mount (defaults to `en` during SSR so the
 *   first paint is deterministic and hydration-safe).
 * - Persists every change back to `localStorage`.
 * - Returns a `t` function bound to the current language so consumers don't
 *   need to thread the language argument through every call site.
 *
 * @example
 * ```tsx
 * const { language, setLanguage, t } = useLanguage()
 * return <button>{t('common.save')}</button>
 * ```
 */
export function useLanguage(): UseLanguage {
  // Start with the default to keep SSR/first-paint deterministic.
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)

  // After mount, sync from localStorage (client-only).
  useEffect(() => {
    setLanguageState(getLanguageFromStorage())
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    setLanguageToStorage(lang)
  }, [])

  // Bind `t` to the active language. `useCallback` keeps the reference stable
  // across renders unless `language` actually changes.
  const tBound = useCallback(
    (key: string) => t(key, language),
    [language],
  )

  return { language, setLanguage, t: tBound }
}
