import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const { id } = await params
  const body = await req.json()
  const { attendance } = body as { attendance: { farmerId: string; present: boolean }[] }
  const results = []
  for (const a of attendance) {
    const record = await db.vslaAttendance.upsert({
      where: { meetingId_farmerId: { meetingId: id, farmerId: a.farmerId } },
      create: { meetingId: id, farmerId: a.farmerId, present: a.present, tenantId: ctx.tenantId },
      update: { present: a.present }
    })
    results.push(record)
  }
  await db.vslaMeeting.update({ where: { id, ...tf }, data: { status: 'CONCLUDED' } })
  return NextResponse.json({ data: results })
}