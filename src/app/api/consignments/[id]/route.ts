import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const record = await db.consignment.findFirst({ where: { id, ...tf } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: record })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const body = await req.json()
  const existing = await db.consignment.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { id: _id, ...updateData } = body
  const updated = await db.consignment.update({ where: { id }, data: updateData })
  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const existing = await db.consignment.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.consignment.delete({ where: { id } })
  return NextResponse.json({ message: 'Deleted' })
}
