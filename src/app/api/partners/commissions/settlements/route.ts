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
    const [data, total] = await Promise.all([
      db.commissionSettlement.findMany({ where: filter, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      db.commissionSettlement.count({ where: filter }),
    ])
    return NextResponse.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'Settlement id required' }, { status: 400 })
    const filter = buildTenantFilter(ctx)
    const existing = await db.commissionSettlement.findFirst({ where: { id, ...filter } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status !== 'PENDING') return NextResponse.json({ error: 'Settlement already processed' }, { status: 400 })
    const record = await db.commissionSettlement.update({ where: { id }, data: { status: 'APPROVED', paidAt: new Date() } })
    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}