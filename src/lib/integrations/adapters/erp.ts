/**
 * Agrobase V3 — ERP Integration Adapter (Generic)
 * Supports: SAP, Oracle, QuickBooks, Xero patterns.
 * Uses configurable endpoints and auth.
 */

import type { IntegrationAdapter, IntegrationConfig, SyncResult } from '../types'

export class ERPAdapter implements IntegrationAdapter {
  name = 'erp'
  description = 'Generic ERP integration (SAP, Oracle, QuickBooks)'

  async testConnection(config: IntegrationConfig): Promise<{ success: boolean; message: string }> {
    try {
      const { baseUrl, username, password, apiKey } = config.credentials
      const url = config.settings.baseUrl || baseUrl

      if (!url) return { success: false, message: 'Base URL required' }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      } else if (username && password) {
        headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      }

      const res = await fetch(`${url}/api/health`, { method: 'GET', headers, signal: AbortSignal.timeout(10000) })
        .catch(() => null)

      if (res && res.ok) {
        return { success: true, message: `ERP connection successful (${res.status})` }
      }
      return { success: false, message: res ? `ERP returned ${res.status}` : 'Connection failed' }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Connection test failed' }
    }
  }

  async syncFarmers(config: IntegrationConfig, farmers: any[]): Promise<SyncResult> {
    const start = Date.now()
    let synced = 0
    let failed = 0
    const errors: string[] = []

    const url = `${config.settings.baseUrl || config.credentials.baseUrl}/api/farmers/sync`
    const headers = this.buildHeaders(config)

    // Batch sync in chunks of 50
    for (let i = 0; i < farmers.length; i += 50) {
      const batch = farmers.slice(i, i + 50)
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ farmers: batch }),
          signal: AbortSignal.timeout(30000),
        })

        if (res.ok) {
          synced += batch.length
        } else {
          failed += batch.length
          errors.push(`Batch ${Math.floor(i / 50) + 1}: HTTP ${res.status}`)
        }
      } catch (error) {
        failed += batch.length
        errors.push(`Batch ${Math.floor(i / 50) + 1}: ${error instanceof Error ? error.message : 'Network error'}`)
      }
    }

    return { success: failed === 0, synced, failed, errors, durationMs: Date.now() - start }
  }

  async syncPurchases(config: IntegrationConfig, purchases: any[]): Promise<SyncResult> {
    const start = Date.now()
    let synced = 0
    let failed = 0
    const errors: string[] = []

    const url = `${config.settings.baseUrl || config.credentials.baseUrl}/api/purchases/sync`
    const headers = this.buildHeaders(config)

    for (let i = 0; i < purchases.length; i += 50) {
      const batch = purchases.slice(i, i + 50)
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ purchases: batch }),
          signal: AbortSignal.timeout(30000),
        })
        if (res.ok) synced += batch.length
        else { failed += batch.length; errors.push(`Batch ${Math.floor(i / 50) + 1}: HTTP ${res.status}`) }
      } catch (error) {
        failed += batch.length
        errors.push(`Batch ${Math.floor(i / 50) + 1}: ${error instanceof Error ? error.message : 'Network error'}`)
      }
    }

    return { success: failed === 0, synced, failed, errors, durationMs: Date.now() - start }
  }

  private buildHeaders(config: IntegrationConfig): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (config.credentials.apiKey) headers['Authorization'] = `Bearer ${config.credentials.apiKey}`
    else if (config.credentials.username) {
      headers['Authorization'] = `Basic ${Buffer.from(`${config.credentials.username}:${config.credentials.password || ''}`).toString('base64')}`
    }
    return headers
  }
}

export const erpAdapter = new ERPAdapter()