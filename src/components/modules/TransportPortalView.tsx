'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Truck, Plus, Search, Filter, MapPin, Clock, CheckCircle, XCircle,
  User, Phone, Star, ChevronDown, ChevronUp, Eye, Ban,
  Navigation, Package, DollarSign, TrendingUp, AlertTriangle,
  Bike, Bus, TruckIcon, ArrowRightLeft, CircleDot,
  RefreshCw, MoreHorizontal, Download, ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

// ─── Types ────────────────────────────────────────────────────────────────

interface TransportSummary {
  totalTransporters: number
  activeTransporters: number
  totalVehicles: number
  availableVehicles: number
  totalRequests: number
  openRequests: number
  inProgressRequests: number
  completedRequests: number
  totalTrips: number
  activeTrips: number
  completedTrips: number
  totalRevenue: number
  totalCommission: number
  transporterEarnings: number
  averageRating: number
  requestStatusBreakdown: Record<string, number>
  tripStatusBreakdown: Record<string, number>
  vehicleTypeBreakdown: Record<string, number>
  topRoutes: { origin: string; destination: string; count: number }[]
}

interface TransportRequest {
  id: string
  requestCode: string
  requesterName: string
  requesterPhone: string
  requesterType: string
  pickupAddress: string
  pickupDistrict?: string
  dropoffAddress: string
  dropoffDistrict?: string
  commodityType: string
  commodityCategory: string
  weightKg?: number
  preferredVehicleType?: string
  isUrgent: boolean
  proposedBudget?: number
  estimatedCost?: number
  finalCost?: number
  status: string
  createdAt: string
  acceptedAt?: string | null
  pickupAt?: string | null
  deliveredAt?: string | null
  cancelledAt?: string | null
  trip?: { id: string; tripCode: string; status: string; driverName: string; driverPhone: string }
}

interface TransportTrip {
  id: string
  tripCode: string
  driverName: string
  driverPhone: string
  originAddress: string
  destinationAddress: string
  commodityType: string
  commodityCategory: string
  weightKg?: number
  agreedCost: number
  platformCommission: number
  transporterEarnings: number
  paymentStatus: string
  status: string
  assignedAt: string
  pickedUpAt?: string
  deliveredAt?: string
  estimatedDistanceKm?: number
  actualDistanceKm?: number
  transporter: { id: string; name: string; transporterCode: string; phone: string }
  vehicle: { id: string; plateNumber: string; vehicleType: string }
  request: { requestCode: string; requesterName: string; requesterPhone: string; commodityType: string }
}

interface Transporter {
  id: string
  transporterCode: string
  name: string
  type: string
  phone: string
  email?: string
  status: string
  isAvailable: boolean
  rating?: number
  totalTrips: number
  totalEarnings: number
  commissionRate?: number
  _count: { vehicles: number; trips: number }
}

interface TransportVehicle {
  id: string
  plateNumber: string
  vehicleType: string
  make?: string
  model?: string
  year?: number | null
  driverName: string
  driverPhone: string
  isActive: boolean
  isAvailable: boolean
  capacityKg?: number
  lastLatitude?: number
  lastLongitude?: number
  transporter: { id: string; name: string; transporterCode: string; status: string }
}

interface TransportCharge {
  id: string
  chargeType: string
  description?: string
  amount: number
  currency: string
  direction: string
  paymentStatus: string
  createdAt: string
  trip?: { id: string; tripCode: string; status: string }
  transporter?: { id: string; name: string; transporterCode: string }
}

// ─── Constants ────────────────────────────────────────────────────────────

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  MOTORBIKE: 'Motorbike',
  MINI_TRUCK: 'Mini Truck',
  PICKUP: 'Pickup',
  LORRY: 'Lorry',
  TRAILER: 'Trailer',
  VAN: 'Van',
}

const VEHICLE_TYPE_ICONS: Record<string, React.ElementType> = {
  MOTORBIKE: Bike,
  MINI_TRUCK: TruckIcon,
  PICKUP: TruckIcon,
  LORRY: Truck,
  TRAILER: Truck,
  VAN: Bus,
}

const REQUEST_STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  MATCHING: 'bg-yellow-100 text-yellow-800',
  MATCHED: 'bg-purple-100 text-purple-800',
  ACCEPTED: 'bg-indigo-100 text-indigo-800',
  PICKED_UP: 'bg-orange-100 text-orange-800',
  IN_TRANSIT: 'bg-cyan-100 text-cyan-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const TRIP_STATUS_COLORS: Record<string, string> = {
  ASSIGNED: 'bg-purple-100 text-purple-800',
  PICKED_UP: 'bg-orange-100 text-orange-800',
  IN_TRANSIT: 'bg-cyan-100 text-cyan-800',
  ARRIVED: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const TRANSPORTER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  VERIFIED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-red-100 text-red-800',
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = 'UGX') {
  if (currency === 'UGX') return `USh ${Math.round(amount).toLocaleString()}`
  if (currency === 'GHS') return `GH₵ ${Math.round(amount).toLocaleString()}`
  if (currency === 'KES') return `KSh ${Math.round(amount).toLocaleString()}`
  return `${currency} ${Math.round(amount).toLocaleString()}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function TransportPortalView() {
  const [tab, setTab] = useState('overview')
  const [summary, setSummary] = useState<TransportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/transport/summary')
      if (res.ok) {
        const json = await res.json()
        setSummary(json.data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6 text-emerald-600" />
            Transport & Logistics
          </h1>
          <p className="text-muted-foreground mt-1">
            Mini Uber for transporters — onboarding, ride requests, tracking &amp; commission
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSummary}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <NewRequestDialog onCreated={fetchSummary} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="requests" className="text-xs sm:text-sm">Requests</TabsTrigger>
          <TabsTrigger value="trips" className="text-xs sm:text-sm">Trips</TabsTrigger>
          <TabsTrigger value="transporters" className="text-xs sm:text-sm">Transporters</TabsTrigger>
          <TabsTrigger value="vehicles" className="text-xs sm:text-sm">Fleet</TabsTrigger>
          <TabsTrigger value="charges" className="text-xs sm:text-sm">Charges</TabsTrigger>
          <TabsTrigger value="tracking" className="text-xs sm:text-sm">Live Track</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab summary={summary} loading={loading} />
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <RequestsTab />
        </TabsContent>

        <TabsContent value="trips" className="space-y-4">
          <TripsTab />
        </TabsContent>

        <TabsContent value="transporters" className="space-y-4">
          <TransportersTab />
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4">
          <VehiclesTab />
        </TabsContent>

        <TabsContent value="charges" className="space-y-4">
          <ChargesTab />
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <TrackingTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab({ summary, loading }: { summary: TransportSummary | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!summary) return <p className="text-muted-foreground">Unable to load transport summary.</p>

  const kpis = [
    { label: 'Active Transporters', value: summary.activeTransporters, icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Available Vehicles', value: summary.availableVehicles, icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Open Requests', value: summary.openRequests, icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Active Trips', value: summary.activeTrips, icon: Navigation, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Total Revenue', value: formatCurrency(summary.totalRevenue), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Platform Commission', value: formatCurrency(summary.totalCommission), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Completed Trips', value: summary.completedTrips, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg. Rating', value: summary.averageRating > 0 ? `${summary.averageRating.toFixed(1)}/5` : 'N/A', icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold mt-1">{kpi.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Type Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fleet by Vehicle Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(summary.vehicleTypeBreakdown).map(([type, count]) => {
                const maxCount = Math.max(...Object.values(summary.vehicleTypeBreakdown))
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                const IconComp = VEHICLE_TYPE_ICONS[type] || Truck
                return (
                  <div key={type} className="flex items-center gap-3">
                    <IconComp className="h-4 w-4 text-muted-foreground w-6" />
                    <span className="text-sm w-24">{VEHICLE_TYPE_LABELS[type] || type}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Routes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Routes</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.topRoutes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed trips yet.</p>
            ) : (
              <div className="space-y-3">
                {summary.topRoutes.map((route, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <span className="text-xs font-mono text-muted-foreground w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{route.origin}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowRightLeft className="h-3 w-3" />
                        {route.destination}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{route.count} trips</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Pipeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Request Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(summary.requestStatusBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={REQUEST_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'} variant="secondary">
                        {status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <span className="font-semibold text-sm">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Trip Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trip Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(summary.tripStatusBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge className={TRIP_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'} variant="secondary">
                      {status.replace(/_/g, ' ')}
                    </Badge>
                    <span className="font-semibold text-sm">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUESTS TAB
// ═══════════════════════════════════════════════════════════════════════════

function RequestsTab() {
  const [requests, setRequests] = useState<TransportRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<TransportRequest | null>(null)
  const { toast } = useToast()

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '15' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/transport/requests?${params}`)
      if (res.ok) {
        const json = await res.json()
        setRequests(json.items)
        setTotalPages(json.totalPages)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [page, statusFilter, search])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleCancel = async (id: string, reason: string) => {
    const res = await fetch(`/api/transport/requests/${id}/cancel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) {
      toast({ title: 'Request cancelled' })
      fetchRequests()
    } else {
      const json = await res.json()
      toast({ title: 'Error', description: json.error, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search requests..." className="pl-9" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="MATCHING">Matching</SelectItem>
            <SelectItem value="MATCHED">Matched</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <NewRequestDialog onCreated={fetchRequests} />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Shipper</TableHead>
                <TableHead className="hidden md:table-cell">Route</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead>Est. Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No transport requests found.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedRequest(req)}>
                    <TableCell className="font-mono text-xs">{req.requestCode}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{req.requesterName}</p>
                        <p className="text-xs text-muted-foreground">{req.requesterType}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-xs max-w-[200px] truncate">
                        <p>{req.pickupDistrict || req.pickupAddress}</p>
                        <p className="text-muted-foreground">→ {req.dropoffDistrict || req.dropoffAddress}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{req.commodityType}</p>
                        <p className="text-xs text-muted-foreground">
                          {req.commodityCategory === 'AGRICULTURAL' ? 'Agri' : 'Non-Agri'}
                          {req.weightKg ? ` · ${req.weightKg}kg` : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {req.estimatedCost ? formatCurrency(req.estimatedCost) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={REQUEST_STATUS_COLORS[req.status] || ''} variant="secondary">
                        {req.isUrgent && <AlertTriangle className="h-3 w-3 mr-1 text-orange-500" />}
                        {req.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(req.createdAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedRequest(req)}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          {['OPEN', 'MATCHING', 'MATCHED'].includes(req.status) && (
                            <DropdownMenuItem className="text-red-600"
                              onClick={(e) => { e.stopPropagation(); handleCancel(req.id, 'Cancelled by admin') }}>
                              <Ban className="h-4 w-4 mr-2" /> Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Request Detail Dialog */}
      {selectedRequest && (
        <RequestDetailDialog request={selectedRequest} onClose={() => setSelectedRequest(null)} onRefresh={fetchRequests} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIPS TAB
// ═══════════════════════════════════════════════════════════════════════════

function TripsTab() {
  const [trips, setTrips] = useState<TransportTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '15' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/transport/trips?${params}`)
      if (res.ok) {
        const json = await res.json()
        setTrips(json.items)
        setTotalPages(json.totalPages)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [page, statusFilter, search])

  useEffect(() => { fetchTrips() }, [fetchTrips])

  const handleStatusUpdate = async (tripId: string, newStatus: string, extra: Record<string, any> = {}) => {
    const res = await fetch(`/api/transport/trips/${tripId}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, ...extra }),
    })
    if (res.ok) {
      toast({ title: `Trip ${newStatus.replace(/_/g, ' ').toLowerCase()}` })
      fetchTrips()
    } else {
      const json = await res.json()
      toast({ title: 'Error', description: json.error, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search trips..." className="pl-9" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ASSIGNED">Assigned</SelectItem>
            <SelectItem value="PICKED_UP">Picked Up</SelectItem>
            <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <MatchDialog onMatched={fetchTrips} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip Code</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead className="hidden lg:table-cell">Route</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : trips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No trips found.
                  </TableCell>
                </TableRow>
              ) : (
                trips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell className="font-mono text-xs">{trip.tripCode}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{trip.driverName}</p>
                        <p className="text-xs text-muted-foreground">{trip.driverPhone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-xs max-w-[200px] truncate">
                        <p>{trip.originAddress}</p>
                        <p className="text-muted-foreground">→ {trip.destinationAddress}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {trip.vehicle.plateNumber}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatCurrency(trip.agreedCost)}</TableCell>
                    <TableCell className="text-sm text-green-600">{formatCurrency(trip.transporterEarnings)}</TableCell>
                    <TableCell>
                      <Badge className={TRIP_STATUS_COLORS[trip.status] || ''} variant="secondary">
                        {trip.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {trip.status === 'ASSIGNED' && (
                            <DropdownMenuItem onClick={() => handleStatusUpdate(trip.id, 'PICKED_UP')}>
                              <Package className="h-4 w-4 mr-2" /> Mark Picked Up
                            </DropdownMenuItem>
                          )}
                          {trip.status === 'PICKED_UP' && (
                            <DropdownMenuItem onClick={() => handleStatusUpdate(trip.id, 'IN_TRANSIT')}>
                              <Navigation className="h-4 w-4 mr-2" /> Mark In Transit
                            </DropdownMenuItem>
                          )}
                          {trip.status === 'IN_TRANSIT' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusUpdate(trip.id, 'ARRIVED')}>
                                <MapPin className="h-4 w-4 mr-2" /> Mark Arrived
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusUpdate(trip.id, 'DELIVERED', {
                                deliveryNote: 'Delivered successfully',
                                podSignedBy: 'System',
                              })}>
                                <CheckCircle className="h-4 w-4 mr-2" /> Mark Delivered
                              </DropdownMenuItem>
                            </>
                          )}
                          {trip.status === 'ARRIVED' && (
                            <DropdownMenuItem onClick={() => handleStatusUpdate(trip.id, 'DELIVERED', {
                              deliveryNote: 'Delivered successfully',
                              podSignedBy: 'System',
                            })}>
                              <CheckCircle className="h-4 w-4 mr-2" /> Mark Delivered
                            </DropdownMenuItem>
                          )}
                          {!['DELIVERED', 'CANCELLED'].includes(trip.status) && (
                            <DropdownMenuItem className="text-red-600"
                              onClick={() => handleStatusUpdate(trip.id, 'CANCELLED', { cancelReason: 'Cancelled by admin' })}>
                              <Ban className="h-4 w-4 mr-2" /> Cancel Trip
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSPORTERS TAB
// ═══════════════════════════════════════════════════════════════════════════

function TransportersTab() {
  const [transporters, setTransporters] = useState<Transporter[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  const fetchTransporters = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '15' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/transport/transporters?${params}`)
      if (res.ok) {
        const json = await res.json()
        setTransporters(json.items)
        setTotalPages(json.totalPages)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [page, statusFilter, search])

  useEffect(() => { fetchTransporters() }, [fetchTransporters])

  const handleVerify = async (id: string, activate: boolean) => {
    const res = await fetch(`/api/transport/transporters/${id}/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activate }),
    })
    if (res.ok) {
      toast({ title: activate ? 'Transporter activated' : 'Transporter verified' })
      fetchTransporters()
    } else {
      const json = await res.json()
      toast({ title: 'Error', description: json.error, variant: 'destructive' })
    }
  }

  const handleSetStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/transport/transporters/${id}/status`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast({ title: `Transporter ${status.toLowerCase()}` })
      fetchTransporters()
    } else {
      const json = await res.json()
      toast({ title: 'Error', description: json.error, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search transporters..." className="pl-9" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="VERIFIED">Verified</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <NewTransporterDialog onCreated={fetchTransporters} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="hidden md:table-cell">Vehicles</TableHead>
                <TableHead className="hidden md:table-cell">Trips</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : transporters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No transporters found.
                  </TableCell>
                </TableRow>
              ) : (
                transporters.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.transporterCode}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                    <TableCell className="text-sm">{t.phone}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{t._count.vehicles}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{t.totalTrips}</TableCell>
                    <TableCell className="text-sm">
                      {t.rating ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          {t.rating.toFixed(1)}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={TRANSPORTER_STATUS_COLORS[t.status] || ''} variant="secondary">
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {t.status === 'PENDING' && (
                            <>
                              <DropdownMenuItem onClick={() => handleVerify(t.id, false)}>
                                <CheckCircle className="h-4 w-4 mr-2" /> Verify
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleVerify(t.id, true)}>
                                <CheckCircle className="h-4 w-4 mr-2" /> Verify &amp; Activate
                              </DropdownMenuItem>
                            </>
                          )}
                          {t.status === 'VERIFIED' && (
                            <DropdownMenuItem onClick={() => handleVerify(t.id, true)}>
                              <CheckCircle className="h-4 w-4 mr-2" /> Activate
                            </DropdownMenuItem>
                          )}
                          {t.status === 'ACTIVE' && (
                            <DropdownMenuItem onClick={() => handleSetStatus(t.id, 'SUSPENDED')}>
                              <Ban className="h-4 w-4 mr-2" /> Suspend
                            </DropdownMenuItem>
                          )}
                          {t.status === 'SUSPENDED' && (
                            <DropdownMenuItem onClick={() => handleSetStatus(t.id, 'ACTIVE')}>
                              <CheckCircle className="h-4 w-4 mr-2" /> Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// VEHICLES TAB
// ═══════════════════════════════════════════════════════════════════════════

function VehiclesTab() {
  const [vehicles, setVehicles] = useState<TransportVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '15' })
      if (typeFilter !== 'all') params.set('vehicleType', typeFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/transport/vehicles?${params}`)
      if (res.ok) {
        const json = await res.json()
        setVehicles(json.items)
        setTotalPages(json.totalPages)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [page, typeFilter, search])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vehicles..." className="pl-9" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Vehicle Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <NewVehicleDialog onCreated={fetchVehicles} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Make/Model</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead className="hidden md:table-cell">Capacity</TableHead>
                <TableHead>Transporter</TableHead>
                <TableHead>Availability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No vehicles found.
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((v) => {
                  const VIcon = VEHICLE_TYPE_ICONS[v.vehicleType] || Truck
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-sm font-medium">{v.plateNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <VIcon className="h-3 w-3" />
                          {VEHICLE_TYPE_LABELS[v.vehicleType] || v.vehicleType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {v.make || '—'} {v.model ? `· ${v.model}` : ''} {v.year ? `(${v.year})` : ''}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{v.driverName}</p>
                          <p className="text-xs text-muted-foreground">{v.driverPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {v.capacityKg ? `${v.capacityKg} kg` : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{v.transporter.name}</TableCell>
                      <TableCell>
                        {v.isAvailable ? (
                          <Badge className="bg-green-100 text-green-800" variant="secondary">Available</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800" variant="secondary">On Trip</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CHARGES TAB
// ═══════════════════════════════════════════════════════════════════════════

function ChargesTab() {
  const [charges, setCharges] = useState<TransportCharge[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCharges = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      const res = await fetch(`/api/transport/charges?${params}`)
      if (res.ok) {
        const json = await res.json()
        setCharges(json.items)
        setTotalPages(json.totalPages)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchCharges() }, [fetchCharges])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden md:table-cell">Transporter</TableHead>
                <TableHead className="hidden md:table-cell">Trip</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : charges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No charges yet.
                  </TableCell>
                </TableRow>
              ) : (
                charges.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{formatDate(c.createdAt)}</TableCell>
                    <TableCell><Badge variant="outline">{c.chargeType.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell>
                      <Badge className={c.direction === 'CREDIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} variant="secondary">
                        {c.direction}
                      </Badge>
                    </TableCell>
                    <TableCell className={c.direction === 'CREDIT' ? 'text-green-600 font-medium' : 'text-red-600'}>
                      {c.direction === 'CREDIT' ? '+' : '-'}{formatCurrency(c.amount, c.currency)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {c.transporter?.name || '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs font-mono">
                      {c.trip?.tripCode || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.paymentStatus === 'PAID' ? 'default' : 'secondary'}>
                        {c.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TRACKING TAB (Phase 2 placeholder)
// ═══════════════════════════════════════════════════════════════════════════

function TrackingTab() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-16 flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-emerald-50 rounded-full mb-4">
          <Navigation className="h-10 w-10 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold">Real-Time GPS Tracking</h3>
        <p className="text-muted-foreground mt-2 max-w-md">
          This feature will enable live map tracking of transporters in real-time,
          similar to Uber. You&apos;ll be able to see truck movement, estimated arrival times,
          and route history. WebSocket integration coming in Phase 2.
        </p>
        <div className="flex gap-2 mt-4">
          <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> Live Map</Badge>
          <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> ETA</Badge>
          <Badge variant="outline" className="gap-1"><Navigation className="h-3 w-3" /> Route History</Badge>
          <Badge variant="outline" className="gap-1"><CircleDot className="h-3 w-3" /> Geofencing</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Backend infrastructure is ready (TripTrackingEvent model + API).
          Phase 2 will add WebSocket push and map visualization.
        </p>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// DIALOGS
// ═══════════════════════════════════════════════════════════════════════════

function NewRequestDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const user = useAppStore(s => s.user)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)

    try {
      const body: Record<string, any> = {
        requestedBy: user?.userId || 'system',
        requesterName: fd.get('requesterName'),
        requesterPhone: fd.get('requesterPhone'),
        requesterType: fd.get('requesterType'),
        pickupAddress: fd.get('pickupAddress'),
        dropoffAddress: fd.get('dropoffAddress'),
        commodityType: fd.get('commodityType'),
        commodityCategory: fd.get('commodityCategory'),
      }

      if (fd.get('pickupDistrict')) body.pickupDistrict = fd.get('pickupDistrict')
      if (fd.get('dropoffDistrict')) body.dropoffDistrict = fd.get('dropoffDistrict')
      if (fd.get('weightKg')) body.weightKg = parseFloat(fd.get('weightKg') as string)
      if (fd.get('preferredVehicleType') && fd.get('preferredVehicleType') !== 'ANY') {
        body.preferredVehicleType = fd.get('preferredVehicleType')
      }
      if (fd.get('proposedBudget')) body.proposedBudget = parseFloat(fd.get('proposedBudget') as string)
      if (fd.get('isUrgent') === 'on') body.isUrgent = true
      if (fd.get('requestedPickupTime')) body.requestedPickupTime = fd.get('requestedPickupTime')

      const res = await fetch('/api/transport/requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        toast({ title: 'Transport request created' })
        setOpen(false)
        onCreated()
      } else {
        const json = await res.json()
        toast({ title: 'Error', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create request', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Request</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Transport Request</DialogTitle>
          <DialogDescription>Create a request for transport. System will estimate cost and find available transporters.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Requester Name *</Label>
              <Input name="requesterName" required />
            </div>
            <div className="space-y-1">
              <Label>Phone *</Label>
              <Input name="requesterPhone" required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Requester Type *</Label>
            <Select name="requesterType" required>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPORTER">Exporter</SelectItem>
                <SelectItem value="COOPERATIVE">Cooperative</SelectItem>
                <SelectItem value="AGENT">Agent</SelectItem>
                <SelectItem value="FARMER">Farmer</SelectItem>
                <SelectItem value="COMPANY">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><MapPin className="h-4 w-4 text-emerald-600" /> Pickup</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Address *</Label>
                <Input name="pickupAddress" required placeholder="Farm gate, warehouse, etc." />
              </div>
              <div className="space-y-1">
                <Label>District</Label>
                <Input name="pickupDistrict" placeholder="e.g. Mukono" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><MapPin className="h-4 w-4 text-red-600" /> Drop-off</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Address *</Label>
                <Input name="dropoffAddress" required placeholder="Processing plant, market, port, etc." />
              </div>
              <div className="space-y-1">
                <Label>District</Label>
                <Input name="dropoffDistrict" placeholder="e.g. Kampala" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><Package className="h-4 w-4" /> Cargo</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Commodity *</Label>
                <Input name="commodityType" required placeholder="e.g. Maize, Coffee" />
              </div>
              <div className="space-y-1">
                <Label>Category *</Label>
                <Select name="commodityCategory" required>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGRICULTURAL">Agricultural</SelectItem>
                    <SelectItem value="NON_AGRICULTURAL">Non-Agricultural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Weight (kg)</Label>
                <Input name="weightKg" type="number" placeholder="500" />
              </div>
              <div className="space-y-1">
                <Label>Preferred Vehicle</Label>
                <Select name="preferredVehicleType">
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Any Vehicle</SelectItem>
                    {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Proposed Budget (UGX)</Label>
              <Input name="proposedBudget" type="number" placeholder="Leave blank for auto-estimate" />
            </div>
            <div className="space-y-1">
              <Label>Pickup Time</Label>
              <Input name="requestedPickupTime" type="datetime-local" />
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <input type="checkbox" id="isUrgent" name="isUrgent" className="rounded" />
              <Label htmlFor="isUrgent" className="text-sm text-orange-600 font-medium">
                Mark as Urgent (30% surcharge applies)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NewTransporterDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)

    try {
      const body: Record<string, any> = {
        name: fd.get('name'),
        type: fd.get('type'),
        phone: fd.get('phone'),
      }
      if (fd.get('email')) body.email = fd.get('email')
      if (fd.get('nationalIdNo')) body.nationalIdNo = fd.get('nationalIdNo')
      if (fd.get('commissionRate')) body.commissionRate = parseFloat(fd.get('commissionRate') as string)

      const res = await fetch('/api/transport/transporters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        toast({ title: 'Transporter registered' })
        setOpen(false)
        onCreated()
      } else {
        const json = await res.json()
        toast({ title: 'Error', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to register transporter', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Transporter</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register Transporter</DialogTitle>
          <DialogDescription>Add a new individual or company transporter to the platform.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input name="name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type *</Label>
              <Select name="type" required>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  <SelectItem value="COMPANY">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Phone *</Label>
              <Input name="phone" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input name="email" type="email" />
            </div>
            <div className="space-y-1">
              <Label>National ID No.</Label>
              <Input name="nationalIdNo" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Commission Rate (%)</Label>
            <Input name="commissionRate" type="number" step="0.1" placeholder="Default: 10%" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NewVehicleDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [transporters, setTransporters] = useState<{ id: string; name: string; transporterCode: string; status: string }[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetch('/api/transport/transporters?pageSize=100&status=ACTIVE')
      .then(r => r.ok ? r.json() : { items: [] })
      .then(json => setTransporters(json.items || []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)

    try {
      const body: Record<string, any> = {
        transporterId: fd.get('transporterId'),
        plateNumber: fd.get('plateNumber'),
        vehicleType: fd.get('vehicleType'),
        driverName: fd.get('driverName'),
        driverPhone: fd.get('driverPhone'),
      }
      if (fd.get('make')) body.make = fd.get('make')
      if (fd.get('model')) body.model = fd.get('model')
      if (fd.get('year')) body.year = parseInt(fd.get('year') as string)
      if (fd.get('capacityKg')) body.capacityKg = parseFloat(fd.get('capacityKg') as string)
      if (fd.get('driverLicenseNo')) body.driverLicenseNo = fd.get('driverLicenseNo')

      const res = await fetch('/api/transport/vehicles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        toast({ title: 'Vehicle registered' })
        setOpen(false)
        onCreated()
      } else {
        const json = await res.json()
        toast({ title: 'Error', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to register vehicle', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Vehicle</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register Vehicle</DialogTitle>
          <DialogDescription>Add a vehicle to an existing transporter.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Transporter *</Label>
            <Select name="transporterId" required>
              <SelectTrigger><SelectValue placeholder="Select transporter" /></SelectTrigger>
              <SelectContent>
                {transporters.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.transporterCode} — {t.name}</SelectItem>
                ))}
                {transporters.length === 0 && <SelectItem value="none" disabled>No active transporters</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Plate Number *</Label>
              <Input name="plateNumber" required placeholder="UAB 123A" />
            </div>
            <div className="space-y-1">
              <Label>Vehicle Type *</Label>
              <Select name="vehicleType" required>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Make</Label>
              <Input name="make" placeholder="Toyota" />
            </div>
            <div className="space-y-1">
              <Label>Model</Label>
              <Input name="model" placeholder="Hilux" />
            </div>
            <div className="space-y-1">
              <Label>Year</Label>
              <Input name="year" type="number" placeholder="2020" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Capacity (kg)</Label>
              <Input name="capacityKg" type="number" placeholder="5000" />
            </div>
            <div className="space-y-1">
              <Label>Driver License No.</Label>
              <Input name="driverLicenseNo" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Driver Name *</Label>
              <Input name="driverName" required />
            </div>
            <div className="space-y-1">
              <Label>Driver Phone *</Label>
              <Input name="driverPhone" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MatchDialog({ onMatched }: { onMatched: () => void }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState<TransportRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState('')
  const [transporters, setTransporters] = useState<{ id: string; name: string; transporterCode: string }[]>([])
  const [vehicles, setVehicles] = useState<{ id: string; plateNumber: string; vehicleType: string; isAvailable: boolean }[]>([])
  const { toast } = useToast()

  useEffect(() => {
    Promise.all([
      fetch('/api/transport/requests?status=OPEN,MATCHING&pageSize=50').then(r => r.ok ? r.json() : { items: [] }),
      fetch('/api/transport/transporters?status=ACTIVE,VERIFIED&pageSize=100').then(r => r.ok ? r.json() : { items: [] }),
    ]).then(([reqJson, transJson]) => {
      setRequests(reqJson.items || [])
      setTransporters(transJson.items || [])
    }).catch(() => {})
  }, [])

  const handleTransporterChange = async (transporterId: string) => {
    setSelectedRequest('')
    const res = await fetch(`/api/transport/vehicles?transporterId=${transporterId}&pageSize=50`)
    if (res.ok) {
      const json = await res.json()
      setVehicles(json.items || [])
    }
  }

  const handleRequestChange = (requestId: string) => {
    const req = requests.find(r => r.id === requestId)
    if (req) setSelectedRequest(req.estimatedCost ? String(req.estimatedCost) : '')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)

    try {
      const res = await fetch('/api/transport/match', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: fd.get('requestId'),
          transporterId: fd.get('transporterId'),
          vehicleId: fd.get('vehicleId'),
          agreedCost: parseFloat(fd.get('agreedCost') as string),
        }),
      })
      if (res.ok) {
        toast({ title: 'Transporter matched to request' })
        setOpen(false)
        onMatched()
      } else {
        const json = await res.json()
        toast({ title: 'Error', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to match', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><ArrowRightLeft className="h-4 w-4 mr-1" /> Match Request</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Match Transporter to Request</DialogTitle>
          <DialogDescription>Assign a transporter and vehicle to an open transport request.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Transport Request *</Label>
            <Select name="requestId" required onValueChange={handleRequestChange}>
              <SelectTrigger><SelectValue placeholder="Select request" /></SelectTrigger>
              <SelectContent>
                {requests.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.requestCode} — {r.pickupDistrict || 'Pickup'} → {r.dropoffDistrict || 'Dropoff'} ({r.commodityType})
                  </SelectItem>
                ))}
                {requests.length === 0 && <SelectItem value="none" disabled>No open requests</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Transporter *</Label>
            <Select name="transporterId" required onValueChange={handleTransporterChange}>
              <SelectTrigger><SelectValue placeholder="Select transporter" /></SelectTrigger>
              <SelectContent>
                {transporters.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.transporterCode} — {t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Vehicle *</Label>
            <Select name="vehicleId" required>
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                {vehicles.filter(v => v.isAvailable).map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plateNumber} ({VEHICLE_TYPE_LABELS[v.vehicleType] || v.vehicleType})
                  </SelectItem>
                ))}
                {vehicles.filter(v => v.isAvailable).length === 0 && (
                  <SelectItem value="none" disabled>No available vehicles</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Agreed Cost (UGX) *</Label>
            <Input name="agreedCost" type="number" required defaultValue={selectedRequest} placeholder="Negotiated amount" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Matching...' : 'Match &amp; Create Trip'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RequestDetailDialog({ request, onClose, onRefresh }: {
  request: TransportRequest
  onClose: () => void
  onRefresh: () => void
}) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const { toast } = useToast()

  const handleCancel = async () => {
    const res = await fetch(`/api/transport/requests/${request.id}/cancel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: cancelReason }),
    })
    if (res.ok) {
      toast({ title: 'Request cancelled' })
      setCancelOpen(false)
      onClose()
      onRefresh()
    } else {
      const json = await res.json()
      toast({ title: 'Error', description: json.error, variant: 'destructive' })
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {request.requestCode}
            <Badge className={REQUEST_STATUS_COLORS[request.status] || ''} variant="secondary">
              {request.status.replace(/_/g, ' ')}
            </Badge>
            {request.isUrgent && <Badge className="bg-orange-100 text-orange-800" variant="secondary">Urgent</Badge>}
          </DialogTitle>
          <DialogDescription>Transport request details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Shipper */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Shipper</p>
              <p className="text-sm font-medium">{request.requesterName}</p>
              <p className="text-xs">{request.requesterPhone} · {request.requesterType}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Commodity</p>
              <p className="text-sm font-medium">{request.commodityType}</p>
              <p className="text-xs">{request.commodityCategory === 'AGRICULTURAL' ? 'Agricultural' : 'Non-Agricultural'}
                {request.weightKg ? ` · ${request.weightKg} kg` : ''}</p>
            </div>
          </div>

          {/* Route */}
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
              <div>
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="text-sm">{request.pickupAddress}</p>
                {request.pickupDistrict && <p className="text-xs text-muted-foreground">{request.pickupDistrict}</p>}
              </div>
            </div>
            <div className="ml-1 border-l-2 border-dashed h-4" />
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
              <div>
                <p className="text-xs text-muted-foreground">Drop-off</p>
                <p className="text-sm">{request.dropoffAddress}</p>
                {request.dropoffDistrict && <p className="text-xs text-muted-foreground">{request.dropoffDistrict}</p>}
              </div>
            </div>
          </div>

          {/* Cost */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Estimated</p>
              <p className="text-sm font-medium">{request.estimatedCost ? formatCurrency(request.estimatedCost) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proposed Budget</p>
              <p className="text-sm font-medium">{request.proposedBudget ? formatCurrency(request.proposedBudget) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Final Cost</p>
              <p className="text-sm font-medium">{request.finalCost ? formatCurrency(request.finalCost) : '—'}</p>
            </div>
          </div>

          {/* Vehicle Preference */}
          {request.preferredVehicleType && (
            <div>
              <p className="text-xs text-muted-foreground">Preferred Vehicle</p>
              <Badge variant="outline">{VEHICLE_TYPE_LABELS[request.preferredVehicleType] || request.preferredVehicleType}</Badge>
            </div>
          )}

          {/* Trip info if matched */}
          {request.trip && (
            <div className="border rounded-lg p-3 bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Assigned Trip</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-medium">{request.trip.tripCode}</p>
                  <p className="text-xs">{request.trip.driverName} · {request.trip.driverPhone}</p>
                </div>
                <Badge className={TRIP_STATUS_COLORS[request.trip.status] || ''} variant="secondary">
                  {request.trip.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <p>Created: {formatDateTime(request.createdAt)}</p>
            </div>
            {request.acceptedAt && <p>Accepted: {formatDateTime(request.acceptedAt)}</p>}
            {request.pickupAt && <p>Pickup: {formatDateTime(request.pickupAt)}</p>}
            {request.deliveredAt && <p>Delivered: {formatDateTime(request.deliveredAt)}</p>}
            {request.cancelledAt && <p>Cancelled: {formatDateTime(request.cancelledAt)}</p>}
          </div>
        </div>

        <DialogFooter>
          {['OPEN', 'MATCHING', 'MATCHED'].includes(request.status) && (
            <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
              <Ban className="h-4 w-4 mr-1" /> Cancel Request
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>

        {/* Cancel sub-dialog */}
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Cancel Request</DialogTitle>
              <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <Textarea placeholder="Reason for cancellation..." value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelOpen(false)}>Back</Button>
              <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim()}>
                Confirm Cancellation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}