'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Search, Plus, Eye, X, UserPlus, Phone, MapPin, Sprout, Calendar, CreditCard,
  ChevronLeft, ChevronRight, Filter, Loader2, Users, ArrowLeft, Star, AlertCircle,
  Layers, DollarSign, GraduationCap, PiggyBank, Leaf, Activity, QrCode, Download,
  Shield, Banknote, Award, Upload, FileSpreadsheet, CheckCircle, XCircle, FileDown
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
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'

interface Farmer {
  id: string; firstName: string; lastName: string; phone: string
  gender?: string; status: string; farmerCode?: string
  education?: string; dateOfBirth?: string; maritalStatus?: string
  nationalIdType?: string; nationalIdNo?: string; memberType: string
  farmSize?: number; farmOwnership?: string; mainCrops?: string
  villageId?: string; gpsLatitude?: number; gpsLongitude?: number
  bankName?: string; bankAccountNo?: string
  familyMembers?: number; childrenUnder18?: number
  groupId?: string; createdAt: string
  email?: string; villageName?: string; country?: string; district?: string
  housingOwnership?: string; houseType?: string
  loanTakenLastYear?: boolean
  spouseName?: string; schoolGoingChildren?: number; livestockTypes?: string
  loanTakenFrom?: string; loanAmount?: number; loanPurpose?: string
  loanInterestPct?: number; loanInterestPeriod?: string
}

const genderColor: Record<string, string> = {
  Male: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Female: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
}
const statusColor: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  INACTIVE: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

function initials(f: string, l: string) {
  return ((f?.[0] || '') + (l?.[0] || '')).toUpperCase()
}

export default function FarmersView() {
  const { selectedFarmerId, setSelectedFarmerId, setActiveModule } = useAppStore()
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const limit = 12

  const fetchFarmers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (genderFilter) params.set('gender', genderFilter)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/farmers?${params}`)
      const data = await res.json()
      setFarmers(data.farmers || data.data || [])
      setTotal(data.total || data.farmers?.length || 0)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load farmers')
    } finally {
      setLoading(false)
    }
  }, [page, search, genderFilter, statusFilter])

  useEffect(() => { fetchFarmers() }, [fetchFarmers])

  // Detail view
  if (selectedFarmerId) {
    return <FarmerDetail farmerId={selectedFarmerId} onBack={() => setSelectedFarmerId(null)} />
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Farmer Registry</h3>
          <p className="text-sm text-muted-foreground">{total} farmers registered</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2">
            <Upload className="w-4 h-4" /> Import CSV
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Farmer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or code..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[130px]"><SelectValue placeholder="Gender" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {(genderFilter || statusFilter || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setGenderFilter(''); setStatusFilter(''); setSearch(''); setPage(1) }} className="gap-1">
            <X className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
            </div>
          ) : farmers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No farmers found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farmer</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="hidden sm:table-cell">Gender</TableHead>
                  <TableHead className="hidden lg:table-cell">Crops</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmers.map(f => (
                  <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedFarmerId(f.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {initials(f.firstName, f.lastName)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{f.firstName} {f.lastName}</p>
                          {f.farmerCode && <p className="text-[10px] text-muted-foreground font-mono">{f.farmerCode}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{f.phone}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {f.gender && <Badge className={cn('text-[10px]', genderColor[f.gender] || '')}>{f.gender}</Badge>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground truncate max-w-[150px]">
                      {f.mainCrops || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px]', statusColor[f.status] || '')}>{f.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedFarmerId(f.id) }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {/* Pagination */}
        {!loading && farmers.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Farmer Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Farmer</DialogTitle>
          </DialogHeader>
          <AddFarmerForm onClose={() => { setShowAdd(false); fetchFarmers() }} />
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import Farmers from CSV</DialogTitle>
            <CardDescription>Upload a CSV file to import multiple farmers at once.</CardDescription>
          </DialogHeader>
          <CsvImportForm onClose={() => setShowImport(false)} onSaved={() => { setShowImport(false); fetchFarmers() }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddFarmerForm({ onClose }: { onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', gender: '', education: '',
    maritalStatus: '', memberType: 'General', farmSize: '', mainCrops: '',
    nationalIdType: '', nationalIdNo: '',
  })

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.phone) {
      toast.error('First name, last name, and phone are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/farmers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          farmSize: form.farmSize ? parseFloat(form.farmSize) : undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create farmer')
      toast.success('Farmer registered successfully')
      onClose()
    } catch {
      toast.error('Failed to register farmer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>First Name *</Label><Input value={form.firstName} onChange={e => update('firstName', e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Last Name *</Label><Input value={form.lastName} onChange={e => update('lastName', e.target.value)} required /></div>
      </div>
      <div className="space-y-1.5"><Label>Phone *</Label><Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+256..." required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Gender</Label>
          <Select value={form.gender} onValueChange={v => update('gender', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Education</Label>
          <Select value={form.education} onValueChange={v => update('education', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Primary">Primary</SelectItem><SelectItem value="Secondary">Secondary</SelectItem>
              <SelectItem value="UG">University</SelectItem><SelectItem value="PG">Post-Grad</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Member Type</Label>
          <Select value={form.memberType} onValueChange={v => update('memberType', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="General">General</SelectItem><SelectItem value="Commercial">Commercial</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Farm Size (ha)</Label><Input type="number" step="0.1" value={form.farmSize} onChange={e => update('farmSize', e.target.value)} /></div>
      </div>
      <div className="space-y-1.5"><Label>Main Crops</Label><Input value={form.mainCrops} onChange={e => update('mainCrops', e.target.value)} placeholder="Maize, Coffee, Beans..." /></div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Register Farmer
        </Button>
      </DialogFooter>
    </form>
  )
}

// ─── Enhanced Farmer Detail with Tabs ─────────────────────────────

function FarmerDetail({ farmerId, onBack }: { farmerId: string; onBack: () => void }) {
  const { setActiveModule, setSelectedFarmerId } = useAppStore()
  const [farmer, setFarmer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [farmLands, setFarmLands] = useState<any[]>([])
  const [cultivations, setCultivations] = useState<any[]>([])
  const [creditScore, setCreditScore] = useState<any>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/farmers/${farmerId}`)
      .then(r => r.json())
      .then(data => {
        // API returns { data: farmer } — handle both shapes
        const f = data.data || data.farmer || data
        setFarmer(f)
        setFarmLands(f?.farms || [])
        // Flatten cultivations across all farms
        const allCults = (f?.farms || []).flatMap((fm: any) =>
          (fm.cultivations || []).map((c: any) => ({ ...c, farm: { id: fm.id, name: fm.name, sizeHectares: fm.sizeHectares } }))
        )
        setCultivations(allCults)
        // Latest credit score
        if (f?.creditScores?.[0]) setCreditScore(f.creditScores[0])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [farmerId])

  if (loading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
  if (!farmer) return <div className="text-center py-12"><AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-2" /><p>Farmer not found</p><Button variant="link" onClick={onBack}>Go back</Button></div>

  // Generate QR data URL (farm-passport URL)
  const qrData = JSON.stringify({
    type: 'AGROBASE_FARMER',
    id: farmer.id,
    code: farmer.farmerCode || farmer.id,
    name: `${farmer.firstName} ${farmer.lastName}`,
    phone: farmer.phone,
    url: `${typeof window !== 'undefined' ? window.location.origin : 'https://mobipay-agrobase.vercel.app'}/farmer/${farmer.id}`,
  })

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Farmers
      </Button>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
              {initials(farmer.firstName, farmer.lastName)}
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
              <InfoItem icon={<Users className="w-4 h-4" />} label="Name" value={`${farmer.firstName} ${farmer.lastName}`} />
              <InfoItem icon={<Phone className="w-4 h-4" />} label="Phone" value={farmer.phone} />
              <InfoItem icon={<Calendar className="w-4 h-4" />} label="Gender" value={farmer.gender || '—'} />
              <InfoItem icon={<CreditCard className="w-4 h-4" />} label="Member Type" value={farmer.memberType} />
              <InfoItem icon={<Sprout className="w-4 h-4" />} label="Farm Size" value={farmer.farmSize ? `${farmer.farmSize} ha` : '—'} />
              <InfoItem icon={<MapPin className="w-4 h-4" />} label="Code" value={farmer.farmerCode || '—'} />
              {farmer.education && <InfoItem icon={<Star className="w-4 h-4" />} label="Education" value={farmer.education} />}
              {farmer.mainCrops && <InfoItem icon={<Sprout className="w-4 h-4" />} label="Crops" value={farmer.mainCrops} />}
              {farmer.country && <InfoItem icon={<MapPin className="w-4 h-4" />} label="Country" value={farmer.country} />}
              {farmer.district && <InfoItem icon={<MapPin className="w-4 h-4" />} label="District" value={farmer.district} />}
              {farmer.villageName && <InfoItem icon={<MapPin className="w-4 h-4" />} label="Village" value={farmer.villageName} />}
              {farmer.bankName && <InfoItem icon={<Banknote className="w-4 h-4" />} label="Bank" value={`${farmer.bankName} ${farmer.bankAccountNo ? `(${farmer.bankAccountNo})` : ''}`} />}
            </div>
            {/* QR Code */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="bg-white p-2 rounded-lg border">
                <QRCodeSVG
                  id={`qr-${farmer.id}`}
                  value={qrData}
                  size={120}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">Traceability QR</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  const svg = document.getElementById(`qr-${farmer.id}`)
                  if (!svg) return
                  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`
                  const a = document.createElement('a')
                  a.href = dataUrl
                  a.download = `farmer-${farmer.farmerCode || farmer.id}.svg`
                  a.click()
                }}
              >
                <Download className="w-3 h-3" /> Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Status</p><Badge className={cn('mt-1', statusColor[farmer.status] || '')}>{farmer.status}</Badge></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Layers className="w-4 h-4 mx-auto text-emerald-600 mb-1" /><p className="text-xs text-muted-foreground">Farm Lands</p><p className="text-lg font-bold">{farmLands.length}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Sprout className="w-4 h-4 mx-auto text-amber-600 mb-1" /><p className="text-xs text-muted-foreground">Cultivations</p><p className="text-lg font-bold">{cultivations.length}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Users className="w-4 h-4 mx-auto text-blue-600 mb-1" /><p className="text-xs text-muted-foreground">Family</p><p className="text-lg font-bold">{farmer.familyMembers || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CreditCard className="w-4 h-4 mx-auto text-purple-600 mb-1" /><p className="text-xs text-muted-foreground">Credit Score</p><p className="text-lg font-bold">{creditScore?.totalScore || '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Calendar className="w-4 h-4 mx-auto text-slate-600 mb-1" /><p className="text-xs text-muted-foreground">Joined</p><p className="text-sm font-medium mt-1">{new Date(farmer.createdAt).toLocaleDateString()}</p></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Profile</TabsTrigger>
          <TabsTrigger value="farms" className="gap-1.5"><Layers className="w-3.5 h-3.5" /> Farm Lands ({farmLands.length})</TabsTrigger>
          <TabsTrigger value="cultivations" className="gap-1.5"><Sprout className="w-3.5 h-3.5" /> Cultivations ({cultivations.length})</TabsTrigger>
          <TabsTrigger value="trainings" className="gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Trainings</TabsTrigger>
          <TabsTrigger value="savings" className="gap-1.5"><PiggyBank className="w-3.5 h-3.5" /> Savings & Loans</TabsTrigger>
          <TabsTrigger value="impact" className="gap-1.5"><Activity className="w-3.5 h-3.5" /> Impact</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Demographics</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
              <DetailItem label="Date of Birth" value={farmer.dateOfBirth ? new Date(farmer.dateOfBirth).toLocaleDateString() : undefined} />
              <DetailItem label="Marital Status" value={farmer.maritalStatus} />
              <DetailItem label="Education" value={farmer.education} />
              <DetailItem label="National ID Type" value={farmer.nationalIdType} />
              <DetailItem label="National ID No" value={farmer.nationalIdNo} />
              <DetailItem label="Spouse Name" value={farmer.spouseName} />
              <DetailItem label="Children Under 18" value={farmer.childrenUnder18?.toString()} />
              <DetailItem label="School Going Children" value={farmer.schoolGoingChildren?.toString()} />
              <DetailItem label="Housing Ownership" value={farmer.housingOwnership} />
              <DetailItem label="House Type" value={farmer.houseType} />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Farm Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <DetailItem label="Total Farm Size" value={farmer.farmSize ? `${farmer.farmSize} ha` : undefined} />
                <DetailItem label="Farm Ownership" value={farmer.farmOwnership} />
                <DetailItem label="Main Crops" value={farmer.mainCrops} />
                <DetailItem label="Livestock Types" value={farmer.livestockTypes} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Loan History</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <DetailItem label="Loan Taken Last Year" value={farmer.loanTakenLastYear ? 'Yes' : 'No'} />
                <DetailItem label="Loan From" value={farmer.loanTakenFrom} />
                <DetailItem label="Loan Amount" value={farmer.loanAmount ? `UGX ${farmer.loanAmount.toLocaleString()}` : undefined} />
                <DetailItem label="Loan Purpose" value={farmer.loanPurpose} />
                <DetailItem label="Interest Rate" value={farmer.loanInterestPct ? `${farmer.loanInterestPct}% ${farmer.loanInterestPeriod || ''}` : undefined} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Farm Lands Tab */}
        <TabsContent value="farms" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Registered Farm Lands</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setSelectedFarmerId(farmerId)
                  setActiveModule('farm-lands')
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Farm Land
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {farmLands.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No farm lands registered for this farmer yet.</p>
                  <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => { setSelectedFarmerId(farmerId); setActiveModule('farm-lands') }}>
                    <Plus className="w-3.5 h-3.5" /> Register First Farm Land
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farm Name</TableHead>
                      <TableHead>Area (ha)</TableHead>
                      <TableHead>Ownership</TableHead>
                      <TableHead>Cultivations</TableHead>
                      <TableHead>GPS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {farmLands.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium text-sm">{f.name}</TableCell>
                        <TableCell className="text-sm">{f.sizeHectares?.toFixed(2) ?? '—'}</TableCell>
                        <TableCell className="text-sm">{f.landOwnership || '—'}</TableCell>
                        <TableCell className="text-sm">{f.cultivations?.length || 0}</TableCell>
                        <TableCell className="text-xs">
                          {(f.polygonPoints?.length ?? 0) >= 3 ? `${f.polygonPoints.length} pts` : 'No polygon'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cultivations Tab */}
        <TabsContent value="cultivations" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Cultivations</CardTitle>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setActiveModule('cultivations')}>
                <Plus className="w-3.5 h-3.5" /> Add Cultivation
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {cultivations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sprout className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No cultivations registered for this farmer yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crop</TableHead>
                      <TableHead>Variety</TableHead>
                      <TableHead>Farm</TableHead>
                      <TableHead>Season</TableHead>
                      <TableHead>Area (ha)</TableHead>
                      <TableHead>Seed Cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cultivations.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.cropName}</TableCell>
                        <TableCell className="text-sm">{c.variety || '—'}</TableCell>
                        <TableCell className="text-sm">{c.farm?.name || '—'}</TableCell>
                        <TableCell className="text-sm">{c.season || '—'}</TableCell>
                        <TableCell className="text-sm">{c.cultivationAreaHa?.toFixed(2) ?? '—'}</TableCell>
                        <TableCell className="text-sm">{c.seedCost ? `UGX ${c.seedCost.toLocaleString()}` : '—'}</TableCell>
                        <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trainings Tab */}
        <TabsContent value="trainings" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Training Attendance</CardTitle></CardHeader>
            <CardContent className="p-0">
              {(!farmer.trainings || farmer.trainings.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No training records yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Topic</TableHead>
                      <TableHead>Trainer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Attended</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {farmer.trainings.map((ta: any) => (
                      <TableRow key={ta.id}>
                        <TableCell className="font-medium text-sm">{ta.training?.topic || '—'}</TableCell>
                        <TableCell className="text-sm">{ta.training?.trainerName || '—'}</TableCell>
                        <TableCell className="text-sm">{ta.training?.date ? new Date(ta.training.date).toLocaleDateString() : '—'}</TableCell>
                        <TableCell><Badge variant="outline">{ta.attended ? 'Present' : 'Absent'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Savings & Loans Tab */}
        <TabsContent value="savings" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">VSLA Savings</CardTitle></CardHeader>
              <CardContent className="p-0">
                {(!farmer.savings || farmer.savings.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No savings recorded.</div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Shares</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {farmer.savings.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-sm">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm font-medium">UGX {s.amount?.toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{s.sharesBought}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">VSLA Loans</CardTitle></CardHeader>
              <CardContent className="p-0">
                {(!farmer.vslaLoans || farmer.vslaLoans.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No loans recorded.</div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {farmer.vslaLoans.map((l: any) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-sm">{new Date(l.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm font-medium">UGX {l.amount?.toLocaleString()}</TableCell>
                          <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Impact Tab */}
        <TabsContent value="impact" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Credit Score</CardTitle></CardHeader>
              <CardContent>
                {creditScore ? (
                  <div className="text-center">
                    <div className="text-4xl font-bold text-emerald-600">{creditScore.totalScore || '—'}</div>
                    <p className="text-xs text-muted-foreground mt-1">out of 900</p>
                    <Separator className="my-3" />
                    <div className="space-y-2 text-sm text-left">
                      <DetailItem label="Demographics (15%)" value={`${creditScore.demographicsScore || 0}/100`} />
                      <DetailItem label="Assets (25%)" value={`${creditScore.assetScore || 0}/100`} />
                      <DetailItem label="Crop Perf (25%)" value={`${creditScore.cropScore || 0}/100`} />
                      <DetailItem label="Financial (35%)" value={`${creditScore.financialScore || 0}/100`} />
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-6">No credit score yet.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Impact Baseline</CardTitle></CardHeader>
              <CardContent>
                {farmer.impactBaseline ? (
                  <div className="space-y-2 text-sm">
                    <DetailItem label="Baseline Date" value={new Date(farmer.impactBaseline.baselineDate).toLocaleDateString()} />
                    <DetailItem label="Income (annual)" value={farmer.impactBaseline.annualIncome ? `UGX ${farmer.impactBaseline.annualIncome.toLocaleString()}` : undefined} />
                    <DetailItem label="Food Security" value={farmer.impactBaseline.foodSecurityMonths ? `${farmer.impactBaseline.foodSecurityMonths} months` : undefined} />
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-6">No baseline set.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Practice Adoptions</CardTitle></CardHeader>
              <CardContent>
                {farmer.practiceAdoptions?.length > 0 ? (
                  <p className="text-3xl font-bold text-emerald-600 text-center mt-4">{farmer.practiceAdoptions.length}</p>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-6">No practices adopted.</p>
                )}
                <p className="text-xs text-muted-foreground text-center mt-1">sustainable practices adopted</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div><p className="text-[11px] text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  )
}

// ─── CSV Import Form ───────────────────────────────────────────────

const CSV_TEMPLATE = `firstName,lastName,phone,gender,email,memberType,mainCrops,villageName,district,country,farmSize,familyMembers,childrenUnder18
John,Mugisha,+256700000020,Male,john@example.com,General,Coffee,Kibale,Mukono,Uganda,1.5,5,3
Sarah,Achieng,+256700000021,Female,sarah@example.com,General,Maize;Beans,Wakiso,Wakiso,Uganda,2.0,6,4
Kwame,Mensah,+233200000020,Male,kwame@example.com,Commercial,Cocoa,Kumasi,Ashanti,Ghana,3.5,8,5`

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Simple CSV parser (handles quoted values with commas)
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    rows.push(row)
  }

  return rows
}

function CsvImportForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number; total: number; errors: Array<{ row: number; error: string }> } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Please upload a CSV file')
      return
    }
    setFileName(file.name)
    const text = await file.text()
    const parsed = parseCSV(text)
    setParsedData(parsed)
    setResult(null)
    if (parsed.length === 0) {
      toast.error('No data rows found in CSV')
    } else {
      toast.success(`Parsed ${parsed.length} rows from CSV`)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'farmer-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error('No data to import')
      return
    }
    setImporting(true)
    try {
      const res = await fetch('/api/farmers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmers: parsedData }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
        if (data.success > 0) {
          toast.success(`Imported ${data.success} farmers successfully`)
        }
        if (data.failed > 0) {
          toast.warning(`${data.failed} rows failed — see details below`)
        }
      } else {
        toast.error(data.error || 'Import failed')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setImporting(false)
    }
  }

  const validRows = parsedData.filter(r => (r.firstName || r.first_name) && (r.lastName || r.last_name) && (r.phone || r.Phone))
  const invalidRows = parsedData.length - validRows.length

  return (
    <div className="space-y-4">
      {/* Template download */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span className="text-sm">Need a template?</span>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
          <FileDown className="w-3.5 h-3.5" /> Download CSV Template
        </Button>
      </div>

      {/* File upload area */}
      {!result && (
        <>
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer',
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            {fileName ? (
              <>
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground mt-1">{parsedData.length} rows parsed · Click to choose another file</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Drop CSV file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Max 1000 rows · Supported: .csv</p>
              </>
            )}
            <input
              id="csv-file-input"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* Preview table */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Preview ({parsedData.length} rows)</p>
                <div className="flex gap-2 text-xs">
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <CheckCircle className="w-3 h-3 mr-1" /> {validRows.length} valid
                  </Badge>
                  {invalidRows > 0 && (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      <XCircle className="w-3 h-3 mr-1" /> {invalidRows} invalid
                    </Badge>
                  )}
                </div>
              </div>
              <div className="max-h-64 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">First Name</TableHead>
                      <TableHead className="text-xs">Last Name</TableHead>
                      <TableHead className="text-xs">Phone</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Gender</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Village</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell">District</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 50).map((row, i) => {
                      const fn = row.firstName || row.first_name || ''
                      const ln = row.lastName || row.last_name || ''
                      const ph = row.phone || row.Phone || ''
                      const isValid = fn && ln && ph
                      return (
                        <TableRow key={i} className={cn(!isValid && 'bg-red-50 dark:bg-red-950/20')}>
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="text-xs font-medium">{fn || <span className="text-red-500">—</span>}</TableCell>
                          <TableCell className="text-xs">{ln || <span className="text-red-500">—</span>}</TableCell>
                          <TableCell className="text-xs font-mono">{ph || <span className="text-red-500">—</span>}</TableCell>
                          <TableCell className="text-xs hidden md:table-cell">{row.gender || row.Gender || '—'}</TableCell>
                          <TableCell className="text-xs hidden md:table-cell">{row.villageName || row.village_name || row.village || '—'}</TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">{row.district || row.District || '—'}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {parsedData.length > 50 && (
                <p className="text-xs text-muted-foreground text-center">Showing first 50 of {parsedData.length} rows</p>
              )}
            </div>
          )}

          {/* Actions */}
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleImport} disabled={importing || parsedData.length === 0} className="gap-2">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import {parsedData.length > 0 ? `${validRows.length} Farmers` : ''}
            </Button>
          </DialogFooter>
        </>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
              <p className="text-2xl font-bold text-emerald-600">{result.success}</p>
              <p className="text-xs text-muted-foreground">Successfully Imported</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold text-red-600">{result.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-600">{result.total}</p>
              <p className="text-xs text-muted-foreground">Total Processed</p>
            </CardContent></Card>
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600">Errors ({result.errors.length})</p>
              <div className="max-h-48 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Row</TableHead>
                      <TableHead className="text-xs">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((err, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">{err.row}</TableCell>
                        <TableCell className="text-xs text-red-600">{err.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setParsedData([]); setFileName(''); setResult(null) }} className="gap-2">
              <Upload className="w-4 h-4" /> Import Another File
            </Button>
            <Button onClick={onSaved} className="gap-2">
              <CheckCircle className="w-4 h-4" /> Done
            </Button>
          </DialogFooter>
        </div>
      )}

      {/* Field reference */}
      {!result && parsedData.length === 0 && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Expected CSV columns (minimum required marked with *):</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-[11px] text-blue-600 dark:text-blue-400">
            <span><strong>firstName*</strong></span>
            <span><strong>lastName*</strong></span>
            <span><strong>phone*</strong></span>
            <span>gender</span>
            <span>email</span>
            <span>memberType</span>
            <span>mainCrops</span>
            <span>villageName</span>
            <span>district</span>
            <span>country</span>
            <span>farmSize</span>
            <span>familyMembers</span>
            <span>childrenUnder18</span>
            <span>education</span>
            <span>maritalStatus</span>
            <span>nationalIdNo</span>
            <span>farmerCode</span>
            <span>&nbsp;</span>
          </div>
        </div>
      )}
    </div>
  )
}


