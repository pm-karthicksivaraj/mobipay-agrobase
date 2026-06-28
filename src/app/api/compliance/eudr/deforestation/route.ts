import { getTenantContext } from '@/lib/tenant'
import { EudrEngine } from '@/lib/eudr/engine'
import { NextResponse } from 'next/server'

function extractPolygonCoords(geojson: string): Array<{ lat: number; lng: number }> {
  try {
    const parsed = JSON.parse(geojson)
    const coords = parsed?.geometry?.coordinates?.[0] || parsed?.coordinates?.[0] || []
    return coords.map(([lng, lat]: [number, number]) => ({ lat, lng }))
  } catch {
    return []
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const { geolocation, polygonPoints } = body

    if (!geolocation && !polygonPoints) {
      return NextResponse.json({ error: 'geolocation (GeoJSON) or polygonPoints is required' }, { status: 400 })
    }

    const points = polygonPoints || extractPolygonCoords(geolocation)
    if (points.length < 3) {
      return NextResponse.json({ error: 'At least 3 polygon points are required for deforestation check' }, { status: 400 })
    }

    const result = await EudrEngine.checkDeforestation(points)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to run deforestation check'
    console.error('EUDR deforestation check error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}