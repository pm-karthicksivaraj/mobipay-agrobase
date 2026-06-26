import { NextRequest, NextResponse } from 'next/server'
import { ExportEngine } from '@/lib/export/engine'

/**
 * POST /api/exports/cron/cleanup — Delete old export records + S3 objects
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'cron-secret'}`) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const url = new URL(req.url)
    const retentionDays = parseInt(url.searchParams.get('retentionDays') || '30', 10)

    const result = await ExportEngine.cleanupOldJobs(retentionDays)
    return NextResponse.json({
      deletedRecords: result.deleted,
      deletedS3Objects: result.s3Deleted,
      retentionDays,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}