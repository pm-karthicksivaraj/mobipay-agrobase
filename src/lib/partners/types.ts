/**
 * Agrobase V3 — Partner Management Types
 */

export interface PartnerInput {
  name: string
  type: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  country?: string
  commissionRate?: number
}

export interface CommissionRuleInput {
  partnerId: string
  name: string
  type: string
  basis: string
  rate: number
  minAmount?: number
  maxAmount?: number
  conditions?: string
  effectiveFrom?: string
  effectiveTo?: string
}

export interface SettlementInput {
  partnerId: string
  ruleId?: string
  period: string
  referenceId?: string
  amount: number
  currency?: string
}