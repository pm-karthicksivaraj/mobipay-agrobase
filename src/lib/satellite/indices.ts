import type { LandCoverClass, DeforestationAlert, VegetationIndex } from './types'

// ============================================================
// Vegetation Index Calculations
// Pure functions — no I/O, fully testable
// ============================================================

/**
 * Normalized Difference Vegetation Index
 * NDVI = (NIR - RED) / (NIR + RED)
 * Range: -1 to 1, healthy vegetation typically 0.3–0.8
 */
export function calculateNDVI(red: number, nir: number): number {
  const denominator = nir + red
  if (Math.abs(denominator) < 1e-6) return 0
  return (nir - red) / denominator
}

/**
 * Enhanced Vegetation Index
 * EVI = 2.5 × ((NIR - RED) / (NIR + 6×RED - 7.5×BLUE + 1))
 * More robust than NDVI in high-biomass regions
 */
export function calculateEVI(red: number, nir: number, blue: number): number {
  const denominator = nir + 6 * red - 7.5 * blue + 1
  if (Math.abs(denominator) < 1e-6) return 0
  return 2.5 * ((nir - red) / denominator)
}

/**
 * Soil-Adjusted Vegetation Index
 * SAVI = ((NIR - RED) / (NIR + RED + L)) × (1 + L)
 * Default L=0.5 works well for moderate vegetation cover
 * Use L=1.0 for very sparse vegetation
 */
export function calculateSAVI(ndvi: number, l: number = 0.5): number {
  // SAVI calculated from bands directly:
  // SAVI = ((NIR - RED) / (NIR + RED + L)) * (1 + L)
  // When passing NDVI, we approximate: SAVI ≈ NDVI × (1 + L) (simplified)
  // For precision, prefer passing raw bands to calculateSAVIFromBands
  return ndvi * (1 + l)
}

/**
 * SAVI from raw spectral bands (preferred)
 */
export function calculateSAVIFromBands(red: number, nir: number, l: number = 0.5): number {
  const denominator = nir + red + l
  if (Math.abs(denominator) < 1e-6) return 0
  return ((nir - red) / denominator) * (1 + l)
}

/**
 * Normalized Difference Water Index
 * NDWI = (GREEN - NIR) / (GREEN + NIR)
 * Used for vegetation water content and open water detection
 * Range: -1 to 1, water bodies typically < -0.2
 */
export function calculateNDWI(green: number, nir: number): number {
  const denominator = green + nir
  if (Math.abs(denominator) < 1e-6) return 0
  return (green - nir) / denominator
}

/**
 * Normalized Difference Moisture Index
 * NDMI = (NIR - SWIR) / (NIR + SWIR)
 * Monitors vegetation water content
 */
export function calculateNDMI(nir: number, swir: number): number {
  const denominator = nir + swir
  if (Math.abs(denominator) < 1e-6) return 0
  return (nir - swir) / denominator
}

/**
 * Bare Soil Index
 * BSI = ((SWIR + RED) - (NIR + BLUE)) / ((SWIR + RED) + (NIR + BLUE))
 * Range: -1 to 1, bare soil typically > 0
 */
export function calculateBSI(red: number, nir: number, blue: number, swir: number): number {
  const numerator = (swir + red) - (nir + blue)
  const denominator = (swir + red) + (nir + blue)
  if (Math.abs(denominator) < 1e-6) return 0
  return numerator / denominator
}

// ============================================================
// Land Cover Classification (Rule-Based)
// ============================================================

/**
 * Classify land cover based on vegetation indices using a simple
 * rule-based decision tree. Suitable for rapid assessment.
 *
 * Thresholds calibrated for East & West African agro-ecological zones.
 */
export function classifyLandCover(
  ndvi: number,
  ndwi: number,
  bsi: number,
): LandCoverClass {
  // Decision rules (order matters — first match wins)
  if (ndwi < -0.25) {
    return { class: 'WATER', confidence: 0.9, subClasses: ['open_water'] }
  }

  if (ndvi > 0.7 && bsi < 0.1) {
    return {
      class: 'FOREST',
      confidence: Math.min(0.95, 0.6 + ndvi * 0.4),
      subClasses: ndvi > 0.85 ? ['dense_forest', 'primary_forest'] : ['open_forest', 'secondary_forest'],
    }
  }

  if (ndvi > 0.5 && ndvi <= 0.7 && bsi < 0.15) {
    return {
      class: 'FOREST',
      confidence: 0.7,
      subClasses: ['woodland', 'agroforestry', 'tree_crop'],
    }
  }

  if (ndvi > 0.3 && ndvi <= 0.5 && bsi < 0.25) {
    return {
      class: 'CROPLAND',
      confidence: 0.75,
      subClasses: ndwi > 0 ? ['irrigated_cropland'] : ['rainfed_cropland'],
    }
  }

  if (ndvi > 0.2 && ndvi <= 0.3) {
    return {
      class: 'GRASSLAND',
      confidence: 0.65,
      subClasses: bsi > 0.1 ? ['degraded_grassland'] : ['grassland', 'pasture'],
    }
  }

  if (ndwi > 0.1 && ndvi < 0.4) {
    return {
      class: 'WETLAND',
      confidence: 0.7,
      subClasses: ['wetland', 'flooded_vegetation'],
    }
  }

  if (bsi > 0.3) {
    return {
      class: 'BARE_SOIL',
      confidence: Math.min(0.9, 0.5 + bsi * 0.3),
      subClasses: bsi > 0.5 ? ['eroded_soil', 'sand'] : ['fallow_land', 'bare_soil'],
    }
  }

  if (ndvi < 0.2 && bsi < 0.3) {
    return {
      class: 'SETTLEMENT',
      confidence: 0.5,
      subClasses: ['built_up', 'rural_settlement'],
    }
  }

  // Fallback
  return {
    class: 'GRASSLAND',
    confidence: 0.4,
    subClasses: ['mixed_vegetation'],
  }
}

// ============================================================
// Biomass Estimation
// ============================================================

/**
 * Estimate above-ground biomass (tonnes/ha) from NDVI.
 * Uses an empirically calibrated logarithmic model for tropical
 * smallholder farming systems in sub-Saharan Africa.
 *
 * Formula: AGB = a × exp(b × NDVI)
 * Where a=2.5, b=3.5 (calibrated for SSA agroforestry systems)
 *
 * Typical ranges:
 *   - Bare soil:     0–2 t/ha
 *   - Grassland:     2–8 t/ha
 *   - Cropland:      5–15 t/ha
 *   - Agroforestry:  15–40 t/ha
 *   - Dense forest:  40–150+ t/ha
 */
export function estimateBiomass(ndvi: number): number {
  if (ndvi <= 0) return 0
  const a = 2.5
  const b = 3.5
  const biomass = a * Math.exp(b * ndvi)
  // Cap at 200 t/ha for tropical systems
  return Math.min(200, Math.max(0, biomass))
}

// ============================================================
// Deforestation Detection
// ============================================================

/**
 * Detect deforestation by comparing current NDVI against a baseline.
 *
 * Logic:
 *  1. If current NDVI is significantly lower than baseline → vegetation loss detected
 *  2. NDWI helps distinguish forest-to-water conversion
 *  3. Severity classified by magnitude of NDVI drop
 *  4. Area estimation uses approximate relationship between NDVI drop and canopy loss
 *
 * @param currentNdvi  Latest NDVI measurement for the pixel/region
 * @param baselineNdvi Baseline NDVI (ideally pre-Dec 2020 for EUDR)
 * @param ndwi         Current NDWI for water cross-check
 * @param areaHectares Total area of the analysis region (for area-affected estimation)
 */
export function detectDeforestation(
  currentNdvi: number,
  baselineNdvi: number,
  ndwi: number,
  areaHectares: number = 1,
): DeforestationAlert {
  const ndviDrop = baselineNdvi - currentNdvi
  const now = new Date()

  // No significant change
  if (ndviDrop < 0.1) {
    return {
      detected: false,
      severity: 'NONE',
      areaAffectedHectares: 0,
      detectionDate: now,
      comparisonDate: new Date('2020-12-31'),
      confidence: 0,
    }
  }

  // If NDWI indicates water, this might be flooding, not deforestation
  const isWaterConversion = ndwi < -0.25

  // Severity classification based on NDVI drop magnitude
  let severity: DeforestationAlert['severity']
  let confidence: number

  if (ndviDrop >= 0.5) {
    severity = 'CRITICAL'
    confidence = 0.95
  } else if (ndviDrop >= 0.35) {
    severity = 'HIGH'
    confidence = 0.9
  } else if (ndviDrop >= 0.25) {
    severity = 'MEDIUM'
    confidence = 0.8
  } else if (ndviDrop >= 0.15) {
    severity = 'LOW'
    confidence = 0.65
  } else {
    severity = 'LOW'
    confidence = 0.5
  }

  // If water conversion, reduce deforestation confidence
  if (isWaterConversion) {
    confidence *= 0.3
    severity = 'LOW'
  }

  // Estimate area affected: proportional to NDVI drop relative to baseline
  // e.g., if NDVI dropped from 0.8 to 0.3 over a 10ha plot, ~62% affected
  const dropRatio = Math.min(1, ndviDrop / Math.max(0.01, baselineNdvi))
  const areaAffected = areaHectares * dropRatio

  return {
    detected: true,
    severity,
    areaAffectedHectares: Math.round(areaAffected * 100) / 100,
    detectionDate: now,
    comparisonDate: new Date('2020-12-31'),
    confidence: Math.round(confidence * 100) / 100,
  }
}

// ============================================================
// Utility: Compute all indices from raw bands
// ============================================================

/**
 * Convenience function to compute all vegetation indices
 * from a set of Sentinel-2 spectral bands.
 */
export function computeAllIndices(bands: {
  blue: number   // B02
  green: number  // B03
  red: number    // B04
  nir: number    // B08
  swir: number   // B11 or B12
}): Record<VegetationIndex, number> {
  return {
    NDVI: calculateNDVI(bands.red, bands.nir),
    EVI: calculateEVI(bands.red, bands.nir, bands.blue),
    SAVI: calculateSAVIFromBands(bands.red, bands.nir),
    NDWI: calculateNDWI(bands.green, bands.nir),
    NDMI: calculateNDMI(bands.nir, bands.swir),
    BSI: calculateBSI(bands.red, bands.nir, bands.blue, bands.swir),
  }
}

/**
 * Classify cloud cover level from percentage value.
 */
export function classifyCloudCover(percentage: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (percentage < 10) return 'LOW'
  if (percentage <= 30) return 'MEDIUM'
  return 'HIGH'
}