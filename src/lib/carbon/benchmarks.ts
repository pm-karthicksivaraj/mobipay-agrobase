// ============================================
// AGROBASE V3 — Carbon Benchmarks
// Regional commodity emission benchmarks for
// East & West African smallholder agriculture
// ============================================

import type {
  CarbonBenchmark,
  CarbonFootprint,
  EmissionSource,
  Recommendation,
} from './types'

/**
 * Embedded emissions benchmarks (tCO2e per tonne of product).
 *
 * Sources:
 * - Coffee: UCDA carbon footprint studies, ICO sustainability reports, FAO GLEAM
 * - Cocoa: Ghana COCOBOD, ICCO, CIFOR landscape studies
 * - Maize: FAO MAESTRO, national LCA studies
 * - Rice: FAO GLEAM (CH4 dominant), IRRI studies
 * - Tea: TRFK Kenya, ETP sustainability reports
 * - Oil Palm: RSPO, Ghana COCOBOD, CIFOR
 * - Sugarcane: FAO, national sugar board data
 * - Beans/Groundnut/Cassava: FAO, CGIAR IITA studies
 */
export const CARBON_BENCHMARKS: CarbonBenchmark[] = [
  // ─── Coffee ───
  {
    commodity: 'COFFEE',
    country: 'UG',
    medianEmbeddedEmissions: 0.85,
    p25EmbeddedEmissions: 0.55,
    p75EmbeddedEmissions: 1.35,
    unit: 'tCO2e/tonne green bean',
    source: 'UCDA Coffee Carbon Footprint Study 2022; ICO Sustainability Report',
    year: 2022,
    sampleSize: 1240,
  },
  {
    commodity: 'COFFEE',
    country: 'GH',
    medianEmbeddedEmissions: 0.92,
    p25EmbeddedEmissions: 0.60,
    p75EmbeddedEmissions: 1.45,
    unit: 'tCO2e/tonne green bean',
    source: 'Ghana Coffee Federation; FAO GLEAM 2022',
    year: 2022,
    sampleSize: 340,
  },
  {
    commodity: 'COFFEE',
    country: 'KE',
    medianEmbeddedEmissions: 0.72,
    p25EmbeddedEmissions: 0.50,
    p75EmbeddedEmissions: 1.10,
    unit: 'tCO2e/tonne green bean',
    source: 'Kenya Coffee Board Sustainability Report 2023; TRFK',
    year: 2023,
    sampleSize: 890,
  },

  // ─── Cocoa ───
  {
    commodity: 'COCOA',
    country: 'GH',
    medianEmbeddedEmissions: 2.10,
    p25EmbeddedEmissions: 1.50,
    p75EmbeddedEmissions: 2.85,
    unit: 'tCO2e/tonne dried cocoa beans',
    source: 'Ghana COCOBOD Climate Smart Cocoa Programme 2023; CIFOR',
    year: 2023,
    sampleSize: 2100,
  },
  {
    commodity: 'COCOA',
    country: 'UG',
    medianEmbeddedEmissions: 1.80,
    p25EmbeddedEmissions: 1.20,
    p75EmbeddedEmissions: 2.50,
    unit: 'tCO2e/tonne dried cocoa beans',
    source: 'Uganda Cocoa Association; ICRAF shade-grown cocoa study',
    year: 2022,
    sampleSize: 560,
  },
  {
    commodity: 'COCOA',
    country: 'KE',
    medianEmbeddedEmissions: 1.95,
    p25EmbeddedEmissions: 1.35,
    p75EmbeddedEmissions: 2.70,
    unit: 'tCO2e/tonne dried cocoa beans',
    source: 'Kenya Agriculture Research; FAO GLEAM',
    year: 2022,
    sampleSize: 180,
  },

  // ─── Maize ───
  {
    commodity: 'MAIZE',
    country: 'UG',
    medianEmbeddedEmissions: 0.35,
    p25EmbeddedEmissions: 0.20,
    p75EmbeddedEmissions: 0.48,
    unit: 'tCO2e/tonne shelled maize',
    source: 'Uganda MAIF; FAO MAESTRO 2022',
    year: 2022,
    sampleSize: 3200,
  },
  {
    commodity: 'MAIZE',
    country: 'GH',
    medianEmbeddedEmissions: 0.32,
    p25EmbeddedEmissions: 0.18,
    p75EmbeddedEmissions: 0.45,
    unit: 'tCO2e/tonne shelled maize',
    source: 'Ghana MoFA; FAO MAESTRO 2022',
    year: 2022,
    sampleSize: 2800,
  },
  {
    commodity: 'MAIZE',
    country: 'KE',
    medianEmbeddedEmissions: 0.30,
    p25EmbeddedEmissions: 0.17,
    p75EmbeddedEmissions: 0.42,
    unit: 'tCO2e/tonne shelled maize',
    source: 'Kenya NCPB; FAO GLEAM 2023',
    year: 2023,
    sampleSize: 4100,
  },

  // ─── Rice (CH4 is a major factor) ───
  {
    commodity: 'RICE',
    country: 'UG',
    medianEmbeddedEmissions: 2.20,
    p25EmbeddedEmissions: 1.40,
    p75EmbeddedEmissions: 3.10,
    unit: 'tCO2e/tonne paddy rice',
    source: 'Uganda Rice Millers; FAO GLEAM (includes CH4 from flooded paddies)',
    year: 2022,
    sampleSize: 980,
  },
  {
    commodity: 'RICE',
    country: 'GH',
    medianEmbeddedEmissions: 2.50,
    p25EmbeddedEmissions: 1.60,
    p75EmbeddedEmissions: 3.40,
    unit: 'tCO2e/tonne paddy rice',
    source: 'Ghana Irrigation Dev Authority; FAO GLEAM 2022',
    year: 2022,
    sampleSize: 1200,
  },
  {
    commodity: 'RICE',
    country: 'KE',
    medianEmbeddedEmissions: 1.80,
    p25EmbeddedEmissions: 1.20,
    p75EmbeddedEmissions: 2.60,
    unit: 'tCO2e/tonne paddy rice',
    source: 'Kenya NIA Mwea scheme; FAO GLEAM 2023',
    year: 2023,
    sampleSize: 750,
  },

  // ─── Tea ───
  {
    commodity: 'TEA',
    country: 'KE',
    medianEmbeddedEmissions: 0.55,
    p25EmbeddedEmissions: 0.35,
    p75EmbeddedEmissions: 0.80,
    unit: 'tCO2e/tonne made tea',
    source: 'TRFK Carbon Footprint Baseline 2023; ETP',
    year: 2023,
    sampleSize: 560,
  },
  {
    commodity: 'TEA',
    country: 'UG',
    medianEmbeddedEmissions: 0.62,
    p25EmbeddedEmissions: 0.40,
    p75EmbeddedEmissions: 0.90,
    unit: 'tCO2e/tonne made tea',
    source: 'Uganda Tea Association; FAO GLEAM',
    year: 2022,
    sampleSize: 220,
  },

  // ─── Oil Palm ───
  {
    commodity: 'OIL_PALM',
    country: 'GH',
    medianEmbeddedEmissions: 1.65,
    p25EmbeddedEmissions: 1.10,
    p75EmbeddedEmissions: 2.20,
    unit: 'tCO2e/tonne FFB (fresh fruit bunch)',
    source: 'Ghana COCOBOD Oil Palm Unit; RSPO Ghana reports 2023',
    year: 2023,
    sampleSize: 1450,
  },
  {
    commodity: 'OIL_PALM',
    country: 'UG',
    medianEmbeddedEmissions: 1.50,
    p25EmbeddedEmissions: 1.00,
    p75EmbeddedEmissions: 2.10,
    unit: 'tCO2e/tonne FFB (fresh fruit bunch)',
    source: 'Uganda Oil Palm Growers; IFAD vegetable oil study',
    year: 2022,
    sampleSize: 680,
  },

  // ─── Sugarcane ───
  {
    commodity: 'SUGARCANE',
    country: 'UG',
    medianEmbeddedEmissions: 0.38,
    p25EmbeddedEmissions: 0.22,
    p75EmbeddedEmissions: 0.55,
    unit: 'tCO2e/tonne cane',
    source: 'Uganda Sugar Corp; FAO GLEAM',
    year: 2022,
    sampleSize: 320,
  },
  {
    commodity: 'SUGARCANE',
    country: 'KE',
    medianEmbeddedEmissions: 0.32,
    p25EmbeddedEmissions: 0.20,
    p75EmbeddedEmissions: 0.48,
    unit: 'tCO2e/tonne cane',
    source: 'Kenya Sugar Board; FAO GLEAM 2023',
    year: 2023,
    sampleSize: 450,
  },

  // ─── Beans ───
  {
    commodity: 'BEANS',
    country: 'UG',
    medianEmbeddedEmissions: 0.28,
    p25EmbeddedEmissions: 0.15,
    p75EmbeddedEmissions: 0.42,
    unit: 'tCO2e/tonne dry beans',
    source: 'Uganda NARO bean program; FAO MAESTRO',
    year: 2022,
    sampleSize: 1800,
  },
  {
    commodity: 'BEANS',
    country: 'KE',
    medianEmbeddedEmissions: 0.25,
    p25EmbeddedEmissions: 0.14,
    p75EmbeddedEmissions: 0.38,
    unit: 'tCO2e/tonne dry beans',
    source: 'Kenya KALRO; FAO GLEAM',
    year: 2022,
    sampleSize: 2100,
  },

  // ─── Groundnut ───
  {
    commodity: 'GROUNDNUT',
    country: 'UG',
    medianEmbeddedEmissions: 0.22,
    p25EmbeddedEmissions: 0.12,
    p75EmbeddedEmissions: 0.35,
    unit: 'tCO2e/tonne shelled groundnut',
    source: 'Uganda NARO; FAO MAESTRO',
    year: 2022,
    sampleSize: 1400,
  },
  {
    commodity: 'GROUNDNUT',
    country: 'GH',
    medianEmbeddedEmissions: 0.20,
    p25EmbeddedEmissions: 0.11,
    p75EmbeddedEmissions: 0.32,
    unit: 'tCO2e/tonne shelled groundnut',
    source: 'Ghana MoFA; FAO MAESTRO',
    year: 2022,
    sampleSize: 1100,
  },

  // ─── Cassava ───
  {
    commodity: 'CASSAVA',
    country: 'UG',
    medianEmbeddedEmissions: 0.12,
    p25EmbeddedEmissions: 0.06,
    p75EmbeddedEmissions: 0.22,
    unit: 'tCO2e/tonne fresh cassava roots',
    source: 'Uganda NARO; IITA climate-smart cassava study',
    year: 2022,
    sampleSize: 2500,
  },
  {
    commodity: 'CASSAVA',
    country: 'GH',
    medianEmbeddedEmissions: 0.14,
    p25EmbeddedEmissions: 0.07,
    p75EmbeddedEmissions: 0.25,
    unit: 'tCO2e/tonne fresh cassava roots',
    source: 'Ghana MoFA; IITA cassava study',
    year: 2022,
    sampleSize: 1900,
  },
]

/**
 * Look up a benchmark for a commodity-country pair.
 * Normalises commodity name (spaces → underscores, uppercase).
 */
export function getBenchmark(commodity: string, country: string): CarbonBenchmark | undefined {
  const normalisedCommodity = commodity.toUpperCase().replace(/\s+/g, '_')
  const normalisedCountry = country.toUpperCase()

  return CARBON_BENCHMARKS.find(
    (b) => b.commodity === normalisedCommodity && b.country === normalisedCountry,
  )
}

/**
 * Estimate percentile rank of a given footprint value against the benchmark distribution.
 * Uses a simple linear interpolation between P25 and P75, with bounds clamping.
 *
 * @param footprintPerKg — kgCO2e per kg of produce
 * @param commodity — crop name
 * @param country — country code
 * @returns percentile 0-100
 */
export function getPercentileRank(
  footprintPerKg: number,
  commodity: string,
  country: string,
): number {
  const bm = getBenchmark(commodity, country)
  if (!bm) return 50 // Unknown benchmark → assume median

  // Convert benchmark from tCO2/tonne to kgCO2/kg (same value, just unit change)
  const p25 = bm.p25EmbeddedEmissions / 1000
  const median = bm.medianEmbeddedEmissions / 1000
  const p75 = bm.p75EmbeddedEmissions / 1000

  if (footprintPerKg <= p25) {
    // Below P25: interpolate from 0 (at 0) to 25 (at P25)
    return Math.max(0, Math.min(25, Math.round((footprintPerKg / p25) * 25)))
  }

  if (footprintPerKg <= median) {
    // P25 to median: 25 to 50
    const range = median - p25
    const fraction = range > 0 ? (footprintPerKg - p25) / range : 0.5
    return Math.round(25 + fraction * 25)
  }

  if (footprintPerKg <= p75) {
    // median to P75: 50 to 75
    const range = p75 - median
    const fraction = range > 0 ? (footprintPerKg - median) / range : 0.5
    return Math.round(50 + fraction * 25)
  }

  // Above P75: 75 to 100 (logarithmic scaling for tail)
  const excess = footprintPerKg - p75
  const tailRange = p75 - median
  const logScale = tailRange > 0 ? Math.min(25, Math.log2(1 + excess / tailRange) * 25) : 25
  return Math.min(100, Math.round(75 + logScale))
}

/**
 * Generate actionable improvement recommendations based on
 * comparing the footprint breakdown against the benchmark.
 */
export function getImprovementRecommendations(
  footprint: CarbonFootprint,
  benchmark: CarbonBenchmark,
): Recommendation[] {
  const recommendations: Recommendation[] = []
  const breakdown = footprint.breakdown
  const total = footprint.totalEmissionsKgCO2e

  if (total <= 0) return recommendations

  // Identify top emitting sources
  const sourceShares = Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)

  // Generate recommendations per major source
  for (const [source, kgCO2e] of sourceShares) {
    const share = (kgCO2e / total) * 100

    switch (source as EmissionSource) {
      case 'FERTILIZER': {
        if (share > 15) {
          recommendations.push({
            category: 'FERTILIZER',
            title: 'Optimize Nitrogen Application',
            description:
              'Fertilizer accounts for ' +
              Math.round(share) +
              '% of emissions. Apply split doses matching crop uptake stages, use urease inhibitors, and increase organic manure share to reduce N2O losses.',
            potentialSavingPercent: 20,
            priority: 'HIGH',
            implementationEffort: 'MODERATE',
          })
        }
        recommendations.push({
          category: 'FERTILIZER',
          title: 'Integrate Legume Cover Crops',
          description:
            'Biological nitrogen fixation from legumes can replace 30-50 kg N/ha of synthetic fertilizer, directly cutting N2O emissions and input costs.',
          potentialSavingPercent: 15,
          priority: 'MEDIUM',
          implementationEffort: 'EASY',
        })
        break
      }

      case 'FUEL': {
        if (share > 10) {
          recommendations.push({
            category: 'FUEL',
            title: 'Reduce Machinery Fuel Consumption',
            description:
              'Fuel combustion is ' +
              Math.round(share) +
              '% of emissions. Consolidate field operations, maintain equipment for fuel efficiency, and explore no-till practices to reduce passes.',
            potentialSavingPercent: 15,
            priority: 'HIGH',
            implementationEffort: 'MODERATE',
          })
        }
        recommendations.push({
          category: 'FUEL',
          title: 'Transition to Solar-Powered Equipment',
          description:
            'Solar water pumps and solar-dried processing eliminate diesel dependency. Payback period is typically 2-3 years for smallholder systems.',
          potentialSavingPercent: 40,
          priority: 'MEDIUM',
          implementationEffort: 'MODERATE',
        })
        break
      }

      case 'PESTICIDE': {
        recommendations.push({
          category: 'PESTICIDE',
          title: 'Adopt Integrated Pest Management (IPM)',
          description:
            'IPM reduces pesticide volumes by 30-60% through biological control, crop rotation, and targeted application based on scouting thresholds.',
          potentialSavingPercent: 40,
          priority: 'MEDIUM',
          implementationEffort: 'MODERATE',
        })
        break
      }

      case 'TRANSPORT': {
        if (share > 5) {
          recommendations.push({
            category: 'TRANSPORT',
            title: 'Optimize Logistics and Bulk Transport',
            description:
              'Consolidate shipments to maximize truck load factors. Use collection centres to aggregate produce and reduce per-kg transport emissions.',
            potentialSavingPercent: 25,
            priority: 'MEDIUM',
            implementationEffort: 'EASY',
          })
        }
        break
      }

      case 'IRRIGATION': {
        if (share > 10) {
          recommendations.push({
            category: 'IRRIGATION',
            title: 'Improve Irrigation Efficiency',
            description:
              'Irrigation is ' +
              Math.round(share) +
              '% of emissions. Switch from diesel to electric pumps (especially in Kenya with low grid EF), use drip irrigation, and schedule based on soil moisture sensors.',
            potentialSavingPercent: 35,
            priority: 'HIGH',
            implementationEffort: 'DIFFICULT',
          })
        }
        break
      }

      case 'DRIEDING': {
        recommendations.push({
          category: 'DRIEDING',
          title: 'Switch to Solar Drying',
          description:
            'Solar dryers reduce drying emissions by >90% compared to mechanical/diesel dryers while improving product quality and reducing post-harvest losses.',
          potentialSavingPercent: 85,
          priority: 'HIGH',
          implementationEffort: 'EASY',
        })
        break
      }

      case 'LAND_USE_CHANGE': {
        recommendations.push({
          category: 'LAND_USE_CHANGE',
          title: 'Avoid Forest Conversion — Use Existing Cropland',
          description:
            'Land use change emissions are the single largest source and persist for decades. Expand production on already-degraded or existing agricultural land.',
          potentialSavingPercent: 100,
          priority: 'HIGH',
          implementationEffort: 'DIFFICULT',
        })
        recommendations.push({
          category: 'LAND_USE_CHANGE',
          title: 'Agroforestry Integration',
          description:
            'Integrate trees into cropping systems (shade coffee/cocoa) to maintain carbon stocks while producing crops. Eligible for carbon credit generation.',
          potentialSavingPercent: 50,
          priority: 'HIGH',
          implementationEffort: 'MODERATE',
        })
        break
      }

      case 'PROCESSING': {
        recommendations.push({
          category: 'PROCESSING',
          title: 'Improve Processing Energy Efficiency',
          description:
            'Modernize processing equipment, use waste biomass (coffee husks, cocoa pods) as fuel, and batch processing to maximize energy utilization per kg output.',
          potentialSavingPercent: 25,
          priority: 'MEDIUM',
          implementationEffort: 'DIFFICULT',
        })
        break
      }

      case 'STORAGE': {
        recommendations.push({
          category: 'STORAGE',
          title: 'Optimize Cold Chain Logistics',
          description:
            'Reduce storage time, improve insulation, use renewable energy for cold storage, and pre-cool produce before storage to reduce energy demand.',
          potentialSavingPercent: 30,
          priority: 'LOW',
          implementationEffort: 'MODERATE',
        })
        break
      }
    }
  }

  // General cross-cutting recommendations
  recommendations.push({
    category: 'FERTILIZER',
    title: 'Generate Carbon Credits',
    description:
      'With emissions at ' +
      (footprint.emissionsPerKg * 1000).toFixed(2) +
      ' tCO2e/tonne vs benchmark ' +
      benchmark.medianEmbeddedEmissions.toFixed(2) +
      ' tCO2e/tonne, ' +
      (footprint.emissionsPerKg * 1000 < benchmark.medianEmbeddedEmissions
        ? 'this operation may qualify for VERRA VCS or Gold Standard carbon credits.'
        : 'reducing emissions below the benchmark would enable carbon credit generation.'),
    potentialSavingPercent: 0,
    priority: 'MEDIUM',
    implementationEffort: 'DIFFICULT',
  })

  // Sort by potential savings descending, then priority
  const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  recommendations.sort((a, b) => {
    if (b.potentialSavingPercent !== a.potentialSavingPercent) {
      return b.potentialSavingPercent - a.potentialSavingPercent
    }
    return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
  })

  return recommendations
}