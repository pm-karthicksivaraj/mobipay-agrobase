import type { NotificationChannelProvider, NotificationPayload } from '../types'

export class WhatsAppProvider implements NotificationChannelProvider {
  async send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

      if (!accessToken || !phoneNumberId) {
        return { success: false, error: 'WhatsApp not configured. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID.' }
      }

      if (!payload.recipientPhone) {
        return { success: false, error: 'recipientPhone is required for WHATSAPP' }
      }

      const phone = this.normalizePhone(payload.recipientPhone)

      const body: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: payload.body },
      }

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        },
      )

      if (!response.ok) {
        const text = await response.text()
        return { success: false, error: `WhatsApp API error: ${response.status} ${text}` }
      }

      const data = await response.json()
      const messageId = data.messages?.[0]?.id

      return { success: true, messageId }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown WhatsApp error'
      return { success: false, error: msg }
    }
  }

  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '')
    if (cleaned.startsWith('+')) cleaned = cleaned.slice(1)
    if (cleaned.startsWith('0') && cleaned.length > 9) cleaned = cleaned.slice(1)
    return cleaned
  }
}