'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Search, Plus, Eye, X, Loader2, Download, CheckCircle, XCircle, AlertCircle,
  Clock, DollarSign, ShoppingCart, FileCheck, Filter, ChevronLeft, ChevronRight
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface Purchase {
  id: string
  farmerName: string
  farmerCode: string
  commodity: string
  variety: string
  quantity: number
  unit: string
  unitPrice: number
  totalAmount: number
  charges: number
  taxes: number
  netAmount: number
  status: 'PENDING' | 'REVIEWED' | 'APPROVED' | 'PAID' | 'REJECTED'
  date: string
  reviewedBy?: string
  reviewedAt?: string
  notes?: string
}

const purchaseStatusColor: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  REVIEWED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const statusPipeline = ['PENDING', 'REVIEWED', 'APPROVED', 'PAID']

const mockPurchases: Purchase[] = [
  { id: 'pu1', farmerName: 'James Okello', farmerCode: 'FRM-001', commodity: 'Coffee', variety: 'Arabica SL14', quantity: 250, unit: 'kg', unitPrice: 8500, totalAmount: 2125000, charges: 53125, taxes: 106250, netAmount: 1858125, status: 'PAID', date: '2024-11-15', reviewedBy: 'Admin', reviewedAt: '2024-11-16' },
  { id: 'pu2', farmerName: 'Grace Achieng', farmerCode: 'FRM-012', commodity: 'Coffee', variety: 'Robusta Nganda', quantity: 400, unit: 'kg', unitPrice: 5500, totalAmount: 2200000, charges: 55000, taxes: 110000, netAmount: 2035000, status: 'APPROVED', date: '2024-11-18', reviewedBy: 'Admin', reviewedAt: '2024-11-19' },
  { id: 'pu3', farmerName: 'Sarah Nakamya', farmerCode: 'FRM-023', commodity: 'Vanilla', variety: 'Bourbon', quantity: 15, unit: 'kg', unitPrice: 85000, totalAmount: 1275000, charges: 31875, taxes: 63750, netAmount: 1179375, status: 'REVIEWED', date: '2024-11-20' },
  { id: 'pu4', farmerName: 'Peter Ochieng', farmerCode: 'FRM-031', commodity: 'Cocoa', variety: 'Forastero', quantity: 100, unit: 'kg', unitPrice: 12000, totalAmount: 1200000, charges: 30000, taxes: 60000, netAmount: 1110000, status: 'PENDING', date: '2024-11-22' },
  { id: 'pu5', farmerName: 'Wangari Muthoni', farmerCode: 'FRM-045', commodity: 'Coffee', variety: 'Arabica Ruiru 11', quantity: 180, unit: 'kg', unitPrice: 9200, totalAmount: 1656000, charges: 41400, taxes: 82800, netAmount: 1531800, status: 'PENDING', date: '2024-11-23' },
  { id: 'pu6', farmerName: 'Kwame Asante', farmerCode: 'FRM-078', commodity: 'Cocoa', variety: 'Amelonado', quantity: 320, unit: 'kg', unitPrice: 10500, totalAmount: 3360000, charges: 84000, taxes: 168000, netAmount: 3108000, status: 'REJECTED', date: '2024-11-10', reviewedBy: 'Admin', reviewedAt: '2024-11-11', notes: 'Quality below standard' },
  { id: 'pu7', farmerName: 'James Okello', farmerCode: 'FRM-001', commodity: 'Avocado', variety: 'Hass', quantity: 500, unit: 'kg', unitPrice: 3500, totalAmount: 1750000, charges: 43750, taxes: 87500, netAmount: 1618750, status: 'PAID', date: '2024-11-12', reviewedBy: 'Admin', reviewedAt: '2024-11-13' },
  { id: 'pu8', farmerName: 'Grace Achieng', farmerCode: 'FRM-012', commodity: 'Cassava', variety: 'NASE 14', quantity: 1000, unit: 'kg', unitPrice: 800, totalAmount: 800000, charges: 20000, taxes: 40000, netAmount: 740000, status: 'APPROVED', date: '2024-11-20', reviewedBy: 'Admin', reviewedAt: '2024-11-21' },
  { id: 'pu9', farmerName: 'Peter Ochieng', farmerCode: 'FRM-031', commodity: 'Jackfruit', variety: 'Golden', quantity: 200, unit: 'kg', unitPrice: 2500, totalAmount: 500000, charges: 12500, taxes: 25000, netAmount: 462500, status: 'PENDING', date: '2024-11-24' },
]

export default function PurchasesView() {
  const { } = useAppStore()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [commodityFilter, setCommodityFilter] = useState('')
  const [showDetail, setShowDetail] = useState<Purchase | null>(null)
  const [showConfirm, setShowConfirm] = useState<{ action: 'approve' | 'reject'; purchase: Purchase } | null>(null)
  const [page, setPage] = useState(1)
  const limit = 10

  const fetchPurchases = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/purchases')
      if (res.ok) {
        const data = await res.json()
        setPurchases(data.purchases || data.data || [])
      } else {
        setPurchases(mockPurchases)
      }
    } catch {
      setPurchases(mockPurchases)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPurchases() }, [fetchPurchases])

  const filtered = purchases.filter(p => {
    const matchSearch = !search || p.farmerName.toLowerCase().includes(search.toLowerCase()) || p.farmerCode.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || p.status === statusFilter
    const matchCommodity = !commodityFilter || p.commodity === commodityFilter
    return matchSearch && matchStatus && matchCommodity
  })

  const commodities = [...new Set(purchases.map(p => p.commodity))]

  const stats = {
    total: purchases.length,
    pendingReview: purchases.filter(p => p.status === 'PENDING').length,
    approved: purchases.filter(p => ['APPROVED', 'PAID'].includes(p.status)).length,
    totalValue: purchases.filter(p => p.status !== 'REJECTED').reduce((s, p) => s + ((p as any).netAmount || p.totalAmount || 0), 0),
  }

  const statusData = statusPipeline.map(s => ({
    status: s,
    count: purchases.filter(p => p.status === s).length,
  }))

  const commodityData = Object.entries(
    purchases.filter(p => p.status !== 'REJECTED').reduce((acc, p) => { const amt = (p as any).netAmount || p.totalAmount || 0; acc[p.commodity] = (acc[p.commodity] || 0) + amt; return acc }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!showConfirm) return
    const purchase = showConfirm.purchase
    const newStatus = action === 'approve' ? (purchase.status === 'PENDING' ? 'REVIEWED' : 'APPROVED') : 'REJECTED'
    try {
      const res = await fetch(`/api/purchases/${purchase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Purchase ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
      fetchPurchases()
    } catch {
      toast.error(`Failed to ${action} purchase`)
    }
    setShowConfirm(null)
  }

  const paged = filtered.slice((page - 1) * limit, page * limit)
  const totalPages = Math.ceil(filtered.length / limit)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Purchase Management</h3>
          <p className="text-sm text-muted-foreground">Review and manage farmer produce purchases</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => toast.info('Export feature coming soon')}>
          <Download className="w-4 h-4" /> Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Total Purchases</p><p className="text-xl font-bold">{stats.total}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-muted-foreground">Pending Review</p><p className="text-xl font-bold">{stats.pendingReview}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><FileCheck className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Approved</p><p className="text-xl font-bold">{stats.approved}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Total Value</p><p className="text-lg font-bold">UGX {(stats.totalValue / 1000000).toFixed(1)}M</p></div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by farmer name or code..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REVIEWED">Reviewed</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={commodityFilter} onValueChange={v => { setCommodityFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Commodity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {commodities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || statusFilter || commodityFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); setCommodityFilter(''); setPage(1) }} className="gap-1"><X className="w-3.5 h-3.5" /> Clear</Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No purchases found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead className="hidden sm:table-cell">Commodity</TableHead>
                    <TableHead className="hidden md:table-cell">Qty</TableHead>
                    <TableHead className="hidden lg:table-cell">Charges</TableHead>
                    <TableHead className="hidden lg:table-cell">Taxes</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map(p => (
                    <TableRow key={p.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{p.farmerName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{p.farmerCode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div>
                          <p className="text-sm">{p.commodity}</p>
                          <p className="text-[10px] text-muted-foreground">{p.variety}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{p.quantity} {p.unit}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-amber-600">UGX {((p as any).charges || 0).toLocaleString()}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-red-600">UGX {((p as any).taxes || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">UGX {((p as any).netAmount || p.totalAmount || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground line-through">UGX {p.totalAmount.toLocaleString()}</p>
                      </TableCell>
                      <TableCell><Badge className={cn('text-[10px]', purchaseStatusColor[p.status] || '')}>{p.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDetail(p)} title="View details">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {p.status !== 'PAID' && p.status !== 'REJECTED' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowConfirm({ action: 'approve', purchase: p })} title="Approve">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowConfirm({ action: 'reject', purchase: p })} title="Reject">
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </>
                          )}
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
          <CardHeader className="pb-2"><CardTitle className="text-sm">Purchase Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Value by Commodity</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={commodityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => `UGX ${Number(v).toLocaleString()}`} />
                <Bar dataKey="value" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={open => !open && setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Purchase Details</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Farmer</p><p className="text-sm font-medium">{showDetail.farmerName}</p></div>
                <div><p className="text-xs text-muted-foreground">Code</p><p className="text-sm font-mono">{showDetail.farmerCode}</p></div>
                <div><p className="text-xs text-muted-foreground">Commodity</p><p className="text-sm">{showDetail.commodity}</p></div>
                <div><p className="text-xs text-muted-foreground">Variety</p><p className="text-sm">{showDetail.variety}</p></div>
                <div><p className="text-xs text-muted-foreground">Quantity</p><p className="text-sm">{showDetail.quantity} {showDetail.unit}</p></div>
                <div><p className="text-xs text-muted-foreground">Unit Price</p><p className="text-sm">UGX {showDetail.unitPrice.toLocaleString()}</p></div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gross Amount</span><span>UGX {showDetail.totalAmount.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Charges (2.5%)</span><span className="text-amber-600">- UGX {((showDetail as any).charges || 0).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxes (5%)</span><span className="text-red-600">- UGX {((showDetail as any).taxes || 0).toLocaleString()}</span></div>
                <Separator />
                <div className="flex justify-between font-bold"><span>Net Amount</span><span className="text-emerald-700 dark:text-emerald-400">UGX {((showDetail as any).netAmount || showDetail.totalAmount || 0).toLocaleString()}</span></div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn('text-xs', purchaseStatusColor[showDetail.status] || '')}>{showDetail.status}</Badge>
                {showDetail.reviewedBy && <span className="text-xs text-muted-foreground">Reviewed by {showDetail.reviewedBy} on {showDetail.reviewedAt}</span>}
              </div>
              {showDetail.notes && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">{showDetail.notes}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={!!showConfirm} onOpenChange={open => !open && setShowConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className={cn(showConfirm?.action === 'approve' ? 'text-emerald-700' : 'text-red-700')}>
              {showConfirm?.action === 'approve' ? 'Approve Purchase' : 'Reject Purchase'}
            </DialogTitle>
          </DialogHeader>
          {showConfirm && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {showConfirm.action === 'approve'
                  ? `Are you sure you want to approve the purchase from ${showConfirm.purchase.farmerName} for UGX ${((showConfirm.purchase as any).netAmount || showConfirm.purchase.totalAmount || 0).toLocaleString()}?`
                  : `Are you sure you want to reject the purchase from ${showConfirm.purchase.farmerName}? This action cannot be undone.`}
              </p>
              {showConfirm.action === 'reject' && (
                <div className="space-y-1.5">
                  <Label>Rejection Reason</Label>
                  <Input placeholder="Enter reason..." id="reject-reason" />
                </div>
              )}
              <DialogFooter className="gap-2">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button
                  variant={showConfirm.action === 'approve' ? 'default' : 'destructive'}
                  onClick={() => handleAction(showConfirm.action)}
                  className="gap-2"
                >
                  {showConfirm.action === 'approve' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {showConfirm.action === 'approve' ? 'Approve' : 'Reject'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}