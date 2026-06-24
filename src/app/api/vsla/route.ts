import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') || 'groups'
  
  if (tab === 'groups') {
    const groups = await db.vslaGroup.findMany({ where: { isActive: true }, include: { _count: { select: { members: true, savings: true, loans: true } } }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(groups)
  }
  if (tab === 'savings') {
    const groupId = searchParams.get('groupId') || ''
    const where: any = { status: 'COMPLETED' }
    if (groupId) where.vslaGroupId = groupId
    const savings = await db.vslaSaving.findMany({ where, include: { farmer: true, vslaGroup: true }, orderBy: { createdAt: 'desc' }, take: 50 })
    return NextResponse.json(savings)
  }
  if (tab === 'loans') {
    const loans = await db.vslaLoan.findMany({ include: { farmer: true, vslaGroup: true }, orderBy: { createdAt: 'desc' }, take: 50 })
    return NextResponse.json(loans)
  }
  if (tab === 'meetings') {
    const groupId = searchParams.get('groupId') || ''
    const where: any = {}
    if (groupId) where.vslaGroupId = groupId
    const meetings = await db.vslaMeeting.findMany({ where, include: { _count: { select: { attendance: true } }, vslaGroup: true }, orderBy: { meetingDate: 'desc' }, take: 30 })
    return NextResponse.json(meetings)
  }
  return NextResponse.json([])
}

export async function POST(request: Request) {
  const body = await request.json()
  const tab = body.tab

  if (tab === 'savings') {
    const saving = await db.vslaSaving.create({
      data: { vslaGroupId: body.vslaGroupId, farmerId: body.farmerId, amount: body.amount, sharesBought: Math.floor(body.amount / 1000), transactionRef: `TXN-${Date.now()}`, status: 'COMPLETED' }
    })
    return NextResponse.json(saving, { status: 201 })
  }
  if (tab === 'loans') {
    const loan = await db.vslaLoan.create({
      data: { vslaGroupId: body.vslaGroupId, farmerId: body.farmerId, amount: body.amount, interestRate: body.interestRate || 10, totalRepayable: body.amount * 1.1, status: 'PENDING', requestedAt: new Date(), dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }
    })
    return NextResponse.json(loan, { status: 201 })
  }
  if (tab === 'meetings') {
    const meeting = await db.vslaMeeting.create({
      data: { vslaGroupId: body.vslaGroupId, agenda: body.agenda, meetingDate: new Date(body.meetingDate), startTime: body.startTime, endTime: body.endTime, status: 'SCHEDULED' }
    })
    return NextResponse.json(meeting, { status: 201 })
  }
  return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
}