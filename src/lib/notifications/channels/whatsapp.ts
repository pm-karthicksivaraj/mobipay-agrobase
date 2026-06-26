/**
 * Agrobase V3 — WhatsApp Channel Provider
 *
 * Primary: Africa's Talking WhatsApp channel
 * Fallback: Meta WhatsApp Business API (Cloud API)
 * Environment: AT_USERNAME, AT_API_KEY (or WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID)
 */

import type { NotificationChannelProvider, NotificationPayload } from '../types'

export class WhatsAppProvider implements NotificationChannelProvider {
  async send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Primary: Africa's Talking WhatsApp
      const atUsername = process.env.AT_USERNAME
      const atApiKey = process.env.AT_API_KEY

      if (atUsername && atApiKey) {
        return this.sendViaAfricaTalkingWhatsApp(payload, atUsername, atApiKey)
      }

      // Fallback: Meta WhatsApp Business API (Cloud API)
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

      if (accessToken && phoneNumberId) {
        return this.sendViaMetaWhatsApp(payload, accessToken, phoneNumberId)
      }

      return {
        success: false,
        error: 'WhatsApp not configured. Set AT_USERNAME/AT_API_KEY or WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID.',
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown WhatsApp error'
      return { success: false, error: msg }
    }
  }

  /**
   * Send via Africa's Talking WhatsApp channel.
   * Uses the Africa's Talking REST API to send WhatsApp messages.
   * Docs: https://developers.africastalking.com/docs/whatsapp/overview
   *
   * The WhatsApp channel requires that the sender number is registered
   * with Africa's Talking and approved by Meta.
   */
  private async sendViaAfricaTalkingWhatsApp(
    payload: NotificationPayload,
    username: string,
    apiKey: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!payload.recipientPhone) {
      return { success: false, error: 'recipientPhone is required for WHATSAPP' }
    }

    const phone = this.normalizePhone(payload.recipientPhone)

    // Africa's Talking WhatsApp API endpoint
    const response = await fetch('https://api.africastalking.com/v1/messaging', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${username}:${apiKey}`).toString('base64'),
      },
      body: new URLSearchParams({
        username,
        to: phone,
        message: payload.body,
        channel: 'whatsapp', // Africa's Talking uses 'channel' to route to WhatsApp
      }).toString(),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      return { success: false, error: `Africa's Talking WhatsApp error: ${response.status} ${text}` }
    }

    const data = await response.json() as {
      SMSMessageData?: {
        MessageId?: string
        Recipients?: Array<{ messageId?: string; status?: string }>
      }
    }

    const recipients = data.SMSMessageData?.Recipients
    const messageId = recipients?.[0]?.messageId || data.SMSMessageData?.MessageId

    return {
      success: true,
      messageId: messageId || `wa-at-${Date.now()}`,
    }
  }

  /**
   * Fallback: Send via Meta WhatsApp Business Cloud API.
   * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
   */
  private async sendViaMetaWhatsApp(
    payload: NotificationPayload,
    accessToken: string,
    phoneNumberId: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
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
      const text = await response.text().catch(() => 'Unknown error')
      return { success: false, error: `WhatsApp Cloud API error: ${response.status} ${text}` }
    }

    const data = await response.json() as {
      messages?: Array<{ id?: string }>
    }
    const messageId = data.messages?.[0]?.id

    return {
      success: true,
      messageId: messageId || `wa-meta-${Date.now()}`,
    }
  }

  /**
   * Normalize phone number for WhatsApp delivery.
   * Ensures international format without + prefix.
   */
  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '')
    if (cleaned.startsWith('+')) cleaned = cleaned.slice(1)
    // Remove leading 0 for East African numbers (e.g., 077... → 25677...)
    // Only if the number is longer than 9 digits and starts with 0
    if (cleaned.startsWith('0') && cleaned.length > 9) {
      cleaned = cleaned.slice(1)
    }
    return cleaned
  }
}
