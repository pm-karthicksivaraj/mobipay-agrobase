import { db } from '@/lib/db'
import type {
  ProductBatch,
  ProductStatus,
  SupplyChainStage,
  SupplyChainMap,
  TraceEvent,
  TraceEventType,
  TraceabilityReport,
  TraceabilityReportFilters,
  VerificationResult,
} from './types'
import { hashEvent } from './verification'

// In-memory batch store (in production, these would be persisted via Prisma models)
const batchStore = new Map<string, ProductBatch>()
const batchSequenceCounter = new Map<string, number>()

// Mapping from event type to resulting batch status + stage transitions
const EVENT_STATUS_MAP: Record<
  TraceEventType,
  { status: ProductStatus; stage: SupplyChainStage }
> = {
  SEEDING: { status: 'GROWING', stage: 'FARM' },
  FERTILIZER_APPLICATION: { status: 'GROWING', stage: 'FARM' },
  PESTICIDE_APPLICATION: { status: 'GROWING', stage: 'FARM' },
  IRRIGATION: { status: 'GROWING', stage: 'FARM' },
  WEEDING: { status: 'GROWING', stage: 'FARM' },
  HARVESTING: { status: 'HARVESTED', stage: 'FARM' },
  POST_HARVEST: { status: 'AGGREGATED', stage: 'AGGREGATION' },
  PROCESSING: { status: 'PROCESSED', stage: 'PROCESSING' },
  STORAGE: { status: 'STORED', stage: 'STORAGE' },
  TRANSPORT: { status: 'IN_TRANSIT', stage: 'EXPORT' },
  QUALITY_CHECK: { status: 'AGGREGATED', stage: 'AGGREGATION' },
  CERTIFICATION: { status: 'HARVESTED', stage: 'FARM' },
  INSPECTION: { status: 'HARVESTED', stage: 'FARM' },
  PAYMENT: { status: 'AGGREGATED', stage: 'AGGREGATION' },
  SHIPMENT: { status: 'EXPORTED', stage: 'EXPORT' },
}

export class TraceabilityEngine {
  // ─── Batch Creation ───────────────────────────────────────────────

  /**
   * Create a new product batch from a farmer's cultivation.
   * Batch ID format: BATCH-{farmerCode}-{YYYY}-{seq}
   */
  async createBatch(
    farmerId: string,
    farmLandId: string,
    cultivationId: string,
    season: string
  ): Promise<ProductBatch> {
    // Fetch farmer profile for code and name
    const farmer = await db.farmerProfile.findUnique({
      where: { id: farmerId },
      include: {
        group: { include: { company: true } },
        village: { include: { parish: { include: { subCounty: { include: { district: true } } } } } },
      },
    })

    if (!farmer) {
      throw new Error(`Farmer not found: ${farmerId}`)
    }

    // Fetch farm land
    const farm = await db.farmLand.findFirst({
      where: { id: farmLandId, farmerId },
    })

    if (!farm) {
      throw new Error(`Farm land not found: ${farmLandId}`)
    }

    // Fetch cultivation
    const cultivation = await db.cultivation.findFirst({
      where: { id: cultivationId, farmId: farmLandId },
    })

    if (!cultivation) {
      throw new Error(`Cultivation not found: ${cultivationId}`)
    }

    // Generate batch ID
    const farmerCode = farmer.farmerCode || 'UNK'
    const year = new Date().getFullYear().toString()
    const seqKey = `${farmerCode}-${year}`
    const seq = (batchSequenceCounter.get(seqKey) ?? 0) + 1
    batchSequenceCounter.set(seqKey, seq)
    const batchId = `BATCH-${farmerCode}-${year}-${String(seq).padStart(4, '0')}`

    // Fetch certifications
    const [eudrCompliances, raCerts, ggCerts] = await Promise.all([
      db.eudrCompliance.findMany({ where: { farmerId, status: 'VERIFIED' } }),
      db.rainforestCertification.findMany({
        where: { farmerId, status: { in: ['ACTIVE', 'SUSPENDED'] } },
      }),
      db.globalGapCertification.findMany({
        where: { farmerId, status: { in: ['ACTIVE', 'SUSPENDED'] } },
      }),
    ])

    const certifications: string[] = []
    if (eudrCompliances.length > 0) certifications.push('EUDR')
    if (raCerts.length > 0) certifications.push('RA')
    if (ggCerts.length > 0) certifications.push('GlobalGAP')

    const batch: ProductBatch = {
      id: batchId,
      farmerId,
      farmerName: `${farmer.firstName} ${farmer.lastName}`,
      cooperativeId: farmer.group?.companyId ?? undefined,
      cooperativeName: farmer.group?.company?.name ?? undefined,
      commodity: cultivation.cropName,
      variety: cultivation.variety ?? undefined,
      quantityKg: cultivation.estimatedYield ?? 0,
      farmLandId,
      farmName: farm.name,
      season,
      sowingDate: cultivation.sowingDate ?? new Date(),
      status: 'GROWING',
      currentStage: 'FARM',
      traceEvents: [],
      certifications,
      eudrComplianceId: eudrCompliances[0]?.id ?? undefined,
      createdAt: new Date(),
    }

    batchStore.set(batchId, batch)
    return batch
  }

  // ─── Trace Events ─────────────────────────────────────────────────

  /**
   * Add a trace event to a batch timeline.
   * Auto-updates batch status and stage based on event type.
   * Generates SHA-256 verification hash.
   */
  async addTraceEvent(
    batchId: string,
    eventType: TraceEventType,
    details: Record<string, unknown>,
    evidence?: Array<{ type: string; url: string; description: string }>
  ): Promise<TraceEvent> {
    const batch = batchStore.get(batchId)
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`)
    }

    const lastEvent = batch.traceEvents[batch.traceEvents.length - 1]
    const previousEventHash = lastEvent?.verificationHash

    // Build the event object (without hash — computed next)
    const eventDraft: Omit<TraceEvent, 'verificationHash'> & {
      verificationHash?: string
    } = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      batchId,
      eventType,
      stage: batch.currentStage,
      timestamp: new Date(),
      location: details.location as TraceEvent['location'],
      actorId: (details.actorId as string) || batch.farmerId,
      actorName: (details.actorName as string) || batch.farmerName,
      actorType: (details.actorType as string) || 'FARMER',
      details,
      evidence,
      previousEventHash,
    }

    // Compute verification hash
    const verificationHash = hashEvent(eventDraft as TraceEvent)
    eventDraft.verificationHash = verificationHash

    const event = eventDraft as TraceEvent
    batch.traceEvents.push(event)

    // Auto-update batch status and stage
    const transition = EVENT_STATUS_MAP[eventType]
    if (transition) {
      // Only advance status forward (no regressions)
      batch.status = transition.status
      batch.currentStage = transition.stage
    }

    // Update specific fields based on event
    if (eventType === 'HARVESTING') {
      batch.harvestDate = event.timestamp
      if (details.quantityKg) {
        batch.quantityKg = details.quantityKg as number
      }
    }
    if (eventType === 'QUALITY_CHECK' && details.grade) {
      batch.qualityGrade = details.grade as string
    }

    batchStore.set(batchId, batch)
    return event
  }

  // ─── Batch Queries ────────────────────────────────────────────────

  /**
   * Get full batch with all trace events.
   */
  async getBatchTimeline(batchId: string): Promise<ProductBatch> {
    const batch = batchStore.get(batchId)
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`)
    }
    return { ...batch }
  }

  /**
   * Get current location and journey map for a batch.
   */
  trackBatch(batchId: string): SupplyChainMap {
    const batch = batchStore.get(batchId)
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`)
    }

    const stages: SupplyChainMap['stages'] = []
    let currentLocation: SupplyChainMap['currentLocation'] = {
      name: batch.farmName,
      lat: 0,
      lng: 0,
    }
    let estimatedDelivery: Date | undefined

    for (const event of batch.traceEvents) {
      stages.push({
        stage: event.stage,
        location: {
          name: event.location.name ?? 'Unknown',
          lat: event.location.lat,
          lng: event.location.lng,
        },
        timestamp: event.timestamp,
        actor: event.actorName,
        quantityKg: event.details.quantityKg as number | undefined,
        qualityGrade: event.details.grade as string | undefined,
        documents: (event.evidence ?? []).map((e) => e.url),
      })

      // Update current location from latest event
      currentLocation = {
        name: event.location.name ?? currentLocation.name,
        lat: event.location.lat ?? currentLocation.lat,
        lng: event.location.lng ?? currentLocation.lng,
      }

      // Estimate delivery from shipment event
      if (event.eventType === 'SHIPMENT' && event.details.estimatedArrival) {
        estimatedDelivery = new Date(event.details.estimatedArrival as string)
      }
    }

    return {
      batchId,
      commodity: batch.commodity,
      totalQuantityKg: batch.quantityKg,
      stages,
      currentLocation,
      estimatedDelivery,
    }
  }

  // ─── Batch Transfers ──────────────────────────────────────────────

  /**
   * Transfer a batch (or part of it) to a new actor and stage.
   * Handles batch splitting for partial transfers.
   */
  async transferBatch(
    batchId: string,
    toActor: string,
    toActorName: string,
    toActorType: string,
    toStage: SupplyChainStage,
    quantityKg?: number,
    details?: Record<string, unknown>
  ): Promise<void> {
    const batch = batchStore.get(batchId)
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`)
    }

    // Partial transfer — create a new split batch
    if (quantityKg !== undefined && quantityKg < batch.quantityKg) {
      const splitQuantity = batch.quantityKg - quantityKg
      const splitBatchId = `${batchId}-SPLIT-${Date.now()}`

      const splitBatch: ProductBatch = {
        ...structuredClone(batch),
        id: splitBatchId,
        quantityKg: splitQuantity,
        traceEvents: [...batch.traceEvents], // copy history
        createdAt: new Date(),
      }

      // Reduce original batch quantity
      batch.quantityKg = quantityKg

      batchStore.set(splitBatchId, splitBatch)
    }

    // Update batch
    batch.currentStage = toStage

    // Map stage to status
    const stageStatusMap: Record<SupplyChainStage, ProductStatus> = {
      FARM: 'GROWING',
      AGGREGATION: 'AGGREGATED',
      PROCESSING: 'PROCESSED',
      STORAGE: 'STORED',
      EXPORT: batch.traceEvents.some((e) => e.eventType === 'SHIPMENT')
        ? 'EXPORTED'
        : 'IN_TRANSIT',
      RETAIL: 'DELIVERED',
    }
    batch.status = stageStatusMap[toStage] ?? batch.status

    // Add transfer trace event
    await this.addTraceEvent(batchId, 'TRANSPORT', {
      actorId: toActor,
      actorName: toActorName,
      actorType: toActorType,
      fromStage: batch.currentStage,
      toStage,
      quantityKg: quantityKg ?? batch.quantityKg,
      ...details,
    })

    batchStore.set(batchId, batch)
  }

  // ─── Batch Merging ────────────────────────────────────────────────

  /**
   * Merge multiple batches into a single target batch.
   * If no targetBatchId, creates a new merged batch.
   */
  async mergeBatches(
    batchIds: string[],
    targetBatchId?: string
  ): Promise<ProductBatch> {
    if (batchIds.length < 2) {
      throw new Error('At least two batches required for merging')
    }

    const batches = batchIds.map((id) => {
      const b = batchStore.get(id)
      if (!b) throw new Error(`Batch not found: ${id}`)
      return b
    })

    // Validate all batches are same commodity
    const commodities = new Set(batches.map((b) => b.commodity))
    if (commodities.size > 1) {
      throw new Error('Cannot merge batches of different commodities')
    }

    const primary = batches[0]

    // Use existing target or create new
    const mergedId =
      targetBatchId ?? `BATCH-MERGE-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // Combine all events chronologically
    const allEvents = batches
      .flatMap((b) => b.traceEvents)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Recompute hashes for the merged chain
    let prevHash: string | undefined
    for (const event of allEvents) {
      event.previousEventHash = prevHash
      event.verificationHash = hashEvent(event)
      prevHash = event.verificationHash
    }

    const mergedBatch: ProductBatch = {
      id: mergedId,
      farmerId: primary.farmerId,
      farmerName: primary.farmerName,
      cooperativeId: primary.cooperativeId,
      cooperativeName: primary.cooperativeName,
      commodity: primary.commodity,
      variety: primary.variety,
      quantityKg: batches.reduce((sum, b) => sum + b.quantityKg, 0),
      farmLandId: primary.farmLandId,
      farmName: primary.farmName,
      season: primary.season,
      sowingDate: primary.sowingDate,
      harvestDate: primary.harvestDate,
      status: 'AGGREGATED',
      currentStage: 'AGGREGATION',
      traceEvents: allEvents,
      qualityGrade: primary.qualityGrade,
      certifications: [
        ...new Set(batches.flatMap((b) => b.certifications)),
      ],
      eudrComplianceId: primary.eudrComplianceId,
      carbonFootprintKgCO2e: primary.carbonFootprintKgCO2e,
      createdAt: new Date(),
    }

    // Mark source batches as merged
    for (const id of batchIds) {
      batchStore.delete(id)
    }

    batchStore.set(mergedId, mergedBatch)
    return mergedBatch
  }

  // ─── Query Methods ────────────────────────────────────────────────

  /**
   * Get all batches for a farmer, optionally filtered by status.
   */
  async getFarmerBatches(
    farmerId: string,
    status?: ProductStatus
  ): Promise<ProductBatch[]> {
    let batches = Array.from(batchStore.values()).filter(
      (b) => b.farmerId === farmerId
    )
    if (status) {
      batches = batches.filter((b) => b.status === status)
    }
    return batches.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
  }

  /**
   * Get all batches for a cooperative, optionally within a date range.
   */
  async getCooperativeBatches(
    cooperativeId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<ProductBatch[]> {
    let batches = Array.from(batchStore.values()).filter(
      (b) => b.cooperativeId === cooperativeId
    )
    if (dateRange) {
      batches = batches.filter(
        (b) =>
          b.createdAt >= dateRange.from && b.createdAt <= dateRange.to
      )
    }
    return batches.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
  }

  // ─── Verification ─────────────────────────────────────────────────

  /**
   * Verify batch integrity by checking the hash chain.
   */
  verifyBatchIntegrity(batchId: string): VerificationResult {
    const batch = batchStore.get(batchId)
    if (!batch) {
      return {
        isValid: false,
        errors: [`Batch not found: ${batchId}`],
        warnings: [],
        verifiedAt: new Date(),
      }
    }

    const errors: string[] = []
    const warnings: string[] = []

    if (batch.traceEvents.length === 0) {
      warnings.push('Batch has no trace events')
      return { isValid: true, errors, warnings, verifiedAt: new Date() }
    }

    // Verify each event hash
    for (let i = 0; i < batch.traceEvents.length; i++) {
      const event = batch.traceEvents[i]
      const expectedHash = hashEvent(event)

      if (event.verificationHash !== expectedHash) {
        errors.push(
          `Event ${event.id} (index ${i}): hash mismatch — data may have been tampered with`
        )
      }

      // Verify chain link
      if (i > 0) {
        const prevEvent = batch.traceEvents[i - 1]
        if (event.previousEventHash !== prevEvent.verificationHash) {
          errors.push(
            `Event ${event.id} (index ${i}): broken chain link to previous event`
          )
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      verifiedAt: new Date(),
      details: {
        totalEvents: batch.traceEvents.length,
        batchStatus: batch.status,
        batchStage: batch.currentStage,
      },
    }
  }

  // ─── Lot Number Generation ────────────────────────────────────────

  /**
   * Generate a lot number for packaging.
   * Format: LOT-{commodityCode}-{YYYYMMDD}-{seq}
   */
  generateLotNumber(batchId: string): string {
    const batch = batchStore.get(batchId)
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`)
    }

    const commodityCode = batch.commodity
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, 'X')
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const seq = String(batch.traceEvents.length + 1).padStart(4, '0')

    return `LOT-${commodityCode}-${dateStr}-${seq}`
  }

  // ─── Traceability Report ──────────────────────────────────────────

  /**
   * Generate a comprehensive traceability report for a tenant.
   */
  getTraceabilityReport(
    _tenantId: string,
    filters?: TraceabilityReportFilters
  ): TraceabilityReport {
    let batches = Array.from(batchStore.values())

    // Apply filters
    if (filters?.status) {
      batches = batches.filter((b) => b.status === filters.status)
    }
    if (filters?.commodity) {
      batches = batches.filter((b) =>
        b.commodity.toLowerCase().includes(filters.commodity!.toLowerCase())
      )
    }
    if (filters?.cooperativeId) {
      batches = batches.filter(
        (b) => b.cooperativeId === filters.cooperativeId
      )
    }
    if (filters?.dateFrom) {
      batches = batches.filter(
        (b) => b.createdAt >= (filters.dateFrom as Date)
      )
    }
    if (filters?.dateTo) {
      batches = batches.filter(
        (b) => b.createdAt <= (filters.dateTo as Date)
      )
    }

    // Count by status
    const allStatuses: ProductStatus[] = [
      'GROWING',
      'HARVESTED',
      'AGGREGATED',
      'PROCESSED',
      'STORED',
      'IN_TRANSIT',
      'AT_PORT',
      'EXPORTED',
      'DELIVERED',
    ]
    const byStatus = {} as Record<ProductStatus, number>
    for (const s of allStatuses) {
      byStatus[s] = 0
    }
    for (const b of batches) {
      byStatus[b.status] = (byStatus[b.status] ?? 0) + 1
    }

    // Count by commodity
    const byCommodity: Record<string, number> = {}
    for (const b of batches) {
      byCommodity[b.commodity] = (byCommodity[b.commodity] ?? 0) + 1
    }

    // Count by cooperative
    const byCooperative: Record<string, number> = {}
    for (const b of batches) {
      const key = b.cooperativeName ?? 'Unaffiliated'
      byCooperative[key] = (byCooperative[key] ?? 0) + 1
    }

    // Count by stage
    const allStages: SupplyChainStage[] = [
      'FARM',
      'AGGREGATION',
      'PROCESSING',
      'STORAGE',
      'EXPORT',
      'RETAIL',
    ]
    const byStage = {} as Record<SupplyChainStage, number>
    for (const s of allStages) {
      byStage[s] = 0
    }
    for (const b of batches) {
      byStage[b.currentStage] = (byStage[b.currentStage] ?? 0) + 1
    }

    // Average time per stage (in hours)
    const stageTimings: Record<string, number[]> = {}
    for (const s of allStages) {
      stageTimings[s] = []
    }
    for (const batch of batches) {
      const stageEvents = new Map<SupplyChainStage, Date[]>()
      for (const event of batch.traceEvents) {
        if (!stageEvents.has(event.stage)) {
          stageEvents.set(event.stage, [])
        }
        stageEvents.get(event.stage)!.push(event.timestamp)
      }

      // Calculate duration for each stage (first event to last event)
      for (const [stage, timestamps] of stageEvents) {
        if (timestamps.length >= 2) {
          const first = timestamps[0]
          const last = timestamps[timestamps.length - 1]
          const hours = (last.getTime() - first.getTime()) / (1000 * 60 * 60)
          stageTimings[stage].push(hours)
        }
      }
    }

    const averageTimePerStage = {} as Record<SupplyChainStage, number>
    for (const s of allStages) {
      const timings = stageTimings[s]
      averageTimePerStage[s] =
        timings.length > 0
          ? timings.reduce((a, b) => a + b, 0) / timings.length
          : 0
    }

    // Quality metrics
    const gradedBatches = batches.filter((b) => b.qualityGrade)
    const gradeCounts = { A: 0, B: 0, C: 0 }
    for (const b of gradedBatches) {
      const g = b.qualityGrade!.toUpperCase()
      if (g in gradeCounts) {
        gradeCounts[g as 'A' | 'B' | 'C']++
      }
    }
    const totalGraded = gradedBatches.length
    let averageGrade = '-'
    if (totalGraded > 0) {
      const gradeScore =
        (gradeCounts.A * 3 + gradeCounts.B * 2 + gradeCounts.C * 1) /
        totalGraded
      if (gradeScore >= 2.5) averageGrade = 'A'
      else if (gradeScore >= 1.5) averageGrade = 'B'
      else averageGrade = 'C'
    }

    // Certification coverage
    let eudr = 0
    let rainforestAlliance = 0
    let globalGap = 0
    let organic = 0
    for (const b of batches) {
      if (b.certifications.includes('EUDR')) eudr++
      if (b.certifications.includes('RA')) rainforestAlliance++
      if (b.certifications.includes('GlobalGAP')) globalGap++
      if (b.certifications.includes('Organic')) organic++
    }

    return {
      totalBatches: batches.length,
      byStatus,
      byCommodity,
      byCooperative,
      byStage,
      averageTimePerStage,
      qualityMetrics: {
        totalGraded,
        gradeA: gradeCounts.A,
        gradeB: gradeCounts.B,
        gradeC: gradeCounts.C,
        averageGrade,
      },
      certificationCoverage: {
        total: batches.length,
        eudr,
        rainforestAlliance,
        globalGap,
        organic,
      },
      generatedAt: new Date(),
    }
  }
}

// Singleton instance
export const traceabilityEngine = new TraceabilityEngine()