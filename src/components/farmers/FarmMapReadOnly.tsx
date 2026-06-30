'use client'

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// @ts-expect-error - Icon.Default.mergeOptions override
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface FarmPoint { lat: number; lng: number; altitude?: number | null }
interface Farm {
  id: string
  name: string
  sizeHectares?: number | null
  latitude?: number | null
  longitude?: number | null
  landOwnership?: string | null
  farmer?: { id: string; firstName: string; lastName: string }
  polygonPoints?: Array<{ latitude: number; longitude: number; pointOrder: number }>
}

interface FarmMapReadOnlyProps {
  farms: Farm[]
  onSelect?: (id: string) => void
  height?: string
  className?: string
}

export default function FarmMapReadOnly({ farms, onSelect, height = '500px', className }: FarmMapReadOnlyProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const map = L.map(containerRef.current, {
      center: [0.3476, 32.5825],
      zoom: 8,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    const bounds = L.latLngBounds([])
    let hasValid = false

    farms.forEach(f => {
      const pts = (f.polygonPoints || [])
        .slice()
        .sort((a, b) => a.pointOrder - b.pointOrder)
        .map(p => [p.latitude, p.longitude] as [number, number])

      if (pts.length >= 3) {
        const poly = L.polygon(pts, {
          color: '#10b981',
          weight: 2,
          fillColor: '#10b981',
          fillOpacity: 0.25,
        }).addTo(map)

        const center = poly.getBounds().getCenter()
        const farmerName = f.farmer ? `${f.farmer.firstName} ${f.farmer.lastName}` : 'Unknown'
        const area = f.sizeHectares ? `${f.sizeHectares.toFixed(2)} ha` : ''
        poly.bindPopup(`
          <div style="min-width:180px">
            <strong>${f.name}</strong><br/>
            <span style="color:#666;font-size:12px">${farmerName}</span><br/>
            ${area ? `<span style="font-size:12px;color:#888">${area}</span><br/>` : ''}
            ${f.landOwnership ? `<span style="font-size:11px">${f.landOwnership}</span>` : ''}
          </div>
        `)
        if (onSelect) poly.on('click', () => onSelect(f.id))

        L.marker(center).addTo(map).bindTooltip(f.name, { permanent: false })

        pts.forEach(p => bounds.extend(p))
        hasValid = true
      } else if (f.latitude && f.longitude) {
        const m = L.marker([f.latitude, f.longitude]).addTo(map)
        const farmerName = f.farmer ? `${f.farmer.firstName} ${f.farmer.lastName}` : 'Unknown'
        m.bindPopup(`
          <div>
            <strong>${f.name}</strong><br/>
            <span style="color:#666;font-size:12px">${farmerName}</span>
          </div>
        `)
        if (onSelect) m.on('click', () => onSelect(f.id))
        bounds.extend([f.latitude, f.longitude])
        hasValid = true
      }
    })

    if (hasValid && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 })
    }

    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [farms, onSelect])

  return (
    <div
      ref={containerRef}
      className={cn('rounded-lg overflow-hidden border', className)}
      style={{ height, width: '100%' }}
    />
  )
}
