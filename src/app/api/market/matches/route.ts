import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const matches = await db.marketMatch.findMany({
    include: { product: true }, orderBy: { createdAt: 'desc' }, take: 100
  })
  return NextResponse.json({ matches })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const match = await db.marketMatch.create({
    data: {
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