/**
 * Agrobase V3 — Credit Scoring Engine
 *
 * Algorithmic credit scoring for smallholder farmers (0–1000 scale).
 * Uses multiple weighted factors to compute a holistic credit score.
 *
 * Score breakdown:
 *   - Payment history     (30%): VSLA loan repayment timeliness
 *   - Farm productivity   (25%): Actual vs estimated yield ratio
 *   - Engagement          (20%): Training attendance, farm visit count
 *   - Savings behavior    (15%): VSLA savings consistency
 *   - Relationship length (10%): Months since first registration
 *
 * Risk categories:
 *   HIGH:   0 – 400
 *   MEDIUM: 401 – 700
 *   LOW:    701 – 1000
 */

import { db } from '@/lib/db'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreditScoreResult {
  score: number
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH'
  breakdown: Record<string, number>
  recommendations: string[]
}

export interface ScoreSnapshot {
  id: string
  score: number
  demographicsScore: number | null
  assetScore: number | null
  cropScore: number | null
  financialScore: number | null
  totalScore: number | null
  scoreDate: Date
  // Engine-computed breakdown (stored alongside as JSON in a real extension)
  breakdown?: Record<string, number>
}

// ─── Scoring Weights ─────────────────────────────────────────────────────────

const WEIGHTS = {
  PAYMENT_HISTORY: 0.30,
  FARM_PRODUCTIVITY: 0.25,
  ENGAGEMENT: 0.20,
  SAVINGS_BEHAVIOR: 0.15,
  RELATIONSHIP_LENGTH: 0.10,
} as const

// ─── Credit Scoring Engine ───────────────────────────────────────────────────

export class CreditScoringEngine {
  /**
   * Calculate a credit score for a farmer.
   * Computes an algorithmic 0–1000 score based on 5 weighted factors.
   *
   * @param farmerId - The farmer's profile ID
   * @returns Full credit score result with breakdown and recommendations
   */
  async calculateScore(farmerId: string): Promise<CreditScoreResult> {
    const farmer = await db.farmerProfile.findUnique({
      where: { id: farmerId },
      select: { id: true, createdAt: true, tenantId: true },
    })

    if (!farmer) {
      throw new Error(`Farmer ${farmerId} not found`)
    }

    // Compute each factor (0–100 scale)
    const [paymentScore, productivityScore, engagementScore, savingsScore, relationshipScore] =
      await Promise.all([
        this.computePaymentHistory(farmerId),
        this.computeFarmProductivity(farmerId),
        this.computeEngagement(farmerId),
        this.computeSavingsBehavior(farmerId),
        this.computeRelationshipLength(farmer.createdAt),
      ])

    // Weighted sum → 0–1000
    const totalScore = Math.round(
      paymentScore * WEIGHTS.PAYMENT_HISTORY * 10 +
      productivityScore * WEIGHTS.FARM_PRODUCTIVITY * 10 +
      engagementScore * WEIGHTS.ENGAGEMENT * 10 +
      savingsScore * WEIGHTS.SAVINGS_BEHAVIOR * 10 +
      relationshipScore * WEIGHTS.RELATIONSHIP_LENGTH * 10
    )

    // Clamp to 0–1000
    const clampedScore = Math.max(0, Math.min(1000, totalScore))
    const riskCategory = this.getRiskCategory(clampedScore)

    const breakdown: Record<string, number> = {
      paymentHistory: Math.round(paymentScore * 10 * WEIGHTS.PAYMENT_HISTORY),
      farmProductivity: Math.round(productivityScore * 10 * WEIGHTS.FARM_PRODUCTIVITY),
      engagement: Math.round(engagementScore * 10 * WEIGHTS.ENGAGEMENT),
      savingsBehavior: Math.round(savingsScore * 10 * WEIGHTS.SAVINGS_BEHAVIOR),
      relationshipLength: Math.round(relationshipScore * 10 * WEIGHTS.RELATIONSHIP_LENGTH),
    }

    const recommendations = this.generateRecommendations({
      paymentScore,
      productivityScore,
      engagementScore,
      savingsScore,
      relationshipScore,
    }, riskCategory)

    // Persist to the CreditScore model
    await db.creditScore.create({
      data: {
        farmerId,
        demographicsScore: relationshipScore, // reuse the relationship score
        assetScore: savingsScore, // savings as a proxy for assets
        cropScore: productivityScore,
        financialScore: paymentScore,
        totalScore: clampedScore,
      },
    })

    return {
      score: clampedScore,
      riskCategory,
      breakdown,
      recommendations,
    }
  }

  /**
   * Get historical credit scores for a farmer.
   *
   * @param farmerId - The farmer's profile ID
   * @param months   - How many months of history to return (default 12)
   * @returns Array of past score snapshots, newest first
   */
  async getScoreHistory(farmerId: string, months: number = 12): Promise<ScoreSnapshot[]> {
    const since = new Date()
    since.setMonth(since.getMonth() - months)

    const scores = await db.creditScore.findMany({
      where: {
        farmerId,
        scoreDate: { gte: since },
      },
      orderBy: { scoreDate: 'desc' },
    })

    return scores.map((s) => ({
      id: s.id,
      score: s.totalScore ?? 0,
      demographicsScore: s.demographicsScore,
      assetScore: s.assetScore,
      cropScore: s.cropScore,
      financialScore: s.financialScore,
      totalScore: s.totalScore,
      scoreDate: s.scoreDate,
    }))
  }

  /**
   * Determine the risk category from a numeric score.
   *   0–400:   HIGH risk
   *   401–700: MEDIUM risk
   *   701–1000: LOW risk
   */
  getRiskCategory(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score <= 400) return 'HIGH'
    if (score <= 700) return 'MEDIUM'
    return 'LOW'
  }

  // ─── Factor Computations ───────────────────────────────────────────────────

  /**
   * Payment History (30% weight)
   *
   * Measures VSLA loan repayment timeliness.
   * Looks at all loans for this farmer:
   *   - REPAID loans with amountRepaid >= totalRepayable → on-time (100 pts)
   *   - OVERDUE loans → penalty
   *   - Ratio of total repaid to total owed
   *
   * Returns 0–100.
   */
  private async computePaymentHistory(farmerId: string): Promise<number> {
    const loans = await db.vslaLoan.findMany({
      where: { farmerId },
      select: {
        amount: true,
        totalRepayable: true,
        amountRepaid: true,
        status: true,
        dueDate: true,
      },
    })

    if (loans.length === 0) {
      // No loan history — neutral score (50 out of 100)
      return 50
    }

    let totalOwed = 0
    let totalRepaid = 0
    let onTimeCount = 0
    let overdueCount = 0

    for (const loan of loans) {
      totalOwed += loan.totalRepayable
      totalRepaid += loan.amountRepaid

      if (loan.status === 'REPAID') {
        onTimeCount++
      } else if (loan.status === 'OVERDUE') {
        overdueCount++
      } else if (loan.dueDate && loan.dueDate < new Date() && loan.status === 'DISBURSED') {
        overdueCount++
      }
    }

    if (totalOwed === 0) return 50

    // Repayment ratio (0–100)
    const repaymentRatio = Math.min(1, totalRepaid / totalOwed)

    // On-time ratio (0–100)
    const completedLoans = loans.filter((l) => ['REPAID', 'OVERDUE'].includes(l.status))
    const onTimeRatio = completedLoans.length > 0
      ? onTimeCount / completedLoans.length
      : 0.5 // Neutral if no completed loans

    // Overdue penalty
    const overduePenalty = Math.min(0.3, overdueCount * 0.1)

    // Weighted combination
    const rawScore = (repaymentRatio * 0.6 + onTimeRatio * 0.4) * 100 - overduePenalty * 100
    return Math.max(0, Math.min(100, Math.round(rawScore)))
  }

  /**
   * Farm Productivity (25% weight)
   *
   * Measures actual yield vs estimated yield across all cultivations.
   * A ratio >= 1.0 (meeting or exceeding estimates) scores highest.
   *
   * Returns 0–100.
   */
  private async computeFarmProductivity(farmerId: string): Promise<number> {
    // Get all farm lands for this farmer
    const farmLands = await db.farmLand.findMany({
      where: { farmerId, isActive: true },
      select: { id: true },
    })

    if (farmLands.length === 0) {
      // Check if the farmer has farmSize set on their profile
      const farmer = await db.farmerProfile.findUnique({
        where: { id: farmerId },
        select: { farmSize: true, mainCrops: true },
      })
      if (farmer?.farmSize && farmer.farmSize > 0) {
        return 50 // Has farm but no yield data — neutral
      }
      return 30 // No farm data at all
    }

    const farmIds = farmLands.map((f) => f.id)

    // Get cultivations with both estimated and actual yield
    const cultivations = await db.cultivation.findMany({
      where: {
        farmId: { in: farmIds },
        estimatedYield: { not: null, gt: 0 },
        actualYield: { not: null },
      },
      select: { estimatedYield: true, actualYield: true },
    })

    if (cultivations.length === 0) {
      // Has farm lands but no yield data — slightly below neutral
      return 45
    }

    // Compute average yield ratio (actual / estimated)
    let totalRatio = 0
    for (const c of cultivations) {
      const ratio = c.actualYield! / c.estimatedYield!
      // Cap at 2.0 to avoid over-rewarding outliers
      totalRatio += Math.min(2.0, ratio)
    }
    const avgRatio = totalRatio / cultivations.length

    // Convert ratio to 0–100 score
    // ratio >= 1.0 → 100, ratio 0.5 → 50, ratio 0.0 → 0
    const rawScore = Math.min(100, avgRatio * 100)
    return Math.max(0, Math.min(100, Math.round(rawScore)))
  }

  /**
   * Engagement (20% weight)
   *
   * Measures farmer engagement through:
   *   - Training attendance rate
   *   - Number of farm visits received
   *
   * Returns 0–100.
   */
  private async computeEngagement(farmerId: string): Promise<number> {
    // Training attendance
    const trainings = await db.trainingAttendance.findMany({
      where: { farmerId },
      select: { attended: true },
    })

    const trainingScore = trainings.length > 0
      ? (trainings.filter((t) => t.attended).length / trainings.length) * 100
      : 30 // No training record

    // Farm visits
    const visits = await db.farmVisit.findMany({
      where: { farmerId },
      select: { id: true },
    })

    // More visits = more engaged. Score based on visit count:
    // 0 visits → 0, 1–2 → 50, 3–5 → 75, 6+ → 100
    let visitScore: number
    if (visits.length === 0) {
      visitScore = 0
    } else if (visits.length <= 2) {
      visitScore = 50
    } else if (visits.length <= 5) {
      visitScore = 75
    } else {
      visitScore = 100
    }

    // Weighted: training (60%) + visits (40%)
    const rawScore = trainingScore * 0.6 + visitScore * 0.4
    return Math.max(0, Math.min(100, Math.round(rawScore)))
  }

  /**
   * Savings Behavior (15% weight)
   *
   * Measures VSLA savings consistency:
   *   - Number of savings transactions
   *   - Total amount saved
   *   - Regularity (coefficient of variation of monthly savings)
   *
   * Returns 0–100.
   */
  private async computeSavingsBehavior(farmerId: string): Promise<number> {
    const savings = await db.vslaSaving.findMany({
      where: { farmerId, status: 'COMPLETED' },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    if (savings.length === 0) {
      return 25 // No savings history — low but not zero
    }

    // Factor 1: Volume of savings (0–40 points)
    // Normalize total savings: 0 → 0, >100k UGX equivalent → 40
    const totalSaved = savings.reduce((sum, s) => sum + s.amount, 0)
    const volumeScore = Math.min(40, (totalSaved / 100000) * 40)

    // Factor 2: Frequency (0–30 points)
    // More savings transactions = more consistent
    const frequencyScore = Math.min(30, savings.length * 5)

    // Factor 3: Regularity (0–30 points)
    // Group savings by month and check consistency
    const monthlyTotals = new Map<string, number>()
    for (const s of savings) {
      const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, '0')}`
      monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + s.amount)
    }

    const monthlyAmounts = Array.from(monthlyTotals.values())
    let regularityScore: number
    if (monthlyAmounts.length < 2) {
      regularityScore = 15 // Only 1 month of data — partial credit
    } else {
      const mean = monthlyAmounts.reduce((a, b) => a + b, 0) / monthlyAmounts.length
      if (mean === 0) {
        regularityScore = 0
      } else {
        const stdDev = Math.sqrt(
          monthlyAmounts.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / monthlyAmounts.length
        )
        const cv = stdDev / mean // Coefficient of variation
        // CV 0 → perfectly regular → 30, CV > 1 → irregular → 0
        regularityScore = Math.max(0, 30 - cv * 30)
      }
    }

    const rawScore = volumeScore + frequencyScore + regularityScore
    return Math.max(0, Math.min(100, Math.round(rawScore)))
  }

  /**
   * Relationship Length (10% weight)
   *
   * Measures how long the farmer has been on the platform.
   * Capped at 36 months for full score.
   *
   * Returns 0–100.
   */
  private computeRelationshipLength(registeredAt: Date): number {
    const now = new Date()
    const monthsSinceRegistration =
      (now.getFullYear() - registeredAt.getFullYear()) * 12 +
      (now.getMonth() - registeredAt.getMonth())

    // 0 months → 0, 36+ months → 100
    const score = Math.min(100, (monthsSinceRegistration / 36) * 100)
    return Math.max(0, Math.round(score))
  }

  // ─── Recommendations ───────────────────────────────────────────────────────

  private generateRecommendations(
    scores: {
      paymentScore: number
      productivityScore: number
      engagementScore: number
      savingsScore: number
      relationshipScore: number
    },
    riskCategory: 'LOW' | 'MEDIUM' | 'HIGH',
  ): string[] {
    const recommendations: string[] = []

    if (scores.paymentScore < 50) {
      recommendations.push(
        'Improve loan repayment consistency. Consider setting up automatic deductions or reminders before due dates.'
      )
    }

    if (scores.productivityScore < 40) {
      recommendations.push(
        'Actual yields are below estimates. Consider attending agronomy training and adopting improved farming practices.'
      )
    }

    if (scores.engagementScore < 40) {
      recommendations.push(
        'Increase engagement by attending training sessions and scheduling regular farm visits with extension officers.'
      )
    }

    if (scores.savingsScore < 40) {
      recommendations.push(
        'Build a stronger savings history by making regular weekly or monthly contributions to your VSLA group.'
      )
    }

    if (scores.relationshipScore < 30) {
      recommendations.push(
        'Credit history is limited. Continue using the platform to build a longer track record.'
      )
    }

    if (riskCategory === 'LOW') {
      recommendations.push(
        'Excellent credit profile. This farmer qualifies for premium loan products with lower interest rates.'
      )
    } else if (riskCategory === 'HIGH') {
      recommendations.push(
        'High risk profile. Recommend smaller loan amounts with closer monitoring until credit behavior improves.'
      )
    }

    // Ensure at least one recommendation
    if (recommendations.length === 0) {
      recommendations.push('Credit profile is solid. Continue current engagement and savings patterns.')
    }

    return recommendations
  }
}

/** Singleton instance for application-wide use */
export const creditScoringEngine = new CreditScoringEngine()