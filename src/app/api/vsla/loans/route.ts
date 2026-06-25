import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    const groupId = req.nextUrl.searchParams.get('groupId') || ''
    const status = req.nextUrl.searchParams.get('status') || ''
    const where: Record<string, unknown> = {}
    if (groupId) where.vslaGroupId = groupId
    if (status) where.status = status
    // Filter through vslaGroup tenantId
    if (!ctx.isSuperAdmin) {
      where.vslaGroup = { tenantId: { in: ctx.tenantScope } }
    }
    const loans = await db.vslaLoan.findMany({
      where,
      include: { farmer: { select: { firstName: true, lastName: true, farmerCode: true, phone: true } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    })
    return NextResponse.json({ loans })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch VSLA loans' }, { status: 500 })
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

    const interestRate = body.interestRate || 10
    const totalRepayable = body.amount + (body.amount * interestRate / 100)
    const loan = await db.vslaLoan.create({
      data: {
        vslaGroupId: body.vslaGroupId, farmerId: body.farmerId,
        amount: body.amount, interestRate, totalRepayable,
        purpose: body.purpose, status: 'PENDING',
        dueDate: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 90 * 86400000)
      }
    })
    return NextResponse.json({ data: loan }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create VSLA loan' }, { status: 500 })
  }
}