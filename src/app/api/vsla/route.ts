import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const tenantWhere = buildTenantFilter(ctx, 'tenantId')
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') || 'groups'

    if (tab === 'groups') {
      const groups = await db.vslaGroup.findMany({
        where: { ...tenantWhere, isActive: true },
        include: { _count: { select: { members: true, savings: true, loans: true } } },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(groups)
    }
    if (tab === 'savings') {
      const groupId = searchParams.get('groupId') || ''
      const where: Record<string, unknown> = { status: 'COMPLETED' }
      if (groupId) where.vslaGroupId = groupId
      // Tenant filter through vslaGroup
      if (!ctx.isSuperAdmin) {
        where.vslaGroup = { tenantId: { in: ctx.tenantScope as string[] } }
      }
      const savings = await db.vslaSaving.findMany({
        where, include: { farmer: true, vslaGroup: true },
        orderBy: { createdAt: 'desc' }, take: 50,
      })
      return NextResponse.json(savings)
    }
    if (tab === 'loans') {
      const where: Record<string, unknown> = {}
      if (!ctx.isSuperAdmin) {
        where.vslaGroup = { tenantId: { in: ctx.tenantScope as string[] } }
      }
      const loans = await db.vslaLoan.findMany({
        where, include: { farmer: true, vslaGroup: true },
        orderBy: { createdAt: 'desc' }, take: 50,
      })
      return NextResponse.json(loans)
    }
    if (tab === 'meetings') {
      const groupId = searchParams.get('groupId') || ''
      const where: Record<string, unknown> = {}
      if (groupId) where.vslaGroupId = groupId
      if (!ctx.isSuperAdmin) {
        where.vslaGroup = { tenantId: { in: ctx.tenantScope as string[] } }
      }
      const meetings = await db.vslaMeeting.findMany({
        where, include: { _count: { select: { attendance: true } }, vslaGroup: true },
        orderBy: { meetingDate: 'desc' }, take: 30,
      })
      return NextResponse.json(meetings)
    }
    return NextResponse.json([])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch VSLA data' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const tab = body.tab

    if (tab === 'savings') {
      // Verify VSLA group belongs to tenant
      if (!ctx.isSuperAdmin) {
        const group = await db.vslaGroup.findFirst({
          where: { id: body.vslaGroupId, tenantId: { in: ctx.tenantScope as string[] } },
        })
        if (!group) {
          return NextResponse.json({ error: 'VSLA group not found in your tenant' }, { status: 403 })
        }
      }
      const saving = await db.vslaSaving.create({
        data: { vslaGroupId: body.vslaGroupId, farmerId: body.farmerId, amount: body.amount, sharesBought: Math.floor(body.amount / 1000), transactionRef: `TXN-${Date.now()}`, status: 'COMPLETED' }
      })
      return NextResponse.json(saving, { status: 201 })
    }
    if (tab === 'loans') {
      if (!ctx.isSuperAdmin) {
        const group = await db.vslaGroup.findFirst({
          where: { id: body.vslaGroupId, tenantId: { in: ctx.tenantScope as string[] } },
        })
        if (!group) {
          return NextResponse.json({ error: 'VSLA group not found in your tenant' }, { status: 403 })
        }
      }
      const loan = await db.vslaLoan.create({
        data: { vslaGroupId: body.vslaGroupId, farmerId: body.farmerId, tenantId: ctx.tenantId, amount: body.amount, interestRate: body.interestRate || 10, totalRepayable: body.amount * 1.1, status: 'PENDING', requestedAt: new Date(), dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }
      })
      return NextResponse.json(loan, { status: 201 })
    }
    if (tab === 'meetings') {
      if (!ctx.isSuperAdmin) {
        const group = await db.vslaGroup.findFirst({
          where: { id: body.vslaGroupId, tenantId: { in: ctx.tenantScope as string[] } },
        })
        if (!group) {
          return NextResponse.json({ error: 'VSLA group not found in your tenant' }, { status: 403 })
        }
      }
      const meeting = await db.vslaMeeting.create({
        data: { vslaGroupId: body.vslaGroupId, tenantId: ctx.tenantId, agenda: body.agenda, meetingDate: new Date(body.meetingDate), startTime: body.startTime, endTime: body.endTime, status: 'SCHEDULED' }
      })
      return NextResponse.json(meeting, { status: 201 })
    }
    return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create VSLA record' }, { status: 500 })
  }
}