/**
 * Agrobase V3 — Notification Engine
 * MobiPay AgroSys Limited
 *
 * Static-class notification engine with:
 *   - Multi-channel dispatch (SMS/Email/WhatsApp/InApp)
 *   - User preference-aware routing
 *   - Template rendering with {{variable}} substitution
 *   - Retry logic for failed deliveries (up to 3 attempts)
 *   - Scheduled notification processing (cron)
 *   - In-app read/unread tracking
 *   - Delivery statistics
 *
 * Channel providers are registered statically and resolved by channel name.
 */

import { db } from '@/lib/db'
import { SmsProvider } from './channels/sms'
import { EmailProvider } from './channels/email'
import { WhatsAppProvider } from './channels/whatsapp'
import { InAppProvider } from './channels/in-app'
import type {
  NotificationPayload,
  NotificationChannel,
  NotificationChannelProvider,
  NotificationSendResult,
  NotificationCategory,
  MultiChannelRequest,
  UserNotificationRequest,
  NotificationListFilter,
  NotificationStats,
  UserPreferences,
} from './types'
import { CATEGORY_DEFAULT_CHANNELS } from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [5000, 15000, 60000] // 5s, 15s, 60s
const DEFAULT_PREFERENCES: Record<NotificationChannel, boolean> = {
  SMS: true,
  EMAIL: true,
  WHATSAPP: false,
  IN_APP: true,
  PUSH: false,
} as const

// ---------------------------------------------------------------------------
// NotificationEngine Class
// ---------------------------------------------------------------------------

export class NotificationEngine {
  /** Static channel provider registry */
  private static providers = new Map<NotificationChannel, NotificationChannelProvider>()

  // -----------------------------------------------------------------------
  // Provider Registration (called once at startup)
  // -----------------------------------------------------------------------

  /**
   * Register all built-in channel providers.
   * Call this once during app initialization.
   */
  static registerProviders(): void {
    if (NotificationEngine.providers.size > 0) return // already registered

    NotificationEngine.providers.set('SMS', new SmsProvider())
    NotificationEngine.providers.set('EMAIL', new EmailProvider())
    NotificationEngine.providers.set('WHATSAPP', new WhatsAppProvider())
    NotificationEngine.providers.set('IN_APP', new InAppProvider())

    console.log('[NotificationEngine] Registered 4 channel providers: SMS, EMAIL, WHATSAPP, IN_APP')
  }

  /**
   * Register a custom channel provider.
   */
  static registerProvider(channel: NotificationChannel, provider: NotificationChannelProvider): void {
    NotificationEngine.providers.set(channel, provider)
    console.log(`[NotificationEngine] Registered custom provider: ${channel}`)
  }

  // -----------------------------------------------------------------------
  // Single-Channel Dispatch
  // -----------------------------------------------------------------------

  /**
   * Dispatch a single notification via one channel.
   * Creates Notification + NotificationDelivery records, then sends via provider.
   */
  static async dispatch(payload: NotificationPayload): Promise<string | null> {
    // Ensure providers are registered
    NotificationEngine.registerProviders()

    let body = payload.body
    let subject = payload.subject

    // Template rendering
    if (payload.templateCode) {
      const rendered = await NotificationEngine.renderTemplate(
        payload.templateCode,
        payload.data ?? {},
      )
      if (rendered) {
        body = rendered.body
        subject = rendered.subject ?? subject
      }
    }

    // Create Notification record
    const notification = await db.notification.create({
      data: {
        tenantId: payload.tenantId,
        userId: payload.userId ?? null,
        recipientPhone: payload.recipientPhone ?? null,
        recipientEmail: payload.recipientEmail ?? null,
        channel: payload.channel,
        category: payload.category,
        subject: subject ?? null,
        body,
        data: payload.data ? JSON.stringify(payload.data) : null,
        status: payload.scheduledAt ? 'PENDING' : 'PENDING',
        scheduledAt: payload.scheduledAt ?? null,
      },
    })

    // If scheduled, don't send now
    if (payload.scheduledAt && payload.scheduledAt > new Date()) {
      console.log(
        `[NotificationEngine] Scheduled notification ${notification.id} for ${payload.scheduledAt.toISOString()}`,
      )
      return notification.id
    }

    // Send via channel provider
    const result = await NotificationEngine.sendToProvider(notification, payload)

    return notification.id
  }

  // -----------------------------------------------------------------------
  // Multi-Channel Dispatch
  // -----------------------------------------------------------------------

  /**
   * Dispatch a notification via multiple channels simultaneously.
   * Each channel gets its own Notification + NotificationDelivery record.
   */
  static async dispatchMultiChannel(
    request: MultiChannelRequest,
  ): Promise<Record<NotificationChannel, string | null>> {
    const results: Record<string, string | null> = {}

    const dispatches = request.channels.map(async (channel) => {
      try {
        const id = await NotificationEngine.dispatch({
          tenantId: request.tenantId,
          userId: request.userId,
          recipientPhone: request.recipientPhone,
          recipientEmail: request.recipientEmail,
          channel,
          category: request.category,
          templateCode: request.templateCode,
          subject: request.subject,
          body: request.body,
          data: request.data,
          scheduledAt: request.scheduledAt,
        })
        results[channel] = id
      } catch (error) {
        console.error(
          `[NotificationEngine] Multi-channel dispatch failed for ${channel}:`,
          error instanceof Error ? error.message : error,
        )
        results[channel] = null
      }
    })

    await Promise.allSettled(dispatches)
    return results as Record<NotificationChannel, string | null>
  }

  // -----------------------------------------------------------------------
  // User-Targeted Dispatch (preference-aware)
  // -----------------------------------------------------------------------

  /**
   * Dispatch to a user, automatically resolving channels from:
   *   1. forceChannels (if provided, overrides preferences)
   *   2. User's NotificationPreference records
   *   3. Category default channels
   *
   * Also auto-fills recipientPhone/recipientEmail from User record.
   */
  static async dispatchToUser(
    request: UserNotificationRequest,
  ): Promise<Record<NotificationChannel, string | null>> {
    // Look up user
    const user = await db.user.findUnique({
      where: { id: request.userId },
      select: { id: true, phone: true, email: true, tenantId: true },
    })

    if (!user) {
      throw new Error(`User not found: ${request.userId}`)
    }

    // Resolve channels
    let channels = request.forceChannels

    if (!channels || channels.length === 0) {
      channels = await NotificationEngine.resolveUserChannels(
        request.tenantId,
        request.userId,
        request.category,
      )
    }

    if (channels.length === 0) {
      console.warn(
        `[NotificationEngine] No enabled channels for user ${request.userId}, category ${request.category}`,
      )
      return {} as Record<NotificationChannel, string | null>
    }

    // Dispatch via resolved channels
    return NotificationEngine.dispatchMultiChannel({
      tenantId: request.tenantId,
      userId: request.userId,
      recipientPhone: user.phone,
      recipientEmail: user.email ?? undefined,
      channels,
      category: request.category,
      templateCode: request.templateCode,
      subject: request.subject,
      body: request.body,
      data: request.data,
      scheduledAt: request.scheduledAt,
    })
  }

  // -----------------------------------------------------------------------
  // Retry Failed Notifications
  // -----------------------------------------------------------------------

  /**
   * Retry all failed notification deliveries that haven't exceeded MAX_RETRIES.
   * Called by a scheduled cron job.
   * Returns count of retried notifications.
   */
  static async retryFailed(): Promise<number> {
    NotificationEngine.registerProviders()

    const failedDeliveries = await db.notificationDelivery.findMany({
      where: {
        status: 'FAILED',
        attempt: { lt: MAX_RETRIES },
      },
      include: {
        notification: true,
      },
      take: 100, // batch size per cron run
    })

    if (failedDeliveries.length === 0) return 0

    let retried = 0

    for (const delivery of failedDeliveries) {
      const notif = delivery.notification
      const channel = delivery.channel as NotificationChannel

      // Rate-limit delay between retries
      const delay = RETRY_DELAYS_MS[Math.min(delivery.attempt, RETRY_DELAYS_MS.length - 1)]
      const elapsed = Date.now() - delivery.createdAt.getTime()
      if (elapsed < delay) {
        await new Promise((resolve) => setTimeout(resolve, delay - elapsed))
      }

      const provider = NotificationEngine.providers.get(channel)
      if (!provider) continue

      const result = await provider.send({
        tenantId: notif.tenantId,
        userId: notif.userId ?? undefined,
        recipientPhone: notif.recipientPhone ?? undefined,
        recipientEmail: notif.recipientEmail ?? undefined,
        channel,
        category: notif.category as NotificationCategory,
        subject: notif.subject ?? undefined,
        body: notif.body,
        data: notif.data ? JSON.parse(notif.data) as Record<string, string> : undefined,
      })

      await db.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          attempt: delivery.attempt + 1,
          status: result.success ? 'SENT' : 'FAILED',
          responseCode: result.messageId,
          responseMessage: result.error,
          sentAt: result.success ? new Date() : delivery.sentAt,
          deliveredAt: result.success ? new Date() : delivery.deliveredAt,
        },
      })

      // Update parent notification status
      if (result.success) {
        await db.notification.update({
          where: { id: notif.id },
          data: {
            status: 'SENT',
            providerMessageId: result.messageId ?? notif.providerMessageId,
            error: null,
            sentAt: new Date(),
            deliveredAt: new Date(),
          },
        })
      }

      retried++
    }

    console.log(`[NotificationEngine] Retried ${retried} failed notification(s)`)
    return retried
  }

  // -----------------------------------------------------------------------
  // Process Scheduled Notifications
  // -----------------------------------------------------------------------

  /**
   * Find and dispatch all notifications whose scheduledAt <= now.
   * Called by a scheduled cron job.
   */
  static async processScheduled(): Promise<number> {
    NotificationEngine.registerProviders()

    const now = new Date()

    const scheduled = await db.notification.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: now },
      },
      take: 100,
    })

    if (scheduled.length === 0) return 0

    let processed = 0

    for (const notif of scheduled) {
      try {
        await NotificationEngine.sendToProvider(notif, {
          tenantId: notif.tenantId,
          userId: notif.userId ?? undefined,
          recipientPhone: notif.recipientPhone ?? undefined,
          recipientEmail: notif.recipientEmail ?? undefined,
          channel: notif.channel as NotificationChannel,
          category: notif.category as NotificationCategory,
          subject: notif.subject ?? undefined,
          body: notif.body,
          data: notif.data ? JSON.parse(notif.data) as Record<string, string> : undefined,
        })
        processed++
      } catch (error) {
        console.error(
          `[NotificationEngine] Scheduled dispatch failed for ${notif.id}:`,
          error instanceof Error ? error.message : error,
        )
      }

      // Small delay between dispatches
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(
      `[NotificationEngine] Processed ${processed}/${scheduled.length} scheduled notification(s)`,
    )

    return processed
  }

  // -----------------------------------------------------------------------
  // In-App: Mark as Read
  // -----------------------------------------------------------------------

  /**
   * Mark a single notification as read.
   */
  static async markRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { status: 'READ' },
    })
    return result.count > 0
  }

  /**
   * Mark all notifications for a user as read.
   */
  static async markAllRead(userId: string, tenantId: string): Promise<number> {
    const result = await db.notification.updateMany({
      where: {
        userId,
        tenantId,
        status: { in: ['PENDING', 'SENT', 'DELIVERED'] },
      },
      data: { status: 'READ' },
    })
    return result.count
  }

  /**
   * Get unread notification count for a user.
   */
  static async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    return db.notification.count({
      where: {
        userId,
        tenantId,
        status: { in: ['PENDING', 'SENT', 'DELIVERED'] },
      },
    })
  }

  // -----------------------------------------------------------------------
  // User Preferences
  // -----------------------------------------------------------------------

  /**
   * Get a user's notification channel preferences.
   * Returns defaults for channels with no explicit preference.
   */
  static async getUserPreferences(
    userId: string,
    tenantId: string,
  ): Promise<UserPreferences> {
    const prefs = await db.notificationPreference.findMany({
      where: { userId, tenantId },
    })

    const channels: Record<string, boolean> = { ...DEFAULT_PREFERENCES }

    for (const pref of prefs) {
      channels[pref.channel] = pref.enabled
    }

    return {
      userId,
      tenantId,
      channels: channels as Record<NotificationChannel, boolean>,
    }
  }

  /**
   * Update a user's notification preferences.
   * Upserts all channel preferences in a transaction.
   */
  static async updateUserPreferences(
    userId: string,
    tenantId: string,
    channels: Record<string, boolean>,
  ): Promise<void> {
    const ops = Object.entries(channels).map(([channel, enabled]) =>
      db.notificationPreference.upsert({
        where: {
          tenantId_userId_channel: { tenantId, userId, channel },
        },
        create: { tenantId, userId, channel, enabled },
        update: { enabled },
      }),
    )

    await db.$transaction(ops)
    console.log(
      `[NotificationEngine] Updated preferences for user ${userId}: ${Object.entries(channels).filter(([, v]) => v).map(([k]) => k).join(', ')}`,
    )
  }

  /**
   * Resolve which channels to use for a user based on preferences + category defaults.
   */
  static async resolveUserChannels(
    tenantId: string,
    userId: string,
    category: NotificationCategory,
  ): Promise<NotificationChannel[]> {
    const prefs = await NotificationEngine.getUserPreferences(userId, tenantId)
    const categoryDefaults = CATEGORY_DEFAULT_CHANNELS[category] ?? ['IN_APP']

    return categoryDefaults.filter((ch) => prefs.channels[ch] !== false)
  }

  // -----------------------------------------------------------------------
  // Templates
  // -----------------------------------------------------------------------

  /**
   * Create a notification template.
   */
  static async createTemplate(data: {
    tenantId?: string
    code: string
    name: string
    subject?: string
    body: string
    channel?: string
    variables?: string
  }) {
    return db.notificationTemplate.create({
      data: {
        tenantId: data.tenantId ?? null,
        name: data.name,
        code: data.code,
        channel: data.channel ?? 'IN_APP',
        subject: data.subject ?? null,
        body: data.body,
        variables: data.variables ?? '[]',
        isActive: true,
      },
    })
  }

  /**
   * Update a notification template.
   */
  static async updateTemplate(
    templateId: string,
    data: {
      name?: string
      subject?: string
      body?: string
      channel?: string
      variables?: string
      isActive?: boolean
    },
  ) {
    return db.notificationTemplate.update({
      where: { id: templateId },
      data,
    })
  }

  /**
   * Delete a notification template.
   */
  static async deleteTemplate(templateId: string) {
    return db.notificationTemplate.delete({ where: { id: templateId } })
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  /**
   * List notifications with filtering and pagination.
   */
  static async listNotifications(filter: NotificationListFilter) {
    const page = filter.page ?? 1
    const limit = filter.limit ?? 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { tenantId: filter.tenantId }

    if (filter.userId) where.userId = filter.userId
    if (filter.channel) where.channel = filter.channel
    if (filter.category) where.category = filter.category
    if (filter.status) where.status = filter.status
    if (filter.startDate || filter.endDate) {
      const dateFilter: Record<string, unknown> = {}
      if (filter.startDate) dateFilter.gte = filter.startDate
      if (filter.endDate) dateFilter.lte = filter.endDate
      where.createdAt = dateFilter
    }

    const [data, total] = await Promise.all([
      db.notification.findMany({
        where,
        skip,
        take: limit,
        include: {
          deliveries: { select: { id: true, channel: true, status: true, attempt: true, sentAt: true } },
          template: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.notification.count({ where }),
    ])

    return {
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
  }

  /**
   * Get delivery statistics for a tenant.
   */
  static async getStats(tenantId: string): Promise<NotificationStats> {
    const notifications = await db.notification.findMany({
      where: { tenantId },
      select: { status: true, channel: true },
    })

    const stats: NotificationStats = {
      total: notifications.length,
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      read: 0,
      byChannel: {},
    }

    for (const n of notifications) {
      switch (n.status) {
        case 'PENDING':
        case 'QUEUED':
          stats.pending++
          break
        case 'SENT':
          stats.sent++
          break
        case 'DELIVERED':
          stats.delivered++
          break
        case 'FAILED':
          stats.failed++
          break
        case 'READ':
          stats.read++
          break
      }

      // Per-channel stats
      if (!stats.byChannel[n.channel]) {
        stats.byChannel[n.channel] = { total: 0, sent: 0, failed: 0 }
      }
      stats.byChannel[n.channel].total++
      if (n.status === 'SENT' || n.status === 'DELIVERED' || n.status === 'READ') {
        stats.byChannel[n.channel].sent++
      }
      if (n.status === 'FAILED') {
        stats.byChannel[n.channel].failed++
      }
    }

    return stats
  }

  // -----------------------------------------------------------------------
  // Internal Helpers
  // -----------------------------------------------------------------------

  /**
   * Render a template by code, substituting {{variables}}.
   */
  private static async renderTemplate(
    code: string,
    data: Record<string, string>,
  ): Promise<{ body: string; subject?: string } | null> {
    const template = await db.notificationTemplate.findUnique({
      where: { code },
    })

    if (!template || !template.isActive) return null

    let body = template.body
    let subject = template.subject ?? undefined

    for (const [key, value] of Object.entries(data)) {
      body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
      if (subject) {
        subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
      }
    }

    return { body, subject }
  }

  /**
   * Send a notification record via the appropriate channel provider.
   * Creates/updates NotificationDelivery record.
   */
  private static async sendToProvider(
    notification: {
      id: string
      tenantId: string
      channel: string
    } & Record<string, unknown>,
    payload: NotificationPayload,
  ): Promise<NotificationSendResult> {
    const channel = notification.channel as NotificationChannel
    const provider = NotificationEngine.providers.get(channel)

    if (!provider) {
      // Update as failed — no provider registered
      await db.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED', error: `No provider registered for channel: ${channel}` },
      })
      return { success: false, error: `No provider for channel: ${channel}` }
    }

    // Create delivery record
    await db.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel,
        provider: channel,
        status: 'PENDING',
        attempt: 1,
      },
    })

    // Send
    const result = await provider.send(payload)

    // Update delivery
    const deliveryStatus = result.success ? 'SENT' : 'FAILED'
    await db.notificationDelivery.updateMany({
      where: { notificationId: notification.id },
      data: {
        status: deliveryStatus,
        responseCode: result.messageId,
        responseMessage: result.error,
        sentAt: result.success ? new Date() : undefined,
        deliveredAt: result.success ? new Date() : undefined,
      },
    })

    // Update notification
    await db.notification.update({
      where: { id: notification.id },
      data: {
        status: result.success ? 'SENT' : 'FAILED',
        providerMessageId: result.messageId ?? null,
        error: result.error ?? null,
        sentAt: result.success ? new Date() : null,
        deliveredAt: result.success ? new Date() : null,
      },
    })

    if (result.success) {
      console.log(
        `[NotificationEngine] Sent ${channel} notification ${notification.id}${result.messageId ? ` (${result.messageId})` : ''}`,
      )
    } else {
      console.error(
        `[NotificationEngine] Failed ${channel} notification ${notification.id}: ${result.error}`,
      )
    }

    return result
  }
}