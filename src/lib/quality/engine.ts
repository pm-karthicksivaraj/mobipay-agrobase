/**
 * Agrobase V3 — Quality Management Engine
 * Handles grade definitions, quality inspections, and scoring.
 */

import { db } from '@/lib/db'
import type { GradeDefinitionInput, QualityInspectionInput, QualityResult } from './types'

export class QualityEngine {
  /**
   * Create a new grade definition for a commodity.
   */
  async createGrade(tenantId: string, input: GradeDefinitionInput) {
    try {
      return await db.gradeDefinition.create({
        data: {
          tenantId,
          commodity: input.commodity,
          grade: input.grade,
          description: input.description || null,
          criteria: input.criteria,
          pricePremium: input.pricePremium ?? null,
          isActive: true,
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create grade definition: ${msg}`)
    }
  }

  /**
   * List all active grade definitions for a commodity.
   */
  async listGrades(tenantId: string, commodity?: string) {
    try {
      const where: Record<string, unknown> = { tenantId, isActive: true }
      if (commodity) where.commodity = commodity
      return await db.gradeDefinition.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to list grades: ${msg}`)
    }
  }

  /**
   * Create a quality inspection record.
   */
  async createInspection(tenantId: string, input: QualityInspectionInput) {
    try {
      const inspection = await db.qualityInspection.create({
        data: {
          tenantId,
          warehouseId: input.warehouseId || null,
          stockItemId: input.stockItemId || null,
          gradeDefId: input.gradeDefId || null,
          batchCode: input.batchCode || null,
          commodity: input.commodity,
          sampleWeight: input.sampleWeight,
          parameters: input.parameters,
          overallScore: input.overallScore ?? null,
          grade: input.grade || null,
          passed: input.passed ?? null,
          inspectorId: input.inspectorId || null,
          notes: input.notes || null,
          status: 'DRAFT',
        },
      })
      return inspection
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create inspection: ${msg}`)
    }
  }

  /**
   * Auto-grade based on parameters against a grade definition's criteria.
   */
  async autoGrade(tenantId: string, commodity: string, parameters: Record<string, number>): Promise<QualityResult | null> {
    try {
      const grades = await db.gradeDefinition.findMany({
        where: { tenantId, commodity, isActive: true },
        orderBy: { pricePremium: 'desc' },
      })

      for (const gradeDef of grades) {
        const criteria: Record<string, { min?: number; max?: number }> = JSON.parse(gradeDef.criteria)
        let allPass = true
        let score = 0
        let totalCriteria = 0

        for (const [key, range] of Object.entries(criteria)) {
          const value = parameters[key]
          if (value === undefined) continue
          totalCriteria += 1
          if (range.min !== undefined && value < range.min) { allPass = false; continue }
          if (range.max !== undefined && value > range.max) { allPass = false; continue }
          score += 1
        }

        if (totalCriteria > 0 && allPass) {
          return {
            passed: true,
            grade: gradeDef.grade,
            score: totalCriteria > 0 ? Math.round((score / totalCriteria) * 100) : 0,
            details: { gradeDefId: gradeDef.id, pricePremium: gradeDef.pricePremium, matchedCriteria: score, totalCriteria },
          }
        }
      }

      return null
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to auto-grade: ${msg}`)
    }
  }

  /**
   * Submit inspection for approval (DRAFT → PENDING).
   */
  async submitForApproval(inspectionId: string, tenantId: string) {
    try {
      const existing = await db.qualityInspection.findFirst({
        where: { id: inspectionId, tenantId },
      })
      if (!existing) throw new Error('Inspection not found')
      if (existing.status !== 'DRAFT') throw new Error('Only DRAFT inspections can be submitted')

      return await db.qualityInspection.update({
        where: { id: inspectionId },
        data: { status: 'PENDING' },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to submit inspection: ${msg}`)
    }
  }

  /**
   * Approve or reject an inspection.
   */
  async reviewInspection(inspectionId: string, tenantId: string, action: 'approve' | 'reject', reviewerId: string) {
    try {
      const existing = await db.qualityInspection.findFirst({
        where: { id: inspectionId, tenantId },
      })
      if (!existing) throw new Error('Inspection not found')
      if (existing.status !== 'PENDING') throw new Error('Only PENDING inspections can be reviewed')

      const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'
      return await db.qualityInspection.update({
        where: { id: inspectionId },
        data: { status: newStatus, passed: action === 'approve' ? true : false },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to review inspection: ${msg}`)
    }
  }

  /**
   * Get inspection statistics for a warehouse or tenant.
   */
  async getStats(tenantId: string, warehouseId?: string) {
    try {
      const where: Record<string, unknown> = { tenantId }
      if (warehouseId) where.warehouseId = warehouseId

      const [total, passed, failed, pending] = await Promise.all([
        db.qualityInspection.count({ where }),
        db.qualityInspection.count({ where: { ...where, passed: true } }),
        db.qualityInspection.count({ where: { ...where, passed: false } }),
        db.qualityInspection.count({ where: { ...where, status: 'PENDING' } }),
      ])

      return { total, passed, failed, pending, passRate: total > 0 ? Math.round((passed / total) * 100) : 0 }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to get quality stats: ${msg}`)
    }
  }
}

export const qualityEngine = new QualityEngine()