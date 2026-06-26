export type WebhookEventName =
  | 'payment.completed' | 'payment.failed'
  | 'intake.created' | 'intake.accepted' | 'intake.rejected'
  | 'contract.created' | 'contract.completed'
  | 'shipment.dispatched' | 'shipment.delivered'
  | 'quality.inspection.completed'
  | 'farmer.registered'
  | 'subscription.created' | 'subscription.expired'
  | 'invoice.generated'
  | 'eudr.alert' | 'deforestation.detected'
  | 'stock.low' | 'stock.movement'

export interface WebhookPayload {
  event: WebhookEventName
  timestamp: string
  tenantId: string
  data: Record<string, unknown>
}