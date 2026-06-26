import { NextRequest, NextResponse } from 'next/server'
import { ExportEngine } from '@/lib/export/engine'

/**
 * POST /api/exports/cron/expire-links — Expire completed exports past their expiry date
 * POST /api/exports/cron/cleanup — Delete old expired/failed/cancelled export records + S3 objects
 *
 * These endpoints are called by an external scheduler (cron job).
 */

// Expire completed exports whose expiresAt has passed
export async function POST(req: NextRequest) {
  try {
    // Simple cron secret check
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'cron-secret'}`) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const url = new URL(req.url)
    // Determine which operation based on the URL path
    const pathname = url.pathname

    if (pathname.includes('expire-links')) {
      const count = await ExportEngine.expireCompletedExports()
      return NextResponse.json({
        expired: count,
        timestamp: new Date().toISOString(),
      })
    }

    if (pathname.includes('cleanup')) {
      const retentionDays = parseInt(url.searchParams.get('retentionDays') || '30', 10)
      const result = await ExportEngine.cleanupOldJobs(retentionDays)
      return NextResponse.json({
        deletedRecords: result.deleted,
        deletedS3Objects: result.s3Deleted,
        retentionDays,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({ error: 'Unknown cron operation' }, { status: 400 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}