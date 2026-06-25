import type { NotificationChannelProvider, NotificationPayload } from '../types'

export class InAppProvider implements NotificationChannelProvider {
  async send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!payload.userId) {
        return { success: false, error: 'userId is required for IN_APP notifications' }
      }

      // In-app notifications are stored in DB by the engine before calling providers.
      // This provider just confirms successful in-app delivery.
      return { success: true, messageId: `inapp-${Date.now()}` }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown in-app notification error'
      return { success: false, error: msg }
    }
  }
}