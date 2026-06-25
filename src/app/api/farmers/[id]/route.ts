import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(_req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any

  const farmer = await db.farmerProfile.findFirst({
    where: { id, ...tf },
    include: {
      group: true,
      village: { include: { parish: { include: { subCounty: { include: { constituency: { include: { district: { include: { subRegion: { include: { region: true } } } } } } } } } } } },
      creditScores: { orderBy: { scoreDate: 'desc' }, take: 1 },
      savings: { take: 10, orderBy: { createdAt: 'desc' } },
      vslaLoans: { take: 10, orderBy: { createdAt: 'desc' } },
      farms: { include: { cultivations: true } },
      trainings: { include: { training: true } }
    }
  })
  if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 })
  return NextResponse.json({ data: farmer })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const body = await req.json()

  const existing = await db.farmerProfile.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { firstName, lastName, gender, phone, villageId, status } = body
  const updated = await db.farmerProfile.update({
    where: { id },
    data: { ...(firstName !== undefined && { firstName }), ...(lastName !== undefined && { lastName }), ...(gender !== undefined && { gender }), ...(phone !== undefined && { phone }), ...(villageId !== undefined && { villageId }), ...(status !== undefined && { status }), updatedAt: new Date() },
  })
  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any

  const existing = await db.farmerProfile.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.farmerProfile.update({
    where: { id },
    data: { status: 'INACTIVE', updatedAt: new Date() },
  })
  return NextResponse.json({ message: 'Deleted successfully' })
}