'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Search, Plus, X, Loader2, Filter, Layers, Droplets, Wind,
  Package, Star, TrendingUp, Clock, CheckCircle, AlertCircle, BarChart3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts'

interface ProcessingBatch {
  id: string
  inputCommodity: string
  processType: string
  outputProduct: string
  inputQuantity: number
  inputUnit: string
  outputQuantity: number
  outputUnit: string
  qualityGrade: string
  qualityScore: number
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PENDING'
  batchNumber: string
  facility: string
  startDate: string
  endDate?: string
  notes?: string
}

const PROCESS_TYPES = ['Washing', 'Drying', 'Hulling', 'Grading', 'Roasting', 'Packaging']
const QUALITY_GRADES = ['Premium', 'Grade 1', 'Grade 2', 'Grade 3', 'Below Standard']
const COMMODITIES = ['Arabica Coffee', 'Robusta Coffee', 'Sunflower Seeds', 'Maize', 'Sesame', 'Vanilla', 'Cocoa']

const processIcon: Record<string, React.ReactNode> = {
  Washing: <Droplets className="w-4 h-4" />,
  Drying: <Wind className="w-4 h-4" />,
  Hulling: <Layers className="w-4 h-4" />,
  Grading: <BarChart3 className="w-4 h-4" />,
  Roasting: <Star className="w-4 h-4" />,
  Packaging: <Package className="w-4 h-4" />,
}

const processColor: Record<string, string> = {
  Washing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Drying: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Hulling: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Grading: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  Roasting: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Packaging: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const statusColor: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const gradeColor: Record<string, string> = {
  Premium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Grade 1': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Grade 2': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Grade 3': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Below Standard': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const BAR_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#14b8a6', '#f97316', '#10b981']

const DEMO_BATCHES: ProcessingBatch[] = [
  { id: '1', batchNumber: 'PCH-2024-001', inputCommodity: 'Arabica Coffee', processType: 'Washing', outputProduct: 'Washed Arabica Parchment', inputQuantity: 5000, inputUnit: 'kg', outputQuantity: 4200, outputUnit: 'kg', qualityGrade: 'Grade 1', qualityScore: 92, status: 'COMPLETED', facility: 'Mt. Elgon Processing Center', startDate: '2024-04-10T06:00:00Z', endDate: '2024-04-10T18:00:00Z', notes: 'Excellent quality cherries. 84% recovery rate.' },
  { id: '2', batchNumber: 'PCH-2024-002', inputCommodity: 'Arabica Coffee', processType: 'Drying', outputProduct: 'Dried Arabica Parchment', inputQuantity: 4200, inputUnit: 'kg', outputQuantity: 3500, outputUnit: 'kg', qualityGrade: 'Grade 1', qualityScore: 88, status: 'IN_PROGRESS', facility: 'Mt. Elgon Processing Center', startDate: '2024-04-11T06:00:00Z', notes: 'Drying on raised beds. Estimated completion April 14.' },
  { id: '3', batchNumber: 'PCH-2024-003', inputCommodity: 'Robusta Coffee', processType: 'Hulling', outputProduct: 'Robusta Green Beans', inputQuantity: 3000, inputUnit: 'kg', outputQuantity: 1800, outputUnit: 'kg', qualityGrade: 'Grade 2', qualityScore: 76, status: 'COMPLETED', facility: 'Kampala Processing Hub', startDate: '2024-04-09T08:00:00Z', endDate: '2024-04-09T16:00:00Z' },
  { id: '4', batchNumber: 'PCH-2024-004', inputCommodity: 'Arabica Coffee', processType: 'Grading', outputProduct: 'Graded Arabica Green Beans', inputQuantity: 3500, inputUnit: 'kg', outputQuantity: 3200, outputUnit: 'kg', qualityGrade: 'Premium', qualityScore: 96, status: 'COMPLETED', facility: 'Mt. Elgon Processing Center', startDate: '2024-04-12T08:00:00Z', endDate: '2024-04-12T14:00:00Z', notes: 'Premium grade - screen size 17+. Export ready.' },
  { id: '5', batchNumber: 'PCH-2024-005', inputCommodity: 'Sunflower Seeds', processType: 'Packaging', outputProduct: 'Packaged Sunflower Oil', inputQuantity: 2000, inputUnit: 'kg', outputQuantity: 1800, outputUnit: 'L', qualityGrade: 'Grade 1', qualityScore: 90, status: 'IN_PROGRESS', facility: 'Jinja Processing Facility', startDate: '2024-04-13T07:00:00Z', notes: 'Bottling in progress. 750ml and 1L containers.' },
  { id: '6', batchNumber: 'PCH-2024-006', inputCommodity: 'Arabica Coffee', processType: 'Roasting', outputProduct: 'Roasted Arabica Coffee', inputQuantity: 500, inputUnit: 'kg', outputQuantity: 420, outputUnit: 'kg', qualityGrade: 'Premium', qualityScore: 94, status: 'COMPLETED', facility: 'Kampala Processing Hub', startDate: '2024-04-11T10:00:00Z', endDate: '2024-04-11T14:00:00Z', notes: 'Medium-dark roast. Local market grade.' },
  { id: '7', batchNumber: 'PCH-2024-007', inputCommodity: 'Sesame', processType: 'Grading', outputProduct: 'Graded Sesame Seeds', inputQuantity: 1500, inputUnit: 'kg', outputQuantity: 1350, outputUnit: 'kg', qualityGrade: 'Grade 2', qualityScore: 72, status: 'COMPLETED', facility: 'Gulu Processing Center', startDate: '2024-04-08T09:00:00Z', endDate: '2024-04-08T15:00:00Z', notes: 'Some moisture content issues. Re-drying recommended.' },
  { id: '8', batchNumber: 'PCH-2024-008', inputCommodity: 'Robusta Coffee', processType: 'Washing', outputProduct: 'Washed Robusta Parchment', inputQuantity: 4000, inputUnit: 'kg', outputQuantity: 0, outputUnit: 'kg', qualityGrade: 'Below Standard', qualityScore: 45, status: 'FAILED', facility: 'Kampala Processing Hub', startDate: '2024-04-14T06:00:00Z', notes: 'Equipment malfunction. Batch to be re-processed.' },
  { id: '9', batchNumber: 'PCH-2024-009', inputCommodity: 'Arabica Coffee', processType: 'Packaging', outputProduct: 'Export-Ready Coffee Bags', inputQuantity: 3200, inputUnit: 'kg', outputQuantity: 0, outputUnit: 'kg', qualityGrade: 'Grade 1', qualityScore: 0, status: 'PENDING', facility: 'Mt. Elgon Processing Center', startDate: '2024-04-16T06:00:00Z', notes: 'Awaiting EUDR compliance documentation before packaging.' },
  { id: '10', batchNumber: 'PCH-2024-010', inputCommodity: 'Maize', processType: 'Drying', outputProduct: 'Dried Maize Kernels', inputQuantity: 8000, inputUnit: 'kg', outputQuantity: 6800, outputUnit: 'kg', qualityGrade: 'Grade 2', qualityScore: 78, status: 'IN_PROGRESS', facility: 'Northern Region Facility', startDate: '2024-04-12T06:00:00Z', notes: 'Mechanical drying at 45°C. Target moisture 13%.' },
  { id: '11', batchNumber: 'PCH-2024-011', inputCommodity: 'Arabica Coffee', processType: 'Hulling', outputProduct: 'Arabica Green Beans', inputQuantity: 3500, inputUnit: 'kg', outputQuantity: 2100, outputUnit: 'kg', qualityGrade: 'Grade 1', qualityScore: 85, status: 'COMPLETED', facility: 'Mt. Elgon Processing Center', startDate: '2024-04-13T07:00:00Z', endDate: '2024-04-13T12:00:00Z' },
  { id: '12', batchNumber: 'PCH-2024-012', inputCommodity: 'Vanilla', processType: 'Grading', outputProduct: 'Graded Vanilla Beans', inputQuantity: 200, inputUnit: 'kg', outputQuantity: 180, outputUnit: 'kg', qualityGrade: 'Premium', qualityScore: 98, status: 'PENDING', facility: 'Western Region Facility', startDate: '2024-04-17T08:00:00Z', notes: 'High-value batch. Requires senior QC officer oversight.' },
]

export default function ProcessingView() {
  const [batches, setBatches] = useState<ProcessingBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [processFilter, setProcessFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [commodityFilter, setCommodityFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const fetchBatches = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/modules?module=processing')
      if (res.ok) {
        const data = await res.json()
        if (data.batches && data.batches.length > 0) {
          setBatches(data.batches)
          setLoading(false)
          return
        }
      }
      setBatches(DEMO_BATCHES)
    } catch {
      setBatches(DEMO_BATCHES)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBatches() }, [fetchBatches])

  const filtered = batches.filter(b => {
    if (search && !b.batchNumber.toLowerCase().includes(search.toLowerCase()) && !b.inputCommodity.toLowerCase().includes(search.toLowerCase()) && !b.outputProduct.toLowerCase().includes(search.toLowerCase())) return false
    if (processFilter && b.processType !== processFilter) return false
    if (statusFilter && b.status !== statusFilter) return false
    if (commodityFilter && b.inputCommodity !== commodityFilter) return false
    return true
  })

  const totalBatches = batches.length
  const inProgress = batches.filter(b => b.status === 'IN_PROGRESS').length
  const completed = batches.filter(b => b.status === 'COMPLETED').length
  const avgQuality = batches.filter(b => b.qualityScore > 0).length > 0
    ? (batches.filter(b => b.qualityScore > 0).reduce((s, b) => s + b.qualityScore, 0) / batches.filter(b => b.qualityScore > 0).length).toFixed(1)
    : '—'

  // Process type distribution for bar chart
  const processTypeCounts = PROCESS_TYPES.map(pt => ({
    name: pt,
    count: batches.filter(b => b.processType === pt).length,
  }))
  const barConfig: ChartConfig = Object.fromEntries(processTypeCounts.map((d, i) => [d.name, { label: d.name, color: BAR_COLORS[i] }]))

  // Quality distribution for pie
  const qualityDist = QUALITY_GRADES.map(g => ({
    name: g,
    value: batches.filter(b => b.qualityGrade === g).length,
  })).filter(d => d.value > 0)
  const QUALITY_COLORS = ['#eab308', '#10b981', '#3b82f6', '#f59e0b', '#ef4444']
  const qualityPieConfig: ChartConfig = Object.fromEntries(qualityDist.map((d, i) => [d.name, { label: d.name, color: QUALITY_COLORS[i % QUALITY_COLORS.length] }]))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            Post-Harvest Processing
          </h3>
          <p className="text-sm text-muted-foreground">Processing batch management, quality control, and value addition</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Batch
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Batches</p>
              <p className="text-xl font-bold">{totalBatches}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">In Progress</p>
              <p className="text-xl font-bold text-blue-600">{inProgress}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-xl font-bold">{completed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Quality Score</p>
              <p className="text-xl font-bold">{avgQuality}{avgQuality !== '—' ? '/100' : ''}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Process Type Distribution</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-[180px] w-full">
              <BarChart data={processTypeCounts} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                  {processTypeCounts.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Quality Grade Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ChartContainer config={qualityPieConfig} className="h-[140px] w-[140px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={qualityDist} cx="50%" cy="50%" innerRadius={30} outerRadius={65} dataKey="value" strokeWidth={1}>
                    {qualityDist.map((_, i) => <Cell key={i} fill={QUALITY_COLORS[i % QUALITY_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="flex-1 space-y-1.5">
                {qualityDist.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: QUALITY_COLORS[i % QUALITY_COLORS.length] }} />
                      <span className="text-xs">{d.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{d.value}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by batch number, commodity, or product..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={processFilter} onValueChange={v => setProcessFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[140px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Process" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PROCESS_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={commodityFilter} onValueChange={v => setCommodityFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Commodity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {COMMODITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
        {(processFilter || statusFilter || search || commodityFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setProcessFilter(''); setStatusFilter(''); setSearch(''); setCommodityFilter('') }} className="gap-1">
            <X className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No processing batches found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead className="hidden md:table-cell">Process</TableHead>
                    <TableHead>Commodity → Product</TableHead>
                    <TableHead className="hidden sm:table-cell">Quantity In/Out</TableHead>
                    <TableHead className="hidden lg:table-cell">Quality</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(b => {
                    const recovery = b.outputQuantity > 0 && b.inputQuantity > 0 ? ((b.outputQuantity / b.inputQuantity) * 100).toFixed(0) : null
                    return (
                      <TableRow key={b.id}>
                        <TableCell>
                          <div>
                            <p className="font-mono text-sm font-medium">{b.batchNumber}</p>
                            <p className="text-[10px] text-muted-foreground">{b.facility}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge className={cn('text-[10px] gap-1', processColor[b.processType])}>
                            {processIcon[b.processType]} {b.processType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{b.inputCommodity}</p>
                          <p className="text-[10px] text-muted-foreground">→ {b.outputProduct}</p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="text-sm">
                            <span className="font-medium">{b.inputQuantity.toLocaleString()} {b.inputUnit}</span>
                            <span className="text-muted-foreground mx-1">→</span>
                            <span className={b.outputQuantity > 0 ? 'font-medium text-emerald-600' : 'text-muted-foreground'}>
                              {b.outputQuantity > 0 ? `${b.outputQuantity.toLocaleString()} ${b.outputUnit}` : '—'}
                            </span>
                            {recovery && <p className="text-[10px] text-muted-foreground">{recovery}% recovery</p>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {b.qualityScore > 0 ? (
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <Progress value={b.qualityScore} className="h-2 flex-1" />
                              <span className={cn('text-xs font-medium', b.qualityScore >= 85 ? 'text-emerald-600' : b.qualityScore >= 70 ? 'text-amber-600' : 'text-red-600')}>
                                {b.qualityScore}
                              </span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">N/A</span>}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-[10px]', gradeColor[b.qualityGrade] || '')}>{b.qualityGrade}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-[10px]', statusColor[b.status])}>{b.status.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {new Date(b.startDate).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">Showing {filtered.length} of {totalBatches} batches</p>
          </div>
        )}
      </Card>

      {/* Add Batch Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              New Processing Batch
            </DialogTitle>
          </DialogHeader>
          <AddBatchForm onClose={() => { setShowAdd(false); fetchBatches() }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddBatchForm({ onClose }: { onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    inputCommodity: '', processType: '', outputProduct: '', inputQuantity: '',
    inputUnit: 'kg', outputQuantity: '', outputUnit: 'kg', qualityGrade: '',
    facility: '', notes: '', startDate: new Date().toISOString().split('T')[0],
  })
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.inputCommodity || !form.processType || !form.outputProduct || !form.inputQuantity || !form.facility) {
      toast.error('Commodity, process type, output product, input quantity, and facility are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'processing', ...form, inputQuantity: parseFloat(form.inputQuantity), outputQuantity: form.outputQuantity ? parseFloat(form.outputQuantity) : 0 }),
      })
      if (res.ok) {
        toast.success('Processing batch created successfully')
        onClose()
        return
      }
    } catch { /* fallback */ }
    toast.success('Processing batch created (demo mode)')
    onClose()
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Input Commodity *</Label>
          <Select value={form.inputCommodity} onValueChange={v => update('inputCommodity', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{COMMODITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Process Type *</Label>
          <Select value={form.processType} onValueChange={v => update('processType', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{PROCESS_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Output Product *</Label>
        <Input value={form.outputProduct} onChange={e => update('outputProduct', e.target.value)} placeholder="e.g. Washed Arabica Parchment" required />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Input Qty *</Label>
          <Input type="number" value={form.inputQuantity} onChange={e => update('inputQuantity', e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Output Qty</Label>
          <Input type="number" value={form.outputQuantity} onChange={e => update('outputQuantity', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Quality Grade</Label>
          <Select value={form.qualityGrade} onValueChange={v => update('qualityGrade', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{QUALITY_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Facility *</Label>
          <Input value={form.facility} onChange={e => update('facility', e.target.value)} placeholder="Processing center name" required />
        </div>
        <div className="space-y-1.5">
          <Label>Start Date</Label>
          <Input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Input value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional notes..." />
      </div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Batch
        </Button>
      </DialogFooter>
    </form>
  )
}