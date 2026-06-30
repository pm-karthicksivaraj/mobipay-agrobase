import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const product = await db.marketProduct.findFirst({ where: { id, ...tf }, include: { matches: true } })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: product })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const body = await req.json()
  const existing = await db.marketProduct.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Schema-sanitised payload — only MarketProduct columns are passed to Prisma.
  // (`unit` and `description` from the client form are intentionally dropped —
  //  the Prisma model has no such fields.)
  const updated = await db.marketProduct.update({
    where: { id },
    data: {
      ...(body.sellerName !== undefined && { sellerName: body.sellerName }),
      ...(body.sellerId !== undefined && { sellerId: body.sellerId }),
      ...(body.commodity !== undefined && { commodity: body.commodity }),
      ...(body.variety !== undefined && { variety: body.variety }),
      ...(body.quantity !== undefined && { quantity: body.quantity }),
      ...(body.unitPrice !== undefined && { unitPrice: body.unitPrice }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.status !== undefined && { status: body.status }),
    },
  })
  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const existing = await db.marketProduct.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.marketProduct.delete({ where: { id } })
  return NextResponse.json({ message: 'Deleted' })
}
