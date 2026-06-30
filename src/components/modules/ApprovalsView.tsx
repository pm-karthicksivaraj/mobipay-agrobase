'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  ClipboardCheck, CheckCircle, XCircle, Clock, AlertTriangle,
  ShoppingCart, DollarSign, Package, Search, X, Loader2, Filter,
  TrendingUp, ArrowUpDown, Eye, RefreshCw
} from 'lucide-react'
import { safeFetch, extractArray } from '@/lib/safe-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface ApprovalItem {
  id: string
  type: 'PURCHASE' | 'LOAN' | 'INPUT_REQUEST'
  reference: string
  requesterName: string
  description: string
  amount?: number
  currency?: string
  quantity?: number
  unit?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  details?: Record<string, any>
}

const typeIcon: Record<string, React.ReactNode> = {
  PURCHASE: <ShoppingCart className="w-4 h-4" />,
  LOAN: <DollarSign className="w-4 h-4" />,
  INPUT_REQUEST: <Package className="w-4 h-4" />,
}

const typeColor: Record<string, string> = {
  PURCHASE: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  LOAN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  INPUT_REQUEST: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}

const statusColor: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const priorityColor: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const DEMO_APPROVALS: ApprovalItem[] = [
  { id: '1', type: 'PURCHASE', reference: 'PO-2024-0123', requesterName: 'Bugisu Cooperative Union', description: 'Bulk purchase of 5,000 kg of organic coffee cherries from Mt. Elgon zone farmers', amount: 25000000, currency: 'UGX', status: 'PENDING', priority: 'HIGH', submittedAt: '2024-04-15T07:00:00Z', details: { supplier: 'Mt. Elgon Farmers Association', deliveryDate: '2024-04-25', paymentTerms: 'Net 30' } },
  { id: '2', type: 'LOAN', reference: 'LN-2024-0456', requesterName: 'Linda Nakasujja', description: 'Agricultural input loan for maize planting season - seeds, fertilizer, and labor costs', amount: 500000, currency: 'UGX', status: 'PENDING', priority: 'MEDIUM', submittedAt: '2024-04-14T14:30:00Z', details: { loanProduct: 'Input Loan', repaymentPeriod: '6 months', interestRate: '12%', collateral: 'VSLA savings' } },
  { id: '3', type: 'INPUT_REQUEST', reference: 'IR-2024-0789', requesterName: 'John Mugisha', description: 'Request for 200kg of NPK fertilizer and 50kg of improved maize seeds for 45 farmers in the cooperative', quantity: 250, unit: 'kg', status: 'PENDING', priority: 'HIGH', submittedAt: '2024-04-15T08:15:00Z', details: { inputType: 'Fertilizer + Seeds', zone: 'Mt. Elgon', deliveryLocation: 'Budadiri Collection Center' } },
  { id: '4', type: 'PURCHASE', reference: 'PO-2024-0124', requesterName: 'Nile Agro Processors', description: 'Purchase of 10,000 kg of sunflower seeds for oil processing', amount: 45000000, currency: 'UGX', status: 'PENDING', priority: 'URGENT', submittedAt: '2024-04-15T06:00:00Z', details: { supplier: 'Northern Farmers Alliance', deliveryDate: '2024-04-20', qualityGrade: 'Grade 1' } },
  { id: '5', type: 'LOAN', reference: 'LN-2024-0457', requesterName: 'Charles Draku', description: 'Emergency loan for post-harvest storage facility construction', amount: 2000000, currency: 'UGX', status: 'PENDING', priority: 'HIGH', submittedAt: '2024-04-13T10:00:00Z', details: { loanProduct: 'Development Loan', repaymentPeriod: '12 months', interestRate: '10%' } },
  { id: '6', type: 'INPUT_REQUEST', reference: 'IR-2024-0790', requesterName: 'Sarah Achieng', description: 'Pesticide and fungicide request for coffee leaf rust management - 120 farmers affected', quantity: 500, unit: 'liters', status: 'PENDING', priority: 'URGENT', submittedAt: '2024-04-15T09:00:00Z', details: { inputType: 'Crop Protection', zone: 'Mbale', urgency: 'Coffee leaf rust outbreak reported' } },
  { id: '7', type: 'PURCHASE', reference: 'PO-2024-0125', requesterName: 'Green World Inputs Ltd', description: 'Restock order for processing chemicals - 500L of washing detergent and 200kg of hulling compound', amount: 8500000, currency: 'UGX', status: 'APPROVED', priority: 'MEDIUM', submittedAt: '2024-04-12T11:00:00Z', reviewedAt: '2024-04-13T09:00:00Z', reviewedBy: 'Grace Nakamya', details: { supplier: 'Kampala Chemicals Ltd', deliveryDate: '2024-04-18' } },
  { id: '8', type: 'LOAN', reference: 'LN-2024-0458', requesterName: 'Maria Nakamya', description: 'VSLA group loan for collective purchase of drying equipment', amount: 1500000, currency: 'UGX', status: 'APPROVED', priority: 'MEDIUM', submittedAt: '2024-04-11T15:00:00Z', reviewedAt: '2024-04-12T10:30:00Z', reviewedBy: 'Tom Otim', details: { loanProduct: 'Group Equipment Loan', repaymentPeriod: '9 months', interestRate: '8%' } },
  { id: '9', type: 'INPUT_REQUEST', reference: 'IR-2024-0791', requesterName: 'Agnes Birungi', description: 'Request for soil testing kits and pH meters for CCRP program monitoring', quantity: 50, unit: 'kits', status: 'REJECTED', priority: 'LOW', submittedAt: '2024-04-10T08:00:00Z', reviewedAt: '2024-04-11T14:00:00Z', reviewedBy: 'Admin User', details: { reason: 'Budget constraints this quarter. Resubmit in Q3 2024.' } },
  { id: '10', type: 'PURCHASE', reference: 'PO-2024-0126', requesterName: 'Mount Elgon Coffee Exporters', description: 'Purchase of 8,000 kg of premium washed Arabica coffee for export to EU market', amount: 64000000, currency: 'UGX', status: 'PENDING', priority: 'HIGH', submittedAt: '2024-04-15T10:30:00Z', details: { supplier: 'Bugisu Cooperative Union', deliveryDate: '2024-04-30', certification: 'EUDR Compliant, RA Certified' } },
  { id: '11', type: 'LOAN', reference: 'LN-2024-0459', requesterName: 'David Wanyama', description: 'Working capital loan for coffee nursery expansion - 5,000 seedlings', amount: 800000, currency: 'UGX', status: 'PENDING', priority: 'MEDIUM', submittedAt: '2024-04-14T16:00:00Z', details: { loanProduct: 'Nursery Loan', repaymentPeriod: '4 months', interestRate: '10%' } },
  { id: '12', type: 'INPUT_REQUEST', reference: 'IR-2024-0792', requesterName: 'Peter Okello', description: 'Request for 300 bags of organic compost for soil amendment program in Northern region', quantity: 15000, unit: 'kg', status: 'PENDING', priority: 'LOW', submittedAt: '2024-04-14T09:00:00Z', details: { inputType: 'Organic Fertilizer', zone: 'Gulu', deliveryLocation: 'Gulu Warehouse' } },
]

export default function ApprovalsView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState(activeSubTab || 'pending')
  const [showDetail, setShowDetail] = useState<ApprovalItem | null>(null)

  const fetchApprovals = useCallback(async () => {
    setLoading(true)
    try {
      const data = await safeFetch('/api/approvals')
      const list = extractArray(data, 'data', 'approvals')
      if (list.length > 0) {
        setApprovals(list)
        setLoading(false)
        return
      }
      setApprovals(DEMO_APPROVALS)
    } catch {
      setApprovals(DEMO_APPROVALS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchApprovals() }, [fetchApprovals])

  const handleTabChange = (t: string) => { setActiveTab(t); setActiveSubTab(t) }

  const filteredByTab = approvals.filter(a => {
    if (activeTab === 'pending') return a.status === 'PENDING'
    if (activeTab === 'purchases') return a.type === 'PURCHASE'
    if (activeTab === 'loans') return a.type === 'LOAN'
    return true
  }).filter(a => {
    if (search && !a.description.toLowerCase().includes(search.toLowerCase()) && !a.requesterName.toLowerCase().includes(search.toLowerCase()) && !a.reference.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const pendingCount = approvals.filter(a => a.status === 'PENDING').length
  const approvedToday = approvals.filter(a => a.status === 'APPROVED' && a.reviewedAt && new Date(a.reviewedAt).toDateString() === new Date().toDateString()).length
  const rejectedToday = approvals.filter(a => a.status === 'REJECTED' && a.reviewedAt && new Date(a.reviewedAt).toDateString() === new Date().toDateString()).length

  // Avg approval time (real calculation: average days since submission)
  const reviewed = approvals.filter(a => a.submittedAt)
  const avgApprovalDays = reviewed.length > 0
    ? (reviewed.reduce((sum, a) => sum + Math.ceil((Date.now() - new Date(a.submittedAt).getTime()) / 86400000), 0) / reviewed.length).toFixed(1)
    : '0'

  const handleApprove = async (item: ApprovalItem) => {
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, type: item.type, action: 'APPROVE' }),
      })
      if (!res.ok) throw new Error('Failed to approve')
      toast.success(`${item.reference} has been approved`)
      fetchApprovals()
    } catch {
      toast.error(`Failed to approve ${item.reference}`)
    }
  }

  const handleReject = async (item: ApprovalItem) => {
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, type: item.type, action: 'REJECT' }),
      })
      if (!res.ok) throw new Error('Failed to reject')
      toast.success(`${item.reference} has been rejected`)
      fetchApprovals()
    } catch {
      toast.error(`Failed to reject ${item.reference}`)
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'UGX') return `UGX ${(amount / 1000000).toFixed(1)}M`
    return `${currency} ${amount.toLocaleString()}`
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            Approvals Hub
          </h3>
          <p className="text-sm text-muted-foreground">Unified approval center for purchases, loans, and input requests</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fetchApprovals()}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approved Today</p>
              <p className="text-xl font-bold">{approvedToday}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rejected Today</p>
              <p className="text-xl font-bold">{rejectedToday}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Approval</p>
              <p className="text-xl font-bold">{avgApprovalDays}d</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by reference, requester, or description..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        {search && (
          <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearch('')}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="purchases" className="gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5" />
            Purchases
          </TabsTrigger>
          <TabsTrigger value="loans" className="gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Loans
          </TabsTrigger>
        </TabsList>

        {['pending', 'purchases', 'loans'].map(tab => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded" />)}</div>
                ) : filteredByTab.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No {tab === 'pending' ? 'pending approvals' : tab} found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">Type</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Requester</TableHead>
                          <TableHead className="hidden lg:table-cell">Description</TableHead>
                          <TableHead>Amount / Qty</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden md:table-cell">Submitted</TableHead>
                          <TableHead className="w-[160px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredByTab.map(a => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                                {typeIcon[a.type]}
                              </div>
                            </TableCell>
                            <TableCell>
                              <button className="font-mono text-sm font-medium hover:underline text-left" onClick={() => setShowDetail(a)}>
                                {a.reference}
                              </button>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">{a.requesterName}</p>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <p className="text-sm text-muted-foreground truncate max-w-[250px]">{a.description}</p>
                            </TableCell>
                            <TableCell>
                              {a.amount ? (
                                <p className="text-sm font-semibold">{formatAmount(a.amount, a.currency || 'UGX')}</p>
                              ) : a.quantity ? (
                                <p className="text-sm">{a.quantity.toLocaleString()} {a.unit}</p>
                              ) : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn('text-[10px]', priorityColor[a.priority])}>{a.priority}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn('text-[10px]', statusColor[a.status])}>{a.status}</Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                              {new Date(a.submittedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {a.status === 'PENDING' ? (
                                <div className="flex items-center gap-1">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                                        <CheckCircle className="w-3 h-3" /> Approve
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Approve {a.reference}?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to approve this {a.type.toLowerCase().replace('_', ' ')} request from <strong>{a.requesterName}</strong>?
                                          {a.amount && <> for <strong>{formatAmount(a.amount, a.currency || 'UGX')}</strong></>}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleApprove(a)} className="bg-emerald-600 hover:bg-emerald-700">Confirm Approval</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-600 border-red-300 hover:bg-red-50">
                                        <XCircle className="w-3 h-3" /> Reject
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Reject {a.reference}?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action will reject the request from <strong>{a.requesterName}</strong>. The requester will be notified.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleReject(a)} className="bg-red-600 hover:bg-red-700">Confirm Rejection</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDetail(a)}>
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                  {a.reviewedBy && (
                                    <span className="text-[10px] text-muted-foreground hidden sm:inline">by {a.reviewedBy.split(' ')[0]}</span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              {!loading && filteredByTab.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">Showing {filteredByTab.length} items</p>
                </div>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {showDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {typeIcon[showDetail.type]}
                  {showDetail.reference} — {showDetail.type.replace('_', ' ')}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={cn('text-xs', typeColor[showDetail.type])}>{showDetail.type.replace('_', ' ')}</Badge>
                  <Badge className={cn('text-xs', statusColor[showDetail.status])}>{showDetail.status}</Badge>
                  <Badge className={cn('text-xs', priorityColor[showDetail.priority])}>{showDetail.priority} PRIORITY</Badge>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Requester</p>
                    <p className="text-sm font-medium">{showDetail.requesterName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm">{showDetail.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {showDetail.amount && (
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-sm font-semibold">{formatAmount(showDetail.amount, showDetail.currency || 'UGX')}</p>
                      </div>
                    )}
                    {showDetail.quantity && (
                      <div>
                        <p className="text-xs text-muted-foreground">Quantity</p>
                        <p className="text-sm">{showDetail.quantity.toLocaleString()} {showDetail.unit}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Submitted</p>
                      <p className="text-sm">{new Date(showDetail.submittedAt).toLocaleString()}</p>
                    </div>
                    {showDetail.reviewedAt && (
                      <div>
                        <p className="text-xs text-muted-foreground">Reviewed</p>
                        <p className="text-sm">{new Date(showDetail.reviewedAt).toLocaleString()} by {showDetail.reviewedBy}</p>
                      </div>
                    )}
                  </div>
                </div>
                {showDetail.details && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Additional Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(showDetail.details).map(([key, value]) => (
                        <div key={key} className="bg-muted/30 rounded p-2">
                          <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                          <p className="text-sm">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}