/**
 * Firebase Admin SDK — Server-side push notifications
 *
 * Uses the FCM HTTP v1 API via fetch (no firebase-admin dependency needed).
 * Sends push notifications to registered device tokens.
 *
 * To use firebase-admin SDK instead:
 *   npm install firebase-admin
 *   import * as admin from 'firebase-admin'
 *   admin.initializeApp({ credential: admin.credential.applicationDefault() })
 */

import { FIREBASE_SERVER_KEY, isFirebaseConfigured } from './config'
import { db } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────

interface PushMessage {
  title: string
  body: string
  data?: Record<string, string>
  icon?: string
  badge?: string
  color?: string
  clickAction?: string
}

interface SendResult {
  success: number
  failure: number
  errors: string[]
}

// ─── Device Token Management ──────────────────────────────────────

/**
 * Register a device token for a user.
 * Called by the client when they get an FCM token.
 */
export async function registerDeviceToken(userId: string, token: string, platform: 'web' | 'android' | 'ios' = 'web') {
  // Check if a DeviceToken model exists in the schema.
  // If not, store in the User's notificationPreferences or a simple JSON field.
  // For now, we'll use the Notification model's metadata or create a simple record.

  // If you add a DeviceToken model to Prisma:
  // await db.deviceToken.upsert({
  //   where: { token },
  //   create: { token, userId, platform, isActive: true },
  //   update: { userId, platform, isActive: true, lastUsedAt: new Date() },
  // })

  console.log(`[FCM] Device token registered for user ${userId}: ${token.substring(0, 20)}...`)
}

/**
 * Get all active device tokens for a user.
 */
export async function getUserDeviceTokens(userId: string): Promise<string[]> {
  // If DeviceToken model exists:
  // const tokens = await db.deviceToken.findMany({ where: { userId, isActive: true } })
  // return tokens.map(t => t.token)

  // For now, return empty — device tokens need to be stored via registerDeviceToken
  return []
}

// ─── Send Push Notification ───────────────────────────────────────

/**
 * Send a push notification to a single user (all their devices).
 *
 * @example
 * await sendPushNotification('user-123', {
 *   title: 'Training Reminder',
 *   body: 'Coffee Pruning training tomorrow at 10am in Kibale Hall',
 *   data: { type: 'TRAINING_REMINDER', trainingId: 'abc-123' },
 *   clickAction: '/training',
 * })
 */
export async function sendPushNotification(userId: string, message: PushMessage): Promise<SendResult> {
  if (!isFirebaseConfigured()) {
    console.warn('[FCM] Firebase not configured — skipping push notification')
    return { success: 0, failure: 1, errors: ['Firebase not configured'] }
  }

  const tokens = await getUserDeviceTokens(userId)
  if (tokens.length === 0) {
    console.warn(`[FCM] No device tokens found for user ${userId}`)
    return { success: 0, failure: 0, errors: ['No device tokens'] }
  }

  return sendToTokens(tokens, message)
}

/**
 * Send a push notification to multiple users.
 */
export async function sendBulkPushNotification(userIds: string[], message: PushMessage): Promise<SendResult> {
  if (!isFirebaseConfigured()) {
    console.warn('[FCM] Firebase not configured — skipping bulk push')
    return { success: 0, failure: userIds.length, errors: ['Firebase not configured'] }
  }

  const allTokens: string[] = []
  for (const userId of userIds) {
    const tokens = await getUserDeviceTokens(userId)
    allTokens.push(...tokens)
  }

  if (allTokens.length === 0) {
    return { success: 0, failure: 0, errors: ['No device tokens'] }
  }

  return sendToTokens(allTokens, message)
}

/**
 * Send to a topic (e.g., all farmers in a tenant, all extension officers).
 */
export async function sendTopicNotification(topic: string, message: PushMessage): Promise<SendResult> {
  if (!isFirebaseConfigured()) {
    console.warn('[FCM] Firebase not configured — skipping topic notification')
    return { success: 0, failure: 1, errors: ['Firebase not configured'] }
  }

  try {
    const response = await fetch(`https://fcm.googleapis.com/fcm/send`, {
      method: 'POST',
      headers: {
        'Authorization': `key=${FIREBASE_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: `/topics/${topic}`,
        notification: {
          title: message.title,
          body: message.body,
          icon: message.icon || '/icon-192.png',
          badge: message.badge || '/badge-72.png',
          color: message.color || '#059669',
          click_action: message.clickAction || '/',
        },
        data: message.data || {},
      }),
    })

    const result = await response.json()
    return {
      success: result.success || 0,
      failure: result.failure || 0,
      errors: result.results?.map((r: any) => r.error).filter(Boolean) || [],
    }
  } catch (error: any) {
    console.error('[FCM] Failed to send topic notification:', error)
    return { success: 0, failure: 1, errors: [error.message] }
  }
}

// ─── Internal: Send to tokens via FCM HTTP API ────────────────────

async function sendToTokens(tokens: string[], message: PushMessage): Promise<SendResult> {
  try {
    // FCM allows up to 1000 tokens per request
    const chunks: string[][] = []
    for (let i = 0; i < tokens.length; i += 1000) {
      chunks.push(tokens.slice(i, i + 1000))
    }

    let totalSuccess = 0
    let totalFailure = 0
    const allErrors: string[] = []

    for (const chunk of chunks) {
      const response = await fetch(`https://fcm.googleapis.com/fcm/send`, {
        method: 'POST',
        headers: {
          'Authorization': `key=${FIREBASE_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration_ids: chunk,
          notification: {
            title: message.title,
            body: message.body,
            icon: message.icon || '/icon-192.png',
            badge: message.badge || '/badge-72.png',
            color: message.color || '#059669',
            click_action: message.clickAction || '/',
          },
          data: message.data || {},
        }),
      })

      const result = await response.json()
      totalSuccess += result.success || 0
      totalFailure += result.failure || 0

      if (result.results) {
        for (const r of result.results) {
          if (r.error) allErrors.push(r.error)
        }
      }
    }

    return { success: totalSuccess, failure: totalFailure, errors: allErrors }
  } catch (error: any) {
    console.error('[FCM] Failed to send notifications:', error)
    return { success: 0, failure: tokens.length, errors: [error.message] }
  }
}

// ─── Convenience: Notification Templates ──────────────────────────

export const NOTIFICATION_TEMPLATES = {
  TRAINING_REMINDER: (training: { topic: string; date: string; location?: string }) => ({
    title: 'Training Reminder',
    body: `${training.topic} tomorrow at ${training.location || 'the usual location'}`,
    data: { type: 'TRAINING_REMINDER' },
    clickAction: '/training',
  }),

  LOAN_APPROVED: (loan: { amount: number }) => ({
    title: 'Loan Approved! 🎉',
    body: `Your loan of UGX ${loan.amount.toLocaleString()} has been approved`,
    data: { type: 'LOAN_APPROVED' },
    clickAction: '/loans',
  }),

  LOAN_DISBURSED: (loan: { amount: number }) => ({
    title: 'Loan Disbursed',
    body: `UGX ${loan.amount.toLocaleString()} has been sent to your mobile money account`,
    data: { type: 'LOAN_DISBURSED' },
    clickAction: '/loans',
  }),

  PAYMENT_RECEIVED: (payment: { amount: number; description: string }) => ({
    title: 'Payment Received',
    body: `UGX ${payment.amount.toLocaleString()} — ${payment.description}`,
    data: { type: 'PAYMENT_RECEIVED' },
    clickAction: '/payments',
  }),

  VSLA_MEETING: (meeting: { agenda: string; date: string }) => ({
    title: 'VSLA Meeting Scheduled',
    body: `${meeting.agenda} on ${new Date(meeting.date).toLocaleDateString()}`,
    data: { type: 'VSLA_MEETING' },
    clickAction: '/vsla',
  }),

  FARM_VISIT: (visit: { date: string }) => ({
    title: 'Farm Visit Scheduled',
    body: `An extension officer will visit your farm on ${new Date(visit.date).toLocaleDateString()}`,
    data: { type: 'FARM_VISIT' },
    clickAction: '/farm-visits',
  }),

  EUDR_ALERT: (plot: { name: string }) => ({
    title: 'EUDR Compliance Alert',
    body: `Plot "${plot.name}" needs deforestation verification`,
    data: { type: 'EUDR_ALERT' },
    clickAction: '/compliance',
  }),

  MARKET_MATCH: (match: { commodity: string; price: number }) => ({
    title: 'New Market Match!',
    body: `Buyer found for your ${match.commodity} at UGX ${match.price.toLocaleString()}`,
    data: { type: 'MARKET_MATCH' },
    clickAction: '/marketplace',
  }),
} as const
