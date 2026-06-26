import { NextResponse } from 'next/server'
import { ExportEngine } from '@/lib/export/engine'
import { getTenantContext } from '@/lib/tenant'

/**
 * GET /api/exports/stats — Get export stats for the current tenant
 */
export async function GET() {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = ctx.isSuperAdmin && ctx.tenantScope.length > 1
      ? ctx.tenantScope[0]
      : ctx.tenantId

    const stats = await ExportEngine.getStats(tenantId)
    return NextResponse.json(stats)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}