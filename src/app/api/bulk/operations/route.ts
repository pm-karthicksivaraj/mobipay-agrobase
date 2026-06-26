import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { BulkEngine } from '@/lib/bulk/engine'

/**
 * GET /api/bulk/operations — List bulk operations with pagination
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10)
    const type = url.searchParams.get('type') || undefined
    const status = url.searchParams.get('status') || undefined

    const result = await BulkEngine.listOperations(ctx.tenantId, { page, pageSize, type, status })
    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}