'use client'
import { safeFetch, extractArray } from '@/lib/safe-fetch'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Search, Plus, X, Loader2, Package, Truck, CheckCircle, Clock, DollarSign,
  ArrowRight, MapPin, Eye, ChevronLeft, ChevronRight, AlertCircle
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
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface Consignment {
  id: string
  product: string
  quantity: number
  unit: string
  source: string
  destination: string
  totalValue: number
  status: 'DRAFT' | 'DISPATCHED' | 'CHECKED_IN' | 'RECEIVED' | 'APPROVED' | 'PAID'
  createdAt: string
  updatedAt: string
  dispatchDate?: string
  receiveDate?: string
  notes?: string
  items: ConsignmentItem[]
}

interface ConsignmentItem {
  id: string
  productName: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
}

const consignmentStatusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  DISPATCHED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  CHECKED_IN: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  RECEIVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const statusPipeline = ['DRAFT', 'DISPATCHED', 'CHECKED_IN', 'RECEIVED', 'APPROVED', 'PAID']

const mockConsignments: Consignment[] = [
  {
    id: 'c1', product: 'Arabica Coffee (Grade A)', quantity: 500, unit: 'kg', source: 'Kampala Warehouse', destination: 'Rotterdam, NL',
    totalValue: 4250000, status: 'PAID', createdAt: '2024-11-01', updatedAt: '2024-11-20', dispatchDate: '2024-11-05', receiveDate: '2024-11-18',
    notes: 'Payment processed via bank transfer',
    items: [
      { id: 'ci1', productName: 'Arabica Coffee SL14', quantity: 300, unit: 'kg', unitPrice: 8500, total: 2550000 },
      { id: 'ci2', productName: 'Arabica Coffee Ruiru 11', quantity: 200, unit: 'kg', unitPrice: 8500, total: 1700000 },
    ]
  },
  {
    id: 'c2', product: 'Robusta Coffee', quantity: 1000, unit: 'kg', source: 'Jinja Depot', destination: 'Hamburg, DE',
    totalValue: 5500000, status: 'DISPATCHED', createdAt: '2024-11-10', updatedAt: '2024-11-15', dispatchDate: '2024-11-15',
    items: [
      { id: 'ci3', productName: 'Robusta Coffee Nganda', quantity: 1000, unit: 'kg', unitPrice: 5500, total: 5500000 },
    ]
  },
  {
    id: 'c3', product: 'Cocoa Beans (Premium)', quantity: 320, unit: 'kg', source: 'Kumasi Hub', destination: 'Amsterdam, NL',
    totalValue: 3840000, status: 'CHECKED_IN', createdAt: '2024-11-08', updatedAt: '2024-11-14', dispatchDate: '2024-11-10',
    items: [
      { id: 'ci4', productName: 'Cocoa Forastero', quantity: 200, unit: 'kg', unitPrice: 12000, total: 2400000 },
      { id: 'ci5', productName: 'Cocoa Amelonado', quantity: 120, unit: 'kg', unitPrice: 12000, total: 1440000 },
    ]
  },
  {
    id: 'c4', product: 'Vanilla Beans', quantity: 50, unit: 'kg', source: 'Mbale Collection', destination: 'Tokyo, JP',
    totalValue: 4250000, status: 'RECEIVED', createdAt: '2024-11-05', updatedAt: '2024-11-22', dispatchDate: '2024-11-08', receiveDate: '2024-11-20',
    items: [
      { id: 'ci6', productName: 'Vanilla Bourbon', quantity: 50, unit: 'kg', unitPrice: 85000, total: 4250000 },
    ]
  },
  {
    id: 'c5', product: 'Mixed Coffee Lot', quantity: 750, unit: 'kg', source: 'Nairobi Warehouse', destination: 'Seattle, US',
    totalValue: 6375000, status: 'DRAFT', createdAt: '2024-11-22', updatedAt: '2024-11-22',
    items: [
      { id: 'ci7', productName: 'Arabica AA', quantity: 400, unit: 'kg', unitPrice: 9500, total: 3800000 },
      { id: 'ci8', productName: 'Arabica PB', quantity: 350, unit: 'kg', unitPrice: 7357, total: 2575000 },
    ]
  },
  {
    id: 'c6', product: 'Cassava Flour', quantity: 2000, unit: 'kg', source: 'Gulu Processing', destination: 'Kampala Market',
    totalValue: 1600000, status: 'APPROVED', createdAt: '2024-11-12', updatedAt: '2024-11-18', dispatchDate: '2024-11-13', receiveDate: '2024-11-15',
    items: [
      { id: 'ci9', productName: 'Cassava Flour NASE 14', quantity: 2000, unit: 'kg', unitPrice: 800, total: 1600000 },
    ]
  },
]

export default function ConsignmentsView() {
  const { } = useAppStore()
  const [consignments, setConsignments] = useState<Consignment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showDetail, setShowDetail] = useState<Consignment | null>(null)
  const [page, setPage] = useState(1)
  const limit = 10

  const fetchConsignments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await safeFetch('/api/consignments')
      if (data) {
        setConsignments(extractArray(data, 'consignments'))
      } else {
        setConsignments(mockConsignments)
      }
    } catch {
      setConsignments(mockConsignments)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConsignments() }, [fetchConsignments])

  const filtered = consignments.filter(c => {
    const matchSearch = !search ||
      (c.product || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.source || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.destination || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total: consignments.length,
    inTransit: consignments.filter(c => ['DISPATCHED', 'CHECKED_IN'].includes(c.status)).length,
    received: consignments.filter(c => ['RECEIVED', 'APPROVED', 'PAID'].includes(c.status)).length,
    totalValue: consignments.reduce((s, c) => s + (c.totalValue || 0), 0),
  }

  const pipelineCounts = statusPipeline.map(s => ({
    stage: s.replace('_', ' '),
    count: consignments.filter(c => c.status === s).length,
  }))

  const destinationData = Object.entries(
    consignments.reduce((acc, c) => {
      const d = c.destination || 'Unknown'
      acc[d] = (acc[d] || 0) + (c.totalValue || 0)
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  const pieData = [
    { name: 'In Transit', value: stats.inTransit, color: '#3b82f6' },
    { name: 'Received/Done', value: stats.received, color: '#10b981' },
    { name: 'Draft', value: consignments.filter(c => c.status === 'DRAFT').length, color: '#6b7280' },
  ]

  const paged = filtered.slice((page - 1) * limit, page * limit)
  const totalPages = Math.ceil(filtered.length / limit)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Consignment Management</h3>
          <p className="text-sm text-muted-foreground">Track product consignments through the supply chain</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="w-4 h-4" /> New Consignment</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><Package className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{stats.total}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center"><Truck className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">In Transit</p><p className="text-xl font-bold">{stats.inTransit}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Received</p><p className="text-xl font-bold">{stats.received}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Total Value</p><p className="text-lg font-bold">UGX {(stats.totalValue / 1000000).toFixed(1)}M</p></div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by product, source, or destination..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusPipeline.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || statusFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); setPage(1) }} className="gap-1"><X className="w-3.5 h-3.5" /> Clear</Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No consignments found</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden sm:table-cell">Route</TableHead>
                    <TableHead className="hidden md:table-cell">Qty</TableHead>
                    <TableHead className="hidden lg:table-cell">Value</TableHead>
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map(c => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setShowDetail(c)}>
                      <TableCell>
                        <p className="font-medium text-sm">{c.product}</p>
                        <p className="text-[10px] text-muted-foreground">{(c.items?.length ?? 0)} item(s)</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span>{c.source || '—'}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground mx-1" />
                          <span className="font-medium">{c.destination || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{c.quantity} {c.unit || ''}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm font-medium">UGX {(c.totalValue ?? 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          {statusPipeline.map((s, i) => (
                            <React.Fragment key={s}>
                              <div className={cn('w-2 h-2 rounded-full', s === c.status ? 'bg-emerald-500 ring-2 ring-emerald-200' : statusPipeline.indexOf(c.status) > i ? 'bg-emerald-300' : 'bg-gray-200 dark:bg-gray-700')} title={s} />
                              {i < statusPipeline.length - 1 && <div className="w-1 h-0.5 bg-gray-200 dark:bg-gray-700" />}
                            </React.Fragment>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell><Badge className={cn('text-[10px]', consignmentStatusColor[c.status] || '')}>{c.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setShowDetail(c) }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, filtered.length)} of {filtered.length}</p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /> Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Status Pipeline</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pipelineCounts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Value by Destination</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={destinationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => `UGX ${Number(v).toLocaleString()}`} />
                <Bar dataKey="value" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={open => !open && setShowDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Consignment Details</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Product</p><p className="text-sm font-medium">{showDetail.product}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><Badge className={cn('mt-0.5', consignmentStatusColor[showDetail.status] || '')}>{showDetail.status.replace('_', ' ')}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Source</p><p className="text-sm">{showDetail.source}</p></div>
                <div><p className="text-xs text-muted-foreground">Destination</p><p className="text-sm">{showDetail.destination}</p></div>
                <div><p className="text-xs text-muted-foreground">Total Quantity</p><p className="text-sm">{showDetail.quantity} {showDetail.unit}</p></div>
                <div><p className="text-xs text-muted-foreground">Total Value</p><p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">UGX {(showDetail.totalValue ?? 0).toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Created</p><p className="text-sm">{showDetail.createdAt}</p></div>
                {showDetail.dispatchDate && <div><p className="text-xs text-muted-foreground">Dispatched</p><p className="text-sm">{showDetail.dispatchDate}</p></div>}
                {showDetail.receiveDate && <div><p className="text-xs text-muted-foreground">Received</p><p className="text-sm">{showDetail.receiveDate}</p></div>}
              </div>

              {/* Pipeline Visualization */}
              <Separator />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status Pipeline</p>
              <div className="flex items-center gap-0 overflow-x-auto">
                {statusPipeline.map((s, idx) => (
                  <React.Fragment key={s}>
                    <div className={cn('flex flex-col items-center text-center px-2 py-1.5 rounded min-w-[80px]', s === showDetail.status ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : statusPipeline.indexOf(showDetail.status) > idx ? 'opacity-70' : 'opacity-30')}>
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold', statusPipeline.indexOf(showDetail.status) >= idx ? 'bg-emerald-500' : 'bg-gray-300')}>
                        {statusPipeline.indexOf(showDetail.status) >= idx ? '✓' : idx + 1}
                      </div>
                      <p className="text-[10px] mt-1">{s.replace('_', ' ')}</p>
                    </div>
                    {idx < statusPipeline.length - 1 && <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />}
                  </React.Fragment>
                ))}
              </div>

              {/* Items */}
              <Separator />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Items ({showDetail.items?.length ?? 0})</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(showDetail.items ?? []).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">{item.productName}</TableCell>
                      <TableCell className="text-sm text-right">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-sm text-right font-medium">UGX {(item.total ?? 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {showDetail.notes && (
                <>
                  <Separator />
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{showDetail.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Consignment Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Consignment</DialogTitle></DialogHeader>
          <AddConsignmentForm onClose={() => { setShowAdd(false); fetchConsignments() }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddConsignmentForm({ onClose }: { onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    product: '', quantity: '', unit: 'kg', source: '', destination: '', notes: '',
  })
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.product || !form.source || !form.destination) { toast.error('Product, source, and destination are required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/consignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantity: Number(form.quantity), status: 'DRAFT', items: [] }),
      })
      if (!res.ok) throw new Error()
      toast.success('Consignment created successfully')
      onClose()
    } catch { toast.error('Failed to create consignment') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5"><Label>Product *</Label><Input value={form.product} onChange={e => update('product', e.target.value)} placeholder="e.g., Arabica Coffee Grade A" required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => update('quantity', e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Unit</Label>
          <Select value={form.unit} onValueChange={v => update('unit', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="kg">Kilograms (kg)</SelectItem><SelectItem value="bags">Bags</SelectItem><SelectItem value="tons">Metric Tons</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Source *</Label><Input value={form.source} onChange={e => update('source', e.target.value)} placeholder="e.g., Kampala Warehouse" required /></div>
      <div className="space-y-1.5"><Label>Destination *</Label><Input value={form.destination} onChange={e => update('destination', e.target.value)} placeholder="e.g., Rotterdam, NL" required /></div>
      <div className="space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={e => update('notes', e.target.value)} /></div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Consignment</Button>
      </DialogFooter>
    </form>
  )
}