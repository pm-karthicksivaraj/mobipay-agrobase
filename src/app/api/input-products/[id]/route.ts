import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any

  const record = await db.inputProduct.findFirst({
    where: { id, ...tf },
    include: { dealer: true },
  })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: record })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const body = await req.json()

  const existing = await db.inputProduct.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.inputProduct.update({
    where: { id },
    data: { ...body, updatedAt: new Date() },
  })
  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any

  const existing = await db.inputProduct.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.inputProduct.update({
    where: { id },
    data: { isActive: false, updatedAt: new Date() },
  })
  return NextResponse.json({ message: 'Deleted successfully' })
}