'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  Search, Plus, Eye, X, MapPin, Ruler, Sprout, Layers, Table as TableIcon,
  ArrowLeft, Loader2, Map as MapIcon, Crosshair, Trash2, Save, Calendar,
  Leaf, Droplets, Users as UsersIcon, FlaskConical, ShieldCheck
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { useAppStore } from '@/lib/store'

const PolygonMap = dynamic(() => import('@/components/farmers/PolygonMap'), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border bg-muted/30 flex items-center justify-center" style={{ height: 420 }}>
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

// Lightweight farm map (read-only) for the map tab
const FarmMapReadOnly = dynamic(() => import('@/components/farmers/FarmMapReadOnly'), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border bg-muted/30 flex items-center justify-center" style={{ height: 500 }}>
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

interface FarmLand {
  id: string
  name: string
  sizeHectares: number | null
  latitude: number | null
  longitude: number | null
  landOwnership: string | null
  landSurveyNo?: string | null
  waterSource: string | null
  soilFertility: string | null
  landTopology: string | null
  powerSource: string | null
  irrigationType: string | null
  certType: string | null
  conversionStatus: string | null
  fullTimeWorkers: number | null
  partTimeWorkers: number | null
  seasonalWorkers: number | null
  familyWorkers: number | null
  createdAt: string
  farmer?: { id: string; firstName: string; lastName: string; farmerCode?: string | null }
  polygonPoints?: Array<{ id: string; latitude: number; longitude: number; pointOrder: number; altitude?: number | null }>
  _count?: { cultivations: number }
  cultivations?: Array<{ id: string; cropName: string; status: string; cultivationAreaHa: number | null }>
}

const LAND_OWNERSHIP = ['Owned', 'Rent', 'Lease']
const TOPOLOGY = ['Valley', 'Plains', 'Plateaus']
const WATER_SOURCES = ['Well', 'Bore Well', 'Pump', 'River', 'Canal', 'Rainfed']
const POWER_SOURCES = ['Solar', 'Electricity', 'Fuel', 'Manual']
const FERTILITY = ['Good', 'Normal', 'Poor']
const IRRIGATION_TYPES = ['Drip', 'Canal', 'Sprinkler', 'Flood', 'Others']
const CONV_STATUS = ['IC-1', 'IC-2', 'IC-3', 'Organic', 'SRP']
const CERT_TYPES = ['NPOP', 'NOP', 'EU Organic', 'USDA Organic']

export default function FarmLandsView() {
  const { selectedFarmerId, setSelectedFarmerId } = useAppStore()
  const [farms, setFarms] = useState<FarmLand[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedFarm, setSelectedFarm] = useState<FarmLand | null>(null)
  const [activeTab, setActiveTab] = useState<'table' | 'map'>('table')
  const [filterFarmer, setFilterFarmer] = useState<string>(selectedFarmerId || '')

  const fetchFarms = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterFarmer) params.set('farmerId', filterFarmer)
      const res = await fetch(`/api/farm-lands?${params}`)
      const data = await res.json()
      setFarms(data.farms || [])
    } catch (e) {
      console.error(e)
      toast.error('Failed to load farm lands')
    } finally {
      setLoading(false)
    }
  }, [filterFarmer])

  useEffect(() => { fetchFarms() }, [fetchFarms])

  const filtered = farms.filter(f => {
    if (!search) return true
    const farmerName = f.farmer ? `${f.farmer.firstName} ${f.farmer.lastName}` : ''
    return (
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      farmerName.toLowerCase().includes(search.toLowerCase()) ||
      (f.landOwnership || '').toLowerCase().includes(search.toLowerCase())
    )
  })

  const totalArea = farms.reduce((s, f) => s + (f.sizeHectares || 0), 0)
  const withPolygon = farms.filter(f => (f.polygonPoints?.length ?? 0) >= 3).length
  const withCultivations = farms.filter(f => (f._count?.cultivations || 0) > 0).length

  if (selectedFarm) {
    return <FarmLandDetail farm={selectedFarm} onBack={() => setSelectedFarm(null)} />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Farm Land Registry</h3>
          <p className="text-sm text-muted-foreground">
            {farms.length} farm lands · {totalArea.toFixed(2)} ha total · {withPolygon} with GPS polygon
          </p>
        </div>
        <div className="flex gap-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'table' | 'map')}>
            <TabsList className="grid grid-cols-2 h-9">
              <TabsTrigger value="table" className="text-xs gap-1.5"><TableIcon className="w-3.5 h-3.5" /> Table</TabsTrigger>
              <TabsTrigger value="map" className="text-xs gap-1.5"><MapIcon className="w-3.5 h-3.5" /> Map</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Register Farm Land
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"><Layers className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Lands</p><p className="text-lg font-bold">{farms.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center"><Ruler className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Area</p><p className="text-lg font-bold">{totalArea.toFixed(2)} ha</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center"><MapPin className="w-5 h-5 text-purple-600" /></div>
          <div><p className="text-xs text-muted-foreground">With GPS Polygon</p><p className="text-lg font-bold">{withPolygon}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center"><Sprout className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Has Cultivations</p><p className="text-lg font-bold">{withCultivations}</p></div>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by farm name, farmer, ownership..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filterFarmer && (
          <Button variant="ghost" size="sm" onClick={() => setFilterFarmer('')} className="gap-1">
            <X className="w-3.5 h-3.5" /> Clear farmer filter
          </Button>
        )}
      </div>

      {/* Table or Map */}
      {activeTab === 'table' ? (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No farm lands registered</p>
                <p className="text-sm mt-1">Click "Register Farm Land" to add the first one</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farm Name</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead className="hidden md:table-cell">Area (ha)</TableHead>
                    <TableHead className="hidden lg:table-cell">Ownership</TableHead>
                    <TableHead className="hidden lg:table-cell">Crops</TableHead>
                    <TableHead className="hidden xl:table-cell">GPS</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(f => (
                    <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedFarm(f)}>
                      <TableCell>
                        <p className="font-medium text-sm">{f.name}</p>
                        {f.landTopology && <p className="text-[10px] text-muted-foreground">{f.landTopology}</p>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {f.farmer ? `${f.farmer.firstName} ${f.farmer.lastName}` : '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{f.sizeHectares?.toFixed(2) ?? '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{f.landOwnership || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {f._count?.cultivations ? `${f._count.cultivations} crop(s)` : '—'}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {(f.polygonPoints?.length ?? 0) >= 3 ? (
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-[10px]">
                            <MapPin className="w-3 h-3 mr-1" /> {f.polygonPoints!.length} pts
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">No polygon</span>}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedFarm(f) }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapIcon className="w-4 h-4" /> Farm Lands Map View
            </CardTitle>
            <CardDescription>{farms.length} farm lands · {withPolygon} with GPS polygons</CardDescription>
          </CardHeader>
          <CardContent>
            <FarmMapReadOnly farms={farms} onSelect={(id) => {
              const f = farms.find(x => x.id === id)
              if (f) setSelectedFarm(f)
            }} />
          </CardContent>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Farm Land</DialogTitle>
            <CardDescription>Create a farm land with GPS polygon, ownership, irrigation, soil, labor and conversion details.</CardDescription>
          </DialogHeader>
          <FarmLandCreateForm
            farmerId={filterFarmer}
            onSaved={() => { setShowAdd(false); fetchFarms() }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Create Form (uses PolygonMap) ───────────────────────────────

function FarmLandCreateForm({ farmerId: preselectFarmerId, onSaved }: { farmerId?: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [farmers, setFarmers] = useState<Array<{ id: string; firstName: string; lastName: string; farmerCode?: string | null }>>([])
  const [form, setForm] = useState<Record<string, any>>({})
  const [polygonPoints, setPolygonPoints] = useState<Array<{ lat: number; lng: number }>>([])
  const [polygonArea, setPolygonArea] = useState(0)

  useEffect(() => {
    fetch('/api/farmers?limit=200')
      .then(r => r.json())
      .then(data => setFarmers(data.farmers || data.data || []))
      .catch(() => {})
  }, [])

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.farmerId) { toast.error('Please select a farmer'); return }
    if (!form.name) { toast.error('Farm/Plot name is required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        farmerId: form.farmerId,
        polygonPoints: polygonPoints.length >= 3 ? polygonPoints : undefined,
        sizeHectares: form.sizeHectares || (polygonArea > 0 ? polygonArea : undefined),
      }
      const res = await fetch('/api/farm-lands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Farm land "${form.name}" created successfully!`)
        onSaved()
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs defaultValue="basic">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="basic" className="text-xs gap-1.5"><MapPin className="w-3.5 h-3.5" /> Basic</TabsTrigger>
          <TabsTrigger value="polygon" className="text-xs gap-1.5"><Ruler className="w-3.5 h-3.5" /> Polygon</TabsTrigger>
          <TabsTrigger value="soil" className="text-xs">Soil &amp; Water</TabsTrigger>
          <TabsTrigger value="labor" className="text-xs">Labor</TabsTrigger>
          <TabsTrigger value="conversion" className="text-xs">Conversion</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Farmer *</Label>
              <Select value={form.farmerId || preselectFarmerId || ''} onValueChange={v => update('farmerId', v)}>
                <SelectTrigger><SelectValue placeholder="Select farmer" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {farmers.map(f => <SelectItem key={f.id} value={f.id}>{f.firstName} {f.lastName} {f.farmerCode ? `(${f.farmerCode})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Field/Plot/Farm Name *</Label>
              <Input value={form.name || ''} onChange={e => update('name', e.target.value)} placeholder="e.g. Kibale Plot 1" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Total Area (ha)</Label>
              <Input type="number" step="0.01" value={form.sizeHectares ?? ''} onChange={e => update('sizeHectares', e.target.value)} placeholder={polygonArea ? `Auto: ${polygonArea}` : 'Enter or draw polygon'} />
            </div>
            <div className="space-y-1.5">
              <Label>Land Ownership</Label>
              <Select value={form.landOwnership || ''} onValueChange={v => update('landOwnership', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{LAND_OWNERSHIP.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Land Topology</Label>
              <Select value={form.landTopology || ''} onValueChange={v => update('landTopology', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{TOPOLOGY.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Land Survey No</Label>
              <Input value={form.landSurveyNo || ''} onChange={e => update('landSurveyNo', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Power Source</Label>
              <Select value={form.powerSource || ''} onValueChange={v => update('powerSource', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{POWER_SOURCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Farm Photo URL</Label>
              <Input value={form.farmPhotoUrl || ''} onChange={e => update('farmPhotoUrl', e.target.value)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="polygon" className="mt-4">
          <PolygonMap
            onChange={(pts, a) => { setPolygonPoints(pts); setPolygonArea(a) }}
          />
          {polygonArea > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                Auto-calculated area: <strong>{polygonArea} hectares</strong> from {polygonPoints.length} polygon points
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="soil" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Water Source</Label>
              <Select value={form.waterSource || ''} onValueChange={v => update('waterSource', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{WATER_SOURCES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Soil Fertility</Label>
              <Select value={form.soilFertility || ''} onValueChange={v => update('soilFertility', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{FERTILITY.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Irrigation Type</Label>
            <Select value={form.irrigationType || ''} onValueChange={v => update('irrigationType', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{IRRIGATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="labor" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5"><Label>Full-time Workers</Label><Input type="number" value={form.fullTimeWorkers ?? ''} onChange={e => update('fullTimeWorkers', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Part-time Workers</Label><Input type="number" value={form.partTimeWorkers ?? ''} onChange={e => update('partTimeWorkers', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Seasonal Workers</Label><Input type="number" value={form.seasonalWorkers ?? ''} onChange={e => update('seasonalWorkers', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Family Workers</Label><Input type="number" value={form.familyWorkers ?? ''} onChange={e => update('familyWorkers', e.target.value)} /></div>
          </div>
        </TabsContent>

        <TabsContent value="conversion" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Certification Type</Label>
              <Select value={form.certType || ''} onValueChange={v => update('certType', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{CERT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Conversion Status</Label>
              <Select value={form.conversionStatus || ''} onValueChange={v => update('conversionStatus', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{CONV_STATUS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Conversion Date</Label><Input type="date" value={form.conversionDate?.split('T')[0] || ''} onChange={e => update('conversionDate', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Inspector Name</Label><Input value={form.inspectorName || ''} onChange={e => update('inspectorName', e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Remarks</Label><Textarea value={form.conversionRemarks || ''} onChange={e => update('conversionRemarks', e.target.value)} /></div>
        </TabsContent>
      </Tabs>

      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Create Farm Land
        </Button>
      </DialogFooter>
    </form>
  )
}

// ─── Farm Land Detail ────────────────────────────────────────────

function FarmLandDetail({ farm, onBack }: { farm: FarmLand; onBack: () => void }) {
  const [cultivations, setCultivations] = useState<any[]>([])
  const [loadingCult, setLoadingCult] = useState(false)

  useEffect(() => {
    setLoadingCult(true)
    fetch(`/api/cultivations?farmId=${farm.id}`)
      .then(r => r.json())
      .then(data => setCultivations(data.cultivations || []))
      .catch(() => {})
      .finally(() => setLoadingCult(false))
  }, [farm.id])

  const polygonPoints = farm.polygonPoints || []
  const hasPolygon = polygonPoints.length >= 3

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Farm Lands
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
              <Layers className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{farm.name}</h2>
              <p className="text-sm text-muted-foreground">
                {farm.farmer ? `Farmer: ${farm.farmer.firstName} ${farm.farmer.lastName}` : 'Unassigned'} · Created {new Date(farm.createdAt).toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {farm.landOwnership && <Badge variant="outline">{farm.landOwnership}</Badge>}
                {farm.landTopology && <Badge variant="outline">{farm.landTopology}</Badge>}
                {farm.soilFertility && <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/30">Fertility: {farm.soilFertility}</Badge>}
                {farm.certType && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{farm.certType}</Badge>}
                {farm.conversionStatus && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{farm.conversionStatus}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><Ruler className="w-5 h-5 mx-auto text-blue-600 mb-1" /><p className="text-xs text-muted-foreground">Total Area</p><p className="text-lg font-bold">{farm.sizeHectares?.toFixed(2) ?? '—'} ha</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Sprout className="w-5 h-5 mx-auto text-emerald-600 mb-1" /><p className="text-xs text-muted-foreground">Cultivations</p><p className="text-lg font-bold">{cultivations.length}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><MapPin className="w-5 h-5 mx-auto text-purple-600 mb-1" /><p className="text-xs text-muted-foreground">GPS Points</p><p className="text-lg font-bold">{polygonPoints.length}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><UsersIcon className="w-5 h-5 mx-auto text-amber-600 mb-1" /><p className="text-xs text-muted-foreground">Total Workers</p><p className="text-lg font-bold">{(farm.fullTimeWorkers || 0) + (farm.partTimeWorkers || 0) + (farm.seasonalWorkers || 0) + (farm.familyWorkers || 0)}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Map */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><MapIcon className="w-4 h-4" /> Farm Boundary</CardTitle></CardHeader>
          <CardContent>
            {hasPolygon ? (
              <FarmMapReadOnly farms={[farm]} height="300px" />
            ) : (
              <div className="aspect-video rounded-lg bg-muted/30 border-2 border-dashed flex items-center justify-center text-sm text-muted-foreground">
                <div className="text-center"><MapPin className="w-8 h-8 mx-auto mb-2" />No GPS polygon defined</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Soil & Water */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FlaskConical className="w-4 h-4" /> Soil &amp; Water</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Water Source" value={farm.waterSource} />
            <DetailRow label="Soil Fertility" value={farm.soilFertility} />
            <DetailRow label="Irrigation Type" value={farm.irrigationType} />
            <DetailRow label="Power Source" value={farm.powerSource} />
            <DetailRow label="Land Survey No" value={farm.landSurveyNo ?? undefined} />
          </CardContent>
        </Card>
      </div>

      {/* Cultivations on this farm */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sprout className="w-4 h-4" /> Cultivations on this Farm</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loadingCult ? (
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
          ) : cultivations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No cultivations registered on this farm yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crop</TableHead>
                  <TableHead>Variety</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Area (ha)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cultivations.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.cropName}</TableCell>
                    <TableCell className="text-sm">{c.variety || '—'}</TableCell>
                    <TableCell className="text-sm">{c.season || '—'}</TableCell>
                    <TableCell className="text-sm">{c.cultivationAreaHa?.toFixed(2) ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DetailRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground flex items-center gap-1.5">{icon}{label}</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  )
}
