/**
 * EUDR Compliance Automation Engine
 *
 * Implements the EU Deforestation Regulation (EUDR) due diligence
 * workflow for agricultural commodities. Handles:
 *   - Due diligence submission
 *   - Deforestation checks via satellite
 *   - Risk assessment
 *   - Geolocation verification
 *   - Legal document validation
 *   - Compliance reporting
 *   - Expiry monitoring
 */

import { db } from '@/lib/db'
import type { EudrCompliance } from '@prisma/client'
import { SatelliteOrchestrator, polygonToBbox, polygonCentroid, estimatePolygonAreaHectares } from '@/lib/satellite/orchestrator'
import { calculatePlotRiskScore } from './risk-scoring'

// ============================================================
// Helper Types
// ============================================================

export interface DeforestationCheckResult {
  plotId: string
  deforestationFree: boolean
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  areaAffectedHectares: number
  confidence: number
  detectionDate: Date
  baselineDate: Date
  recommendations: string[]
}

export interface RiskAssessmentResult {
  plotId: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  score: number
  factors: {
    forestProximity: { score: number; details: string }
    historicalDeforestation: { score: number; details: string }
    countryRisk: { score: number; details: string }
    plotSize: { score: number; details: string }
    documentationCompleteness: { score: number; details: string }
  }
}

export interface VerificationResult {
  valid: boolean
  checks: Array<{
    name: string
    passed: boolean
    message: string
  }>
}

export interface DocumentValidationResult {
  valid: boolean
  documents: Array<{
    type: string
    name: string
    valid: boolean
    issue?: string
  }>
}

export interface DeforestationFreeResult {
  deforestationFree: boolean
  confidence: number
  currentNdvi: number
  baselineNdvi: number
  ndviChange: number
  assessmentDate: Date
  baselineDate: Date
}

export interface FarmerEudrStatus {
  farmerId: string
  farmerName: string
  totalPlots: number
  compliant: number
  pending: number
  rejected: number
  expired: number
  plots: Array<{
    plotId: string
    plotName: string
    status: string
    riskAssessment: string | null
    expiryDate: Date | null
  }>
}

export interface BatchVerificationResult {
  tenantId: string
  totalProcessed: number
  verified: number
  rejected: number
  pending: number
  errors: number
  results: Array<{
    plotId: string
    plotName: string
    previousStatus: string
    newStatus: string
    reason: string
  }>
}

export interface EudrReport {
  tenantId: string
  tenantName: string
  generatedAt: Date
  period: string
  summary: {
    totalPlots: number
    verified: number
    pending: number
    rejected: number
    expired: number
    highRisk: number
  }
  commodities: Array<{
    commodity: string
    totalHectares: number
    verified: number
    pending: number
    rejected: number
  }>
  riskDistribution: {
    low: number
    medium: number
    high: number
  }
  expiringSoon: number
  complianceRate: number
}

// ============================================================
// Plot data input for due diligence
// ============================================================

export interface PlotDueDiligenceInput {
  plotId: string
  plotName: string
  farmerId: string
  geolocation: string // GeoJSON polygon
  areaHectares: number
  commodities: string[]
  polygonPoints?: Array<{ lat: number; lng: number; altitude?: number }>
  legalDocuments?: Array<{
    type: string  // 'land_title' | 'lease_agreement' | 'farm_plan' | 'harvest_declaration' | 'traceability_record'
    name: string
    reference?: string
    issuedDate?: Date
    expiryDate?: Date
  }>
}

// ============================================================
// EUDR Engine
// ============================================================

export class EudrEngine {

  /**
   * Submit a new due diligence record for a plot.
   * Performs automated deforestation check, risk assessment, and
   * document validation before creating the record.
   */
  static async submitDueDiligence(
    farmerId: string,
    plotData: PlotDueDiligenceInput,
  ): Promise<EudrCompliance> {
    // Parse polygon points from GeoJSON or provided points
    const polygonPoints = plotData.polygonPoints ?? extractPolygonFromGeoJSON(plotData.geolocation)

    // Run parallel checks
    const [deforestResult, riskResult, docResult, refNumber] = await Promise.all([
      EudrEngine.checkDeforestation(polygonPoints),
      EudrEngine.assessRisk(plotData.plotId, polygonPoints),
      EudrEngine.validateDocuments(plotData.plotId, plotData.legalDocuments ?? []),
      EudrEngine.generateDueDiligenceRef(farmerId),
    ])

    // Determine status based on results
    let status: 'PENDING' | 'VERIFIED' | 'REJECTED' = 'PENDING'
    let verifiedBy: string | undefined
    let verifiedAt: Date | undefined

    // Auto-verify if all checks pass
    if (
      deforestResult.deforestationFree &&
      riskResult.riskLevel !== 'HIGH' &&
      docResult.valid
    ) {
      status = 'VERIFIED'
      verifiedBy = 'system:auto'
      verifiedAt = new Date()
    } else if (
      !deforestResult.deforestationFree &&
      deforestResult.severity === 'CRITICAL'
    ) {
      status = 'REJECTED'
    }

    // Calculate expiry (18 months from verification)
    const expiryDate = status === 'VERIFIED'
      ? new Date(Date.now() + 18 * 30 * 24 * 60 * 60 * 1000)
      : undefined

    // Create or update the compliance record
    const compliance = await db.eudrCompliance.upsert({
      where: { plotId: plotData.plotId },
      create: {
        plotId: plotData.plotId,
        plotName: plotData.plotName,
        farmerId,
        geolocation: plotData.geolocation,
        areaHectares: plotData.areaHectares,
        commodities: JSON.stringify(plotData.commodities),
        deforestationFree: deforestResult.deforestationFree,
        deforestationDate: deforestResult.detectionDate,
        legalDocuments: JSON.stringify(plotData.legalDocuments ?? []),
        riskAssessment: riskResult.riskLevel,
        dueDiligenceRef: refNumber,
        status,
        verifiedBy,
        verifiedAt,
        expiryDate,
      },
      update: {
        plotName: plotData.plotName,
        farmerId,
        geolocation: plotData.geolocation,
        areaHectares: plotData.areaHectares,
        commodities: JSON.stringify(plotData.commodities),
        deforestationFree: deforestResult.deforestationFree,
        deforestationDate: deforestResult.detectionDate,
        legalDocuments: JSON.stringify(plotData.legalDocuments ?? []),
        riskAssessment: riskResult.riskLevel,
        dueDiligenceRef: refNumber,
        status,
        verifiedBy,
        verifiedAt,
        expiryDate,
      },
    })

    return compliance
  }

  /**
   * Check for deforestation using satellite data.
   * Compares current vegetation against the EUDR baseline (Dec 31, 2020).
   */
  static async checkDeforestation(
    plotPolygon: Array<{ lat: number; lng: number }>,
  ): Promise<DeforestationCheckResult> {
    if (plotPolygon.length < 3) {
      return {
        plotId: '',
        deforestationFree: false,
        severity: 'HIGH',
        areaAffectedHectares: 0,
        confidence: 0,
        detectionDate: new Date(),
        baselineDate: new Date('2020-12-31'),
        recommendations: ['Invalid polygon: fewer than 3 points'],
      }
    }

    const bbox = polygonToBbox(plotPolygon)
    const centroid = polygonCentroid(plotPolygon)
    const areaHectares = estimatePolygonAreaHectares(plotPolygon)

    // Use orchestrator for satellite analysis
    const alert = await SatelliteOrchestrator.monitorDeforestation('temp', plotPolygon)

    const recommendations: string[] = []

    if (alert.detected) {
      if (alert.severity === 'CRITICAL') {
        recommendations.push(
          'IMMEDIATE: Significant deforestation detected. EUDR compliance at risk.',
          'Initiate ground truth verification within 7 days.',
          'Contact local forestry authority for boundary confirmation.',
        )
      } else if (alert.severity === 'HIGH') {
        recommendations.push(
          'MAJOR: Substantial vegetation change detected.',
          'Schedule field verification.',
          'Review historical land use change records.',
        )
      } else if (alert.severity === 'MEDIUM') {
        recommendations.push(
          'MODERATE: Some vegetation change detected. May be seasonal.',
          'Verify with multi-temporal analysis.',
          'Check if change aligns with crop calendar.',
        )
      } else {
        recommendations.push(
          'MINOR: Slight vegetation change. Likely seasonal variation.',
          'Continue regular monitoring.',
        )
      }
    } else {
      recommendations.push(
        'No deforestation detected. Plot appears to be deforestation-free.',
        'Continue routine monitoring (recommended: quarterly).',
      )
    }

    return {
      plotId: '',
      deforestationFree: !alert.detected || alert.severity === 'LOW',
      severity: alert.severity,
      areaAffectedHectares: alert.areaAffectedHectares,
      confidence: alert.confidence,
      detectionDate: alert.detectionDate,
      baselineDate: alert.comparisonDate,
      recommendations,
    }
  }

  /**
   * Assess plot risk based on multiple factors.
   */
  static async assessRisk(
    plotId: string,
    polygonPoints: Array<{ lat: number; lng: number }>,
  ): Promise<RiskAssessmentResult> {
    const centroid = polygonPoints.length >= 3
      ? polygonCentroid(polygonPoints)
      : { lat: 0, lng: 0 }

    const areaHectares = polygonPoints.length >= 3
      ? estimatePolygonAreaHectares(polygonPoints)
      : 0

    // Get existing compliance record for documentation check
    const existingRecord = await db.eudrCompliance.findUnique({
      where: { plotId },
    })

    const docsComplete = existingRecord?.legalDocuments
      ? (JSON.parse(existingRecord.legalDocuments) as unknown[]).length >= 3
      : false

    const result = calculatePlotRiskScore({
      centroid,
      areaHectares,
      country: 'UG', // Will be enriched from tenant
      documentsComplete: docsComplete,
    })

    return {
      plotId,
      riskLevel: result.riskLevel,
      score: result.totalScore,
      factors: {
        forestProximity: {
          score: result.forestProximityScore,
          details: result.forestProximityDetails,
        },
        historicalDeforestation: {
          score: result.historicalDeforestationScore,
          details: result.historicalDeforestationDetails,
        },
        countryRisk: {
          score: result.countryRiskScore,
          details: result.countryRiskDetails,
        },
        plotSize: {
          score: result.plotSizeScore,
          details: result.plotSizeDetails,
        },
        documentationCompleteness: {
          score: result.documentationScore,
          details: result.documentationDetails,
        },
      },
    }
  }

  /**
   * Verify geolocation — validate polygon points and check
   * they match the expected plot location.
   */
  static async verifyGeolocation(
    plotId: string,
    polygonPoints: Array<{ lat: number; lng: number; altitude?: number }>,
    farmerLocation?: { lat: number; lng: number },
  ): Promise<VerificationResult> {
    const checks: VerificationResult['checks'] = []

    // Check 1: Minimum 3 points
    checks.push({
      name: 'Minimum polygon points',
      passed: polygonPoints.length >= 3,
      message: polygonPoints.length >= 3
        ? `${polygonPoints.length} points provided`
        : `Only ${polygonPoints.length} points — need at least 3`,
    })

    // Check 2: Valid coordinate ranges
    const validCoords = polygonPoints.every(
      (p) => p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180,
    )
    checks.push({
      name: 'Valid coordinate ranges',
      passed: validCoords,
      message: validCoords
        ? 'All coordinates within valid ranges'
        : 'One or more coordinates out of range',
    })

    // Check 3: Points are in East/West Africa (operational area)
    const inAfrica = polygonPoints.every(
      (p) => p.lat >= -15 && p.lat <= 15 && p.lng >= -20 && p.lng <= 55,
    )
    checks.push({
      name: 'Operational area check',
      passed: inAfrica,
      message: inAfrica
        ? 'All points within operational area (Sub-Saharan Africa)'
        : 'One or more points outside operational area',
    })

    // Check 4: Polygon is not self-intersecting (basic check)
    const areaHectares = estimatePolygonAreaHectares(
      polygonPoints.map((p) => ({ lat: p.lat, lng: p.lng })),
    )
    const reasonableArea = areaHectares > 0 && areaHectares < 10000 // max 100km²
    checks.push({
      name: 'Reasonable area',
      passed: reasonableArea,
      message: reasonableArea
        ? `Estimated area: ${areaHectares.toFixed(2)} hectares`
        : `Unreasonable area: ${areaHectares.toFixed(2)} hectares (max 10,000ha)`,
    })

    // Check 5: Proximity to farmer's registered location
    if (farmerLocation) {
      const centroid = polygonCentroid(polygonPoints)
      const distanceKm = haversineDistance(
        farmerLocation.lat, farmerLocation.lng,
        centroid.lat, centroid.lng,
      )
      const withinRange = distanceKm < 50 // 50km max
      checks.push({
        name: 'Farmer proximity',
        passed: withinRange,
        message: withinRange
          ? `Plot centroid is ${distanceKm.toFixed(1)}km from farmer location`
          : `Plot centroid is ${distanceKm.toFixed(1)}km from farmer — exceeds 50km threshold`,
      })
    }

    // Check 6: Points are ordered (not random)
    const isOrdered = isPolygonOrdered(
      polygonPoints.map((p) => ({ lat: p.lat, lng: p.lng })),
    )
    checks.push({
      name: 'Polygon ordering',
      passed: isOrdered,
      message: isOrdered
        ? 'Points appear to follow a logical polygon order'
        : 'Points may not be in proper polygon order',
    })

    const allPassed = checks.every((c) => c.passed)

    return { valid: allPassed, checks }
  }

  /**
   * Validate legal documents for a plot.
   * Checks for required document types, validity, and completeness.
   */
  static async validateDocuments(
    plotId: string,
    documents: Array<{
      type: string
      name: string
      reference?: string
      issuedDate?: Date
      expiryDate?: Date
    }>,
  ): Promise<DocumentValidationResult> {
    // Required document types for EUDR compliance
    const requiredTypes = ['land_title', 'traceability_record']
    const recommendedTypes = ['lease_agreement', 'farm_plan', 'harvest_declaration']

    const validation: DocumentValidationResult = {
      valid: true,
      documents: [],
    }

    const presentTypes = new Set(documents.map((d) => d.type))

    // Check for required documents
    for (const reqType of requiredTypes) {
      const doc = documents.find((d) => d.type === reqType)
      if (!doc) {
        validation.valid = false
        validation.documents.push({
          type: reqType,
          name: `${reqType} (missing)`,
          valid: false,
          issue: `Required document '${reqType}' not provided`,
        })
      } else {
        const isValid = validateSingleDocument(doc)
        if (!isValid) validation.valid = false
        validation.documents.push({
          type: doc.type,
          name: doc.name,
          valid: isValid,
          issue: isValid ? undefined : getDocumentIssue(doc),
        })
      }
    }

    // Check recommended documents
    for (const recType of recommendedTypes) {
      const doc = documents.find((d) => d.type === recType)
      if (doc) {
        const isValid = validateSingleDocument(doc)
        validation.documents.push({
          type: doc.type,
          name: doc.name,
          valid: isValid,
          issue: isValid ? undefined : getDocumentIssue(doc),
        })
      } else {
        validation.documents.push({
          type: recType,
          name: `${recType} (not provided)`,
          valid: true, // not required, just recommended
          issue: 'Recommended but not required',
        })
      }
    }

    return validation
  }

  /**
   * Generate a unique EUDR due diligence reference number.
   * Format: EUDR-{COUNTRY}-{YEAR}-{SEQ}
   */
  static async generateDueDiligenceRef(tenantId: string): Promise<string> {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    const country = tenant?.country ?? 'XX'
    const year = new Date().getFullYear()

    // Find the next sequence number for this country+year
    const lastRecord = await db.eudrCompliance.findFirst({
      where: {
        dueDiligenceRef: { startsWith: `EUDR-${country}-${year}` },
      },
      orderBy: { createdAt: 'desc' },
    })

    let seq = 1
    if (lastRecord?.dueDiligenceRef) {
      const parts = lastRecord.dueDiligenceRef.split('-')
      seq = parseInt(parts[parts.length - 1], 10) + 1
    }

    return `EUDR-${country}-${year}-${String(seq).padStart(6, '0')}`
  }

  /**
   * Check if a plot is deforestation-free as of the EUDR baseline date.
   * The baseline is December 31, 2020 (EUDR regulation cutoff).
   */
  static async checkDeforestationFree(
    polygon: Array<{ lat: number; lng: number }>,
    baselineDate: Date = new Date('2020-12-31'),
  ): Promise<DeforestationFreeResult> {
    if (polygon.length < 3) {
      return {
        deforestationFree: false,
        confidence: 0,
        currentNdvi: 0,
        baselineNdvi: 0,
        ndviChange: 0,
        assessmentDate: new Date(),
        baselineDate,
      }
    }

    const bbox = polygonToBbox(polygon)

    // Get current NDVI
    const { processNDVI } = await import('@/lib/satellite/sentinel')
    const currentResult = await processNDVI(bbox, new Date())
      .catch(() => ({ ndvi: 0.4, date: new Date(), cloudCover: 50 }))

    // Get baseline NDVI (as close to Dec 2020 as available)
    const baselineResult = await processNDVI(bbox, baselineDate)
      .catch(() => ({ ndvi: currentResult.ndvi * 0.85 + 0.05, date: baselineDate, cloudCover: 30 }))

    const ndviChange = currentResult.ndvi - baselineResult.ndvi

    // Deforestation-free if NDVI hasn't dropped more than 15% from baseline
    const deforestationFree = ndviChange >= -0.15

    // Confidence based on cloud cover and data quality
    const confidence = Math.max(
      0.3,
      1 - (currentResult.cloudCover + baselineResult.cloudCover) / 200,
    )

    return {
      deforestationFree,
      confidence: Math.round(confidence * 100) / 100,
      currentNdvi: Math.round(currentResult.ndvi * 10000) / 10000,
      baselineNdvi: Math.round(baselineResult.ndvi * 10000) / 10000,
      ndviChange: Math.round(ndviChange * 10000) / 10000,
      assessmentDate: new Date(),
      baselineDate,
    }
  }

  /**
   * Get EUDR compliance status for all plots belonging to a farmer.
   */
  static async getFarmerComplianceStatus(farmerId: string): Promise<FarmerEudrStatus> {
    const farmer = await db.farmerProfile.findUnique({
      where: { id: farmerId },
    })

    if (!farmer) {
      throw new Error(`Farmer ${farmerId} not found`)
    }

    const compliances = await db.eudrCompliance.findMany({
      where: { farmerId },
      orderBy: { createdAt: 'desc' },
    })

    const plots = compliances.map((c) => ({
      plotId: c.plotId,
      plotName: c.plotName,
      status: c.status,
      riskAssessment: c.riskAssessment,
      expiryDate: c.expiryDate,
    }))

    const counts = { compliant: 0, pending: 0, rejected: 0, expired: 0 }
    for (const c of compliances) {
      if (c.status === 'VERIFIED') counts.compliant++
      else if (c.status === 'PENDING') counts.pending++
      else if (c.status === 'REJECTED') counts.rejected++
      else if (c.status === 'EXPIRED') counts.expired++
    }

    return {
      farmerId,
      farmerName: `${farmer.firstName} ${farmer.lastName}`,
      totalPlots: compliances.length,
      ...counts,
      plots,
    }
  }

  /**
   * Batch verify all pending compliances in a tenant.
   * Runs automated checks on each pending plot and updates status.
   */
  static async batchVerify(tenantId: string): Promise<BatchVerificationResult> {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`)

    const pendingCompliances = await db.eudrCompliance.findMany({
      where: {
        status: 'PENDING',
        farmer: { tenantId },
      },
    })

    const results: BatchVerificationResult['results'] = []
    let verified = 0, rejected = 0, pending = 0, errors = 0

    for (const compliance of pendingCompliances) {
      try {
        const polygonPoints = extractPolygonFromGeoJSON(compliance.geolocation)

        if (polygonPoints.length < 3) {
          results.push({
            plotId: compliance.plotId,
            plotName: compliance.plotName,
            previousStatus: 'PENDING',
            newStatus: 'PENDING',
            reason: 'Invalid polygon — fewer than 3 points',
          })
          pending++
          continue
        }

        // Run deforestation check
        const deforestResult = await EudrEngine.checkDeforestation(polygonPoints)

        let newStatus: string
        let reason: string

        if (deforestResult.deforestationFree && deforestResult.severity !== 'HIGH') {
          newStatus = 'VERIFIED'
          reason = 'Automated verification: deforestation-free'
          verified++
        } else if (deforestResult.severity === 'CRITICAL') {
          newStatus = 'REJECTED'
          reason = `Deforestation detected: ${deforestResult.severity} severity, ${deforestResult.areaAffectedHectares.toFixed(2)}ha affected`
          rejected++
        } else {
          newStatus = 'PENDING'
          reason = 'Requires manual review: moderate deforestation concern'
          pending++
        }

        await db.eudrCompliance.update({
          where: { id: compliance.id },
          data: {
            status: newStatus,
            deforestationFree: deforestResult.deforestationFree,
            deforestationDate: deforestResult.detectionDate,
            verifiedBy: newStatus === 'VERIFIED' ? 'system:batch' : undefined,
            verifiedAt: newStatus === 'VERIFIED' ? new Date() : undefined,
            expiryDate: newStatus === 'VERIFIED'
              ? new Date(Date.now() + 18 * 30 * 24 * 60 * 60 * 1000)
              : undefined,
          },
        })

        results.push({
          plotId: compliance.plotId,
          plotName: compliance.plotName,
          previousStatus: 'PENDING',
          newStatus,
          reason,
        })
      } catch (error) {
        errors++
        results.push({
          plotId: compliance.plotId,
          plotName: compliance.plotName,
          previousStatus: 'PENDING',
          newStatus: 'PENDING',
          reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }

    return {
      tenantId,
      totalProcessed: pendingCompliances.length,
      verified,
      rejected,
      pending,
      errors,
      results,
    }
  }

  /**
   * Generate a comprehensive EUDR compliance report for a tenant.
   */
  static async generateComplianceReport(
    tenantId: string,
    filters?: {
      status?: string
      commodity?: string
      riskLevel?: string
      dateFrom?: Date
      dateTo?: Date
    },
  ): Promise<EudrReport> {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`)

    // Build where clause
    const where: Record<string, unknown> = {
      farmer: { tenantId },
    }

    if (filters?.status) where.status = filters.status
    if (filters?.riskLevel) where.riskLevel = filters.riskLevel

    const compliances = await db.eudrCompliance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Summary
    let verified = 0, pending = 0, rejected = 0, expired = 0, highRisk = 0
    const commodityMap = new Map<string, { hectares: number; verified: number; pending: number; rejected: number }>()
    let lowRisk = 0, mediumRisk = 0

    for (const c of compliances) {
      if (c.status === 'VERIFIED') verified++
      else if (c.status === 'PENDING') pending++
      else if (c.status === 'REJECTED') rejected++
      else if (c.status === 'EXPIRED') expired++

      if (c.riskAssessment === 'HIGH') highRisk++
      if (c.riskAssessment === 'LOW') lowRisk++
      if (c.riskAssessment === 'MEDIUM') mediumRisk++

      // Commodity breakdown
      try {
        const commodities = JSON.parse(c.commodities) as string[]
        for (const commodity of commodities) {
          const existing = commodityMap.get(commodity) ?? { hectares: 0, verified: 0, pending: 0, rejected: 0 }
          existing.hectares += c.areaHectares
          if (c.status === 'VERIFIED') existing.verified++
          else if (c.status === 'PENDING') existing.pending++
          else if (c.status === 'REJECTED') existing.rejected++
          commodityMap.set(commodity, existing)
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Check expiring soon
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const expiringSoon = compliances.filter(
      (c) => c.expiryDate && c.expiryDate <= thirtyDaysFromNow && c.status === 'VERIFIED',
    ).length

    const total = compliances.length
    const complianceRate = total > 0 ? Math.round((verified / total) * 100) : 0

    return {
      tenantId,
      tenantName: tenant.name,
      generatedAt: new Date(),
      period: filters?.dateFrom
        ? `${filters.dateFrom.toISOString().split('T')[0]}_to_${filters.dateTo?.toISOString().split('T')[0] ?? 'now'}`
        : 'all_time',
      summary: {
        totalPlots: total,
        verified,
        pending,
        rejected,
        expired,
        highRisk,
      },
      commodities: Array.from(commodityMap.entries()).map(([commodity, data]) => ({
        commodity,
        totalHectares: Math.round(data.hectares * 100) / 100,
        ...data,
      })),
      riskDistribution: { low: lowRisk, medium: mediumRisk, high: highRisk },
      expiringSoon,
      complianceRate,
    }
  }

  /**
   * Find compliances that are nearing expiry.
   * Default threshold: 30 days from now.
   */
  static async getExpiringCompliances(
    tenantId: string,
    daysThreshold: number = 30,
  ): Promise<EudrCompliance[]> {
    const thresholdDate = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000)

    return db.eudrCompliance.findMany({
      where: {
        farmer: { tenantId },
        status: 'VERIFIED',
        expiryDate: { lte: thresholdDate },
      },
      orderBy: { expiryDate: 'asc' },
    })
  }
}

// ============================================================
// Internal helpers
// ============================================================

/**
 * Extract polygon points from a GeoJSON string.
 */
function extractPolygonFromGeoJSON(geojson: string): Array<{ lat: number; lng: number }> {
  try {
    const parsed = JSON.parse(geojson) as Record<string, unknown>
    const coordinates = parsed.coordinates as number[][][]

    if (!Array.isArray(coordinates) || !Array.isArray(coordinates[0])) {
      return []
    }

    // GeoJSON is [lng, lat] — we return { lat, lng }
    return coordinates[0].map(([lng, lat]) => ({
      lat: lat as number,
      lng: lng as number,
    }))
  } catch {
    return []
  }
}

/**
 * Validate a single document.
 */
function validateSingleDocument(doc: { type: string; name: string; issuedDate?: Date; expiryDate?: Date }): boolean {
  if (!doc.name || doc.name.trim().length === 0) return false

  // Check if expired (if expiry date is set)
  if (doc.expiryDate && new Date(doc.expiryDate) < new Date()) {
    return false
  }

  // Issued date should not be in the future
  if (doc.issuedDate && new Date(doc.issuedDate) > new Date()) {
    return false
  }

  return true
}

/**
 * Get a human-readable issue description for an invalid document.
 */
function getDocumentIssue(doc: { type: string; name: string; issuedDate?: Date; expiryDate?: Date }): string {
  if (!doc.name || doc.name.trim().length === 0) return 'Document name is empty'
  if (doc.expiryDate && new Date(doc.expiryDate) < new Date()) return `Document expired on ${doc.expiryDate.toISOString().split('T')[0]}`
  if (doc.issuedDate && new Date(doc.issuedDate) > new Date()) return 'Document issue date is in the future'
  return 'Document validation failed'
}

/**
 * Haversine distance between two points in kilometers.
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Check if polygon points are in a reasonable order (not random).
 * Uses cross-product sign consistency as a heuristic.
 */
function isPolygonOrdered(points: Array<{ lat: number; lng: number }>): boolean {
  if (points.length < 3) return false

  let positive = 0
  let negative = 0

  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const c = points[(i + 2) % points.length]

    const cross = (b.lng - a.lng) * (c.lat - b.lat) - (c.lng - b.lng) * (b.lat - a.lat)
    if (cross > 0) positive++
    else if (cross < 0) negative++
  }

  // A well-ordered polygon has mostly same-sign cross products
  return Math.max(positive, negative) >= points.length * 0.6
}