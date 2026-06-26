import type { NotificationChannelProvider, NotificationPayload } from '../types'

export class EmailProvider implements NotificationChannelProvider {
  async send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const host = process.env.SMTP_HOST
      const port = process.env.SMTP_PORT || '587'
      const user = process.env.SMTP_USER
      const pass = process.env.SMTP_PASS

      if (!host || !user || !pass) {
        return { success: false, error: 'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS.' }
      }

      if (!payload.recipientEmail) {
        return { success: false, error: 'recipientEmail is required for EMAIL' }
      }

      const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      const emailPayload = {
        from: user,
        to: payload.recipientEmail,
        subject: payload.subject || 'Notification',
        body: payload.body,
        html: payload.body,
        messageId,
      }

      const response = await fetch(`http://${host}:${port}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload),
      })

      if (!response.ok) {
        const text = await response.text()
        return { success: false, error: `SMTP relay error: ${response.status} ${text}` }
      }

      return { success: true, messageId }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown email error'
      return { success: false, error: msg }
    }
  }
}