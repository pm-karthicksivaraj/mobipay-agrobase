import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { registerDeviceToken } from '@/lib/firebase/server'

/**
 * POST /api/notifications/fcm/register
 *   Register a device token for push notifications.
 *   Body: { token, platform: 'web' | 'android' | 'ios' }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { token, platform } = body

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    await registerDeviceToken(ctx.userId, token, platform || 'web')

    return NextResponse.json({ success: true, message: 'Device registered' })
  } catch (error: any) {
    console.error('FCM register error:', error)
    return NextResponse.json({ error: 'Failed to register device' }, { status: 500 })
  }
}
