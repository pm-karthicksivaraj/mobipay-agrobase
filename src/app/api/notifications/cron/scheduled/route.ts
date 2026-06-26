import { NextResponse } from 'next/server'
import { NotificationEngine } from '@/lib/notifications'

/**
 * POST /api/notifications/cron/scheduled — Process scheduled notifications
 *
 * Scheduled job endpoint. Finds all PENDING notifications whose
 * scheduledAt <= now and dispatches them via their channel provider.
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

    const processed = await NotificationEngine.processScheduled()

    return NextResponse.json({
      success: true,
      processed,
      message: processed > 0
        ? `Processed ${processed} scheduled notification(s)`
        : 'No scheduled notifications to process',
    })
  } catch (error) {
    console.error('[/api/notifications/cron/scheduled] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}