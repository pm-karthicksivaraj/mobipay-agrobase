import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const body = await req.json()
  const existing = await db.vslaGroup.findFirst({ where: { id, tenantId: { in: ctx.tenantScope as string[] } } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await db.vslaGroup.update({ where: { id }, data: { ...body } })
  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const existing = await db.vslaGroup.findFirst({ where: { id, tenantId: { in: ctx.tenantScope as string[] } } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.vslaGroup.delete({ where: { id } })
  return NextResponse.json({ message: 'Deleted' })
}
