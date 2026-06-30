import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const record = await db.survey.findFirst({ where: { id, ...tf }, include: { questions: true, _count: { select: { responses: true } } } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: record })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const body = await req.json()
  const existing = await db.survey.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { id: _id, questions, ...updateData } = body
  const updated = await db.survey.update({ where: { id }, data: updateData })
  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const existing = await db.survey.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.survey.delete({ where: { id } })
  return NextResponse.json({ message: 'Deleted' })
}
