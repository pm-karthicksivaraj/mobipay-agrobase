// Plot-Level Traceability Types

export type PlotVerificationStatus =
  | 'UNVERIFIED'
  | 'GPS_VERIFIED'
  | 'SATELLITE_VERIFIED'
  | 'FIELD_AUDITED'
  | 'VERIFIED'

export type PlotType = 'PRODUCTION' | 'NURSERY' | 'PROCESSING' | 'DEMO'

export type PlotRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'

export type VerificationType = 'GPS' | 'SATELLITE' | 'DRONE' | 'FIELD_AUDIT' | 'COMBINED'

export type VerificationResult = 'PASSED' | 'FAILED' | 'NEEDS_REVIEW' | 'PENDING'

export type PlotSeasonStatus = 'PLANNED' | 'PLANTED' | 'GROWING' | 'HARVESTED' | 'COMPLETED' | 'ABANDONED'

export type PlotDocType =
  | 'LAND_TITLE'
  | 'LEASE_AGREEMENT'
  | 'SURVEY_REPORT'
  | 'EUDR_CERTIFICATE'
  | 'SATELLITE_IMAGE'
  | 'COMPLIANCE_REPORT'

export interface GeoJsonPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface GeoJsonFeature {
  type: 'Feature'
  geometry: GeoJsonPolygon
  properties: Record<string, unknown>
}

export interface PlotSummary {
  id: string
  plotCode: string
  name: string
  farmerName: string
  areaHectares: number | null
  centroidLat: number | null
  centroidLng: number | null
  verificationStatus: PlotVerificationStatus
  eudrRiskLevel: PlotRiskLevel
  plotType: PlotType
  seasonCount: number
  batchCount: number
  isActive: boolean
  createdAt: string
}

export interface PlotDetail extends PlotSummary {
  farmerId: string | null
  farmLandId: string | null
  description: string | null
  boundaryGeoJson: string | null
  soilType: string | null
  elevationM: number | null
  slopePercent: number | null
  irrigationType: string | null
  verificationMethod: string | null
  verificationScore: number | null
  verifiedBy: string | null
  verifiedAt: string | null
  deforestationFree: boolean
  lastSatelliteCheck: string | null
  landOwnership: string | null
  tags: string[] | null
  seasons: PlotSeasonDetail[]
  recentVerifications: PlotVerificationDetail[]
  recentDocuments: PlotDocumentDetail[]
}

export interface PlotSeasonDetail {
  id: string
  season: string
  cropType: string
  variety: string | null
  plantingDate: string | null
  expectedHarvestDate: string | null
  actualHarvestDate: string | null
  areaPlantedHectares: number | null
  yieldKg: number | null
  qualityGrade: string | null
  status: PlotSeasonStatus
  eudrCompliant: boolean | null
}

export interface PlotVerificationDetail {
  id: string
  verificationType: VerificationType
  result: VerificationResult
  verifiedBy: string | null
  verifiedAt: string | null
  boundaryMatchPercent: number | null
  accuracyMeters: number | null
  deforestCheckResult: string | null
  notes: string | null
}

export interface PlotDocumentDetail {
  id: string
  docType: PlotDocType
  title: string | null
  fileUrl: string | null
  issuedBy: string | null
  issuedAt: string | null
  expiresAt: string | null
  isVerified: boolean
}

export interface PlotTraceabilityChain {
  plot: PlotSummary
  seasons: Array<{
    season: string
    cropType: string
    batches: Array<{
      batchId: string
      commodity: string
      quantityKg: number
      status: string
      eventCount: number
      events: Array<{
        eventType: string
        stage: string
        timestamp: string
        locationName: string | null
        actorName: string | null
      }>
    }>
  }>
}

export interface PlotStats {
  totalPlots: number
  verifiedPlots: number
  verificationRate: number
  totalAreaHectares: number
  plotsByRisk: Record<PlotRiskLevel, number>
  plotsByStatus: Record<PlotVerificationStatus, number>
  plotsByCrop: Record<string, number>
  deforestationFreePlots: number
  deforestationFreeRate: number
}

export interface CreatePlotInput {
  name: string
  description?: string
  farmerId?: string
  farmLandId?: string
  plotType?: PlotType
  boundaryGeoJson?: string
  soilType?: string
  elevationM?: number
  slopePercent?: number
  irrigationType?: string
  landOwnership?: string
  tags?: string[]
}

export interface VerifyPlotInput {
  verificationType: VerificationType
  result: VerificationResult
  evidence?: string
  boundaryMatchPercent?: number
  accuracyMeters?: number
  deforestCheckResult?: string
  notes?: string
}