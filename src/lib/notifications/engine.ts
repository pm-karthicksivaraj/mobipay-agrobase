import { db } from '@/lib/db'
import type { NotificationPayload, NotificationChannelProvider } from './types'
import { SmsProvider } from './channels/sms'
import { EmailProvider } from './channels/email'
import { WhatsAppProvider } from './channels/whatsapp'
import { InAppProvider } from './channels/in-app'

class NotificationEngine {
  private channels: Map<string, NotificationChannelProvider> = new Map()

  constructor() {
    this.channels.set('SMS', new SmsProvider())
    this.channels.set('EMAIL', new EmailProvider())
    this.channels.set('WHATSAPP', new WhatsAppProvider())
    this.channels.set('IN_APP', new InAppProvider())
  }

  async dispatch(payload: NotificationPayload): Promise<string | null> {
    try {
      let body = payload.body
      let subject = payload.subject

      if (payload.templateCode) {
        const template = await db.notificationTemplate.findUnique({
          where: { code: payload.templateCode },
        })
        if (template) {
          body = this.renderTemplate(template.body, payload.data || {})
          if (template.subject) {
            subject = this.renderTemplate(template.subject, payload.data || {})
          }
        }
      }

      const notification = await db.notification.create({
        data: {
          tenantId: payload.tenantId,
          templateId: null,
          userId: payload.userId || null,
          recipientPhone: payload.recipientPhone || null,
          recipientEmail: payload.recipientEmail || null,
          channel: payload.channel,
          category: payload.category,
          subject: subject || null,
          body,
          data: payload.data ? JSON.stringify(payload.data) : null,
          status: 'PENDING',
          scheduledAt: payload.scheduledAt || null,
        },
      })

      await db.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: payload.channel,
          provider: payload.channel,
          status: 'PENDING',
        },
      })

      const provider = this.channels.get(payload.channel)
      if (!provider) {
        await db.notification.update({ where: { id: notification.id }, data: { status: 'FAILED', error: 'No provider for channel' } })
        return null
      }

      const result = await provider.send({ ...payload, body, subject: subject || '' })

      const deliveryStatus = result.success ? 'SENT' : 'FAILED'
      await db.notificationDelivery.updateMany({
        where: { notificationId: notification.id },
        data: {
          status: deliveryStatus,
          responseCode: result.messageId || undefined,
          responseMessage: result.error || undefined,
          sentAt: new Date(),
          deliveredAt: result.success ? new Date() : undefined,
        },
      })

      await db.notification.update({
        where: { id: notification.id },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          providerMessageId: result.messageId || null,
          error: result.error || null,
          sentAt: new Date(),
          deliveredAt: result.success ? new Date() : null,
        },
      })

      return notification.id
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown dispatch error'
      throw new Error(`Notification dispatch failed: ${msg}`)
    }
  }

  async dispatchBulk(payloads: NotificationPayload[]): Promise<string[]> {
    const ids: string[] = []
    const BATCH_SIZE = 50

    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const batch = payloads.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(batch.map((p) => this.dispatch(p)))
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) ids.push(r.value)
      }
    }

    return ids
  }

  async createTemplate(data: {
    tenantId?: string
    code: string
    name: string
    subject?: string
    body: string
    channel?: string
    variables?: string
  }) {
    try {
      return await db.notificationTemplate.create({
        data: {
          tenantId: data.tenantId || null,
          name: data.name,
          code: data.code,
          channel: data.channel || 'IN_APP',
          subject: data.subject || null,
          body: data.body,
          variables: data.variables || '[]',
          isActive: true,
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create template: ${msg}`)
    }
  }

  renderTemplate(template: string, data: Record<string, string>): string {
    let rendered = template
    for (const [key, value] of Object.entries(data)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }
    return rendered
  }

  async getHistory(tenantId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit
      const [items, total] = await Promise.all([
        db.notification.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: { deliveries: true, template: true },
        }),
        db.notification.count({ where: { tenantId } }),
      ])

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to get notification history: ${msg}`)
    }
  }
}

export const notificationEngine = new NotificationEngine()