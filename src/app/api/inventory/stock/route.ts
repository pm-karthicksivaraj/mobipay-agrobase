import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const filter = buildTenantFilter(ctx)
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const warehouseId = searchParams.get('warehouseId')
    const where: Record<string, unknown> = { ...filter }
    if (warehouseId) where.warehouseId = warehouseId
    const [data, total] = await Promise.all([
      db.stockItem.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      db.stockItem.count({ where }),
    ])
    return NextResponse.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}