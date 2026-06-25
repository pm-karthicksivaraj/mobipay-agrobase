export type NotificationChannel = 'SMS' | 'EMAIL' | 'WHATSAPP' | 'IN_APP' | 'PUSH'
export type NotificationCategory = 'TRANSACTIONAL' | 'MARKETING' | 'ALERT' | 'SYSTEM'
export type NotificationStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED'

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

export interface NotificationChannelProvider {
  send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }>
}