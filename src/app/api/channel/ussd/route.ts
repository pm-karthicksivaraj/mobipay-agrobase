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

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    // TODO: UssdSession model lacks tenantId — add column to schema for full isolation
    const [data, total] = await Promise.all([
      db.ussdSession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.ussdSession.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch USSD sessions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const session = await db.ussdSession.create({
      data: {
        tenantId: ctx.tenantId,
        sessionId: body.sessionId || `USSD_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        phoneNumber: body.phone,
        currentStep: body.initialInput || 'START',
        inputData: body.initialInput ? JSON.stringify({ step1: body.initialInput }) : null,
        status: 'ACTIVE',
      },
    })
    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create USSD session' }, { status: 500 })
  }
}