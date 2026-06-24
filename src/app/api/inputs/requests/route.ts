import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') || ''
  const where: Record<string, unknown> = {}
  if (status) where.status = status
  const requests = await db.inputRequest.findMany({
    where, include: { dealer: true }, orderBy: { createdAt: 'desc' }, take: 100
  })
  return NextResponse.json({ requests })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const request = await db.inputRequest.create({
    data: {
      dealerId: body.dealerId || null, farmerId: body.farmerId || null,
      farmerName: body.farmerName, farmerPhone: body.farmerPhone,
      product: body.product, quantity: body.quantity,
      unitPrice: body.unitPrice, totalPrice: body.totalPrice, status: 'PENDING'
    }
  })
  return NextResponse.json({ data: request }, { status: 201 })
}