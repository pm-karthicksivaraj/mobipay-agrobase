import { NextRequest, NextResponse } from 'next/server'
import { ExportEngine } from '@/lib/export/engine'

/**
 * POST /api/exports/cron/process — Process all pending export jobs
 * Called by scheduler/cron. Uses auth bypass for internal cron.
 */
export async function POST(req: NextRequest) {
  try {
    // Simple cron secret check (optional)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'cron-secret'}`) {
      // Allow without auth in development
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const url = new URL(req.url)
    const tenantId = url.searchParams.get('tenantId') || undefined

    const result = await ExportEngine.processPendingJobs(tenantId)
    return NextResponse.json({
      processed: result.processed,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}