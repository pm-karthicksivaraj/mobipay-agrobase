'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Trash2, MapPin, Ruler, Crosshair } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon paths in Next.js
// @ts-expect-error - Icon.Default.mergeOptions override
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export interface PolygonPoint { lat: number; lng: number; altitude?: number }

interface PolygonMapProps {
  initialPoints?: PolygonPoint[]
  onChange?: (points: PolygonPoint[], areaHectares: number) => void
  center?: [number, number]
  zoom?: number
  height?: string
  className?: string
}

/**
 * Interactive Leaflet map for drawing farm polygons.
 * - Click on map to add polygon vertices
 * - "Finish polygon" creates a closed shape & calculates area (Shoelace)
 * - Editable: clear all, remove last point
 */
export default function PolygonMap({
  initialPoints = [],
  onChange,
  center = [0.3476, 32.5825], // default: Kampala
  zoom = 14,
  height = '420px',
  className,
}: PolygonMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const polygonRef = useRef<L.Polygon | L.Polyline | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const [points, setPoints] = useState<PolygonPoint[]>(initialPoints)
  const [area, setArea] = useState(0)

  // Shoelace area calculation in hectares
  const calcArea = (pts: PolygonPoint[]): number => {
    if (pts.length < 3) return 0
    let a = 0
    const n = pts.length
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      a += pts[i].lng * pts[j].lat
      a -= pts[j].lng * pts[i].lat
    }
    a = Math.abs(a) / 2
    const latDegToKm = 110.574
    const lngDegToKm = 111.32 * Math.cos((pts[0].lat * Math.PI) / 180)
    return Math.round(a * latDegToKm * lngDegToKm * 100) / 100
  }

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    // Click to add point
    map.on('click', (e: L.LeafletMouseEvent) => {
      setPoints(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }])
    })

    // Try geolocation
    map.locate({ setView: false, enableHighAccuracy: false, timeout: 5000 })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      polygonRef.current = null
      markersRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redraw polygon + markers when points change
  useEffect(() => {
    if (!mapRef.current) return

    // Remove old
    if (polygonRef.current) {
      mapRef.current.removeLayer(polygonRef.current)
      polygonRef.current = null
    }
    markersRef.current.forEach(m => mapRef.current?.removeLayer(m))
    markersRef.current = []

    if (points.length === 0) return

    // Add markers
    points.forEach((p, i) => {
      const marker = L.marker([p.lat, p.lng]).addTo(mapRef.current!)
      marker.bindTooltip(`${i + 1}`, { permanent: true, direction: 'top', className: 'polygon-vertex-label' })
      marker.on('click', () => {
        // Remove this vertex
        setPoints(prev => prev.filter((_, idx) => idx !== i))
      })
      markersRef.current.push(marker)
    })

    // Add polygon (closed if 3+ points)
    if (points.length >= 3) {
      polygonRef.current = L.polygon(
        points.map(p => [p.lat, p.lng]),
        { color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.25 }
      ).addTo(mapRef.current!) as any
    } else if (points.length >= 2) {
      polygonRef.current = L.polyline(
        points.map(p => [p.lat, p.lng]),
        { color: '#10b981', weight: 2, dashArray: '6 4' }
      ).addTo(mapRef.current!) as any
    }

    const a = calcArea(points)
    setArea(a)
    onChange?.(points, a)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points])

  // Try to use GPS
  const useGps = useCallback(() => {
    if (!mapRef.current) return
    mapRef.current.locate({ setView: true, enableHighAccuracy: true, timeout: 8000, maxZoom: 16 })
    mapRef.current.once('locationfound', (e: L.LocationEvent) => {
      setPoints(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }])
      toast('GPS point added')
    })
    mapRef.current.once('locationerror', () => {
      toast('Could not get GPS location')
    })
  }, [])

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={useGps} className="gap-1.5">
          <Crosshair className="w-3.5 h-3.5" /> Use GPS
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPoints(prev => prev.slice(0, -1))}
          disabled={points.length === 0}
          className="gap-1.5"
        >
          <MapPin className="w-3.5 h-3.5" /> Undo Last
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPoints([])}
          disabled={points.length === 0}
          className="gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </Button>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Ruler className="w-3.5 h-3.5" />
          <span className="font-mono">{points.length} pts · {area} ha</span>
        </div>
      </div>

      {/* Map */}
      <div
        ref={containerRef}
        className={cn('rounded-lg overflow-hidden border', className)}
        style={{ height, width: '100%' }}
      />

      <p className="text-xs text-muted-foreground">
        Click the map to add polygon vertices. Click a marker to remove that vertex. At least 3 points required to compute area.
      </p>
    </div>
  )
}

// Inline toast (sonner is overkill for a tiny inline confirmation)
function toast(msg: string) {
  if (typeof window !== 'undefined') {
    import('sonner').then(({ toast: t }) => t(msg))
  }
}
