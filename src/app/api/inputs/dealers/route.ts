import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const dealers = await db.inputDealer.findMany({
    include: { products: true, _count: { select: { requests: true } } },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json({ dealers })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const dealer = await db.inputDealer.create({
    data: { name: body.name, phone: body.phone, location: body.location, isActive: true }
  })
  return NextResponse.json({ data: dealer }, { status: 201 })
}