import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const { reportType, dateFrom, dateTo } = body
    const tf: Record<string, unknown> = ctx.isSuperAdmin ? {} : { tenantId: { in: ctx.tenantScope as string[] } }
    const dateFilter: Record<string, unknown> = {}
    if (dateFrom) dateFilter.gte = new Date(dateFrom)
    if (dateTo) dateFilter.lte = new Date(dateTo)

    let data: unknown = {}
    if (reportType === 'purchases') {
      const [purchases, summary] = await Promise.all([
        db.purchase.findMany({ where: { ...tf as any, createdAt: dateFilter }, orderBy: { createdAt: 'desc' }, take: 1000 }),
        db.purchase.aggregate({ where: { ...tf as any, createdAt: dateFilter }, _sum: { totalAmount: true }, _count: true }),
      ])
      data = { purchases, summary: { total: summary._count, revenue: summary._sum?.totalAmount ?? 0 } }
    } else if (reportType === 'inventory') {
      const [items, summary] = await Promise.all([
        db.stockItem.findMany({ where: { ...tf as any }, take: 1000 }),
        db.stockItem.aggregate({ where: { ...tf as any, status: 'AVAILABLE' }, _sum: { quantity: true }, _count: true }),
      ])
      data = { items, summary: { total: summary._count, quantity: summary._sum?.quantity ?? 0 } }
    } else if (reportType === 'partners') {
      const partners = await db.partner.findMany({ where: { ...tf as any }, take: 1000 })
      data = { partners, total: partners.length }
    } else if (reportType === 'contracts') {
      const [contracts, summary] = await Promise.all([
        db.contract.findMany({ where: { ...tf as any, createdAt: dateFilter }, orderBy: { createdAt: 'desc' }, take: 1000 }),
        db.contract.aggregate({ where: { ...tf as any, createdAt: dateFilter }, _sum: { totalValue: true }, _count: true }),
      ])
      data = { contracts, summary: { total: summary._count, value: summary._sum?.totalValue ?? 0 } }
    } else {
      return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
    }
    return NextResponse.json({ data, generatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}