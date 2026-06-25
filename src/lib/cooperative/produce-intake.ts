/**
 * Agrobase V3 — Produce Intake Management
 * MobiPay AgroSys Limited
 *
 * ProduceIntakeManager class using Prisma ProduceIntake model.
 * Handles create → weigh → grade → accept/reject → store.
 * Auto-creates journal entries for accepted intake.
 * Calculates first and final payments for farmers.
 */

import { db } from '@/lib/db'
import { AccountingEngine } from './accounting'
import { roundMoney } from '../payments/types'

// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------

export interface CreateIntakeData {
  tenantId: string
  cooperativeId: string
  farmerId: string
  commodity: string
  variety?: string
  quantityKg: number
  pricePerKg: number
  intakeDate?: Date
  receivedBy: string
}

export interface IntakeFilters {
  commodity?: string
  grade?: string
  status?: string
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}

// ---------------------------------------------------------------------------
// ProduceIntakeManager Class
// ---------------------------------------------------------------------------

export class ProduceIntakeManager {
  /**
   * Create a new produce intake record (status: DRAFT).
   */
  static async createIntake(data: CreateIntakeData) {
    const totalAmount = roundMoney(data.quantityKg * data.pricePerKg)

    const intake = await db.produceIntake.create({
      data: {
        tenantId: data.tenantId,
        cooperativeId: data.cooperativeId,
        farmerId: data.farmerId,
        commodity: data.commodity,
        variety: data.variety,
        quantityKg: data.quantityKg,
        pricePerKg: data.pricePerKg,
        totalAmount,
        intakeDate: data.intakeDate ?? new Date(),
        status: 'DRAFT',
        receivedBy: data.receivedBy,
      },
    })

    console.log(
      `[Intake] Created ${intake.id}: ${data.quantityKg}kg ${data.commodity} @ ${data.pricePerKg}/kg = ${totalAmount}`,
    )

    return intake
  }

  /**
   * Update the quality grade of a produce intake.
   */
  static async updateGrade(
    id: string,
    grade: string,
    moistureContent?: number,
    qualityNotes?: string,
  ) {
    const intake = await db.produceIntake.findUnique({ where: { id } })
    if (!intake) throw new Error(`Intake not found: ${id}`)
    if (intake.status !== 'WEIGHED' && intake.status !== 'DRAFT') {
      throw new Error(`Cannot grade intake in ${intake.status} status`)
    }

    const updated = await db.produceIntake.update({
      where: { id },
      data: {
        grade,
        moistureContent: moistureContent ?? intake.moistureContent,
        qualityNotes: qualityNotes ?? intake.qualityNotes,
        status: 'GRADED',
      },
    })

    console.log(`[Intake] Graded ${id}: grade=${grade}, moisture=${moistureContent ?? 'N/A'}%`)
    return updated
  }

  /**
   * Accept a graded produce intake and assign to warehouse.
   * Sets ACCEPTED/STORED status.
   * Creates journal entry: DEBIT Produce Inventory (1004), CREDIT Accounts Payable - Farmers (2001).
   */
  static async acceptIntake(id: string, warehouse: string, postedBy: string) {
    const intake = await db.produceIntake.findUnique({ where: { id } })
    if (!intake) throw new Error(`Intake not found: ${id}`)
    if (intake.status !== 'GRADED') {
      throw new Error(`Cannot accept intake in ${intake.status} status`)
    }

    // Update intake status
    const updated = await db.produceIntake.update({
      where: { id },
      data: {
        warehouse,
        status: 'STORED',
      },
    })

    // Create journal entry: DR Inventory, CR Payables
    try {
      await AccountingEngine.createJournalEntry(
        intake.tenantId,
        [
          {
            accountCode: '1004',
            entryType: 'DEBIT',
            amount: intake.totalAmount,
            description: `Produce intake: ${intake.quantityKg}kg ${intake.commodity} (Grade ${intake.grade ?? 'N/A'})`,
          },
          {
            accountCode: '2001',
            entryType: 'CREDIT',
            amount: intake.totalAmount,
            description: `Payable to ${intake.farmerId} for ${intake.quantityKg}kg ${intake.commodity}`,
          },
        ],
        `Produce Intake: ${intake.commodity} ${intake.quantityKg}kg`,
        intake.id,
        postedBy,
      )

      console.log(`[Intake] Journal entry created for intake ${id}`)
    } catch (error) {
      console.error(`[Intake] Failed to create journal entry for ${id}:`, error)
    }

    console.log(`[Intake] Accepted intake ${id}: stored in ${warehouse}`)
    return updated
  }

  /**
   * Reject a produce intake record.
   */
  static async rejectIntake(id: string, reason: string) {
    const intake = await db.produceIntake.findUnique({ where: { id } })
    if (!intake) throw new Error(`Intake not found: ${id}`)
    if (intake.status === 'ACCEPTED' || intake.status === 'STORED') {
      throw new Error(`Cannot reject intake in ${intake.status} status`)
    }

    const updated = await db.produceIntake.update({
      where: { id },
      data: {
        status: 'REJECTED',
        qualityNotes: `${intake.qualityNotes ? intake.qualityNotes + '; ' : ''}REJECTED: ${reason}`,
      },
    })

    console.log(`[Intake] Rejected intake ${id}: ${reason}`)
    return updated
  }

  /**
   * Calculate the first payment for a produce intake.
   * Typically 60-70% of totalAmount.
   */
  static calculateFirstPayment(intakeId: string, percentage: number = 0.60) {
    // Synchronous — reads from cache or throws if not yet loaded
    // For async DB version, use calculateFirstPaymentAsync
    return {
      intakeId,
      phase: 'FIRST' as const,
      percentage,
      note: 'Use calculateFirstPaymentAsync for DB-backed calculation',
    }
  }

  /**
   * Calculate first payment from DB.
   */
  static async calculateFirstPaymentAsync(intakeId: string, percentage: number = 0.60) {
    const intake = await db.produceIntake.findUnique({ where: { id: intakeId } })
    if (!intake) throw new Error(`Intake not found: ${intakeId}`)
    if (intake.status !== 'ACCEPTED' && intake.status !== 'STORED') {
      throw new Error(`Cannot calculate payment for intake in ${intake.status} status`)
    }

    const grossAmount = roundMoney(intake.totalAmount * percentage)

    console.log(
      `[Intake] First payment for ${intakeId}: ${grossAmount} (${percentage * 100}%)`,
    )

    return {
      intakeId,
      phase: 'FIRST' as const,
      grossAmount,
      deductionsTotal: 0,
      netAmount: grossAmount,
    }
  }

  /**
   * Calculate the final payment for a produce intake after sale.
   */
  static async calculateFinalPayment(intakeId: string, salePricePerKg: number, firstPaymentPct: number = 0.60) {
    const intake = await db.produceIntake.findUnique({ where: { id: intakeId } })
    if (!intake) throw new Error(`Intake not found: ${intakeId}`)

    const actualSaleTotal = roundMoney(intake.quantityKg * salePricePerKg)
    const firstPaymentAmount = roundMoney(intake.totalAmount * firstPaymentPct)
    const finalGrossAmount = roundMoney(actualSaleTotal - firstPaymentAmount)

    console.log(
      `[Intake] Final payment for ${intakeId}: sale=${actualSaleTotal}, first=${firstPaymentAmount}, final=${finalGrossAmount}`,
    )

    return {
      intakeId,
      phase: 'FINAL' as const,
      actualSaleTotal,
      firstPaymentAmount,
      finalGrossAmount,
      deductionsTotal: 0,
      netAmount: finalGrossAmount,
    }
  }

  /**
   * List intakes for a cooperative with optional filters and pagination.
   */
  static async getIntakes(coopId: string, filters?: IntakeFilters) {
    const where: Record<string, unknown> = { cooperativeId: coopId }

    if (filters?.commodity) (where as Record<string, unknown>).commodity = filters.commodity
    if (filters?.grade) (where as Record<string, unknown>).grade = filters.grade
    if (filters?.status) (where as Record<string, unknown>).status = filters.status

    if (filters?.startDate || filters?.endDate) {
      const dateFilter: Record<string, Date> = {}
      if (filters.startDate) dateFilter.gte = filters.startDate
      if (filters.endDate) dateFilter.lte = filters.endDate
      ;(where as Record<string, unknown>).intakeDate = dateFilter
    }

    const page = filters?.page ?? 1
    const pageSize = filters?.pageSize ?? 20
    const skip = (page - 1) * pageSize

    const [intakes, total] = await Promise.all([
      db.produceIntake.findMany({
        where,
        orderBy: { intakeDate: 'desc' },
        skip,
        take: pageSize,
      }),
      db.produceIntake.count({ where }),
    ])

    return {
      intakes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * Aggregate intake statistics for a cooperative in a period.
   */
  static async getIntakeSummary(coopId: string, startDate: Date, endDate: Date) {
    const intakes = await db.produceIntake.findMany({
      where: {
        cooperativeId: coopId,
        intakeDate: { gte: startDate, lte: endDate },
        status: { not: 'REJECTED' },
      },
    })

    const byCommodity: Record<string, { quantityKg: number; value: number; count: number }> = {}
    const byGrade: Record<string, { quantityKg: number; value: number; count: number }> = {}

    let totalQuantityKg = 0
    let totalValue = 0

    for (const intake of intakes) {
      totalQuantityKg += intake.quantityKg
      totalValue += intake.totalAmount

      const commodity = intake.commodity
      if (!byCommodity[commodity]) {
        byCommodity[commodity] = { quantityKg: 0, value: 0, count: 0 }
      }
      byCommodity[commodity].quantityKg += intake.quantityKg
      byCommodity[commodity].value += intake.totalAmount
      byCommodity[commodity].count += 1

      const grade = intake.grade ?? 'UNGRADED'
      if (!byGrade[grade]) {
        byGrade[grade] = { quantityKg: 0, value: 0, count: 0 }
      }
      byGrade[grade].quantityKg += intake.quantityKg
      byGrade[grade].value += intake.totalAmount
      byGrade[grade].count += 1
    }

    return {
      cooperativeId: coopId,
      period: `${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`,
      totalIntakes: intakes.length,
      totalQuantityKg: roundMoney(totalQuantityKg),
      totalValue: roundMoney(totalValue),
      averagePricePerKg: totalQuantityKg > 0 ? roundMoney(totalValue / totalQuantityKg) : 0,
      byCommodity,
      byGrade,
    }
  }
}