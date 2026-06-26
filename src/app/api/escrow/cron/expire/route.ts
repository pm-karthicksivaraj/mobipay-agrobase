import { NextResponse } from 'next/server'
import { EscrowEngine } from '@/lib/escrow'

/**
 * POST /api/escrow/cron/expire — Expire overdue escrows
 *
 * Scheduled job endpoint. Finds all HELD escrows past their autoReleaseAt
 * and marks them as EXPIRED. Expired escrows require manual review before
 * refund or release.
 *
 * Security: In production, protect with a cron secret header.
 * Checks for X-Cron-Secret header matching ESCROW_CRON_SECRET env var.
 */
export async function POST() {
  try {
    // Verify cron secret
    const { headers } = await import('next/headers')
    const headersList = await headers()
    const cronSecret = headersList.get('x-cron-secret')
    const expectedSecret = process.env.ESCROW_CRON_SECRET

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const expiredCount = await EscrowEngine.expireOverdueEscrows()

    return NextResponse.json({
      success: true,
      expiredCount,
      message: expiredCount > 0
        ? `Expired ${expiredCount} overdue escrow(s)`
        : 'No overdue escrows found',
    })
  } catch (error) {
    console.error('[/api/escrow/cron/expire] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}