// ============================================
// AGROBASE V3 — Carbon Calculator Engine
// IPCC Tier 2 Methodology Implementation
// ============================================

import { db } from '@/lib/db'
import { getEmissionFactor, calculateN2OEmissions, EMISSION_FACTORS } from './emission-factors'
import {
  getBenchmark,
  getPercentileRank,
  getImprovementRecommendations,
} from './benchmarks'
import type {
  CarbonFootprint,
  CarbonStandard,
  CbamCalculation,
  ComparisonResult,
  CropStageEmission,
  EmissionSource,
  SequestrationEstimate,
  StageInputs,
} from './types'

// ─────────────────────────────────────────────
// Crop stage definitions
// ─────────────────────────────────────────────

const CROP_STAGES = [
  'Land Preparation',
  'Planting',
  'Vegetative',
  'Flowering',
  'Harvesting',
  'Post-Harvest',
] as const

// N content fractions of common fertilizers (for N2O calculation)
const FERTILIZER_N_FRACTION: Record<string, number> = {
  NPK: 0.15,       // average N content for common 15-15-15 or 17-17-17
  UREA: 0.46,      // 46% N
  DAP: 0.18,       // 18% N (diammonium phosphate 18-46-0)
  ORGANIC_MANURE: 0.02, // ~2% N typical for composted manure
  CAN: 0.21,       // calcium ammonium nitrate
  TSP: 0.0,        // triple super phosphate — no N
  MOP: 0.0,        // muriate of potash — no N
}

// Default country code when unknown
const DEFAULT_COUNTRY = 'UG'

// EU CBAM carbon prices by year (EUR/tonne CO2)
const EU_CARBON_PRICES: Record<string, number> = {
  '2026': 80,
  '2027': 85,
  '2028': 90,
  '2029': 95,
  '2030': 100,
  '2031': 105,
  '2032': 110,
  '2033': 115,
  '2034': 120,
}

// IPCC biomass factors by crop and country (tonnes dry matter / hectare / year)
const ABOVE_GROUND_BIOMASS: Record<string, Record<string, number>> = {
  COFFEE:    { UG: 8.5,  GH: 0,    KE: 9.2  },
  COCOA:     { UG: 4.2,  GH: 6.8,  KE: 0    },
  MAIZE:     { UG: 7.5,  GH: 6.0,  KE: 8.2  },
  RICE:      { UG: 6.8,  GH: 5.5,  KE: 7.0  },
  TEA:       { UG: 5.0,  GH: 0,    KE: 6.5  },
  OIL_PALM:  { UG: 12.0, GH: 14.5, KE: 0    },
  SUGARCANE: { UG: 18.0, GH: 16.0, KE: 20.0 },
  BEANS:     { UG: 3.2,  GH: 2.8,  KE: 3.5  },
  GROUNDNUT: { UG: 3.8,  GH: 3.5,  KE: 4.0  },
  CASSAVA:   { UG: 8.0,  GH: 7.0,  KE: 0    },
}

// Root-to-shoot ratios (IPCC default)
const ROOT_TO_SHOOT: Record<string, number> = {
  COFFEE: 0.3,
  COCOA: 0.35,
  MAIZE: 0.2,
  RICE: 0.25,
  TEA: 0.4,
  OIL_PALM: 0.27,
  SUGARCANE: 0.15,
  BEANS: 0.2,
  GROUNDNUT: 0.4,
  CASSAVA: 0.3,
}

// Carbon fraction of dry biomass (IPCC default = 0.47)
const CARBON_FRACTION = 0.47

// CO2 to C conversion factor (44/12 = 3.667)
const C_TO_CO2 = 44 / 12

// Default soil organic carbon change rates (tonnes C/ha/year)
// Positive = sequestration, negative = loss
const SOC_CHANGE_RATES: Record<string, Record<string, number>> = {
  COFFEE:    { UG: 0.3,  GH: 0.0,  KE: 0.35 },
  COCOA:     { UG: 0.4,  GH: 0.5,  KE: 0.0  },
  MAIZE:     { UG: -0.1, GH: -0.15, KE: -0.08 },
  RICE:      { UG: -0.2, GH: -0.25, KE: -0.18 },
  TEA:       { UG: 0.25, GH: 0.0,  KE: 0.3  },
  OIL_PALM:  { UG: 0.5,  GH: 0.6,  KE: 0.0  },
  SUGARCANE: { UG: 0.1,  GH: 0.05, KE: 0.15 },
  BEANS:     { UG: 0.05, GH: 0.02, KE: 0.08 },
  GROUNDNUT: { UG: 0.1,  GH: 0.08, KE: 0.12 },
  CASSAVA:   { UG: 0.05, GH: 0.03, KE: 0.0  },
}

// ─────────────────────────────────────────────
// CarbonCalculator Class
// ─────────────────────────────────────────────

export class CarbonCalculator {
  private country: string = DEFAULT_COUNTRY
  private method: CarbonStandard = 'IPCC_TIER2'

  setCountry(country: string): this {
    this.country = country.toUpperCase()
    return this
  }

  setMethod(method: CarbonStandard): this {
    this.method = method
    return this
  }

  // ───────────────────────────────────────────
  // Main: Calculate full crop footprint
  // ───────────────────────────────────────────

  /**
   * Calculate the complete carbon footprint for a cultivation cycle.
   * 1. Fetches cultivation + farm details from DB
   * 2. Builds per-stage emissions from all sources
   * 3. Sums and normalises per-kg and per-hectare
   */
  async calculateCropFootprint(cultivationId: string): Promise<CarbonFootprint> {
    const cultivation = await db.cultivation.findUnique({
      where: { id: cultivationId },
      include: {
        farm: {
          include: {
            farmer: {
              include: { tenant: true },
            },
          },
        },
      },
    })

    if (!cultivation) {
      throw new Error(`Cultivation ${cultivationId} not found`)
    }

    const farm = cultivation.farm
    const tenant = farm.farmer.tenant
    const country = tenant.country ?? DEFAULT_COUNTRY
    this.country = country.toUpperCase()

    const commodity = cultivation.cropName.toUpperCase().replace(/\s+/g, '_')
    const areaHectares = farm.sizeHectares ?? 1
    const actualYieldKg = (cultivation.actualYield ?? cultivation.estimatedYield ?? 0) * 1000

    // Build default stage emissions based on crop type
    const stages = this.buildDefaultStageEmissions(commodity, areaHectares, cultivation.sowingDate)

    // Calculate breakdown by source
    const breakdown = this.sumBreakdown(stages)
    const totalEmissions = Object.values(breakdown).reduce((sum, v) => sum + v, 0)

    const emissionsPerKg = actualYieldKg > 0 ? totalEmissions / actualYieldKg : 0
    const emissionsPerHectare = areaHectares > 0 ? totalEmissions / areaHectares : 0

    return {
      cultivationId,
      commodity: cultivation.cropName,
      totalEmissionsKgCO2e: Math.round(totalEmissions * 100) / 100,
      emissionsPerKg: Math.round(emissionsPerKg * 10000) / 10000,
      emissionsPerHectare: Math.round(emissionsPerHectare * 100) / 100,
      breakdown,
      stages,
      calculationMethod: this.method,
      verificationStatus: 'DRAFT',
    }
  }

  /**
   * Build default per-stage emissions for a commodity based on typical smallholder
   * practices. In production, this would be replaced by actual input records.
   */
  private buildDefaultStageEmissions(
    commodity: string,
    areaHectares: number,
    sowingDate: Date | null,
  ): CropStageEmission[] {
    const stages: CropStageEmission[] = []
    const baseDate = sowingDate ?? new Date()
    const country = this.country

    // Typical input quantities per hectare for smallholder systems
    const inputs: Record<string, StageInputs> = {
      COFFEE: {
        stage: 'Vegetative',
        fertilizerKg: { NPK: 75, UREA: 25, ORGANIC_MANURE: 500 },
        pesticideKg: { COPPER_FUNGICIDE: 3, CYPERMETHRIN: 1.5 },
        fuelLitres: { diesel: 8 },
        date: new Date(baseDate.getTime() + 60 * 86400000),
      },
      COCOA: {
        stage: 'Vegetative',
        fertilizerKg: { NPK: 60, UREA: 20, ORGANIC_MANURE: 400 },
        pesticideKg: { MANCOZEB: 2, CYPERMETHRIN: 1 },
        fuelLitres: { diesel: 6 },
        date: new Date(baseDate.getTime() + 90 * 86400000),
      },
      MAIZE: {
        stage: 'Planting',
        fertilizerKg: { DAP: 50, UREA: 50, ORGANIC_MANURE: 300 },
        pesticideKg: { GLYPHOSATE: 1.5, CYPERMETHRIN: 0.5 },
        fuelLitres: { diesel: 15, petrol: 3 },
        date: new Date(baseDate.getTime() + 7 * 86400000),
      },
      RICE: {
        stage: 'Vegetative',
        fertilizerKg: { NPK: 100, UREA: 60, ORGANIC_MANURE: 200 },
        pesticideKg: { GLYPHOSATE: 1.2, MANCOZEB: 1 },
        fuelLitres: { diesel: 10, petrol: 5 },
        irrigationHours: 200,
        irrigationFuelType: 'diesel',
        date: new Date(baseDate.getTime() + 45 * 86400000),
      },
      TEA: {
        stage: 'Vegetative',
        fertilizerKg: { NPK: 120, UREA: 40, ORGANIC_MANURE: 200 },
        pesticideKg: { MANCOZEB: 2.5, CYPERMETHRIN: 1 },
        fuelLitres: { diesel: 12, petrol: 4 },
        date: new Date(baseDate.getTime() + 30 * 86400000),
      },
      OIL_PALM: {
        stage: 'Vegetative',
        fertilizerKg: { NPK: 150, UREA: 80, ORGANIC_MANURE: 1000 },
        pesticideKg: { GLYPHOSATE: 2, CYPERMETHRIN: 1.5 },
        fuelLitres: { diesel: 20 },
        date: new Date(baseDate.getTime() + 90 * 86400000),
      },
    }

    const cropInputs = inputs[commodity]
    if (cropInputs) {
      const stageEmissions = this.calculateStageEmission(cropInputs.stage, {
        ...cropInputs,
        date: cropInputs.date,
      })
      stages.push(...stageEmissions)
    }

    // Add transport emission for all crops (typical 50km farm-to-market)
    stages.push(
      ...this.calculateStageEmission('Post-Harvest', {
        stage: 'Post-Harvest',
        transportKm: 50,
        transportWeightTonnes: areaHectares * 2,
        vehicleType: 'TRUCK',
        date: new Date(baseDate.getTime() + 270 * 86400000),
      }),
    )

    return stages
  }

  // ───────────────────────────────────────────
  // Stage-level emission calculation
  // ───────────────────────────────────────────

  /**
   * Calculate emissions for a specific crop stage given input quantities.
   * Returns an array of emissions per activity within the stage.
   */
  calculateStageEmission(stage: string, inputs: StageInputs): CropStageEmission[] {
    const emissions: CropStageEmission[] = []
    const country = this.country

    // Fertilizer emissions (N2O from N application + manufacturing)
    if (inputs.fertilizerKg) {
      for (const [fertType, qty] of Object.entries(inputs.fertilizerKg)) {
        if (qty <= 0) continue

        // N2O direct soil emissions (Tier 2)
        const nContent = (FERTILIZER_N_FRACTION[fertType] ?? 0.1) * qty
        const n2oEmissions = this.calculateN2OFromFertilizer(nContent, country)

        emissions.push({
          stage,
          source: 'FERTILIZER',
          activity: `N2O from ${fertType} application (${qty} kg)`,
          quantity: qty,
          unit: 'kg',
          emissionFactor: nContent > 0 ? Math.round((n2oEmissions / qty) * 100) / 100 : 0,
          totalEmission: Math.round(n2oEmissions * 100) / 100,
          date: inputs.date,
        })

        // Manufacturing emissions for synthetic fertilizers
        if (fertType !== 'ORGANIC_MANURE') {
          const ef = getEmissionFactor('FERTILIZER', fertType, country)
          if (ef) {
            const mfgEmission = qty * ef.value
            emissions.push({
              stage,
              source: 'FERTILIZER',
              activity: `Manufacturing emissions for ${fertType} (${qty} kg)`,
              quantity: qty,
              unit: 'kg',
              emissionFactor: ef.value,
              totalEmission: Math.round(mfgEmission * 100) / 100,
              date: inputs.date,
            })
          }
        }
      }
    }

    // Pesticide emissions (manufacturing only — field emissions accounted in Tier 2)
    if (inputs.pesticideKg) {
      for (const [pestType, qty] of Object.entries(inputs.pesticideKg)) {
        if (qty <= 0) continue
        const ef = getEmissionFactor('PESTICIDE', pestType, country)
        if (ef) {
          emissions.push({
            stage,
            source: 'PESTICIDE',
            activity: `${pestType} application (${qty} kg)`,
            quantity: qty,
            unit: 'kg',
            emissionFactor: ef.value,
            totalEmission: Math.round(qty * ef.value * 100) / 100,
            date: inputs.date,
          })
        }
      }
    }

    // Fuel emissions (direct combustion)
    if (inputs.fuelLitres) {
      for (const [fuelType, litres] of Object.entries(inputs.fuelLitres)) {
        if (litres <= 0) continue
        const ef = getEmissionFactor('FUEL', fuelType.toUpperCase(), country)
        if (ef) {
          emissions.push({
            stage,
            source: 'FUEL',
            activity: `${fuelType} for tractor/equipment (${litres} L)`,
            quantity: litres,
            unit: 'litre',
            emissionFactor: ef.value,
            totalEmission: Math.round(litres * ef.value * 100) / 100,
            date: inputs.date,
          })
        }
      }
    }

    // Transport emissions
    if (inputs.transportKm && inputs.transportKm > 0) {
      const vehicle = inputs.vehicleType ?? 'TRUCK'
      const transportEmission = this.calculateTransportEmissions(
        inputs.transportKm,
        inputs.transportWeightTonnes ?? 1,
        vehicle,
      )
      emissions.push({
        stage,
        source: 'TRANSPORT',
        activity: `Transport to market (${inputs.transportKm} km, ${vehicle})`,
        quantity: inputs.transportKm,
        unit: 'km',
        emissionFactor: transportEmission / inputs.transportKm,
        totalEmission: Math.round(transportEmission * 100) / 100,
        date: inputs.date,
      })
    }

    // Irrigation emissions
    if (inputs.irrigationHours && inputs.irrigationHours > 0) {
      const pumpType = inputs.irrigationFuelType === 'electric'
        ? 'ELECTRIC_PUMP'
        : 'DIESEL_PUMP'
      const ef = getEmissionFactor('IRRIGATION', pumpType, country)
      if (ef) {
        const irEmission = inputs.irrigationHours * ef.value
        emissions.push({
          stage,
          source: 'IRRIGATION',
          activity: `${pumpType} operation (${inputs.irrigationHours} hours)`,
          quantity: inputs.irrigationHours,
          unit: 'hour',
          emissionFactor: ef.value,
          totalEmission: Math.round(irEmission * 100) / 100,
          date: inputs.date,
        })
      }
    }

    // Drying emissions
    if (inputs.dryingMethod && inputs.processingKg && inputs.processingKg > 0) {
      const dryerType = inputs.dryingMethod === 'solar'
        ? 'SOLAR_DRYER'
        : 'MECHANICAL_DRYER'
      const ef = getEmissionFactor('DRIEDING', dryerType, country)
      if (ef) {
        const dryEmission = inputs.processingKg * ef.value
        emissions.push({
          stage,
          source: 'DRIEDING',
          activity: `${dryerType} drying (${inputs.processingKg} kg)`,
          quantity: inputs.processingKg,
          unit: 'kg',
          emissionFactor: ef.value,
          totalEmission: Math.round(dryEmission * 100) / 100,
          date: inputs.date,
        })
      }
    }

    // Storage emissions
    if (inputs.storageKgDays && inputs.storageKgDays > 0) {
      const ef = getEmissionFactor('STORAGE', 'COLD_STORAGE', country)
      if (ef) {
        const storEmission = inputs.storageKgDays * ef.value
        emissions.push({
          stage,
          source: 'STORAGE',
          activity: `Cold storage (${inputs.storageKgDays} kg-days)`,
          quantity: inputs.storageKgDays,
          unit: 'kg',
          emissionFactor: ef.value,
          totalEmission: Math.round(storEmission * 100) / 100,
          date: inputs.date,
        })
      }
    }

    // Land use change emissions
    if (inputs.landUseChangeFrom && inputs.landUseChangeAreaHectares && inputs.landUseChangeAreaHectares > 0) {
      const lucEmission = this.calculateLandUseChangeEmission(
        inputs.landUseChangeFrom,
        'CROP',
        inputs.landUseChangeAreaHectares,
        country,
      )
      emissions.push({
        stage,
        source: 'LAND_USE_CHANGE',
        activity: `Land use change: ${inputs.landUseChangeFrom} → Crop (${inputs.landUseChangeAreaHectares} ha)`,
        quantity: inputs.landUseChangeAreaHectares,
        unit: 'hectare',
        emissionFactor: lucEmission / inputs.landUseChangeAreaHectares,
        totalEmission: Math.round(lucEmission * 100) / 100,
        date: inputs.date,
      })
    }

    // Processing emissions
    if (inputs.processingKg && inputs.processingKg > 0) {
      // Check for commodity-specific processing EFs
      const processingCommodities = EMISSION_FACTORS.filter(
        (ef) => ef.source === 'PROCESSING' && ef.country === country,
      )
      for (const pef of processingCommodities) {
        const procEmission = inputs.processingKg * pef.value
        if (procEmission > 0.01) {
          emissions.push({
            stage,
            source: 'PROCESSING',
            activity: `${pef.commodity.replace(/_/g, ' ')} processing (${inputs.processingKg} kg)`,
            quantity: inputs.processingKg,
            unit: 'kg',
            emissionFactor: pef.value,
            totalEmission: Math.round(procEmission * 100) / 100,
            date: inputs.date,
          })
        }
      }
    }

    return emissions
  }

  // ───────────────────────────────────────────
  // Individual emission calculators
  // ───────────────────────────────────────────

  /**
   * Calculate N2O emissions from nitrogen in fertilizer using IPCC Tier 2.
   * @param nKg  — nitrogen content in kg
   * @param country — ISO country code
   */
  calculateN2OFromFertilizer(nKg: number, country: string): number {
    if (nKg <= 0) return 0
    return calculateN2OEmissions(nKg, country.toUpperCase())
  }

  /**
   * Calculate CO2e from fuel combustion.
   * @param litres — fuel volume
   * @param fuelType — 'diesel' (default 2.68 kgCO2/L) or 'petrol' (2.31 kgCO2/L)
   */
  calculateFuelEmissions(litres: number, fuelType: string = 'diesel'): number {
    if (litres <= 0) return 0
    const ef = getEmissionFactor('FUEL', fuelType.toUpperCase(), this.country)
    const value = ef?.value ?? (fuelType === 'diesel' ? 2.68 : 2.31)
    return Math.round(litres * value * 100) / 100
  }

  /**
   * Calculate transport emissions.
   * @param distanceKm — distance in km
   * @param weightTonnes — cargo weight in tonnes (used for documentation, EF already per-km)
   * @param vehicleType — TRUCK, MOTORCYCLE, or PICKUP
   */
  calculateTransportEmissions(
    distanceKm: number,
    weightTonnes: number,
    vehicleType: 'TRUCK' | 'MOTORCYCLE' | 'PICKUP',
  ): number {
    if (distanceKm <= 0) return 0
    const ef = getEmissionFactor('TRANSPORT', vehicleType, this.country)
    if (!ef) return 0
    return Math.round(distanceKm * ef.value * 100) / 100
  }

  /**
   * Calculate emissions from land use change.
   * @param prevLandUse — previous land use type (e.g., 'FOREST', 'GRASSLAND')
   * @param currentLandUse — new land use (e.g., 'CROP')
   * @param areaHectares — area converted
   * @param country — ISO country code
   */
  calculateLandUseChangeEmission(
    prevLandUse: string,
    currentLandUse: string,
    areaHectares: number,
    country: string,
  ): number {
    if (areaHectares <= 0) return 0

    const commodity = `${prevLandUse.toUpperCase()}_TO_${currentLandUse.toUpperCase()}`
    const ef = getEmissionFactor('LAND_USE_CHANGE', commodity, country.toUpperCase())

    if (!ef) {
      // Fallback: use generic forest-to-crop for any forest conversion
      if (prevLandUse.toLowerCase().includes('forest')) {
        const fallback = getEmissionFactor('LAND_USE_CHANGE', 'FOREST_TO_CROP', country.toUpperCase())
        return fallback ? Math.round(areaHectares * fallback.value * 100) / 100 : 0
      }
      return 0
    }

    // EF is in tonnes CO2 per hectare (from carbon stock), convert to kgCO2
    return Math.round(areaHectares * ef.value * 1000 * 100) / 100
  }

  // ───────────────────────────────────────────
  // Sequestration estimation
  // ───────────────────────────────────────────

  /**
   * Estimate carbon sequestration for a plot.
   * Uses IPCC Tier 1 methodology with default biomass factors.
   *
   * Above-ground: biomass_dry_matter × C_fraction × C_to_CO2
   * Below-ground: above_ground × root-to-shoot ratio × C_fraction × C_to_CO2
   * Soil: SOC_change_rate × area × C_to_CO2
   */
  calculateSequestration(
    plotId: string,
    crop: string,
    areaHectares: number,
  ): SequestrationEstimate {
    const cropKey = crop.toUpperCase().replace(/\s+/g, '_')
    const country = this.country

    // Above-ground biomass
    const biomassByCrop = ABOVE_GROUND_BIOMASS[cropKey] ?? {}
    const agBiomassTDM = (biomassByCrop[country] ?? 5.0) * areaHectares // tonnes dry matter
    const aboveGroundCO2 = agBiomassTDM * CARBON_FRACTION * C_TO_CO2

    // Below-ground biomass (root-to-shoot × above-ground)
    const rts = ROOT_TO_SHOOT[cropKey] ?? 0.25
    const bgBiomassTDM = agBiomassTDM * rts
    const belowGroundCO2 = bgBiomassTDM * CARBON_FRACTION * C_TO_CO2

    // Soil organic carbon change
    const socByCrop = SOC_CHANGE_RATES[cropKey] ?? {}
    const socChangeTC = (socByCrop[country] ?? 0) * areaHectares // tonnes C/year
    const socChangeCO2 = socChangeTC * C_TO_CO2

    const totalSequestration = aboveGroundCO2 + belowGroundCO2 + socChangeCO2

    // Confidence based on data availability
    const hasBiomassData = biomassByCrop[country] !== undefined && biomassByCrop[country] > 0
    const hasSOCData = socByCrop[country] !== undefined
    const confidence = hasBiomassData && hasSOCData ? 0.6 : 0.4

    return {
      plotId,
      crop: cropKey,
      areaHectares,
      aboveGroundBiomassCO2: Math.round(aboveGroundCO2 * 100) / 100,
      belowGroundBiomassCO2: Math.round(belowGroundCO2 * 100) / 100,
      soilOrganicCarbonChange: Math.round(socChangeCO2 * 100) / 100,
      totalSequestrationCO2: Math.round(totalSequestration * 100) / 100,
      method: 'IPCC Tier 1 — Default biomass factors + stock change method',
      confidence,
    }
  }

  // ───────────────────────────────────────────
  // CBAM calculation
  // ───────────────────────────────────────────

  /**
   * Calculate CBAM liability for a commodity shipment.
   *
   * Formula (EU CBAM Regulation Art. 20):
   *   Embedded emissions = (Scope 1 + Scope 2 + allocated Scope 3) per tonne
   *   Certificate cost = embedded emissions × quantity × EU carbon price
   *   Net cost = certificate cost - credits offset
   */
  async calculateCBAM(
    commodity: string,
    country: string,
    quantityTonnes: number,
    reportingPeriod: string,
  ): Promise<CbamCalculation> {
    const year = this.extractYearFromPeriod(reportingPeriod)
    const euCarbonPrice = EU_CARBON_PRICES[String(year)] ?? 80

    // Calculate embedded emissions per tonne for the commodity
    this.country = country.toUpperCase()
    const embeddedPerTonne = this.getEmbeddedEmissionsPerTonne(commodity, country.toUpperCase())

    const totalEmbedded = embeddedPerTonne * quantityTonnes
    const certificateCost = totalEmbedded * euCarbonPrice

    // Check for available carbon credits
    const creditsApplied = await this.getAvailableCredits(commodity, country, quantityTonnes)
    const creditsValue = creditsApplied * euCarbonPrice
    const netCost = certificateCost - creditsValue

    return {
      commodity,
      originCountry: country.toUpperCase(),
      quantityTonnes,
      embeddedEmissionsTco2PerTonne: Math.round(embeddedPerTonne * 1000) / 1000,
      totalEmbeddedEmissions: Math.round(totalEmbedded * 1000) / 1000,
      euCarbonPrice,
      cbamCertificateCost: Math.round(certificateCost * 100) / 100,
      carbonCreditsApplied: Math.round(creditsApplied * 1000) / 1000,
      netCost: Math.round(netCost * 100) / 100,
      reportingPeriod,
    }
  }

  /**
   * Get embedded emissions per tonne for a commodity-country pair.
   * Uses benchmarks as a proxy if no specific data available.
   */
  private getEmbeddedEmissionsPerTonne(commodity: string, country: string): number {
    const benchmark = getBenchmark(commodity.toUpperCase().replace(/\s+/g, '_'), country)
    if (benchmark) {
      return benchmark.medianEmbeddedEmissions
    }
    // Default fallback
    return 1.0
  }

  /**
   * Get available carbon credits to offset CBAM liability.
   */
  private async getAvailableCredits(
    commodity: string,
    country: string,
    _quantityTonnes: number,
  ): Promise<number> {
    // Look for active carbon credits in the system
    const credits = await db.cbamReport.findMany({
      where: {
        commodity: { contains: commodity },
        status: 'VERIFIED',
        carbonCredits: { gt: 0 },
      },
      select: { carbonCredits: true },
    })

    const totalCredits = credits.reduce((sum, c) => sum + (c.carbonCredits ?? 0), 0)
    // Cap at the quantity needed
    return Math.min(totalCredits, _quantityTonnes * 0.1) // Max 10% offset
  }

  // ───────────────────────────────────────────
  // Benchmark comparison
  // ───────────────────────────────────────────

  /**
   * Compare a carbon footprint against industry/regional benchmarks.
   */
  compareWithBenchmark(footprint: CarbonFootprint, benchmark?: Parameters<typeof getBenchmark>[1]): ComparisonResult {
    const commodity = footprint.commodity.toUpperCase().replace(/\s+/g, '_')
    const country = this.country
    const bm = typeof benchmark === 'string'
      ? getBenchmark(commodity, benchmark)
      : getBenchmark(commodity, country)

    const actualPerKg = footprint.emissionsPerKg
    const medianPerKg = bm ? bm.medianEmbeddedEmissions / 1000 : 0 // Convert tCO2/tonne to kgCO2/kg
    const differencePercent = medianPerKg > 0
      ? ((actualPerKg - medianPerKg) / medianPerKg) * 100
      : 0

    const percentile = bm
      ? getPercentileRank(actualPerKg, commodity, country)
      : 50

    let rating: ComparisonResult['rating'] = 'AVERAGE'
    if (differencePercent <= -30) rating = 'EXCELLENT'
    else if (differencePercent <= -10) rating = 'GOOD'
    else if (differencePercent <= 10) rating = 'AVERAGE'
    else if (differencePercent <= 30) rating = 'BELOW_AVERAGE'
    else rating = 'POOR'

    const recommendations = bm
      ? getImprovementRecommendations(footprint, bm)
      : []

    return {
      commodity: footprint.commodity,
      country,
      actualEmissionsPerKg: actualPerKg,
      benchmarkMedianPerKg: medianPerKg,
      differencePercent: Math.round(differencePercent * 10) / 10,
      percentileRank: percentile,
      rating,
      recommendations,
    }
  }

  // ───────────────────────────────────────────
  // Utility helpers
  // ───────────────────────────────────────────

  private sumBreakdown(stages: CropStageEmission[]): Record<EmissionSource, number> {
    const breakdown: Partial<Record<EmissionSource, number>> = {}
    for (const s of stages) {
      breakdown[s.source] = (breakdown[s.source] ?? 0) + s.totalEmission
    }
    // Ensure all sources are present (even if 0)
    const allSources: EmissionSource[] = [
      'FERTILIZER', 'PESTICIDE', 'FUEL', 'LAND_USE_CHANGE',
      'TRANSPORT', 'PROCESSING', 'IRRIGATION', 'DRIEDING', 'STORAGE',
    ]
    for (const src of allSources) {
      breakdown[src] = Math.round((breakdown[src] ?? 0) * 100) / 100
    }
    return breakdown as Record<EmissionSource, number>
  }

  private extractYearFromPeriod(period: string): number {
    const match = period.match(/(\d{4})/)
    return match ? parseInt(match[1], 10) : new Date().getFullYear()
  }

  /**
   * Calculate carbon footprint from explicit stage inputs (no DB call).
   * Useful for ad-hoc calculations and testing.
   */
  calculateFootprintFromInputs(
    commodity: string,
    allStageInputs: StageInputs[],
    yieldKg: number,
    areaHectares: number,
  ): CarbonFootprint {
    const stages: CropStageEmission[] = []
    for (const input of allStageInputs) {
      stages.push(...this.calculateStageEmission(input.stage, input))
    }

    const breakdown = this.sumBreakdown(stages)
    const totalEmissions = Object.values(breakdown).reduce((sum, v) => sum + v, 0)

    const emissionsPerKg = yieldKg > 0 ? totalEmissions / yieldKg : 0
    const emissionsPerHectare = areaHectares > 0 ? totalEmissions / areaHectares : 0

    return {
      cultivationId: 'MANUAL',
      commodity,
      totalEmissionsKgCO2e: Math.round(totalEmissions * 100) / 100,
      emissionsPerKg: Math.round(emissionsPerKg * 10000) / 10000,
      emissionsPerHectare: Math.round(emissionsPerHectare * 100) / 100,
      breakdown,
      stages,
      calculationMethod: this.method,
      verificationStatus: 'DRAFT',
    }
  }
}

// ─────────────────────────────────────────────
// Convenience singleton
// ─────────────────────────────────────────────

export const carbonCalculator = new CarbonCalculator()