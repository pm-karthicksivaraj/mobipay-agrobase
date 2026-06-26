import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tf: Record<string, unknown> = ctx.isSuperAdmin ? {} : { tenantId: { in: ctx.tenantScope as string[] } }
    const { searchParams } = new URL(req.url)
    const months = parseInt(searchParams.get('months') || '6')
    const metric = searchParams.get('metric') || 'revenue'

    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)

    const where = {
      ...tf as any,
      createdAt: { gte: startDate },
    }

    const purchases = await db.purchase.findMany({
      where,
      select: { createdAt: true, totalAmount: true, status: true },
      orderBy: { createdAt: 'asc' },
    })

    const grouped = new Map<string, { month: string; count: number; revenue: number }>()
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      grouped.set(key, { month: key, count: 0, revenue: 0 })
    }

    for (const p of purchases) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`
      const entry = grouped.get(key)
      if (entry) {
        entry.count += 1
        entry.revenue += p.totalAmount || 0
      }
    }

    const data = Array.from(grouped.values()).reverse()
    return NextResponse.json({ data, metric })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}