import { db } from '@/lib/db'
import type {
  PlotSummary, PlotDetail, PlotStats, PlotTraceabilityChain,
  CreatePlotInput, VerifyPlotInput, PlotVerificationStatus,
  PlotSeasonDetail, PlotVerificationDetail, PlotDocumentDetail,
  PlotRiskLevel, PlotSeasonStatus, VerificationType, VerificationResult, PlotDocType,
} from './types'

// Verification status progression rank
const VERIFICATION_PROGRESS: Record<PlotVerificationStatus, number> = {
  UNVERIFIED: 0,
  GPS_VERIFIED: 1,
  SATELLITE_VERIFIED: 2,
  FIELD_AUDITED: 3,
  VERIFIED: 4,
}

function calcAreaFromGeoJson(geoJson: string): number | null {
  try {
    const feature = JSON.parse(geoJson)
    const coords = feature?.geometry?.coordinates?.[0]
    if (!coords || coords.length < 3) return null
    let area = 0
    const n = coords.length
    for (let i = 0; i < n - 1; i++) {
      const lat1 = (coords[i][1] * Math.PI) / 180
      const lat2 = (coords[i + 1][1] * Math.PI) / 180
      const lng1 = (coords[i][0] * Math.PI) / 180
      const lng2 = (coords[i + 1][0] * Math.PI) / 180
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2))
    }
    area = (area * 6378137 * 6378137) / 2
    return Math.abs(area) / 10000
  } catch {
    return null
  }
}

function calcCentroid(geoJson: string): { lat: number; lng: number } | null {
  try {
    const feature = JSON.parse(geoJson)
    const coords = feature?.geometry?.coordinates?.[0]
    if (!coords || coords.length === 0) return null
    let sumLat = 0
    let sumLng = 0
    const n = coords.length - 1
    for (let i = 0; i < n; i++) {
      sumLat += coords[i][1]
      sumLng += coords[i][0]
    }
    return { lat: sumLat / n, lng: sumLng / n }
  } catch {
    return null
  }
}

function generatePlotCode(country: string, count: number): string {
  const prefix = country === 'Uganda' ? 'UG' : country === 'Ghana' ? 'GH' : country === 'Kenya' ? 'KE' : 'XX'
  return `PLT-${prefix}-${String(count + 1).padStart(6, '0')}`
}

function safeParseJson<T>(str: string | null | undefined): T | null {
  if (!str) return null
  try { return JSON.parse(str) } catch { return null }
}

function toSummary(p: any): PlotSummary {
  return {
    id: p.id,
    plotCode: p.plotCode,
    name: p.name,
    farmerName: p.farmer ? `${p.farmer.firstName} ${p.farmer.lastName}` : 'Unknown',
    areaHectares: p.areaHectares,
    centroidLat: p.centroidLat,
    centroidLng: p.centroidLng,
    verificationStatus: p.verificationStatus as PlotVerificationStatus,
    eudrRiskLevel: p.eudrRiskLevel as PlotRiskLevel,
    plotType: p.plotType,
    seasonCount: p._seasonCount ?? 0,
    batchCount: p._batchCount ?? 0,
    isActive: p.isActive,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
  }
}

export class PlotEngine {
  // ─── Plot CRUD ──────────────────────────────────────────────────

  static async list(tenantId: string, filters: {
    farmerId?: string
    verificationStatus?: PlotVerificationStatus
    eudrRiskLevel?: PlotRiskLevel
    plotType?: string
    search?: string
    includeInactive?: boolean
    page?: number
    pageSize?: number
  } = {}): Promise<{ plots: PlotSummary[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1
    const pageSize = Math.min(filters.pageSize ?? 20, 100)
    const where: any = { tenantId, isActive: true }

    if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus
    if (filters.eudrRiskLevel) where.eudrRiskLevel = filters.eudrRiskLevel
    if (filters.plotType) where.plotType = filters.plotType
    if (filters.farmerId) where.farmerId = filters.farmerId
    if (!filters.includeInactive) where.isActive = true

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { plotCode: { contains: filters.search } },
        { farmer: { OR: [
          { firstName: { contains: filters.search } },
          { lastName: { contains: filters.search } },
          { phone: { contains: filters.search } },
        ]}},
      ]
    }

    const [plots, total] = await Promise.all([
      db.plot.findMany({
        where,
        include: {
          farmer: { select: { firstName: true, lastName: true } },
          _count: { select: { seasons: true, batches: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.plot.count({ where }),
    ])

    return {
      plots: plots.map(p => toSummary({ ...p, _seasonCount: p._count.seasons, _batchCount: p._count.batches })),
      total,
      page,
      pageSize,
    }
  }

  static async getById(tenantId: string, plotId: string): Promise<PlotDetail | null> {
    const plot = await db.plot.findFirst({
      where: { id: plotId, tenantId },
      include: {
        farmer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        seasons: { orderBy: { createdAt: 'desc' }, take: 10 },
        verifications: { orderBy: { verifiedAt: 'desc' }, take: 5 },
        documents: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { batches: true } },
      },
    })
    if (!plot) return null

    return {
      ...toSummary({ ...plot, _seasonCount: plot.seasons.length, _batchCount: plot._count.batches }),
      farmerId: plot.farmerId,
      farmLandId: plot.farmLandId,
      description: plot.description,
      boundaryGeoJson: plot.boundaryGeoJson,
      soilType: plot.soilType,
      elevationM: plot.elevationM,
      slopePercent: plot.slopePercent,
      irrigationType: plot.irrigationType,
      verificationMethod: plot.verificationMethod,
      verificationScore: plot.verificationScore,
      verifiedBy: plot.verifiedBy,
      verifiedAt: plot.verifiedAt?.toISOString() ?? null,
      deforestationFree: plot.deforestationFree,
      lastSatelliteCheck: plot.lastSatelliteCheck?.toISOString() ?? null,
      landOwnership: plot.landOwnership,
      tags: safeParseJson<string[]>(plot.tags),
      seasons: plot.seasons.map((s: any) => ({
        id: s.id, season: s.season, cropType: s.cropType, variety: s.variety,
        plantingDate: s.plantingDate?.toISOString() ?? null,
        expectedHarvestDate: s.expectedHarvestDate?.toISOString() ?? null,
        actualHarvestDate: s.actualHarvestDate?.toISOString() ?? null,
        areaPlantedHectares: s.areaPlantedHectares, yieldKg: s.yieldKg,
        qualityGrade: s.qualityGrade, status: s.status as PlotSeasonStatus,
        eudrCompliant: s.eudrCompliant,
      })),
      recentVerifications: plot.verifications.map((v: any) => ({
        id: v.id, verificationType: v.verificationType, result: v.result,
        verifiedBy: v.verifiedBy, verifiedAt: v.verifiedAt?.toISOString() ?? null,
        boundaryMatchPercent: v.boundaryMatchPercent, accuracyMeters: v.accuracyMeters,
        deforestCheckResult: v.deforestCheckResult, notes: v.notes,
      })),
      recentDocuments: plot.documents.map((d: any) => ({
        id: d.id, docType: d.docType, title: d.title, fileUrl: d.fileUrl,
        issuedBy: d.issuedBy, issuedAt: d.issuedAt?.toISOString() ?? null,
        expiresAt: d.expiresAt?.toISOString() ?? null, isVerified: d.isVerified,
      })),
    }
  }

  static async create(tenantId: string, userId: string, input: CreatePlotInput): Promise<PlotSummary> {
    let areaHectares: number | null | undefined
    let centroidLat: number | null | undefined
    let centroidLng: number | null | undefined

    if (input.boundaryGeoJson) {
      areaHectares = calcAreaFromGeoJson(input.boundaryGeoJson)
      const centroid = calcCentroid(input.boundaryGeoJson)
      if (centroid) { centroidLat = centroid.lat; centroidLng = centroid.lng }
    }

    const count = await db.plot.count({ where: { tenantId } })
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { country: true } })
    const plotCode = generatePlotCode(tenant?.country ?? 'Uganda', count)

    const plot = await db.plot.create({
      data: {
        tenantId, plotCode,
        farmerId: input.farmerId,
        farmLandId: input.farmLandId,
        name: input.name,
        description: input.description,
        plotType: input.plotType ?? 'PRODUCTION',
        boundaryGeoJson: input.boundaryGeoJson,
        areaHectares: areaHectares !== undefined ? areaHectares : null,
        centroidLat: centroidLat !== undefined ? centroidLat : null,
        centroidLng: centroidLng !== undefined ? centroidLng : null,
        soilType: input.soilType,
        elevationM: input.elevationM,
        slopePercent: input.slopePercent,
        irrigationType: input.irrigationType,
        landOwnership: input.landOwnership,
        tags: input.tags ? JSON.stringify(input.tags) : null,
      },
      include: { farmer: { select: { firstName: true, lastName: true } } },
    })

    return toSummary(plot)
  }

  static async update(tenantId: string, plotId: string, data: Partial<CreatePlotInput> & {
    eudrRiskLevel?: PlotRiskLevel
    deforestationFree?: boolean
    isActive?: boolean
  }): Promise<PlotSummary | null> {
    const updateData: any = { ...data }
    if (data.tags) updateData.tags = JSON.stringify(data.tags)

    if (data.boundaryGeoJson) {
      updateData.areaHectares = calcAreaFromGeoJson(data.boundaryGeoJson)
      const centroid = calcCentroid(data.boundaryGeoJson)
      if (centroid) { updateData.centroidLat = centroid.lat; updateData.centroidLng = centroid.lng }
    }

    try {
      const plot = await db.plot.update({
        where: { id: plotId, tenantId },
        data: updateData,
        include: { farmer: { select: { firstName: true, lastName: true } } },
      })
      return toSummary(plot)
    } catch {
      return null
    }
  }

  static async delete(tenantId: string, plotId: string): Promise<boolean> {
    try {
      await db.plot.update({ where: { id: plotId, tenantId }, data: { isActive: false } })
      return true
    } catch {
      return false
    }
  }

  // ─── Verification ──────────────────────────────────────────────

  static async verify(tenantId: string, plotId: string, userId: string, input: VerifyPlotInput): Promise<{
    plot: PlotSummary
    verification: PlotVerificationDetail
  } | null> {
    const plot = await db.plot.findFirst({
      where: { id: plotId, tenantId },
      include: { farmer: { select: { firstName: true, lastName: true } } },
    })
    if (!plot) return null

    let newStatus: PlotVerificationStatus = plot.verificationStatus as PlotVerificationStatus
    const typeToStatus: Record<string, PlotVerificationStatus> = {
      GPS: 'GPS_VERIFIED', SATELLITE: 'SATELLITE_VERIFIED', DRONE: 'SATELLITE_VERIFIED',
      FIELD_AUDIT: 'FIELD_AUDITED', COMBINED: 'VERIFIED',
    }

    const candidateStatus = typeToStatus[input.verificationType]
    if (candidateStatus && VERIFICATION_PROGRESS[candidateStatus] > VERIFICATION_PROGRESS[newStatus]) {
      newStatus = candidateStatus
    }

    if (input.result === 'PASSED' && newStatus === 'FIELD_AUDITED') {
      const existing = await db.plotVerification.findMany({
        where: { plotId, result: 'PASSED' },
        select: { verificationType: true },
      })
      const types = new Set(existing.map((v: any) => v.verificationType))
      if (types.has('GPS') && (types.has('SATELLITE') || types.has('DRONE'))) {
        newStatus = 'VERIFIED'
      }
    }

    const score = input.boundaryMatchPercent ?? (input.result === 'PASSED' ? 100 : 0)

    const [verification, updatedPlot] = await db.$transaction([
      db.plotVerification.create({
        data: {
          tenantId,
          plotId,
          verificationType: input.verificationType,
          result: input.result,
          verifiedBy: userId,
          verifiedAt: new Date(),
          evidence: input.evidence,
          boundaryMatchPercent: input.boundaryMatchPercent,
          accuracyMeters: input.accuracyMeters,
          deforestCheckResult: input.deforestCheckResult,
          notes: input.notes,
        },
      }),
      db.plot.update({
        where: { id: plotId },
        data: {
          verificationStatus: newStatus,
          verificationMethod: input.verificationType,
          verificationScore: score,
          verifiedBy: userId,
          verifiedAt: new Date(),
          ...(input.deforestCheckResult === 'CLEAR' ? { eudrRiskLevel: 'LOW' as const, deforestationFree: true, lastSatelliteCheck: new Date() } : {}),
          ...(input.deforestCheckResult === 'CONFIRMED' ? { eudrRiskLevel: 'HIGH' as const, deforestationFree: false } : {}),
          ...(input.deforestCheckResult === 'SUSPECTED' ? { eudrRiskLevel: 'MEDIUM' as const } : {}),
        },
        include: { farmer: { select: { firstName: true, lastName: true } } },
      }),
    ])

    return {
      plot: toSummary(updatedPlot),
      verification: {
        id: verification.id,
        verificationType: verification.verificationType as VerificationType,
        result: verification.result as VerificationResult,
        verifiedBy: verification.verifiedBy,
        verifiedAt: verification.verifiedAt?.toISOString() ?? null,
        boundaryMatchPercent: verification.boundaryMatchPercent,
        accuracyMeters: verification.accuracyMeters,
        deforestCheckResult: verification.deforestCheckResult,
        notes: verification.notes,
      },
    }
  }

  static async getVerificationHistory(tenantId: string, plotId: string): Promise<PlotVerificationDetail[]> {
    const verifications = await db.plotVerification.findMany({
      where: { plot: { id: plotId, tenantId } },
      orderBy: { verifiedAt: 'desc' },
    })
    return verifications.map((v: any) => ({
      id: v.id, verificationType: v.verificationType, result: v.result,
      verifiedBy: v.verifiedBy, verifiedAt: v.verifiedAt?.toISOString() ?? null,
      boundaryMatchPercent: v.boundaryMatchPercent, accuracyMeters: v.accuracyMeters,
      deforestCheckResult: v.deforestCheckResult, notes: v.notes,
    }))
  }

  // ─── Seasons ───────────────────────────────────────────────────

  static async addSeason(tenantId: string, plotId: string, data: {
    season: string; cropType: string; variety?: string; seedSource?: string
    plantingDate?: string; expectedHarvestDate?: string; areaPlantedHectares?: number
    inputUsage?: Array<{ inputType: string; name: string; quantity: number; unit: string; appliedDate?: string }>
    notes?: string
  }): Promise<PlotSeasonDetail | null> {
    try {
      const season = await db.plotSeason.create({
        data: {
          tenantId,
          plotId, season: data.season, cropType: data.cropType, variety: data.variety,
          plantingDate: data.plantingDate ? new Date(data.plantingDate) : null,
          expectedHarvestDate: data.expectedHarvestDate ? new Date(data.expectedHarvestDate) : null,
          areaPlantedHectares: data.areaPlantedHectares,
          status: data.plantingDate ? 'PLANTED' : 'PLANNED',
        },
      })
      return {
        id: season.id, season: season.season, cropType: season.cropType,
        variety: season.variety,
        plantingDate: season.plantingDate?.toISOString() ?? null,
        expectedHarvestDate: season.expectedHarvestDate?.toISOString() ?? null,
        actualHarvestDate: null, areaPlantedHectares: season.areaPlantedHectares,
        yieldKg: null, qualityGrade: null, status: season.status as PlotSeasonStatus,
        eudrCompliant: null,
      }
    } catch {
      return null
    }
  }

  static async updateSeason(tenantId: string, seasonId: string, data: {
    actualHarvestDate?: string; yieldKg?: number; qualityGrade?: string
    status?: string; eudrCompliant?: boolean; complianceNotes?: string
  }): Promise<PlotSeasonDetail | null> {
    try {
      const season = await db.plotSeason.update({
        where: { id: seasonId },
        data: {
          ...(data.actualHarvestDate ? { actualHarvestDate: new Date(data.actualHarvestDate) } : {}),
          ...(data.yieldKg !== undefined ? { yieldKg: data.yieldKg } : {}),
          ...(data.qualityGrade ? { qualityGrade: data.qualityGrade } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.eudrCompliant !== undefined ? { eudrCompliant: data.eudrCompliant } : {}),
          ...(data.complianceNotes ? { complianceNotes: data.complianceNotes } : {}),
        },
      })
      return {
        id: season.id, season: season.season, cropType: season.cropType,
        variety: season.variety,
        plantingDate: season.plantingDate?.toISOString() ?? null,
        expectedHarvestDate: season.expectedHarvestDate?.toISOString() ?? null,
        actualHarvestDate: season.actualHarvestDate?.toISOString() ?? null,
        areaPlantedHectares: season.areaPlantedHectares, yieldKg: season.yieldKg,
        qualityGrade: season.qualityGrade, status: season.status as PlotSeasonStatus,
        eudrCompliant: season.eudrCompliant,
      }
    } catch {
      return null
    }
  }

  // ─── Documents ────────────────────────────────────────────────

  static async addDocument(tenantId: string, plotId: string, data: {
    docType: string; title?: string; description?: string; fileUrl?: string
    fileSize?: number; mimeType?: string; issuedBy?: string
    issuedAt?: string; expiresAt?: string
  }): Promise<PlotDocumentDetail | null> {
    try {
      const doc = await db.plotDocument.create({
        data: {
          tenantId,
          plotId, docType: data.docType, title: data.title,
          fileUrl: data.fileUrl,
          issuedBy: data.issuedBy,
          issuedAt: data.issuedAt ? new Date(data.issuedAt) : null,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        },
      })
      return {
        id: doc.id, docType: doc.docType as PlotDocType, title: doc.title,
        fileUrl: doc.fileUrl, issuedBy: doc.issuedBy,
        issuedAt: doc.issuedAt?.toISOString() ?? null,
        expiresAt: doc.expiresAt?.toISOString() ?? null, isVerified: doc.isVerified,
      }
    } catch {
      return null
    }
  }

  // ─── Traceability Chain ────────────────────────────────────────

  static async getTraceabilityChain(tenantId: string, plotId: string): Promise<PlotTraceabilityChain | null> {
    const plot = await db.plot.findFirst({
      where: { id: plotId, tenantId },
      include: {
        farmer: { select: { firstName: true, lastName: true } },
        seasons: { orderBy: { season: 'desc' } },
        batches: {
          include: { events: { orderBy: { timestamp: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!plot) return null

    return {
      plot: toSummary({ ...plot, _seasonCount: plot.seasons.length, _batchCount: plot.batches.length }),
      seasons: plot.seasons.map(season => ({
        season: season.season,
        cropType: season.cropType,
        batches: plot.batches
          .filter(b => b.season === season.season || b.commodity === season.cropType)
          .map(batch => ({
            batchId: batch.batchId, commodity: batch.commodity,
            quantityKg: batch.quantityKg, status: batch.status,
            eventCount: batch.events.length,
            events: batch.events.map((e: any) => ({
              eventType: e.eventType, stage: e.stage,
              timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : String(e.timestamp),
              locationName: e.locationName, actorName: e.actorName,
            })),
          })),
      })),
    }
  }

  // ─── Statistics & Map ──────────────────────────────────────────

  static async getStats(tenantId: string): Promise<PlotStats> {
    const plots = await db.plot.findMany({
      where: { tenantId, isActive: true },
      select: {
        verificationStatus: true, eudrRiskLevel: true, areaHectares: true,
        deforestationFree: true, seasons: { select: { cropType: true } },
      },
    })

    const totalPlots = plots.length
    const verifiedPlots = plots.filter(p => p.verificationStatus === 'VERIFIED').length
    const totalArea = plots.reduce((sum, p) => sum + (p.areaHectares ?? 0), 0)
    const deforestFree = plots.filter(p => p.deforestationFree).length

    const plotsByRisk: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, UNKNOWN: 0 }
    const plotsByStatus: Record<string, number> = { UNVERIFIED: 0, GPS_VERIFIED: 0, SATELLITE_VERIFIED: 0, FIELD_AUDITED: 0, VERIFIED: 0 }
    const plotsByCrop: Record<string, number> = {}

    for (const p of plots) {
      plotsByRisk[p.eudrRiskLevel] = (plotsByRisk[p.eudrRiskLevel] || 0) + 1
      plotsByStatus[p.verificationStatus] = (plotsByStatus[p.verificationStatus] || 0) + 1
      for (const s of p.seasons) {
        plotsByCrop[s.cropType] = (plotsByCrop[s.cropType] || 0) + 1
      }
    }

    return {
      totalPlots, verifiedPlots,
      verificationRate: totalPlots > 0 ? Math.round((verifiedPlots / totalPlots) * 100) : 0,
      totalAreaHectares: Math.round(totalArea * 100) / 100,
      plotsByRisk: plotsByRisk as Record<PlotRiskLevel, number>,
      plotsByStatus: plotsByStatus as Record<PlotVerificationStatus, number>,
      plotsByCrop,
      deforestationFreePlots: deforestFree,
      deforestationFreeRate: totalPlots > 0 ? Math.round((deforestFree / totalPlots) * 100) : 0,
    }
  }

  static async getGeoJsonCollection(tenantId: string, filters?: {
    verificationStatus?: PlotVerificationStatus
    eudrRiskLevel?: PlotRiskLevel
    farmerId?: string
  }): Promise<{ type: 'FeatureCollection'; features: any[] }> {
    const where: any = { tenantId, isActive: true, boundaryGeoJson: { not: null } }
    if (filters?.verificationStatus) where.verificationStatus = filters.verificationStatus
    if (filters?.eudrRiskLevel) where.eudrRiskLevel = filters.eudrRiskLevel
    if (filters?.farmerId) where.farmerId = filters.farmerId

    const plots = await db.plot.findMany({
      where,
      select: {
        id: true, plotCode: true, name: true, boundaryGeoJson: true,
        verificationStatus: true, eudrRiskLevel: true, areaHectares: true,
        farmer: { select: { firstName: true, lastName: true } },
      },
    })

    const features = plots.map(p => {
      let geometry: any = null
      try { geometry = JSON.parse(p.boundaryGeoJson!).geometry } catch { return null }
      if (!geometry) return null
      return {
        type: 'Feature' as const, geometry,
        properties: {
          id: p.id, plotCode: p.plotCode, name: p.name,
          farmerName: p.farmer ? `${p.farmer.firstName} ${p.farmer.lastName}` : '',
          verificationStatus: p.verificationStatus, eudrRiskLevel: p.eudrRiskLevel,
          areaHectares: p.areaHectares,
        },
      }
    }).filter(Boolean)

    return { type: 'FeatureCollection', features }
  }
}