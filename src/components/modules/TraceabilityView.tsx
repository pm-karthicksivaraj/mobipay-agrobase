'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Search, Package, Truck, CheckCircle, Clock, MapPin, ArrowRight,
  Leaf, Coffee, Factory, Ship, BarChart3, Loader2, AlertCircle, X, Filter,
  ChevronDown, ChevronUp, Shield, TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface TraceChainStep {
  step: string
  label: string
  icon: React.ReactNode
  date?: string
  location?: string
  status: 'completed' | 'current' | 'pending'
  notes?: string
}

interface Batch {
  id: string
  lotNumber: string
  farmerName: string
  farmerCode: string
  commodity: string
  quantity: number
  unit: string
  status: string
  eudrCompliant: boolean
  harvestDate: string
  currentStage: string
  traceTime: number
  destination: string
  chain: TraceChainStep[]
}

const statusColor: Record<string, string> = {
  HARVESTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  COLLECTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PROCESSED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  GRADED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  PACKED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  SHIPPED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  DELIVERED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const statusPipeline = ['HARVESTED', 'COLLECTED', 'PROCESSED', 'GRADED', 'PACKED', 'SHIPPED']

const mockBatches: Batch[] = [
  {
    id: 'b1', lotNumber: 'LOT-UG-2024-001', farmerName: 'James Okello', farmerCode: 'FRM-001',
    commodity: 'Arabica Coffee', quantity: 250, unit: 'kg', status: 'SHIPPED', eudrCompliant: true,
    harvestDate: '2024-11-15', currentStage: 'SHIPPED', traceTime: 12, destination: 'Rotterdam, NL',
    chain: [
      { step: 'harvest', label: 'Harvest', icon: <Leaf className="w-4 h-4" />, date: '2024-11-15', location: 'Mt. Elgon, Uganda', status: 'completed', notes: 'Hand-picked red cherries' },
      { step: 'collection', label: 'Collection Center', icon: <MapPin className="w-4 h-4" />, date: '2024-11-16', location: 'Mbale Collection Center', status: 'completed', notes: 'Wet mill intake' },
      { step: 'processing', label: 'Processing', icon: <Factory className="w-4 h-4" />, date: '2024-11-18', location: 'Bugisu Coffee Works', status: 'completed', notes: 'Washed process, 48hr ferment' },
      { step: 'grading', label: 'Grading', icon: <BarChart3 className="w-4 h-4" />, date: '2024-11-22', location: 'Quality Lab, Kampala', status: 'completed', notes: 'Grade A, 85+pts' },
      { step: 'packing', label: 'Packing', icon: <Package className="w-4 h-4" />, date: '2024-11-24', location: 'Export Warehouse', status: 'completed', notes: '60kg GrainPro bags' },
      { step: 'shipping', label: 'Export', icon: <Ship className="w-4 h-4" />, date: '2024-11-27', location: 'Port of Mombasa', status: 'current', notes: 'In transit to Rotterdam' },
    ]
  },
  {
    id: 'b2', lotNumber: 'LOT-UG-2024-002', farmerName: 'Grace Achieng', farmerCode: 'FRM-012',
    commodity: 'Robusta Coffee', quantity: 500, unit: 'kg', status: 'PROCESSED', eudrCompliant: true,
    harvestDate: '2024-11-10', currentStage: 'PROCESSED', traceTime: 8, destination: 'Hamburg, DE',
    chain: [
      { step: 'harvest', label: 'Harvest', icon: <Leaf className="w-4 h-4" />, date: '2024-11-10', location: 'Central Region, Uganda', status: 'completed' },
      { step: 'collection', label: 'Collection Center', icon: <MapPin className="w-4 h-4" />, date: '2024-11-11', location: 'Kampala Hub', status: 'completed' },
      { step: 'processing', label: 'Processing', icon: <Factory className="w-4 h-4" />, date: '2024-11-13', location: 'UCDA Facility', status: 'current' },
      { step: 'grading', label: 'Grading', icon: <BarChart3 className="w-4 h-4" />, status: 'pending' },
      { step: 'packing', label: 'Packing', icon: <Package className="w-4 h-4" />, status: 'pending' },
      { step: 'shipping', label: 'Export', icon: <Ship className="w-4 h-4" />, status: 'pending' },
    ]
  },
  {
    id: 'b3', lotNumber: 'LOT-KE-2024-003', farmerName: 'Wangari Muthoni', farmerCode: 'FRM-045',
    commodity: 'Arabica Coffee', quantity: 180, unit: 'kg', status: 'GRADED', eudrCompliant: true,
    harvestDate: '2024-10-28', currentStage: 'GRADED', traceTime: 14, destination: 'Tokyo, JP',
    chain: [
      { step: 'harvest', label: 'Harvest', icon: <Leaf className="w-4 h-4" />, date: '2024-10-28', location: 'Nyeri, Kenya', status: 'completed' },
      { step: 'collection', label: 'Collection Center', icon: <MapPin className="w-4 h-4" />, date: '2024-10-29', location: 'Nyeri Station', status: 'completed' },
      { step: 'processing', label: 'Processing', icon: <Factory className="w-4 h-4" />, date: '2024-11-01', location: 'Othaya Factory', status: 'completed' },
      { step: 'grading', label: 'Grading', icon: <BarChart3 className="w-4 h-4" />, date: '2024-11-05', location: 'Nairobi Lab', status: 'current' },
      { step: 'packing', label: 'Packing', icon: <Package className="w-4 h-4" />, status: 'pending' },
      { step: 'shipping', label: 'Export', icon: <Ship className="w-4 h-4" />, status: 'pending' },
    ]
  },
  {
    id: 'b4', lotNumber: 'LOT-GH-2024-004', farmerName: 'Kwame Asante', farmerCode: 'FRM-078',
    commodity: 'Cocoa Beans', quantity: 320, unit: 'kg', status: 'COLLECTED', eudrCompliant: false,
    harvestDate: '2024-11-05', currentStage: 'COLLECTED', traceTime: 3, destination: 'Amsterdam, NL',
    chain: [
      { step: 'harvest', label: 'Harvest', icon: <Leaf className="w-4 h-4" />, date: '2024-11-05', location: 'Ashanti Region, Ghana', status: 'completed' },
      { step: 'collection', label: 'Collection Center', icon: <MapPin className="w-4 h-4" />, date: '2024-11-07', location: 'Kumasi Depot', status: 'current' },
      { step: 'processing', label: 'Processing', icon: <Factory className="w-4 h-4" />, status: 'pending' },
      { step: 'grading', label: 'Grading', icon: <BarChart3 className="w-4 h-4" />, status: 'pending' },
      { step: 'packing', label: 'Packing', icon: <Package className="w-4 h-4" />, status: 'pending' },
      { step: 'shipping', label: 'Export', icon: <Ship className="w-4 h-4" />, status: 'pending' },
    ]
  },
  {
    id: 'b5', lotNumber: 'LOT-UG-2024-005', farmerName: 'Sarah Nakamya', farmerCode: 'FRM-023',
    commodity: 'Arabica Coffee', quantity: 400, unit: 'kg', status: 'HARVESTED', eudrCompliant: true,
    harvestDate: '2024-11-25', currentStage: 'HARVESTED', traceTime: 1, destination: 'Seattle, US',
    chain: [
      { step: 'harvest', label: 'Harvest', icon: <Leaf className="w-4 h-4" />, date: '2024-11-25', location: 'Sipi Falls, Uganda', status: 'current' },
      { step: 'collection', label: 'Collection Center', icon: <MapPin className="w-4 h-4" />, status: 'pending' },
      { step: 'processing', label: 'Processing', icon: <Factory className="w-4 h-4" />, status: 'pending' },
      { step: 'grading', label: 'Grading', icon: <BarChart3 className="w-4 h-4" />, status: 'pending' },
      { step: 'packing', label: 'Packing', icon: <Package className="w-4 h-4" />, status: 'pending' },
      { step: 'shipping', label: 'Export', icon: <Ship className="w-4 h-4" />, status: 'pending' },
    ]
  },
  {
    id: 'b6', lotNumber: 'LOT-UG-2024-006', farmerName: 'Peter Ochieng', farmerCode: 'FRM-031',
    commodity: 'Arabica Coffee', quantity: 150, unit: 'kg', status: 'PACKED', eudrCompliant: true,
    harvestDate: '2024-10-20', currentStage: 'PACKED', traceTime: 18, destination: 'London, UK',
    chain: [
      { step: 'harvest', label: 'Harvest', icon: <Leaf className="w-4 h-4" />, date: '2024-10-20', location: 'Zirobwe, Uganda', status: 'completed' },
      { step: 'collection', label: 'Collection Center', icon: <MapPin className="w-4 h-4" />, date: '2024-10-21', location: 'Zirobwe Hub', status: 'completed' },
      { step: 'processing', label: 'Processing', icon: <Factory className="w-4 h-4" />, date: '2024-10-24', location: 'Gulu Processing', status: 'completed' },
      { step: 'grading', label: 'Grading', icon: <BarChart3 className="w-4 h-4" />, date: '2024-10-28', location: 'Kampala Quality Lab', status: 'completed' },
      { step: 'packing', label: 'Packing', icon: <Package className="w-4 h-4" />, date: '2024-11-01', location: 'Export Warehouse', status: 'current' },
      { step: 'shipping', label: 'Export', icon: <Ship className="w-4 h-4" />, status: 'pending' },
    ]
  },
]

export default function TraceabilityView() {
  const { } = useAppStore()
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [expandedChain, setExpandedChain] = useState<string | null>(null)

  const fetchBatches = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/traceability')
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || data.data || [])
      } else {
        setBatches(mockBatches)
      }
    } catch {
      setBatches(mockBatches)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBatches() }, [fetchBatches])

  const filtered = batches.filter(b => {
    const matchSearch = !search || b.lotNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.farmerCode.toLowerCase().includes(search.toLowerCase()) ||
      b.farmerName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total: batches.length,
    inTransit: batches.filter(b => ['SHIPPED', 'PACKED'].includes(b.status)).length,
    delivered: batches.filter(b => b.status === 'DELIVERED').length,
    avgTraceTime: batches.length > 0 ? Math.round(batches.reduce((s, b) => s + b.traceTime, 0) / batches.length) : 0,
  }

  const pipelineCounts = statusPipeline.map(s => ({
    stage: s,
    count: batches.filter(b => b.status === s).length,
  }))

  const pieData = [
    { name: 'Compliant', value: batches.filter(b => b.eudrCompliant).length, color: '#10b981' },
    { name: 'Non-Compliant', value: batches.filter(b => !b.eudrCompliant).length, color: '#ef4444' },
  ]

  const commodityData = Object.entries(
    batches.reduce((acc, b) => { acc[b.commodity] = (acc[b.commodity] || 0) + b.quantity; return acc }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Supply Chain Traceability</h3>
          <p className="text-sm text-muted-foreground">Farm-to-cup tracking for coffee exports</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={fetchBatches}>
          <TrendingUp className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><Package className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Total Batches</p><p className="text-xl font-bold">{stats.total}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center"><Truck className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">In Transit</p><p className="text-xl font-bold">{stats.inTransit}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Delivered</p><p className="text-xl font-bold">{stats.delivered}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-muted-foreground">Avg Trace Time</p><p className="text-xl font-bold">{stats.avgTraceTime}d</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="lookup" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lookup">Trace Lookup</TabsTrigger>
          <TabsTrigger value="batches">Batch Tracking</TabsTrigger>
          <TabsTrigger value="map">Chain Map</TabsTrigger>
        </TabsList>

        {/* Tab 1: Trace Lookup */}
        <TabsContent value="lookup" className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Search by Farmer Code or Lot Number</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Enter farmer code or lot number..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {statusPipeline.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(search || statusFilter) && (
                  <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('') }} className="gap-1"><X className="w-3.5 h-3.5" /> Clear</Button>
                )}
              </div>

              {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Coffee className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No trace records found</p>
                  <p className="text-sm mt-1">Try a different farmer code or lot number</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(batch => (
                    <Card key={batch.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedBatch(selectedBatch?.id === batch.id ? null : batch)}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><Coffee className="w-5 h-5 text-emerald-600" /></div>
                            <div>
                              <p className="font-medium text-sm">{batch.lotNumber}</p>
                              <p className="text-xs text-muted-foreground">{batch.farmerName} ({batch.farmerCode})</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {batch.eudrCompliant && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] gap-1"><Shield className="w-3 h-3" /> EUDR</Badge>}
                            <Badge className={cn('text-[10px]', statusColor[batch.status] || '')}>{batch.status}</Badge>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Leaf className="w-3 h-3" /> {batch.commodity}</span>
                          <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {batch.quantity} {batch.unit}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {batch.destination}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {batch.traceTime} days</span>
                        </div>

                        {/* Expanded chain */}
                        {selectedBatch?.id === batch.id && (
                          <div className="mt-4">
                            <Separator className="mb-4" />
                            <p className="text-xs font-medium mb-3 text-muted-foreground uppercase tracking-wider">Full Trace Chain</p>
                            <div className="flex flex-col sm:flex-row items-start sm:items-stretch gap-0">
                              {batch.chain.map((step, idx) => (
                                <React.Fragment key={step.step}>
                                  <div className={cn('flex flex-col items-center text-center px-3 py-2 rounded-lg min-w-[100px]', step.status === 'current' ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : step.status === 'completed' ? 'bg-muted/50' : 'opacity-40')}>
                                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center mb-1', step.status === 'completed' ? 'bg-emerald-500 text-white' : step.status === 'current' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-400')}>
                                      {step.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : step.icon}
                                    </div>
                                    <p className="text-[11px] font-medium">{step.label}</p>
                                    {step.date && <p className="text-[10px] text-muted-foreground">{step.date}</p>}
                                    {step.location && <p className="text-[10px] text-muted-foreground">{step.location}</p>}
                                    {step.notes && <p className="text-[9px] text-muted-foreground mt-0.5 max-w-[120px]">{step.notes}</p>}
                                  </div>
                                  {idx < batch.chain.length - 1 && (
                                    <div className="hidden sm:flex items-center px-1">
                                      <ArrowRight className={cn('w-4 h-4', step.status === 'completed' ? 'text-emerald-500' : 'text-gray-300')} />
                                    </div>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Batch Tracking */}
        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
              ) : batches.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No batches found</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lot Number</TableHead>
                        <TableHead className="hidden sm:table-cell">Farmer</TableHead>
                        <TableHead className="hidden md:table-cell">Commodity</TableHead>
                        <TableHead className="hidden lg:table-cell">Quantity</TableHead>
                        <TableHead>Pipeline</TableHead>
                        <TableHead>EUDR</TableHead>
                        <TableHead className="w-[70px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(b => (
                        <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedBatch(b); setExpandedChain(expandedChain === b.id ? null : b.id) }}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm font-mono">{b.lotNumber}</p>
                              <p className="text-[10px] text-muted-foreground">{b.destination}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{b.farmerName}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{b.commodity}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{b.quantity} {b.unit}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {statusPipeline.map((s, i) => (
                                <React.Fragment key={s}>
                                  <div className={cn('w-2 h-2 rounded-full', s === b.status ? 'bg-emerald-500 ring-2 ring-emerald-200' : statusPipeline.indexOf(b.status) > i ? 'bg-emerald-300' : 'bg-gray-200 dark:bg-gray-700')} title={s} />
                                  {i < statusPipeline.length - 1 && <div className="w-1.5 h-0.5 bg-gray-200 dark:bg-gray-700" />}
                                </React.Fragment>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {b.eudrCompliant ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] gap-1"><Shield className="w-3 h-3" /> Yes</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-[10px] gap-1"><AlertCircle className="w-3 h-3" /> No</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-[10px]', statusColor[b.status] || '')}>{b.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pipeline chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Status Pipeline</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={pipelineCounts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">EUDR Compliance</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Chain Map */}
        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Supply Chain Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-0 md:gap-0 overflow-x-auto pb-4">
                {[
                  { step: 'harvest', label: 'Harvest', icon: <Leaf className="w-6 h-6" />, count: batches.filter(b => b.status === 'HARVESTED' || statusPipeline.indexOf(b.status) > 0).length, color: 'bg-amber-500' },
                  { step: 'collection', label: 'Collection Center', icon: <MapPin className="w-6 h-6" />, count: batches.filter(b => b.status === 'COLLECTED' || statusPipeline.indexOf(b.status) > 1).length, color: 'bg-blue-500' },
                  { step: 'processing', label: 'Processing', icon: <Factory className="w-6 h-6" />, count: batches.filter(b => b.status === 'PROCESSED' || statusPipeline.indexOf(b.status) > 2).length, color: 'bg-purple-500' },
                  { step: 'grading', label: 'Grading & QC', icon: <BarChart3 className="w-6 h-6" />, count: batches.filter(b => b.status === 'GRADED' || statusPipeline.indexOf(b.status) > 3).length, color: 'bg-cyan-500' },
                  { step: 'packing', label: 'Packing', icon: <Package className="w-6 h-6" />, count: batches.filter(b => b.status === 'PACKED' || statusPipeline.indexOf(b.status) > 4).length, color: 'bg-indigo-500' },
                  { step: 'export', label: 'Export', icon: <Ship className="w-6 h-6" />, count: batches.filter(b => b.status === 'SHIPPED' || b.status === 'DELIVERED').length, color: 'bg-emerald-500' },
                ].map((item, idx) => (
                  <React.Fragment key={item.step}>
                    <div className="flex flex-col items-center text-center min-w-[130px]">
                      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg', item.color)}>
                        {item.icon}
                      </div>
                      <p className="font-medium text-sm mt-2">{item.label}</p>
                      <Badge className="mt-1 text-xs">{item.count} batches</Badge>
                    </div>
                    {idx < 5 && (
                      <div className="flex items-center px-2 py-8">
                        <ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block" />
                        <ChevronDown className="w-6 h-6 text-muted-foreground md:hidden" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <Separator className="my-6" />

              {/* Commodity breakdown */}
              <p className="text-sm font-medium mb-3">Volume by Commodity</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={commodityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}