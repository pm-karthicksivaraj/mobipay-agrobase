/**
 * Agrobase V3 — Contract Management Engine
 * Handles contract lifecycle, milestones, delivery tracking, and performance.
 */

import { db } from '@/lib/db'
import type { ContractInput, MilestoneInput, ContractStatus } from './types'

export class ContractEngine {
  /**
   * Generate a unique contract code.
   * Format: CONT-{TENANT_CODE}-{YYYYMMDD}-{SEQ}
   */
  private async generateContractCode(tenantId: string): Promise<string> {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    const code = (tenant?.name ?? 'UNKNOWN').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
    const today = new Date()
    const dateStr = today.getFullYear().toString() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0')
    const prefix = `CONT-${code}-${dateStr}-`
    const existingCount = await db.contract.count({ where: { contractCode: { startsWith: prefix } } })
    return `${prefix}${String(existingCount + 1).padStart(4, '0')}`
  }

  /**
   * Create a new contract with optional items.
   */
  async createContract(tenantId: string, input: ContractInput) {
    try {
      const contractCode = await this.generateContractCode(tenantId)
      const record = await db.contract.create({
        data: {
          tenantId,
          contractCode,
          type: input.type,
          status: 'DRAFT',
          buyerId: input.buyerId || null,
          buyerName: input.buyerName || null,
          sellerId: input.sellerId || null,
          sellerName: input.sellerName || null,
          commodity: input.commodity,
          variety: input.variety || null,
          grade: input.grade || null,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          currency: input.currency || 'UGX',
          totalValue: input.totalValue,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          deliveryTerms: input.deliveryTerms || null,
          paymentTerms: input.paymentTerms || null,
          qualitySpecs: input.qualitySpecs || null,
          penalties: input.penalties || null,
          notes: input.notes || null,
          items: input.items ? {
            create: input.items.map((item) => ({
              commodity: item.commodity,
              variety: item.variety || null,
              grade: item.grade || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          } : undefined,
        },
        include: { items: true, milestones: true },
      })
      return record
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create contract: ${msg}`)
    }
  }

  /**
   * Activate a DRAFT contract.
   */
  async activateContract(contractId: string, tenantId: string) {
    try {
      const existing = await db.contract.findFirst({ where: { id: contractId, tenantId } })
      if (!existing) throw new Error('Contract not found')
      if (existing.status !== 'DRAFT') throw new Error('Only DRAFT contracts can be activated')

      return await db.contract.update({
        where: { id: contractId },
        data: { status: 'ACTIVE' as ContractStatus, signedAt: new Date() },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to activate contract: ${msg}`)
    }
  }

  /**
   * Cancel a contract.
   */
  async cancelContract(contractId: string, tenantId: string) {
    try {
      const existing = await db.contract.findFirst({ where: { id: contractId, tenantId } })
      if (!existing) throw new Error('Contract not found')
      if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
        throw new Error('Contract is already completed or cancelled')
      }

      return await db.contract.update({
        where: { id: contractId },
        data: { status: 'CANCELLED' as ContractStatus },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to cancel contract: ${msg}`)
    }
  }

  /**
   * Add a milestone to a contract.
   */
  async addMilestone(contractId: string, tenantId: string, input: MilestoneInput) {
    try {
      const contract = await db.contract.findFirst({ where: { id: contractId, tenantId } })
      if (!contract) throw new Error('Contract not found')

      return await db.contractMilestone.create({
        data: {
          contractId,
          name: input.name,
          dueDate: new Date(input.dueDate),
          quantity: input.quantity ?? null,
          amount: input.amount ?? null,
          notes: input.notes || null,
          status: 'PENDING',
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to add milestone: ${msg}`)
    }
  }

  /**
   * Complete a milestone.
   */
  async completeMilestone(milestoneId: string) {
    try {
      return await db.contractMilestone.update({
        where: { id: milestoneId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to complete milestone: ${msg}`)
    }
  }

  /**
   * Record delivery against a contract item.
   */
  async recordDelivery(contractItemId: string, quantity: number) {
    try {
      const item = await db.contractItem.findUnique({ where: { id: contractItemId } })
      if (!item) throw new Error('Contract item not found')
      if (item.delivered + quantity > item.quantity) {
        throw new Error(`Delivery exceeds remaining quantity. Remaining: ${item.quantity - item.delivered}`)
      }

      return await db.contractItem.update({
        where: { id: contractItemId },
        data: { delivered: { increment: quantity } },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to record delivery: ${msg}`)
    }
  }

  /**
   * Get contract performance metrics.
   */
  async getPerformance(contractId: string, tenantId: string) {
    try {
      const contract = await db.contract.findFirst({
        where: { id: contractId, tenantId },
        include: { items: true, milestones: { orderBy: { dueDate: 'asc' } } },
      })
      if (!contract) throw new Error('Contract not found')

      const totalQuantity = contract.items.reduce((sum, i) => sum + i.quantity, 0)
      const deliveredQuantity = contract.items.reduce((sum, i) => sum + i.delivered, 0)
      const totalMilestones = contract.milestones.length
      const completedMilestones = contract.milestones.filter((m) => m.status === 'COMPLETED').length
      const overdueMilestones = contract.milestones.filter((m) => m.status !== 'COMPLETED' && new Date(m.dueDate) < new Date()).length

      return {
        contract,
        metrics: {
          totalQuantity,
          deliveredQuantity,
          deliveryRate: totalQuantity > 0 ? Math.round((deliveredQuantity / totalQuantity) * 100) : 0,
          totalItems: contract.items.length,
          totalMilestones,
          completedMilestones,
          milestoneRate: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0,
          overdueMilestones,
        },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to get performance: ${msg}`)
    }
  }
}

export const contractEngine = new ContractEngine()