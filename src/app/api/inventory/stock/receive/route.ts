import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const { stockItemId, batchCode, warehouseId, quantity, ...rest } = body
    const filter = buildTenantFilter(ctx)
    const stockItem = stockItemId
      ? await db.stockItem.findFirst({ where: { id: stockItemId, ...filter } })
      : batchCode
        ? await db.stockItem.findFirst({ where: { batchCode, warehouseId, ...filter } })
        : null
    let item = stockItem
    if (!item && batchCode && warehouseId) {
      item = await db.stockItem.create({
        data: {
          tenantId: ctx.tenantId,
          warehouseId,
          batchCode,
          commodity: body.commodity || batchCode,
          quantity: 0,
        },
      })
    }
    if (!item) return NextResponse.json({ error: 'Stock item not found or insufficient data' }, { status: 404 })
    const movement = await db.stockMovement.create({
      data: { tenantId: ctx.tenantId, stockItemId: item.id, warehouseId, type: 'IN', quantity, ...rest },
    })
    const updated = await db.stockItem.update({ where: { id: item.id }, data: { quantity: { increment: quantity } } })
    return NextResponse.json({ data: { movement, stockItem: updated } }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}