import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const body = await req.json()
  const existing = await db.vslaSaving.findFirst({ where: { id, vslaGroup: { ...tf } } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await db.vslaSaving.update({ where: { id }, data: { ...body } })
  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const existing = await db.vslaSaving.findFirst({ where: { id, vslaGroup: { ...tf } } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.vslaSaving.delete({ where: { id } })
  return NextResponse.json({ message: 'Deleted' })
}
