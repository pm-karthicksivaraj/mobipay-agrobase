'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Shield, Search, Plus, X, Loader2, Filter, AlertTriangle,
  CheckCircle, Clock, FileText, Leaf, Globe, Award, TreePine,
  AlertCircle, ChevronRight, Eye, MapPin, Calendar
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

// ─── EUDR Types ───
interface EUDRRecord {
  id: string
  farmerName: string
  plotId: string
  area: number
  deforestationFree: boolean
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED'
  geoCoordinates?: string
  lastChecked: string
  notes?: string
}

// ─── CBAM Types ───
interface CBAMReport {
  id: string
  farmerName: string
  period: string
  commodity: string
  emissions: number
  status: 'VERIFIED' | 'PENDING' | 'REJECTED'
  submittedAt: string
  verifiedAt?: string
}

// ─── Rainforest Alliance Types ───
interface RACertification {
  id: string
  farmerName: string
  certificateNumber: string
  level: 'RA Standard' | 'RA Climate' | 'RA/UTZ'
  auditScore: number
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED'
  expiryDate: string
  lastAudit?: string
}

// ─── GLOBALG.A.P. Types ───
interface GGNCertification {
  id: string
  farmerName: string
  ggnNumber: string
  scope: string
  version: string
  compliance: number
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED'
  expiryDate: string
  lastAudit?: string
}

// ─── Color maps ───
const riskColor: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const verificationColor: Record<string, string> = {
  VERIFIED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const certStatusColor: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  SUSPENDED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  REVOKED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  EXPIRED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

// ─── Demo Data ───
const DEMO_EUDR: EUDRRecord[] = [
  { id: '1', farmerName: 'Linda Nakasujja', plotId: 'PLT-ME-001', area: 2.5, deforestationFree: true, riskLevel: 'LOW', verificationStatus: 'VERIFIED', geoCoordinates: '1.0946°N, 34.3501°E', lastChecked: '2024-04-10T00:00:00Z' },
  { id: '2', farmerName: 'David Wanyama', plotId: 'PLT-ME-002', area: 1.8, deforestationFree: true, riskLevel: 'LOW', verificationStatus: 'VERIFIED', geoCoordinates: '1.0872°N, 34.3415°E', lastChecked: '2024-04-12T00:00:00Z' },
  { id: '3', farmerName: 'Rose Amodoi', plotId: 'PLT-ME-003', area: 3.2, deforestationFree: true, riskLevel: 'LOW', verificationStatus: 'PENDING', geoCoordinates: '1.1001°N, 34.3589°E', lastChecked: '2024-04-14T00:00:00Z' },
  { id: '4', farmerName: 'Charles Draku', plotId: 'PLT-WN-001', area: 4.0, deforestationFree: true, riskLevel: 'MEDIUM', verificationStatus: 'PENDING', geoCoordinates: '2.7513°N, 32.5234°E', lastChecked: '2024-04-08T00:00:00Z', notes: 'Border zone - requires satellite verification' },
  { id: '5', farmerName: 'Florence Akello', plotId: 'PLT-GU-001', area: 1.5, deforestationFree: true, riskLevel: 'LOW', verificationStatus: 'VERIFIED', geoCoordinates: '2.7724°N, 32.2978°E', lastChecked: '2024-04-11T00:00:00Z' },
  { id: '6', farmerName: 'Maria Nakamya', plotId: 'PLT-ME-004', area: 2.0, deforestationFree: true, riskLevel: 'LOW', verificationStatus: 'VERIFIED', geoCoordinates: '1.0920°N, 34.3456°E', lastChecked: '2024-04-09T00:00:00Z' },
  { id: '7', farmerName: 'Hassan Wabwire', plotId: 'PLT-JN-001', area: 5.0, deforestationFree: false, riskLevel: 'HIGH', verificationStatus: 'REJECTED', geoCoordinates: '0.4416°N, 33.2063°E', lastChecked: '2024-04-13T00:00:00Z', notes: 'Satellite imagery shows recent land clearing within 2km buffer zone' },
  { id: '8', farmerName: 'Agnes Birungi', plotId: 'PLT-ME-005', area: 2.8, deforestationFree: true, riskLevel: 'LOW', verificationStatus: 'VERIFIED', geoCoordinates: '1.0955°N, 34.3522°E', lastChecked: '2024-04-15T00:00:00Z' },
  { id: '9', farmerName: 'Peter Okello', plotId: 'PLT-GU-002', area: 3.5, deforestationFree: true, riskLevel: 'MEDIUM', verificationStatus: 'PENDING', geoCoordinates: '2.7800°N, 32.3100°E', lastChecked: '2024-04-07T00:00:00Z', notes: 'Awaiting GPS field verification' },
  { id: '10', farmerName: 'Sarah Achieng', plotId: 'PLT-ME-006', area: 1.2, deforestationFree: true, riskLevel: 'LOW', verificationStatus: 'VERIFIED', geoCoordinates: '1.0888°N, 34.3478°E', lastChecked: '2024-04-06T00:00:00Z' },
]

const DEMO_CBAM: CBAMReport[] = [
  { id: '1', farmerName: 'Bugisu Cooperative Union', period: 'Q1 2024', commodity: 'Coffee', emissions: 2.4, status: 'VERIFIED', submittedAt: '2024-04-01T00:00:00Z', verifiedAt: '2024-04-10T00:00:00Z' },
  { id: '2', farmerName: 'Linda Nakasujja', period: 'Q1 2024', commodity: 'Coffee', emissions: 1.8, status: 'VERIFIED', submittedAt: '2024-03-28T00:00:00Z', verifiedAt: '2024-04-05T00:00:00Z' },
  { id: '3', farmerName: 'David Wanyama', period: 'Q1 2024', commodity: 'Coffee', emissions: 2.1, status: 'PENDING', submittedAt: '2024-04-10T00:00:00Z' },
  { id: '4', farmerName: 'Rose Amodoi', period: 'Q1 2024', commodity: 'Vanilla', emissions: 0.8, status: 'VERIFIED', submittedAt: '2024-03-25T00:00:00Z', verifiedAt: '2024-04-02T00:00:00Z' },
  { id: '5', farmerName: 'Nile Agro Processors', period: 'Q1 2024', commodity: 'Sunflower', emissions: 3.2, status: 'PENDING', submittedAt: '2024-04-12T00:00:00Z' },
  { id: '6', farmerName: 'Charles Draku', period: 'Q1 2024', commodity: 'Sesame', emissions: 1.2, status: 'VERIFIED', submittedAt: '2024-03-30T00:00:00Z', verifiedAt: '2024-04-08T00:00:00Z' },
  { id: '7', farmerName: 'Green World Inputs Ltd', period: 'Q1 2024', commodity: 'Coffee', emissions: 4.5, status: 'REJECTED', submittedAt: '2024-04-05T00:00:00Z' },
  { id: '8', farmerName: 'Mount Elgon Coffee Exporters', period: 'Q1 2024', commodity: 'Coffee', emissions: 1.9, status: 'PENDING', submittedAt: '2024-04-14T00:00:00Z' },
]

const DEMO_RA: RACertification[] = [
  { id: '1', farmerName: 'Linda Nakasujja', certificateNumber: 'RA-2024-UG-0001', level: 'RA Standard', auditScore: 94, status: 'ACTIVE', expiryDate: '2025-06-15T00:00:00Z', lastAudit: '2024-03-20T00:00:00Z' },
  { id: '2', farmerName: 'David Wanyama', certificateNumber: 'RA-2024-UG-0002', level: 'RA Climate', auditScore: 91, status: 'ACTIVE', expiryDate: '2025-08-20T00:00:00Z', lastAudit: '2024-04-01T00:00:00Z' },
  { id: '3', farmerName: 'Rose Amodoi', certificateNumber: 'RA-2024-UG-0003', level: 'RA/UTZ', auditScore: 88, status: 'ACTIVE', expiryDate: '2024-07-10T00:00:00Z', lastAudit: '2024-02-15T00:00:00Z' },
  { id: '4', farmerName: 'Charles Draku', certificateNumber: 'RA-2023-UG-0045', level: 'RA Standard', auditScore: 72, status: 'SUSPENDED', expiryDate: '2024-12-31T00:00:00Z', lastAudit: '2024-01-10T00:00:00Z' },
  { id: '5', farmerName: 'Florence Akello', certificateNumber: 'RA-2024-UG-0004', level: 'RA Climate', auditScore: 96, status: 'ACTIVE', expiryDate: '2025-10-05T00:00:00Z', lastAudit: '2024-03-15T00:00:00Z' },
  { id: '6', farmerName: 'Agnes Birungi', certificateNumber: 'RA-2022-UG-0032', level: 'RA Standard', auditScore: 65, status: 'REVOKED', expiryDate: '2024-03-01T00:00:00Z', lastAudit: '2023-12-20T00:00:00Z' },
  { id: '7', farmerName: 'Maria Nakamya', certificateNumber: 'RA-2024-UG-0005', level: 'RA/UTZ', auditScore: 89, status: 'ACTIVE', expiryDate: '2025-05-18T00:00:00Z', lastAudit: '2024-04-05T00:00:00Z' },
  { id: '8', farmerName: 'Sarah Achieng', certificateNumber: 'RA-2024-UG-0006', level: 'RA Standard', auditScore: 92, status: 'ACTIVE', expiryDate: '2024-06-30T00:00:00Z', lastAudit: '2024-03-28T00:00:00Z' },
  { id: '9', farmerName: 'Peter Okello', certificateNumber: 'RA-2023-UG-0078', level: 'RA Climate', auditScore: 78, status: 'EXPIRED', expiryDate: '2024-02-28T00:00:00Z', lastAudit: '2023-08-15T00:00:00Z' },
]

const DEMO_GGN: GGNCertification[] = [
  { id: '1', farmerName: 'Bugisu Cooperative Union', ggnNumber: 'GGN-40-123456', scope: 'Fruits & Vegetables', version: 'v6.0', compliance: 98, status: 'ACTIVE', expiryDate: '2025-09-30T00:00:00Z', lastAudit: '2024-03-10T00:00:00Z' },
  { id: '2', farmerName: 'Linda Nakasujja', ggnNumber: 'GGN-40-234567', scope: 'Coffee', version: 'v6.0', compliance: 95, status: 'ACTIVE', expiryDate: '2025-07-15T00:00:00Z', lastAudit: '2024-04-01T00:00:00Z' },
  { id: '3', farmerName: 'David Wanyama', ggnNumber: 'GGN-40-345678', scope: 'Coffee', version: 'v6.0', compliance: 92, status: 'ACTIVE', expiryDate: '2025-11-20T00:00:00Z', lastAudit: '2024-03-25T00:00:00Z' },
  { id: '4', farmerName: 'Rose Amodoi', ggnNumber: 'GGN-40-456789', scope: 'Spices & Herbs', version: 'v5.4', compliance: 88, status: 'ACTIVE', expiryDate: '2024-08-10T00:00:00Z', lastAudit: '2024-02-20T00:00:00Z' },
  { id: '5', farmerName: 'Nile Agro Processors', ggnNumber: 'GGN-40-567890', scope: 'Oilseeds', version: 'v6.0', compliance: 76, status: 'SUSPENDED', expiryDate: '2024-12-31T00:00:00Z', lastAudit: '2024-01-15T00:00:00Z' },
  { id: '6', farmerName: 'Charles Draku', ggnNumber: 'GGN-40-678901', scope: 'Cereals', version: 'v5.4', compliance: 82, status: 'ACTIVE', expiryDate: '2025-04-25T00:00:00Z', lastAudit: '2024-03-30T00:00:00Z' },
  { id: '7', farmerName: 'Mount Elgon Coffee Exporters', ggnNumber: 'GGN-40-789012', scope: 'Coffee', version: 'v6.0', compliance: 97, status: 'ACTIVE', expiryDate: '2025-06-30T00:00:00Z', lastAudit: '2024-04-08T00:00:00Z' },
  { id: '8', farmerName: 'Florence Akello', ggnNumber: 'GGN-40-890123', scope: 'Coffee', version: 'v6.0', compliance: 90, status: 'ACTIVE', expiryDate: '2024-07-01T00:00:00Z', lastAudit: '2024-03-18T00:00:00Z' },
  { id: '9', farmerName: 'Agnes Birungi', ggnNumber: 'GGN-40-901234', scope: 'Cereals', version: 'v5.4', compliance: 60, status: 'REVOKED', expiryDate: '2024-01-15T00:00:00Z', lastAudit: '2023-10-05T00:00:00Z' },
]

function isExpiringSoon(expiryDate: string, daysThreshold = 90) {
  const diff = new Date(expiryDate).getTime() - new Date().getTime()
  return diff > 0 && diff < daysThreshold * 24 * 60 * 60 * 1000
}

function isExpired(expiryDate: string) {
  return new Date(expiryDate).getTime() < new Date().getTime()
}

export default function ComplianceView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(activeSubTab || 'overview')

  const [eudrRecords, setEudrRecords] = useState<EUDRRecord[]>([])
  const [cbamReports, setCbamReports] = useState<CBAMReport[]>([])
  const [raCerts, setRaCerts] = useState<RACertification[]>([])
  const [ggnCerts, setGgnCerts] = useState<GGNCertification[]>([])

  // Search/filter states for each tab
  const [eudrSearch, setEudrSearch] = useState('')
  const [eudrRiskFilter, setEudrRiskFilter] = useState('')
  const [eudrVerifyFilter, setEudrVerifyFilter] = useState('')
  const [cbamSearch, setCbamSearch] = useState('')
  const [cbamStatusFilter, setCbamStatusFilter] = useState('')
  const [raSearch, setRaSearch] = useState('')
  const [raStatusFilter, setRaStatusFilter] = useState('')
  const [ggnSearch, setGgnSearch] = useState('')
  const [ggnStatusFilter, setGgnStatusFilter] = useState('')

  // Add dialogs
  const [showAddEudr, setShowAddEudr] = useState(false)
  const [showAddCbam, setShowAddCbam] = useState(false)
  const [showAddRa, setShowAddRa] = useState(false)
  const [showAddGgn, setShowAddGgn] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/modules?module=compliance')
      if (res.ok) {
        const data = await res.json()
        if (data.eudr?.length) { setEudrRecords(data.eudr); setCbamReports(data.cbam || DEMO_CBAM); setRaCerts(data.ra || DEMO_RA); setGgnCerts(data.ggn || DEMO_GGN); setLoading(false); return }
      }
    } catch { /* fallback */ }
    setEudrRecords(DEMO_EUDR)
    setCbamReports(DEMO_CBAM)
    setRaCerts(DEMO_RA)
    setGgnCerts(DEMO_GGN)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  const handleTabChange = (t: string) => { setActiveTab(t); setActiveSubTab(t) }

  // ─── Dashboard metrics ───
  const eudrTotal = eudrRecords.length
  const eudrVerified = eudrRecords.filter(r => r.verificationStatus === 'VERIFIED').length
  const eudrPending = eudrRecords.filter(r => r.verificationStatus === 'PENDING').length
  const eudrHighRisk = eudrRecords.filter(r => r.riskLevel === 'HIGH').length
  const eudrRate = eudrTotal > 0 ? ((eudrVerified / eudrTotal) * 100).toFixed(0) : '0'

  const cbamVerified = cbamReports.filter(r => r.status === 'VERIFIED').length
  const cbamAvgEmissions = cbamReports.length > 0 ? (cbamReports.reduce((s, r) => s + r.emissions, 0) / cbamReports.length).toFixed(1) : '—'

  const raActive = raCerts.filter(c => c.status === 'ACTIVE').length
  const raExpiringSoon = raCerts.filter(c => c.status === 'ACTIVE' && isExpiringSoon(c.expiryDate)).length
  const raExpired = raCerts.filter(c => c.status === 'EXPIRED' || isExpired(c.expiryDate)).length
  const raRate = raCerts.length > 0 ? ((raActive / raCerts.length) * 100).toFixed(0) : '0'

  const ggnActive = ggnCerts.filter(c => c.status === 'ACTIVE').length
  const ggnExpiringSoon = ggnCerts.filter(c => c.status === 'ACTIVE' && isExpiringSoon(c.expiryDate)).length
  const ggnRate = ggnCerts.length > 0 ? ((ggnActive / ggnCerts.length) * 100).toFixed(0) : '0'

  // Expiry alerts
  const allExpiryAlerts = [
    ...raCerts.filter(c => c.status === 'ACTIVE' && isExpiringSoon(c.expiryDate)).map(c => ({ type: 'Rainforest Alliance', farmer: c.farmerName, cert: c.certificateNumber, expiry: c.expiryDate })),
    ...ggnCerts.filter(c => c.status === 'ACTIVE' && isExpiringSoon(c.expiryDate)).map(c => ({ type: 'GLOBALG.A.P.', farmer: c.farmerName, cert: c.ggnNumber, expiry: c.expiryDate })),
  ].sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime())

  // Filtered data per tab
  const filteredEudr = eudrRecords.filter(r => {
    if (eudrSearch && !r.farmerName.toLowerCase().includes(eudrSearch.toLowerCase()) && !r.plotId.toLowerCase().includes(eudrSearch.toLowerCase())) return false
    if (eudrRiskFilter && r.riskLevel !== eudrRiskFilter) return false
    if (eudrVerifyFilter && r.verificationStatus !== eudrVerifyFilter) return false
    return true
  })

  const filteredCbam = cbamReports.filter(r => {
    if (cbamSearch && !r.farmerName.toLowerCase().includes(cbamSearch.toLowerCase()) && !r.commodity.toLowerCase().includes(cbamSearch.toLowerCase())) return false
    if (cbamStatusFilter && r.status !== cbamStatusFilter) return false
    return true
  })

  const filteredRa = raCerts.filter(c => {
    if (raSearch && !c.farmerName.toLowerCase().includes(raSearch.toLowerCase()) && !c.certificateNumber.toLowerCase().includes(raSearch.toLowerCase())) return false
    if (raStatusFilter && c.status !== raStatusFilter) return false
    return true
  })

  const filteredGgn = ggnCerts.filter(c => {
    if (ggnSearch && !c.farmerName.toLowerCase().includes(ggnSearch.toLowerCase()) && !c.ggnNumber.toLowerCase().includes(ggnSearch.toLowerCase())) return false
    if (ggnStatusFilter && c.status !== ggnStatusFilter) return false
    return true
  })

  if (loading) return <ComplianceSkeleton />

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Compliance Hub
          </h3>
          <p className="text-sm text-muted-foreground">EUDR · CBAM · Rainforest Alliance · GLOBALG.A.P. — tracking for 2,000+ farmers</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm"><Shield className="w-3.5 h-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="eudr" className="gap-1.5 text-xs sm:text-sm"><Globe className="w-3.5 h-3.5" />EUDR</TabsTrigger>
          <TabsTrigger value="cbam" className="gap-1.5 text-xs sm:text-sm"><Leaf className="w-3.5 h-3.5" />CBAM</TabsTrigger>
          <TabsTrigger value="ra" className="gap-1.5 text-xs sm:text-sm"><TreePine className="w-3.5 h-3.5" />Rainforest</TabsTrigger>
          <TabsTrigger value="ggn" className="gap-1.5 text-xs sm:text-sm"><Award className="w-3.5 h-3.5" />GGN</TabsTrigger>
        </TabsList>

        {/* ═══════════ OVERVIEW TAB ═══════════ */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Compliance Rates */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <Badge variant="outline" className="text-[10px] text-blue-600">EUDR</Badge>
                </div>
                <p className="text-2xl font-bold">{eudrRate}%</p>
                <p className="text-xs text-muted-foreground">Verification Rate</p>
                <Progress value={Number(eudrRate)} className="h-1.5 mt-2" />
                <p className="text-[10px] text-muted-foreground mt-1">{eudrVerified}/{eudrTotal} plots verified</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Leaf className="w-4 h-4 text-emerald-600" />
                  <Badge variant="outline" className="text-[10px] text-emerald-600">CBAM</Badge>
                </div>
                <p className="text-2xl font-bold">{cbamAvgEmissions}</p>
                <p className="text-xs text-muted-foreground">Avg Emissions (tCO2e)</p>
                <p className="text-[10px] text-muted-foreground mt-2">{cbamVerified}/{cbamReports.length} reports verified</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <TreePine className="w-4 h-4 text-green-600" />
                  <Badge variant="outline" className="text-[10px] text-green-600">Rainforest</Badge>
                </div>
                <p className="text-2xl font-bold">{raRate}%</p>
                <p className="text-xs text-muted-foreground">Active Cert Rate</p>
                <Progress value={Number(raRate)} className="h-1.5 mt-2" />
                <p className="text-[10px] text-muted-foreground mt-1">{raActive} active · {raExpired} expired</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  <Badge variant="outline" className="text-[10px] text-amber-600">GGN</Badge>
                </div>
                <p className="text-2xl font-bold">{ggnRate}%</p>
                <p className="text-xs text-muted-foreground">Active Cert Rate</p>
                <Progress value={Number(ggnRate)} className="h-1.5 mt-2" />
                <p className="text-[10px] text-muted-foreground mt-1">{ggnActive} active · {ggnExpiringSoon} expiring soon</p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  Expiry Alerts ({allExpiryAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-60 overflow-y-auto">
                {allExpiryAlerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No upcoming expirations</p>
                ) : (
                  <div className="space-y-2">
                    {allExpiryAlerts.map((alert, i) => {
                      const daysLeft = Math.ceil((new Date(alert.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      return (
                        <div key={i} className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{alert.farmer}</p>
                              <p className="text-[10px] text-muted-foreground">{alert.type} · {alert.cert}</p>
                            </div>
                          </div>
                          <Badge className={cn('text-[10px] shrink-0', daysLeft < 30 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                            {daysLeft}d left
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Quick Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">EUDR High Risk Plots</span>
                  <Badge className={cn('text-xs', eudrHighRisk > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')}>{eudrHighRisk}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">EUDR Pending Verification</span>
                  <Badge className="bg-amber-100 text-amber-700 text-xs">{eudrPending}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">RA Certifications Expiring Soon</span>
                  <Badge className="bg-amber-100 text-amber-700 text-xs">{raExpiringSoon}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">GGN Expiring Soon</span>
                  <Badge className="bg-amber-100 text-amber-700 text-xs">{ggnExpiringSoon}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Active Certifications</span>
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">{raActive + ggnActive}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════ EUDR TAB ═══════════ */}
        <TabsContent value="eudr" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Plots</p><p className="text-xl font-bold">{eudrTotal}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Verified</p><p className="text-xl font-bold text-emerald-600">{eudrVerified}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold text-amber-600">{eudrPending}</p></CardContent></Card>
            <Card className="border-red-200 dark:border-red-800"><CardContent className="p-4"><p className="text-xs text-muted-foreground">High Risk</p><p className="text-xl font-bold text-red-600">{eudrHighRisk}</p></CardContent></Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search farmer or plot ID..." className="pl-9" value={eudrSearch} onChange={e => setEudrSearch(e.target.value)} />
            </div>
            <Select value={eudrRiskFilter} onValueChange={v => setEudrRiskFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-[130px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risks</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
            <Select value={eudrVerifyFilter} onValueChange={v => setEudrVerifyFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Verification" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowAddEudr(true)} className="gap-2"><Plus className="w-4 h-4" />Add Record</Button>
            {(eudrRiskFilter || eudrVerifyFilter || eudrSearch) && (
              <Button variant="ghost" size="sm" onClick={() => { setEudrRiskFilter(''); setEudrVerifyFilter(''); setEudrSearch('') }} className="gap-1"><X className="w-3.5 h-3.5" />Clear</Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Plot ID</TableHead>
                      <TableHead className="hidden md:table-cell">Area (ha)</TableHead>
                      <TableHead>Deforestation-Free</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead className="hidden lg:table-cell">Last Checked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEudr.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">{r.farmerName}</TableCell>
                        <TableCell><span className="font-mono text-xs">{r.plotId}</span></TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{r.area}</TableCell>
                        <TableCell>
                          {r.deforestationFree ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell><Badge className={cn('text-[10px]', riskColor[r.riskLevel])}>{r.riskLevel}</Badge></TableCell>
                        <TableCell><Badge className={cn('text-[10px]', verificationColor[r.verificationStatus])}>{r.verificationStatus}</Badge></TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{new Date(r.lastChecked).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ CBAM TAB ═══════════ */}
        <TabsContent value="cbam" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Reports</p><p className="text-xl font-bold">{cbamReports.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Emissions</p><p className="text-xl font-bold">{cbamAvgEmissions} <span className="text-sm text-muted-foreground">tCO2e</span></p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Verified</p><p className="text-xl font-bold text-emerald-600">{cbamVerified}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold text-amber-600">{cbamReports.filter(r => r.status === 'PENDING').length}</p></CardContent></Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search farmer or commodity..." className="pl-9" value={cbamSearch} onChange={e => setCbamSearch(e.target.value)} />
            </div>
            <Select value={cbamStatusFilter} onValueChange={v => setCbamStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowAddCbam(true)} className="gap-2"><Plus className="w-4 h-4" />Add Report</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Commodity</TableHead>
                      <TableHead>Emissions (tCO2e)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCbam.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">{r.farmerName}</TableCell>
                        <TableCell className="text-sm">{r.period}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{r.commodity}</Badge></TableCell>
                        <TableCell className="font-semibold text-sm">{r.emissions}</TableCell>
                        <TableCell><Badge className={cn('text-[10px]', verificationColor[r.status])}>{r.status}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{new Date(r.submittedAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ RA TAB ═══════════ */}
        <TabsContent value="ra" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search farmer or certificate..." className="pl-9" value={raSearch} onChange={e => setRaSearch(e.target.value)} />
            </div>
            <Select value={raStatusFilter} onValueChange={v => setRaStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="REVOKED">Revoked</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowAddRa(true)} className="gap-2"><Plus className="w-4 h-4" />Add Certification</Button>
            {(raStatusFilter || raSearch) && (
              <Button variant="ghost" size="sm" onClick={() => { setRaStatusFilter(''); setRaSearch('') }} className="gap-1"><X className="w-3.5 h-3.5" />Clear</Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Certificate</TableHead>
                      <TableHead className="hidden md:table-cell">Level</TableHead>
                      <TableHead className="hidden sm:table-cell">Audit Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Expiry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRa.map(c => {
                      const expiring = c.status === 'ACTIVE' && isExpiringSoon(c.expiryDate)
                      const expired = isExpired(c.expiryDate) && c.status === 'ACTIVE'
                      return (
                        <TableRow key={c.id} className={expiring ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                          <TableCell className="font-medium text-sm">{c.farmerName}</TableCell>
                          <TableCell><span className="font-mono text-xs">{c.certificateNumber}</span></TableCell>
                          <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-xs">{c.level}</Badge></TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <Progress value={c.auditScore} className="h-1.5 w-16" />
                              <span className={cn('text-xs font-medium', c.auditScore >= 85 ? 'text-emerald-600' : c.auditScore >= 70 ? 'text-amber-600' : 'text-red-600')}>{c.auditScore}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge className={cn('text-[10px]', certStatusColor[c.status])}>{c.status}</Badge>
                              {expiring && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                              {expired && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className={cn('text-xs', expiring ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
                              {new Date(c.expiryDate).toLocaleDateString()}
                              {expiring && ` (${Math.ceil((new Date(c.expiryDate).getTime() - Date.now()) / 86400000)}d)`}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ GGN TAB ═══════════ */}
        <TabsContent value="ggn" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search farmer or GGN number..." className="pl-9" value={ggnSearch} onChange={e => setGgnSearch(e.target.value)} />
            </div>
            <Select value={ggnStatusFilter} onValueChange={v => setGgnStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="REVOKED">Revoked</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowAddGgn(true)} className="gap-2"><Plus className="w-4 h-4" />Add Certification</Button>
            {(ggnStatusFilter || ggnSearch) && (
              <Button variant="ghost" size="sm" onClick={() => { setGgnStatusFilter(''); setGgnSearch('') }} className="gap-1"><X className="w-3.5 h-3.5" />Clear</Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>GGN Number</TableHead>
                      <TableHead className="hidden md:table-cell">Scope</TableHead>
                      <TableHead className="hidden lg:table-cell">Version</TableHead>
                      <TableHead>Compliance %</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Expiry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGgn.map(c => {
                      const expiring = c.status === 'ACTIVE' && isExpiringSoon(c.expiryDate)
                      return (
                        <TableRow key={c.id} className={expiring ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                          <TableCell className="font-medium text-sm">{c.farmerName}</TableCell>
                          <TableCell><span className="font-mono text-xs">{c.ggnNumber}</span></TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{c.scope}</TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{c.version}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={c.compliance} className="h-1.5 w-16" />
                              <span className={cn('text-xs font-medium', c.compliance >= 90 ? 'text-emerald-600' : c.compliance >= 75 ? 'text-amber-600' : 'text-red-600')}>{c.compliance}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge className={cn('text-[10px]', certStatusColor[c.status])}>{c.status}</Badge>
                              {expiring && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className={cn('text-xs', expiring ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
                              {new Date(c.expiryDate).toLocaleDateString()}
                              {expiring && ` (${Math.ceil((new Date(c.expiryDate).getTime() - Date.now()) / 86400000)}d)`}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Add EUDR Record Dialog ─── */}
      <Dialog open={showAddEudr} onOpenChange={setShowAddEudr}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-blue-600" />Add EUDR Record</DialogTitle></DialogHeader>
          <AddEudrForm onClose={() => { setShowAddEudr(false); fetchData() }} />
        </DialogContent>
      </Dialog>

      {/* ─── Add CBAM Report Dialog ─── */}
      <Dialog open={showAddCbam} onOpenChange={setShowAddCbam}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Leaf className="w-5 h-5 text-emerald-600" />Add CBAM Report</DialogTitle></DialogHeader>
          <AddCbamForm onClose={() => { setShowAddCbam(false); fetchData() }} />
        </DialogContent>
      </Dialog>

      {/* ─── Add RA Certification Dialog ─── */}
      <Dialog open={showAddRa} onOpenChange={setShowAddRa}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><TreePine className="w-5 h-5 text-green-600" />Add RA Certification</DialogTitle></DialogHeader>
          <AddRaForm onClose={() => { setShowAddRa(false); fetchData() }} />
        </DialogContent>
      </Dialog>

      {/* ─── Add GGN Certification Dialog ─── */}
      <Dialog open={showAddGgn} onOpenChange={setShowAddGgn}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-amber-600" />Add GGN Certification</DialogTitle></DialogHeader>
          <AddGgnForm onClose={() => { setShowAddGgn(false); fetchData() }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ComplianceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

function AddEudrForm({ onClose }: { onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ farmerName: '', plotId: '', area: '', deforestationFree: 'true', riskLevel: 'LOW', geoCoordinates: '', notes: '' })
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.farmerName || !form.plotId || !form.area) { toast.error('Farmer, plot ID, and area are required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ module: 'eudr', ...form, area: parseFloat(form.area), deforestationFree: form.deforestationFree === 'true' }) })
      if (res.ok) { toast.success('EUDR record added'); onClose(); return }
    } catch { /* fallback */ }
    toast.success('EUDR record added (demo mode)'); onClose(); setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Farmer Name *</Label><Input value={form.farmerName} onChange={e => update('farmerName', e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Plot ID *</Label><Input value={form.plotId} onChange={e => update('plotId', e.target.value)} placeholder="PLT-XX-001" required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Area (ha) *</Label><Input type="number" step="0.1" value={form.area} onChange={e => update('area', e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Risk Level</Label>
          <Select value={form.riskLevel} onValueChange={v => update('riskLevel', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="LOW">Low</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="HIGH">High</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Geo Coordinates</Label><Input value={form.geoCoordinates} onChange={e => update('geoCoordinates', e.target.value)} placeholder="1.0946°N, 34.3501°E" /></div>
      <div className="space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={e => update('notes', e.target.value)} /></div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving}>Add Record</Button>
      </DialogFooter>
    </form>
  )
}

function AddCbamForm({ onClose }: { onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ farmerName: '', period: '', commodity: '', emissions: '' })
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.farmerName || !form.period || !form.commodity || !form.emissions) { toast.error('All fields are required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ module: 'cbam', ...form, emissions: parseFloat(form.emissions) }) })
      if (res.ok) { toast.success('CBAM report added'); onClose(); return }
    } catch { /* fallback */ }
    toast.success('CBAM report added (demo mode)'); onClose(); setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5"><Label>Farmer / Entity *</Label><Input value={form.farmerName} onChange={e => update('farmerName', e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Period *</Label><Input value={form.period} onChange={e => update('period', e.target.value)} placeholder="Q1 2024" required /></div>
        <div className="space-y-1.5"><Label>Commodity *</Label><Input value={form.commodity} onChange={e => update('commodity', e.target.value)} required /></div>
      </div>
      <div className="space-y-1.5"><Label>Emissions (tCO2e) *</Label><Input type="number" step="0.1" value={form.emissions} onChange={e => update('emissions', e.target.value)} required /></div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving}>Add Report</Button>
      </DialogFooter>
    </form>
  )
}

function AddRaForm({ onClose }: { onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ farmerName: '', certificateNumber: '', level: 'RA Standard', auditScore: '', status: 'ACTIVE', expiryDate: '' })
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.farmerName || !form.certificateNumber || !form.expiryDate) { toast.error('Farmer, certificate, and expiry date are required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ module: 'ra', ...form, auditScore: form.auditScore ? parseInt(form.auditScore) : 0 }) })
      if (res.ok) { toast.success('RA certification added'); onClose(); return }
    } catch { /* fallback */ }
    toast.success('RA certification added (demo mode)'); onClose(); setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5"><Label>Farmer Name *</Label><Input value={form.farmerName} onChange={e => update('farmerName', e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Certificate Number *</Label><Input value={form.certificateNumber} onChange={e => update('certificateNumber', e.target.value)} placeholder="RA-2024-UG-XXXX" required /></div>
        <div className="space-y-1.5"><Label>Level</Label>
          <Select value={form.level} onValueChange={v => update('level', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="RA Standard">RA Standard</SelectItem><SelectItem value="RA Climate">RA Climate</SelectItem><SelectItem value="RA/UTZ">RA/UTZ</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Audit Score</Label><Input type="number" min="0" max="100" value={form.auditScore} onChange={e => update('auditScore', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Expiry Date *</Label><Input type="date" value={form.expiryDate} onChange={e => update('expiryDate', e.target.value)} required /></div>
      </div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving}>Add Certification</Button>
      </DialogFooter>
    </form>
  )
}

function AddGgnForm({ onClose }: { onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ farmerName: '', ggnNumber: '', scope: '', version: 'v6.0', compliance: '', status: 'ACTIVE', expiryDate: '' })
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.farmerName || !form.ggnNumber || !form.expiryDate) { toast.error('Farmer, GGN number, and expiry date are required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ module: 'ggn', ...form, compliance: form.compliance ? parseInt(form.compliance) : 0 }) })
      if (res.ok) { toast.success('GGN certification added'); onClose(); return }
    } catch { /* fallback */ }
    toast.success('GGN certification added (demo mode)'); onClose(); setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5"><Label>Farmer / Entity *</Label><Input value={form.farmerName} onChange={e => update('farmerName', e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>GGN Number *</Label><Input value={form.ggnNumber} onChange={e => update('ggnNumber', e.target.value)} placeholder="GGN-40-XXXXXX" required /></div>
        <div className="space-y-1.5"><Label>Scope</Label><Input value={form.scope} onChange={e => update('scope', e.target.value)} placeholder="Coffee" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5"><Label>Version</Label>
          <Select value={form.version} onValueChange={v => update('version', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="v6.0">v6.0</SelectItem><SelectItem value="v5.4">v5.4</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Compliance %</Label><Input type="number" min="0" max="100" value={form.compliance} onChange={e => update('compliance', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Expiry *</Label><Input type="date" value={form.expiryDate} onChange={e => update('expiryDate', e.target.value)} required /></div>
      </div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving}>Add Certification</Button>
      </DialogFooter>
    </form>
  )
}