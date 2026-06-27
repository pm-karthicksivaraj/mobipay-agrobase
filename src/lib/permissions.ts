/**
 * Agrobase V3 — RBAC Permission Definitions
 *
 * Permissions follow the pattern:  module:action
 * Actions: read, create, update, delete, approve, manage, export, admin
 */

export type PermissionAction =
  | 'read' | 'create' | 'update' | 'delete'
  | 'approve' | 'manage' | 'export' | 'admin'

// ─── All permission names ──────────────────────────────────────────────────
export const MODULES = [
  'dashboard', 'farmers', 'vsla', 'marketplace', 'payments', 'loans',
  'reports', 'training', 'surveys', 'trace', 'compliance', 'communication',
  'input_aggregation', 'purchases', 'approvals', 'processing', 'sales',
  'deliveries', 'consignments', 'companies', 'users', 'settings',
  'agritrack', 'feedback', 'farm_visits', 'impact_assessment',
  'channel_sim', 'carbon', 'mfi', 'transport', 'profile',
] as const

export type ModuleKey = (typeof MODULES)[number]

// All valid permission names: "module:action"
export function makePermissionName(module: string, action: PermissionAction): string {
  return `${module}:${action}`
}

// ─── Role → Permission Mapping ────────────────────────────────────────────

type RolePerms = Record<string, string[]>

const ROLE_PERMISSIONS: RolePerms = {
  // Super Admin: everything
  SUPER_ADMIN: ['*'],

  // Country Admin: all read/write except billing and system config
  COUNTRY_ADMIN: [
    '*:read', '*:create', '*:update', '*:export',
    '!settings:admin', '!users:admin',
  ],

  // Tenant Admin: entitled modules + user management
  TENANT_ADMIN: [
    'dashboard:*', 'farmers:*', 'vsla:*', 'marketplace:*',
    'payments:*', 'loans:*', 'reports:*', 'training:*',
    'surveys:*', 'trace:*', 'compliance:*', 'communication:*',
    'input_aggregation:*', 'purchases:*', 'approvals:*',
    'processing:*', 'sales:*', 'deliveries:*', 'consignments:*',
    'companies:read', 'users:*', 'agritrack:*',
    'feedback:*', 'farm_visits:*', 'impact_assessment:*',
    'carbon:*', 'mfi:*', 'transport:*',
  ],

  // Agent: field data collection
  AGENT: [
    'dashboard:read',
    'farmers:read', 'farmers:create', 'farmers:update',
    'vsla:read', 'vsla:create', 'vsla:update',
    'training:read', 'training:create',
    'surveys:read', 'surveys:create',
    'farm_visits:read', 'farm_visits:create',
    'trace:read',
    'compliance:read',
    'carbon:read',
    'transport:read',
    'profile:read', 'profile:update',
  ],

  // Extension Officer: training delivery, advisory
  EXTENSION_OFFICER: [
    'dashboard:read',
    'farmers:read', 'farmers:create', 'farmers:update',
    'training:*',
    'farm_visits:*',
    'surveys:read',
    'trace:read',
    'compliance:read',
    'carbon:read',
    'transport:read',
    'profile:read', 'profile:update',
  ],

  // CBT (Community Based Trainer): assessment
  CBT: [
    'dashboard:read',
    'training:*',
    'compliance:read', 'compliance:update',
    'farmers:read',
    'surveys:read',
    'profile:read',
  ],

  // Casual worker: minimal
  CASUAL: [
    'dashboard:read',
    'profile:read',
  ],

  // Farmer: self-service
  FARMER: [
    'dashboard:read',
    'profile:read', 'profile:update',
    'marketplace:read', 'marketplace:create',
    'vsla:read',
    'training:read',
    'surveys:read',
    'feedback:create',
  ],

  // VSLA Member: VSLA self-service
  VSLA_MEMBER: [
    'dashboard:read',
    'vsla:read',
    'profile:read', 'profile:update',
    'training:read',
  ],
}

/**
 * Check if a role has a specific permission.
 * Handles wildcard expansion (*:read means all modules:read).
 */
export function hasPermission(
  role: string,
  requiredPermission: string
): boolean {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false

  // Super admin wildcard
  if (perms.includes('*')) return true

  // Check exact match
  if (perms.includes(requiredPermission)) return true

  // Parse required permission: "module:action"
  const [reqModule, reqAction] = requiredPermission.split(':')

  // Check for wildcard matches: "module:*" or "*:action"
  for (const perm of perms) {
    if (perm.startsWith('!')) continue // exclusion rule
    const [mod, action] = perm.split(':')
    if (mod === '*' && action === reqAction) return true
    if (action === '*' && mod === reqModule) return true
    if (mod === '*' && action === '*') return true
  }

  // Check exclusions
  for (const perm of perms) {
    if (perm.startsWith('!')) {
      const [, exclPerm] = perm.split('!')
      if (exclPerm === requiredPermission) return false
      const [mod, action] = exclPerm.split(':')
      if (mod === '*' && action === reqAction) return false
      if (action === '*' && mod === reqModule) return false
    }
  }

  return false
}

/**
 * Get all effective permission names for a role.
 */
export function getRolePermissions(role: string): string[] {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return []
  if (perms.includes('*')) return ['*:*'] // All permissions
  return perms.filter(p => !p.startsWith('!'))
}

/**
 * Get all modules a role has access to.
 */
export function getRoleModules(role: string): string[] {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return []
  if (perms.includes('*')) return [...MODULES]

  const moduleSet = new Set<string>()
  for (const perm of perms) {
    if (perm.startsWith('!')) continue
    const [mod] = perm.split(':')
    if (mod !== '*') moduleSet.add(mod)
  }
  return [...moduleSet]
}

export { ROLE_PERMISSIONS }