import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tf: Record<string, unknown> = ctx.isSuperAdmin ? {} : { tenantId: { in: ctx.tenantScope as string[] } }
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month'
    const now = new Date()
    const startDate = period === 'year'
      ? new Date(now.getFullYear(), 0, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1)

    const [purchaseCount, purchaseRevenue, activePartners, pendingShipments, stockItems] = await Promise.all([
      db.purchase.aggregate({ where: { ...tf as any, createdAt: { gte: startDate } }, _count: true }),
      db.purchase.aggregate({ where: { ...tf as any, createdAt: { gte: startDate }, status: 'APPROVED' }, _sum: { totalAmount: true } }),
      db.partner.count({ where: { ...tf as any, isActive: true } }),
      db.shipment.count({ where: { ...tf as any, status: 'PENDING' } }),
      db.stockItem.aggregate({ where: { ...tf as any, status: 'AVAILABLE' }, _sum: { quantity: true }, _count: true }),
    ])

    const data = {
      purchaseCount: purchaseCount._count || 0,
      purchaseRevenue: purchaseRevenue._sum?.totalAmount ?? 0,
      activePartners,
      pendingShipments,
      totalStockItems: stockItems._count || 0,
      totalStockQuantity: stockItems._sum?.quantity ?? 0,
    }
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}