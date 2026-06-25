import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const groupId = req.nextUrl.searchParams.get('groupId') || ''
  const where: Record<string, unknown> = {}
  if (groupId) where.vslaGroupId = groupId
  const meetings = await db.vslaMeeting.findMany({
    where, include: {
      _count: { select: { attendance: true } },
      attendance: { include: { farmer: { select: { firstName: true, lastName: true } } } }
    },
    orderBy: { meetingDate: 'desc' }, take: 50
  })
  return NextResponse.json({ meetings })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const meeting = await db.vslaMeeting.create({
    data: {
      vslaGroupId: body.vslaGroupId, agenda: body.agenda,
      meetingDate: new Date(body.meetingDate),
      startTime: body.startTime, endTime: body.endTime,
      status: 'SCHEDULED', createdById: body.createdById || null
    }
  })
  return NextResponse.json({ data: meeting }, { status: 201 })
}