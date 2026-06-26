import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)

  const where: Record<string, unknown> = { id }
  if (!ctx.isSuperAdmin) {
    const validFarmerIds = await db.farmerProfile.findMany({
      where: { tenantId: { in: ctx.tenantScope } },
      select: { id: true },
    })
    const idList = validFarmerIds.map(f => f.id)
    where.farmerId = { in: idList }
  }

  const record = await db.farmVisit.findFirst({
    where,
    include: { farmer: true },
  })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: record })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const body = await req.json()

  const where: Record<string, unknown> = { id }
  if (!ctx.isSuperAdmin) {
    const validFarmerIds = await db.farmerProfile.findMany({
      where: { tenantId: { in: ctx.tenantScope } },
      select: { id: true },
    })
    const idList = validFarmerIds.map(f => f.id)
    where.farmerId = { in: idList }
  }

  const existing = await db.farmVisit.findFirst({ where })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.farmVisit.update({
    where: { id },
    data: { ...body },
  })
  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)

  const where: Record<string, unknown> = { id }
  if (!ctx.isSuperAdmin) {
    const validFarmerIds = await db.farmerProfile.findMany({
      where: { tenantId: { in: ctx.tenantScope } },
      select: { id: true },
    })
    const idList = validFarmerIds.map(f => f.id)
    where.farmerId = { in: idList }
  }

  const existing = await db.farmVisit.findFirst({ where })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.farmVisit.deleteMany({ where })
  return NextResponse.json({ message: 'Deleted successfully' })
}