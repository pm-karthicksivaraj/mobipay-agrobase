import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const groups = await db.vslaGroup.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { members: true, savings: true, loans: true, meetings: true } },
      members: { include: { farmer: { select: { firstName: true, lastName: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  })
  const enriched = groups.map(g => {
    const totalSavings = 0 // Will sum from savings
    return { ...g, totalSavings: 0 }
  })
  return NextResponse.json({ groups: enriched })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const group = await db.vslaGroup.create({
    data: {
      tenantId: body.tenantId || 'default',
      groupId: body.groupId || null,
      name: body.name, shareValue: body.shareValue || 5000,
      loanRate: body.loanRate || 10, maxLoanAmount: body.maxLoanAmount || 200000,
      fines: body.fines || 0, welfareAmount: body.welfareAmount || 0,
      meetingFrequency: body.meetingFrequency || 'Weekly', isActive: true
    }
  })
  return NextResponse.json({ data: group }, { status: 201 })
}