/**
 * Agrobase V3 — White-label / Branding Engine
 * Manages per-tenant visual identity and locale preferences.
 */

import { db } from '@/lib/db'

export const DEFAULT_BRANDING = {
  primaryColor: '#16a34a',
  secondaryColor: '#facc15',
  accentColor: '#0ea5e9',
  appName: 'Agrobase V3',
  tagline: 'Agricultural Management Platform',
  locale: 'en',
  dateFormat: 'DD/MM/YYYY',
  currencyFormat: 'symbol',
  timezone: 'Africa/Kampala',
}

export class BrandingEngine {
  /**
   * Get branding config for a tenant. Returns defaults if none set.
   */
  async getBranding(tenantId: string) {
    try {
      const config = await db.brandingConfig.findUnique({ where: { tenantId } })
      if (!config) return { tenantId, ...DEFAULT_BRANDING }

      return {
        tenantId: config.tenantId,
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        accentColor: config.accentColor,
        logoUrl: config.logoUrl,
        faviconUrl: config.faviconUrl,
        appName: config.appName || DEFAULT_BRANDING.appName,
        tagline: config.tagline || DEFAULT_BRANDING.tagline,
        locale: config.locale,
        dateFormat: config.dateFormat,
        currencyFormat: config.currencyFormat,
        timezone: config.timezone,
        customCSS: config.customCSS,
        loginImageUrl: config.loginImageUrl,
        isActive: config.isActive,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to get branding: ${msg}`)
    }
  }

  /**
   * Upsert branding config for a tenant.
   */
  async updateBranding(tenantId: string, data: Partial<{
    primaryColor: string
    secondaryColor: string
    accentColor: string
    logoUrl: string
    faviconUrl: string
    appName: string
    tagline: string
    locale: string
    dateFormat: string
    currencyFormat: string
    timezone: string
    customCSS: string
    loginImageUrl: string
    isActive: boolean
  }>) {
    try {
      return await db.brandingConfig.upsert({
        where: { tenantId },
        create: {
          tenantId,
          primaryColor: data.primaryColor || DEFAULT_BRANDING.primaryColor,
          secondaryColor: data.secondaryColor || DEFAULT_BRANDING.secondaryColor,
          accentColor: data.accentColor || DEFAULT_BRANDING.accentColor,
          logoUrl: data.logoUrl || null,
          faviconUrl: data.faviconUrl || null,
          appName: data.appName || null,
          tagline: data.tagline || null,
          locale: data.locale || DEFAULT_BRANDING.locale,
          dateFormat: data.dateFormat || DEFAULT_BRANDING.dateFormat,
          currencyFormat: data.currencyFormat || DEFAULT_BRANDING.currencyFormat,
          timezone: data.timezone || DEFAULT_BRANDING.timezone,
          customCSS: data.customCSS || null,
          loginImageUrl: data.loginImageUrl || null,
          isActive: data.isActive ?? true,
        },
        update: {
          ...data,
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to update branding: ${msg}`)
    }
  }

  /**
   * Get CSS custom properties for a tenant (for frontend theming).
   */
  async getCSSTheme(tenantId: string): Promise<string> {
    const config = await this.getBranding(tenantId)
    return `
:root {
  --color-primary: ${config.primaryColor};
  --color-secondary: ${config.secondaryColor};
  --color-accent: ${config.accentColor};
  --app-name: "${config.appName}";
  --date-format: "${config.dateFormat}";
  --currency-format: "${config.currencyFormat}";
}
${config.customCSS || ''}`.trim()
  }

  /**
   * Reset branding to defaults.
   */
  async resetBranding(tenantId: string) {
    try {
      const exists = await db.brandingConfig.findUnique({ where: { tenantId } })
      if (exists) {
        return await db.brandingConfig.update({
          where: { tenantId },
          data: {
            primaryColor: DEFAULT_BRANDING.primaryColor,
            secondaryColor: DEFAULT_BRANDING.secondaryColor,
            accentColor: DEFAULT_BRANDING.accentColor,
            logoUrl: null,
            faviconUrl: null,
            appName: null,
            tagline: null,
            locale: DEFAULT_BRANDING.locale,
            dateFormat: DEFAULT_BRANDING.dateFormat,
            currencyFormat: DEFAULT_BRANDING.currencyFormat,
            timezone: DEFAULT_BRANDING.timezone,
            customCSS: null,
            loginImageUrl: null,
          },
        })
      }
      return null
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to reset branding: ${msg}`)
    }
  }
}

export const brandingEngine = new BrandingEngine()