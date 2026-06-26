import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { tenantId: ctx.tenantId }
    if (status) where.status = status
    const [data, total] = await Promise.all([
      db.smsBroadcast.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.smsBroadcast.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch SMS broadcasts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const broadcast = await db.smsBroadcast.create({
      data: {
        tenantId: ctx.tenantId,
        message: body.message,
        recipientCount: body.recipientCount ?? 0,
        status: body.status || 'DRAFT',
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        sentAt: body.sentAt ? new Date(body.sentAt) : null,
        createdBy: body.createdBy || null,
      },
    })
    return NextResponse.json(broadcast, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create SMS broadcast' }, { status: 500 })
  }
}