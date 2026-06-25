/**
 * Agrobase V3 — Integration Registry
 * Central registry for all integration adapters.
 */

import type { IntegrationAdapter, IntegrationConfig, SyncResult } from './types/index'
import { erpAdapter } from './adapters/erp'
import { governmentAdapter } from './adapters/government'

class IntegrationRegistry {
  private adapters: Map<string, IntegrationAdapter> = new Map()

  constructor() {
    this.register(erpAdapter)
    this.register(governmentAdapter)
  }

  register(adapter: IntegrationAdapter) {
    this.adapters.set(adapter.name, adapter)
  }

  get(name: string): IntegrationAdapter | undefined {
    return this.adapters.get(name)
  }

  listAdapters(): Array<{ name: string; description: string }> {
    return Array.from(this.adapters.values()).map((a) => ({ name: a.name, description: a.description }))
  }

  async testConnection(config: IntegrationConfig): Promise<{ success: boolean; message: string }> {
    const adapter = this.adapters.get(config.provider)
    if (!adapter) return { success: false, message: `Unknown integration provider: ${config.provider}` }
    return adapter.testConnection(config)
  }

  async syncFarmers(config: IntegrationConfig, farmers: any[]): Promise<SyncResult> {
    const adapter = this.adapters.get(config.provider)
    if (!adapter || !adapter.syncFarmers) {
      return { success: false, synced: 0, failed: farmers.length, errors: ['Provider does not support farmer sync'], durationMs: 0 }
    }
    return adapter.syncFarmers(config, farmers)
  }

  async syncPurchases(config: IntegrationConfig, purchases: any[]): Promise<SyncResult> {
    const adapter = this.adapters.get(config.provider)
    if (!adapter || !adapter.syncPurchases) {
      return { success: false, synced: 0, failed: purchases.length, errors: ['Provider does not support purchase sync'], durationMs: 0 }
    }
    return adapter.syncPurchases(config, purchases)
  }
}

export const integrationRegistry = new IntegrationRegistry()