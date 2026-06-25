import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const [loans, products] = await Promise.all([
    db.loanApplication.findMany({ include: { loanProduct: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.loanProduct.findMany({ where: { isActive: true } })
  ])
  return NextResponse.json({ loans, products })
}

export async function POST(request: Request) {
  const body = await request.json()
  const loan = await db.loanApplication.create({
    data: { loanProductId: body.loanProductId, applicantName: body.applicantName, applicantPhone: body.applicantPhone, amount: body.amount, purpose: body.purpose, status: 'PENDING' }
  })
  return NextResponse.json(loan, { status: 201 })
}