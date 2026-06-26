import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { NotificationEngine } from '@/lib/notifications'

/**
 * GET /api/notifications/[id] — Get single notification with deliveries
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'notifications:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const where: Record<string, unknown> = { id }
    if (!ctx.isSuperAdmin) where.tenantId = ctx.tenantId

    const notification = await db.notification.findFirst({
      where,
      include: {
        deliveries: { orderBy: { createdAt: 'desc' } },
        template: { select: { id: true, code: true, name: true } },
      },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    return NextResponse.json({ data: notification })
  } catch (error) {
    console.error('[/api/notifications/[id]] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/notifications/[id] — Mark as read / retry
 * Body: { action: 'mark-read' | 'mark-all-read' | 'retry' }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'notifications:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { action } = body as { action: string }

    switch (action) {
      // Mark single as read
      case 'mark-read': {
        const updated = await NotificationEngine.markRead(id, ctx.userId)
        if (!updated) {
          return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
        }
        return NextResponse.json({ data: { success: true } })
      }

      // Mark all user notifications as read
      case 'mark-all-read': {
        const count = await NotificationEngine.markAllRead(ctx.userId, ctx.tenantId)
        return NextResponse.json({ data: { markedCount: count } })
      }

      // Retry failed notification (re-dispatch via same channel)
      case 'retry': {
        const notif = await db.notification.findFirst({
          where: { id, tenantId: ctx.tenantId },
        })

        if (!notif) {
          return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
        }

        if (notif.status !== 'FAILED') {
          return NextResponse.json(
            { error: 'Only failed notifications can be retried' },
            { status: 400 },
          )
        }

        const newId = await NotificationEngine.dispatch({
          tenantId: notif.tenantId,
          userId: notif.userId ?? undefined,
          recipientPhone: notif.recipientPhone ?? undefined,
          recipientEmail: notif.recipientEmail ?? undefined,
          channel: notif.channel as import('@/lib/notifications/types').NotificationChannel,
          category: notif.category as import('@/lib/notifications/types').NotificationCategory,
          subject: notif.subject ?? undefined,
          body: notif.body,
          data: notif.data ? JSON.parse(notif.data) as Record<string, string> : undefined,
        })

        return NextResponse.json({ data: { newNotificationId: newId } })
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Use mark-read, mark-all-read, or retry.` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('[/api/notifications/[id]] PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}