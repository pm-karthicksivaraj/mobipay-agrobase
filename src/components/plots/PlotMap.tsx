'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

// ─── Color Schemes ─────────────────────────────────────────────────

const VERIFICATION_COLORS: Record<string, string> = {
  UNVERIFIED: '#9ca3af',
  GPS_VERIFIED: '#3b82f6',
  SATELLITE_VERIFIED: '#a855f7',
  FIELD_AUDITED: '#f59e0b',
  VERIFIED: '#22c55e',
}

const RISK_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  UNKNOWN: '#9ca3af',
}

// ─── Types ────────────────────────────────────────────────────────

interface PlotProperties {
  id: string
  plotCode: string
  name: string
  farmerName: string
  verificationStatus: string
  eudrRiskLevel: string
  areaHectares: number | null
}

interface PlotMapProps {
  onSelectPlot?: (plotId: string) => void
  className?: string
  height?: string
  colorMode?: 'verification' | 'risk'
}

const DEFAULT_CENTER: [number, number] = [1.3733, 32.2903]
const DEFAULT_ZOOM = 8

// ─── Component ────────────────────────────────────────────────────

export default function PlotMap({
  onSelectPlot,
  className,
  height = '500px',
  colorMode: initialColorMode = 'verification',
}: PlotMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [plotCount, setPlotCount] = useState(0)
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null)
  const [colorMode, setColorMode] = useState(initialColorMode)

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'topright' }).addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Fetch and render GeoJSON
  const loadGeoJson = useCallback(async () => {
    if (!mapRef.current) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/plots/geojson')
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)

      const data = await res.json()
      const features: any[] = data.features ?? []
      setPlotCount(features.length)

      if (features.length === 0) {
        setError('No plots with GPS boundaries found. Verify plots to enable map display.')
        setLoading(false)
        return
      }

      if (geoJsonLayerRef.current) {
        mapRef.current.removeLayer(geoJsonLayerRef.current)
      }

      const getColor = (props: PlotProperties) => {
        if (colorMode === 'risk') {
          return RISK_COLORS[props.eudrRiskLevel] ?? RISK_COLORS.UNKNOWN
        }
        return VERIFICATION_COLORS[props.verificationStatus] ?? VERIFICATION_COLORS.UNVERIFIED
      }

      const layer = L.geoJSON(features, {
        style: (feature) => {
          const props = (feature as any).properties as PlotProperties
          return {
            color: getColor(props),
            weight: selectedPlotId === props.id ? 3 : 2,
            opacity: selectedPlotId === props.id ? 1 : 0.8,
            fillColor: getColor(props),
            fillOpacity: selectedPlotId === props.id ? 0.4 : 0.2,
          }
        },
        onEachFeature: (feature, layer) => {
          const props = (feature as any).properties as PlotProperties

          const popupContent = `
            <div style="font-family: system-ui; min-width: 180px;">
              <strong style="font-size: 13px;">${props.plotCode}</strong><br/>
              <span style="color: #666; font-size: 12px;">${props.name}</span><br/>
              <span style="font-size: 12px;">${props.farmerName}</span><br/>
              <div style="margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;">
                <span style="background: ${VERIFICATION_COLORS[props.verificationStatus] ?? '#999'}22; color: ${VERIFICATION_COLORS[props.verificationStatus] ?? '#999'}; padding: 1px 6px; border-radius: 4px; font-size: 11px;">
                  ${props.verificationStatus.replace(/_/g, ' ')}
                </span>
                <span style="background: ${RISK_COLORS[props.eudrRiskLevel] ?? '#999'}22; color: ${RISK_COLORS[props.eudrRiskLevel] ?? '#999'}; padding: 1px 6px; border-radius: 4px; font-size: 11px;">
                  Risk: ${props.eudrRiskLevel}
                </span>
              </div>
              ${props.areaHectares ? `<div style="margin-top: 4px; font-size: 11px; color: #888;">${props.areaHectares.toFixed(2)} ha</div>` : ''}
            </div>
          `
          layer.bindPopup(popupContent)

          layer.on('mouseover', function (e: L.LeafletMouseEvent) {
            e.target.setStyle({ weight: 3, fillOpacity: 0.35 })
            e.target.bringToFront()
          })
          layer.on('mouseout', function (e: L.LeafletMouseEvent) {
            geoJsonLayerRef.current?.resetStyle(e.target)
          })
          layer.on('click', () => {
            setSelectedPlotId(props.id)
            onSelectPlot?.(props.id)
          })
        },
      })

      layer.addTo(mapRef.current)
      geoJsonLayerRef.current = layer

      const bounds = layer.getBounds()
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 })
      }

      setLoading(false)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }, [colorMode, selectedPlotId, onSelectPlot])

  useEffect(() => {
    const timer = setTimeout(loadGeoJson, 100)
    return () => clearTimeout(timer)
  }, [loadGeoJson])

  const handleColorModeChange = (mode: string) => {
    setColorMode(mode as 'verification' | 'risk')
  }

  return (
    <div className={cn('relative rounded-lg overflow-hidden border', className)}>
      {/* Map Controls Overlay */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
        <Select value={colorMode} onValueChange={handleColorModeChange}>
          <SelectTrigger className="w-[170px] h-8 text-xs bg-background/90 backdrop-blur-sm border shadow-sm">
            <Layers className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="verification">Verification Status</SelectItem>
            <SelectItem value="risk">EUDR Risk Level</SelectItem>
          </SelectContent>
        </Select>

        <div className="bg-background/90 backdrop-blur-sm border shadow-sm rounded-md px-2.5 py-1 text-xs">
          <span className="font-medium">{plotCount}</span>
          <span className="text-muted-foreground ml-1">plots</span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 z-[999] bg-background/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading plot boundaries...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="absolute inset-0 z-[999] bg-background/90 flex items-center justify-center">
          <div className="text-center max-w-sm px-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={loadGeoJson}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm border shadow-sm rounded-md p-2.5">
        <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
          {colorMode === 'verification' ? 'Verification' : 'EUDR Risk'}
        </p>
        <div className="space-y-1">
          {(colorMode === 'verification'
            ? [
                { key: 'VERIFIED', label: 'Verified' },
                { key: 'FIELD_AUDITED', label: 'Field Audited' },
                { key: 'SATELLITE_VERIFIED', label: 'Satellite' },
                { key: 'GPS_VERIFIED', label: 'GPS' },
                { key: 'UNVERIFIED', label: 'Unverified' },
              ]
            : [
                { key: 'LOW', label: 'Low Risk' },
                { key: 'MEDIUM', label: 'Medium Risk' },
                { key: 'HIGH', label: 'High Risk' },
                { key: 'UNKNOWN', label: 'Unknown' },
              ]
          ).map((item) => (
            <div key={item.key} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{
                  backgroundColor: colorMode === 'verification'
                    ? VERIFICATION_COLORS[item.key]
                    : RISK_COLORS[item.key],
                }}
              />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Mini Map for Plot Detail Panel ───────────────────────────────

interface PlotMiniMapProps {
  geoJson: string | null
  className?: string
}

export function PlotMiniMap({ geoJson, className }: PlotMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    if (!geoJson) return

    try {
      const parsed = JSON.parse(geoJson)
      const coords = parsed.geometry?.coordinates?.[0] ?? parsed.coordinates?.[0]
      if (!coords || coords.length < 3) return

      const points: [number, number][] = coords
        .filter((c: number[]) => c.length >= 2)
        .map((c: number[]) => [c[1], c[0]] as [number, number])

      const map = L.map(containerRef.current, {
        center: points[0],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      L.polygon(points, {
        color: '#22c55e',
        weight: 2,
        fillOpacity: 0.25,
      }).addTo(map)

      map.fitBounds(L.polygon(points as any).getBounds(), { padding: [10, 10] })
      mapRef.current = map
    } catch {
      // Invalid GeoJSON
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [geoJson])

  if (!geoJson) {
    return (
      <div className={cn('bg-muted/30 rounded-lg flex items-center justify-center text-xs text-muted-foreground', className)}>
        No GPS boundary available
      </div>
    )
  }

  return <div ref={containerRef} className={cn('rounded-lg overflow-hidden', className)} style={{ height: 200 }} />
}