import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { TransportEngine } from '@/lib/transport/engine'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(ctx.role, 'transport:approve')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const activate = body.activate === true
    const transporter = await TransportEngine.verifyTransporter(id, ctx.tenantId, ctx.userId, activate)
    return NextResponse.json({ data: transporter })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const status = msg.includes('not found') ? 404 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}