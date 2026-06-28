import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    const { id } = await params
    const tf = ctx ? buildTenantFilter(ctx, 'tenantId') as any : {}

    const delivery = await db.delivery.findFirst({
      where: { id, ...tf },
    })
    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }
    return NextResponse.json({ data: delivery })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch delivery' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await request.json()

    const existing = await db.delivery.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    const updated = await db.delivery.update({
      where: { id },
      data: {
        status: body.status ?? undefined,
        driverName: body.driverName ?? undefined,
        vehicleReg: body.vehicleReg ?? undefined,
        dispatchedAt: body.dispatchedAt ? new Date(body.dispatchedAt) : undefined,
        deliveredAt: body.deliveredAt ? new Date(body.deliveredAt) : undefined,
      },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update delivery' }, { status: 500 })
  }
}