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
import { Checkbox } from '@/components/ui/checkbox'
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

export default function ApprovalsView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState(activeSubTab || 'pending')
  const [showDetail, setShowDetail] = useState<ApprovalItem | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState<false | 'APPROVE' | 'REJECT'>(false)

  const fetchApprovals = useCallback(async () => {
    setLoading(true)
    try {
      const data = await safeFetch('/api/approvals')
      const list = extractArray(data, 'data', 'approvals')
      setApprovals(list)
    } catch {
      setApprovals([])
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (prev.size === filteredByTab.length && filteredByTab.length > 0) return new Set()
      return new Set(filteredByTab.map(a => a.id))
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleBulkAction = async (action: 'APPROVE' | 'REJECT') => {
    const items = approvals.filter(a => selectedIds.has(a.id))
    if (items.length === 0) return
    setBulkLoading(action)
    let success = 0
    let failure = 0
    await Promise.all(items.map(async item => {
      try {
        const res = await fetch('/api/approvals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, type: item.type, action }),
        })
        if (!res.ok) throw new Error('Failed')
        success++
      } catch {
        failure++
      }
    }))
    setBulkLoading(false)
    clearSelection()
    const verb = action === 'APPROVE' ? 'approved' : 'rejected'
    if (failure === 0) {
      toast.success(`Successfully ${verb} ${success} item${success === 1 ? '' : 's'}`)
    } else if (success === 0) {
      toast.error(`Failed to ${action.toLowerCase()} all ${failure} item${failure === 1 ? '' : 's'}`)
    } else {
      toast.warning(`${success} ${verb}, ${failure} failed`)
    }
    fetchApprovals()
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
                  <div className="text-center py-12">
                    <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-40 text-muted-foreground" />
                    <p className="font-medium">No pending approvals</p>
                    <p className="text-sm text-muted-foreground mt-1">All caught up!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox
                              aria-label="Select all"
                              checked={filteredByTab.length > 0 && selectedIds.size === filteredByTab.length}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
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
                              <Checkbox
                                aria-label={`Select ${a.reference}`}
                                checked={selectedIds.has(a.id)}
                                onCheckedChange={() => toggleSelect(a.id)}
                              />
                            </TableCell>
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

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border rounded-xl shadow-lg px-4 py-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="h-5 w-px bg-border" />
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            disabled={bulkLoading !== false}
            onClick={() => handleBulkAction('APPROVE')}
          >
            {bulkLoading === 'APPROVE' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Bulk Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5"
            disabled={bulkLoading !== false}
            onClick={() => handleBulkAction('REJECT')}
          >
            {bulkLoading === 'REJECT' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Bulk Reject
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            disabled={bulkLoading !== false}
            onClick={clearSelection}
          >
            <X className="w-3.5 h-3.5" />
            Clear selection
          </Button>
        </div>
      )}
    </div>
  )
}