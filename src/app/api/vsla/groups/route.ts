import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET() {
  try {
    const ctx = await getTenantContext()
    const groups = await db.vslaGroup.findMany({
      where: { ...buildTenantFilter(ctx, 'tenantId'), isActive: true },
      include: {
        _count: { select: { members: true, savings: true, loans: true, meetings: true } },
        members: { include: { farmer: { select: { firstName: true, lastName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    })
    const enriched = groups.map(g => {
      return { ...g, totalSavings: 0 }
    })
    return NextResponse.json({ groups: enriched })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch VSLA groups' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    const body = await req.json()
    const group = await db.vslaGroup.create({
      data: {
        tenantId: ctx.tenantId,
        groupId: body.groupId || null,
        name: body.name, shareValue: body.shareValue || 5000,
        loanRate: body.loanRate || 10, maxLoanAmount: body.maxLoanAmount || 200000,
        fines: body.fines || 0, welfareAmount: body.welfareAmount || 0,
        meetingFrequency: body.meetingFrequency || 'Weekly', isActive: true
      }
    })
    return NextResponse.json({ data: group }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create VSLA group' }, { status: 500 })
  }
}