/**
 * Agrobase V3 — i18n Translation Engine
 * Manages translations with fallback chain: tenant → system → key itself.
 */

import { db } from '@/lib/db'

// In-memory cache: cacheKey (locale:tenantId:namespace) → key → value
const translationCache = new Map<string, Map<string, string>>()

// Supported locales for East Africa
export const SUPPORTED_LOCALES = ['en', 'sw', 'lg', 'ach', 'luo', 'ny'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  sw: 'Swahili',
  lg: 'Luganda',
  ach: 'Acholi',
  luo: 'Luo',
  ny: 'Chichewa',
  fr: 'French',
}

export const COUNTRY_DEFAULT_LOCALES: Record<string, string> = {
  UG: 'en',   // Uganda — English primary
  GH: 'en',   // Ghana — English primary
  KE: 'sw',   // Kenya — Swahili
}

export class I18nEngine {
  /**
   * Translate a key with fallback chain.
   * Priority: tenant-specific → system translation → key itself.
   */
  async t(key: string, locale: string = 'en', tenantId?: string, namespace: string = 'common', vars?: Record<string, string>): Promise<string> {
    // Check cache first
    const cached = this.getCached(key, locale, tenantId, namespace)
    if (cached !== undefined) return this.interpolate(cached, vars)

    // Query database
    const where: Record<string, unknown> = {
      locale,
      namespace,
      key,
    }

    // Try tenant-specific first
    if (tenantId) {
      const tenantTranslation = await db.translation.findFirst({
        where: { ...where, tenantId },
      })
      if (tenantTranslation) {
        this.setCache(key, locale, tenantId, namespace, tenantTranslation.value)
        return this.interpolate(tenantTranslation.value, vars)
      }
    }

    // Fall back to system translation (tenantId = null)
    const systemTranslation = await db.translation.findFirst({
      where: { ...where, tenantId: null, isSystem: true },
    })
    if (systemTranslation) {
      this.setCache(key, locale, null, namespace, systemTranslation.value)
      return this.interpolate(systemTranslation.value, vars)
    }

    // Final fallback: try English
    if (locale !== 'en') {
      const enTranslation = await db.translation.findFirst({
        where: { locale: 'en', namespace, key, isSystem: true },
      })
      if (enTranslation) {
        return this.interpolate(enTranslation.value, vars)
      }
    }

    // Return the key itself as last resort
    return this.interpolate(key, vars)
  }

  /**
   * Get all translations for a locale and namespace (for the frontend).
   */
  async getTranslations(locale: string, tenantId?: string, namespace?: string) {
    const where: Record<string, unknown> = { locale }
    if (tenantId) where.tenantId = tenantId
    else where.tenantId = null
    if (namespace) where.namespace = namespace

    const rows = await db.translation.findMany({
      where,
      select: { key: true, namespace: true, value: true, locale: true },
    })

    // Also include system translations as fallback
    const systemRows = await db.translation.findMany({
      where: { locale, tenantId: null, isSystem: true, ...(namespace ? { namespace } : {}) },
      select: { key: true, namespace: true, value: true, locale: true },
    })

    // Merge: tenant overrides system
    const merged: Record<string, Record<string, string>> = {}
    for (const row of systemRows) {
      if (!merged[row.namespace]) merged[row.namespace] = {}
      merged[row.namespace][row.key] = row.value
    }
    for (const row of rows) {
      if (!merged[row.namespace]) merged[row.namespace] = {}
      merged[row.namespace][row.key] = row.value
    }

    return merged
  }

  /**
   * Upsert a translation (for tenant customization or system management).
   */
  async setTranslation(data: { tenantId?: string; locale: string; namespace: string; key: string; value: string; isSystem?: boolean }) {
    try {
      const { tenantId, locale, namespace, key, value, isSystem } = data
      return await db.translation.upsert({
        where: {
          tenantId_locale_namespace_key: {
            tenantId: tenantId ?? '',
            locale,
            namespace,
            key,
          },
        },
        create: {
          tenantId: tenantId || null,
          locale,
          namespace,
          key,
          value,
          isSystem: isSystem ?? false,
        },
        update: { value, updatedAt: new Date() },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to set translation: ${msg}`)
    }
  }

  /**
   * Bulk upsert translations (for importing translations).
   */
  async bulkSetTranslations(translations: Array<{ tenantId?: string; locale: string; namespace: string; key: string; value: string; isSystem?: boolean }>) {
    const results: any[] = []
    for (const t of translations) {
      const result = await this.setTranslation(t).catch(() => null)
      results.push(result)
    }
    this.clearCache()
    return results.filter(Boolean)
  }

  /**
   * Delete a translation.
   */
  async deleteTranslation(id: string, tenantId?: string) {
    const where: Record<string, unknown> = { id }
    if (tenantId) where.tenantId = tenantId
    return await db.translation.delete({ where: { id } })
  }

  /**
   * Get the default locale for a country.
   */
  getLocaleForCountry(country: string): string {
    return COUNTRY_DEFAULT_LOCALES[country] || 'en'
  }

  // --- Cache Management ---

  private cacheKey(locale: string, tenantId: string | null | undefined, namespace: string): string {
    return `${locale}:${tenantId || '_'}:${namespace}`
  }

  private getCached(key: string, locale: string, tenantId: string | undefined, namespace: string): string | undefined {
    const ck = this.cacheKey(locale, tenantId, namespace)
    return translationCache.get(ck)?.get(key)
  }

  private setCache(key: string, locale: string, tenantId: string | null | undefined, namespace: string, value: string) {
    const ck = this.cacheKey(locale, tenantId, namespace)
    if (!translationCache.has(ck)) translationCache.set(ck, new Map())
    const nsMap = translationCache.get(ck)!
    nsMap.set(key, value)
  }

  clearCache() {
    translationCache.clear()
  }

  private interpolate(text: string, vars?: Record<string, string>): string {
    if (!vars) return text
    let result = text
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }
    return result
  }
}

export const i18nEngine = new I18nEngine()