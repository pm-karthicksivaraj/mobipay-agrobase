import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    const groupId = req.nextUrl.searchParams.get('groupId') || ''
    const where: Record<string, unknown> = {}
    if (groupId) where.vslaGroupId = groupId
    // Filter through vslaGroup tenantId
    if (!ctx.isSuperAdmin) {
      where.vslaGroup = { tenantId: { in: ctx.tenantScope } }
    }
    const meetings = await db.vslaMeeting.findMany({
      where, include: {
        _count: { select: { attendance: true } },
        attendance: { include: { farmer: { select: { firstName: true, lastName: true } } } }
      },
      orderBy: { meetingDate: 'desc' }, take: 50,
    })
    return NextResponse.json({ meetings })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch VSLA meetings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    const body = await req.json()

    // Verify VSLA group belongs to tenant
    if (!ctx.isSuperAdmin) {
      const group = await db.vslaGroup.findFirst({
        where: { id: body.vslaGroupId, tenantId: { in: ctx.tenantScope } },
      })
      if (!group) {
        return NextResponse.json({ error: 'VSLA group not found in your tenant' }, { status: 403 })
      }
    }

    const meeting = await db.vslaMeeting.create({
      data: {
        vslaGroupId: body.vslaGroupId, agenda: body.agenda,
        meetingDate: new Date(body.meetingDate),
        startTime: body.startTime, endTime: body.endTime,
        status: 'SCHEDULED', createdById: body.createdById || null
      }
    })
    return NextResponse.json({ data: meeting }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create VSLA meeting' }, { status: 500 })
  }
}