/**
 * Agrobase V3 — Prisma Client with Production Connection Pooling
 *
 * PostgreSQL connection pooling strategy:
 * - Production: Uses @prisma/adapter-pg-lite or pg Pool via DATABASE_URL
 * - Development: Direct connection (single client)
 *
 * Connection pool is configured via DATABASE_URL parameters:
 *   ?connection_limit=10&pool_timeout=30
 *
 * For PgBouncer (recommended in production), use:
 *   ?pgbouncer=true
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === 'production'

  // Log pool configuration on startup
  const dbUrl = process.env.DATABASE_URL || 'file:./db/dev.db'
  if (dbUrl.startsWith('postgresql')) {
    const url = new URL(dbUrl)
    const poolSize = url.searchParams.get('connection_limit') || url.searchParams.get('pool_size')
    console.log(
      `[DB] PostgreSQL client initialized` +
        (poolSize ? ` (pool_size=${poolSize})` : ' (default pool)') +
        (isProduction ? ' [PRODUCTION]' : ' [DEVELOPMENT]')
    )
  } else {
    console.log(`[DB] SQLite client initialized [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`)
  }

  return new PrismaClient({
    log: isProduction
      ? ['error', 'warn']
      : ['query', 'error', 'warn'],
    // In production, Prisma uses connection pooling automatically
    // via the pg driver's built-in pool.
    // For advanced pooling (PgBouncer), set ?pgbouncer=true in DATABASE_URL.
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// Prevent multiple instances in development (hot reload)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Graceful shutdown handler
if (typeof process !== 'undefined') {
  const shutdown = async (signal: string) => {
    console.log(`[DB] ${signal} received, disconnecting Prisma client...`)
    try {
      await db.$disconnect()
      console.log('[DB] Prisma client disconnected successfully')
    } catch (err) {
      console.error('[DB] Error disconnecting Prisma client:', err)
    }
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}