import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { BulkEngine } from '@/lib/bulk/engine'
import { BulkImportEngine } from '@/lib/bulk/import'

/**
 * GET /api/bulk/operations/[id]/errors — Download error report for a bulk operation
 *
 * Returns detailed per-row errors as:
 *   - JSON (default)
 *   - CSV (query param ?format=csv)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const url = new URL(_req.url)
    const format = url.searchParams.get('format') || 'json'

    const details = await BulkEngine.getErrorDetails(id, ctx.tenantId)

    if (format === 'csv') {
      if (details.errors.length === 0) {
        return NextResponse.json({ message: 'No errors to report' })
      }
      const csv = BulkImportEngine.generateErrorReport(details.errors)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="import_errors_${id}.csv"`,
        },
      })
    }

    return NextResponse.json(details)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    const status = msg.includes('not found') ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}