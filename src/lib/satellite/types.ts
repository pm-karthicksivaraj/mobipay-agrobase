// Satellite data source types
export type SatelliteSource = 'sentinel2' | 'landsat8' | 'landsat9' | 'chirps' | 'sentinel1'

export type SpectralBand =
  | 'B01' | 'B02' | 'B03' | 'B04' | 'B05' | 'B06' | 'B07' | 'B08' | 'B8A' | 'B09' | 'B10' | 'B11' | 'B12'  // Sentinel-2
  | 'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6' | 'B7' | 'B8' | 'B9' | 'B10' | 'B11'  // Landsat 8/9

export type VegetationIndex = 'NDVI' | 'EVI' | 'SAVI' | 'NDWI' | 'NDMI' | 'BSI'

export type CloudCover = 'LOW' | 'MEDIUM' | 'HIGH'  // <10%, 10-30%, >30%

export interface SatelliteImageRequest {
  source: SatelliteSource
  bbox: [number, number, number, number]  // [west, south, east, north]
  dateFrom: Date
  dateTo: Date
  bands?: SpectralBand[]
  maxCloudCover?: number  // percentage
  resolution?: number  // meters
}

export interface SatelliteImage {
  id: string
  source: SatelliteSource
  acquisitionDate: Date
  bbox: [number, number, number, number]
  cloudCover: number
  resolution: number
  thumbnailUrl?: string
  downloadUrl?: string
  processedData?: ProcessedSatelliteData
}

export interface ProcessedSatelliteData {
  vegetationIndices: Record<VegetationIndex, number>
  landCoverClassification: LandCoverClass
  deforestationAlert?: DeforestationAlert
  rainfallMm?: number  // CHIRPS only
  soilMoisture?: number
  biomassEstimate?: number  // tonnes/ha
}

export interface LandCoverClass {
  class: 'FOREST' | 'CROPLAND' | 'GRASSLAND' | 'WETLAND' | 'SETTLEMENT' | 'BARE_SOIL' | 'WATER'
  confidence: number  // 0-1
  subClasses?: string[]
}

export interface DeforestationAlert {
  detected: boolean
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  areaAffectedHectares: number
  detectionDate: Date
  comparisonDate: Date  // baseline date for comparison
  confidence: number
  coordinates?: Array<{ lat: number; lng: number }>  // affected area polygon
}

export interface TimeSeriesPoint {
  date: string  // ISO date
  value: number
  source: SatelliteSource
  cloudCover: number
}

export interface NDVITimeSeries {
  plotId: string
  points: TimeSeriesPoint[]
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  averageNDVI: number
  minNDVI: number
  maxNDVI: number
  seasonalityDetected: boolean
}

export interface RainfallData {
  location: { lat: number; lng: number }
  period: string  // "2026-06" or date range
  totalMm: number
  dailyData: Array<{ date: string; rainfallMm: number }>
  anomaly: number  // deviation from long-term average (%)
  drySpellDays: number  // consecutive days <1mm
  heavyRainfallDays: number  // days >50mm
}

export interface CropCalendarStage {
  name: string  // "Land Preparation", "Planting", "Vegetative", "Flowering", "Harvesting"
  startDay: number  // day of year
  endDay: number
  expectedNDVI: { min: number; max: number }
  expectedRainfall: { minMm: number; maxMm: number }  // monthly
  risks: string[]
}

// Country-specific crop calendars
export interface CropCalendar {
  crop: string  // "Coffee", "Maize", "Rice", "Cocoa", "Tea", etc.
  country: string  // "UG", "GH", "KE"
  variety?: string
  stages: CropCalendarStage[]
  totalDurationDays: number
  plantingWindows: Array<{ startMonth: number; endMonth: number }>
}

// ============================================================
// Additional types for orchestrator & EUDR integration
// ============================================================

export interface AdvisoryAlert {
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  category: 'VEGETATION' | 'RAINFALL' | 'DEFOR' | 'PEST_RISK' | 'HARVEST' | 'GENERAL'
  message: string
  recommendation: string
  confidence: number
  detectedAt: Date
}

export interface PlotAnalysisReport {
  farmId: string
  plotId: string
  analysisDate: Date
  location: { lat: number; lng: number }
  areaHectares: number
  landCover: LandCoverClass
  vegetationIndices: Record<VegetationIndex, number>
  biomassEstimate: number
  deforestationAlert?: DeforestationAlert
  rainfallData?: RainfallData
  ndviTimeSeries?: NDVITimeSeries
  advisories: AdvisoryAlert[]
  cropCalendarMatch?: {
    crop: string
    currentStage: string
    stageMatch: boolean
  }
  dataQuality: {
    sentinelImages: number
    landsatImages: number
    cloudCoverAvg: number
    lastImageData: string
  }
}

export interface BboxPoint {
  lat: number
  lng: number
}

/** Polygon points as used by FarmPolygon model (from DB) */
export interface PlotPolygon {
  farmId: string
  points: Array<{ lat: number; lng: number; altitude?: number }>
  centroid?: { lat: number; lng: number }
}