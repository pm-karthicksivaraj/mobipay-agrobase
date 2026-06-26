/**
 * Agrobase V3 — Plan Configuration
 * MobiPay AgroSys Limited
 *
 * Tiered pricing plans for Agrobase V3 multi-tenant SaaS.
 * Enterprise plan includes all 32 modules.
 */

import type { PlanConfig } from './types'

// ---------------------------------------------------------------------------
// All 32 modules available in the platform
// ---------------------------------------------------------------------------

const ALL_MODULES: string[] = [
  'dashboard',            // 1
  'farmers',              // 2
  'vsla',                 // 3
  'marketplace',          // 4
  'training',             // 5
  'loans',                // 6
  'traceability',         // 7
  'compliance',           // 8
  'input_management',     // 9
  'warehouse',            // 10
  'cooperative',          // 11
  'analytics',            // 12
  'api_access',           // 13
  'white_label',          // 14
  'custom_integrations',  // 15
  'eudr',                 // 16  — EU Deforestation Regulation
  'cbam',                 // 17  — Carbon Border Adjustment Mechanism
  'rainforest_alliance',  // 18
  'global_gap',           // 19
  'audit_log',            // 20
  'reports',              // 21
  'notifications',        // 22
  'credit_scoring',       // 23
  'surveys',              // 24
  'farm_visits',          // 25
  'consignment_tracking', // 26
  'delivery',             // 27
  'messages',             // 28
  'feedback',             // 29
  'multi_currency',       // 30
  'advanced_permissions', // 31
  'data_export',          // 32
]

const CORE_MODULES = ['dashboard', 'farmers']

const BASIC_MODULES = [...CORE_MODULES, 'vsla', 'marketplace', 'training']

const STANDARD_MODULES = [
  ...BASIC_MODULES,
  'loans',
  'traceability',
  'compliance',
  'input_management',
  'warehouse',
  'cooperative',
  'analytics',
  'credit_scoring',
  'reports',
  'notifications',
  'farm_visits',
  'surveys',
  'audit_log',
  'data_export',
  'multi_currency',
]

// ---------------------------------------------------------------------------
// Plan Configurations
// ---------------------------------------------------------------------------

/**
 * Complete plan definitions with pricing, limits, features, and module access.
 * Prices are in USD.
 */
export const PLANS: Record<string, PlanConfig> = {
  FREE: {
    name: 'Free',
    type: 'FREE',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'USD',
    maxUsers: 5,
    maxFarmers: 50,
    includedModules: CORE_MODULES,
    features: {
      vsla: false,
      marketplace: false,
      training: false,
      loans: false,
      traceability: false,
      compliance: false,
      input_management: false,
      warehouse: false,
      cooperative: false,
      advanced_analytics: false,
      api_access: false,
      white_label: false,
      custom_integrations: false,
      priority_support: false,
      export_data: true,
      sms_notifications: false,
      multi_currency: false,
    },
  },

  BASIC: {
    name: 'Basic',
    type: 'BASIC',
    priceMonthly: 49,
    priceAnnual: 39,
    currency: 'USD',
    maxUsers: 10,
    maxFarmers: 500,
    includedModules: BASIC_MODULES,
    features: {
      vsla: true,
      marketplace: true,
      training: true,
      loans: false,
      traceability: false,
      compliance: false,
      input_management: false,
      warehouse: false,
      cooperative: false,
      advanced_analytics: false,
      api_access: false,
      white_label: false,
      custom_integrations: false,
      priority_support: false,
      export_data: true,
      sms_notifications: true,
      multi_currency: false,
    },
  },

  STANDARD: {
    name: 'Standard',
    type: 'STANDARD',
    priceMonthly: 149,
    priceAnnual: 119,
    currency: 'USD',
    maxUsers: 25,
    maxFarmers: 2000,
    includedModules: STANDARD_MODULES,
    features: {
      vsla: true,
      marketplace: true,
      training: true,
      loans: true,
      traceability: true,
      compliance: true,
      input_management: true,
      warehouse: true,
      cooperative: true,
      advanced_analytics: true,
      api_access: true,
      white_label: false,
      custom_integrations: false,
      priority_support: true,
      export_data: true,
      sms_notifications: true,
      multi_currency: true,
    },
  },

  ENTERPRISE: {
    name: 'Enterprise',
    type: 'ENTERPRISE',
    priceMonthly: 399,
    priceAnnual: 319,
    currency: 'USD',
    maxUsers: -1,           // Unlimited
    maxFarmers: -1,         // Unlimited
    includedModules: ALL_MODULES,  // All 32
    features: {
      vsla: true,
      marketplace: true,
      training: true,
      loans: true,
      traceability: true,
      compliance: true,
      input_management: true,
      warehouse: true,
      cooperative: true,
      advanced_analytics: true,
      api_access: true,
      white_label: true,
      custom_integrations: true,
      priority_support: true,
      export_data: true,
      sms_notifications: true,
      multi_currency: true,
    },
  },
}

// ---------------------------------------------------------------------------
// Plan Helpers
// ---------------------------------------------------------------------------

/**
 * Get a plan configuration by name.
 */
export function getPlan(planName: string): PlanConfig {
  const plan = PLANS[planName.toUpperCase()]
  if (!plan) {
    throw new Error(`Unknown plan: ${planName}`)
  }
  return plan
}

/**
 * Get all available plan keys.
 */
export function getAvailablePlans(): string[] {
  return Object.keys(PLANS)
}