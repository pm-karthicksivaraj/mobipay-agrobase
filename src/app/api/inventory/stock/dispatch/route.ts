import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const { stockItemId, quantity, ...rest } = body
    const filter = buildTenantFilter(ctx)
    const stockItem = await db.stockItem.findFirst({ where: { id: stockItemId, ...filter } })
    if (!stockItem) return NextResponse.json({ error: 'Stock item not found' }, { status: 404 })
    if (stockItem.quantity < quantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 })
    }
    const movement = await db.stockMovement.create({
      data: { tenantId: ctx.tenantId, stockItemId, warehouseId: stockItem.warehouseId, type: 'OUT', quantity, ...rest },
    })
    const updated = await db.stockItem.update({ where: { id: stockItemId }, data: { quantity: { decrement: quantity } } })
    return NextResponse.json({ data: { movement, stockItem: updated } }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}