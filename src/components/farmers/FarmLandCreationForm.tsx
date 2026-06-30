'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Save, Plus, Trash2, Ruler } from 'lucide-react'
import { toast } from 'sonner'

const COUNTRIES = ['Uganda', 'Ghana', 'Kenya']
const LAND_OWNERSHIP = ['Owned', 'Rent', 'Lease']
const TOPOLOGY = ['Valley', 'Plains', 'Plateaus']
const GRADIENTS = ['Up Land', 'Low Land']
const WATER_SOURCES = ['Well', 'Bore Well', 'Pump', 'River', 'Canal', 'Rainfed']
const POWER_SOURCES = ['Solar', 'Electricity', 'Fuel', 'Manual']
const FERTILITY = ['Good', 'Normal', 'Poor']
const APPROACH_ROADS = ['close main road', 'inner field', 'close main canal']
const IRRIGATION_SOURCES = ['Rainfed', 'Irrigated']
const IRRIGATION_TYPES = ['Drip', 'Canal', 'Sprinkler', 'Flood', 'Others']
const CONV_STATUS = ['IC-1', 'IC-2', 'IC-3', 'Organic', 'SRP']
const CERT_TYPES = ['NPOP', 'NOP', 'EU Organic', 'USDA Organic']
const SOIL_CRITERIA_TYPES = ['pH', 'Sulphur (S)', 'Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)', 'Organic Carbon']

interface FarmLandFormProps {
  farmerId: string
  onSaved?: (farm: any) => void
}

export function FarmLandCreationForm({ farmerId, onSaved }: FarmLandFormProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({ farmerId })
  const [polygonPoints, setPolygonPoints] = useState<{ lat: number; lng: number }[]>([])
  const [soilCriteriaList, setSoilCriteriaList] = useState<{ criteria: string; value: string }[]>([])

  const update = useCallback((field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const toggleArrayItem = (field: string, item: string) => {
    setForm(prev => {
      const arr = prev[field] || []
      return { ...prev, [field]: arr.includes(item) ? arr.filter((i: string) => i !== item) : [...arr, item] }
    })
  }

  // ─── Simple map click to add polygon points ───
  // Uses a static map image approach (no Leaflet dependency in this component)
  // The mobile app uses the full Leaflet.draw; web uses coordinate input + map preview
  const addManualPoint = () => {
    const lat = form.newPointLat
    const lng = form.newPointLng
    if (lat && lng) {
      setPolygonPoints(prev => [...prev, { lat: parseFloat(lat), lng: parseFloat(lng) }])
      update('newPointLat', '')
      update('newPointLng', '')
    }
  }

  const removePoint = (index: number) => {
    setPolygonPoints(prev => prev.filter((_, i) => i !== index))
  }

  // Auto-calculate area from polygon points (Shoelace formula)
  const calculatedArea = React.useMemo(() => {
    if (polygonPoints.length < 3) return 0
    let area = 0
    const n = polygonPoints.length
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      area += polygonPoints[i].lng * polygonPoints[j].lat
      area -= polygonPoints[j].lng * polygonPoints[i].lat
    }
    area = Math.abs(area) / 2
    const latDegToKm = 110.574
    const lngDegToKm = 111.32 * Math.cos((polygonPoints[0].lat * Math.PI) / 180)
    const areaKm2 = area * latDegToKm * lngDegToKm
    return Math.round(areaKm2 * 100 * 100) / 100 // hectares, 2 decimal places
  }, [polygonPoints])

  const addSoilCriteria = () => {
    setSoilCriteriaList(prev => [...prev, { criteria: '', value: '' }])
  }

  const save = async () => {
    if (!form.name) {
      toast.error('Farm/Plot name is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        farmerId,
        polygonPoints: polygonPoints.length >= 3 ? polygonPoints : undefined,
        sizeHectares: form.sizeHectares || calculatedArea || undefined,
        soilCriteria: soilCriteriaList.length > 0 ? soilCriteriaList : undefined,
      }
      const res = await fetch('/api/farm-lands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Farm land "${form.name}" created successfully!`)
        onSaved?.(data.farm)
      } else {
        toast.error(data.error || 'Failed to create farm land')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="basic">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="basic" className="text-xs gap-1.5"><MapPin className="w-3.5 h-3.5" /> Basic Info</TabsTrigger>
          <TabsTrigger value="polygon" className="text-xs gap-1.5"><Ruler className="w-3.5 h-3.5" /> Polygon & Area</TabsTrigger>
          <TabsTrigger value="soil" className="text-xs">Soil & Irrigation</TabsTrigger>
          <TabsTrigger value="labor" className="text-xs">Labor</TabsTrigger>
          <TabsTrigger value="conversion" className="text-xs">Conversion</TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs">Soil Analysis</TabsTrigger>
        </TabsList>

        {/* Basic Info */}
        <TabsContent value="basic" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Farmer</Label><Input value={farmerId} disabled className="text-xs" /></div>
              <div className="space-y-2"><Label>Field/Plot/Farm Name *</Label><Input value={form.name || ''} onChange={e => update('name', e.target.value)} placeholder="e.g. Kibale Plot 1" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Total Land Holding (ha)</Label><Input type="number" step="0.01" value={form.sizeHectares ?? ''} onChange={e => update('sizeHectares', e.target.value)} placeholder={calculatedArea ? `Auto: ${calculatedArea} ha` : 'Enter or draw polygon'} /></div>
              <div className="space-y-2"><Label>Land Ownership</Label><Select value={form.landOwnership || ''} onValueChange={v => update('landOwnership', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{LAND_OWNERSHIP.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Land Survey No</Label><Input value={form.landSurveyNo || ''} onChange={e => update('landSurveyNo', e.target.value)} /></div>
              <div className="space-y-2"><Label>Land Topology</Label><Select value={form.landTopology || ''} onValueChange={v => update('landTopology', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{TOPOLOGY.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Land Gradient</Label><div className="flex flex-wrap gap-2">{GRADIENTS.map(g => <Badge key={g} variant={form.landGradient?.includes(g) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleArrayItem('landGradient', g)}>{g}</Badge>)}</div></div>
            <div className="space-y-2"><Label>Approach Road</Label><div className="flex flex-wrap gap-2">{APPROACH_ROADS.map(r => <Badge key={r} variant={form.approachRoad?.includes(r) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleArrayItem('approachRoad', r)}>{r}</Badge>)}</div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Power Source</Label><Select value={form.powerSource || ''} onValueChange={v => update('powerSource', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{POWER_SOURCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Farm Photo URL</Label><Input value={form.farmPhotoUrl || ''} onChange={e => update('farmPhotoUrl', e.target.value)} /></div>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* Polygon & Area */}
        <TabsContent value="polygon" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-primary" /><span className="font-medium text-sm">Farm Land Plotting (GPS Polygon)</span></div>
            <p className="text-xs text-muted-foreground">Add GPS coordinates to define the farm boundary. At least 3 points required for area calculation. The mobile app supports map-based drawing; on web, enter coordinates manually or paste from GPS device.</p>

            {/* Point input */}
            <div className="flex gap-2 items-end">
              <div className="space-y-2 flex-1"><Label>Latitude</Label><Input type="number" step="any" value={form.newPointLat || ''} onChange={e => update('newPointLat', e.target.value)} placeholder="0.3476" /></div>
              <div className="space-y-2 flex-1"><Label>Longitude</Label><Input type="number" step="any" value={form.newPointLng || ''} onChange={e => update('newPointLng', e.target.value)} placeholder="32.5825" /></div>
              <Button onClick={addManualPoint} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Point</Button>
            </div>

            {/* Points list */}
            {polygonPoints.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Polygon Points ({polygonPoints.length})</Label>
                  <Button variant="ghost" size="sm" onClick={() => setPolygonPoints([])}><Trash2 className="w-3.5 h-3.5 mr-1" /> Clear All</Button>
                </div>
                {polygonPoints.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/40 text-xs">
                    <Badge variant="secondary" className="text-[10px]">{i + 1}</Badge>
                    <span className="font-mono">{p.lat.toFixed(6)}, {p.lng.toFixed(6)}</span>
                    <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={() => removePoint(i)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
            )}

            {/* Auto-calculated area */}
            {calculatedArea > 0 && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                    Auto-calculated area: {calculatedArea} hectares
                  </span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Calculated using the Shoelace formula from polygon points.</p>
              </div>
            )}

            {/* Map preview placeholder */}
            <div className="aspect-video rounded-lg bg-muted/40 border-2 border-dashed flex items-center justify-center">
              {polygonPoints.length >= 3 ? (
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">{polygonPoints.length}-point polygon</p>
                  <p className="text-xs text-muted-foreground">{calculatedArea} ha · Click "View on Map" in the plots module</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Add at least 3 GPS points to define the boundary</p>
                </div>
              )}
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* Soil & Irrigation */}
        <TabsContent value="soil" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Water Source</Label><Select value={form.waterSource || ''} onValueChange={v => update('waterSource', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{WATER_SOURCES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Soil Fertility</Label><Select value={form.soilFertility || ''} onValueChange={v => update('soilFertility', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{FERTILITY.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Irrigation Source</Label><div className="flex gap-2">{IRRIGATION_SOURCES.map(s => <Badge key={s} variant={form.irrigationSource?.includes(s) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleArrayItem('irrigationSource', s)}>{s}</Badge>)}</div></div>
            {form.irrigationSource?.includes('Irrigated') && (
              <div className="space-y-2"><Label>Irrigation Type</Label><Select value={form.irrigationType || ''} onValueChange={v => update('irrigationType', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{IRRIGATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* Labor */}
        <TabsContent value="labor" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>Full-time Workers</Label><Input type="number" value={form.fullTimeWorkers ?? ''} onChange={e => update('fullTimeWorkers', e.target.value)} /></div>
              <div className="space-y-2"><Label>Part-time Workers</Label><Input type="number" value={form.partTimeWorkers ?? ''} onChange={e => update('partTimeWorkers', e.target.value)} /></div>
              <div className="space-y-2"><Label>Seasonal Workers</Label><Input type="number" value={form.seasonalWorkers ?? ''} onChange={e => update('seasonalWorkers', e.target.value)} /></div>
              <div className="space-y-2"><Label>Family Workers</Label><Input type="number" value={form.familyWorkers ?? ''} onChange={e => update('familyWorkers', e.target.value)} /></div>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* Conversion */}
        <TabsContent value="conversion" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            <p className="text-xs text-muted-foreground">Show this section when farmer is certified.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Certification Type</Label><Select value={form.certType || ''} onValueChange={v => update('certType', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CERT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Conversion Status</Label><Select value={form.conversionStatus || ''} onValueChange={v => update('conversionStatus', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CONV_STATUS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Conversion Date</Label><Input type="date" value={form.conversionDate?.split('T')[0] || ''} onChange={e => update('conversionDate', e.target.value)} /></div>
              <div className="space-y-2"><Label>Inspector Name</Label><Input value={form.inspectorName || ''} onChange={e => update('inspectorName', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Last Chemical Application Date</Label><Input type="date" value={form.lastChemicalApplicationDate?.split('T')[0] || ''} onChange={e => update('lastChemicalApplicationDate', e.target.value)} /></div>
              <div className="space-y-2"><Label>Est. Yield (kg)</Label><Input type="number" value={form.estYieldKg ?? ''} onChange={e => update('estYieldKg', e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Remarks</Label><Input value={form.conversionRemarks || ''} onChange={e => update('conversionRemarks', e.target.value)} /></div>
          </CardContent></Card>
        </TabsContent>

        {/* Soil Analysis */}
        <TabsContent value="analysis" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Collection Date</Label><Input type="date" value={form.soilCollectionDate?.split('T')[0] || ''} onChange={e => update('soilCollectionDate', e.target.value)} /></div>
              <div className="space-y-2"><Label>Lab Testing Date</Label><Input type="date" value={form.soilLabTestingDate?.split('T')[0] || ''} onChange={e => update('soilLabTestingDate', e.target.value)} /></div>
              <div className="space-y-2"><Label>Result Date</Label><Input type="date" value={form.soilResultDate?.split('T')[0] || ''} onChange={e => update('soilResultDate', e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Samples Info</Label><Input value={form.soilSamplesInfo || ''} onChange={e => update('soilSamplesInfo', e.target.value)} placeholder="e.g. 3 samples from 2 ha area" /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Soil Criteria</Label>
                <Button variant="outline" size="sm" onClick={addSoilCriteria}><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
              </div>
              {soilCriteriaList.map((sc, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select value={sc.criteria} onValueChange={v => { const arr = [...soilCriteriaList]; arr[i].criteria = v; setSoilCriteriaList(arr) }}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Criteria" /></SelectTrigger>
                    <SelectContent>{SOIL_CRITERIA_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Value (e.g. 6.5, 120ppm)" value={sc.value} onChange={e => { const arr = [...soilCriteriaList]; arr[i].value = e.target.value; setSoilCriteriaList(arr) }} className="flex-1" />
                  <Button variant="ghost" size="sm" onClick={() => setSoilCriteriaList(prev => prev.filter((_, idx) => idx !== i))}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving} size="lg">{saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Create Farm Land</>}</Button>
      </div>
    </div>
  )
}
