import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const groupId = req.nextUrl.searchParams.get('groupId') || ''
  const where: Record<string, unknown> = {}
  if (groupId) where.vslaGroupId = groupId
  const savings = await db.vslaSaving.findMany({
    where, include: { farmer: { select: { firstName: true, lastName: true, farmerCode: true } } },
    orderBy: { createdAt: 'desc' }, take: 100
  })
  const total = await db.vslaSaving.aggregate({ where, _sum: { amount: true } })
  return NextResponse.json({ savings, totalAmount: total._sum.amount || 0 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const saving = await db.vslaSaving.create({
    data: {
      vslaGroupId: body.vslaGroupId, farmerId: body.farmerId,
      amount: body.amount, sharesBought: Math.floor(body.amount / 5000) || 1,
      savedOnBehalfOf: body.savedOnBehalfOf || null,
      transactionRef: `SAV-${Date.now()}`, status: 'COMPLETED'
    }
  })
  return NextResponse.json({ data: saving }, { status: 201 })
}