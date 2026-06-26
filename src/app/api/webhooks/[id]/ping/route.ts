import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const filter = buildTenantFilter(ctx)
    const endpoint = await db.webhookEndpoint.findFirst({ where: { id, ...filter, isActive: true } })
    if (!endpoint) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const startTime = Date.now()
    let status: string
    let statusCode: number
    let responseBody: string | null = null
    try {
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'ping', timestamp: new Date().toISOString(), endpointId: id }),
      })
      statusCode = res.status
      status = res.ok ? 'SUCCESS' : 'FAILED'
      responseBody = await res.text()
    } catch {
      statusCode = 0
      status = 'FAILED'
    }
    const duration = Date.now() - startTime
    await db.webhookDelivery.create({
      data: {
        endpointId: id,
        event: 'ping',
        payload: JSON.stringify({ event: 'ping' }),
        statusCode,
        status,
        responseBody: responseBody ?? undefined,
      },
    })
    await db.webhookEndpoint.update({ where: { id }, data: { lastPingAt: new Date() } })
    return NextResponse.json({ data: { status, statusCode, duration } })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}