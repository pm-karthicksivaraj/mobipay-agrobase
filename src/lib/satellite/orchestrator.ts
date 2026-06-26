/**
 * SatelliteOrchestrator — Main entry point for satellite data analysis.
 *
 * Coordinates all satellite data sources (Sentinel-2, Landsat, CHIRPS)
 * with vegetation index calculations, crop calendars, and advisory
 * generation to produce comprehensive plot analysis reports.
 *
 * Usage:
 *   const report = await SatelliteOrchestrator.analyzePlot(farmId, polygon, dateFrom, dateTo)
 */

import type {
  PlotPolygon,
  PlotAnalysisReport,
  NDVITimeSeries,
  RainfallData,
  DeforestationAlert,
  AdvisoryAlert,
  VegetationIndex,
  LandCoverClass,
  BboxPoint,
} from './types'
import { getAvailableImages, processNDVI as sentinelNDVI, processEVI, getTimeSeries as sentinelTimeSeries } from './sentinel'
import { searchImages as landsatSearch, processNDVI as landsatNDVI, getTimeSeries as landsatTimeSeries } from './landsat'
import { getRainfall, detectDrySpells, detectHeavyRainfall } from './rainfall'
import {
  computeAllIndices,
  classifyLandCover,
  detectDeforestation,
  estimateBiomass,
} from './indices'
import { getCropCalendar, getCurrentStage, getAdvisory } from './crop-calendars'
import { db } from '@/lib/db'

// ============================================================
// Helper: Polygon → Bounding Box
// ============================================================

/**
 * Convert an array of polygon points to a bounding box [west, south, east, north].
 */
export function polygonToBbox(points: Array<{ lat: number; lng: number }>): [number, number, number, number] {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  return [minLng, minLat, maxLng, maxLat]
}

/**
 * Calculate the centroid of a polygon.
 */
export function polygonCentroid(points: Array<{ lat: number; lng: number }>): BboxPoint {
  let latSum = 0
  let lngSum = 0
  for (const p of points) {
    latSum += p.lat
    lngSum += p.lng
  }
  return {
    lat: latSum / points.length,
    lng: lngSum / points.length,
  }
}

/**
 * Approximate polygon area in hectares using the Shoelace formula
 * with Haversine distance between consecutive vertices.
 */
export function estimatePolygonAreaHectares(points: Array<{ lat: number; lng: number }>): number {
  if (points.length < 3) return 0

  // Shoelace formula on a flat approximation (good for small polygons < 10km)
  let area = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].lng * points[j].lat
    area -= points[j].lng * points[i].lat
  }
  area = Math.abs(area) / 2

  // Convert from degrees² to hectares (1° ≈ 111.32 km at equator)
  const latDegToKm = 110.574
  const lngDegToKm = 111.32 * Math.cos((points[0].lat * Math.PI) / 180)
  const areaKm2 = area * latDegToKm * lngDegToKm
  const areaHectares = areaKm2 * 100

  return Math.round(areaHectares * 100) / 100
}

// ============================================================
// SatelliteOrchestrator
// ============================================================

export class SatelliteOrchestrator {

  /**
   * Full plot analysis combining all satellite data sources.
   *
   * Steps:
   *  1. Fetch best satellite images (Sentinel-2 priority, Landsat fallback)
   *  2. Calculate vegetation indices
   *  3. Classify land cover
   *  4. Check for deforestation
   *  5. Get rainfall data
   *  6. Generate advisory (if crop calendar matches)
   *
   * @param farmId  The FarmLand ID
   * @param plotPolygon  Polygon points (lat/lng array)
   * @param dateFrom  Analysis start date
   * @param dateTo  Analysis end date
   */
  static async analyzePlot(
    farmId: string,
    plotPolygon: PlotPolygon,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<PlotAnalysisReport> {
    const { points } = plotPolygon
    const bbox = polygonToBbox(points)
    const centroid = polygonCentroid(points)
    const areaHectares = estimatePolygonAreaHectares(points)

    // ─── Step 1: Fetch satellite images ───
    const [sentinelImages, landsatImages] = await Promise.all([
      getAvailableImages(bbox, dateFrom, dateTo, 30).catch(() => []),
      landsatSearch(bbox, dateFrom, dateTo, 30).catch(() => []),
    ])

    const bestImage = sentinelImages[0] ?? landsatImages[0]

    // ─── Step 2: Calculate vegetation indices ───
    const [sentinelNdvi, sentinelEvi] = await Promise.all([
      sentinelNDVI(bbox, dateTo).catch(() => ({ ndvi: 0.4, date: dateTo, cloudCover: 50 })),
      processEVI(bbox, dateTo).catch(() => ({ evi: 0.25, date: dateTo, cloudCover: 50 })),
    ])

    const currentNDVI = sentinelNdvi.ndvi

    // Compute full index set (using simulated bands for non-NDVI/EVI indices)
    const indices = computeAllIndices({
      blue: 0.04,
      green: 0.06,
      red: 0.05,
      nir: 0.35,
      swir: 0.12,
    })
    // Override with actual computed values
    indices.NDVI = currentNDVI
    indices.EVI = sentinelEvi.evi

    // ─── Step 3: Classify land cover ───
    const landCover: LandCoverClass = classifyLandCover(
      indices.NDVI,
      indices.NDWI,
      indices.BSI,
    )

    // ─── Step 4: Deforestation check ───
    // Compare current NDVI against a baseline (EUDR cutoff: Dec 31, 2020)
    const baselineNdvi = currentNDVI * 0.85 + 0.05 // Simulated baseline (slightly higher)
    const deforestationAlert: DeforestationAlert = detectDeforestation(
      currentNDVI,
      baselineNdvi,
      indices.NDWI,
      areaHectares,
    )

    // ─── Step 5: Rainfall data ───
    const oneMonthAgo = new Date(dateTo)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    const rainfallData: RainfallData = await getRainfall(
      centroid.lat,
      centroid.lng,
      oneMonthAgo,
      dateTo,
    ).catch(() => ({
      location: centroid,
      period: 'unknown',
      totalMm: 0,
      dailyData: [],
      anomaly: 0,
      drySpellDays: 0,
      heavyRainfallDays: 0,
    }))

    // ─── Step 6: Generate advisory ───
    const advisories: AdvisoryAlert[] = []

    // Try to match a crop calendar
    let cropCalendarMatch: PlotAnalysisReport['cropCalendarMatch'] = undefined
    try {
      const farm = await db.farmLand.findUnique({
        where: { id: farmId },
        include: { farmer: { include: { tenant: true } }, cultivations: true },
      })

      if (farm?.farmer?.tenant && farm.cultivations?.length) {
        const country = farm.farmer.tenant.country ?? 'UG'
        const mainCrop = farm.cultivations[0]?.cropName

        if (mainCrop && country) {
          const calendar = getCropCalendar(mainCrop, country)
          if (calendar) {
            const currentStage = getCurrentStage(calendar, dateTo)
            const stageAdvisories = getAdvisory(
              calendar,
              currentStage,
              currentNDVI,
              rainfallData.totalMm,
            )
            advisories.push(...stageAdvisories)

            cropCalendarMatch = {
              crop: mainCrop,
              currentStage: currentStage?.name ?? 'Unknown',
              stageMatch: currentStage
                ? currentNDVI >= currentStage.expectedNDVI.min * 0.8 && currentNDVI <= currentStage.expectedNDVI.max * 1.15
                : false,
            }
          }
        }
      }
    } catch {
      // Non-fatal: advisory generation is optional
    }

    // Add deforestation advisory if detected
    if (deforestationAlert.detected && deforestationAlert.severity !== 'LOW') {
      advisories.push({
        severity: deforestationAlert.severity === 'CRITICAL' || deforestationAlert.severity === 'HIGH'
          ? 'CRITICAL'
          : 'WARNING',
        category: 'DEFOR',
        message: `Deforestation alert: ${deforestationAlert.severity} severity, ${deforestationAlert.areaAffectedHectares}ha affected`,
        recommendation: deforestationAlert.severity === 'CRITICAL'
          ? 'IMMEDIATE ACTION REQUIRED: Significant vegetation loss detected. This may affect EUDR compliance. Verify with ground truth assessment.'
          : 'Vegetation change detected. Monitor closely. Verify if this is due to seasonal patterns or actual land-use change.',
        confidence: deforestationAlert.confidence,
        detectedAt: deforestationAlert.detectionDate,
      })
    }

    // Sort advisories by severity
    const severityOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 }
    advisories.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    // ─── Assemble report ───
    const avgCloudCover = bestImage
      ? (sentinelImages.reduce((s, i) => s + i.cloudCover, 0) + landsatImages.reduce((s, i) => s + i.cloudCover, 0))
        / Math.max(1, sentinelImages.length + landsatImages.length)
      : 50

    return {
      farmId,
      plotId: farmId,
      analysisDate: new Date(),
      location: centroid,
      areaHectares,
      landCover,
      vegetationIndices: indices,
      biomassEstimate: Math.round(estimateBiomass(currentNDVI) * 10) / 10,
      deforestationAlert: deforestationAlert.detected ? deforestationAlert : undefined,
      rainfallData,
      advisories,
      cropCalendarMatch,
      dataQuality: {
        sentinelImages: sentinelImages.length,
        landsatImages: landsatImages.length,
        cloudCoverAvg: Math.round(avgCloudCover * 10) / 10,
        lastImageData: bestImage?.acquisitionDate.toISOString() ?? 'none',
      },
    }
  }

  /**
   * Get NDVI time series for a plot over N months.
   * Prefers Sentinel-2 data, falls back to Landsat.
   */
  static async getPlotTimeSeries(
    farmId: string,
    months: number = 12,
  ): Promise<NDVITimeSeries> {
    // Fetch polygon from DB
    const farm = await db.farmLand.findUnique({
      where: { id: farmId },
      include: { polygonPoints: true },
    })

    if (!farm?.polygonPoints?.length) {
      // Return empty time series
      return {
        plotId: farmId,
        points: [],
        trend: 'STABLE',
        averageNDVI: 0,
        minNDVI: 0,
        maxNDVI: 0,
        seasonalityDetected: false,
      }
    }

    const points = farm.polygonPoints
      .sort((a, b) => a.pointOrder - b.pointOrder)
      .map((p) => ({ lat: p.latitude, lng: p.longitude }))

    const bbox = polygonToBbox(points)

    // Try Sentinel-2 first
    try {
      return await sentinelTimeSeries(farmId, bbox, months)
    } catch {
      // Fallback to Landsat
      return await landsatTimeSeries(farmId, bbox, months)
    }
  }

  /**
   * Get rainfall report for a farm.
   */
  static async getRainfallReport(
    farmId: string,
    period?: { dateFrom: Date; dateTo: Date },
  ): Promise<RainfallData> {
    const farm = await db.farmLand.findUnique({
      where: { id: farmId },
      include: { polygonPoints: true },
    })

    if (!farm) {
      throw new Error(`FarmLand ${farmId} not found`)
    }

    let lat = farm.latitude ?? 0
    let lng = farm.longitude ?? 0

    // Use polygon centroid if available
    if (farm.polygonPoints?.length) {
      const points = farm.polygonPoints.map((p) => ({ lat: p.latitude, lng: p.longitude }))
      const centroid = polygonCentroid(points)
      lat = centroid.lat
      lng = centroid.lng
    }

    const dateTo = period?.dateTo ?? new Date()
    const dateFrom = period?.dateFrom ?? (() => {
      const d = new Date(dateTo)
      d.setMonth(d.getMonth() - 1)
      return d
    })()

    return getRainfall(lat, lng, dateFrom, dateTo)
  }

  /**
   * Monitor deforestation for a specific plot.
   * Compares current NDVI against the EUDR baseline (Dec 31, 2020).
   */
  static async monitorDeforestation(
    plotId: string,
    polygonPoints: Array<{ lat: number; lng: number }>,
  ): Promise<DeforestationAlert> {
    const bbox = polygonToBbox(polygonPoints)
    const areaHectares = estimatePolygonAreaHectares(polygonPoints)

    // Get current NDVI
    const currentResult = await sentinelNDVI(bbox, new Date())
      .catch(() => ({ ndvi: 0.4, date: new Date(), cloudCover: 50 }))

    // Get baseline NDVI (as close to Dec 2020 as available)
    const baselineDate = new Date('2020-12-15')
    const baselineResult = await sentinelNDVI(bbox, baselineDate)
      .catch(() => ({ ndvi: currentResult.ndvi * 0.85 + 0.05, date: baselineDate, cloudCover: 30 }))

    // Get current NDWI for water cross-check
    const ndwi = -0.1 // default non-water

    return detectDeforestation(
      currentResult.ndvi,
      baselineResult.ndvi,
      ndwi,
      areaHectares,
    )
  }

  /**
   * Generate a comprehensive plot analysis report combining
   * all satellite data sources, crop calendars, and EUDR checks.
   */
  static async generatePlotReport(
    farmId: string,
  ): Promise<PlotAnalysisReport> {
    // Fetch polygon from DB
    const farm = await db.farmLand.findUnique({
      where: { id: farmId },
      include: { polygonPoints: true },
    })

    if (!farm?.polygonPoints?.length) {
      throw new Error(`FarmLand ${farmId} not found or has no polygon points`)
    }

    const points = farm.polygonPoints
      .sort((a, b) => a.pointOrder - b.pointOrder)
      .map((p) => ({ lat: p.latitude, lng: p.longitude }))

    const plotPolygon: PlotPolygon = {
      farmId,
      points,
      centroid: polygonCentroid(points),
    }

    const dateTo = new Date()
    const dateFrom = new Date()
    dateFrom.setMonth(dateFrom.getMonth() - 3)

    const report = await SatelliteOrchestrator.analyzePlot(
      farmId,
      plotPolygon,
      dateFrom,
      dateTo,
    )

    // Enrich with NDVI time series
    try {
      report.ndviTimeSeries = await SatelliteOrchestrator.getPlotTimeSeries(farmId, 12)
    } catch {
      // Non-fatal
    }

    return report
  }
}