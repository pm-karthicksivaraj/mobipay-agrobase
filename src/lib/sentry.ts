/**
 * Sentry Error Monitoring Configuration
 *
 * To activate Sentry:
 * 1. Create a free account at https://sentry.io
 * 2. Create a new Next.js project
 * 3. Copy your DSN to .env: NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/123
 * 4. Add SENTRY_AUTH_TOKEN to Vercel env vars for source maps
 * 5. Uncomment the Sentry imports below and in next.config.ts
 *
 * The instrumentation.ts file auto-initializes Sentry on both
 * server and client when NEXT_PUBLIC_SENTRY_DSN is set.
 */

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || ''
export const SENTRY_ENVIRONMENT = process.env.NODE_ENV === 'production' ? 'production' : 'development'
export const SENTRY_RELEASE = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev'

export function isSentryEnabled(): boolean {
  return !!SENTRY_DSN
}

/**
 * Capture an exception manually (works even without Sentry initialized —
 * falls back to console.error)
 */
export function captureException(error: Error | unknown, context?: Record<string, any>) {
  if (isSentryEnabled()) {
    // Dynamic import to avoid loading Sentry in development
    import('@sentry/nextjs').then(Sentry => {
      if (context) Sentry.setTag('context', JSON.stringify(context))
      Sentry.captureException(error)
    }).catch(() => {
      console.error('[Sentry failed to load]', error)
    })
  } else {
    console.error('[Exception]', error, context)
  }
}

/**
 * Capture a message (info-level by default)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (isSentryEnabled()) {
    import('@sentry/nextjs').then(Sentry => {
      Sentry.captureMessage(message, level)
    }).catch(() => {
      console.log(`[${level}]`, message)
    })
  } else {
    console.log(`[${level}]`, message)
  }
}
