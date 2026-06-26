/**
 * Agrobase V3 — SMS Channel Provider
 *
 * Primary: Africa's Talking API (https://api.africastalking.com/v1/messaging)
 * Fallback: Twilio API
 * Environment: AT_USERNAME, AT_API_KEY (or TWILIO_*)
 */

import type { NotificationChannelProvider, NotificationPayload } from '../types'

const SMS_MAX_LENGTH = 160

export class SmsProvider implements NotificationChannelProvider {
  async send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Primary: Africa's Talking
      const atUsername = process.env.AT_USERNAME
      const atApiKey = process.env.AT_API_KEY

      if (atUsername && atApiKey) {
        return this.sendViaAfricaTalking(payload, atUsername, atApiKey)
      }

      // Fallback: Twilio
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const phoneNumber = process.env.TWILIO_PHONE_NUMBER

      if (accountSid && authToken && phoneNumber) {
        return this.sendViaTwilio(payload, accountSid, authToken, phoneNumber)
      }

      return {
        success: false,
        error: 'No SMS provider configured. Set AT_USERNAME/AT_API_KEY or TWILIO_* env vars.',
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown SMS error'
      return { success: false, error: msg }
    }
  }

  /**
   * Send via Africa's Talking SMS API.
   * Docs: https://developers.africastalking.com/docs/sms/sending
   */
  private async sendViaAfricaTalking(
    payload: NotificationPayload,
    username: string,
    apiKey: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!payload.recipientPhone) {
      return { success: false, error: 'recipientPhone is required for SMS' }
    }

    const messages = this.splitMessage(payload.body)
    let lastMessageId: string | undefined

    for (const message of messages) {
      const response = await fetch('https://api.africastalking.com/v1/messaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          Authorization: 'Basic ' + Buffer.from(`${username}:${apiKey}`).toString('base64'),
        },
        body: new URLSearchParams({
          username,
          to: payload.recipientPhone,
          message,
          // Africa's Talking bulk SMS parameters
          enqueue: 'true', // Queue for delivery to handle throughput
        }).toString(),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error')
        return { success: false, error: `Africa's Talking API error: ${response.status} ${text}` }
      }

      const data = await response.json() as {
        SMSMessageData?: {
          MessageId?: string
          Recipients?: Array<{ messageId?: string; status?: string; number?: string }>
        }
      }

      // Extract the message ID from the response
      const recipients = data.SMSMessageData?.Recipients
      if (recipients && recipients.length > 0) {
        lastMessageId = recipients[0].messageId
      }
      if (data.SMSMessageData?.MessageId) {
        lastMessageId = data.SMSMessageData.MessageId
      }
    }

    return {
      success: true,
      messageId: lastMessageId || `sms-at-${Date.now()}`,
    }
  }

  /**
   * Fallback: Send via Twilio REST API.
   */
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
      const text = await response.text().catch(() => 'Unknown error')
      return { success: false, error: `Twilio API error: ${response.status} ${text}` }
    }

    const data = await response.json() as { sid?: string }
    return { success: true, messageId: data.sid }
  }

  /**
   * Split long messages into 160-char segments with part indicators.
   */
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
