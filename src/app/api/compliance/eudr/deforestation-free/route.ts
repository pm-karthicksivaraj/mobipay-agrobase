import { EudrEngine } from '@/lib/eudr/engine'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { geolocation, polygonPoints, baselineDate } = body

    if (!geolocation && !polygonPoints) {
      return NextResponse.json(
        { error: 'geolocation (GeoJSON) or polygonPoints is required' },
        { status: 400 },
      )
    }

    // Extract polygon points from GeoJSON if needed
    let points = polygonPoints
    if (!points && geolocation) {
      try {
        const parsed = typeof geolocation === 'string' ? JSON.parse(geolocation) : geolocation
        const coords = parsed?.geometry?.coordinates?.[0] || parsed?.coordinates?.[0] || []
        points = coords.map(([lng, lat]: [number, number]) => ({ lat, lng }))
      } catch {
        return NextResponse.json({ error: 'Invalid geolocation format' }, { status: 400 })
      }
    }

    if (!points || points.length < 3) {
      return NextResponse.json(
        { error: 'At least 3 polygon points are required for deforestation-free check' },
        { status: 400 },
      )
    }

    // Use the EUDR baseline date (Dec 31, 2020) unless custom baseline provided
    const baseline = baselineDate ? new Date(baselineDate) : new Date('2020-12-31')

    const result = await EudrEngine.checkDeforestationFree(points, baseline)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to run deforestation-free check'
    console.error('EUDR deforestation-free check error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}