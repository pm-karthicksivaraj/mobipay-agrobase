import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { ExportEngine } from '@/lib/export/engine'
import { hasPermission } from '@/lib/permissions'
import type { CreateExportRequest } from '@/lib/export/types'

/**
 * GET /api/exports — List export jobs for the tenant
 * POST /api/exports — Create a new export job (async)
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10)
    const status = url.searchParams.get('status') as any || undefined
    const exportType = url.searchParams.get('exportType') as any || undefined

    const tenantId = ctx.isSuperAdmin && ctx.tenantScope.length > 1
      ? ctx.tenantScope[0]
      : ctx.tenantId

    const result = await ExportEngine.listJobs(tenantId, { page, pageSize, status, exportType })
    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check permission
    const canExport = hasPermission(ctx.role, 'EXPORTS_CREATE')
    if (!canExport) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body: CreateExportRequest = await req.json()
    const { exportType, format, filters, columns } = body

    if (!exportType) {
      return NextResponse.json({ error: 'exportType is required' }, { status: 400 })
    }

    const tenantId = ctx.isSuperAdmin && ctx.tenantScope.length > 1
      ? ctx.tenantScope[0]
      : ctx.tenantId

    const job = await ExportEngine.createJob(tenantId, { exportType, format, filters, columns }, ctx.userId)

    // Fire-and-forget: process the job asynchronously
    // In production, this would be a queue (BullMQ, etc.)
    ExportEngine.processJob(job.id).catch((err) => {
      console.error(`[Export] Background job ${job.id} failed:`, err instanceof Error ? err.message : err)
    })

    return NextResponse.json({ job, message: 'Export job created and processing started' }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}