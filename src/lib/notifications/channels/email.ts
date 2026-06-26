/**
 * Agrobase V3 — Email Channel Provider
 *
 * Primary: Resend API (https://api.resend.com/emails)
 * Fallback: Generic SMTP relay
 * Environment: RESEND_API_KEY, RESEND_FROM (or SMTP_*)
 */

import type { NotificationChannelProvider, NotificationPayload } from '../types'

export class EmailProvider implements NotificationChannelProvider {
  async send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Primary: Resend API
      const resendApiKey = process.env.RESEND_API_KEY
      const resendFrom = process.env.RESEND_FROM

      if (resendApiKey && resendFrom) {
        return this.sendViaResend(payload, resendApiKey, resendFrom)
      }

      // Fallback: SMTP relay
      const smtpHost = process.env.SMTP_HOST
      const smtpPort = process.env.SMTP_PORT || '587'
      const smtpUser = process.env.SMTP_USER
      const smtpPass = process.env.SMTP_PASS

      if (smtpHost && smtpUser && smtpPass) {
        return this.sendViaSmtp(payload, smtpHost, smtpPort, smtpUser, smtpPass)
      }

      return {
        success: false,
        error: 'No email provider configured. Set RESEND_API_KEY/RESEND_FROM or SMTP_* env vars.',
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown email error'
      return { success: false, error: msg }
    }
  }

  /**
   * Send via Resend API.
   * Docs: https://resend.com/docs/api-reference/emails/send-email
   *
   * Supports HTML emails when payload.data.htmlBody is provided,
   * otherwise sends the body as both text and HTML.
   */
  private async sendViaResend(
    payload: NotificationPayload,
    apiKey: string,
    fromAddress: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!payload.recipientEmail) {
      return { success: false, error: 'recipientEmail is required for EMAIL' }
    }

    const htmlBody = payload.data?.htmlBody || this.buildHtmlBody(payload)

    const emailPayload: Record<string, unknown> = {
      from: fromAddress,
      to: [payload.recipientEmail],
      subject: payload.subject || 'Agrobase Notification',
      html: htmlBody,
      text: payload.body,
    }

    // Support reply-to if provided in data
    if (payload.data?.replyTo) {
      emailPayload.reply_to = payload.data.replyTo
    }

    // Support CC if provided
    if (payload.data?.cc) {
      emailPayload.cc = Array.isArray(payload.data.cc) ? payload.data.cc : [payload.data.cc]
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(emailPayload),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      return { success: false, error: `Resend API error: ${response.status} ${text}` }
    }

    const data = await response.json() as { id?: string }
    return { success: true, messageId: data.id }
  }

  /**
   * Fallback: Send via SMTP relay.
   */
  private async sendViaSmtp(
    payload: NotificationPayload,
    host: string,
    port: string,
    user: string,
    _pass: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!payload.recipientEmail) {
      return { success: false, error: 'recipientEmail is required for EMAIL' }
    }

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const emailPayload = {
      from: user,
      to: payload.recipientEmail,
      subject: payload.subject || 'Agrobase Notification',
      body: payload.body,
      html: payload.data?.htmlBody || this.buildHtmlBody(payload),
      messageId,
    }

    const response = await fetch(`http://${host}:${port}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      return { success: false, error: `SMTP relay error: ${response.status} ${text}` }
    }

    return { success: true, messageId }
  }

  /**
   * Build a basic HTML body from the plain text body.
   * Provides a professional email template with Agrobase branding.
   */
  private buildHtmlBody(payload: NotificationPayload): string {
    const bodyHtml = payload.body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')

    const subject = payload.subject || 'Agrobase Notification'

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #16a34a; padding: 24px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Agrobase</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #18181b; font-size: 18px;">${this.escapeHtml(subject)}</h2>
              <p style="margin: 0; color: #3f3f46; font-size: 14px; line-height: 1.6;">${bodyHtml}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px; border-top: 1px solid #e4e4e7; text-align: center;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">MobiPay AgroSys Limited &middot; Agrobase V3</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
