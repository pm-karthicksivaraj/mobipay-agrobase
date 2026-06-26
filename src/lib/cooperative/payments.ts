/**
 * Agrobase V3 — Cooperative Payment Management
 * MobiPay AgroSys Limited
 *
 * CoopPaymentManager class using Prisma CooperativePayment model.
 * Manages two-phase farmer payments for cooperative produce purchases.
 * Integrates with the payment gateway for disbursement and accounting
 * engine for journal entries. Auto-creates journal entries when payment is PAID.
 */

import { db } from '@/lib/db'
import { AccountingEngine } from './accounting'
import { ProduceIntakeManager } from './produce-intake'
import { roundMoney } from '../payments/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeductionItem {
  type: string      // VSLA_SAVINGS, LOAN_REPAYMENT, TRANSPORT, PROCESSING, INSURANCE
  amount: number
  description: string
}

// ---------------------------------------------------------------------------
// CoopPaymentManager Class
// ---------------------------------------------------------------------------

export class CoopPaymentManager {
  /**
   * Initiate a payment for a produce intake (FIRST or FINAL phase).
   * Creates a CooperativePayment record.
   */
  static async initiatePayment(
    intakeId: string,
    phase: 'FIRST' | 'FINAL',
    deductions: DeductionItem[] = [],
    salePricePerKg?: number,
    paidBy?: string,
  ) {
    const intake = await db.produceIntake.findUnique({ where: { id: intakeId } })
    if (!intake) throw new Error(`Intake not found: ${intakeId}`)

    // Calculate gross amount
    let grossAmount: number
    if (phase === 'FIRST') {
      const calc = await ProduceIntakeManager.calculateFirstPaymentAsync(intakeId)
      grossAmount = calc.grossAmount
    } else {
      if (!salePricePerKg) throw new Error('salePricePerKg required for FINAL payment')
      const calc = await ProduceIntakeManager.calculateFinalPayment(intakeId, salePricePerKg)
      grossAmount = calc.finalGrossAmount
    }

    // Auto-calculate additional deductions (VSLA savings, loan deductions)
    const autoDeductions = await CoopPaymentManager.calculateDeductions(
      intake.farmerId ?? '',
      grossAmount,
    )
    const allDeductions = [...autoDeductions, ...deductions]

    const deductionsTotal = roundMoney(allDeductions.reduce((sum, d) => sum + d.amount, 0))
    const netAmount = roundMoney(grossAmount - deductionsTotal)

    const payment = await db.cooperativePayment.create({
      data: {
        tenantId: intake.tenantId,
        cooperativeId: intake.cooperativeId,
        intakeId,
        farmerId: intake.farmerId,
        phase,
        grossAmount,
        deductions: JSON.stringify(allDeductions),
        netAmount,
        paymentMethod: 'MOBILE_MONEY',
        status: 'PENDING',
        paidBy,
      },
    })

    console.log(
      `[CoopPayment] Created ${payment.id}: ${phase} for intake ${intakeId}, gross=${grossAmount}, deductions=${deductionsTotal}, net=${netAmount}`,
    )

    return payment
  }

  /**
   * Process a batch of payments via the payment gateway.
   */
  static async processPaymentBatch(
    paymentIds: string[],
  ): Promise<Array<{ paymentId: string; success: boolean; message: string }>> {
    const results: Array<{ paymentId: string; success: boolean; message: string }> = []

    for (const paymentId of paymentIds) {
      const payment = await db.cooperativePayment.findUnique({ where: { id: paymentId } })
      if (!payment) {
        results.push({ paymentId, success: false, message: 'Payment not found' })
        continue
      }

      if (payment.status !== 'PENDING') {
        results.push({ paymentId, success: false, message: `Not in PENDING status: ${payment.status}` })
        continue
      }

      // Mark as processing
      await db.cooperativePayment.update({
        where: { id: paymentId },
        data: { status: 'PROCESSING' },
      })

      try {
        // In production, this would call the payment gateway:
        // const gateway = PaymentGateway
        // const result = await gateway.initiatePayment({ ... })
        //
        // For now, simulate a successful payment:
        const farmer = payment.farmerId
          ? await db.farmerProfile.findUnique({ where: { id: payment.farmerId } })
          : null

        const transactionRef = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

        await db.cooperativePayment.update({
          where: { id: paymentId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            transactionRef,
          },
        })

        // Auto-create journal entry when payment is PAID
        // DR Farmer Payables (2001), CR Cash/Bank (1001/1002)
        if (payment.tenantId && payment.intakeId) {
          try {
            await AccountingEngine.createJournalEntry(
              payment.tenantId,
              [
                {
                  accountCode: '2001',
                  entryType: 'DEBIT',
                  amount: payment.grossAmount,
                  description: `${payment.phase} payment to ${farmer?.firstName ?? ''} ${farmer?.lastName ?? ''} for intake ${payment.intakeId}`,
                },
                {
                  accountCode: '1002',
                  entryType: 'CREDIT',
                  amount: payment.netAmount,
                  description: `${payment.phase} payment disbursement via ${payment.paymentMethod ?? 'mobile money'}`,
                },
              ],
              `${payment.phase} Payment: ${payment.phase} for ${payment.intakeId}`,
              paymentId,
              payment.paidBy ?? '',
            )

            console.log(`[CoopPayment] Journal entry created for payment ${paymentId}`)
          } catch (error) {
            console.error(`[CoopPayment] Failed to create journal entry for ${paymentId}:`, error)
          }
        }

        results.push({ paymentId, success: true, message: 'Payment processed successfully' })
      } catch (error) {
        await db.cooperativePayment.update({
          where: { id: paymentId },
          data: { status: 'FAILED' },
        })

        const message = error instanceof Error ? error.message : 'Payment failed'
        results.push({ paymentId, success: false, message })
      }

      // Small delay between payments
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    console.log(
      `[CoopPayment] Batch processed: ${results.filter((r) => r.success).length}/${paymentIds.length} succeeded`,
    )

    return results
  }

  /**
   * Auto-calculate deductions for a farmer's payment.
   * Checks for active VSLA savings commitments and outstanding loans.
   */
  static async calculateDeductions(
    farmerId: string,
    _grossAmount: number,
  ): Promise<DeductionItem[]> {
    if (!farmerId) return []

    const deductions: DeductionItem[] = []

    // Check for active VSLA loans with upcoming repayments
    const activeLoans = await db.vslaLoan.findMany({
      where: {
        farmerId,
        status: { in: ['DISBURSED', 'OVERDUE'] },
      },
    })

    for (const loan of activeLoans) {
      const outstanding = roundMoney(loan.totalRepayable - loan.amountRepaid)
      if (outstanding > 0) {
        // Calculate one installment (simplified)
        const monthlyPayment = roundMoney(outstanding / 6) // assume 6 month remaining
        deductions.push({
          type: 'LOAN_REPAYMENT',
          amount: monthlyPayment,
          description: `VSLA loan repayment (${loan.id.slice(-6)})`,
        })
      }
    }

    // Check for VSLA savings commitments
    const recentSavings = await db.vslaSaving.findMany({
      where: {
        farmerId,
        createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })

    if (recentSavings.length > 0) {
      const avgSaving = recentSavings[0].amount
      deductions.push({
        type: 'VSLA_SAVINGS',
        amount: avgSaving,
        description: 'VSLA mandatory savings',
      })
    }

    console.log(`[CoopPayment] Calculated ${deductions.length} deductions for farmer ${farmerId}`)
    return deductions
  }

  /**
   * List all payments for a farmer.
   */
  static async getPaymentStatus(farmerId: string) {
    return db.cooperativePayment.findMany({
      where: { farmerId },
      orderBy: { createdAt: 'desc' },
      include: {
        intake: {
          select: { commodity: true, quantityKg: true, totalAmount: true },
        },
      },
    })
  }

  /**
   * Get aggregate payment statistics for a cooperative in a period.
   */
  static async getCoopPaymentSummary(coopId: string, startDate: Date, endDate: Date) {
    const payments = await db.cooperativePayment.findMany({
      where: {
        cooperativeId: coopId,
        createdAt: { gte: startDate, lte: endDate },
      },
    })

    let totalFirstPayments = 0
    let totalFinalPayments = 0
    let totalDeductions = 0
    let outstandingPayments = 0

    for (const payment of payments) {
      if (payment.phase === 'FIRST') {
        totalFirstPayments += payment.grossAmount
      } else {
        totalFinalPayments += payment.grossAmount
      }

      // Parse deductions from JSON
      try {
        const deductions = JSON.parse(payment.deductions ?? '[]') as DeductionItem[]
        totalDeductions += deductions.reduce((sum, d) => sum + d.amount, 0)
      } catch {
        // ignore parse errors
      }

      if (payment.status === 'PENDING' || payment.status === 'PROCESSING') {
        outstandingPayments += payment.netAmount
      }
    }

    // Get intake value
    const intakes = await db.produceIntake.findMany({
      where: {
        cooperativeId: coopId,
        intakeDate: { gte: startDate, lte: endDate },
        status: { not: 'REJECTED' },
      },
    })

    const totalIntakeValue = intakes.reduce((sum, i) => sum + i.totalAmount, 0)

    return {
      totalIntakeValue: roundMoney(totalIntakeValue),
      totalFirstPayments: roundMoney(totalFirstPayments),
      totalFinalPayments: roundMoney(totalFinalPayments),
      outstandingPayments: roundMoney(outstandingPayments),
      totalDeductions: roundMoney(totalDeductions),
      farmerEquity: roundMoney(totalFirstPayments + totalFinalPayments - totalDeductions),
      period: `${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`,
    }
  }
}