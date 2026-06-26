/**
 * Agrobase V3 — Notification Types
 * MobiPay AgroSys Limited
 *
 * Core type definitions for the multi-channel notification system.
 * Supports SMS (Africa's Talking / Twilio), Email (Resend / SMTP),
 * WhatsApp (AT / Meta), and In-App notifications.
 */

// ---------------------------------------------------------------------------
// Enums / Union types
// ---------------------------------------------------------------------------

export type NotificationChannel = 'SMS' | 'EMAIL' | 'WHATSAPP' | 'IN_APP' | 'PUSH'
export type NotificationCategory = 'TRANSACTIONAL' | 'MARKETING' | 'ALERT' | 'SYSTEM'
export type NotificationStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ'

/** Default channel enablement per category */
export const CATEGORY_DEFAULT_CHANNELS: Record<NotificationCategory, NotificationChannel[]> = {
  TRANSACTIONAL: ['IN_APP', 'SMS'],
  MARKETING:    ['IN_APP', 'EMAIL'],
  ALERT:        ['IN_APP', 'SMS', 'EMAIL'],
  SYSTEM:       ['IN_APP'],
}

// ---------------------------------------------------------------------------
// Channel Provider Interface
// ---------------------------------------------------------------------------

export interface NotificationChannelProvider {
  send(payload: NotificationPayload): Promise<NotificationSendResult>
}

export interface NotificationSendResult {
  success: boolean
  messageId?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

/** Core notification payload */
export interface NotificationPayload {
  tenantId: string
  userId?: string
  recipientPhone?: string
  recipientEmail?: string
  channel: NotificationChannel
  category: NotificationCategory
  templateCode?: string
  subject?: string
  body: string
  data?: Record<string, string>
  scheduledAt?: Date
}

/** Multi-channel dispatch request */
export interface MultiChannelRequest {
  tenantId: string
  userId?: string
  recipientPhone?: string
  recipientEmail?: string
  channels: NotificationChannel[]
  category: NotificationCategory
  templateCode?: string
  subject?: string
  body: string
  data?: Record<string, string>
  scheduledAt?: Date
}

/** User-targeted dispatch (auto-resolves channels from preferences + user data) */
export interface UserNotificationRequest {
  tenantId: string
  userId: string
  category: NotificationCategory
  templateCode?: string
  subject?: string
  body: string
  data?: Record<string, string>
  scheduledAt?: Date
  forceChannels?: NotificationChannel[]   // override preferences
}

/** Filter for listing notifications */
export interface NotificationListFilter {
  tenantId: string
  userId?: string
  channel?: NotificationChannel
  category?: NotificationCategory
  status?: NotificationStatus
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

/** Delivery statistics */
export interface NotificationStats {
  total: number
  pending: number
  sent: number
  delivered: number
  failed: number
  read: number
  byChannel: Record<string, { total: number; sent: number; failed: number }>
}

/** User notification preferences */
export interface UserPreferences {
  userId: string
  tenantId: string
  channels: Record<NotificationChannel, boolean>
}

/** Template variable definition */
export interface TemplateVariable {
  name: string
  label: string
  required?: boolean
  defaultValue?: string
}