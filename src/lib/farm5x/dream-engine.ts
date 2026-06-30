/**
 * DREAM Methodology — MRV Pipeline Engine
 *
 * DREAM = Data collection, Remote sensing, Event detection,
 *          Analytics computation, Monitoring
 *
 * This engine tracks the 5-phase DREAM pipeline status per cultivation.
 * Each phase has a verification status: NOT_STARTED → IN_PROGRESS → VERIFIED
 *
 * The pipeline runs automatically:
 *   D: Farmer logs a stage event (Flutter app / USSD) → dreamData = true
 *   R: Satellite imagery confirms the event → dreamRemote = true
 *   E: Practice adoption detected (rule-based) → dreamEvent = true
 *   A: IPCC emissions calculated → dreamAnalytics = true
 *   M: Season-long KPI tracked → dreamMonitor = true
 *
 * When all 5 phases are VERIFIED for a cultivation, the season is
 * "DREAM-complete" and eligible for Verra credit issuance.
 */

import { db } from '@/lib/db'
import { computeEmissionReduction } from './definitions'

export type DreamPhase = 'D' | 'R' | 'E' | 'A' | 'M'
export type DreamStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'VERIFIED'

export interface DreamPipelineStatus {
  cultivationId: string
  cropVertical: string
  phases: {
    D: { status: DreamStatus; description: string; lastUpdated: Date | null }
    R: { status: DreamStatus; description: string; lastUpdated: Date | null }
    E: { status: DreamStatus; description: string; lastUpdated: Date | null }
    A: { status: DreamStatus; description: string; lastUpdated: Date | null }
    M: { status: DreamStatus; description: string; lastUpdated: Date | null }
  }
  overallProgress: number  // 0-100
  isDreamComplete: boolean
  farm5xEligibleForCredits: boolean
  adoptedPractices: string[]
  totalEmissionReductionPct: number
}

/**
 * Get the DREAM pipeline status for a cultivation.
 */
export async function getDreamPipelineStatus(cultivationId: string): Promise<DreamPipelineStatus | null> {
  const cultivation = await db.cultivation.findUnique({
    where: { id: cultivationId },
    select: {
      id: true,
      cropName: true,
      farm: { select: { farmerId: true, farmer: { select: { tenantId: true } } } },
    },
  })
  if (!cultivation) return null

  // Fetch all stage events for this cultivation
  const stageEvents = await db.cropStageEvent.findMany({
    where: { cultivationId },
    select: {
      dreamData: true, dreamRemote: true, dreamEvent: true,
      dreamAnalytics: true, dreamMonitor: true,
      farm5xPractice: true, farm5xVariant: true, cropVertical: true,
      stageName: true, eventType: true,
      carbonKgCO2e: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch Farm5x practice adoptions for the farmer
  const farmerId = cultivation.farm?.farmerId
  const practices = farmerId
    ? await db.practiceAdoption.findMany({
        where: { farmerId, verificationStatus: { in: ['VERIFIED', 'PENDING'] } },
        select: { practiceCode: true },
        distinct: ['practiceCode'],
      })
    : []
  const adoptedPracticeCodes = practices.map(p => p.practiceCode)
  const emissionReduction = computeEmissionReduction(adoptedPracticeCodes)

  // Determine DREAM phase statuses
  const hasData = stageEvents.some(e => e.dreamData)
  const hasRemote = stageEvents.some(e => e.dreamRemote)
  const hasEvent = stageEvents.some(e => e.dreamEvent)
  const hasAnalytics = stageEvents.some(e => e.dreamAnalytics || e.carbonKgCO2e > 0)
  const hasMonitor = stageEvents.some(e => e.dreamMonitor)

  const toStatus = (verified: boolean): DreamStatus =>
    verified ? 'VERIFIED' : stageEvents.length > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'

  const cropVertical = stageEvents[0]?.cropVertical || 'CROPCORE'

  const phases = {
    D: {
      status: toStatus(hasData),
      description: 'Data collected via Flutter app / USSD / cooperative ERP',
      lastUpdated: stageEvents.find(e => e.dreamData)?.createdAt || null,
    },
    R: {
      status: toStatus(hasRemote),
      description: 'Satellite imagery (Sentinel-2) confirms the event',
      lastUpdated: stageEvents.find(e => e.dreamRemote)?.createdAt || null,
    },
    E: {
      status: toStatus(hasEvent),
      description: 'Practice adoption detected (rule-based + satellite)',
      lastUpdated: stageEvents.find(e => e.dreamEvent)?.createdAt || null,
    },
    A: {
      status: toStatus(hasAnalytics),
      description: 'IPCC Tier 2 emissions calculated for this stage',
      lastUpdated: stageEvents.find(e => e.dreamAnalytics)?.createdAt || null,
    },
    M: {
      status: toStatus(hasMonitor),
      description: 'Season-long monitoring tracked (yield, NUE, carbon)',
      lastUpdated: stageEvents.find(e => e.dreamMonitor)?.createdAt || null,
    },
  }

  const verifiedCount = Object.values(phases).filter(p => p.status === 'VERIFIED').length
  const overallProgress = Math.round((verifiedCount / 5) * 100)
  const isDreamComplete = verifiedCount === 5

  return {
    cultivationId,
    cropVertical,
    phases,
    overallProgress,
    isDreamComplete,
    farm5xEligibleForCredits: emissionReduction.eligibleForCredits,
    adoptedPractices: adoptedPracticeCodes,
    totalEmissionReductionPct: emissionReduction.totalPct,
  }
}

/**
 * Update the DREAM phase status for a stage event.
 * Called by the satellite orchestrator when it confirms an event,
 * by the carbon calculator when it computes emissions, etc.
 */
export async function updateDreamPhase(
  stageEventId: string,
  phase: DreamPhase,
  verified: boolean,
): Promise<void> {
  const updateData: Record<string, boolean> = {}
  updateData[`dream${phase}`] = verified

  await db.cropStageEvent.update({
    where: { id: stageEventId },
    data: updateData,
  })
}

/**
 * Auto-advance the DREAM pipeline when a stage event is created.
 * Phase D (Data) is automatically set to true when an event is logged.
 */
export async function autoAdvanceDreamPipeline(stageEventId: string): Promise<void> {
  await db.cropStageEvent.update({
    where: { id: stageEventId },
    data: { dreamData: true },
  })
}
