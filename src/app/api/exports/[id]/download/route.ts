import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { ExportEngine } from '@/lib/export/engine'

/**
 * GET /api/exports/[id]/download — Get a presigned download URL for a completed export
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const tenantId = ctx.isSuperAdmin && ctx.tenantScope.length > 1
      ? ctx.tenantScope[0]
      : ctx.tenantId

    const result = await ExportEngine.getDownloadUrl(id, tenantId)
    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    const status = msg === 'Unauthorized' ? 403 : msg.includes('not found') ? 404 : msg.includes('not ready') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}