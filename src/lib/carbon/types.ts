// ============================================
// AGROBASE V3 — Carbon Emission Engine Types
// CBAM Carbon Emission + Crop Stage Tracking
// ============================================

export type EmissionScope = 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3'
export type EmissionSource = 'FERTILIZER' | 'PESTICIDE' | 'FUEL' | 'LAND_USE_CHANGE' | 'TRANSPORT' | 'PROCESSING' | 'IRRIGATION' | 'DRIEDING' | 'STORAGE'
export type VerificationStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED'
export type CarbonStandard = 'IPCC_TIER1' | 'IPCC_TIER2' | 'VERRA_VCS' | 'GOLD_STANDARD' | 'CUSTOM'

export interface EmissionFactor {
  source: EmissionSource
  commodity: string
  country: string  // UG, GH, KE
  value: number  // kgCO2e per unit
  unit: string  // "kg", "litre", "km", "hectare", "tonne"
  tier: CarbonStandard
  sourceReference: string  // IPCC 2019 Refinement, national inventory, etc.
  year: number
  uncertainty?: number  // percentage
}

export interface CropStageEmission {
  stage: string  // "Land Preparation", "Planting", "Vegetative", "Flowering", "Harvesting", "Post-Harvest"
  source: EmissionSource
  activity: string  // e.g., "NPK application", "Diesel for tractor", "Transport to market"
  quantity: number
  unit: string
  emissionFactor: number  // kgCO2e per unit
  totalEmission: number  // kgCO2e
  date: Date
}

export interface CarbonFootprint {
  cultivationId: string
  commodity: string
  totalEmissionsKgCO2e: number
  emissionsPerKg: number  // kgCO2e per kg of produce
  emissionsPerHectare: number
  breakdown: Record<EmissionSource, number>
  stages: CropStageEmission[]
  calculationMethod: CarbonStandard
  verificationStatus: VerificationStatus
}

export interface CarbonCredit {
  id: string
  standard: CarbonStandard
  projectId: string
  vintageYear: number
  quantityTonnesCO2: number
  status: 'PENDING' | 'REGISTERED' | 'ISSUED' | 'RETIRED' | 'EXPIRED'
  farmerId: string
  issuedAt: Date
  expiresAt: Date
}

export interface CbamCalculation {
  commodity: string
  originCountry: string  // UG, GH, KE
  quantityTonnes: number
  embeddedEmissionsTco2PerTonne: number
  totalEmbeddedEmissions: number  // tonnes CO2
  euCarbonPrice: number  // EUR per tonne CO2
  cbamCertificateCost: number  // EUR
  carbonCreditsApplied: number  // tonnes CO2 offset
  netCost: number  // EUR
  reportingPeriod: string  // "2026-Q1"
}

export interface SequestrationEstimate {
  plotId: string
  crop: string
  areaHectares: number
  aboveGroundBiomassCO2: number  // tonnes CO2/year
  belowGroundBiomassCO2: number  // tonnes CO2/year
  soilOrganicCarbonChange: number  // tonnes CO2/year
  totalSequestrationCO2: number  // tonnes CO2/year (positive = sequestering)
  method: string
  confidence: number  // 0-1
}

// --- Additional types for benchmarks ---

export interface CarbonBenchmark {
  commodity: string
  country: string
  medianEmbeddedEmissions: number  // tCO2e per tonne
  p25EmbeddedEmissions: number     // 25th percentile
  p75EmbeddedEmissions: number     // 75th percentile
  unit: string
  source: string
  year: number
  sampleSize?: number
}

export interface ComparisonResult {
  commodity: string
  country: string
  actualEmissionsPerKg: number
  benchmarkMedianPerKg: number
  differencePercent: number       // positive = above benchmark
  percentileRank: number           // 0-100
  rating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'BELOW_AVERAGE' | 'POOR'
  recommendations: Recommendation[]
}

export interface Recommendation {
  category: EmissionSource
  title: string
  description: string
  potentialSavingPercent: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  implementationEffort: 'EASY' | 'MODERATE' | 'DIFFICULT'
}

// --- Additional types for reporting ---

export interface CbamReportData {
  tenantId: string
  reportingPeriod: string
  generatedAt: Date
  commodities: CbamCommodityReport[]
  totalEmissions: number
  totalQuantity: number
  weightedAverageEmbedded: number
  totalCertificateCost: number
  totalCreditsApplied: number
  netCost: number
}

export interface CbamCommodityReport {
  commodity: string
  originCountry: string
  quantityTonnes: number
  embeddedEmissionsTco2PerTonne: number
  totalEmbeddedEmissions: number
  euCarbonPrice: number
  certificateCost: number
  creditsApplied: number
  netCost: number
  calculation: CbamCalculation
  cultivationIds: string[]
}

export interface EmissionsSummary {
  tenantId: string
  year: number
  totalEmissionsKgCO2e: number
  emissionsByCommodity: Record<string, number>
  trendVsPreviousPeriod: number  // percentage change
  topEmittingActivities: { activity: string; source: EmissionSource; emissionsKgCO2e: number }[]
  sequestrationOffsetKgCO2e: number
  netEmissionsKgCO2e: number
  cultivationsAnalyzed: number
  averageEmissionsPerKg: number
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  score: number  // 0-100
}

export interface ValidationError {
  field: string
  message: string
  severity: 'CRITICAL' | 'ERROR'
}

export interface ValidationWarning {
  field: string
  message: string
  severity: 'WARNING' | 'INFO'
}

// --- Stage input types for calculator ---

export interface StageInputs {
  stage: string
  fertilizerKg?: Record<string, number>       // e.g. { "NPK": 100, "Urea": 50 }
  pesticideKg?: Record<string, number>         // e.g. { "Glyphosate": 2, "Mancozeb": 1.5 }
  fuelLitres?: Record<string, number>          // e.g. { "diesel": 20, "petrol": 5 }
  transportKm?: number
  transportWeightTonnes?: number
  vehicleType?: 'TRUCK' | 'MOTORCYCLE' | 'PICKUP'
  irrigationHours?: number
  irrigationFuelType?: 'diesel' | 'electric'
  dryingMethod?: 'solar' | 'mechanical'
  dryingHours?: number
  storageKgDays?: number
  processingKg?: number
  landUseChangeFrom?: string
  landUseChangeAreaHectares?: number
  date: Date
}

export type ReportFrequency = 'QUARTERLY' | 'SEMI_ANNUALLY' | 'ANNUALLY'