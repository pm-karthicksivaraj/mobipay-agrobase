import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tf: Record<string, unknown> = ctx.isSuperAdmin ? {} : { tenantId: { in: ctx.tenantScope as string[] } }
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [purchaseStats, revenueStats, partnerStats, shipmentStats] = await Promise.all([
      db.purchase.aggregate({ where: { ...tf as any, createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true }, _count: true }),
      db.purchase.aggregate({ where: { ...tf as any, createdAt: { gte: startOfMonth }, status: 'APPROVED' }, _sum: { totalAmount: true } }),
      db.partner.count({ where: { ...tf as any, isActive: true } }),
      db.shipment.count({ where: { ...tf as any, status: 'IN_TRANSIT' } }),
    ])

    const data = {
      monthlyPurchases: purchaseStats._count || 0,
      monthlyRevenue: revenueStats._sum?.totalAmount ?? 0,
      activePartners: partnerStats,
      activeShipments: shipmentStats,
    }
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}