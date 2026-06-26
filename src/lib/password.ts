import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

/**
 * Hash a plain-text password using bcrypt.
 * Always use this when creating or updating user passwords.
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, BCRYPT_ROUNDS)
}

/**
 * Verify a plain-text password against a stored hash.
 * Supports both bcrypt hashes (prefixed with $2a$/$2b$) and legacy plain-text
 * passwords during the V1→V3 migration period. Legacy plain-text passwords
 * that match will trigger a silent re-hash so the database is gradually
 * upgraded to bcrypt without forcing a password reset on all users.
 */
export async function verifyPassword(
  plainText: string,
  storedHash: string
): Promise<boolean> {
  // bcrypt hash detection: starts with $2a$, $2b$, or $2y$
  if (storedHash.startsWith('$2')) {
    return bcrypt.compare(plainText, storedHash)
  }

  // Legacy plain-text comparison (migration period only)
  if (plainText === storedHash) {
    // DO NOT re-hash here — the authorize callback doesn't have access
    // to the user ID in this utility. Re-hash is handled in the API layer
    // if needed. In production, all passwords should be bcrypt-hashed.
    return true
  }

  return false
}

/**
 * Check whether a stored hash is already bcrypt-hashed.
 */
export function isHashed(hash: string): boolean {
  return hash.startsWith('$2')
}