import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    const { id } = await params
    const filter = buildTenantFilter(ctx) as any
    const record = await db.shipment.findFirst({ where: { id, ...filter }, include: { items: true } })
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    const { id } = await params
    const filter = buildTenantFilter(ctx) as any
    const existing = await db.shipment.findFirst({ where: { id, ...filter } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const body = await req.json()
    const { status, trackingNumber, estimatedDelivery, notes, carrier } = body
    const record = await db.shipment.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(trackingNumber !== undefined && { trackingNumber }),
        ...(estimatedDelivery !== undefined && { estimatedDelivery: new Date(estimatedDelivery) }),
        ...(notes !== undefined && { notes }),
        ...(carrier !== undefined && { carrier }),
        updatedAt: new Date(),
      },
    })
    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    const { id } = await params
    const filter = buildTenantFilter(ctx) as any
    const existing = await db.shipment.findFirst({ where: { id, ...filter } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // Soft-cancel shipment
    const record = await db.shipment.update({
      where: { id },
      data: { status: 'CANCELLED', updatedAt: new Date() },
    })
    return NextResponse.json({ data: record, message: 'Shipment cancelled' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}