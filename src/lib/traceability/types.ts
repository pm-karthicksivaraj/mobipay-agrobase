export type TraceEventType =
  | 'SEEDING'
  | 'FERTILIZER_APPLICATION'
  | 'PESTICIDE_APPLICATION'
  | 'IRRIGATION'
  | 'WEEDING'
  | 'HARVESTING'
  | 'POST_HARVEST'
  | 'PROCESSING'
  | 'STORAGE'
  | 'TRANSPORT'
  | 'QUALITY_CHECK'
  | 'CERTIFICATION'
  | 'INSPECTION'
  | 'PAYMENT'
  | 'SHIPMENT'

export type SupplyChainStage =
  | 'FARM'
  | 'AGGREGATION'
  | 'PROCESSING'
  | 'STORAGE'
  | 'EXPORT'
  | 'RETAIL'

export type ProductStatus =
  | 'GROWING'
  | 'HARVESTED'
  | 'AGGREGATED'
  | 'PROCESSED'
  | 'STORED'
  | 'IN_TRANSIT'
  | 'AT_PORT'
  | 'EXPORTED'
  | 'DELIVERED'

export interface TraceEvent {
  id: string
  batchId: string
  eventType: TraceEventType
  stage: SupplyChainStage
  timestamp: Date
  location: { lat: number; lng: number; name?: string }
  actorId: string // farmer, agent, processor ID
  actorName: string
  actorType: string // FARMER, AGENT, COOPERATIVE, PROCESSOR, EXPORTER
  details: Record<string, unknown>
  evidence?: Array<{ type: string; url: string; description: string }> // photos, documents
  verificationHash?: string // blockchain anchor hash
  previousEventHash?: string // chain link to previous event
}

export interface ProductBatch {
  id: string
  farmerId: string
  farmerName: string
  cooperativeId?: string
  cooperativeName?: string
  commodity: string
  variety?: string
  quantityKg: number
  farmLandId: string
  farmName: string
  season: string
  sowingDate: Date
  harvestDate?: Date
  status: ProductStatus
  currentStage: SupplyChainStage
  traceEvents: TraceEvent[]
  qualityGrade?: string
  certifications: string[] // EUDR, RA, GlobalGAP, Organic
  eudrComplianceId?: string
  carbonFootprintKgCO2e?: number
  createdAt: Date
}

export interface FarmPassport {
  passportId: string // format: AGRO-{COUNTRY}-{YYYY}-{6ALPHA}
  farmerId: string
  farmer: {
    name: string
    phone: string
    gender?: string
    nationalId?: string
    photoUrl?: string
    location: { village?: string; district?: string; country: string }
  }
  farms: Array<{
    id: string
    name: string
    sizeHectares: number
    gpsPoint: { lat: number; lng: number }
    polygon?: Array<{ lat: number; lng: number }>
    soilType?: string
    waterSource?: string
  }>
  currentCrops: Array<{
    cropName: string
    variety?: string
    season: string
    sowingDate: Date
    status: string
  }>
  certifications: Array<{
    type: string // EUDR, RA, GlobalGAP, Organic
    certificateNo: string
    status: string
    issueDate: Date
    expiryDate: Date
  }>
  compliance: {
    eudrStatus: string
    cbamData?: { embeddedEmissions: number; lastReport: string }
    riskScore?: number
  }
  financial: {
    vslaGroups: Array<{ name: string; sharesOwned: number; totalSavings: number }>
    loans: Array<{ amount: number; status: string; outstanding: number }>
    purchases: Array<{ date: Date; commodity: string; quantity: string; amount: number }>
  }
  trainingHistory: Array<{ topic: string; date: Date; attended: boolean }>
  traceability: {
    activeBatches: number
    totalBatches: number
    lastHarvest?: Date
  }
  generatedAt: Date
  qrCodeUrl?: string
  verificationUrl?: string
}

export interface SupplyChainMap {
  batchId: string
  commodity: string
  totalQuantityKg: number
  stages: Array<{
    stage: SupplyChainStage
    location: { name: string; lat?: number; lng?: number }
    timestamp: Date
    actor: string
    quantityKg?: number
    qualityGrade?: string
    documents: string[]
  }>
  currentLocation: { name: string; lat?: number; lng?: number }
  estimatedDelivery?: Date
}

// --- Verification Types ---

export interface VerificationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  verifiedAt: Date
  details?: Record<string, unknown>
}

export interface ChainVerificationResult {
  isValid: boolean
  totalEvents: number
  verifiedEvents: number
  tamperedEvents: string[]
  missingLinks: number[]
  merkleRoot: string
  verifiedAt: Date
}

export interface ProofOfOrigin {
  batchId: string
  commodity: string
  farmerName: string
  farmName: string
  farmLocation: { lat: number; lng: number; name?: string }
  sowingDate: Date
  journey: Array<{
    stage: SupplyChainStage
    eventType: TraceEventType
    timestamp: Date
    location: { name: string; lat?: number; lng?: number }
    actor: string
    hash: string
  }>
  chainHash: string
  certifications: string[]
  eudrCompliant: boolean
  verifiedAt: Date
}

// --- Traceability Report Types ---

export interface TraceabilityReportFilters {
  status?: ProductStatus
  commodity?: string
  cooperativeId?: string
  dateFrom?: Date
  dateTo?: Date
  stage?: SupplyChainStage
}

export interface TraceabilityReport {
  totalBatches: number
  byStatus: Record<ProductStatus, number>
  byCommodity: Record<string, number>
  byCooperative: Record<string, number>
  byStage: Record<SupplyChainStage, number>
  averageTimePerStage: Record<SupplyChainStage, number> // hours
  qualityMetrics: {
    totalGraded: number
    gradeA: number
    gradeB: number
    gradeC: number
    averageGrade: string
  }
  certificationCoverage: {
    total: number
    eudr: number
    rainforestAlliance: number
    globalGap: number
    organic: number
  }
  generatedAt: Date
}

// --- Cost of Cultivation Types ---

export interface CostOfCultivationInput {
  crop: string
  country: string
  areaHectares: number
  practices: {
    irrigation: boolean
    mechanization: boolean
    organic: boolean
  }
  customYieldKgPerHa?: number
  customMarketPricePerKg?: number
}

export interface CostBreakdownCategory {
  category: string
  items: Array<{
    name: string
    costPerHectare: number
    totalCost: number
    unit?: string
    quantity?: number
    notes?: string
  }>
  subtotal: number
  percentageOfTotal: number
}

export interface CostOfCultivationResult {
  crop: string
  country: string
  areaHectares: number
  totalCost: number
  costPerHectare: number
  breakdown: CostBreakdownCategory[]
  revenueProjection: {
    expectedYieldKgPerHa: number
    totalYieldKg: number
    marketPricePerKg: number
    totalRevenue: number
    currency: string
  }
  profitability: ProfitabilityAnalysis
  currency: string
}

export interface ProfitabilityAnalysis {
  totalRevenue: number
  totalCost: number
  grossProfit: number
  netProfit: number
  profitMargin: number
  roi: number
  breakEvenYieldKgPerHa: number
  breakEvenPricePerKg: number
  costPerKg: number
  isProfitable: boolean
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface CropCostProfile {
  crop: string
  country: string
  currency: string
  defaultYieldKgPerHa: number
  defaultMarketPricePerKg: number
  costBreakdown: Array<{
    category: string
    items: Array<{
      name: string
      costPerHectare: number
      unit?: string
    }>
  }>
  notes?: string
}

export interface OptimizationConstraint {
  category: string
  minPercentage?: number
  maxPercentage?: number
}

export interface OptimizationResult {
  originalBudget: number
  optimizedBudget: number
  savings: number
  savingsPercentage: number
  allocations: Array<{
    category: string
    item: string
    originalAmount: number
    optimizedAmount: number
    change: number
    changePercentage: number
  }>
  projectedYieldImpact: number // percentage change
  expectedYieldKgPerHa: number
  notes: string[]
}

// --- Farm Passport Stats Types ---

export interface PassportStats {
  totalPassports: number
  activePassports: number
  certificationCoverage: {
    total: number
    eudr: number
    rainforestAlliance: number
    globalGap: number
    organic: number
  }
  complianceSummary: {
    eudrVerified: number
    eudrPending: number
    cbamSubmitted: number
    averageRiskScore: number | null
  }
  batchSummary: {
    totalBatches: number
    activeBatches: number
    batchesInTransit: number
    batchesExported: number
  }
  generatedAt: Date
}