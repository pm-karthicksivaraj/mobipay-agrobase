import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { ExportEngine } from '@/lib/export/engine'

/**
 * GET /api/exports/[id] — Get a single export job
 * DELETE /api/exports/[id] — Cancel a pending export job
 * PATCH /api/exports/[id] — Retry a failed export job
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

    const job = await ExportEngine.getJob(id, tenantId)
    return NextResponse.json(job)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    const status = msg === 'Unauthorized' ? 403 : msg.includes('not found') ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(
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

    const job = await ExportEngine.cancelJob(id, tenantId)
    return NextResponse.json({ job, message: 'Export job cancelled' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    const status = msg === 'Unauthorized' ? 403 : msg.includes('not found') ? 404 : msg.includes('Only PENDING') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function PATCH(
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

    const job = await ExportEngine.retryJob(id, tenantId)

    // Fire-and-forget processing
    ExportEngine.processJob(job.id).catch((err) => {
      console.error(`[Export] Retry job ${job.id} failed:`, err instanceof Error ? err.message : err)
    })

    return NextResponse.json({ job, message: 'Export job retry initiated' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    const status = msg === 'Unauthorized' ? 403 : msg.includes('not found') ? 404 : msg.includes('Only FAILED') || msg.includes('Max retry') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}