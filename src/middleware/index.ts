/**
 * Agrobase V3 — Middleware Module Exports
 *
 * Edge Runtime-compatible modules for use in src/middleware.ts.
 * These use only Web APIs (no Node.js) and are bundled by Next.js Edge compiler.
 */

export { checkRateLimit } from './edge-rate-limiter'
export {
  logRequest,
  logRateLimit,
  logAuthFailure,
  logPermissionDenied,
  logEntitlementDenied,
  getClientIp,
} from './edge-logger'
export {
  resolveModuleForPath,
  checkEntitlement,
  setTenantEntitlements,
  invalidateTenant,
  clearEntitlementCache,
  getCacheStats,
} from './edge-entitlements'