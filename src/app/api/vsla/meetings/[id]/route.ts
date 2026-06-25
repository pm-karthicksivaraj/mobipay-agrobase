import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { attendance } = body as { attendance: { farmerId: string; present: boolean }[] }
  const results = []
  for (const a of attendance) {
    const record = await db.vslaAttendance.upsert({
      where: { meetingId_farmerId: { meetingId: id, farmerId: a.farmerId } },
      create: { meetingId: id, farmerId: a.farmerId, present: a.present },
      update: { present: a.present }
    })
    results.push(record)
  }
  await db.vslaMeeting.update({ where: { id }, data: { status: 'CONCLUDED' } })
  return NextResponse.json({ data: results })
}