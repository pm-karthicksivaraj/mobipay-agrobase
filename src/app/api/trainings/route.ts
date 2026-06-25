import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

// TODO: Add tenantId to this model for full multi-tenant isolation
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const [data, total] = await Promise.all([
      db.training.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { attendance: true } } },
        orderBy: { date: 'desc' },
      }),
      db.training.count(),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trainings' }, { status: 500 })
  }
}