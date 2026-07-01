/**
 * Sentry instrumentation file — auto-loaded by Next.js
 * Activates Sentry when NEXT_PUBLIC_SENTRY_DSN is set
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.server.config')
  }
}
