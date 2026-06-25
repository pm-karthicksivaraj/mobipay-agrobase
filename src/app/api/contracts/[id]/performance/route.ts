import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const filter = buildTenantFilter(ctx)
    const contract = await db.contract.findFirst({
      where: { id, ...filter },
      include: {
        items: true,
        milestones: { orderBy: { dueDate: 'asc' } },
      },
    })
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const totalItems = contract.items.length
    const deliveredItems = contract.items.reduce((sum, i) => sum + (i.delivered || 0), 0)
    const totalQuantity = contract.items.reduce((sum, i) => sum + (i.quantity || 0), 0)
    const completedMilestones = contract.milestones.filter((m) => m.status === 'COMPLETED').length
    const performance = {
      contract,
      metrics: {
        totalItems,
        deliveredItems,
        deliveryRate: totalQuantity > 0 ? Math.round((deliveredItems / totalQuantity) * 100) : 0,
        totalMilestones: contract.milestones.length,
        completedMilestones,
        milestoneRate: contract.milestones.length > 0 ? Math.round((completedMilestones / contract.milestones.length) * 100) : 0,
      },
    }
    return NextResponse.json({ data: performance })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}