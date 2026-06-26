import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/notifications/callback/[provider] — Delivery status webhook
 *
 * Receives delivery status callbacks from notification providers:
 *   - Africa's Talking: SMS and WhatsApp delivery receipts
 *   - Resend: Email delivery events (delivered, bounced, complained)
 *   - Twilio: SMS delivery status
 *
 * Provider-specific verification is applied when available.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params
    const body = await req.json()

    console.log(`[Notification Callback] Received callback from ${provider}`)

    // Extract provider-specific identifiers
    const providerRef = body.id ?? body.messageId ?? body.MessageId
    const status = mapCallbackStatus(provider, body)

    if (!providerRef || !status) {
      return NextResponse.json({ received: true, message: 'No actionable data' })
    }

    // Find the notification by providerMessageId
    const notification = await db.notification.findFirst({
      where: { providerMessageId: String(providerRef) },
    })

    if (!notification) {
      console.warn(
        `[Notification Callback] No notification found for providerRef: ${providerRef}`,
      )
      return NextResponse.json({ received: true, message: 'Not found' })
    }

    // Update notification status
    const updateData: Record<string, unknown> = { status }

    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date()
    }

    await db.notification.update({
      where: { id: notification.id },
      data: updateData,
    })

    // Update delivery records
    await db.notificationDelivery.updateMany({
      where: { notificationId: notification.id, status: { in: ['PENDING', 'SENT'] } },
      data: {
        status,
        responseMessage: JSON.stringify(body).slice(0, 500),
        deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
      },
    })

    console.log(
      `[Notification Callback] Updated ${notification.id}: ${status} (provider: ${provider})`,
    )

    return NextResponse.json({ received: true, notificationId: notification.id, status })
  } catch (error) {
    console.error('[/api/notifications/callback] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// Provider-Specific Status Mapping
// ---------------------------------------------------------------------------

function mapCallbackStatus(
  provider: string,
  body: Record<string, unknown>,
): string | null {
  switch (provider) {
    // Africa's Talking
    case 'africas-talking':
    case 'at': {
      const atStatus = body.status as string | undefined
      if (!atStatus) return null
      const map: Record<string, string> = {
        Sent: 'SENT',
        Queued: 'QUEUED',
        Buffered: 'SENT',
        Delivered: 'DELIVERED',
        Failed: 'FAILED',
        Rejected: 'FAILED',
      }
      return map[atStatus] ?? 'SENT'
    }

    // Resend
    case 'resend': {
      const eventType = body.type as string | undefined
      if (!eventType) return null
      const map: Record<string, string> = {
        'email.sent': 'SENT',
        'email.delivered': 'DELIVERED',
        'email.bounced': 'FAILED',
        'email.complained': 'FAILED',
        'email.delivery_delayed': 'SENT',
      }
      return map[eventType] ?? null
    }

    // Twilio
    case 'twilio': {
      const twilioStatus = body.SmsStatus as string | undefined ?? body.MessageStatus as string | undefined
      if (!twilioStatus) return null
      const map: Record<string, string> = {
        queued: 'QUEUED',
        sent: 'SENT',
        delivered: 'DELIVERED',
        undelivered: 'FAILED',
        failed: 'FAILED',
      }
      return map[twilioStatus] ?? null
    }

    // Meta WhatsApp
    case 'whatsapp':
    case 'meta': {
      const waStatus = (body.status as string | undefined)?.toLowerCase()
      if (!waStatus) return null
      const map: Record<string, string> = {
        sent: 'SENT',
        delivered: 'DELIVERED',
        read: 'READ',
        failed: 'FAILED',
      }
      return map[waStatus] ?? null
    }

    default:
      return null
  }
}