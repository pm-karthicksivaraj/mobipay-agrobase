'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, Users, Sprout } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// @ts-expect-error - Icon.Default.mergeOptions override
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface MapDashboardProps {
  className?: string
  height?: string
}

export function MapDashboard({ className, height = '400px' }: MapDashboardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{ total: number; withGps: number; byDistrict: Record<string, number> }>({
    total: 0, withGps: 0, byDistrict: {},
  })

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [1.3733, 32.2903],
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    fetch('/api/farmers?limit=500')
      .then(r => r.json())
      .then(data => {
        const farmers = data.farmers || data.data || []
        const withGps = farmers.filter((f: any) => f.gpsLatitude && f.gpsLongitude)

        withGps.forEach((f: any) => {
          const marker = L.marker([f.gpsLatitude, f.gpsLongitude]).addTo(map)
          marker.bindPopup(`
            <div style="min-width: 160px;">
              <strong>${f.firstName} ${f.lastName}</strong><br/>
              ${f.villageName || f.district || '—'}<br/>
              ${f.mainCrops ? `<span style="font-size:11px;color:#666">Crops: ${f.mainCrops}</span>` : ''}
            </div>
          `)
        })

        if (withGps.length > 0) {
          const bounds = L.latLngBounds(withGps.map((f: any) => [f.gpsLatitude, f.gpsLongitude] as [number, number]))
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 })
        }

        const byDistrict: Record<string, number> = {}
        farmers.forEach((f: any) => {
          const d = f.district || 'Unknown'
          byDistrict[d] = (byDistrict[d] || 0) + 1
        })

        setStats({ total: farmers.length, withGps: withGps.length, byDistrict })
        setLoading(false)
      })
      .catch(() => setLoading(false))

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  const topDistricts = Object.entries(stats.byDistrict).sort(([, a], [, b]) => b - a).slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Farmer Distribution Map
              </CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `${stats.withGps} farmers with GPS coordinates`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={containerRef} className={cn('rounded-lg overflow-hidden border', className)} style={{ height, width: '100%' }} />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Top Districts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? <Skeleton className="h-32 w-full" /> : topDistricts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No district data</p>
            ) : topDistricts.map(([district, count], i) => (
              <div key={district} className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] w-6 justify-center">{i + 1}</Badge>
                <span className="text-sm flex-1 truncate">{district}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(count / stats.total) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
