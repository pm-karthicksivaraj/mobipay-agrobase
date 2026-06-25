import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const groupId = searchParams.get('groupId') || ''
    const gender = searchParams.get('gender') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {
      ...buildTenantFilter(ctx, 'tenantId'),
    }
    if (status) where.status = status
    else where.status = 'ACTIVE'
    if (gender) where.gender = gender
    if (search) where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { phone: { contains: search } },
    ]
    if (groupId) where.groupId = groupId

    const [farmers, total] = await Promise.all([
      db.farmerProfile.findMany({ where, skip: (page - 1) * limit, take: limit, include: { group: true }, orderBy: { createdAt: 'desc' } }),
      db.farmerProfile.count({ where })
    ])

    return NextResponse.json({ farmers, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch farmers' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const farmer = await db.farmerProfile.create({
      data: { tenantId: ctx.tenantId, ...body, status: body.status || 'ACTIVE' }
    })
    return NextResponse.json(farmer, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create farmer' }, { status: 500 })
  }
}