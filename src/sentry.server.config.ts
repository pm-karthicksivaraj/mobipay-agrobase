/**
 * Sentry Server Configuration
 * Activated only when NEXT_PUBLIC_SENTRY_DSN is set in env
 */
import * as Sentry from '@sentry/nextjs'

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
    // Filter out known noise
    ignoreErrors: [
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',
      'NEXT_AUTH_ERROR',
    ],
    beforeSend(event) {
      // Don't send events in development unless explicitly enabled
      if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEV) {
        return null
      }
      return event
    },
  })
}
