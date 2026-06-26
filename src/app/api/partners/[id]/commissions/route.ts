import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id: partnerId } = await params
    const filter = buildTenantFilter(ctx)
    const partner = await db.partner.findFirst({ where: { id: partnerId, ...filter } })
    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    const data = await db.commissionRule.findMany({ where: { partnerId }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id: partnerId } = await params
    const filter = buildTenantFilter(ctx)
    const partner = await db.partner.findFirst({ where: { id: partnerId, ...filter } })
    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    const body = await req.json()
    const record = await db.commissionRule.create({ data: { tenantId: ctx.tenantId, partnerId, ...body } })
    return NextResponse.json({ data: record }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}