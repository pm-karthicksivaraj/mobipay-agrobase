import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

// Cross-tenant marketplace — no tenant isolation applied
export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    const tf = buildTenantFilter(ctx, 'tenantId') as any
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') || 'products'

    if (tab === 'products') {
      const products = await db.marketProduct.findMany({ where: tf, orderBy: { createdAt: 'desc' }, take: 50 })
      return NextResponse.json(products)
    }
    if (tab === 'matches') {
      const matches = await db.marketMatch.findMany({ where: tf, include: { product: true }, orderBy: { createdAt: 'desc' }, take: 50 })
      return NextResponse.json(matches)
    }
    return NextResponse.json([])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    const tf = buildTenantFilter(ctx, 'tenantId') as any
    const body = await request.json()
    const tab = body.tab
    if (tab === 'products') {
      const product = await db.marketProduct.create({ data: { tenantId: ctx.tenantId, sellerId: body.sellerId, sellerName: body.sellerName, commodity: body.commodity, variety: body.variety, quantity: body.quantity, unitPrice: body.unitPrice, location: body.location } })
      return NextResponse.json(product, { status: 201 })
    }
    return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create market listing' }, { status: 500 })
  }
}