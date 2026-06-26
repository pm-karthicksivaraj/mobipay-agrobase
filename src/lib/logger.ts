/**
 * Agrobase V3 — Structured Logger (pino)
 *
 * Usage in API routes:
 *   import { logger } from '@/lib/logger'
 *   logger.info({ route: '/api/farmers', userId: ctx.userId }, 'Fetching farmers')
 *
 * In middleware / lib:
 *   logger.error({ err, route }, 'Request failed')
 *
 * Log levels: trace, debug, info, warn, error, fatal
 * Output: JSON in production, pretty-printed in development
 */

import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  ...(isProduction
    ? {
        // Production: JSON to stdout for log aggregators (Datadog, CloudWatch, etc.)
        formatters: {
          level(label) {
            return { level: label }
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        // Development: human-readable colored output
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }),
  base: {
    service: 'agrobase-v3',
    version: process.env.npm_package_version || '0.2.0',
  },
  // Redact sensitive fields
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'passwordHash', 'secret', 'token', 'key'],
    censor: '[REDACTED]',
  },
})

/**
 * Create a child logger with bound context (e.g., per-request).
 *
 * @example
 * const reqLogger = logger.child({ requestId: 'abc', userId: '123', route: '/api/farmers' })
 * reqLogger.info('Processing request')
 */
export function createRequestLogger(context: Record<string, unknown>) {
  return logger.child(context)
}

export default logger