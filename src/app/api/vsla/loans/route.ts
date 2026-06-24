import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const groupId = req.nextUrl.searchParams.get('groupId') || ''
  const status = req.nextUrl.searchParams.get('status') || ''
  const where: Record<string, unknown> = {}
  if (groupId) where.vslaGroupId = groupId
  if (status) where.status = status
  const loans = await db.vslaLoan.findMany({
    where, include: { farmer: { select: { firstName: true, lastName: true, farmerCode: true, phone: true } } },
    orderBy: { createdAt: 'desc' }, take: 100
  })
  return NextResponse.json({ loans })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const interestRate = body.interestRate || 10
  const totalRepayable = body.amount + (body.amount * interestRate / 100)
  const loan = await db.vslaLoan.create({
    data: {
      vslaGroupId: body.vslaGroupId, farmerId: body.farmerId,
      amount: body.amount, interestRate, totalRepayable,
      purpose: body.purpose, status: 'PENDING',
      dueDate: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 90 * 86400000)
    }
  })
  return NextResponse.json({ data: loan }, { status: 201 })
}