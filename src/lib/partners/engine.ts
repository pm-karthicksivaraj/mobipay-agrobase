/**
 * Agrobase V3 — Partner Management Engine
 * Handles partners, commission rules, and settlement calculations.
 */

import { db } from '@/lib/db'
import type { PartnerInput, CommissionRuleInput, SettlementInput } from './types'

export class PartnerEngine {
  /**
   * Register a new partner.
   */
  async createPartner(tenantId: string, input: PartnerInput) {
    try {
      return await db.partner.create({
        data: {
          tenantId,
          name: input.name,
          type: input.type,
          contactName: input.contactName || null,
          contactEmail: input.contactEmail || null,
          contactPhone: input.contactPhone || null,
          address: input.address || null,
          country: input.country || null,
          commissionRate: input.commissionRate ?? null,
          isActive: true,
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create partner: ${msg}`)
    }
  }

  /**
   * Create a commission rule for a partner.
   */
  async createCommissionRule(tenantId: string, input: CommissionRuleInput) {
    try {
      const partner = await db.partner.findFirst({ where: { id: input.partnerId, tenantId } })
      if (!partner) throw new Error('Partner not found')

      return await db.commissionRule.create({
        data: {
          tenantId,
          partnerId: input.partnerId,
          name: input.name,
          type: input.type,
          basis: input.basis,
          rate: input.rate,
          minAmount: input.minAmount ?? null,
          maxAmount: input.maxAmount ?? null,
          conditions: input.conditions || null,
          effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
          effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
          isActive: true,
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create commission rule: ${msg}`)
    }
  }

  /**
   * Calculate commission for a given transaction amount against a partner's active rules.
   */
  async calculateCommission(partnerId: string, transactionAmount: number): Promise<{ ruleId: string; ruleName: string; commission: number }> {
    try {
      const rules = await db.commissionRule.findMany({
        where: { partnerId, isActive: true, effectiveFrom: { lte: new Date() } },
        orderBy: { rate: 'desc' },
      })

      for (const rule of rules) {
        if (rule.effectiveTo && rule.effectiveTo < new Date()) continue
        if (rule.minAmount !== null && transactionAmount < rule.minAmount) continue
        if (rule.maxAmount !== null && transactionAmount > rule.maxAmount) continue

        let commission = 0
        if (rule.basis === 'PERCENTAGE') {
          commission = (transactionAmount * rule.rate) / 100
        } else {
          commission = rule.rate
        }

        return { ruleId: rule.id, ruleName: rule.name, commission: Math.round(commission * 100) / 100 }
      }

      throw new Error('No active commission rule found for this transaction amount')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to calculate commission: ${msg}`)
    }
  }

  /**
   * Create a commission settlement record.
   */
  async createSettlement(tenantId: string, input: SettlementInput) {
    try {
      return await db.commissionSettlement.create({
        data: {
          tenantId,
          partnerId: input.partnerId,
          ruleId: input.ruleId || null,
          period: input.period,
          referenceId: input.referenceId || null,
          amount: input.amount,
          currency: input.currency || 'UGX',
          status: 'PENDING',
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create settlement: ${msg}`)
    }
  }

  /**
   * Approve and mark a settlement as paid.
   */
  async approveSettlement(settlementId: string, tenantId: string, paidVia?: string) {
    try {
      const existing = await db.commissionSettlement.findFirst({
        where: { id: settlementId, tenantId },
      })
      if (!existing) throw new Error('Settlement not found')
      if (existing.status !== 'PENDING') throw new Error('Only PENDING settlements can be approved')

      return await db.commissionSettlement.update({
        where: { id: settlementId },
        data: {
          status: 'APPROVED',
          paidAt: new Date(),
          paidVia: paidVia || null,
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to approve settlement: ${msg}`)
    }
  }

  /**
   * Get partner summary with totals.
   */
  async getPartnerSummary(partnerId: string, tenantId: string) {
    try {
      const partner = await db.partner.findFirst({ where: { id: partnerId, tenantId } })
      if (!partner) throw new Error('Partner not found')

      const [rules, settlements] = await Promise.all([
        db.commissionRule.count({ where: { partnerId } }),
        db.commissionSettlement.aggregate({
          where: { partnerId },
          _sum: { amount: true },
          _count: true,
        }),
      ])

      const pendingSettlements = await db.commissionSettlement.count({
        where: { partnerId, status: 'PENDING' },
      })

      return {
        partner,
        totalRules: rules,
        totalSettlements: settlements._count || 0,
        totalSettled: settlements._sum?.amount ?? 0,
        pendingSettlements,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to get partner summary: ${msg}`)
    }
  }
}

export const partnerEngine = new PartnerEngine()