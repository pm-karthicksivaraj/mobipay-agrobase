'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Search, Plus, Eye, X, UserPlus, Phone, MapPin, Sprout, Calendar, CreditCard,
  ChevronLeft, ChevronRight, Filter, Loader2, Users, ArrowLeft, Star, AlertCircle
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
  const { selectedFarmerId, setSelectedFarmerId } = useAppStore()
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
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
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Farmer
        </Button>
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

function FarmerDetail({ farmerId, onBack }: { farmerId: string; onBack: () => void }) {
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/farmers/${farmerId}`)
      .then(r => r.json())
      .then(data => setFarmer(data.farmer || data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [farmerId])

  if (loading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
  if (!farmer) return <div className="text-center py-12"><AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-2" /><p>Farmer not found</p><Button variant="link" onClick={onBack}>Go back</Button></div>

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Farmers
      </Button>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Status</p><Badge className={cn('mt-1', statusColor[farmer.status] || '')}>{farmer.status}</Badge></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Family</p><p className="text-lg font-bold mt-1">{farmer.familyMembers || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Children &lt;18</p><p className="text-lg font-bold mt-1">{farmer.childrenUnder18 || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Joined</p><p className="text-sm font-medium mt-1">{new Date(farmer.createdAt).toLocaleDateString()}</p></CardContent></Card>
      </div>
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