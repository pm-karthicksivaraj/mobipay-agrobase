export const EVENT_DEFINITIONS: Record<string, { description: string; category: string }> = {
  'payment.completed': { description: 'A payment has been completed successfully', category: 'PAYMENT' },
  'payment.failed': { description: 'A payment attempt has failed', category: 'PAYMENT' },
  'intake.created': { description: 'Produce intake record has been created', category: 'INVENTORY' },
  'intake.accepted': { description: 'Produce intake has been accepted after inspection', category: 'INVENTORY' },
  'intake.rejected': { description: 'Produce intake has been rejected', category: 'INVENTORY' },
  'contract.created': { description: 'A new contract has been created', category: 'PRODUCTION' },
  'contract.completed': { description: 'A contract has been completed', category: 'PRODUCTION' },
  'shipment.dispatched': { description: 'A shipment has been dispatched', category: 'INVENTORY' },
  'shipment.delivered': { description: 'A shipment has been delivered', category: 'INVENTORY' },
  'quality.inspection.completed': { description: 'Quality inspection has been completed', category: 'PRODUCTION' },
  'farmer.registered': { description: 'A new farmer has been registered', category: 'PARTNER' },
  'subscription.created': { description: 'A subscription has been created', category: 'SYSTEM' },
  'subscription.expired': { description: 'A subscription has expired', category: 'SYSTEM' },
  'invoice.generated': { description: 'An invoice has been generated', category: 'PAYMENT' },
  'eudr.alert': { description: 'EUDR compliance alert triggered', category: 'COMPLIANCE' },
  'deforestation.detected': { description: 'Deforestation risk detected', category: 'COMPLIANCE' },
  'stock.low': { description: 'Stock level has fallen below minimum threshold', category: 'INVENTORY' },
  'stock.movement': { description: 'Stock movement has been recorded', category: 'INVENTORY' },
}

export const WEBHOOK_EVENTS = Object.entries(EVENT_DEFINITIONS).map(([event, meta]) => ({
  event,
  ...meta,
}))