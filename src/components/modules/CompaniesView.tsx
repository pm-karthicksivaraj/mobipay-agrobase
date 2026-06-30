'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Search, Plus, Building2, Phone, Mail, Users, X, Loader2,
  Filter, Eye, MapPin, Globe, ChevronLeft, ChevronRight, Landmark, Truck,
  Pencil, Trash2
} from 'lucide-react'
import { safeFetch, extractArray } from '@/lib/safe-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Company {
  id: string
  name: string
  type: string
  contactPerson: string
  phone: string
  email: string
  status: string
  address?: string
  website?: string
  farmerGroupCount: number
  createdAt: string
}

const COMPANY_TYPES = [
  'Cooperative', 'Agribusiness', 'Exporter', 'Processor',
  'Input Supplier', 'Buyer', 'NGO', 'Government Agency', 'Certification Body', 'Other'
]

const statusColor: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  INACTIVE: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const typeColor: Record<string, string> = {
  Cooperative: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  Agribusiness: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  Exporter: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  Processor: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  'Input Supplier': 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  Buyer: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  NGO: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  'Government Agency': 'bg-slate-50 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400',
  'Certification Body': 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  Other: 'bg-gray-50 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400',
}

// Demo data for when no API is available
const DEMO_COMPANIES: Company[] = [
  { id: '1', name: 'Kyagalanyi Coffee Ltd', type: 'Exporter', contactPerson: 'James Mugisha', phone: '+256 312 123456', email: 'info@kyagalanyi.co.ug', status: 'ACTIVE', address: 'Kampala Industrial Area', website: 'kyagalanyi.co.ug', farmerGroupCount: 156, createdAt: '2024-01-15T00:00:00Z' },
  { id: '2', name: 'Bugisu Cooperative Union', type: 'Cooperative', contactPerson: 'Sarah Nambuya', phone: '+256 414 567890', email: 'admin@bugisucoop.org', status: 'ACTIVE', address: 'Mbale Town', farmerGroupCount: 342, createdAt: '2023-11-20T00:00:00Z' },
  { id: '3', name: 'Uganda Coffee Development Authority', type: 'Government Agency', contactPerson: 'Dr. Emmanuel Iyamulemye', phone: '+256 312 345678', email: 'info@ucda.or.ug', status: 'ACTIVE', address: 'Coffee House, Kampala', farmerGroupCount: 0, createdAt: '2023-06-10T00:00:00Z' },
  { id: '4', name: 'Glenfiddich Farms', type: 'Agribusiness', contactPerson: 'Peter Okello', phone: '+256 773 456789', email: 'peter@glenfiddich.ug', status: 'PENDING', address: 'Gulu, Northern Uganda', farmerGroupCount: 45, createdAt: '2024-03-01T00:00:00Z' },
  { id: '5', name: 'Nile Agro Processors', type: 'Processor', contactPerson: 'Grace Achieng', phone: '+256 782 345678', email: 'grace@nileagro.ug', status: 'ACTIVE', address: 'Jinja Industrial Area', farmerGroupCount: 89, createdAt: '2024-02-14T00:00:00Z' },
  { id: '6', name: 'Green World Inputs Ltd', type: 'Input Supplier', contactPerson: 'Tom Otim', phone: '+256 702 987654', email: 'sales@greenworldinputs.ug', status: 'ACTIVE', address: 'Lugogo, Kampala', farmerGroupCount: 234, createdAt: '2023-12-05T00:00:00Z' },
  { id: '7', name: 'RA Certification East Africa', type: 'Certification Body', contactPerson: 'Maria Nakamya', phone: '+256 314 456789', email: 'certifications@ra-ea.org', status: 'ACTIVE', address: 'Kololo, Kampala', farmerGroupCount: 520, createdAt: '2023-08-22T00:00:00Z' },
  { id: '8', name: 'Tropical Commodity Traders', type: 'Buyer', contactPerson: 'Hassan Wabwire', phone: '+256 758 654321', email: 'hassan@tropicalcom.ug', status: 'INACTIVE', address: 'Nakasero, Kampala', farmerGroupCount: 78, createdAt: '2024-01-28T00:00:00Z' },
  { id: '9', name: 'Agricultural NGO Alliance', type: 'NGO', contactPerson: 'Agnes Birungi', phone: '+256 773 876543', email: 'info@anga.or.ug', status: 'ACTIVE', address: 'Ntinda, Kampala', farmerGroupCount: 167, createdAt: '2023-09-15T00:00:00Z' },
  { id: '10', name: 'Mount Elgon Coffee Exporters', type: 'Exporter', contactPerson: 'David Wanyama', phone: '+256 783 543210', email: 'david@melcoffee.ug', status: 'ACTIVE', address: 'Mbale Industrial Area', farmerGroupCount: 234, createdAt: '2023-10-03T00:00:00Z' },
  { id: '11', name: 'West Nile Farmers Cooperative', type: 'Cooperative', contactPerson: 'Charles Draku', phone: '+256 473 210987', email: 'wnfc@cooperative.ug', status: 'PENDING', address: 'Arua Town', farmerGroupCount: 98, createdAt: '2024-04-10T00:00:00Z' },
  { id: '12', name: 'Sunrise Agribusiness Solutions', type: 'Agribusiness', contactPerson: 'Linda Nakasujja', phone: '+256 704 321654', email: 'linda@sunriseagri.ug', status: 'ACTIVE', address: 'Entebbe Road', farmerGroupCount: 56, createdAt: '2024-02-28T00:00:00Z' },
  { id: '13', name: 'Uganda Organic Certification Ltd', type: 'Certification Body', contactPerson: 'John Musinguzi', phone: '+256 312 765432', email: 'cert@uocert.ug', status: 'SUSPENDED', address: 'Makerere, Kampala', farmerGroupCount: 312, createdAt: '2023-07-18T00:00:00Z' },
]

export default function CompaniesView() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [showDetail, setShowDetail] = useState<Company | null>(null)

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (typeFilter) params.set('type', typeFilter)
      if (statusFilter) params.set('status', statusFilter)
      const url = `/api/companies${params.toString() ? `?${params}` : ''}`
      const data = await safeFetch(url)
      const raw = extractArray(data, 'companies', 'data')
      if (raw.length > 0) {
        const mapped: Company[] = raw.map((c: any) => ({
          id: c.id,
          name: c.name || '',
          type: c.type || 'Other',
          contactPerson: c.contactPerson || '',
          phone: c.phone || '',
          email: c.email || '',
          status: c.status || (c.isActive === false ? 'INACTIVE' : 'ACTIVE'),
          address: c.address || undefined,
          website: c.website || undefined,
          farmerGroupCount: c.farmerGroupCount ?? c._count?.farmerGroups ?? 0,
          createdAt: c.createdAt || new Date().toISOString(),
        }))
        setCompanies(mapped)
      } else {
        setCompanies(DEMO_COMPANIES)
      }
    } catch {
      setCompanies(DEMO_COMPANIES)
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statusFilter])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return
    try {
      const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Company deleted')
        fetchCompanies()
      } else {
        toast.error('Failed to delete company')
      }
    } catch {
      toast.error('Failed to delete company')
    }
  }

  const openEdit = (company: Company) => {
    setEditingCompany(company)
    setShowAdd(true)
  }

  const openAdd = () => {
    setEditingCompany(null)
    setShowAdd(true)
  }

  // Filter data client-side for demo data
  const filtered = companies.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.contactPerson.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter && c.type !== typeFilter) return false
    if (statusFilter && c.status !== statusFilter) return false
    return true
  })

  const totalCompanies = companies.length
  const cooperatives = companies.filter(c => c.type === 'Cooperative').length
  const exporters = companies.filter(c => c.type === 'Exporter').length
  const activeCount = companies.filter(c => c.status === 'ACTIVE').length
  const totalFarmerGroups = companies.reduce((s, c) => s + c.farmerGroupCount, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Company & Cooperative Management
          </h3>
          <p className="text-sm text-muted-foreground">{totalCompanies} companies registered · {totalFarmerGroups} farmer groups served</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" /> Add Company
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Companies</p>
                <p className="text-xl font-bold">{totalCompanies}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                <Landmark className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cooperatives</p>
                <p className="text-xl font-bold">{cooperatives}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                <Truck className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Exporters</p>
                <p className="text-xl font-bold">{exporters}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-bold">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or contact person..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Company Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {COMPANY_TYPES.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
        {(typeFilter || statusFilter || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setTypeFilter(''); setStatusFilter(''); setSearch('') }} className="gap-1">
            <X className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No companies found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden lg:table-cell">Contact Person</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="hidden xl:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Farmer Groups</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setShowDetail(c)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-[200px]">{c.name}</p>
                            {c.address && <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{c.address}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className={cn('text-[10px]', typeColor[c.type] || '')}>{c.type}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{c.contactPerson}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{c.phone}</TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground truncate max-w-[180px]">{c.email}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm font-medium">{c.farmerGroupCount}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-[10px]', statusColor[c.status] || '')}>{c.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setShowDetail(c) }} title="View details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(c) }} title="Edit">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.name) }} title="Delete">
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
            <p className="text-sm text-muted-foreground">Showing {filtered.length} of {totalCompanies} companies</p>
          </div>
        )}
      </Card>

      {/* Add/Edit Company Dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) setEditingCompany(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              {editingCompany ? 'Edit Company' : 'Add New Company'}
            </DialogTitle>
          </DialogHeader>
          <AddCompanyForm
            initial={editingCompany}
            onClose={() => { setShowAdd(false); setEditingCompany(null); fetchCompanies() }}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {showDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  {showDetail.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs', typeColor[showDetail.type] || '')}>{showDetail.type}</Badge>
                  <Badge className={cn('text-xs', statusColor[showDetail.status] || '')}>{showDetail.status}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailItem icon={<Users className="w-4 h-4" />} label="Contact Person" value={showDetail.contactPerson} />
                  <DetailItem icon={<Phone className="w-4 h-4" />} label="Phone" value={showDetail.phone} />
                  <DetailItem icon={<Mail className="w-4 h-4" />} label="Email" value={showDetail.email} />
                  <DetailItem icon={<MapPin className="w-4 h-4" />} label="Address" value={showDetail.address || '—'} />
                  <DetailItem icon={<Globe className="w-4 h-4" />} label="Website" value={showDetail.website || '—'} />
                  <DetailItem icon={<Landmark className="w-4 h-4" />} label="Farmer Groups" value={String(showDetail.farmerGroupCount)} />
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Registered on {new Date(showDetail.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function AddCompanyForm({ initial, onClose }: { initial: Company | null; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: initial?.name || '',
    type: initial?.type || '',
    contactPerson: initial?.contactPerson || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    address: initial?.address || '',
    website: initial?.website || '',
    status: initial?.status || 'PENDING',
  })

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.type || !form.contactPerson) {
      toast.error('Company name, type, and contact person are required')
      return
    }
    setSaving(true)
    try {
      const isEdit = !!initial
      const url = isEdit ? `/api/companies/${initial!.id}` : '/api/companies'
      const method = isEdit ? 'PUT' : 'POST'
      // Map UI status (ACTIVE/INACTIVE/...) to isActive boolean for the API
      const payload: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        contactPerson: form.contactPerson,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        isActive: form.status !== 'INACTIVE' && form.status !== 'SUSPENDED',
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success(isEdit ? 'Company updated successfully' : 'Company added successfully')
        onClose()
        return
      }
      const errBody = await res.json().catch(() => null)
      toast.error(errBody?.error || `Failed to ${isEdit ? 'update' : 'create'} company`)
    } catch {
      toast.error(`Failed to ${initial ? 'update' : 'create'} company`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Company Name *</Label>
        <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Kyagalanyi Coffee Ltd" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Type *</Label>
          <Select value={form.type} onValueChange={v => update('type', v)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {COMPANY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => update('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Contact Person *</Label>
        <Input value={form.contactPerson} onChange={e => update('contactPerson', e.target.value)} placeholder="Full name" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+256..." /></div>
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="company@example.com" /></div>
      </div>
      <div className="space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Physical address" /></div>
      <div className="space-y-1.5"><Label>Website</Label><Input value={form.website} onChange={e => update('website', e.target.value)} placeholder="www.example.com" /></div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add Company
        </Button>
      </DialogFooter>
    </form>
  )
}