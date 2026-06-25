import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const matches = await db.marketMatch.findMany({
    where: tf, include: { product: true }, orderBy: { createdAt: 'desc' }, take: 100
  })
  return NextResponse.json({ matches })
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const body = await req.json()
  const match = await db.marketMatch.create({
    data: {
      tenantId: ctx.tenantId,
      productId: body.productId || null, buyerName: body.buyerName,
      buyerPhone: body.buyerPhone, quantity: body.quantity,
      pricePerUnit: body.pricePerUnit, totalValue: body.totalValue, status: 'PENDING'
    }
  })
  if (body.productId) {
    await db.marketProduct.update({ where: { id: body.productId }, data: { status: 'MATCHED' } })
  }
  return NextResponse.json({ data: match }, { status: 201 })
}