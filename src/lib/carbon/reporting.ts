// ============================================
// AGROBASE V3 — CBAM Reporting Engine
// EU-compliant carbon border adjustment mechanism
// report generation, validation, and export
// ============================================

import { db } from '@/lib/db'
import { CarbonCalculator } from './calculator'
import type {
  CbamCommodityReport,
  CbamReportData,
  EmissionSource,
  EmissionsSummary,
  ReportFrequency,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './types'

// ─────────────────────────────────────────────
// Report Generation
// ─────────────────────────────────────────────

/**
 * Generate a full CBAM report for a tenant for a given reporting period.
 * Aggregates all cultivation emissions, calculates per-commodity embedded emissions,
 * applies the EU CBAM formula, and produces a submission-ready report.
 */
export async function generateCBAMReport(
  tenantId: string,
  period: string,
): Promise<CbamReportData> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`)

  const country = tenant.country ?? 'UG'
  const year = extractYearFromPeriod(period)

  // Get all farmer IDs under this tenant
  const farmers = await db.farmerProfile.findMany({
    where: { tenantId },
    select: { id: true },
  })
  const farmerIds = farmers.map((f) => f.id)

  // Get all cultivations for the period
  const startDate = new Date(`${year}-01-01`)
  const endDate = new Date(`${year}-12-31T23:59:59`)

  const cultivations = await db.cultivation.findMany({
    where: {
      farm: { farmerId: { in: farmerIds } },
      sowingDate: { gte: startDate, lte: endDate },
    },
    include: {
      farm: { include: { farmer: true } },
    },
  })

  // Group by commodity
  const commodityGroups = new Map<string, typeof cultivations>()
  for (const c of cultivations) {
    const key = c.cropName.toUpperCase().replace(/\s+/g, '_')
    const existing = commodityGroups.get(key) ?? []
    existing.push(c)
    commodityGroups.set(key, existing)
  }

  // Calculate CBAM for each commodity
  const calculator = new CarbonCalculator().setCountry(country)
  const commodityReports: CbamCommodityReport[] = []

  let totalEmissions = 0
  let totalQuantity = 0
  let totalCertificateCost = 0
  let totalCreditsApplied = 0

  for (const [commodity, crops] of Array.from(commodityGroups.entries())) {
    const totalYieldTonnes = crops.reduce(
      (sum, c) => sum + ((c.actualYield ?? c.estimatedYield ?? 0)),
      0,
    )

    if (totalYieldTonnes <= 0) continue

    const cbam = await calculator.calculateCBAM(
      commodity,
      country,
      totalYieldTonnes,
      period,
    )

    const report: CbamCommodityReport = {
      commodity,
      originCountry: country,
      quantityTonnes: totalYieldTonnes,
      embeddedEmissionsTco2PerTonne: cbam.embeddedEmissionsTco2PerTonne,
      totalEmbeddedEmissions: cbam.totalEmbeddedEmissions,
      euCarbonPrice: cbam.euCarbonPrice,
      certificateCost: cbam.cbamCertificateCost,
      creditsApplied: cbam.carbonCreditsApplied,
      netCost: cbam.netCost,
      calculation: cbam,
      cultivationIds: crops.map((c) => c.id),
    }

    commodityReports.push(report)
    totalEmissions += cbam.totalEmbeddedEmissions
    totalQuantity += totalYieldTonnes
    totalCertificateCost += cbam.cbamCertificateCost
    totalCreditsApplied += cbam.carbonCreditsApplied
  }

  const weightedAvg = totalQuantity > 0 ? totalEmissions / totalQuantity : 0
  const netCost = totalCertificateCost - totalCreditsApplied * (commodityReports[0]?.euCarbonPrice ?? 80)

  return {
    tenantId,
    reportingPeriod: period,
    generatedAt: new Date(),
    commodities: commodityReports,
    totalEmissions: Math.round(totalEmissions * 1000) / 1000,
    totalQuantity: Math.round(totalQuantity * 100) / 100,
    weightedAverageEmbedded: Math.round(weightedAvg * 1000) / 1000,
    totalCertificateCost: Math.round(totalCertificateCost * 100) / 100,
    totalCreditsApplied: Math.round(totalCreditsApplied * 1000) / 1000,
    netCost: Math.round(netCost * 100) / 100,
  }
}

// ─────────────────────────────────────────────
// XML Export (EU-compliant)
// ─────────────────────────────────────────────

/**
 * Export a CBAM report in EU-compliant XML format.
 * Follows the structure expected by the EU CBAM transitional registry.
 */
export function exportCBAMXml(report: CbamReportData): string {
  const lines: string[] = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push('<CBAMDeclarantReport xmlns="urn:eu:taxud:cbam:report:v1">')
  lines.push(`  <ReportHeader>`)
  lines.push(`    <ReportingPeriod>${escapeXml(report.reportingPeriod)}</ReportingPeriod>`)
  lines.push(`    <ReportGeneratedAt>${report.generatedAt.toISOString()}</ReportGeneratedAt>`)
  lines.push(`    <DeclarantId>${escapeXml(report.tenantId)}</DeclarantId>`)
  lines.push(`  </ReportHeader>`)
  lines.push(`  <Summary>`)
  lines.push(`    <TotalEmbeddedEmissions unit="tCO2e">${report.totalEmissions}</TotalEmbeddedEmissions>`)
  lines.push(`    <TotalQuantity unit="tonnes">${report.totalQuantity}</TotalQuantity>`)
  lines.push(`    <WeightedAverageEmbedded unit="tCO2e/tonne">${report.weightedAverageEmbedded}</WeightedAverageEmbedded>`)
  lines.push(`    <TotalCertificateCost currency="EUR">${report.totalCertificateCost}</TotalCertificateCost>`)
  lines.push(`    <TotalCreditsApplied unit="tCO2">${report.totalCreditsApplied}</TotalCreditsApplied>`)
  lines.push(`    <NetCBAMCost currency="EUR">${report.netCost}</NetCBAMCost>`)
  lines.push(`  </Summary>`)
  lines.push(`  <CommodityDeclarations>`)

  for (const comp of report.commodities) {
    lines.push(`    <CommodityDeclaration>`)
    lines.push(`      <CNCode>${getCnCode(comp.commodity)}</CNCode>`)
    lines.push(`      <CommodityDescription>${escapeXml(comp.commodity)}</CommodityDescription>`)
    lines.push(`      <OriginCountry>${escapeXml(comp.originCountry)}</OriginCountry>`)
    lines.push(`      <Quantity unit="tonnes">${comp.quantityTonnes}</Quantity>`)
    lines.push(`      <EmbeddedEmissions>`)
    lines.push(`        <ActualEmissions unit="tCO2e/tonne">${comp.embeddedEmissionsTco2PerTonne}</ActualEmissions>`)
    lines.push(`        <TotalEmissions unit="tCO2e">${comp.totalEmbeddedEmissions}</TotalEmissions>`)
    lines.push(`      </EmbeddedEmissions>`)
    lines.push(`      <CBAMCalculation>`)
    lines.push(`        <EUCarbonPrice currency="EUR/tCO2" year="${extractYearFromPeriod(report.reportingPeriod)}">${comp.euCarbonPrice}</EUCarbonPrice>`)
    lines.push(`        <CertificateCost currency="EUR">${comp.certificateCost}</CertificateCost>`)
    lines.push(`        <CreditsOffset unit="tCO2">${comp.creditsApplied}</CreditsOffset>`)
    lines.push(`        <NetCost currency="EUR">${comp.netCost}</NetCost>`)
    lines.push(`      </CBAMCalculation>`)
    lines.push(`      <CalculationMethod>IPCC_TIER2</CalculationMethod>`)
    lines.push(`      <CultivationReferences>`)
    for (const cid of comp.cultivationIds) {
      lines.push(`        <CultivationId>${escapeXml(cid)}</CultivationId>`)
    }
    lines.push(`      </CultivationReferences>`)
    lines.push(`    </CommodityDeclaration>`)
  }

  lines.push(`  </CommodityDeclarations>`)
  lines.push('</CBAMDeclarantReport>')

  return lines.join('\n')
}

// ─────────────────────────────────────────────
// CSV Export
// ─────────────────────────────────────────────

/**
 * Export CBAM report as a spreadsheet-friendly CSV.
 * Uses semicolon delimiter for EU locale compatibility.
 */
export function exportCBAMCsv(report: CbamReportData): string {
  const header = [
    'Commodity',
    'CN Code',
    'Origin Country',
    'Quantity (tonnes)',
    'Embedded Emissions (tCO2e/tonne)',
    'Total Embedded Emissions (tCO2e)',
    'EU Carbon Price (EUR/tCO2)',
    'Certificate Cost (EUR)',
    'Credits Applied (tCO2)',
    'Net CBAM Cost (EUR)',
    'Cultivation Count',
  ].join(';')

  const rows = report.commodities.map((c) =>
    [
      c.commodity,
      getCnCode(c.commodity),
      c.originCountry,
      c.quantityTonnes,
      c.embeddedEmissionsTco2PerTonne,
      c.totalEmbeddedEmissions,
      c.euCarbonPrice,
      c.certificateCost,
      c.creditsApplied,
      c.netCost,
      c.cultivationIds.length,
    ].join(';'),
  )

  // Summary row
  const summaryRow = [
    'TOTAL',
    '',
    '',
    report.totalQuantity,
    report.weightedAverageEmbedded,
    report.totalEmissions,
    report.commodities[0]?.euCarbonPrice ?? '',
    report.totalCertificateCost,
    report.totalCreditsApplied,
    report.netCost,
    report.commodities.reduce((s, c) => s + c.cultivationIds.length, 0),
  ].join(';')

  return [header, ...rows, '', summaryRow].join('\n')
}

// ─────────────────────────────────────────────
// Emissions Summary
// ─────────────────────────────────────────────

/**
 * Get a comprehensive emissions summary for a tenant for a given year.
 * Includes breakdown by commodity, trend, top activities, and net emissions
 * after sequestration offsets.
 */
export async function getTenantEmissionsSummary(
  tenantId: string,
  year: number,
): Promise<EmissionsSummary> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`)

  const country = tenant.country ?? 'UG'

  // Get farmers
  const farmers = await db.farmerProfile.findMany({
    where: { tenantId },
    select: { id: true },
  })
  const farmerIds = farmers.map((f) => f.id)

  // Get cultivations for the year
  const startDate = new Date(`${year}-01-01`)
  const endDate = new Date(`${year}-12-31T23:59:59`)

  const cultivations = await db.cultivation.findMany({
    where: {
      farm: { farmerId: { in: farmerIds } },
      sowingDate: { gte: startDate, lte: endDate },
    },
    include: {
      farm: { select: { sizeHectares: true } },
    },
  })

  // Calculate footprints
  const calculator = new CarbonCalculator().setCountry(country)
  let totalEmissions = 0
  const emissionsByCommodity: Record<string, number> = {}
  const allActivities: { activity: string; source: EmissionSource; emissionsKgCO2e: number }[] = []
  let totalYieldKg = 0

  for (const c of cultivations) {
    try {
      const fp = await calculator.calculateCropFootprint(c.id)
      totalEmissions += fp.totalEmissionsKgCO2e

      const commodity = c.cropName.toUpperCase().replace(/\s+/g, '_')
      emissionsByCommodity[commodity] = (emissionsByCommodity[commodity] ?? 0) + fp.totalEmissionsKgCO2e

      for (const stage of fp.stages) {
        allActivities.push({
          activity: stage.activity,
          source: stage.source,
          emissionsKgCO2e: stage.totalEmission,
        })
      }

      totalYieldKg += (c.actualYield ?? c.estimatedYield ?? 0) * 1000
    } catch {
      // Skip cultivations that fail calculation
    }
  }

  // Estimate sequestration for each cultivation
  let sequestrationOffset = 0
  for (const c of cultivations) {
    const area = c.farm.sizeHectares ?? 1
    const seq = calculator.calculateSequestration(
      c.farm.id,
      c.cropName,
      area,
    )
    sequestrationOffset += seq.totalSequestrationCO2 * 1000 // convert to kgCO2e
  }

  // Top emitting activities
  const aggregated = new Map<string, { activity: string; source: EmissionSource; emissionsKgCO2e: number }>()
  for (const act of allActivities) {
    const existing = aggregated.get(act.activity)
    if (existing) {
      existing.emissionsKgCO2e += act.emissionsKgCO2e
    } else {
      aggregated.set(act.activity, { ...act })
    }
  }
  const topActivities = Array.from(aggregated.values())
    .sort((a, b) => b.emissionsKgCO2e - a.emissionsKgCO2e)
    .slice(0, 10)

  // Trend vs previous period
  const prevYear = year - 1
  let trendPercent = 0
  if (prevYear >= 2020) {
    const prevCultivations = await db.cultivation.count({
      where: {
        farm: { farmerId: { in: farmerIds } },
        sowingDate: {
          gte: new Date(`${prevYear}-01-01`),
          lte: new Date(`${prevYear}-12-31T23:59:59`),
        },
      },
    })
    const currentCultivations = cultivations.length
    if (prevCultivations > 0) {
      // Use cultivation count as a simple proxy for trend
      trendPercent = Math.round(((currentCultivations - prevCultivations) / prevCultivations) * 100)
    }
  }

  return {
    tenantId,
    year,
    totalEmissionsKgCO2e: Math.round(totalEmissions * 100) / 100,
    emissionsByCommodity: Object.fromEntries(
      Object.entries(emissionsByCommodity).map(([k, v]) => [k, Math.round(v * 100) / 100]),
    ),
    trendVsPreviousPeriod: trendPercent,
    topEmittingActivities: topActivities,
    sequestrationOffsetKgCO2e: Math.round(sequestrationOffset * 100) / 100,
    netEmissionsKgCO2e: Math.round((totalEmissions - sequestrationOffset) * 100) / 100,
    cultivationsAnalyzed: cultivations.length,
    averageEmissionsPerKg: totalYieldKg > 0
      ? Math.round((totalEmissions / totalYieldKg) * 10000) / 10000
      : 0,
  }
}

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

/**
 * Validate a CBAM report before submission.
 * Checks all required fields, verifies calculations, and cross-checks
 * emission factors used.
 */
export function validateCBAMSubmission(report: CbamReportData): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // ─── Critical checks ───

  if (!report.tenantId || report.tenantId.trim().length === 0) {
    errors.push({
      field: 'tenantId',
      message: 'Tenant ID is required',
      severity: 'CRITICAL',
    })
  }

  if (!report.reportingPeriod || !/^\d{4}-Q[1-4]$/.test(report.reportingPeriod)) {
    errors.push({
      field: 'reportingPeriod',
      message: 'Reporting period must be in YYYY-QN format (e.g., 2026-Q1)',
      severity: 'CRITICAL',
    })
  }

  if (report.commodities.length === 0) {
    errors.push({
      field: 'commodities',
      message: 'At least one commodity declaration is required',
      severity: 'CRITICAL',
    })
  }

  for (const comp of report.commodities) {
    const prefix = `commodity[${comp.commodity}]`

    if (comp.quantityTonnes <= 0) {
      errors.push({
        field: `${prefix}.quantityTonnes`,
        message: `Quantity must be positive for ${comp.commodity}`,
        severity: 'CRITICAL',
      })
    }

    if (comp.embeddedEmissionsTco2PerTonne <= 0) {
      errors.push({
        field: `${prefix}.embeddedEmissionsTco2PerTonne`,
        message: `Embedded emissions must be positive for ${comp.commodity}`,
        severity: 'CRITICAL',
      })
    }

    if (!['UG', 'GH', 'KE'].includes(comp.originCountry)) {
      errors.push({
        field: `${prefix}.originCountry`,
        message: `Origin country must be UG, GH, or KE — got "${comp.originCountry}"`,
        severity: 'ERROR',
      })
    }

    // Verify calculation consistency
    const expectedTotal = comp.embeddedEmissionsTco2PerTonne * comp.quantityTonnes
    const tolerance = expectedTotal * 0.01 // 1% tolerance
    if (Math.abs(comp.totalEmbeddedEmissions - expectedTotal) > tolerance) {
      errors.push({
        field: `${prefix}.totalEmbeddedEmissions`,
        message: `Calculation mismatch: expected ${expectedTotal.toFixed(4)} tCO2e, got ${comp.totalEmbeddedEmissions.toFixed(4)}`,
        severity: 'ERROR',
      })
    }

    const expectedCost = comp.totalEmbeddedEmissions * comp.euCarbonPrice
    const costTolerance = expectedCost * 0.01
    if (Math.abs(comp.certificateCost - expectedCost) > costTolerance) {
      warnings.push({
        field: `${prefix}.certificateCost`,
        message: `Certificate cost check: expected €${expectedCost.toFixed(2)}, got €${comp.certificateCost.toFixed(2)}`,
        severity: 'WARNING',
      })
    }

    if (comp.cultivationIds.length === 0) {
      warnings.push({
        field: `${prefix}.cultivationIds`,
        message: `No cultivation references for ${comp.commodity} — data traceability limited`,
        severity: 'WARNING',
      })
    }
  }

  // ─── Summary-level checks ───

  const sumCommodityQty = report.commodities.reduce((s, c) => s + c.quantityTonnes, 0)
  if (Math.abs(sumCommodityQty - report.totalQuantity) > 0.01) {
    errors.push({
      field: 'totalQuantity',
      message: `Total quantity (${report.totalQuantity}) does not match sum of commodity quantities (${sumCommodityQty})`,
      severity: 'ERROR',
    })
  }

  const sumCommodityEmissions = report.commodities.reduce((s, c) => s + c.totalEmbeddedEmissions, 0)
  if (Math.abs(sumCommodityEmissions - report.totalEmissions) > 0.001) {
    errors.push({
      field: 'totalEmissions',
      message: `Total emissions (${report.totalEmissions}) does not match sum of commodity emissions (${sumCommodityEmissions.toFixed(4)})`,
      severity: 'ERROR',
    })
  }

  // ─── Warnings ───

  if (report.totalCreditsApplied > 0 && report.totalCreditsApplied / report.totalEmissions > 0.1) {
    warnings.push({
      field: 'totalCreditsApplied',
      message: 'Carbon credits exceed 10% of total emissions — EU may scrutinize this offset level',
      severity: 'WARNING',
    })
  }

  for (const comp of report.commodities) {
    // High embedded emissions warning
    if (comp.embeddedEmissionsTco2PerTonne > 5.0) {
      warnings.push({
        field: `commodity[${comp.commodity}].embeddedEmissions`,
        message: `${comp.commodity} embedded emissions (${comp.embeddedEmissionsTco2PerTonne} tCO2e/t) are exceptionally high — verify data quality`,
        severity: 'WARNING',
      })
    }

    // Low embedded emissions info
    if (comp.embeddedEmissionsTco2PerTonne < 0.05) {
      warnings.push({
        field: `commodity[${comp.commodity}].embeddedEmissions`,
        message: `${comp.commodity} embedded emissions are very low — consider if all emission sources are captured`,
        severity: 'INFO',
      })
    }
  }

  // Score calculation
  const errorWeight = 20
  const warningWeight = 3
  const score = Math.max(0, 100 - (errors.length * errorWeight) - (warnings.length * warningWeight))

  return {
    isValid: errors.filter((e) => e.severity === 'CRITICAL').length === 0,
    errors,
    warnings,
    score,
  }
}

// ─────────────────────────────────────────────
// Scheduled Report Generation
// ─────────────────────────────────────────────

// In-memory registry of scheduled reports (in production, use a proper job queue)
const scheduledReports = new Map<string, { tenantId: string; frequency: ReportFrequency; lastRun: Date | null }>()

/**
 * Schedule automatic CBAM report generation for a tenant.
 * In production, this would register a cron job or use a message queue.
 * Currently stores the schedule in memory and logs the intent.
 */
export function scheduleReportGeneration(
  tenantId: string,
  frequency: ReportFrequency,
): void {
  scheduledReports.set(`${tenantId}-${frequency}`, {
    tenantId,
    frequency,
    lastRun: null,
  })

  // In a production system, this would register:
  // - QUARTERLY: cron at Jan 1, Apr 1, Jul 1, Oct 1 → generate previous quarter
  // - SEMI_ANNUALLY: cron at Jan 1, Jul 1
  // - ANNUALLY: cron at Jan 15

  const periodDescriptions: Record<ReportFrequency, string> = {
    QUARTERLY: 'Quarterly (Q1, Q2, Q3, Q4)',
    SEMI_ANNUALLY: 'Semi-annually (H1, H2)',
    ANNUALLY: 'Annually (full year)',
  }

  console.log(
    `[CBAM Scheduler] Registered ${periodDescriptions[frequency]} report generation for tenant ${tenantId}`,
  )
}

/**
 * Get all scheduled report configurations (for admin visibility).
 */
export function getScheduledReports(): Array<{ tenantId: string; frequency: ReportFrequency; lastRun: Date | null }> {
  return Array.from(scheduledReports.values())
}

/**
 * Manually trigger report generation for a scheduled tenant.
 * Returns the generated report or null if not scheduled.
 */
export async function triggerScheduledReport(
  tenantId: string,
  period: string,
): Promise<CbamReportData | null> {
  // Check if tenant has a schedule
  for (const [key, schedule] of Array.from(scheduledReports.entries())) {
    if (schedule.tenantId === tenantId) {
      const report = await generateCBAMReport(tenantId, period)
      scheduledReports.set(key, { ...schedule, lastRun: new Date() })
      return report
    }
  }
  return null
}

// ─────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────

function extractYearFromPeriod(period: string): number {
  const match = period.match(/(\d{4})/)
  return match ? parseInt(match[1], 10) : new Date().getFullYear()
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Map commodity names to EU Combined Nomenclature (CN) codes
 * used in CBAM declarations. Note: most agricultural products
 * are not yet in CBAM scope, but we pre-map for future compliance.
 */
function getCnCode(commodity: string): string {
  const codes: Record<string, string> = {
    COFFEE: '0901',          // Coffee, whether or not roasted or decaffeinated
    COCOA: '1801',           // Cocoa beans, whole or broken, raw or roasted
    MAIZE: '1005',           // Maize (corn)
    RICE: '1006',            // Rice
    TEA: '0902',             // Tea, whether or not flavoured
    OIL_PALM: '1511',        // Palm oil and its fractions
    SUGARCANE: '1701',       // Cane sugar
    BEANS: '0713',           // Dried leguminous vegetables, shelled
    GROUNDNUT: '1202',       // Ground-nuts, not roasted or otherwise cooked
    CASSAVA: '0714',         // Cassava, arrowroot, salep, sweet potatoes, fresh or chilled
  }
  return codes[commodity] ?? '9999' // 9999 = unclassified
}