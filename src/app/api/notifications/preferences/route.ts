import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { NotificationEngine } from '@/lib/notifications'

/**
 * GET /api/notifications/preferences — Get current user's notification preferences
 */
export async function GET() {
  try {
    const ctx = await getTenantContext()

    const prefs = await NotificationEngine.getUserPreferences(
      ctx.userId,
      ctx.tenantId,
    )

    return NextResponse.json({ data: prefs })
  } catch (error) {
    console.error('[/api/notifications/preferences] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/notifications/preferences — Update current user's notification preferences
 * Body: { channels: { SMS: true, EMAIL: true, WHATSAPP: false, IN_APP: true } }
 */
export async function PUT(req: NextRequest) {
  try {
    const ctx = await getTenantContext()

    const body = await req.json()
    const { channels } = body as {
      channels: Record<string, boolean>
    }

    if (!channels || typeof channels !== 'object') {
      return NextResponse.json(
        { error: 'channels object is required' },
        { status: 400 },
      )
    }

    // Validate channel names
    const validChannels = ['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH']
    for (const ch of Object.keys(channels)) {
      if (!validChannels.includes(ch)) {
        return NextResponse.json(
          { error: `Invalid channel: ${ch}` },
          { status: 400 },
        )
      }
    }

    await NotificationEngine.updateUserPreferences(
      ctx.userId,
      ctx.tenantId,
      channels,
    )

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('[/api/notifications/preferences] PUT error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}