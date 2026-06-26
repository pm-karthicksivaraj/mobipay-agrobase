/**
 * Agrobase V3 — Integration Adapter Types
 */

export interface IntegrationConfig {
  tenantId: string
  provider: string
  credentials: Record<string, string>
  settings: Record<string, unknown>
}

export interface SyncResult {
  success: boolean
  synced: number
  failed: number
  errors: string[]
  durationMs: number
}

export interface IntegrationAdapter {
  name: string
  description: string
  testConnection(config: IntegrationConfig): Promise<{ success: boolean; message: string }>
  syncFarmers?(config: IntegrationConfig, farmers: any[]): Promise<SyncResult>
  syncPurchases?(config: IntegrationConfig, purchases: any[]): Promise<SyncResult>
  fetchProducts?(config: IntegrationConfig): Promise<any[]>
  pushPayments?(config: IntegrationConfig, payments: any[]): Promise<SyncResult>
}