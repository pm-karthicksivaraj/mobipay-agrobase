/**
 * Unit tests for permission system
 * Run: npx jest src/lib/__tests__/permissions.test.ts
 */
import { hasPermission, getRolePermissions, getRoleModules } from '../permissions'

describe('Permission System', () => {
  describe('SUPER_ADMIN', () => {
    it('should have all permissions', () => {
      expect(hasPermission('SUPER_ADMIN', 'farmers:read')).toBe(true)
      expect(hasPermission('SUPER_ADMIN', 'farmers:delete')).toBe(true)
      expect(hasPermission('SUPER_ADMIN', 'settings:admin')).toBe(true)
      expect(hasPermission('SUPER_ADMIN', 'anything:anything')).toBe(true)
    })

    it('should return all modules', () => {
      const modules = getRoleModules('SUPER_ADMIN')
      expect(modules.length).toBeGreaterThan(10)
    })
  })

  describe('TENANT_ADMIN', () => {
    it('should have farmers read/create/update/delete', () => {
      expect(hasPermission('TENANT_ADMIN', 'farmers:read')).toBe(true)
      expect(hasPermission('TENANT_ADMIN', 'farmers:create')).toBe(true)
      expect(hasPermission('TENANT_ADMIN', 'farmers:update')).toBe(true)
      expect(hasPermission('TENANT_ADMIN', 'farmers:delete')).toBe(true)
    })

    it('should have VSLA access', () => {
      expect(hasPermission('TENANT_ADMIN', 'vsla:read')).toBe(true)
      expect(hasPermission('TENANT_ADMIN', 'vsla:create')).toBe(true)
    })

    it('should have carbon access', () => {
      expect(hasPermission('TENANT_ADMIN', 'carbon:read')).toBe(true)
      expect(hasPermission('TENANT_ADMIN', 'carbon:create')).toBe(true)
    })
  })

  describe('FARMER', () => {
    it('should have dashboard read', () => {
      expect(hasPermission('FARMER', 'dashboard:read')).toBe(true)
    })

    it('should have profile read/update', () => {
      expect(hasPermission('FARMER', 'profile:read')).toBe(true)
      expect(hasPermission('FARMER', 'profile:update')).toBe(true)
    })

    it('should have marketplace read/create', () => {
      expect(hasPermission('FARMER', 'marketplace:read')).toBe(true)
      expect(hasPermission('FARMER', 'marketplace:create')).toBe(true)
    })

    it('should NOT have farmers delete', () => {
      expect(hasPermission('FARMER', 'farmers:delete')).toBe(false)
    })

    it('should NOT have users access', () => {
      expect(hasPermission('FARMER', 'users:read')).toBe(false)
    })

    it('should NOT have settings admin', () => {
      expect(hasPermission('FARMER', 'settings:admin')).toBe(false)
    })
  })

  describe('VSLA_MEMBER', () => {
    it('should have VSLA read only', () => {
      expect(hasPermission('VSLA_MEMBER', 'vsla:read')).toBe(true)
      expect(hasPermission('VSLA_MEMBER', 'vsla:create')).toBe(false)
      expect(hasPermission('VSLA_MEMBER', 'vsla:delete')).toBe(false)
    })

    it('should have dashboard read', () => {
      expect(hasPermission('VSLA_MEMBER', 'dashboard:read')).toBe(true)
    })
  })

  describe('EXTENSION_OFFICER', () => {
    it('should have training full CRUD', () => {
      expect(hasPermission('EXTENSION_OFFICER', 'training:read')).toBe(true)
      expect(hasPermission('EXTENSION_OFFICER', 'training:create')).toBe(true)
      expect(hasPermission('EXTENSION_OFFICER', 'training:update')).toBe(true)
      expect(hasPermission('EXTENSION_OFFICER', 'training:delete')).toBe(true)
    })

    it('should have farm_visits full CRUD', () => {
      expect(hasPermission('EXTENSION_OFFICER', 'farm_visits:read')).toBe(true)
      expect(hasPermission('EXTENSION_OFFICER', 'farm_visits:delete')).toBe(true)
    })

    it('should have carbon read but not create', () => {
      expect(hasPermission('EXTENSION_OFFICER', 'carbon:read')).toBe(true)
      expect(hasPermission('EXTENSION_OFFICER', 'carbon:create')).toBe(false)
    })
  })

  describe('AGENT', () => {
    it('should have farmers create/update but not delete', () => {
      expect(hasPermission('AGENT', 'farmers:create')).toBe(true)
      expect(hasPermission('AGENT', 'farmers:update')).toBe(true)
      expect(hasPermission('AGENT', 'farmers:delete')).toBe(false)
    })
  })

  describe('Unknown role', () => {
    it('should return false for all permissions', () => {
      expect(hasPermission('UNKNOWN_ROLE', 'farmers:read')).toBe(false)
    })
  })
})

describe('Currency Conversion', () => {
  it('should convert UGX to USD', () => {
    const { convert } = require('../currency/rates')
    const result = convert(1000000, 'UGX', 'USD')
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(1000) // 1M UGX should be < $1000
  })

  it('should convert same currency to same value', () => {
    const { convert } = require('../currency/rates')
    expect(convert(50000, 'UGX', 'UGX')).toBe(50000)
  })

  it('should format currency with symbol', () => {
    const { formatCurrency } = require('../currency/rates')
    const formatted = formatCurrency(50000, 'UGX')
    expect(formatted).toContain('USh')
    expect(formatted).toContain('50,000')
  })
})

describe('i18n', () => {
  it('should return English by default', () => {
    const { t } = require('../i18n')
    expect(t('dashboard.title')).toBe('Dashboard')
  })

  it('should return Swahili translation', () => {
    const { t } = require('../i18n')
    expect(t('dashboard.title', 'sw')).toBe('Dashibodi')
  })

  it('should fall back to English for missing translation', () => {
    const { t } = require('../i18n')
    expect(t('nonexistent.key', 'sw')).toBe('nonexistent.key')
  })
})
