import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'

/**
 * GET /api/notifications/templates — List notification templates
 * Query params: ?system=true to include system (tenantId=null) templates
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'notifications:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeSystem = searchParams.get('system') === 'true'

    const where: Record<string, unknown> = {}
    if (includeSystem && ctx.isSuperAdmin) {
      // Show all
    } else if (ctx.isSuperAdmin) {
      // Show system + user's tenant
      where.OR = [
        { tenantId: ctx.tenantId },
        { tenantId: null },
      ]
    } else {
      where.OR = [
        { tenantId: ctx.tenantId },
        { tenantId: null },
      ]
    }

    const [data, total] = await Promise.all([
      db.notificationTemplate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.notificationTemplate.count({ where }),
    ])

    return NextResponse.json({
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[/api/notifications/templates] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/notifications/templates — Create a template
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'notifications:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { code, name, subject, body: templateBody, channel, variables } = body as {
      code: string
      name: string
      subject?: string
      body: string
      channel?: string
      variables?: string
    }

    if (!code || !name || !templateBody) {
      return NextResponse.json(
        { error: 'code, name, and body are required' },
        { status: 400 },
      )
    }

    const template = await db.notificationTemplate.create({
      data: {
        tenantId: body.isSystem ? null : ctx.tenantId,
        code,
        name,
        subject: subject ?? null,
        body: templateBody,
        channel: channel ?? 'IN_APP',
        variables: variables ?? '[]',
        isActive: true,
      },
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    console.error('[/api/notifications/templates] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}