import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { EudrEngine } from '@/lib/eudr/engine'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'compliance:read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params

    // Verify access through farmer tenant
    const compliance = await db.eudrCompliance.findFirst({
      where: { id },
      include: { farmer: { select: { tenantId: true } } },
    })

    if (!compliance) {
      return NextResponse.json({ error: 'EUDR compliance record not found' }, { status: 404 })
    }

    if (!ctx.isSuperAdmin && compliance.farmer && !ctx.tenantScope.includes(compliance.farmer.tenantId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const status = await EudrEngine.getTracesStatus(id)
    return NextResponse.json(status)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get TRACES status'
    console.error('EUDR TRACES status error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}