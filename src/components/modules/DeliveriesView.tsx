'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { safeFetch, extractArray } from '@/lib/safe-fetch'
import {
  Search, Plus, X, Loader2, Truck, Package, CheckCircle, Clock, MapPin,
  ChevronLeft, ChevronRight, Eye, User, Calendar, Navigation, Trash2, Download
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
import { EmptyState, exportToCSV } from '@/components/ui/empty-state'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

type RelatedType = 'PURCHASE' | 'CONSIGNMENT' | 'INPUT_REQUEST'
type DeliveryStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED'

interface DeliveryTimeline {
  status: DeliveryStatus
  timestamp?: string
  location?: string
  note?: string
}

interface Delivery {
  id: string
  relatedType: RelatedType
  relatedId: string
  relatedRef: string
  status: DeliveryStatus
  driverName: string
  driverPhone: string
  vehicleReg: string
  product: string
  quantity: number
  unit: string
  source: string
  destination: string
  dispatchDate?: string
  deliveryDate?: string
  estimatedDays: number
  createdAt: string
  timeline: DeliveryTimeline[]
}

const deliveryStatusColor: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  IN_TRANSIT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  DELIVERED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const relatedTypeColor: Record<string, string> = {
  PURCHASE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CONSIGNMENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  INPUT_REQUEST: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

const statusPipeline: DeliveryStatus[] = ['PENDING', 'IN_TRANSIT', 'DELIVERED']

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-4 h-4" />,
  IN_TRANSIT: <Truck className="w-4 h-4" />,
  DELIVERED: <CheckCircle className="w-4 h-4" />,
}

export default function DeliveriesView() {
  const { } = useAppStore()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showDetail, setShowDetail] = useState<Delivery | null>(null)
  const [page, setPage] = useState(1)
  const limit = 10

  const fetchDeliveries = useCallback(async () => {
    setLoading(true)
    try {
      const data = await safeFetch('/api/deliveries')
      if (data) {
        const raw = extractArray(data, 'data', 'deliveries')
        // Normalize API rows to the Delivery interface
        const normalized: Delivery[] = raw.map((d: any) => ({
          id: d.id,
          relatedType: (d.relatedType as RelatedType) || 'PURCHASE',
          relatedId: d.relatedId || '',
          relatedRef: '',
          status: (d.status as DeliveryStatus) || 'PENDING',
          driverName: d.driverName || '',
          driverPhone: '',
          vehicleReg: d.vehicleReg || '',
          product: '',
          quantity: 0,
          unit: '',
          source: '',
          destination: '',
          dispatchDate: d.dispatchedAt ? new Date(d.dispatchedAt).toISOString().split('T')[0] : undefined,
          deliveryDate: d.deliveredAt ? new Date(d.deliveredAt).toISOString().split('T')[0] : undefined,
          estimatedDays: 0,
          createdAt: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : '',
          timeline: [],
        }))
        setDeliveries(normalized)
      } else {
        setDeliveries([])
      }
    } catch {
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/deliveries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast.success('Delivery status updated')
        fetchDeliveries()
      } else {
        toast.error('Failed to update status')
      }
    } catch { toast.error('Network error') }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this delivery?')) return
    try {
      const res = await fetch(`/api/deliveries/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Delivery deleted')
        fetchDeliveries()
      } else {
        toast.error('Failed to delete delivery')
      }
    } catch { toast.error('Network error') }
  }

  useEffect(() => { fetchDeliveries() }, [fetchDeliveries])

  const filtered = deliveries.filter(d => {
    const matchSearch = !search ||
      (d.driverName || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.vehicleReg || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.product || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.destination || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || d.status === statusFilter
    const matchType = !typeFilter || d.relatedType === typeFilter
    return matchSearch && matchStatus && matchType
  })

  const stats = {
    pending: deliveries.filter(d => d.status === 'PENDING').length,
    inTransit: deliveries.filter(d => d.status === 'IN_TRANSIT').length,
    delivered: deliveries.filter(d => d.status === 'DELIVERED').length,
    avgDeliveryTime: (() => {
      const completed = deliveries.filter(d => d.status === 'DELIVERED' && d.dispatchDate && d.deliveryDate)
      if (completed.length === 0) return 0
      const totalDays = completed.reduce((sum, d) => {
        const dispatch = new Date(d.dispatchDate!).getTime()
        const delivery = new Date(d.deliveryDate!).getTime()
        if (isNaN(dispatch) || isNaN(delivery)) return sum
        return sum + Math.max(1, Math.ceil((delivery - dispatch) / (1000 * 60 * 60 * 24)))
      }, 0)
      return Math.round(totalDays / completed.length)
    })(),
  }

  const statusChartData = statusPipeline.map(s => ({
    status: s.replace('_', ' '),
    count: deliveries.filter(d => d.status === s).length,
  }))

  const typeData = [
    { type: 'Purchases', count: deliveries.filter(d => d.relatedType === 'PURCHASE').length },
    { type: 'Consignments', count: deliveries.filter(d => d.relatedType === 'CONSIGNMENT').length },
    { type: 'Input Requests', count: deliveries.filter(d => d.relatedType === 'INPUT_REQUEST').length },
  ]

  const paged = filtered.slice((page - 1) * limit, page * limit)
  const totalPages = Math.ceil(filtered.length / limit)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Delivery Tracking</h3>
          <p className="text-sm text-muted-foreground">Track deliveries for purchases, consignments, and input requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(deliveries, 'deliveries')} disabled={deliveries.length === 0} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="w-4 h-4" /> New Delivery</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold">{stats.pending}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center"><Truck className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">In Transit</p><p className="text-xl font-bold">{stats.inTransit}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Delivered</p><p className="text-xl font-bold">{stats.delivered}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><Navigation className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Avg Delivery Time</p><p className="text-xl font-bold">{stats.avgDeliveryTime}d</p></div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by driver, vehicle, product, or destination..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Related Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="PURCHASE">Purchase</SelectItem>
            <SelectItem value="CONSIGNMENT">Consignment</SelectItem>
            <SelectItem value="INPUT_REQUEST">Input Request</SelectItem>
          </SelectContent>
        </Select>
        {(search || statusFilter || typeFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setPage(1) }} className="gap-1"><X className="w-3.5 h-3.5" /> Clear</Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No deliveries found"
              description="Click 'New Delivery' to create one."
              actionLabel="New Delivery"
              onAction={() => setShowAdd(true)}
            />
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden sm:table-cell">Route</TableHead>
                    <TableHead className="hidden md:table-cell">Driver</TableHead>
                    <TableHead className="hidden lg:table-cell">Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Pipeline</TableHead>
                    <TableHead className="w-[160px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map(d => (
                    <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setShowDetail(d)}>
                      <TableCell>
                        {d.relatedType ? (
                          <Badge className={cn('text-[10px]', relatedTypeColor[d.relatedType] || '')}>
                            {d.relatedType.replace('_', ' ')}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{d.product || '—'}</p>
                          <p className="text-[10px] text-muted-foreground">{d.quantity ?? '—'} {d.unit || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[80px]">{d.source || '—'}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium truncate max-w-[80px]">{d.destination || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>
                          <p className="text-sm">{d.driverName || <span className="text-muted-foreground">Unassigned</span>}</p>
                          {d.driverPhone && <p className="text-[10px] text-muted-foreground">{d.driverPhone}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm font-mono">{d.vehicleReg || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {d.status ? (
                          <Select value={d.status} onValueChange={(v) => handleStatusChange(d.id, v)}>
                            <SelectTrigger className={cn('h-7 w-[130px] text-[10px] font-medium border-0 hover:opacity-80', deliveryStatusColor[d.status] || '')}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                              <SelectItem value="DELIVERED">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-0.5">
                          {statusPipeline.map((s, i) => (
                            <React.Fragment key={s}>
                              <div className={cn('w-2.5 h-2.5 rounded-full', s === d.status ? 'bg-emerald-500 ring-2 ring-emerald-200' : statusPipeline.indexOf(d.status) > i ? 'bg-emerald-300' : 'bg-gray-200 dark:bg-gray-700')} title={s} />
                              {i < statusPipeline.length - 1 && <div className="w-1.5 h-0.5 bg-gray-200 dark:bg-gray-700" />}
                            </React.Fragment>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="View" onClick={e => { e.stopPropagation(); setShowDetail(d) }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40" title="Delete" onClick={e => { e.stopPropagation(); handleDelete(d.id) }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm">Delivery Status Overview</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Deliveries by Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={open => !open && setShowDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Delivery Details</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {showDetail.relatedType && <Badge className={cn(relatedTypeColor[showDetail.relatedType] || '')}>{showDetail.relatedType.replace('_', ' ')}</Badge>}
                {showDetail.status && <Badge className={cn(deliveryStatusColor[showDetail.status] || '')}>{showDetail.status.replace('_', ' ')}</Badge>}
                <span className="text-xs text-muted-foreground font-mono">{showDetail.relatedRef || '—'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Product</p><p className="text-sm font-medium">{showDetail.product || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Quantity</p><p className="text-sm">{showDetail.quantity ?? '—'} {showDetail.unit || ''}</p></div>
                <div><p className="text-xs text-muted-foreground">Source</p><p className="text-sm">{showDetail.source || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Destination</p><p className="text-sm">{showDetail.destination || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Driver</p><p className="text-sm">{showDetail.driverName || 'Unassigned'}</p></div>
                <div><p className="text-xs text-muted-foreground">Vehicle</p><p className="text-sm font-mono">{showDetail.vehicleReg || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Driver Phone</p><p className="text-sm">{showDetail.driverPhone || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Est. Days</p><p className="text-sm">{showDetail.estimatedDays ?? '—'} days</p></div>
                {showDetail.dispatchDate && <div><p className="text-xs text-muted-foreground">Dispatch Date</p><p className="text-sm">{showDetail.dispatchDate}</p></div>}
                {showDetail.deliveryDate && <div><p className="text-xs text-muted-foreground">Delivery Date</p><p className="text-sm">{showDetail.deliveryDate}</p></div>}
              </div>

              {/* Status Timeline */}
              <Separator />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Delivery Timeline</p>
              {(showDetail.timeline?.length ?? 0) > 0 ? (
              <div className="relative pl-6 space-y-4">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />

                {showDetail.timeline.map((entry, idx) => {
                  const isLast = idx === showDetail.timeline.length - 1
                  const isCurrent = entry.status === showDetail.status
                  return (
                    <div key={idx} className="relative flex gap-3">
                      {/* Node */}
                      <div className={cn(
                        'absolute left-[-16px] w-6 h-6 rounded-full flex items-center justify-center z-10',
                        isCurrent
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 dark:ring-emerald-900/40'
                          : isLast
                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500'
                            : 'bg-emerald-500 text-white'
                      )}>
                        {isLast && !isCurrent ? (
                          <Loader2 className={cn('w-3 h-3', showDetail.status !== 'DELIVERED' && 'animate-spin')} />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className={cn('flex-1 rounded-lg p-3', isCurrent ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-muted/30')}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={cn('text-[10px]', deliveryStatusColor[entry.status] || '')}>{entry.status.replace('_', ' ')}</Badge>
                          {entry.timestamp && <span className="text-[10px] text-muted-foreground">{entry.timestamp}</span>}
                        </div>
                        {entry.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {entry.location}</p>
                        )}
                        {entry.note && <p className="text-xs mt-1">{entry.note}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No timeline events recorded.</p>
              )}

              {/* Pipeline overview */}
              <Separator />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pipeline</p>
              <div className="flex items-center gap-0 overflow-x-auto">
                {statusPipeline.map((s, idx) => {
                  const isCompleted = statusPipeline.indexOf(showDetail.status) > idx
                  const isCurrent = s === showDetail.status
                  return (
                    <React.Fragment key={s}>
                      <div className={cn('flex flex-col items-center text-center px-3 py-2 rounded-lg min-w-[80px]', isCurrent ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : isCompleted ? 'opacity-70' : 'opacity-30')}>
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white', isCompleted || isCurrent ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600')}>
                          {isCompleted ? <CheckCircle className="w-4 h-4" /> : isCurrent ? statusIcons[s] : <span className="text-xs">{idx + 1}</span>}
                        </div>
                        <p className="text-[10px] mt-1 font-medium">{s.replace('_', ' ')}</p>
                      </div>
                      {idx < statusPipeline.length - 1 && (
                        <div className={cn('h-0.5 w-6 shrink-0', isCompleted ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700')} />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Delivery Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Delivery</DialogTitle></DialogHeader>
          <AddDeliveryForm onClose={() => { setShowAdd(false); fetchDeliveries() }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddDeliveryForm({ onClose }: { onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    relatedType: 'PURCHASE' as RelatedType,
    relatedId: '', product: '', quantity: '', unit: 'kg',
    source: '', destination: '', driverName: '', driverPhone: '', vehicleReg: '',
    estimatedDays: '3',
  })
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.product || !form.source || !form.destination) {
      toast.error('Product, source, and destination are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          estimatedDays: Number(form.estimatedDays),
          status: 'PENDING',
          timeline: [{ status: 'PENDING', timestamp: new Date().toISOString(), location: form.source, note: 'Delivery created' }],
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Delivery created successfully')
      onClose()
    } catch { toast.error('Failed to create delivery') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5"><Label>Related Type</Label>
        <Select value={form.relatedType} onValueChange={v => update('relatedType', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PURCHASE">Purchase</SelectItem>
            <SelectItem value="CONSIGNMENT">Consignment</SelectItem>
            <SelectItem value="INPUT_REQUEST">Input Request</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Related ID</Label><Input value={form.relatedId} onChange={e => update('relatedId', e.target.value)} placeholder="Reference ID" /></div>
      <div className="space-y-1.5"><Label>Product *</Label><Input value={form.product} onChange={e => update('product', e.target.value)} required /></div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => update('quantity', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Unit</Label>
          <Select value={form.unit} onValueChange={v => update('unit', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="kg">Kilograms</SelectItem><SelectItem value="bags">Bags</SelectItem><SelectItem value="pcs">Pieces</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Est. Days</Label><Input type="number" value={form.estimatedDays} onChange={e => update('estimatedDays', e.target.value)} /></div>
      </div>
      <div className="space-y-1.5"><Label>Source *</Label><Input value={form.source} onChange={e => update('source', e.target.value)} required /></div>
      <div className="space-y-1.5"><Label>Destination *</Label><Input value={form.destination} onChange={e => update('destination', e.target.value)} required /></div>
      <Separator />
      <p className="text-xs font-medium text-muted-foreground">Driver Information</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Driver Name</Label><Input value={form.driverName} onChange={e => update('driverName', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Vehicle Reg</Label><Input value={form.vehicleReg} onChange={e => update('vehicleReg', e.target.value)} placeholder="e.g., UAK 234A" /></div>
      </div>
      <div className="space-y-1.5"><Label>Driver Phone</Label><Input value={form.driverPhone} onChange={e => update('driverPhone', e.target.value)} placeholder="+256..." /></div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Delivery</Button>
      </DialogFooter>
    </form>
  )
}