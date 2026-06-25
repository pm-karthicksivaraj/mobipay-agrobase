import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') || ''
  const where: Record<string, unknown> = {}
  if (status) where.status = status
  const messages = await db.message.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 100
  })
  return NextResponse.json({ data: messages })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const message = await db.message.create({
    data: {
      type: body.type || 'SMS', recipient: body.recipient,
      content: body.content, status: 'PENDING'
    }
  })
  return NextResponse.json({ data: message }, { status: 201 })
}