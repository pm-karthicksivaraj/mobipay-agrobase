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
      where.vslaGroup = { tenantId: { in: ctx.tenantScope as string[] } }
    }
    const savings = await db.vslaSaving.findMany({
      where,
      include: { farmer: { select: { firstName: true, lastName: true, farmerCode: true } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    })
    const total = await db.vslaSaving.aggregate({ where, _sum: { amount: true } })
    return NextResponse.json({ savings, totalAmount: total._sum.amount || 0 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch savings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    const body = await req.json()

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
      data: {
        vslaGroupId: body.vslaGroupId, farmerId: body.farmerId,
        amount: body.amount, sharesBought: Math.floor(body.amount / 5000) || 1,
        savedOnBehalfOf: body.savedOnBehalfOf || null,
        transactionRef: `SAV-${Date.now()}`, status: 'COMPLETED'
      }
    })
    return NextResponse.json({ data: saving }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create saving' }, { status: 500 })
  }
}