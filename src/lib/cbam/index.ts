// ============================================
// AGROBASE V3 — CBAM Engine Wrapper
//
// Provides a unified interface for CBAM operations:
//   - Report generation & persistence
//   - Report lifecycle (DRAFT → SUBMITTED → VERIFIED → REJECTED)
//   - Calculation management
//   - Scheduling
//   - Export (XML, CSV)
//
// Delegates to:
//   - CarbonCalculator for emission calculations
//   - reporting.ts for report generation, XML/CSV export, validation
//   - cn-codes.ts for CN code mapping
// ============================================

import { db } from '@/lib/db'
import {
  generateCBAMReport,
  getTenantEmissionsSummary,
  exportCBAMXml,
  exportCBAMCsv,
  validateCBAMSubmission,
  scheduleReportGeneration,
  getScheduledReports,
  triggerScheduledReport,
} from '@/lib/carbon/reporting'
import { getCnCode, getCnCodesForCommodity, getCommodityCbamInfo } from './cn-codes'
import type { CbamReportData, EmissionsSummary, ValidationResult, ReportFrequency } from '@/lib/carbon/types'

// ============================================================
// Types
// ============================================================

export interface PersistedReport {
  id: string
  tenantId: string
  reportingPeriod: string
  status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED'
  totalEmissions: number
  totalQuantity: number
  totalCertificateCost: number
  netCost: number
  commodityCount: number
  validationScore: number
  xmlData: string | null
  csvData: string | null
  reportData: string           // JSON-serialized CbamReportData
  submittedBy: string | null
  submittedAt: Date | null
  verifiedBy: string | null
  verifiedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ReportGenerateOptions {
  period: string
  autoValidate?: boolean
  autoExportXml?: boolean
  autoExportCsv?: boolean
}

export interface ReportListOptions {
  page?: number
  pageSize?: number
  status?: string
  period?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ReportListResult {
  data: PersistedReport[]
  total: number
  page: number
  totalPages: number
}

// ============================================================
// CBAM Engine
// ============================================================

export class CbamEngine {

  // ─────────────────────────────────────────────
  // Report Generation & Persistence
  // ─────────────────────────────────────────────

  /**
   * Generate a CBAM report for a tenant and persist it.
   */
  static async generateReport(
    tenantId: string,
    options: ReportGenerateOptions,
  ): Promise<PersistedReport> {
    // Generate the report data using the reporting engine
    const reportData = await generateCBAMReport(tenantId, options.period)

    // Validate if requested
    let validationScore = 100
    let validationErrors: string[] = []
    if (options.autoValidate) {
      const validation = validateCBAMSubmission(reportData)
      validationScore = validation.score
      validationErrors = validation.errors.map((e) => e.message)
    }

    // Generate exports if requested
    const xmlData = options.autoExportXml ? exportCBAMXml(reportData) : null
    const csvData = options.autoExportCsv ? exportCBAMCsv(reportData) : null

    // Persist to CbamReport table
    const commodityNames = reportData.commodities.map((c) => c.commodity)
    for (const comp of reportData.commodities) {
      await db.cbamReport.create({
        data: {
          tenantId,
          reportingPeriod: options.period,
          commodity: comp.commodity,
          quantityTonnes: comp.quantityTonnes,
          embeddedEmissions: comp.embeddedEmissionsTco2PerTonne,
          totalEmissions: comp.totalEmbeddedEmissions,
          carbonCredits: comp.creditsApplied,
          status: validationScore >= 80 ? 'DRAFT' : 'DRAFT',
        },
      })
    }

    // Also create a CbamCalculation as the aggregated summary
    const calculation = await db.cbamCalculation.create({
      data: {
        tenantId,
        commodity: 'AGGREGATE',
        originCountry: reportData.commodities[0]?.originCountry ?? 'UG',
        quantityTonnes: reportData.totalQuantity,
        embeddedEmissionsPerTonne: reportData.weightedAverageEmbedded,
        totalEmbeddedEmissions: reportData.totalEmissions,
        euCarbonPrice: reportData.commodities[0]?.euCarbonPrice ?? 80,
        cbamCertificateCost: reportData.totalCertificateCost,
        carbonCreditsApplied: reportData.totalCreditsApplied,
        netCost: reportData.netCost,
        reportingPeriod: options.period,
        status: 'DRAFT',
      },
    })

    // Return a unified persisted report object
    // (In production, this would be a dedicated CbamReportSnapshot model)
    return {
      id: calculation.id,
      tenantId,
      reportingPeriod: options.period,
      status: 'DRAFT',
      totalEmissions: reportData.totalEmissions,
      totalQuantity: reportData.totalQuantity,
      totalCertificateCost: reportData.totalCertificateCost,
      netCost: reportData.netCost,
      commodityCount: reportData.commodities.length,
      validationScore,
      xmlData,
      csvData,
      reportData: JSON.stringify(reportData),
      submittedBy: null,
      submittedAt: null,
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: validationErrors.length > 0 ? validationErrors.join('; ') : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  /**
   * Generate a report and return raw data without persisting.
   */
  static async generateReportPreview(
    tenantId: string,
    period: string,
  ): Promise<CbamReportData> {
    return generateCBAMReport(tenantId, period)
  }

  // ─────────────────────────────────────────────
  // Report Lifecycle
  // ─────────────────────────────────────────────

  /**
   * Submit a CBAM report (DRAFT → SUBMITTED).
   */
  static async submitReport(
    calculationId: string,
    submittedBy: string,
  ): Promise<{ success: boolean; message: string }> {
    const calculation = await db.cbamCalculation.findUnique({
      where: { id: calculationId },
    })

    if (!calculation) {
      throw new Error(`CBAM calculation ${calculationId} not found`)
    }

    if (calculation.status !== 'DRAFT') {
      throw new Error(`Cannot submit report in status: ${calculation.status}. Only DRAFT reports can be submitted.`)
    }

    await db.cbamCalculation.update({
      where: { id: calculationId },
      data: {
        status: 'SUBMITTED',
      },
    })

    // Also update linked CbamReport records
    await db.cbamReport.updateMany({
      where: {
        tenantId: calculation.tenantId,
        reportingPeriod: calculation.reportingPeriod,
        status: 'DRAFT',
      },
      data: {
        status: 'SUBMITTED',
        submittedBy,
        submittedAt: new Date(),
      },
    })

    return {
      success: true,
      message: `CBAM report ${calculationId} submitted successfully for period ${calculation.reportingPeriod}`,
    }
  }

  /**
   * Verify a CBAM report (SUBMITTED → VERIFIED).
   */
  static async verifyReport(
    calculationId: string,
    verifiedBy: string,
  ): Promise<{ success: boolean; message: string }> {
    const calculation = await db.cbamCalculation.findUnique({
      where: { id: calculationId },
    })

    if (!calculation) {
      throw new Error(`CBAM calculation ${calculationId} not found`)
    }

    if (calculation.status !== 'SUBMITTED') {
      throw new Error(`Cannot verify report in status: ${calculation.status}. Only SUBMITTED reports can be verified.`)
    }

    await db.cbamCalculation.update({
      where: { id: calculationId },
      data: {
        status: 'VERIFIED',
      },
    })

    await db.cbamReport.updateMany({
      where: {
        tenantId: calculation.tenantId,
        reportingPeriod: calculation.reportingPeriod,
        status: 'SUBMITTED',
      },
      data: {
        status: 'VERIFIED',
        verifiedBy,
        verifiedAt: new Date(),
      },
    })

    return {
      success: true,
      message: `CBAM report ${calculationId} verified successfully`,
    }
  }

  /**
   * Reject a CBAM report (SUBMITTED → REJECTED).
   */
  static async rejectReport(
    calculationId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<{ success: boolean; message: string }> {
    const calculation = await db.cbamCalculation.findUnique({
      where: { id: calculationId },
    })

    if (!calculation) {
      throw new Error(`CBAM calculation ${calculationId} not found`)
    }

    if (calculation.status !== 'SUBMITTED') {
      throw new Error(`Cannot reject report in status: ${calculation.status}. Only SUBMITTED reports can be rejected.`)
    }

    await db.cbamCalculation.update({
      where: { id: calculationId },
      data: {
        status: 'REJECTED',
      },
    })

    await db.cbamReport.updateMany({
      where: {
        tenantId: calculation.tenantId,
        reportingPeriod: calculation.reportingPeriod,
        status: 'SUBMITTED',
      },
      data: {
        status: 'REJECTED',
        verifiedBy: rejectedBy,
        verifiedAt: new Date(),
      },
    })

    return {
      success: true,
      message: `CBAM report ${calculationId} rejected: ${reason}`,
    }
  }

  // ─────────────────────────────────────────────
  // Report Retrieval
  // ─────────────────────────────────────────────

  /**
   * Get a list of CBAM reports (calculations) for a tenant.
   */
  static async listReports(
    tenantId: string,
    options: ReportListOptions = {},
  ): Promise<ReportListResult> {
    const page = options.page ?? 1
    const pageSize = options.pageSize ?? 20
    const sortBy = (options.sortBy ?? 'createdAt') as string
    const sortOrder = options.sortOrder ?? 'desc'

    const where: Record<string, unknown> = { tenantId }
    if (options.status) where.status = options.status
    if (options.period) where.reportingPeriod = options.period

    // Only show aggregate rows or individual commodity rows
    const [data, total] = await Promise.all([
      db.cbamCalculation.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          cbamReport: { select: { id: true, reportingPeriod: true, status: true } },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      db.cbamCalculation.count({ where }),
    ])

    // Map to PersistedReport format
    const mapped: PersistedReport[] = data.map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      reportingPeriod: c.reportingPeriod,
      status: c.status as PersistedReport['status'],
      totalEmissions: c.totalEmbeddedEmissions,
      totalQuantity: c.quantityTonnes,
      totalCertificateCost: c.cbamCertificateCost,
      netCost: c.netCost,
      commodityCount: 1,
      validationScore: 100,
      xmlData: null,
      csvData: null,
      reportData: JSON.stringify(c),
      submittedBy: null,
      submittedAt: null,
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))

    return {
      data: mapped,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * Get a single CBAM calculation by ID.
   */
  static async getCalculation(id: string) {
    return db.cbamCalculation.findUnique({
      where: { id },
      include: {
        cbamReport: true,
        tenant: { select: { name: true, country: true } },
      },
    })
  }

  /**
   * Get a CBAM report for a specific period (all commodity calculations).
   */
  static async getReportByPeriod(
    tenantId: string,
    period: string,
  ) {
    const calculations = await db.cbamCalculation.findMany({
      where: { tenantId, reportingPeriod: period },
      orderBy: { createdAt: 'desc' },
    })

    const reports = await db.cbamReport.findMany({
      where: { tenantId, reportingPeriod: period },
      orderBy: { createdAt: 'desc' },
    })

    return {
      period,
      calculations,
      reports,
      summary: {
        totalCalculations: calculations.length,
        totalReports: reports.length,
        totalEmissions: calculations.reduce((s, c) => s + c.totalEmbeddedEmissions, 0),
        totalCost: calculations.reduce((s, c) => s + c.cbamCertificateCost, 0),
      },
    }
  }

  // ─────────────────────────────────────────────
  // Export
  // ─────────────────────────────────────────────

  /**
   * Generate XML export for a CBAM report period.
   */
  static async exportReportXml(
    tenantId: string,
    period: string,
  ): Promise<string> {
    const reportData = await generateCBAMReport(tenantId, period)
    return exportCBAMXml(reportData)
  }

  /**
   * Generate CSV export for a CBAM report period.
   */
  static async exportReportCsv(
    tenantId: string,
    period: string,
  ): Promise<string> {
    const reportData = await generateCBAMReport(tenantId, period)
    return exportCBAMCsv(reportData)
  }

  /**
   * Validate a CBAM report for a period.
   */
  static async validateReport(
    tenantId: string,
    period: string,
  ): Promise<ValidationResult> {
    const reportData = await generateCBAMReport(tenantId, period)
    return validateCBAMSubmission(reportData)
  }

  // ─────────────────────────────────────────────
  // Emissions Summary
  // ─────────────────────────────────────────────

  /**
   * Get emissions summary for a tenant for a given year.
   */
  static async getEmissionsSummary(
    tenantId: string,
    year: number,
  ): Promise<EmissionsSummary> {
    return getTenantEmissionsSummary(tenantId, year)
  }

  // ─────────────────────────────────────────────
  // Scheduling
  // ─────────────────────────────────────────────

  /**
   * Schedule automatic CBAM report generation.
   */
  static scheduleAutoGeneration(
    tenantId: string,
    frequency: ReportFrequency,
  ): void {
    scheduleReportGeneration(tenantId, frequency)
  }

  /**
   * Get all scheduled report configurations.
   */
  static getSchedules(): Array<{ tenantId: string; frequency: ReportFrequency; lastRun: Date | null }> {
    return getScheduledReports()
  }

  /**
   * Trigger a scheduled report generation manually.
   */
  static async triggerScheduled(
    tenantId: string,
    period: string,
  ): Promise<CbamReportData | null> {
    return triggerScheduledReport(tenantId, period)
  }

  // ─────────────────────────────────────────────
  // CN Code Lookup
  // ─────────────────────────────────────────────

  /**
   * Get CN code for a commodity.
   */
  static getCnCode(commodity: string): string {
    return getCnCode(commodity)
  }

  /**
   * Get CBAM info for a list of commodities.
   */
  static getCommodityCbamInfo(commodities: string[]) {
    return getCommodityCbamInfo(commodities)
  }

  // ─────────────────────────────────────────────
  // Update Calculation Status
  // ─────────────────────────────────────────────

  /**
   * Update the status of a CBAM calculation.
   */
  static async updateCalculationStatus(
    id: string,
    status: string,
  ) {
    return db.cbamCalculation.update({
      where: { id },
      data: { status },
    })
  }

  /**
   * Delete a CBAM calculation (only DRAFT status allowed).
   */
  static async deleteCalculation(id: string) {
    const calc = await db.cbamCalculation.findUnique({ where: { id } })
    if (!calc) throw new Error('CBAM calculation not found')
    if (calc.status !== 'DRAFT') {
      throw new Error(`Cannot delete CBAM calculation in status: ${calc.status}. Only DRAFT calculations can be deleted.`)
    }
    return db.cbamCalculation.delete({ where: { id } })
  }
}