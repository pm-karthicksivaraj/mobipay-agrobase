import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { apiKeyEngine } from '@/lib/api-keys/engine'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const result = await apiKeyEngine.listKeys(ctx.tenantId, page, limit)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const result = await apiKeyEngine.createKey({
      tenantId: ctx.tenantId,
      name: body.name,
      userId: body.userId || ctx.userId,
      scopes: body.scopes,
      rateLimitRpm: body.rateLimitRpm,
      rateLimitRpd: body.rateLimitRpd,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    })
    return NextResponse.json({ data: result, message: 'Save this key — it cannot be shown again' }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}