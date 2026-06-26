import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const { id } = await params

  const meeting = await db.vslaMeeting.findFirst({
    where: { id, ...tf },
    include: {
      attendance: true,
      vslaGroup: { select: { id: true, name: true } },
    },
  })
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  return NextResponse.json({ data: meeting })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const { id } = await params
  const body = await req.json()

  const existing = await db.vslaMeeting.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  const { meetingDate, meetingType, status } = body
  const meeting = await db.vslaMeeting.update({
    where: { id },
    data: {
      ...(meetingDate !== undefined && { meetingDate: new Date(meetingDate) }),
      ...(meetingType !== undefined && { meetingType }),
      ...(status !== undefined && { status }),
    },
  })
  return NextResponse.json({ data: meeting })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const { id } = await params
  const body = await req.json()

  const existing = await db.vslaMeeting.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  const { attendance } = body as { attendance: { farmerId: string; present: boolean }[] }
  const results: any[] = []
  for (const a of attendance) {
    const record = await db.vslaAttendance.upsert({
      where: { meetingId_farmerId: { meetingId: id, farmerId: a.farmerId } },
      create: { meetingId: id, farmerId: a.farmerId, present: a.present, tenantId: ctx.tenantId },
      update: { present: a.present },
    })
    results.push(record)
  }
  await db.vslaMeeting.update({
    where: { id },
    data: { status: 'CONCLUDED' },
  })
  return NextResponse.json({ data: results })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const { id } = await params

  const existing = await db.vslaMeeting.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  // Cancel meeting and remove attendance
  await db.vslaAttendance.deleteMany({ where: { meetingId: id } })
  await db.vslaMeeting.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })
  return NextResponse.json({ message: 'Meeting cancelled' })
}