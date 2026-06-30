'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Search, Plus, Eye, X, Sprout, Calendar, Ruler, DollarSign, ArrowLeft,
  Loader2, Save, FlaskConical, Leaf, Layers, MapPin
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
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface Cultivation {
  id: string
  cropName: string
  variety?: string | null
  season?: string | null
  sowingDate?: string | null
  estimatedYield?: number | null
  actualYield?: number | null
  status: string
  cropCategory?: string | null
  cultivationAreaHa?: number | null
  seedSource?: string | null
  isSeedTreated?: boolean
  seedType?: string | null
  seedQuantity?: number | null
  seedPrice?: number | null
  seedCost?: number | null
  sowingType?: string | null
  sowingChargesBy?: string | null
  sowingCharges?: number | null
  sowingCost?: number | null
  createdAt: string
  farm?: { id: string; name: string; sizeHectares?: number | null; farmer?: { id: string; firstName: string; lastName: string } }
}

const CROP_CATEGORIES = ['Main Crop', 'Inter Crop', 'Border Crop']
const SEASONS = ['Spring 2026', 'Summer 2026', 'Autumn 2026', 'Winter 2025', 'Wet 2026', 'Dry 2026']
const SOWING_TYPES = ['Row sowing', 'Hand sowing', 'Drone sowing', 'Transplanting', 'Re-planting']
const SEED_SOURCES = ['Seed Company', 'Agent', 'Self-save']
const SEED_TYPES = ['Certified 1', 'Certified 2', 'Self-save', 'Other']

const statusColor: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  HARVESTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function CultivationsView() {
  const [cultivations, setCultivations] = useState<Cultivation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Cultivation | null>(null)

  const fetchCultivations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cultivations')
      const data = await res.json()
      setCultivations(data.cultivations || [])
    } catch (e) {
      console.error(e)
      toast.error('Failed to load cultivations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCultivations() }, [fetchCultivations])

  const filtered = cultivations.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false
    if (!search) return true
    const farmerName = c.farm?.farmer ? `${c.farm.farmer.firstName} ${c.farm.farmer.lastName}` : ''
    return (
      c.cropName.toLowerCase().includes(search.toLowerCase()) ||
      (c.variety || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.farm?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      farmerName.toLowerCase().includes(search.toLowerCase())
    )
  })

  const stats = {
    total: cultivations.length,
    active: cultivations.filter(c => c.status === 'ACTIVE').length,
    harvested: cultivations.filter(c => c.status === 'HARVESTED').length,
    totalArea: cultivations.reduce((s, c) => s + (c.cultivationAreaHa || 0), 0),
    totalSeedCost: cultivations.reduce((s, c) => s + (c.seedCost || 0), 0),
    totalSowingCost: cultivations.reduce((s, c) => s + (c.sowingCost || 0), 0),
  }

  if (selected) {
    return <CultivationDetail cultivation={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Cultivation Registry</h3>
          <p className="text-sm text-muted-foreground">{cultivations.length} cultivations · {stats.totalArea.toFixed(2)} ha · {stats.active} active</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="w-4 h-4" /> Add Cultivation</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"><Sprout className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Total Cultivations</p><p className="text-lg font-bold">{stats.total}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center"><Ruler className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">Cultivated Area</p><p className="text-lg font-bold">{stats.totalArea.toFixed(2)} ha</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center"><DollarSign className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-muted-foreground">Seed Cost Total</p><p className="text-lg font-bold">UGX {(stats.totalSeedCost / 1000).toFixed(0)}K</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center"><Calendar className="w-5 h-5 text-purple-600" /></div><div><p className="text-xs text-muted-foreground">Sowing Cost Total</p><p className="text-lg font-bold">UGX {(stats.totalSowingCost / 1000).toFixed(0)}K</p></div></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by crop, variety, farm, or farmer..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="HARVESTED">Harvested</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
        {(search || statusFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('') }} className="gap-1"><X className="w-3.5 h-3.5" /> Clear</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sprout className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No cultivations found</p>
              <p className="text-sm mt-1">Add a cultivation to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crop</TableHead>
                  <TableHead>Farm / Farmer</TableHead>
                  <TableHead className="hidden md:table-cell">Season</TableHead>
                  <TableHead className="hidden lg:table-cell">Area (ha)</TableHead>
                  <TableHead className="hidden xl:table-cell">Seed Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(c)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"><Sprout className="w-3.5 h-3.5 text-emerald-600" /></div>
                        <div>
                          <p className="font-medium text-sm">{c.cropName}</p>
                          {c.variety && <p className="text-[10px] text-muted-foreground">{c.variety}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{c.farm?.name || '—'}</p>
                      <p className="text-[10px] text-muted-foreground">{c.farm?.farmer ? `${c.farm.farmer.firstName} ${c.farm.farmer.lastName}` : ''}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{c.season || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{c.cultivationAreaHa?.toFixed(2) ?? '—'}</TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">{c.seedCost ? `UGX ${c.seedCost.toLocaleString()}` : '—'}</TableCell>
                    <TableCell><Badge className={cn('text-[10px]', statusColor[c.status] || '')}>{c.status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setSelected(c) }}><Eye className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Cultivation</DialogTitle></DialogHeader>
          <CultivationCreateForm onSaved={() => { setShowAdd(false); fetchCultivations() }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CultivationCreateForm({ onSaved }: { onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [farms, setFarms] = useState<Array<{ id: string; name: string; farmer?: { firstName: string; lastName: string } }>>([])
  const [form, setForm] = useState<Record<string, any>>({})

  useEffect(() => {
    fetch('/api/farm-lands')
      .then(r => r.json())
      .then(data => setFarms(data.farms || []))
      .catch(() => {})
  }, [])

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  // Auto-calc seed cost preview
  const qty = parseFloat(form.seedQuantity) || 0
  const price = parseFloat(form.seedPrice) || 0
  const seedCostPreview = qty * price
  const areaHa = parseFloat(form.cultivationAreaHa) || 0
  const charges = parseFloat(form.sowingCharges) || 0
  const sowingCostPreview = form.sowingChargesBy === 'hectare' ? areaHa * charges : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.farmId) { toast.error('Select a farm land'); return }
    if (!form.cropName) { toast.error('Crop name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/cultivations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Cultivation of ${form.cropName} created!`)
        onSaved()
      } else {
        toast.error(data.error || 'Failed to create cultivation')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Farm Land *</Label>
          <Select value={form.farmId || ''} onValueChange={v => update('farmId', v)}>
            <SelectTrigger><SelectValue placeholder="Select farm" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {farms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}{f.farmer ? ` — ${f.farmer.firstName} ${f.farmer.lastName}` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Crop Name *</Label><Input value={form.cropName || ''} onChange={e => update('cropName', e.target.value)} placeholder="e.g. Coffee Arabica" /></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1.5"><Label>Variety</Label><Input value={form.variety || ''} onChange={e => update('variety', e.target.value)} placeholder="e.g. SL28" /></div>
        <div className="space-y-1.5"><Label>Season</Label>
          <Select value={form.season || ''} onValueChange={v => update('season', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{SEASONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Category</Label>
          <Select value={form.cropCategory || ''} onValueChange={v => update('cropCategory', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{CROP_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Sowing Date</Label><Input type="date" value={form.sowingDate?.split('T')[0] || ''} onChange={e => update('sowingDate', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1.5"><Label>Cultivation Area (ha)</Label><Input type="number" step="0.01" value={form.cultivationAreaHa ?? ''} onChange={e => update('cultivationAreaHa', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Estimated Yield (kg)</Label><Input type="number" value={form.estimatedYield ?? ''} onChange={e => update('estimatedYield', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Sowing Type</Label>
          <Select value={form.sowingType || ''} onValueChange={v => update('sowingType', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{SOWING_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Separator />
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seed Information</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1.5"><Label>Seed Source</Label>
          <Select value={form.seedSource || ''} onValueChange={v => update('seedSource', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{SEED_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Seed Type</Label>
          <Select value={form.seedType || ''} onValueChange={v => update('seedType', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{SEED_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Seed Quantity (kg)</Label><Input type="number" step="0.01" value={form.seedQuantity ?? ''} onChange={e => update('seedQuantity', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Seed Price (per kg)</Label><Input type="number" step="0.01" value={form.seedPrice ?? ''} onChange={e => update('seedPrice', e.target.value)} /></div>
      </div>
      {seedCostPreview > 0 && (
        <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs">
          <span className="text-muted-foreground">Auto-calculated seed cost:</span>{' '}
          <strong className="text-emerald-700 dark:text-emerald-300">UGX {seedCostPreview.toLocaleString()}</strong>{' '}
          <span className="text-muted-foreground">({qty} kg × UGX {price})</span>
        </div>
      )}
      <Separator />
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sowing Cost</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1.5"><Label>Sowing Charges By</Label>
          <Select value={form.sowingChargesBy || ''} onValueChange={v => update('sowingChargesBy', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="hectare">Hectare</SelectItem><SelectItem value="hour">Hour</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Sowing Charges</Label><Input type="number" step="0.01" value={form.sowingCharges ?? ''} onChange={e => update('sowingCharges', e.target.value)} /></div>
        {form.sowingChargesBy === 'hour' && <div className="space-y-1.5"><Label>Sowing Hours</Label><Input type="number" step="0.01" value={form.sowingHours ?? ''} onChange={e => update('sowingHours', e.target.value)} /></div>}
      </div>
      {sowingCostPreview > 0 && (
        <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs">
          <span className="text-muted-foreground">Auto-calculated sowing cost:</span>{' '}
          <strong className="text-purple-700 dark:text-purple-300">UGX {sowingCostPreview.toLocaleString()}</strong>{' '}
          <span className="text-muted-foreground">({areaHa} ha × UGX {charges})</span>
        </div>
      )}
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Create Cultivation</Button>
      </DialogFooter>
    </form>
  )
}

function CultivationDetail({ cultivation, onBack }: { cultivation: Cultivation; onBack: () => void }) {
  const totalCost = (cultivation.seedCost || 0) + (cultivation.sowingCost || 0)

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back to Cultivations</Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0"><Sprout className="w-7 h-7 text-emerald-600" /></div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{cultivation.cropName}{cultivation.variety ? ` — ${cultivation.variety}` : ''}</h2>
              <p className="text-sm text-muted-foreground">
                {cultivation.farm?.name ? `Farm: ${cultivation.farm.name}` : ''}
                {cultivation.farm?.farmer ? ` · Farmer: ${cultivation.farm.farmer.firstName} ${cultivation.farm.farmer.lastName}` : ''}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{cultivation.season || 'No season'}</Badge>
                {cultivation.cropCategory && <Badge variant="outline">{cultivation.cropCategory}</Badge>}
                <Badge className={cn('text-[10px]', statusColor[cultivation.status] || '')}>{cultivation.status}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><Ruler className="w-5 h-5 mx-auto text-blue-600 mb-1" /><p className="text-xs text-muted-foreground">Area</p><p className="text-lg font-bold">{cultivation.cultivationAreaHa?.toFixed(2) ?? '—'} ha</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Calendar className="w-5 h-5 mx-auto text-amber-600 mb-1" /><p className="text-xs text-muted-foreground">Sowing</p><p className="text-sm font-bold">{cultivation.sowingDate ? new Date(cultivation.sowingDate).toLocaleDateString() : '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><DollarSign className="w-5 h-5 mx-auto text-emerald-600 mb-1" /><p className="text-xs text-muted-foreground">Seed Cost</p><p className="text-sm font-bold">{cultivation.seedCost ? `UGX ${cultivation.seedCost.toLocaleString()}` : '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><DollarSign className="w-5 h-5 mx-auto text-purple-600 mb-1" /><p className="text-xs text-muted-foreground">Sowing Cost</p><p className="text-sm font-bold">{cultivation.sowingCost ? `UGX ${cultivation.sowingCost.toLocaleString()}` : '—'}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FlaskConical className="w-4 h-4" /> Seed Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Seed Source" value={cultivation.seedSource} />
            <DetailRow label="Seed Type" value={cultivation.seedType} />
            <DetailRow label="Seed Treated" value={cultivation.isSeedTreated ? 'Yes' : 'No'} />
            <DetailRow label="Seed Quantity" value={cultivation.seedQuantity ? `${cultivation.seedQuantity} kg` : undefined} />
            <DetailRow label="Seed Price" value={cultivation.seedPrice ? `UGX ${cultivation.seedPrice}/kg` : undefined} />
            <DetailRow label="Seed Cost (auto)" value={cultivation.seedCost ? `UGX ${cultivation.seedCost.toLocaleString()}` : undefined} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4" /> Sowing Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Sowing Type" value={cultivation.sowingType} />
            <DetailRow label="Charges By" value={cultivation.sowingChargesBy} />
            <DetailRow label="Sowing Charges" value={cultivation.sowingCharges ? `UGX ${cultivation.sowingCharges}` : undefined} />
            <DetailRow label="Sowing Cost (auto)" value={cultivation.sowingCost ? `UGX ${cultivation.sowingCost.toLocaleString()}` : undefined} />
            <Separator />
            <DetailRow label="Estimated Yield" value={cultivation.estimatedYield ? `${cultivation.estimatedYield} kg` : undefined} />
            <DetailRow label="Actual Yield" value={cultivation.actualYield ? `${cultivation.actualYield} kg` : undefined} />
          </CardContent>
        </Card>
      </div>

      {/* Cost of Cultivation summary */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4" /> Cost of Cultivation Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs text-muted-foreground">Seed Cost</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">UGX {(cultivation.seedCost || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
              <p className="text-xs text-muted-foreground">Sowing Cost</p>
              <p className="text-lg font-bold text-purple-700 dark:text-purple-300">UGX {(cultivation.sowingCost || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">UGX {totalCost.toLocaleString()}</p>
            </div>
          </div>
          {cultivation.cultivationAreaHa && (
            <p className="text-xs text-muted-foreground mt-3">
              Cost per hectare: <strong>UGX {(totalCost / cultivation.cultivationAreaHa).toFixed(0)}</strong>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  )
}
