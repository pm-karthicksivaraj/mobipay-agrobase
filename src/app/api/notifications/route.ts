import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { NotificationEngine } from '@/lib/notifications'
import type { NotificationChannel, NotificationCategory } from '@/lib/notifications/types'

/**
 * GET /api/notifications — List notifications + stats
 * Query params: userId, channel, category, status, startDate, endDate, page, limit
 *                ?action=stats for delivery statistics
 *                ?action=unread-count for current user's unread count
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'notifications:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    const tenantId = ctx.isSuperAdmin
      ? (searchParams.get('tenantId') ?? ctx.tenantId)
      : ctx.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    // Unread count for current user
    if (action === 'unread-count') {
      const count = await NotificationEngine.getUnreadCount(ctx.userId, tenantId)
      return NextResponse.json({ data: { count } })
    }

    // Delivery stats
    if (action === 'stats') {
      const stats = await NotificationEngine.getStats(tenantId)
      return NextResponse.json({ data: stats })
    }

    // List with filters
    const result = await NotificationEngine.listNotifications({
      tenantId,
      userId: searchParams.get('userId') ?? undefined,
      channel: searchParams.get('channel') as NotificationChannel | undefined,
      category: searchParams.get('category') as NotificationCategory | undefined,
      status: searchParams.get('status') as import('@/lib/notifications/types').NotificationStatus | undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[/api/notifications] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/notifications — Send a notification
 *
 * Body: {
 *   channel: 'SMS' | 'EMAIL' | 'WHATSAPP' | 'IN_APP',
 *   recipientPhone?: string,
 *   recipientEmail?: string,
 *   category: 'TRANSACTIONAL' | 'MARKETING' | 'ALERT' | 'SYSTEM',
 *   subject?: string,
 *   body: string,
 *   templateCode?: string,
 *   data?: Record<string, string>,
 *   scheduledAt?: string,
 *
 *   // For multi-channel:
 *   channels?: NotificationChannel[],
 *
 *   // For user-targeted:
 *   userId?: string,
 *   forceChannels?: NotificationChannel[],
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'notifications:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    // Multi-channel dispatch
    if (body.channels && Array.isArray(body.channels)) {
      const results = await NotificationEngine.dispatchMultiChannel({
        tenantId: ctx.tenantId,
        userId: body.userId,
        recipientPhone: body.recipientPhone,
        recipientEmail: body.recipientEmail,
        channels: body.channels,
        category: body.category,
        templateCode: body.templateCode,
        subject: body.subject,
        body: body.body,
        data: body.data,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      })
      return NextResponse.json({ data: results }, { status: 201 })
    }

    // User-targeted dispatch
    if (body.userId) {
      const results = await NotificationEngine.dispatchToUser({
        tenantId: ctx.tenantId,
        userId: body.userId,
        category: body.category,
        templateCode: body.templateCode,
        subject: body.subject,
        body: body.body,
        data: body.data,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        forceChannels: body.forceChannels,
      })
      return NextResponse.json({ data: results }, { status: 201 })
    }

    // Single-channel dispatch
    if (!body.channel || !body.body) {
      return NextResponse.json(
        { error: 'channel and body are required' },
        { status: 400 },
      )
    }

    const notificationId = await NotificationEngine.dispatch({
      tenantId: ctx.tenantId,
      recipientPhone: body.recipientPhone,
      recipientEmail: body.recipientEmail,
      channel: body.channel,
      category: body.category,
      templateCode: body.templateCode,
      subject: body.subject,
      body: body.body,
      data: body.data,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    })

    return NextResponse.json(
      { data: { notificationId } },
      { status: notificationId ? 201 : 500 },
    )
  } catch (error) {
    console.error('[/api/notifications] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}