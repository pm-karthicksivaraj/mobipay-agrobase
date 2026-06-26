import { getTenantContext } from '@/lib/tenant'
import { NextResponse } from 'next/server'

// Benchmark data: emissions per kg (kgCO2e/kg) by commodity and country
const BENCHMARKS: Record<string, Record<string, { median: number; p25: number; p75: number; best: number; unit: string; recommendations: string[] }>> = {
  Coffee: {
    UG: {
      median: 2.1,
      p25: 1.6,
      p75: 2.8,
      best: 0.8,
      unit: 'kgCO2e/kg green bean',
      recommendations: [
        'Reduce synthetic fertilizer use by 30% through precision application',
        'Switch to organic composting to reduce fertilizer-related N2O emissions',
        'Optimize drying process using solar dryers instead of fuel-based systems',
        'Implement shade-grown coffee to reduce land-use change emissions',
      ],
    },
    GH: {
      median: 2.3,
      p25: 1.8,
      p75: 3.0,
      best: 1.0,
      unit: 'kgCO2e/kg green bean',
      recommendations: [
        'Adopt agroforestry practices to sequester carbon',
        'Use cover crops to reduce fertilizer requirements',
        'Invest in fuel-efficient transportation for cherry collection',
      ],
    },
    KE: {
      median: 1.9,
      p25: 1.4,
      p75: 2.5,
      best: 0.7,
      unit: 'kgCO2e/kg green bean',
      recommendations: [
        'Transition to drip irrigation to reduce energy consumption',
        'Use certified organic inputs to lower processing emissions',
      ],
    },
    _default: {
      median: 2.0,
      p25: 1.5,
      p75: 2.6,
      best: 0.9,
      unit: 'kgCO2e/kg green bean',
      recommendations: [
        'Implement integrated pest management to reduce pesticide emissions',
        'Use renewable energy for processing operations',
        'Optimize transport logistics to reduce fuel consumption',
      ],
    },
  },
  Cocoa: {
    UG: {
      median: 3.0,
      p25: 2.2,
      p75: 3.8,
      best: 1.2,
      unit: 'kgCO2e/kg dry bean',
      recommendations: [
        'Implement agroforestry systems with shade trees',
        'Reduce post-harvest fermentation emissions through controlled processing',
        'Use organic mulching to replace synthetic fertilizers',
      ],
    },
    GH: {
      median: 2.8,
      p25: 2.0,
      p75: 3.5,
      best: 1.1,
      unit: 'kgCO2e/kg dry bean',
      recommendations: [
        'Adopt climate-smart cocoa production practices',
        'Improve fermentation box efficiency to reduce waste emissions',
      ],
    },
    _default: {
      median: 2.8,
      p25: 2.1,
      p75: 3.6,
      best: 1.1,
      unit: 'kgCO2e/kg dry bean',
      recommendations: [
        'Transition to shade-grown cocoa systems',
        'Reduce transportation distances through local processing',
      ],
    },
  },
  Tea: {
    UG: {
      median: 1.4,
      p25: 1.0,
      p75: 1.8,
      best: 0.5,
      unit: 'kgCO2e/kg made tea',
      recommendations: [
        'Optimize pruning schedules to maintain healthy bush cover',
        'Use fuel-efficient withering and drying equipment',
      ],
    },
    _default: {
      median: 1.3,
      p25: 0.9,
      p75: 1.7,
      best: 0.4,
      unit: 'kgCO2e/kg made tea',
      recommendations: [
        'Install solar thermal systems for tea drying',
        'Adapt mechanical harvesting to reduce labor-related emissions',
      ],
    },
  },
}

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)

    const commodity = searchParams.get('commodity')
    const country = searchParams.get('country')

    if (!commodity) {
      return NextResponse.json({ error: 'commodity is required' }, { status: 400 })
    }

    const commodityBenchmarks = BENCHMARKS[commodity]
    if (!commodityBenchmarks) {
      return NextResponse.json({
        error: `No benchmark data available for commodity: ${commodity}`,
        availableCommodities: Object.keys(BENCHMARKS),
      }, { status: 404 })
    }

    // Find the best matching country benchmark
    const countryKey = country ? commodityBenchmarks[country.toUpperCase()] ? country.toUpperCase() : '_default' : '_default'
    const benchmark = commodityBenchmarks[countryKey]

    // If a specific value is provided, calculate percentile
    const yourValue = searchParams.get('value') ? parseFloat(searchParams.get('value')!) : null
    let percentile: number | null = null
    let comparison: string | null = null

    if (yourValue !== null) {
      // Approximate percentile using linear interpolation
      if (yourValue <= benchmark.p25) {
        percentile = Math.max(5, Math.round(25 * (yourValue / benchmark.p25)))
      } else if (yourValue <= benchmark.median) {
        percentile = 25 + Math.round(25 * ((yourValue - benchmark.p25) / (benchmark.median - benchmark.p25)))
      } else if (yourValue <= benchmark.p75) {
        percentile = 50 + Math.round(25 * ((yourValue - benchmark.median) / (benchmark.p75 - benchmark.median)))
      } else {
        percentile = 75 + Math.round(25 * Math.min(1, (yourValue - benchmark.p75) / (benchmark.median * 2 - benchmark.p75)))
      }

      if (yourValue <= benchmark.p25) {
        comparison = 'EXCELLENT — Your emissions are in the bottom quartile'
      } else if (yourValue <= benchmark.median) {
        comparison = 'GOOD — Your emissions are below the median'
      } else if (yourValue <= benchmark.p75) {
        comparison = 'AVERAGE — Your emissions are in the top half'
      } else {
        comparison = 'NEEDS_IMPROVEMENT — Your emissions are above the 75th percentile'
      }
    }

    return NextResponse.json({
      commodity,
      country: countryKey === '_default' ? null : countryKey,
      benchmark: {
        median: benchmark.median,
        p25: benchmark.p25,
        p75: benchmark.p75,
        best: benchmark.best,
        unit: benchmark.unit,
      },
      yourValue,
      percentile,
      comparison,
      recommendations: benchmark.recommendations,
    })
  } catch (error) {
    console.error('Carbon benchmark error:', error)
    return NextResponse.json({ error: 'Failed to fetch benchmark data' }, { status: 500 })
  }
}