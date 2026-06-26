/**
 * EUDR Risk Scoring Algorithm
 *
 * Calculates a composite risk score (0–100) for agricultural plots
 * based on five weighted factors. Used to classify plots as LOW,
 * MEDIUM, HIGH, or CRITICAL risk for EUDR compliance.
 *
 * Factor weights:
 *   - Forest proximity:        25 pts  (0–25)
 *   - Historical deforestation: 25 pts  (0–25)
 *   - Country/region risk:      20 pts  (0–20)
 *   - Plot size & shape:        15 pts  (0–15)
 *   - Documentation:            15 pts  (0–15)
 *
 * Risk levels:
 *   LOW:       0–30
 *   MEDIUM:    31–60
 *   HIGH:      61–80
 *   CRITICAL:  81–100
 */

// ============================================================
// Types
// ============================================================

export interface RiskScoreInput {
  centroid: { lat: number; lng: number }
  areaHectares: number
  country: string
  documentsComplete: boolean
  forestData?: {
    distanceToForestKm?: number
    forestCoverPercent?: number
  }
  historicalDeforestationRate?: number  // annual % loss
}

export interface RiskScoreResult {
  totalScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  forestProximityScore: number
  forestProximityDetails: string
  historicalDeforestationScore: number
  historicalDeforestationDetails: string
  countryRiskScore: number
  countryRiskDetails: string
  plotSizeScore: number
  plotSizeDetails: string
  documentationScore: number
  documentationDetails: string
}

export interface CountryRiskProfile {
  country: string
  countryCode: string
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  overallScore: number  // 0-20
  deforestationRate: number  // annual % forest loss (FAO 2015-2020)
  forestCoverPercent: number  // % land area
  eudrRelevantCommodities: string[]
  highRiskRegions: string[]
  notes: string
}

// ============================================================
// Country Risk Profiles
// ============================================================

const COUNTRY_PROFILES: Record<string, CountryRiskProfile> = {
  UG: {
    country: 'Uganda',
    countryCode: 'UG',
    overallRiskLevel: 'MEDIUM',
    overallScore: 12,
    deforestationRate: 2.7,       // FAO: ~2.7% annual forest loss
    forestCoverPercent: 10.0,     // ~10% forest cover remaining
    eudrRelevantCommodities: ['Coffee', 'Cocoa', 'Tea', 'Timber'],
    highRiskRegions: ['Northern', 'Eastern', 'West Nile', 'Albertine Rift'],
    notes: 'High deforestation in northern and eastern regions. Coffee-growing areas in central/western are moderate risk. Albertine Rift biodiversity hotspot.',
  },
  GH: {
    country: 'Ghana',
    countryCode: 'GH',
    overallRiskLevel: 'HIGH',
    overallScore: 16,
    deforestationRate: 3.5,       // FAO: ~3.5% annual forest loss
    forestCoverPercent: 7.0,      // ~7% primary forest remaining
    eudrRelevantCommodities: ['Cocoa', 'Coffee', 'Timber', 'Palm Oil', 'Shea'],
    highRiskRegions: ['Western', 'Ashanti', 'Eastern', 'Brong-Ahafo'],
    notes: 'Severe deforestation driven by cocoa expansion, mining, and logging. Forest reserves under pressure. Cocoa is the primary EUDR commodity.',
  },
  KE: {
    country: 'Kenya',
    countryCode: 'KE',
    overallRiskLevel: 'MEDIUM',
    overallScore: 11,
    deforestationRate: 0.7,       // FAO: ~0.7% annual forest loss
    forestCoverPercent: 7.4,      // ~7.4% forest cover
    eudrRelevantCommodities: ['Coffee', 'Tea', 'Macadamia', 'Avocado', 'Timber'],
    highRiskRegions: ['Mau Forest Complex', 'Mount Kenya', 'Coastal Forests', 'Western'],
    notes: 'Lower national deforestation rate but critical hotspots. Mau Forest complex is high risk. Tea-growing highlands generally lower risk.',
  },
}

// ============================================================
// Forest proximity data (simplified)
//
// In production, this queries a GIS service with forest cover
// maps. For now, uses distance estimation from known forest
// areas in each country.
// ============================================================

interface ForestZone {
  name: string
  center: { lat: number; lng: number }
  radiusKm: number
  country: string
}

const FOREST_ZONES: ForestZone[] = [
  // Uganda
  { name: 'Bwindi Impenetrable Forest', center: { lat: -1.0, lng: 29.6 }, radiusKm: 25, country: 'UG' },
  { name: 'Murchison Falls NP', center: { lat: 2.2, lng: 31.8 }, radiusKm: 40, country: 'UG' },
  { name: 'Kibale Forest', center: { lat: 0.5, lng: 30.3 }, radiusKm: 20, country: 'UG' },
  { name: 'Mount Elgon', center: { lat: 1.1, lng: 34.5 }, radiusKm: 25, country: 'UG' },
  { name: 'Queen Elizabeth NP', center: { lat: -0.2, lng: 29.9 }, radiusKm: 30, country: 'UG' },
  { name: 'Budongo Forest', center: { lat: 1.7, lng: 31.4 }, radiusKm: 20, country: 'UG' },
  { name: 'Mabira Forest', center: { lat: 0.4, lng: 32.9 }, radiusKm: 15, country: 'UG' },

  // Ghana
  { name: 'Kakum National Park', center: { lat: 5.3, lng: -1.4 }, radiusKm: 20, country: 'GH' },
  { name: 'Bia National Park', center: { lat: 6.2, lng: -2.8 }, radiusKm: 25, country: 'GH' },
  { name: 'Ankasa Conservation Area', center: { lat: 5.2, lng: -2.6 }, radiusKm: 20, country: 'GH' },
  { name: 'Atewa Range Forest', center: { lat: 6.2, lng: -0.5 }, radiusKm: 18, country: 'GH' },
  { name: 'Digya National Park', center: { lat: 7.5, lng: -0.8 }, radiusKm: 35, country: 'GH' },
  { name: 'Bui National Park', center: { lat: 8.3, lng: -2.2 }, radiusKm: 25, country: 'GH' },

  // Kenya
  { name: 'Mau Forest Complex', center: { lat: -0.6, lng: 35.8 }, radiusKm: 50, country: 'KE' },
  { name: 'Mount Kenya Forest', center: { lat: -0.2, lng: 37.3 }, radiusKm: 30, country: 'KE' },
  { name: 'Aberdare Range', center: { lat: -0.5, lng: 36.6 }, radiusKm: 35, country: 'KE' },
  { name: 'Kakamega Forest', center: { lat: 0.3, lng: 34.9 }, radiusKm: 20, country: 'KE' },
  { name: 'Arabuko-Sokoke', center: { lat: -3.2, lng: 39.9 }, radiusKm: 18, country: 'KE' },
  { name: 'Mount Elgon (Kenya)', center: { lat: 1.1, lng: 34.5 }, radiusKm: 22, country: 'KE' },
]

// ============================================================
// Public API
// ============================================================

/**
 * Calculate a comprehensive EUDR risk score for a plot.
 */
export function calculatePlotRiskScore(input: RiskScoreInput): RiskScoreResult {
  const forestResult = scoreForestProximity(input)
  const deforestResult = scoreHistoricalDeforestation(input)
  const countryResult = scoreCountryRisk(input)
  const sizeResult = scorePlotSize(input)
  const docResult = scoreDocumentation(input)

  const totalScore =
    forestResult.score +
    deforestResult.score +
    countryResult.score +
    sizeResult.score +
    docResult.score

  const riskLevel = classifyRisk(totalScore)

  return {
    totalScore: Math.round(totalScore * 10) / 10,
    riskLevel,
    forestProximityScore: forestResult.score,
    forestProximityDetails: forestResult.details,
    historicalDeforestationScore: deforestResult.score,
    historicalDeforestationDetails: deforestResult.details,
    countryRiskScore: countryResult.score,
    countryRiskDetails: countryResult.details,
    plotSizeScore: sizeResult.score,
    plotSizeDetails: sizeResult.details,
    documentationScore: docResult.score,
    documentationDetails: docResult.details,
  }
}

/**
 * Get the risk profile for a country.
 */
export function getCountryRiskProfile(country: string): CountryRiskProfile {
  const profile = COUNTRY_PROFILES[country.toUpperCase()]
  if (profile) return profile

  // Default profile for unknown countries
  return {
    country: country,
    countryCode: country,
    overallRiskLevel: 'MEDIUM',
    overallScore: 13,
    deforestationRate: 2.0,
    forestCoverPercent: 10,
    eudrRelevantCommodities: [],
    highRiskRegions: [],
    notes: 'No specific risk profile available. Using default medium risk.',
  }
}

/**
 * Calculate distance from a centroid to the nearest known forest edge.
 * Returns distance in kilometers.
 *
 * In production, this queries a GIS service with forest cover polygons.
 * The current implementation uses a simplified distance-to-known-forest-zones
 * approach.
 */
export function calculateForestProximity(
  centroid: { lat: number; lng: number },
  forestData?: { distanceToForestKm?: number; forestCoverPercent?: number },
): number {
  // If real forest data is provided, use it directly
  if (forestData?.distanceToForestKm !== undefined) {
    return forestData.distanceToForestKm
  }

  // Otherwise, estimate from known forest zones
  let minDistanceKm = Infinity

  for (const zone of FOREST_ZONES) {
    const dist = haversineDistance(
      centroid.lat, centroid.lng,
      zone.center.lat, zone.center.lng,
    )
    const distanceToEdge = Math.max(0, dist - zone.radiusKm)
    minDistanceKm = Math.min(minDistanceKm, distanceToEdge)
  }

  return minDistanceKm === Infinity ? 100 : minDistanceKm
}

/**
 * Get all available country risk profiles.
 */
export function getAllCountryProfiles(): CountryRiskProfile[] {
  return Object.values(COUNTRY_PROFILES)
}

// ============================================================
// Internal scoring functions
// ============================================================

function classifyRisk(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score <= 30) return 'LOW'
  if (score <= 60) return 'MEDIUM'
  if (score <= 80) return 'HIGH'
  return 'CRITICAL'
}

/**
 * Forest proximity score: 0–25 pts
 * Closer to forest = higher risk
 */
function scoreForestProximity(input: RiskScoreInput): { score: number; details: string } {
  const distanceKm = calculateForestProximity(input.centroid, input.forestData)

  // Distance thresholds (km)
  let score: number
  let details: string

  if (distanceKm <= 1) {
    score = 25
    details = `Plot is within 1km of forest edge (actual: ${distanceKm.toFixed(1)}km). Very high risk of encroachment.`
  } else if (distanceKm <= 5) {
    score = 20
    details = `Plot is within 5km of forest edge (${distanceKm.toFixed(1)}km). High risk of forest proximity issues.`
  } else if (distanceKm <= 15) {
    score = 14
    details = `Plot is ${distanceKm.toFixed(1)}km from nearest forest. Moderate proximity risk.`
  } else if (distanceKm <= 30) {
    score = 8
    details = `Plot is ${distanceKm.toFixed(1)}km from nearest forest. Low-moderate proximity risk.`
  } else if (distanceKm <= 50) {
    score = 4
    details = `Plot is ${distanceKm.toFixed(1)}km from nearest forest. Low proximity risk.`
  } else {
    score = 1
    details = `Plot is ${distanceKm.toFixed(1)}km from nearest forest. Minimal proximity risk.`
  }

  return { score: Math.round(score * 10) / 10, details }
}

/**
 * Historical deforestation rate score: 0–25 pts
 * Based on country-level rates with regional adjustment.
 */
function scoreHistoricalDeforestation(input: RiskScoreInput): { score: number; details: string } {
  const rate = input.historicalDeforestationRate ?? getRegionDeforestationRate(input.centroid, input.country)
  let score: number
  let details: string

  if (rate >= 4.0) {
    score = 25
    details = `Very high historical deforestation rate (${rate.toFixed(1)}%/year). Critical risk area.`
  } else if (rate >= 3.0) {
    score = 21
    details = `High historical deforestation rate (${rate.toFixed(1)}%/year). Significant land-use change.`
  } else if (rate >= 2.0) {
    score = 16
    details = `Moderate deforestation rate (${rate.toFixed(1)}%/year). Ongoing pressure on forest cover.`
  } else if (rate >= 1.0) {
    score = 10
    details = `Low-moderate deforestation rate (${rate.toFixed(1)}%/year). Some forest loss detected.`
  } else if (rate >= 0.5) {
    score = 5
    details = `Low deforestation rate (${rate.toFixed(1)}%/year). Relatively stable forest cover.`
  } else {
    score = 2
    details = `Minimal deforestation rate (${rate.toFixed(2)}%/year). Forest cover stable.`
  }

  return { score: Math.round(score * 10) / 10, details }
}

/**
 * Country risk score: 0–20 pts
 * Based on country-level EUDR risk profile.
 */
function scoreCountryRisk(input: RiskScoreInput): { score: number; details: string } {
  const profile = getCountryRiskProfile(input.country)

  return {
    score: profile.overallScore,
    details: `${profile.country}: ${profile.overallRiskLevel} risk (score ${profile.overallScore}/20). ` +
      `Annual deforestation rate: ${profile.deforestationRate}%. ` +
      `Forest cover: ${profile.forestCoverPercent}%. ` +
      (profile.highRiskRegions.length > 0
        ? `High-risk regions: ${profile.highRiskRegions.join(', ')}.`
        : '') +
      ` ${profile.notes}`,
  }
}

/**
 * Plot size & fragmentation score: 0–15 pts
 * Smaller, fragmented plots are harder to monitor.
 */
function scorePlotSize(input: RiskScoreInput): { score: number; details: string } {
  const ha = input.areaHectares
  let score: number
  let details: string

  if (ha <= 0.5) {
    score = 15
    details = `Very small plot (${ha.toFixed(2)}ha). High monitoring difficulty.`
  } else if (ha <= 2) {
    score = 11
    details = `Small plot (${ha.toFixed(2)}ha). Moderate monitoring challenge.`
  } else if (ha <= 10) {
    score = 7
    details = `Medium plot (${ha.toFixed(2)}ha). Standard monitoring sufficient.`
  } else if (ha <= 50) {
    score = 4
    details = `Large plot (${ha.toFixed(2)}ha). Easy to monitor via satellite.`
  } else {
    score = 2
    details = `Very large plot (${ha.toFixed(2)}ha). Excellent satellite observability.`
  }

  return { score: Math.round(score * 10) / 10, details }
}

/**
 * Documentation completeness score: 0–15 pts
 * More documentation = lower risk.
 */
function scoreDocumentation(input: RiskScoreInput): { score: number; details: string } {
  if (input.documentsComplete) {
    return {
      score: 2,
      details: 'Core documentation complete (land title, traceability records). Low documentation risk.',
    }
  }

  return {
    score: 12,
    details: 'Missing required documentation. High documentation risk. Submit land title and traceability records.',
  }
}

/**
 * Estimate regional deforestation rate based on location.
 * Uses country base rate with distance-based adjustment from forest zones.
 */
function getRegionDeforestationRate(centroid: { lat: number; lng: number }, country: string): number {
  const profile = getCountryRiskProfile(country)
  let baseRate = profile.deforestationRate

  // Adjust based on proximity to high-risk zones
  const forestDist = calculateForestProximity(centroid)
  if (forestDist < 5) {
    baseRate *= 1.5 // Higher rate near forests
  } else if (forestDist < 15) {
    baseRate *= 1.2
  } else if (forestDist > 50) {
    baseRate *= 0.7 // Lower rate far from forests
  }

  return Math.round(baseRate * 100) / 100
}

// ============================================================
// Math helpers
// ============================================================

/**
 * Haversine distance between two lat/lng points in km.
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}