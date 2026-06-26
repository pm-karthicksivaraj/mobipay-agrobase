import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const tenantFilter = buildTenantFilter(ctx)
    const { searchParams } = new URL(request.url)

    const farmId = searchParams.get('farmId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    if (!farmId) {
      return NextResponse.json({ error: 'farmId is required' }, { status: 400 })
    }

    // Verify farm access
    const farm = await db.farmLand.findFirst({
      where: { id: farmId, ...tenantFilter },
    })
    if (!farm) {
      return NextResponse.json({ error: 'Farm not found or access denied' }, { status: 404 })
    }

    const whereClause: Record<string, unknown> = {
      farmId,
      ...tenantFilter,
    }

    if (dateFrom) whereClause.date = { ...((whereClause.date as Record<string, unknown>) || {}), gte: dateFrom }
    if (dateTo) whereClause.date = { ...((whereClause.date as Record<string, unknown>) || {}), lte: dateTo }

    // Try to fetch from DB
    const dbRecords = await db.rainfallRecord.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
    })

    if (dbRecords.length > 0) {
      const dailyData = dbRecords.map((r) => ({
        date: r.date,
        rainfallMm: r.rainfallMm,
        isChirps: r.isChirps,
      }))

      const totalMm = dailyData.reduce((sum, d) => sum + d.rainfallMm, 0)
      const drySpellDays = countDrySpells(dailyData, 7, 1)
      const heavyRainfallDays = dailyData.filter((d) => d.rainfallMm > 50).length

      return NextResponse.json({
        location: {
          latitude: dbRecords[0].latitude,
          longitude: dbRecords[0].longitude,
        },
        totalMm: Math.round(totalMm * 100) / 100,
        dailyData,
        anomaly: null, // Requires historical baseline
        drySpellDays,
        heavyRainfallDays,
      })
    }

    // TODO: Wire to SatelliteEngine.getRainfallData()
    // Return placeholder mock data
    const dailyData = generateMockRainfall(dateFrom || '2026-01-01', dateTo || '2026-06-30')
    const totalMm = dailyData.reduce((sum, d) => sum + d.rainfallMm, 0)
    const drySpellDays = countDrySpells(dailyData, 7, 1)
    const heavyRainfallDays = dailyData.filter((d) => d.rainfallMm > 50).length

    return NextResponse.json({
      location: {
        latitude: farm.latitude || 0.3476,
        longitude: farm.longitude || 32.5825,
      },
      totalMm: Math.round(totalMm * 100) / 100,
      dailyData,
      anomaly: '+8%',
      drySpellDays,
      heavyRainfallDays,
    })
  } catch (error) {
    console.error('Rainfall data error:', error)
    return NextResponse.json({ error: 'Failed to fetch rainfall data' }, { status: 500 })
  }
}

function countDrySpells(dailyData: { rainfallMm: number }[], consecutiveDays: number, threshold: number): number {
  let count = 0
  let streak = 0
  for (const d of dailyData) {
    if (d.rainfallMm <= threshold) {
      streak++
    } else {
      if (streak >= consecutiveDays) count++
      streak = 0
    }
  }
  if (streak >= consecutiveDays) count++
  return count
}

function generateMockRainfall(from: string, to: string): { date: string; rainfallMm: number; isChirps: boolean }[] {
  const result: { date: string; rainfallMm: number; isChirps: boolean }[] = []
  const start = new Date(from)
  const end = new Date(to)
  const current = new Date(start)

  while (current <= end) {
    const month = current.getMonth()
    // Uganda bimodal rainfall pattern
    let probability: number
    if (month >= 2 && month <= 4) probability = 0.7 // Mar-May first rains
    else if (month >= 9 && month <= 11) probability = 0.75 // Sep-Nov second rains
    else if (month >= 5 && month <= 7) probability = 0.3
    else probability = 0.25

    const hasRain = Math.random() < probability
    const rainfallMm = hasRain ? Math.round((Math.random() * 30 + 2) * 10) / 10 : 0

    result.push({
      date: current.toISOString().split('T')[0],
      rainfallMm,
      isChirps: true,
    })

    current.setDate(current.getDate() + 1)
  }

  return result
}