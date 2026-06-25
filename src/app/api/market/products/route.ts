import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') || ''
  const commodity = req.nextUrl.searchParams.get('commodity') || ''
  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (commodity) where.commodity = { contains: commodity }
  const products = await db.marketProduct.findMany({
    where, include: { matches: true }, orderBy: { createdAt: 'desc' }, take: 100
  })
  return NextResponse.json({ products })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const product = await db.marketProduct.create({
    data: {
      sellerId: body.sellerId || null, sellerName: body.sellerName,
      commodity: body.commodity, variety: body.variety,
      quantity: body.quantity, unitPrice: body.unitPrice,
      location: body.location, status: 'AVAILABLE'
    }
  })
  return NextResponse.json({ data: product }, { status: 201 })
}