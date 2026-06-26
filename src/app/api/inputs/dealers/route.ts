import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const ctx = await getTenantContext()
  const dealers = await db.inputDealer.findMany({
    where: { tenantId: ctx.tenantId },
    include: { products: true, _count: { select: { requests: true } } },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json({ dealers })
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  const body = await req.json()
  const dealer = await db.inputDealer.create({
    data: { tenantId: ctx.tenantId, name: body.name, phone: body.phone, location: body.location, isActive: true }
  })
  return NextResponse.json({ data: dealer }, { status: 201 })
}