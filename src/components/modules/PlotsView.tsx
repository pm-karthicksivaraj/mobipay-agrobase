'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  MapPin, Search, Plus, Filter, CheckCircle, AlertTriangle, Shield,
  Satellite, Eye, FileText, TrendingUp, Loader2, X, ChevronDown,
  Layers, Leaf, TreePine, BarChart3, ArrowRight, Globe, Scan,
  Download, RefreshCw, ChevronRight, Camera
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import dynamic from 'next/dynamic'

// Leaflet map — dynamically imported to avoid SSR issues
const PlotMap = dynamic(() => import('@/components/plots/PlotMap'), { ssr: false, loading: () => (
  <div className="bg-muted/30 rounded-lg border flex items-center justify-center" style={{ height: 500 }}>
    <div className="flex flex-col items-center gap-2"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Loading map...</span></div>
  </div>
) })
const EudrEvidencePanel = dynamic(() => import('@/components/plots/EudrEvidencePanel'), { ssr: false })

// ─── Types ───────────────────────────────────────────────────────────────

interface PlotSummary {
  id: string; plotCode: string; name: string; farmerName: string
  areaHectares: number | null; centroidLat: number | null; centroidLng: number | null
  verificationStatus: string; eudrRiskLevel: string; plotType: string
  seasonCount: number; batchCount: number; isActive: boolean; createdAt: string
}

interface PlotStats {
  totalPlots: number; verifiedPlots: number; verificationRate: number
  totalAreaHectares: number; deforestationFreePlots: number; deforestationFreeRate: number
  plotsByRisk: Record<string, number>; plotsByStatus: Record<string, number>; plotsByCrop: Record<string, number>
}

interface PlotDetail extends PlotSummary {
  farmerId: string | null; farmLandId: string | null; description: string | null
  boundaryGeoJson: string | null; soilType: string | null; elevationM: number | null
  slopePercent: number | null; irrigationType: string | null
  verificationMethod: string | null; verificationScore: number | null
  verifiedBy: string | null; verifiedAt: string | null
  deforestationFree: boolean; lastSatelliteCheck: string | null
  landOwnership: string | null; tags: string[] | null
  seasons: any[]; recentVerifications: any[]; recentDocuments: any[]
}

// ─── Constants ───────────────────────────────────────────────────────────

const VERIFY_STATUS_COLORS: Record<string, string> = {
  UNVERIFIED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  GPS_VERIFIED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  SATELLITE_VERIFIED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  FIELD_AUDITED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  VERIFIED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  UNKNOWN: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#6b7280']

const VERIFY_STEPS = [
  { key: 'UNVERIFIED', label: 'Unverified', icon: <MapPin className="w-4 h-4" /> },
  { key: 'GPS_VERIFIED', label: 'GPS Verified', icon: <Satellite className="w-4 h-4" /> },
  { key: 'SATELLITE_VERIFIED', label: 'Satellite Checked', icon: <Globe className="w-4 h-4" /> },
  { key: 'FIELD_AUDITED', label: 'Field Audited', icon: <Eye className="w-4 h-4" /> },
  { key: 'VERIFIED', label: 'Fully Verified', icon: <CheckCircle className="w-4 h-4" /> },
]

// ─── Component ───────────────────────────────────────────────────────────

export function PlotsView() {
  const [activeTab, setActiveTab] = useState('overview')
  const [plots, setPlots] = useState<PlotSummary[]>([])
  const [stats, setStats] = useState<PlotStats | null>(null)
  const [selectedPlot, setSelectedPlot] = useState<PlotDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterRisk, setFilterRisk] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showVerifyDialog, setShowVerifyDialog] = useState(false)

  const fetchPlots = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (search) params.set('search', search)
      if (filterStatus !== 'all') params.set('verificationStatus', filterStatus)
      if (filterRisk !== 'all') params.set('eudrRiskLevel', filterRisk)

      const res = await fetch(`/api/plots?${params}`)
      const data = await res.json()
      setPlots(data.plots || [])
      setTotal(data.total || 0)
    } catch {
      toast.error('Failed to load plots')
    } finally {
      setLoading(false)
    }
  }, [search, filterStatus, filterRisk, page])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/plots/stats')
      const data = await res.json()
      setStats(data)
    } catch { /* silent */ }
  }, [])

  const fetchPlotDetail = useCallback(async (plotId: string) => {
    try {
      const res = await fetch(`/api/plots/${plotId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedPlot(data)
      }
    } catch {
      toast.error('Failed to load plot details')
    }
  }, [])

  useEffect(() => { fetchPlots(); fetchStats() }, [fetchPlots, fetchStats])

  const handleVerify = async (plotId: string, type: string, result: string) => {
    try {
      const res = await fetch(`/api/plots/${plotId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationType: type, result, notes: `Verified via ${type}` }),
      })
      if (res.ok) {
        toast.success('Plot verified successfully')
        setShowVerifyDialog(false)
        fetchPlots()
        if (selectedPlot?.id === plotId) fetchPlotDetail(plotId)
        fetchStats()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Verification failed')
      }
    } catch {
      toast.error('Verification request failed')
    }
  }

  const getVerifyStepIndex = (status: string) => VERIFY_STEPS.findIndex(s => s.key === status)

  // ─── Render Helpers ─────────────────────────────────────────────────

  const statusChartData = stats ? Object.entries(stats.plotsByStatus).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v })) : []
  const riskChartData = stats ? Object.entries(stats.plotsByRisk).map(([k, v]) => ({ name: k, value: v })) : []
  const cropChartData = stats ? Object.entries(stats.plotsByCrop).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value).slice(0, 6) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-600" />
            Plot-Level Traceability
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            GPS-verified plot boundaries, EUDR compliance, and full supply chain traceability
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchPlots(); fetchStats() }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="list">All Plots</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="eudr">EUDR Evidence</TabsTrigger>
          <TabsTrigger value="verify">Verification</TabsTrigger>
        </TabsList>

        {/* ═══════ OVERVIEW TAB ═══════ */}
        <TabsContent value="overview" className="space-y-6">
          {stats ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Plots</p>
                        <p className="text-3xl font-bold">{stats.totalPlots}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stats.totalAreaHectares} ha total</p>
                      </div>
                      <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <Layers className="w-5 h-5 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Verified Plots</p>
                        <p className="text-3xl font-bold">{stats.verifiedPlots}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stats.verificationRate}% rate</p>
                      </div>
                      <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Deforestation-Free</p>
                        <p className="text-3xl font-bold">{stats.deforestationFreePlots}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stats.deforestationFreeRate}% compliant</p>
                      </div>
                      <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                        <TreePine className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">High Risk Plots</p>
                        <p className="text-3xl font-bold text-red-600">{stats.plotsByRisk.HIGH || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">need attention</p>
                      </div>
                      <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Verification Progress Bar */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Verification Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 mb-3">
                    {VERIFY_STEPS.map((step, i) => {
                      const count = stats.plotsByStatus[step.key] || 0
                      return (
                        <React.Fragment key={step.key}>
                          {i > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                          <div className="flex-1 text-center">
                            <div className="flex items-center justify-center gap-1 mb-1 text-muted-foreground">
                              {step.icon}
                              <span className="text-xs font-medium">{step.label}</span>
                            </div>
                            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'absolute inset-y-0 left-0 rounded-full transition-all',
                                  step.key === 'VERIFIED' ? 'bg-emerald-500' :
                                  step.key === 'FIELD_AUDITED' ? 'bg-amber-500' :
                                  step.key === 'SATELLITE_VERIFIED' ? 'bg-purple-500' :
                                  step.key === 'GPS_VERIFIED' ? 'bg-blue-500' : 'bg-gray-400'
                                )}
                                style={{ width: stats.totalPlots > 0 ? `${(count / stats.totalPlots) * 100}%` : '0%' }}
                              />
                            </div>
                            <span className="text-xs font-semibold mt-1 block">{count}</span>
                          </div>
                        </React.Fragment>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">By Verification Status</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${value}`}>
                          {statusChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">By EUDR Risk Level</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={riskChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Top Crops</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={cropChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" fontSize={11} />
                        <YAxis dataKey="name" type="category" fontSize={11} width={70} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          )}
        </TabsContent>

        {/* ═══════ ALL PLOTS TAB ═══════ */}
        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search plots by name, code, or farmer..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1) }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Verification" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                <SelectItem value="GPS_VERIFIED">GPS Verified</SelectItem>
                <SelectItem value="SATELLITE_VERIFIED">Satellite Verified</SelectItem>
                <SelectItem value="FIELD_AUDITED">Field Audited</SelectItem>
                <SelectItem value="VERIFIED">Fully Verified</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRisk} onValueChange={(v) => { setFilterRisk(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Risk Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risks</SelectItem>
                <SelectItem value="LOW">Low Risk</SelectItem>
                <SelectItem value="MEDIUM">Medium Risk</SelectItem>
                <SelectItem value="HIGH">High Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plot Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead className="text-right">Area (ha)</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>EUDR Risk</TableHead>
                    <TableHead className="text-right">Seasons</TableHead>
                    <TableHead className="text-right">Batches</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>)}
                      </TableRow>
                    ))
                  ) : plots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="font-medium">No plots found</p>
                        <p className="text-sm">Create your first plot to start building plot-level traceability</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    plots.map(plot => (
                      <TableRow key={plot.id} className="cursor-pointer hover:bg-muted/50" onClick={() => fetchPlotDetail(plot.id)}>
                        <TableCell className="font-mono text-sm">{plot.plotCode}</TableCell>
                        <TableCell className="font-medium">{plot.name}</TableCell>
                        <TableCell className="text-muted-foreground">{plot.farmerName}</TableCell>
                        <TableCell className="text-right">{plot.areaHectares?.toFixed(2) ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn('text-xs', VERIFY_STATUS_COLORS[plot.verificationStatus])}>
                            {plot.verificationStatus.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn('text-xs', RISK_COLORS[plot.eudrRiskLevel])}>
                            {plot.eudrRiskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{plot.seasonCount}</TableCell>
                        <TableCell className="text-right">{plot.batchCount}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}

          {/* Plot Detail Drawer */}
          {selectedPlot && <PlotDetailPanel plot={selectedPlot} onClose={() => setSelectedPlot(null)} onVerify={(type, result) => handleVerify(selectedPlot.id, type, result)} />}
        </TabsContent>

        {/* ═══════ MAP TAB ═══════ */}
        <TabsContent value="map" className="space-y-4">
          <PlotMap
            onSelectPlot={(plotId) => fetchPlotDetail(plotId)}
            height="calc(100vh - 220px)"
          />
        </TabsContent>

        {/* ═══════ EUDR EVIDENCE TAB ═══════ */}
        <TabsContent value="eudr" className="space-y-4">
          {selectedPlot ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  {selectedPlot.plotCode} — EUDR Evidence Pack
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EudrEvidencePanel plotId={selectedPlot.id} plotCode={selectedPlot.plotCode} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground">Select a Plot</p>
                <p className="text-sm text-muted-foreground mt-1">Click a plot from the list or map to view its EUDR evidence pack, risk assessment, and compliance status.</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab('list')}>View All Plots</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════ VERIFY TAB ═══════ */}
        <TabsContent value="verify" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Unverified Plots */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Needs Verification</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {plots.filter(p => p.verificationStatus !== 'VERIFIED').length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">All plots are verified!</p>
                ) : (
                  plots.filter(p => p.verificationStatus !== 'VERIFIED').slice(0, 8).map(plot => (
                    <div key={plot.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer" onClick={() => fetchPlotDetail(plot.id)}>
                      <div className="flex items-center gap-3">
                        <div className={cn('w-2 h-2 rounded-full',
                          plot.eudrRiskLevel === 'HIGH' ? 'bg-red-500' :
                          plot.eudrRiskLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                        )} />
                        <div>
                          <p className="text-sm font-medium">{plot.plotCode}</p>
                          <p className="text-xs text-muted-foreground">{plot.name} — {plot.farmerName}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={cn('text-xs', VERIFY_STATUS_COLORS[plot.verificationStatus])}>
                        {plot.verificationStatus.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Verification Actions */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" /> Quick Verify</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Click a plot above, then use these quick verification actions.</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'GPS', label: 'GPS Verify', icon: <Satellite className="w-4 h-4" />, desc: 'Verify GPS boundary' },
                    { type: 'SATELLITE', label: 'Satellite Check', icon: <Globe className="w-4 h-4" />, desc: 'Satellite imagery check' },
                    { type: 'DRONE', label: 'Drone Survey', icon: <Camera className="w-4 h-4" />, desc: 'Drone-based verification' },
                    { type: 'FIELD_AUDIT', label: 'Field Audit', icon: <Scan className="w-4 h-4" />, desc: 'On-site field verification' },
                  ].map(action => (
                    <Button
                      key={action.type}
                      variant="outline"
                      className="h-auto p-3 flex flex-col items-center gap-1 text-xs"
                      disabled={!selectedPlot}
                      onClick={() => handleVerify(selectedPlot!.id, action.type, 'PASSED')}
                    >
                      {action.icon}
                      <span className="font-medium">{action.label}</span>
                      <span className="text-muted-foreground text-[10px]">{action.desc}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Plot Detail Panel ───────────────────────────────────────────────────

function PlotDetailPanel({ plot, onClose, onVerify }: {
  plot: PlotDetail; onClose: () => void; onVerify: (type: string, result: string) => void
}) {
  const [traceChain, setTraceChain] = useState<any>(null)
  const [loadingTrace, setLoadingTrace] = useState(false)

  useEffect(() => {
    setLoadingTrace(true)
    fetch(`/api/plots/${plot.id}/traceability`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setTraceChain(data); setLoadingTrace(false) })
      .catch(() => setLoadingTrace(false))
  }, [plot.id])

  const currentStep = VERIFY_STEPS.findIndex(s => s.key === plot.verificationStatus)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-background rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{plot.plotCode}</h2>
            <p className="text-sm text-muted-foreground">{plot.name} — {plot.farmerName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Verification Pipeline */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Verification Progress</h3>
            <div className="flex items-center gap-1">
              {VERIFY_STEPS.map((step, i) => (
                <React.Fragment key={step.key}>
                  <div className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    i <= currentStep
                      ? step.key === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {step.icon}
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {i < VERIFY_STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Area</p>
              <p className="text-lg font-bold">{plot.areaHectares?.toFixed(2) ?? '—'}<span className="text-xs font-normal"> ha</span></p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Risk Level</p>
              <Badge variant="secondary" className={cn('mt-1', RISK_COLORS[plot.eudrRiskLevel])}>{plot.eudrRiskLevel}</Badge>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Deforestation</p>
              <p className={cn('text-lg font-bold', plot.deforestationFree ? 'text-emerald-600' : 'text-red-600')}>
                {plot.deforestationFree ? 'Clear' : 'At Risk'}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="text-lg font-bold">{plot.verificationScore ?? '—'}<span className="text-xs font-normal">%</span></p>
            </div>
          </div>

          {/* Plot Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Soil:</span> {plot.soilType || '—'}</div>
            <div><span className="text-muted-foreground">Irrigation:</span> {plot.irrigationType || '—'}</div>
            <div><span className="text-muted-foreground">Elevation:</span> {plot.elevationM ? `${plot.elevationM}m` : '—'}</div>
            <div><span className="text-muted-foreground">Land:</span> {plot.landOwnership || '—'}</div>
          </div>

          {/* Seasons */}
          {plot.seasons.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Seasons ({plot.seasons.length})</h3>
              <div className="space-y-2">
                {plot.seasons.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                    <div>
                      <span className="font-medium">{s.season}</span>
                      <span className="text-muted-foreground ml-2">{s.cropType} {s.variety ? `(${s.variety})` : ''}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{s.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Traceability Chain */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <ArrowRight className="w-4 h-4" /> Traceability Chain
            </h3>
            {loadingTrace ? (
              <Skeleton className="h-24" />
            ) : traceChain?.seasons?.length > 0 ? (
              <div className="space-y-3">
                {traceChain.seasons.map((s: any) => (
                  <div key={s.season} className="border rounded-lg p-3">
                    <p className="text-sm font-medium">{s.season} — {s.cropType}</p>
                    {s.batches.length > 0 ? s.batches.map((b: any) => (
                      <div key={b.batchId} className="mt-2 ml-4 text-xs space-y-1">
                        <p className="font-mono text-blue-600">{b.batchId}</p>
                        <p>{b.quantityKg} kg — {b.status}</p>
                        {b.events.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {b.events.map((e: any, i: number) => (
                              <span key={i} className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                                {e.eventType} @ {e.locationName || '—'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )) : <p className="text-xs text-muted-foreground ml-4 mt-1">No batches linked yet</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No traceability data yet. Link product batches to this plot.</p>
            )}
          </div>

          {/* Recent Verifications */}
          {plot.recentVerifications.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Recent Verifications</h3>
              <div className="space-y-2">
                {plot.recentVerifications.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                    <div>
                      <span className="font-medium">{v.verificationType}</span>
                      <Badge variant={v.result === 'PASSED' ? 'default' : 'destructive'} className="ml-2 text-xs">{v.result}</Badge>
                      {v.boundaryMatchPercent && <span className="text-xs text-muted-foreground ml-2">{v.boundaryMatchPercent}% match</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{v.verifiedAt ? new Date(v.verifiedAt).toLocaleDateString() : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verify Actions */}
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-2">Quick Verify</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { type: 'GPS', label: 'GPS', icon: <Satellite className="w-3 h-3" /> },
                { type: 'SATELLITE', label: 'Satellite', icon: <Globe className="w-3 h-3" /> },
                { type: 'FIELD_AUDIT', label: 'Field Audit', icon: <Eye className="w-3 h-3" /> },
              ].map(action => (
                <Button key={action.type} size="sm" variant="outline" className="gap-1" onClick={() => onVerify(action.type, 'PASSED')}>
                  {action.icon} {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlotsView