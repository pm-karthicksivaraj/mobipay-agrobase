/**
 * Agrobase V3 — MFI / Bank Loan Engine
 * MobiPay AgroSys Limited
 *
 * MfiEngine manages the full lifecycle of MFI/Bank loans:
 *   Products → Applications → Approval → Disbursement → Repayment → Completion
 *
 * Features:
 *   - 3 amortization methods: FLAT, DECLINING_BALANCE, AMORTIZED
 *   - Grace period support (interest-only during grace months)
 *   - Automatic overdue detection and penalty tracking
 *   - Portfolio-at-Risk (PAR30) calculation
 *   - Optional integration with AccountingEngine for double-entry journals
 *
 * Static class pattern consistent with CarbonCreditsEngine, EscrowEngine.
 */

import { db } from '@/lib/db'
import { roundMoney } from '@/lib/payments/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return roundMoney(n)
}

/** Get the last day of a given month */
function lastDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/**
 * Add N months to a date, keeping the same day-of-month.
 * If the day exceeds the last day of the target month, clamp to last day.
 */
function addMonths(base: Date, months: number): Date {
  const d = new Date(base)
  const targetDay = d.getDate()
  d.setMonth(d.getMonth() + months)
  const maxDay = lastDayOfMonth(d)
  d.setDate(Math.min(targetDay, maxDay))
  // Preserve time
  d.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds())
  return d
}

// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------

export interface CreateLoanProductInput {
  name: string
  description?: string
  partnerId?: string
  interestRateType?: 'FLAT' | 'DECLINING_BALANCE' | 'AMORTIZED'
  interestRate: number
  maxAmount: number
  minAmount?: number
  maxDurationMonths: number
  gracePeriodMonths?: number
  latePaymentPenalty?: number
  processingFeePercent?: number
  insuranceFeePercent?: number
  collateralRequired?: boolean
  requiredDocuments?: string
}

export interface ApplyForLoanInput {
  loanProductId: string
  farmerId?: string
  applicantName: string
  applicantPhone: string
  amount: number
  durationMonths?: number
  purpose?: string
  collateralDetails?: string
  documents?: string
}

export interface ApproveLoanInput {
  approvedBy: string
  approvedAmount?: number
}

export interface RejectLoanInput {
  rejectedBy: string
  reason: string
}

export interface DisburseLoanInput {
  disbursedBy: string
}

export interface RecordRepaymentInput {
  loanId: string
  scheduleId?: string
  amount: number
  paymentMethod?: string
  referenceNumber?: string
  receivedBy?: string
  notes?: string
}

export interface CreatePartnerInput {
  name: string
  partnerType: string
  code?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  country?: string
  apiEndpoint?: string
  maxExposure?: number
  interestRateSpread?: number
}

export interface LoanListOptions {
  status?: string
  partnerId?: string
  farmerId?: string
  page?: number
  pageSize?: number
}

export interface ProductListOptions {
  partnerId?: string
  isActive?: boolean
  page?: number
  pageSize?: number
}

export interface PartnerListOptions {
  partnerType?: string
  isActive?: boolean
}

export interface PortfolioSummary {
  totalDisbursed: number
  totalRepaid: number
  totalOutstanding: number
  totalOverdue: number
  activeLoans: number
  avgInterestRate: number
  par30: number
  loansByStatus: Record<string, number>
  loansByProduct: Record<string, number>
  expectedRepayments: number
}

// ---------------------------------------------------------------------------
// Schedule Generation Types (internal)
// ---------------------------------------------------------------------------

interface ScheduleRow {
  installmentNumber: number
  dueDate: Date
  principalDue: number
  interestDue: number
  totalDue: number
}

// ---------------------------------------------------------------------------
// MfiEngine
// ---------------------------------------------------------------------------

export class MfiEngine {

  // ========================================================================
  // LOAN PRODUCTS
  // ========================================================================

  /**
   * Create a new MFI loan product.
   */
  static async createLoanProduct(tenantId: string, data: CreateLoanProductInput) {
    const product = await db.mfiLoanProduct.create({
      data: {
        tenantId,
        partnerId: data.partnerId ?? null,
        name: data.name,
        description: data.description ?? null,
        interestRateType: data.interestRateType ?? 'FLAT',
        interestRate: data.interestRate,
        maxAmount: data.maxAmount,
        minAmount: data.minAmount ?? null,
        maxDurationMonths: data.maxDurationMonths,
        gracePeriodMonths: data.gracePeriodMonths ?? 0,
        latePaymentPenalty: data.latePaymentPenalty ?? null,
        processingFeePercent: data.processingFeePercent ?? null,
        insuranceFeePercent: data.insuranceFeePercent ?? null,
        collateralRequired: data.collateralRequired ?? false,
        requiredDocuments: data.requiredDocuments ?? null,
      },
    })
    return product
  }

  /**
   * List MFI loan products with optional filters and pagination.
   */
  static async listLoanProducts(tenantId: string, options?: ProductListOptions) {
    const page = options?.page ?? 1
    const pageSize = options?.pageSize ?? 20
    const where: Record<string, unknown> = { tenantId }
    if (options?.partnerId !== undefined) where.partnerId = options.partnerId
    if (options?.isActive !== undefined) where.isActive = options.isActive

    const [items, total] = await Promise.all([
      db.mfiLoanProduct.findMany({
        where,
        include: { partner: { select: { id: true, name: true, partnerType: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.mfiLoanProduct.count({ where }),
    ])

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  /**
   * Get a single loan product by ID.
   */
  static async getLoanProduct(id: string, tenantId: string) {
    const product = await db.mfiLoanProduct.findFirst({
      where: { id, tenantId },
      include: { partner: { select: { id: true, name: true, partnerType: true } } },
    })
    if (!product) throw new Error(`MFI loan product ${id} not found`)
    return product
  }

  /**
   * Update an MFI loan product.
   */
  static async updateLoanProduct(id: string, tenantId: string, data: Partial<CreateLoanProductInput>) {
    const existing = await db.mfiLoanProduct.findFirst({ where: { id, tenantId } })
    if (!existing) throw new Error(`MFI loan product ${id} not found`)

    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'name', 'description', 'partnerId', 'interestRateType', 'interestRate',
      'maxAmount', 'minAmount', 'maxDurationMonths', 'gracePeriodMonths',
      'latePaymentPenalty', 'processingFeePercent', 'insuranceFeePercent',
      'collateralRequired', 'requiredDocuments', 'isActive',
    ] as const
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        (updateData as Record<string, unknown>)[key] = data[key] === undefined ? null : data[key]
      }
    }

    return db.mfiLoanProduct.update({
      where: { id },
      data: updateData,
    })
  }

  // ========================================================================
  // LOAN APPLICATIONS
  // ========================================================================

  /**
   * Submit a new MFI loan application.
   */
  static async applyForLoan(tenantId: string, data: ApplyForLoanInput) {
    // Validate product exists and is active
    const product = await db.mfiLoanProduct.findFirst({
      where: { id: data.loanProductId, tenantId, isActive: true },
    })
    if (!product) throw new Error(`MFI loan product ${data.loanProductId} not found or inactive`)

    // Validate amount within product limits
    if (Number(data.amount) > Number(product.maxAmount)) {
      throw new Error(`Amount ${data.amount} exceeds product maximum ${product.maxAmount}`)
    }
    if (product.minAmount !== null && Number(data.amount) < Number(product.minAmount)) {
      throw new Error(`Amount ${data.amount} is below product minimum ${product.minAmount}`)
    }

    // Use requested duration or product max
    const durationMonths = data.durationMonths ?? product.maxDurationMonths
    if (durationMonths > product.maxDurationMonths) {
      throw new Error(`Duration ${durationMonths} months exceeds product maximum ${product.maxDurationMonths} months`)
    }

    const loan = await db.mfiLoan.create({
      data: {
        tenantId,
        partnerId: product.partnerId,
        loanProductId: product.id,
        farmerId: data.farmerId ?? null,
        applicantName: data.applicantName,
        applicantPhone: data.applicantPhone,
        amount: data.amount,
        interestRate: product.interestRate,
        durationMonths,
        gracePeriodMonths: product.gracePeriodMonths,
        purpose: data.purpose ?? null,
        collateralDetails: data.collateralDetails ?? null,
        documents: data.documents ?? null,
        status: 'PENDING',
      },
    })
    return loan
  }

  /**
   * List MFI loans with optional filters and pagination.
   */
  static async listLoans(tenantId: string, options?: LoanListOptions) {
    const page = options?.page ?? 1
    const pageSize = options?.pageSize ?? 20
    const where: Record<string, unknown> = { tenantId }
    if (options?.status) where.status = options.status
    if (options?.partnerId) where.partnerId = options.partnerId
    if (options?.farmerId) where.farmerId = options.farmerId

    const [items, total] = await Promise.all([
      db.mfiLoan.findMany({
        where,
        include: {
          loanProduct: { select: { id: true, name: true } },
          partner: { select: { id: true, name: true, partnerType: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.mfiLoan.count({ where }),
    ])

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  /**
   * Get a single MFI loan with schedule and repayment history.
   */
  static async getLoan(id: string, tenantId: string) {
    const loan = await db.mfiLoan.findFirst({
      where: { id, tenantId },
      include: {
        loanProduct: { select: { id: true, name: true, interestRateType: true } },
        partner: { select: { id: true, name: true, partnerType: true } },
        schedule: { orderBy: { installmentNumber: 'asc' } },
        repayments: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!loan) throw new Error(`MFI loan ${id} not found`)
    return loan
  }

  // ========================================================================
  // APPROVAL
  // ========================================================================

  /**
   * Approve a loan. Moves PENDING or UNDER_REVIEW → APPROVED.
   * Optionally adjust the approved amount.
   */
  static async approveLoan(loanId: string, tenantId: string, data: ApproveLoanInput) {
    const loan = await db.mfiLoan.findFirst({
      where: { id: loanId, tenantId },
      include: { loanProduct: true, partner: true },
    })
    if (!loan) throw new Error(`MFI loan ${loanId} not found`)

    if (!['PENDING', 'UNDER_REVIEW'].includes(loan.status)) {
      throw new Error(`Cannot approve loan in ${loan.status} status`)
    }

    const approvedAmount = data.approvedAmount ?? loan.amount

    if (approvedAmount > loan.amount) {
      throw new Error(`Approved amount ${approvedAmount} cannot exceed applied amount ${loan.amount}`)
    }
    if (approvedAmount > loan.loanProduct.maxAmount) {
      throw new Error(`Approved amount ${approvedAmount} exceeds product maximum ${loan.loanProduct.maxAmount}`)
    }
    if (loan.loanProduct.minAmount !== null && approvedAmount < loan.loanProduct.minAmount) {
      throw new Error(`Approved amount ${approvedAmount} is below product minimum ${loan.loanProduct.minAmount}`)
    }

    const updated = await db.mfiLoan.update({
      where: { id: loanId },
      data: {
        status: 'APPROVED',
        approvedAmount,
        approvedAt: new Date(),
        approvedBy: data.approvedBy,
      },
    })

    return updated
  }

  /**
   * Reject a loan. Moves to REJECTED status.
   */
  static async rejectLoan(loanId: string, tenantId: string, data: RejectLoanInput) {
    const loan = await db.mfiLoan.findFirst({
      where: { id: loanId, tenantId },
    })
    if (!loan) throw new Error(`MFI loan ${loanId} not found`)

    if (!['PENDING', 'UNDER_REVIEW'].includes(loan.status)) {
      throw new Error(`Cannot reject loan in ${loan.status} status`)
    }

    return db.mfiLoan.update({
      where: { id: loanId },
      data: {
        status: 'REJECTED',
        rejectionReason: data.reason,
      },
    })
  }

  // ========================================================================
  // DISBURSEMENT
  // ========================================================================

  /**
   * Disburse an approved loan. Moves APPROVED → DISBURSED.
   * Generates the amortization schedule.
   * Updates partner exposure if a partner is linked.
   */
  static async disburseLoan(loanId: string, tenantId: string, data: DisburseLoanInput) {
    const loan = await db.mfiLoan.findFirst({
      where: { id: loanId, tenantId },
      include: { loanProduct: true, partner: true },
    })
    if (!loan) throw new Error(`MFI loan ${loanId} not found`)

    if (loan.status !== 'APPROVED') {
      throw new Error(`Cannot disburse loan in ${loan.status} status. Must be APPROVED.`)
    }

    const disbursedAmount = loan.approvedAmount ?? loan.amount
    const disbursedAt = new Date()

    // Generate amortization schedule
    const scheduleRows = MfiEngine.generateAmortizationSchedule({
      amount: Number(disbursedAmount),
      interestRate: Number(loan.interestRate),
      durationMonths: loan.durationMonths,
      gracePeriodMonths: loan.gracePeriodMonths,
      interestRateType: loan.loanProduct.interestRateType,
      disbursedAt,
    })

    const totalRepayment = round2(scheduleRows.reduce((sum, r) => sum + r.totalDue, 0))
    const totalInterest = round2(scheduleRows.reduce((sum, r) => sum + r.interestDue, 0))

    // Create schedule entries in a transaction
    const updated = await db.$transaction(async (tx) => {
      // Update loan
      const updatedLoan = await tx.mfiLoan.update({
        where: { id: loanId },
        data: {
          status: 'DISBURSED',
          approvedAmount: disbursedAmount,
          disbursedAt,
          disbursedBy: data.disbursedBy,
          totalRepayment,
          totalInterest,
          outstandingBalance: disbursedAmount,
          nextPaymentDate: scheduleRows.length > 0 ? scheduleRows[0].dueDate : null,
        },
      })

      // Create schedule entries
      if (scheduleRows.length > 0) {
        await tx.mfiLoanSchedule.createMany({
          data: scheduleRows.map((row) => ({
            tenantId: loan.tenantId,
            loanId,
            installmentNumber: row.installmentNumber,
            dueDate: row.dueDate,
            principalDue: row.principalDue,
            interestDue: row.interestDue,
            penaltyDue: 0,
            totalDue: row.totalDue,
          })),
        })
      }

      // Update partner exposure if partner exists
      if (loan.partnerId) {
        await tx.mfiPartner.update({
          where: { id: loan.partnerId },
          data: { currentExposure: { increment: disbursedAmount } },
        })
      }

      return updatedLoan
    })

    return updated
  }

  // ========================================================================
  // AMORTIZATION SCHEDULE GENERATION (private)
  // ========================================================================

  /**
   * Generate an amortization schedule based on interest rate type.
   *
   * FLAT: total interest = P × r × T / 12, each installment = (P + I) / n
   * DECLINING_BALANCE: interest = outstanding × r / 12, principal = P / n
   * AMORTIZED: standard equal-total-payment formula
   *
   * Grace period: during grace months, only interest is due (principal = 0).
   */
  private static generateAmortizationSchedule(loan: {
    amount: number
    interestRate: number
    durationMonths: number
    gracePeriodMonths: number
    interestRateType: string
    disbursedAt: Date
  }): ScheduleRow[] {
    const { amount, interestRate, durationMonths, gracePeriodMonths, interestRateType, disbursedAt } = loan
    const monthlyRate = interestRate / 100 / 12
    const schedule: ScheduleRow[] = []

    switch (interestRateType) {
      case 'FLAT': {
        // Total interest = principal × annual_rate × months / 12
        const totalInterest = round2(amount * (interestRate / 100) * durationMonths / 12)
        const totalPayment = round2(amount + totalInterest)
        const monthlyPayment = round2(totalPayment / durationMonths)

        // During grace period: interest-only = totalInterest / durationMonths
        // After grace: (principal + remaining interest) / remaining months
        // Simpler approach: flat interest means equal installments, grace = interest only
        const interestPerMonth = round2(totalInterest / durationMonths)
        const principalAfterGrace = durationMonths > gracePeriodMonths
          ? round2(amount / (durationMonths - gracePeriodMonths))
          : 0

        for (let i = 1; i <= durationMonths; i++) {
          const dueDate = addMonths(disbursedAt, i)
          const isGrace = i <= gracePeriodMonths
          const principalDue = isGrace ? 0 : principalAfterGrace
          const interestDue = interestPerMonth
          schedule.push({
            installmentNumber: i,
            dueDate,
            principalDue: round2(principalDue),
            interestDue: round2(interestDue),
            totalDue: round2(principalDue + interestDue),
          })
        }
        break
      }

      case 'DECLINING_BALANCE': {
        // Principal portion is equal each month: P / n
        const monthlyPrincipal = round2(amount / durationMonths)
        let remainingBalance = amount

        for (let i = 1; i <= durationMonths; i++) {
          const dueDate = addMonths(disbursedAt, i)
          const isGrace = i <= gracePeriodMonths
          const interestDue = round2(remainingBalance * monthlyRate)
          const principalDue = isGrace ? 0 : monthlyPrincipal
          const totalDue = round2(principalDue + interestDue)

          if (!isGrace) {
            remainingBalance = round2(remainingBalance - principalDue)
          }

          schedule.push({
            installmentNumber: i,
            dueDate,
            principalDue: round2(principalDue),
            interestDue: round2(interestDue),
            totalDue: round2(totalDue),
          })
        }
        break
      }

      case 'AMORTIZED': {
        // Standard amortization: equal total payments (PMT formula)
        // PMT = P × r × (1+r)^n / ((1+r)^n - 1)
        // During grace: interest-only payments, then amortize over remaining months

        if (monthlyRate === 0) {
          // Zero interest: equal principal payments
          const monthlyPrincipal = round2(amount / durationMonths)
          for (let i = 1; i <= durationMonths; i++) {
            const dueDate = addMonths(disbursedAt, i)
            const isGrace = i <= gracePeriodMonths
            const principalDue = isGrace ? 0 : monthlyPrincipal
            schedule.push({
              installmentNumber: i,
              dueDate,
              principalDue: round2(principalDue),
              interestDue: 0,
              totalDue: round2(principalDue),
            })
          }
          break
        }

        if (gracePeriodMonths === 0) {
          // Standard amortization, no grace
          const factor = Math.pow(1 + monthlyRate, durationMonths)
          const pmt = round2(amount * monthlyRate * factor / (factor - 1))

          let remainingBalance = amount
          for (let i = 1; i <= durationMonths; i++) {
            const dueDate = addMonths(disbursedAt, i)
            const interestDue = round2(remainingBalance * monthlyRate)
            const principalDue = round2(pmt - interestDue)
            remainingBalance = round2(remainingBalance - principalDue)

            schedule.push({
              installmentNumber: i,
              dueDate,
              principalDue: round2(principalDue),
              interestDue: round2(interestDue),
              totalDue: round2(pmt),
            })
          }
          // Adjust last installment to eliminate rounding drift
          if (schedule.length > 0) {
            const last = schedule[schedule.length - 1]
            last.principalDue = round2(last.principalDue + remainingBalance)
            last.totalDue = round2(last.principalDue + last.interestDue)
          }
        } else {
          // With grace period: interest-only during grace, then amortize remaining
          let remainingBalance = amount

          // Grace period installments (interest only)
          for (let i = 1; i <= gracePeriodMonths; i++) {
            const dueDate = addMonths(disbursedAt, i)
            const interestDue = round2(remainingBalance * monthlyRate)
            schedule.push({
              installmentNumber: i,
              dueDate,
              principalDue: 0,
              interestDue: round2(interestDue),
              totalDue: round2(interestDue),
            })
          }

          // Amortized installments after grace
          const remainingMonths = durationMonths - gracePeriodMonths
          const factor = Math.pow(1 + monthlyRate, remainingMonths)
          const pmt = round2(remainingBalance * monthlyRate * factor / (factor - 1))

          for (let i = gracePeriodMonths + 1; i <= durationMonths; i++) {
            const dueDate = addMonths(disbursedAt, i)
            const interestDue = round2(remainingBalance * monthlyRate)
            const principalDue = round2(pmt - interestDue)
            remainingBalance = round2(remainingBalance - principalDue)

            schedule.push({
              installmentNumber: i,
              dueDate,
              principalDue: round2(principalDue),
              interestDue: round2(interestDue),
              totalDue: round2(pmt),
            })
          }
          // Adjust last installment
          if (schedule.length > 0) {
            const last = schedule[schedule.length - 1]
            last.principalDue = round2(last.principalDue + remainingBalance)
            last.totalDue = round2(last.principalDue + last.interestDue)
          }
        }
        break
      }

      default:
        throw new Error(`Unsupported interest rate type: ${interestRateType}`)
    }

    return schedule
  }

  // ========================================================================
  // REPAYMENT
  // ========================================================================

  /**
   * Record a repayment against an MFI loan.
   *
   * Allocation order: interest first, then penalty, then principal.
   * Overpayment rolls to next schedule item.
   * Auto-detects overdue schedules and marks loan status accordingly.
   * Creates accounting journal entry if AccountingEngine is available.
   */
  static async recordRepayment(tenantId: string, data: RecordRepaymentInput) {
    const loan = await db.mfiLoan.findFirst({
      where: { id: data.loanId, tenantId },
      include: {
        loanProduct: true,
        partner: true,
        schedule: { orderBy: { installmentNumber: 'asc' } },
      },
    })
    if (!loan) throw new Error(`MFI loan ${data.loanId} not found`)

    if (!['DISBURSED', 'OVERDUE'].includes(loan.status)) {
      throw new Error(`Cannot record repayment for loan in ${loan.status} status`)
    }

    let remaining = data.amount
    const paymentAllocations: {
      scheduleId: string
      principalPaid: number
      interestPaid: number
      penaltyPaid: number
    }[] = []

    // Determine starting schedule item
    let startIdx: number
    if (data.scheduleId) {
      startIdx = loan.schedule.findIndex((s) => s.id === data.scheduleId)
      if (startIdx === -1) throw new Error(`Schedule item ${data.scheduleId} not found for this loan`)
    } else {
      // Find first PENDING or OVERDUE schedule item
      startIdx = loan.schedule.findIndex(
        (s) => s.status === 'PENDING' || s.status === 'OVERDUE' || s.status === 'PARTIAL',
      )
      if (startIdx === -1) throw new Error('No outstanding schedule items found for this loan')
    }

    // Update schedule items with the payment
    for (let i = startIdx; i < loan.schedule.length && remaining > 0.005; i++) {
      const sched = loan.schedule[i]
      if (sched.status === 'PAID') continue

      // Calculate what's still owed
      const interestOwed = round2(Number(sched.interestDue) - Number(sched.interestPaid))
      const penaltyOwed = round2(Number(sched.penaltyDue) - Number(sched.penaltyPaid))
      const principalOwed = round2(Number(sched.principalDue) - Number(sched.principalPaid))

      let interestPaid = 0
      let penaltyPaid = 0
      let principalPaid = 0

      // 1. Pay interest first
      if (remaining > 0.005 && interestOwed > 0.005) {
        interestPaid = round2(Math.min(remaining, interestOwed))
        remaining = round2(remaining - interestPaid)
      }

      // 2. Pay penalty next
      if (remaining > 0.005 && penaltyOwed > 0.005) {
        penaltyPaid = round2(Math.min(remaining, penaltyOwed))
        remaining = round2(remaining - penaltyPaid)
      }

      // 3. Pay principal
      if (remaining > 0.005 && principalOwed > 0.005) {
        principalPaid = round2(Math.min(remaining, principalOwed))
        remaining = round2(remaining - principalPaid)
      }

      if (interestPaid === 0 && penaltyPaid === 0 && principalPaid === 0) continue

      paymentAllocations.push({
        scheduleId: sched.id,
        principalPaid,
        interestPaid,
        penaltyPaid,
      })
    }

    if (paymentAllocations.length === 0) {
      throw new Error('No amount could be allocated to outstanding schedule items')
    }

    // Determine totals from allocations
    const totalPrincipal = round2(paymentAllocations.reduce((s, a) => s + a.principalPaid, 0))
    const totalInterest = round2(paymentAllocations.reduce((s, a) => s + a.interestPaid, 0))
    const totalPenalty = round2(paymentAllocations.reduce((s, a) => s + a.penaltyPaid, 0))
    const totalPaid = round2(totalPrincipal + totalInterest + totalPenalty)

    // Use the transaction to update everything atomically
    const result = await db.$transaction(async (tx) => {
      // Update each affected schedule item
      for (const alloc of paymentAllocations) {
        const sched = loan.schedule.find((s) => s.id === alloc.scheduleId)!
        const newPrincipalPaid = round2(Number(sched.principalPaid) + alloc.principalPaid)
        const newInterestPaid = round2(Number(sched.interestPaid) + alloc.interestPaid)
        const newPenaltyPaid = round2(Number(sched.penaltyPaid) + alloc.penaltyPaid)
        const newTotalPaid = round2(newPrincipalPaid + newInterestPaid + newPenaltyPaid)
        const totalDue = round2(Number(sched.principalDue) + Number(sched.interestDue) + Number(sched.penaltyDue))
        const isFullyPaid = newTotalPaid >= totalDue - 0.005

        await tx.mfiLoanSchedule.update({
          where: { id: alloc.scheduleId },
          data: {
            principalPaid: newPrincipalPaid,
            interestPaid: newInterestPaid,
            penaltyPaid: newPenaltyPaid,
            totalPaid: round2(Math.min(newTotalPaid, totalDue)),
            status: isFullyPaid ? 'PAID' : 'PARTIAL',
            paidAt: isFullyPaid ? new Date() : undefined,
          },
        })
      }

      // Calculate new loan totals
      const allSchedules = await tx.mfiLoanSchedule.findMany({
        where: { loanId: data.loanId },
        orderBy: { installmentNumber: 'asc' },
      })

      const newTotalPaid = round2(Number(loan.totalPaid ?? 0) + totalPaid)
      const totalDisbursed = Number(loan.approvedAmount ?? loan.amount)
      const newOutstandingBalance = round2(Math.max(0, totalDisbursed - totalPrincipal - Number(loan.totalPaid ?? 0) + totalInterest + Number(loan.totalPenalty ?? 0)))
      // More accurate: outstanding = sum of remaining (principal + interest + penalty) across all unpaid schedules
      let calcOutstanding = 0
      let allPaid = true
      let anyOverdue = false
      const now = new Date()

      for (const sched of allSchedules) {
        if (sched.status !== 'PAID') {
          allPaid = false
          const remainingPrincipal = round2(Number(sched.principalDue) - Number(sched.principalPaid))
          const remainingInterest = round2(Number(sched.interestDue) - Number(sched.interestPaid))
          const remainingPenalty = round2(Number(sched.penaltyDue) - Number(sched.penaltyPaid))
          calcOutstanding = round2(calcOutstanding + remainingPrincipal + remainingInterest + remainingPenalty)

          // Check if overdue (past due date and not paid)
          if (sched.dueDate < now && sched.status !== 'PAID') {
            anyOverdue = true
            // Mark as OVERDUE if not already
            if (sched.status !== 'OVERDUE') {
              await tx.mfiLoanSchedule.update({
                where: { id: sched.id },
                data: { status: 'OVERDUE' },
              })
            }
          }
        }
      }

      // Determine new loan status
      let newStatus = loan.status
      if (allPaid) {
        newStatus = 'REPAID'
      } else if (anyOverdue) {
        newStatus = 'OVERDUE'
      }

      // Find next payment date
      const nextPending = allSchedules.find(
        (s) => s.status !== 'PAID',
      )
      const nextPaymentDate = nextPending ? nextPending.dueDate : null

      // Update loan
      const updatedLoan = await tx.mfiLoan.update({
        where: { id: data.loanId },
        data: {
          totalPaid: newTotalPaid,
          totalPenalty: round2(Number(loan.totalPenalty ?? 0) + totalPenalty),
          outstandingBalance: calcOutstanding,
          status: newStatus,
          nextPaymentDate,
          completedAt: allPaid ? new Date() : undefined,
        },
      })

      // Create repayment record
      const repayment = await tx.mfiRepayment.create({
        data: {
          tenantId,
          loanId: data.loanId,
          scheduleId: paymentAllocations[0].scheduleId,
          amount: totalPaid,
          principalAmount: totalPrincipal,
          interestAmount: totalInterest,
          penaltyAmount: totalPenalty,
          paymentMethod: data.paymentMethod ?? null,
          referenceNumber: data.referenceNumber ?? null,
          receivedBy: data.receivedBy ?? null,
          notes: data.notes ?? null,
        },
      })

      // Update partner exposure (decrease as principal is repaid)
      if (loan.partnerId && totalPrincipal > 0) {
        await tx.mfiPartner.update({
          where: { id: loan.partnerId },
          data: { currentExposure: { decrement: totalPrincipal } },
        })
      }

      return { updatedLoan, repayment }
    })

    // Attempt accounting journal entry (non-blocking)
    try {
      const mod = await import('@/lib/cooperative/accounting') as unknown as { AccountingEngine: { createJournalEntry: (tenantId: string, entries: Array<{ accountCode: string; entryType: 'DEBIT' | 'CREDIT'; amount: number; description?: string }>, description: string, reference: string, createdBy: string) => Promise<unknown> }, JournalEntryInput: { accountCode: string; entryType: 'DEBIT' | 'CREDIT'; amount: number; description?: string } }
      const { AccountingEngine } = mod
      const entries: Array<{ accountCode: string; entryType: 'DEBIT' | 'CREDIT'; amount: number; description?: string }> = [
        {
          accountCode: '1001', // CASH
          entryType: 'DEBIT',
          amount: totalPaid,
          description: `MFI loan repayment received - Loan ${data.loanId}`,
        },
        {
          accountCode: '1402', // LOAN_RECEIVABLE
          entryType: 'CREDIT',
          amount: totalPrincipal,
          description: `MFI loan principal repayment - Loan ${data.loanId}`,
        },
        {
          accountCode: '4101', // INTEREST_INCOME
          entryType: 'CREDIT',
          amount: totalInterest,
          description: `MFI loan interest income - Loan ${data.loanId}`,
        },
      ]
      if (totalPenalty > 0) {
        entries.push({
          accountCode: '4201', // PENALTY_INCOME
          entryType: 'CREDIT',
          amount: totalPenalty,
          description: `MFI loan penalty income - Loan ${data.loanId}`,
        })
      }
      await AccountingEngine.createJournalEntry(
        tenantId,
        entries,
        `MFI Loan Repayment - Loan ${data.loanId}`,
        `MFI-RPMT-${data.loanId}`,
        data.receivedBy ?? 'system',
      )
    } catch {
      // AccountingEngine not available — skip silently
    }

    return result
  }

  // ========================================================================
  // PORTFOLIO SUMMARY
  // ========================================================================

  /**
   * Get portfolio-level summary statistics for a tenant.
   * Includes PAR30 (portfolio at risk >30 days overdue).
   */
  static async getPortfolioSummary(tenantId: string): Promise<PortfolioSummary> {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Aggregate loans by status
    const loansByStatusRaw = await db.mfiLoan.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    })
    const loansByStatus: Record<string, number> = {}
    for (const row of loansByStatusRaw) {
      loansByStatus[row.status] = row._count.id
    }

    // Aggregate loans by product
    const loansByProductRaw = await db.mfiLoan.groupBy({
      by: ['loanProductId'],
      where: { tenantId },
      _count: { id: true },
      _sum: { amount: true },
    })
    const loansByProduct: Record<string, number> = {}
    for (const row of loansByProductRaw) {
      loansByProduct[row.loanProductId] = row._count.id
    }

    // Disbursed loans stats
    const disbursedLoans = await db.mfiLoan.findMany({
      where: {
        tenantId,
        status: { in: ['DISBURSED', 'OVERDUE', 'REPAID'] },
      },
      select: {
        amount: true,
        status: true,
        approvedAmount: true,
        totalPaid: true,
        totalInterest: true,
        totalPenalty: true,
        interestRate: true,
        schedule: {
          select: {
            principalDue: true,
            interestDue: true,
            penaltyDue: true,
            principalPaid: true,
            interestPaid: true,
            penaltyPaid: true,
            status: true,
            dueDate: true,
          },
        },
      },
    })

    let totalDisbursed = 0
    let totalRepaid = 0
    let totalOutstanding = 0
    let totalOverdue = 0
    let totalInterestRate = 0
    let activeLoans = 0
    let par30Numerator = 0 // Outstanding principal on loans >30 days overdue
    let par30Denominator = 0 // Total outstanding principal
    let expectedRepayments = 0

    for (const loan of disbursedLoans) {
      const disbursed = Number(loan.approvedAmount ?? loan.amount)
      totalDisbursed = round2(totalDisbursed + disbursed)
      totalRepaid = round2(totalRepaid + Number(loan.totalPaid ?? 0))
      totalInterestRate += Number(loan.interestRate)

      if (loan.status === 'DISBURSED' || loan.status === 'OVERDUE') {
        activeLoans++
      }

      // Calculate outstanding from schedule
      let loanOutstanding = 0
      let loanOverdue = 0

      for (const sched of loan.schedule) {
        if (sched.status !== 'PAID') {
          const remPrincipal = round2(Number(sched.principalDue) - Number(sched.principalPaid))
          const remInterest = round2(Number(sched.interestDue) - Number(sched.interestPaid))
          const remPenalty = round2(Number(sched.penaltyDue) - Number(sched.penaltyPaid))
          const schedOutstanding = round2(remPrincipal + remInterest + remPenalty)
          loanOutstanding = round2(loanOutstanding + schedOutstanding)

          if (sched.dueDate < now && sched.status !== 'PAID') {
            loanOverdue = round2(loanOverdue + schedOutstanding)

            // PAR30: principal outstanding on schedules >30 days overdue
            if (sched.dueDate < thirtyDaysAgo) {
              par30Numerator = round2(par30Numerator + remPrincipal)
            }
            par30Denominator = round2(par30Denominator + remPrincipal)
          }

          // Expected repayments in next 30 days
          if (sched.dueDate >= now && sched.dueDate <= thirtyDaysFromNow) {
            expectedRepayments = round2(expectedRepayments + schedOutstanding)
          }
        }
      }

      totalOutstanding = round2(totalOutstanding + loanOutstanding)
      totalOverdue = round2(totalOverdue + loanOverdue)
    }

    const avgInterestRate = disbursedLoans.length > 0
      ? round2(totalInterestRate / disbursedLoans.length)
      : 0

    const par30 = par30Denominator > 0 ? round2(par30Numerator / par30Denominator * 100) : 0

    return {
      totalDisbursed: round2(totalDisbursed),
      totalRepaid: round2(totalRepaid),
      totalOutstanding: round2(totalOutstanding),
      totalOverdue: round2(totalOverdue),
      activeLoans,
      avgInterestRate,
      par30,
      loansByStatus,
      loansByProduct,
      expectedRepayments: round2(expectedRepayments),
    }
  }

  // ========================================================================
  // MFI PARTNERS
  // ========================================================================

  /**
   * Create a new MFI partner.
   */
  static async createPartner(tenantId: string, data: CreatePartnerInput) {
    return db.mfiPartner.create({
      data: {
        tenantId,
        name: data.name,
        partnerType: data.partnerType,
        code: data.code ?? null,
        contactName: data.contactName ?? null,
        contactEmail: data.contactEmail ?? null,
        contactPhone: data.contactPhone ?? null,
        address: data.address ?? null,
        country: data.country ?? null,
        apiEndpoint: data.apiEndpoint ?? null,
        maxExposure: data.maxExposure ?? null,
        interestRateSpread: data.interestRateSpread ?? null,
      },
    })
  }

  /**
   * List MFI partners with optional filters.
   */
  static async listPartners(tenantId: string, options?: PartnerListOptions) {
    const where: Record<string, unknown> = { tenantId }
    if (options?.partnerType) where.partnerType = options.partnerType
    if (options?.isActive !== undefined) where.isActive = options.isActive

    return db.mfiPartner.findMany({
      where,
      include: {
        _count: { select: { loans: true, loanProducts: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get a single MFI partner by ID.
   */
  static async getPartner(id: string, tenantId: string) {
    const partner = await db.mfiPartner.findFirst({
      where: { id, tenantId },
      include: {
        loanProducts: { select: { id: true, name: true, isActive: true } },
        _count: { select: { loans: true } },
      },
    })
    if (!partner) throw new Error(`MFI partner ${id} not found`)
    return partner
  }

  /**
   * Update an MFI partner.
   */
  static async updatePartner(id: string, tenantId: string, data: Partial<CreatePartnerInput & { isActive: boolean }>) {
    const existing = await db.mfiPartner.findFirst({ where: { id, tenantId } })
    if (!existing) throw new Error(`MFI partner ${id} not found`)

    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'name', 'partnerType', 'code', 'contactName', 'contactEmail',
      'contactPhone', 'address', 'country', 'apiEndpoint', 'apiKey',
      'maxExposure', 'interestRateSpread', 'metadata', 'isActive',
    ] as const
    for (const key of allowedFields) {
      if ((data as Record<string, unknown>)[key] !== undefined) {
        updateData[key] = (data as Record<string, unknown>)[key]
      }
    }

    return db.mfiPartner.update({
      where: { id },
      data: updateData,
    })
  }

  /**
   * Increment or decrement a partner's current exposure.
   * Delta can be positive (increase) or negative (decrease).
   * Ensures exposure never goes below zero.
   */
  static async updatePartnerExposure(partnerId: string, tenantId: string, delta: number) {
    const partner = await db.mfiPartner.findFirst({
      where: { id: partnerId, tenantId },
    })
    if (!partner) throw new Error(`MFI partner ${partnerId} not found`)

    const newExposure = round2(Number(partner.currentExposure) + delta)
    if (newExposure < 0) {
      throw new Error(
        `Cannot reduce exposure below zero. Current: ${partner.currentExposure}, Delta: ${delta}`,
      )
    }

    // Check against max exposure
    if (partner.maxExposure !== null && newExposure > Number(partner.maxExposure)) {
      throw new Error(
        `Exposure ${newExposure} would exceed maximum ${partner.maxExposure}`,
      )
    }

    return db.mfiPartner.update({
      where: { id: partnerId },
      data: { currentExposure: newExposure },
    })
  }
}