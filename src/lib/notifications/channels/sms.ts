import type { NotificationChannelProvider, NotificationPayload } from '../types'

const SMS_MAX_LENGTH = 160

export class SmsProvider implements NotificationChannelProvider {
  async send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const apiKey = process.env.AFRICASTALKING_API_KEY
      const username = process.env.AFRICASTALKING_USERNAME

      if (apiKey && username) {
        return this.sendViaAfricaTalking(payload, username, apiKey)
      }

      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const phoneNumber = process.env.TWILIO_PHONE_NUMBER

      if (accountSid && authToken && phoneNumber) {
        return this.sendViaTwilio(payload, accountSid, authToken, phoneNumber)
      }

      return { success: false, error: 'No SMS provider configured. Set AFRICASTALKING or TWILIO env vars.' }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown SMS error'
      return { success: false, error: msg }
    }
  }

  private async sendViaAfricaTalking(
    payload: NotificationPayload,
    username: string,
    apiKey: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!payload.recipientPhone) {
      return { success: false, error: 'recipientPhone is required for SMS' }
    }

    const messages = this.splitMessage(payload.body)

    for (const message of messages) {
      const response = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(`${username}:${apiKey}`).toString('base64'),
        },
        body: JSON.stringify({
          username,
          to: [payload.recipientPhone],
          message,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        return { success: false, error: `Africa's Talking API error: ${response.status} ${text}` }
      }
    }

    return { success: true, messageId: `sms-${Date.now()}` }
  }

  private async sendViaTwilio(
    payload: NotificationPayload,
    accountSid: string,
    authToken: string,
    fromNumber: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!payload.recipientPhone) {
      return { success: false, error: 'recipientPhone is required for SMS' }
    }

    const encoded = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${encoded}`,
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: payload.recipientPhone,
        Body: payload.body,
      }).toString(),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `Twilio API error: ${response.status} ${text}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.sid }
  }

  private splitMessage(text: string): string[] {
    if (text.length <= SMS_MAX_LENGTH) return [text]
    const parts: string[] = []
    let remaining = text
    let partNum = 1
    const total = Math.ceil(text.length / SMS_MAX_LENGTH)
    while (remaining.length > 0) {
      const prefix = `(${partNum}/${total}) `
      const available = SMS_MAX_LENGTH - prefix.length
      const chunk = remaining.slice(0, available)
      parts.push(`${prefix}${chunk}`)
      remaining = remaining.slice(available)
      partNum++
    }
    return parts
  }
}