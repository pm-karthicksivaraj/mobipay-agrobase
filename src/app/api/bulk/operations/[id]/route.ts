import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { BulkEngine } from '@/lib/bulk/engine'

/**
 * GET /api/bulk/operations/[id] — Get operation status with progress
 * DELETE /api/bulk/operations/[id] — Cancel a PENDING operation
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const operation = await BulkEngine.getStatus(id, ctx.tenantId)
    return NextResponse.json(operation)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    const status = msg.includes('not found') ? 404 : 500
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

    const operation = await BulkEngine.cancelOperation(id, ctx.tenantId)
    return NextResponse.json({ data: operation, message: 'Operation cancelled' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    const status = msg.includes('not found') ? 404 : msg.includes('Only PENDING') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}