import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const payments = await db.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
  return NextResponse.json(payments)
}

export async function POST(request: Request) {
  const body = await request.json()
  const payment = await db.payment.create({
    data: { type: body.type, recipientName: body.recipientName, recipientPhone: body.recipientPhone, amount: body.amount, description: body.description, transactionRef: `PAY-${Date.now()}`, status: 'PENDING' }
  })
  // Simulate completion after 1s
  setTimeout(async () => { await db.payment.update({ where: { id: payment.id }, data: { status: 'COMPLETED' } }) }, 1000)
  return NextResponse.json(payment, { status: 201 })
}