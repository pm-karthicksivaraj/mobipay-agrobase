/**
 * Agrobase V3 — Government Systems Integration Adapter
 * Supports: Uganda (MAAIF, OWC), Ghana (MoFA), Kenya (e-Agriculture).
 * Handles farmer registry sync, compliance reporting, and subsidy data.
 */

import type { IntegrationAdapter, IntegrationConfig, SyncResult } from '../types'

// Government API endpoints per country
const GOV_ENDPOINTS: Record<string, { registry: string; compliance: string; subsidies: string }> = {
  UG: {
    registry: 'https://api.maaif.go.ug/v1/farmer-registry',
    compliance: 'https://api.maaif.go.ug/v1/compliance',
    subsidies: 'https://api.owc.go.ug/v1/subsidies',
  },
  GH: {
    registry: 'https://api.mofa.gov.gh/v1/farmer-registry',
    compliance: 'https://api.mofa.gov.gh/v1/compliance',
    subsidies: 'https://api.mofa.gov.gh/v1/subsidies',
  },
  KE: {
    registry: 'https://api.eagriculture.go.ke/v1/farmer-registry',
    compliance: 'https://api.eagriculture.go.ke/v1/compliance',
    subsidies: 'https://api.eagriculture.go.ke/v1/subsidies',
  },
}

export class GovernmentAdapter implements IntegrationAdapter {
  name = 'government'
  description = 'Government system integration (MAAIF, MoFA, e-Agriculture)'

  async testConnection(config: IntegrationConfig): Promise<{ success: boolean; message: string }> {
    try {
      const country = (config.settings.country as string) || 'UG'
      const endpoints = GOV_ENDPOINTS[country]
      if (!endpoints) return { success: false, message: `No endpoints configured for country: ${country}` }

      const apiKey = config.credentials.apiKey
      if (!apiKey) return { success: false, message: 'API key required for government integration' }

      const res = await fetch(`${endpoints.registry}/health`, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
      }).catch(() => null)

      if (res && res.ok) return { success: true, message: `Government ${country} connection OK` }
      return { success: false, message: res ? `Government API returned ${res.status}` : 'Connection failed' }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Connection test failed' }
    }
  }

  /**
   * Push farmer registrations to the government registry.
   */
  async syncFarmers(config: IntegrationConfig, farmers: any[]): Promise<SyncResult> {
    const start = Date.now()
    let synced = 0
    let failed = 0
    const errors: string[] = []
    const country = (config.settings.country as string) || 'UG'
    const endpoints = GOV_ENDPOINTS[country]
    if (!endpoints) return { success: false, synced: 0, failed: farmers.length, errors: [`No endpoints for ${country}`], durationMs: 0 }

    const headers = {
      'Authorization': `Bearer ${config.credentials.apiKey}`,
      'Content-Type': 'application/json',
    }

    // Format farmers for government schema
    const govFarmers = farmers.map((f: any) => ({
      nationalId: f.nationalIdNo || f.nationalId,
      fullName: `${f.firstName} ${f.lastName}`,
      phone: f.phone,
      district: f.district || f.villageId,
      subCounty: f.subCounty,
      parish: f.parish,
      village: f.village,
      cropTypes: f.mainCrops || f.crops || [],
      farmSizeHa: f.farmSize || 0,
      registrationDate: f.createdAt,
    }))

    for (let i = 0; i < govFarmers.length; i += 20) {
      const batch = govFarmers.slice(i, i + 20)
      try {
        const res = await fetch(`${endpoints.registry}/batch`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ farmers: batch }),
          signal: AbortSignal.timeout(30000),
        })
        if (res.ok) synced += batch.length
        else { failed += batch.length; errors.push(`Batch: HTTP ${res.status}`) }
      } catch (error) {
        failed += batch.length
        errors.push(error instanceof Error ? error.message : 'Network error')
      }
    }

    return { success: failed === 0, synced, failed, errors, durationMs: Date.now() - start }
  }

  /**
   * Submit compliance report (EUDR, CBAM) to government.
   */
  async submitComplianceReport(config: IntegrationConfig, reportData: { type: string; data: any }): Promise<SyncResult> {
    const start = Date.now()
    const country = (config.settings.country as string) || 'UG'
    const endpoints = GOV_ENDPOINTS[country]
    if (!endpoints) return { success: false, synced: 0, failed: 1, errors: [`No endpoints for ${country}`], durationMs: 0 }

    try {
      const res = await fetch(`${endpoints.compliance}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
        signal: AbortSignal.timeout(30000),
      })

      return {
        success: res.ok,
        synced: res.ok ? 1 : 0,
        failed: res.ok ? 0 : 1,
        errors: res.ok ? [] : [`HTTP ${res.status}`],
        durationMs: Date.now() - start,
      }
    } catch (error) {
      return {
        success: false,
        synced: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Submit failed'],
        durationMs: Date.now() - start,
      }
    }
  }

  /**
   * Fetch available subsidy programs.
   */
  async fetchSubsidies(config: IntegrationConfig): Promise<any[]> {
    const country = (config.settings.country as string) || 'UG'
    const endpoints = GOV_ENDPOINTS[country]
    if (!endpoints) return []

    try {
      const res = await fetch(`${endpoints.subsidies}/programs`, {
        headers: { 'Authorization': `Bearer ${config.credentials.apiKey}` },
        signal: AbortSignal.timeout(15000),
      })

      if (res.ok) {
        const data = await res.json()
        return Array.isArray(data) ? data : data.programs || []
      }
      return []
    } catch {
      return []
    }
  }
}

export const governmentAdapter = new GovernmentAdapter()