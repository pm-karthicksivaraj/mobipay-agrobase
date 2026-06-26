import { NextResponse } from 'next/server'
import { NotificationEngine } from '@/lib/notifications'

/**
 * POST /api/notifications/cron/retry — Retry failed notifications
 *
 * Scheduled job endpoint. Retries failed notification deliveries
 * up to 3 attempts with exponential backoff (5s, 15s, 60s).
 * Processes up to 100 per run.
 *
 * Security: Checks X-Cron-Secret header.
 */
export async function POST() {
  try {
    const { headers } = await import('next/headers')
    const headersList = await headers()
    const cronSecret = headersList.get('x-cron-secret')
    const expectedSecret = process.env.NOTIFICATION_CRON_SECRET

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const retried = await NotificationEngine.retryFailed()

    return NextResponse.json({
      success: true,
      retried,
      message: retried > 0
        ? `Retried ${retried} failed notification(s)`
        : 'No failed notifications to retry',
    })
  } catch (error) {
    console.error('[/api/notifications/cron/retry] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}