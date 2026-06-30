/**
 * Agrobase V3 — Climate Resilience Score Calculator
 *
 * 4-factor 0-100 score per farmer per month.
 *   Practices      (40 pts) — Farm5x practice adoption count
 *   Yield stability (20 pts) — coefficient of variation across 3 seasons
 *   Training       (20 pts) — training completion rate
 *   Climate exposure (20 pts) — plot geolocation + NDVI anomaly + drought index
 *
 * Risk category:
 *   LOW_RISK      70-100
 *   MEDIUM_RISK   50-69
 *   HIGH_RISK     30-49
 *   CRITICAL_RISK  0-29
 *
 * Used by:
 *   - /api/credit-score/[farmerId] (MFI underwriting API)
 *   - Nightly cron job (ClimateResilienceScore table)
 *   - Flutter impact dashboard (farmer view)
 */

import { db } from '@/lib/db'

export interface ClimateScoreInputs {
  practiceCount: number       // count of distinct Farm5x practices adopted
  yieldCV: number             // coefficient of variation across 3 seasons (0 = stable, 1 = unstable)
  trainingCompletionRate: number  // 0-1 (attended / total offered)
  climateExposure: number     // 0-1 (0 = low risk, 1 = high risk)
}

export interface ClimateScoreResult {
  score: number               // 0-100
  practicePoints: number      // /40
  yieldPoints: number         // /20
  trainingPoints: number      // /20
  climatePoints: number       // /20
  riskCategory: 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' | 'CRITICAL_RISK'
  inputs: ClimateScoreInputs
  previousScore?: number
  trend?: 'IMPROVING' | 'STABLE' | 'DECLINING'
}

/**
 * Calculate the climate resilience score from raw inputs.
 * Pure function — no DB calls. Testable in isolation.
 */
export function calculateClimateScore(inputs: ClimateScoreInputs, previousScore?: number): ClimateScoreResult {
  // 1. Practice points (0-40): 0 practices = 0 pts, 6+ practices = 40 pts
  const practicePoints = Math.min(40, Math.round((inputs.practiceCount / 6) * 40))

  // 2. Yield stability points (0-20): CV=0 → 20 pts, CV=0.5+ → 0 pts
  const yieldPoints = Math.max(0, Math.round(20 * (1 - Math.min(1, inputs.yieldCV / 0.5))))

  // 3. Training points (0-20): linear scale
  const trainingPoints = Math.round(inputs.trainingCompletionRate * 20)

  // 4. Climate exposure points (0-20): lower exposure = more points
  const climatePoints = Math.round((1 - inputs.climateExposure) * 20)

  const score = Math.min(100, Math.max(0, practicePoints + yieldPoints + trainingPoints + climatePoints))

  // Risk category
  const riskCategory: ClimateScoreResult['riskCategory'] =
    score >= 70 ? 'LOW_RISK' :
    score >= 50 ? 'MEDIUM_RISK' :
    score >= 30 ? 'HIGH_RISK' : 'CRITICAL_RISK'

  // Trend
  let trend: ClimateScoreResult['trend']
  if (previousScore == null) {
    trend = undefined
  } else if (score > previousScore + 3) {
    trend = 'IMPROVING'
  } else if (score < previousScore - 3) {
    trend = 'DECLINING'
  } else {
    trend = 'STABLE'
  }

  return {
    score,
    practicePoints,
    yieldPoints,
    trainingPoints,
    climatePoints,
    riskCategory,
    inputs,
    previousScore,
    trend,
  }
}

/**
 * Gather the raw inputs for a farmer's climate resilience score from the DB.
 *
 * This is the "data collection" step — it queries existing models to build
 * the ClimateScoreInputs object that calculateClimateScore() consumes.
 */
export async function gatherClimateScoreInputs(farmerId: string): Promise<ClimateScoreInputs> {
  // 1. Practice count: distinct Farm5x practices adopted (verified or pending)
  const practices = await db.practiceAdoption.findMany({
    where: { farmerId, verificationStatus: { in: ['VERIFIED', 'PENDING'] } },
    select: { practiceCode: true },
    distinct: ['practiceCode'],
  })
  const practiceCount = practices.length

  // 2. Yield CV: coefficient of variation across last 3 seasons' ProductBatch quantities
  const recentBatches = await db.productBatch.findMany({
    where: { farmerId: { equals: farmerId } },
    orderBy: { createdAt: 'desc' },
    take: 9, // ~3 seasons × 3 batches
    select: { quantityKg: true },
  })
  let yieldCV = 0.5 // default: unstable
  if (recentBatches.length >= 3) {
    const quantities = recentBatches.map(b => b.quantityKg).filter(Boolean) as number[]
    if (quantities.length >= 3) {
      const mean = quantities.reduce((s, q) => s + q, 0) / quantities.length
      const variance = quantities.reduce((s, q) => s + Math.pow(q - mean, 2), 0) / quantities.length
      const stdDev = Math.sqrt(variance)
      yieldCV = mean > 0 ? stdDev / mean : 0.5
    }
  }

  // 3. Training completion rate
  const [attended, total] = await Promise.all([
    db.trainingAttendance.count({ where: { farmerId, attended: true } }),
    db.trainingAttendance.count({ where: { farmerId } }),
  ])
  const trainingCompletionRate = total > 0 ? attended / total : 0

  // 4. Climate exposure: composite of plot EUDR risk level + NDVI anomaly
  const plots = await db.plot.findMany({
    where: { farmerId },
    select: { eudrRiskLevel: true, verificationScore: true },
  })
  let climateExposure = 0.5 // default: moderate
  if (plots.length > 0) {
    // Map risk levels to 0-1 exposure
    const riskMap: Record<string, number> = {
      LOW: 0.1, MEDIUM: 0.4, HIGH: 0.7, CRITICAL: 0.95,
    }
    const exposures = plots.map(p => {
      const riskExposure = riskMap[p.eudrRiskLevel ?? 'MEDIUM'] ?? 0.4
      // Lower verification score = higher climate exposure
      const verifScore = p.verificationScore ?? 50
      const verifExposure = (100 - verifScore) / 100
      return (riskExposure + verifExposure) / 2
    })
    climateExposure = exposures.reduce((s, e) => s + e, 0) / exposures.length
  }

  return {
    practiceCount,
    yieldCV,
    trainingCompletionRate,
    climateExposure,
  }
}

/**
 * Compute and persist the climate resilience score for a farmer in a given period.
 * Used by the nightly cron job.
 */
export async function computeAndPersistClimateScore(
  tenantId: string,
  farmerId: string,
  period: string,
): Promise<ClimateScoreResult> {
  const inputs = await gatherClimateScoreInputs(farmerId)

  // Fetch previous score for trend
  const previousRecord = await db.climateResilienceScore.findFirst({
    where: { farmerId, period: { not: period } },
    orderBy: { period: 'desc' },
    select: { score: true },
  })

  const result = calculateClimateScore(inputs, previousRecord?.score)

  // Upsert the score
  await db.climateResilienceScore.upsert({
    where: { farmerId_period: { farmerId, period } },
    update: {
      score: result.score,
      practicePoints: result.practicePoints,
      yieldPoints: result.yieldPoints,
      trainingPoints: result.trainingPoints,
      climatePoints: result.climatePoints,
      riskCategory: result.riskCategory,
      inputs: JSON.stringify(result.inputs),
      previousScore: result.previousScore,
      trend: result.trend,
    },
    create: {
      tenantId,
      farmerId,
      period,
      score: result.score,
      practicePoints: result.practicePoints,
      yieldPoints: result.yieldPoints,
      trainingPoints: result.trainingPoints,
      climatePoints: result.climatePoints,
      riskCategory: result.riskCategory,
      inputs: JSON.stringify(result.inputs),
      previousScore: result.previousScore,
      trend: result.trend,
    },
  })

  return result
}
