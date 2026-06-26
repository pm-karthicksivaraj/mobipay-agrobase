/**
 * Agrobase V3 — Entitlement Enforcement Engine
 *
 * Checks whether a tenant has access to a specific module/feature.
 * Used by API routes to enforce module-level access control
 * before processing requests.
 *
 * ModuleEntitlement schema:
 *   moduleCode — VSLA, MARKETPLACE, TRAINING, TRACE, PAYMENTS, etc.
 *   config    — JSON string with module-specific feature flags
 *   isEnabled — master on/off toggle
 */

import { db } from '@/lib/db'

// Known module codes and their possible actions/feature flags
export const MODULE_CODES = [
  'VSLA',
  'MARKETPLACE',
  'TRAINING',
  'TRACE',
  'PAYMENTS',
  'INVENTORY',
  'QUALITY',
  'LOGISTICS',
  'CARBON',
  'SATELLITE',
  'CONTRACTS',
  'REPORTS',
  'BILLING',
  'API_ACCESS',
  'CREDIT_SCORING',
  'SURVEYS',
  'COOPERATIVE',
  'EXPORT',
] as const

export type ModuleCode = (typeof MODULE_CODES)[number]

/**
 * Action types that can be checked per module.
 * When `action` is '*' or 'ACCESS', we check the master `isEnabled` flag.
 * Otherwise we look inside the JSON `config` for granular feature flags.
 */
export const MODULE_ACTIONS: Record<string, string[]> = {
  VSLA: ['ACCESS', 'LOANS', 'SAVINGS', 'MEETINGS', 'WELFARE'],
  MARKETPLACE: ['ACCESS', 'BUY', 'SELL', 'CONSIGNMENT'],
  TRAINING: ['ACCESS', 'CREATE', 'ATTENDANCE'],
  TRACE: ['ACCESS', 'EUDR', 'CERTIFICATION'],
  PAYMENTS: ['ACCESS', 'DISBURSE', 'COLLECT', 'MOBILE_MONEY'],
  INVENTORY: ['ACCESS', 'STOCK_IN', 'STOCK_OUT', 'AUDIT'],
  QUALITY: ['ACCESS', 'INSPECT', 'GRADE'],
  LOGISTICS: ['ACCESS', 'SHIP', 'DELIVER', 'TRACK'],
  CARBON: ['ACCESS', 'CALCULATE', 'REPORT'],
  SATELLITE: ['ACCESS', 'NDVI', 'RAINFALL'],
  CONTRACTS: ['ACCESS', 'CREATE', 'SIGN', 'AMEND'],
  REPORTS: ['ACCESS', 'DASHBOARD', 'EXPORT', 'SCHEDULE'],
  BILLING: ['ACCESS', 'INVOICE', 'SUBSCRIBE', 'USAGE'],
  API_ACCESS: ['ACCESS', 'READ', 'WRITE', 'ADMIN'],
  CREDIT_SCORING: ['ACCESS', 'VIEW', 'ASSESS'],
  SURVEYS: ['ACCESS', 'CREATE', 'RESPOND'],
  COOPERATIVE: ['ACCESS', 'INTAKE', 'PAY'],
  EXPORT: ['ACCESS', 'SHIP', 'DOCUMENT'],
}

export class EntitlementEngine {
  /**
   * Check if a tenant has access to a specific module and action.
   *
   * @param tenantId - The tenant to check
   * @param module   - Module code (e.g. 'VSLA', 'MARKETPLACE')
   * @param action   - Action to check. Use '*' or 'ACCESS' for module-level access.
   *                   For granular checks, use the specific action (e.g. 'LOANS', 'BUY').
   * @returns true if access is granted
   */
  async checkAccess(tenantId: string, module: string, action: string = 'ACCESS'): Promise<boolean> {
    const entitlement = await db.moduleEntitlement.findUnique({
      where: {
        tenantId_moduleCode: {
          tenantId,
          moduleCode: module.toUpperCase(),
        },
      },
    })

    // No entitlement record means no access
    if (!entitlement) {
      return false
    }

    // Master toggle must be on
    if (!entitlement.isEnabled) {
      return false
    }

    // Wildcard or ACCESS action only needs the master toggle
    if (action === '*' || action.toUpperCase() === 'ACCESS') {
      return true
    }

    // Granular action check — look in JSON config
    if (entitlement.config) {
      try {
        const config = JSON.parse(entitlement.config) as Record<string, unknown>
        const features = config.features as Record<string, boolean> | undefined
        if (features) {
          const actionKey = action.toUpperCase()
          // If the feature is explicitly set, return that value
          if (actionKey in features) {
            return Boolean(features[actionKey])
          }
          // If feature is not explicitly configured but the module is enabled,
          // default to allowing access (permissive default)
          return true
        }
      } catch {
        // Malformed JSON config — fall through to permissive default
      }
    }

    // Module is enabled, no granular config — allow access
    return true
  }

  /**
   * Get all entitlements for a tenant.
   *
   * @param tenantId - The tenant to fetch entitlements for
   * @returns Array of ModuleEntitlement records
   */
  async getEntitlements(tenantId: string) {
    return db.moduleEntitlement.findMany({
      where: { tenantId },
      orderBy: { moduleCode: 'asc' },
    })
  }

  /**
   * Grant access to a module for a tenant.
   * Creates the entitlement if it doesn't exist, or updates if it does.
   *
   * @param tenantId - The tenant to grant access to
   * @param module   - Module code (e.g. 'VSLA')
   * @param features - Optional list of feature flags to enable within the module.
   *                   If omitted, all features default to enabled.
   * @returns The created or updated ModuleEntitlement record
   */
  async grantAccess(
    tenantId: string,
    module: string,
    features: string[] = [],
  ) {
    const moduleCode = module.toUpperCase()

    // Build the config JSON with feature flags
    const config = features.length > 0
      ? JSON.stringify({
          features: features.reduce<Record<string, boolean>>((acc, f) => {
            acc[f.toUpperCase()] = true
            return acc
          }, {}),
        })
      : null

    return db.moduleEntitlement.upsert({
      where: {
        tenantId_moduleCode: {
          tenantId,
          moduleCode,
        },
      },
      create: {
        tenantId,
        moduleCode,
        isEnabled: true,
        config,
      },
      update: {
        isEnabled: true,
        ...(config !== null && { config }),
      },
    })
  }

  /**
   * Revoke access to a module for a tenant.
   * Sets `isEnabled` to false rather than deleting the record,
   * preserving history and allowing re-enablement.
   *
   * @param tenantId - The tenant to revoke access from
   * @param module   - Module code to revoke
   */
  async revokeAccess(tenantId: string, module: string): Promise<void> {
    const moduleCode = module.toUpperCase()

    await db.moduleEntitlement.updateMany({
      where: {
        tenantId,
        moduleCode,
      },
      data: {
        isEnabled: false,
      },
    })
  }

  /**
   * Convenience method: check access and throw if denied.
   * Useful in API routes for early-exit enforcement.
   *
   * @throws Error with a descriptive message if access is denied
   */
  async enforceAccess(tenantId: string, module: string, action: string = 'ACCESS'): Promise<void> {
    const hasAccess = await this.checkAccess(tenantId, module, action)
    if (!hasAccess) {
      throw new Error(
        `Access denied: tenant ${tenantId} does not have ${action} access to module ${module}`
      )
    }
  }

  /**
   * Get all enabled modules for a tenant as a simple string array.
   */
  async getEnabledModules(tenantId: string): Promise<string[]> {
    const entitlements = await db.moduleEntitlement.findMany({
      where: { tenantId, isEnabled: true },
      select: { moduleCode: true },
    })
    return entitlements.map((e) => e.moduleCode)
  }
}

/** Singleton instance for application-wide use */
export const entitlementEngine = new EntitlementEngine()
