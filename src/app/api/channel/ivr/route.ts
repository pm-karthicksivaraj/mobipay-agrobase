import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [data, total] = await Promise.all([
      db.ivrCampaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.ivrCampaign.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch IVR campaigns' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const campaign = await db.ivrCampaign.create({
      data: {
        name: body.name,
        description: body.description || null,
        script: typeof body.script === 'string' ? body.script : JSON.stringify(body.script),
        targetGroup: body.targetGroup || null,
        status: body.status || 'DRAFT',
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        totalCalls: body.totalCalls ?? 0,
        completedCalls: body.completedCalls ?? 0,
      },
    })
    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create IVR campaign' }, { status: 500 })
  }
}