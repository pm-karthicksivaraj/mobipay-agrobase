'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Landmark, Users, DollarSign, CheckCircle, Clock, XCircle, AlertTriangle,
  Plus, Eye, Search, Filter, ChevronLeft, ChevronRight, Loader2,
  TrendingUp, Shield, ArrowUpRight, ArrowDownRight, HandCoins,
  CreditCard, Building2, Percent, Calendar, FileText, Ban
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { toast } from 'sonner'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie } from 'recharts'

const COLORS = ['#059669', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899']

const loanStatusColor: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  APPROVED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  DISBURSED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  REPAID: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  DEFAULTED: 'bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200',
  REJECTED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export default function MfiPortalView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [portfolio, setPortfolio] = useState<any>(null)
  const [loans, setLoans] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(activeSubTab || 'overview')

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch('/api/mfi/portfolio')
      const json = await res.json()
      setPortfolio(json.data)
    } catch (e) { console.error(e) }
  }, [])

  const fetchLoans = useCallback(async () => {
    try {
      const res = await fetch('/api/mfi/loans?pageSize=50')
      const json = await res.json()
      setLoans(json.items || [])
    } catch (e) { console.error(e) }
  }, [])

  const fetchPartners = useCallback(async () => {
    try {
      const res = await fetch('/api/mfi/partners')
      const json = await res.json()
      setPartners(json.data || [])
    } catch (e) { console.error(e) }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/mfi/products?pageSize=50')
      const json = await res.json()
      setProducts(json.items || [])
    } catch (e) { console.error(e) }
  }, [])

  const loadTab = useCallback((tab: string) => {
    setActiveTab(tab)
    setActiveSubTab(tab)
  }, [setActiveSubTab])

  useEffect(() => {
    Promise.all([fetchPortfolio(), fetchLoans(), fetchPartners(), fetchProducts()])
      .finally(() => setLoading(false))
  }, [fetchPortfolio, fetchLoans, fetchPartners, fetchProducts])

  if (loading) return <MfiSkeleton />

  const pieData = portfolio?.loansByStatus
    ? Object.entries(portfolio.loansByStatus).map(([name, value]) => ({ name, value: value as number })).filter((d) => d.value > 0)
    : []

  const pieConfig: ChartConfig = Object.fromEntries(
    pieData.map((d, i) => [d.name, { label: d.name, color: COLORS[i % COLORS.length] }])
  )

  const barData = portfolio?.loansByProduct
    ? Object.entries(portfolio.loansByProduct).map(([name, value]) => ({ name: name.length > 15 ? name.slice(0, 15) + '...' : name, value: value as number }))
    : []

  const barConfig: ChartConfig = { value: { label: 'Loans', color: '#059669' } }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Disbursed</p>
              <p className="text-lg font-bold">UGX {(portfolio?.totalDisbursed || 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Outstanding</p>
              <p className="text-lg font-bold">UGX {(portfolio?.totalOutstanding || 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Repaid</p>
              <p className="text-lg font-bold">UGX {(portfolio?.totalRepaid || 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Overdue</p>
              <p className="text-lg font-bold">UGX {(portfolio?.totalOverdue || 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
              <HandCoins className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Active Loans</p>
              <p className="text-xl font-bold">{portfolio?.activeLoans || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">PAR30</p>
              <p className="text-xl font-bold">{portfolio?.par30 != null ? portfolio.par30.toFixed(1) : '0.0'}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={loadTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Loan Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ChartContainer config={pieConfig} className="h-[250px] w-full">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-12">No loan data available</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Loans by Product</CardTitle>
              </CardHeader>
              <CardContent>
                {barData.length > 0 ? (
                  <ChartContainer config={barConfig} className="h-[250px] w-full">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-12">No product data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Loans Table */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Recent Loan Applications</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No loan applications</TableCell></TableRow>
                  ) : (
                    loans.slice(0, 10).map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium text-sm">{l.applicantName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{l.loanProduct?.name || '—'}</TableCell>
                        <TableCell className="text-right text-sm font-medium">UGX {l.amount?.toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{l.interestRate}%</TableCell>
                        <TableCell><Badge className={cn('text-[10px]', loanStatusColor[l.status] || '')}>{l.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(l.appliedAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loans Tab */}
        <TabsContent value="loans" className="mt-4">
          <LoanManager loans={loans} onRefresh={fetchLoans} />
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-4">
          <ProductManager products={products} partners={partners} onRefresh={fetchProducts} />
        </TabsContent>

        {/* Partners Tab */}
        <TabsContent value="partners" className="mt-4">
          <PartnerManager partners={partners} onRefresh={fetchPartners} />
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-4">
          <ScheduleView loans={loans} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Loan Manager ────────────────────────────────────────────────────────────

function LoanManager({ loans, onRefresh }: { loans: any[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionOpen, setActionOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'disburse'>('approve')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [repayOpen, setRepayOpen] = useState(false)
  const [repayAmount, setRepayAmount] = useState('')
  const [repayMethod, setRepayMethod] = useState('MOBILE_MONEY')
  const [repayRef, setRepayRef] = useState('')

  const filtered = loans.filter((l: any) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (filter && !l.applicantName?.toLowerCase().includes(filter.toLowerCase())) return false
    return true
  })

  const handleAction = async () => {
    if (!selectedLoan) return
    setLoading(true)
    try {
      const body: any = { action: actionType }
      if (actionType === 'reject') body.reason = reason
      const res = await fetch(`/api/mfi/loans/${selectedLoan.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Action failed')
      } else {
        toast.success(`Loan ${actionType}d successfully`)
        setActionOpen(false)
        onRefresh()
      }
    } catch (e) { toast.error('Action failed') }
    finally { setLoading(false) }
  }

  const handleRepay = async () => {
    if (!selectedLoan || !repayAmount) return
    setLoading(true)
    try {
      const res = await fetch(`/api/mfi/loans/${selectedLoan.id}/repay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(repayAmount), paymentMethod: repayMethod, referenceNumber: repayRef }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Repayment failed')
      } else {
        toast.success('Repayment recorded')
        setRepayOpen(false)
        setRepayAmount('')
        setRepayRef('')
        onRefresh()
      }
    } catch (e) { toast.error('Repayment failed') }
    finally { setLoading(false) }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Loan Applications ({filtered.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search applicant..." className="pl-9 h-8 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="DISBURSED">Disbursed</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="REPAID">Repaid</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead>Rate</TableHead>
                <TableTerm>Term</TableTerm>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No loans match filter</TableCell></TableRow>
              ) : (
                filtered.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium text-sm">{l.applicantName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.applicantPhone}</TableCell>
                    <TableCell className="text-sm">{l.loanProduct?.name || '—'}</TableCell>
                    <TableCell className="text-right text-sm font-medium">UGX {l.amount?.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm">{l.approvedAmount ? `UGX ${l.approvedAmount.toLocaleString()}` : '—'}</TableCell>
                    <TableCell className="text-sm">{l.interestRate}%</TableCell>
                    <TableTerm>{l.durationMonths}mo</TableTerm>
                    <TableCell><Badge className={cn('text-[10px]', loanStatusColor[l.status] || '')}>{l.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedLoan(l); setDetailOpen(true) }}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {l.status === 'PENDING' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => { setSelectedLoan(l); setActionType('approve'); setActionOpen(true) }}>
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => { setSelectedLoan(l); setActionType('reject'); setActionOpen(true) }}>
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {l.status === 'APPROVED' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => { setSelectedLoan(l); setActionType('disburse'); setActionOpen(true) }}>
                            <CreditCard className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {['DISBURSED', 'OVERDUE'].includes(l.status) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => { setSelectedLoan(l); setRepayOpen(true) }}>
                            <HandCoins className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          {selectedLoan && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Loan Details</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-muted-foreground">Applicant</p><p className="font-medium">{selectedLoan.applicantName}</p></div>
                  <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selectedLoan.applicantPhone}</p></div>
                  <div><p className="text-muted-foreground">Product</p><p className="font-medium">{selectedLoan.loanProduct?.name || '—'}</p></div>
                  <div><p className="text-muted-foreground">Status</p><Badge className={cn('text-[10px]', loanStatusColor[selectedLoan.status] || '')}>{selectedLoan.status}</Badge></div>
                  <div><p className="text-muted-foreground">Amount</p><p className="font-medium">UGX {selectedLoan.amount?.toLocaleString()}</p></div>
                  <div><p className="text-muted-foreground">Approved</p><p className="font-medium">{selectedLoan.approvedAmount ? `UGX ${selectedLoan.approvedAmount.toLocaleString()}` : '—'}</p></div>
                  <div><p className="text-muted-foreground">Interest Rate</p><p className="font-medium">{selectedLoan.interestRate}% p.a.</p></div>
                  <div><p className="text-muted-foreground">Duration</p><p className="font-medium">{selectedLoan.durationMonths} months</p></div>
                  <div><p className="text-muted-foreground">Total Paid</p><p className="font-medium">UGX {selectedLoan.totalPaid?.toLocaleString()}</p></div>
                  <div><p className="text-muted-foreground">Outstanding</p><p className="font-medium">UGX {selectedLoan.outstandingBalance?.toLocaleString()}</p></div>
                  <div><p className="text-muted-foreground">Total Interest</p><p className="font-medium">UGX {selectedLoan.totalInterest?.toLocaleString()}</p></div>
                  <div><p className="text-muted-foreground">Penalties</p><p className="font-medium">UGX {selectedLoan.totalPenalty?.toLocaleString()}</p></div>
                </div>
                {selectedLoan.purpose && <div><p className="text-muted-foreground">Purpose</p><p className="font-medium">{selectedLoan.purpose}</p></div>}
                {selectedLoan.collateralDetails && <div><p className="text-muted-foreground">Collateral</p><p className="font-medium">{selectedLoan.collateralDetails}</p></div>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve/Reject/Disburse Dialog */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
              {actionType === 'reject' && <XCircle className="w-5 h-5 text-red-600" />}
              {actionType === 'disburse' && <CreditCard className="w-5 h-5 text-blue-600" />}
              {actionType.charAt(0).toUpperCase() + actionType.slice(1)} Loan
            </DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <p className="text-sm">
                {actionType === 'approve' && `Approve loan for ${selectedLoan.applicantName} (UGX ${selectedLoan.amount?.toLocaleString()})?`}
                {actionType === 'reject' && `Reject loan for ${selectedLoan.applicantName}?`}
                {actionType === 'disburse' && `Confirm disbursement of UGX ${selectedLoan.approvedAmount?.toLocaleString() || selectedLoan.amount?.toLocaleString()} to ${selectedLoan.applicantName}?`}
              </p>
              {actionType === 'reject' && (
                <div>
                  <Label className="text-sm">Rejection Reason</Label>
                  <Input className="mt-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason..." />
                </div>
              )}
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
                <Button size="sm" onClick={handleAction} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  {actionType === 'approve' && 'Approve'}
                  {actionType === 'reject' && 'Reject'}
                  {actionType === 'disburse' && 'Disburse'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Repayment Dialog */}
      <Dialog open={repayOpen} onOpenChange={setRepayOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><HandCoins className="w-5 h-5 text-amber-600" />Record Repayment</DialogTitle></DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <p className="text-sm">Outstanding: <strong>UGX {selectedLoan.outstandingBalance?.toLocaleString() || '0'}</strong></p>
              <div>
                <Label className="text-sm">Amount (UGX)</Label>
                <Input className="mt-1" type="number" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} placeholder="Enter amount" />
              </div>
              <div>
                <Label className="text-sm">Payment Method</Label>
                <Select value={repayMethod} onValueChange={setRepayMethod}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Reference Number</Label>
                <Input className="mt-1" value={repayRef} onChange={(e) => setRepayRef(e.target.value)} placeholder="Transaction ref (optional)" />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
                <Button size="sm" onClick={handleRepay} disabled={loading || !repayAmount}>
                  {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Record Payment
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Product Manager ─────────────────────────────────────────────────────────

function ProductManager({ products, partners, onRefresh }: { products: any[]; partners: any[]; onRefresh: () => void }) {
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', partnerId: '', interestRateType: 'FLAT', interestRate: '', maxAmount: '', minAmount: '', maxDurationMonths: '', gracePeriodMonths: '0', latePaymentPenalty: '', processingFeePercent: '', collateralRequired: false })

  const handleCreate = async () => {
    if (!form.name || !form.interestRate || !form.maxAmount || !form.maxDurationMonths) {
      toast.error('Fill in required fields')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/mfi/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          interestRate: parseFloat(form.interestRate),
          maxAmount: parseFloat(form.maxAmount),
          minAmount: form.minAmount ? parseFloat(form.minAmount) : undefined,
          maxDurationMonths: parseInt(form.maxDurationMonths),
          gracePeriodMonths: parseInt(form.gracePeriodMonths) || 0,
          latePaymentPenalty: form.latePaymentPenalty ? parseFloat(form.latePaymentPenalty) : undefined,
          processingFeePercent: form.processingFeePercent ? parseFloat(form.processingFeePercent) : undefined,
          partnerId: form.partnerId || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to create product')
      } else {
        toast.success('Loan product created')
        setCreateOpen(false)
        setForm({ name: '', description: '', partnerId: '', interestRateType: 'FLAT', interestRate: '', maxAmount: '', minAmount: '', maxDurationMonths: '', gracePeriodMonths: '0', latePaymentPenalty: '', processingFeePercent: '', collateralRequired: false })
        onRefresh()
      }
    } catch (e) { toast.error('Failed to create product') }
    finally { setLoading(false) }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Loan Products ({products.length})</CardTitle>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8">
              <Plus className="w-4 h-4 mr-1" /> New Product
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Max Amount</TableHead>
                <TableHead className="text-right">Max Term</TableHead>
                <TableHead>Grace</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No loan products configured</TableCell></TableRow>
              ) : (
                products.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.partner?.name || 'In-house'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{p.interestRateType}</Badge></TableCell>
                    <TableCell className="text-right text-sm font-medium">{p.interestRate}%</TableCell>
                    <TableCell className="text-right text-sm">UGX {p.maxAmount?.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm">{p.maxDurationMonths}mo</TableCell>
                    <TableCell className="text-sm">{p.gracePeriodMonths || 0}mo</TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px]', p.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600')}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Product Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" />New Loan Product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-sm">Product Name *</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Agricultural Input Loan" /></div>
            <div><Label className="text-sm">Description</Label><Input className="mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Partner</Label>
                <Select value={form.partnerId} onValueChange={(v) => setForm({ ...form, partnerId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="In-house" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">In-house</SelectItem>
                    {partners.filter((p) => p.isActive).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Interest Type</Label>
                <Select value={form.interestRateType} onValueChange={(v) => setForm({ ...form, interestRateType: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FLAT">Flat Rate</SelectItem>
                    <SelectItem value="DECLINING_BALANCE">Declining Balance</SelectItem>
                    <SelectItem value="AMORTIZED">Amortized</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-sm">Annual Rate % *</Label><Input className="mt-1" type="number" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} placeholder="12" /></div>
              <div><Label className="text-sm">Max Amount (UGX) *</Label><Input className="mt-1" type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} placeholder="5000000" /></div>
              <div><Label className="text-sm">Min Amount (UGX)</Label><Input className="mt-1" type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} placeholder="100000" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-sm">Max Term (months) *</Label><Input className="mt-1" type="number" value={form.maxDurationMonths} onChange={(e) => setForm({ ...form, maxDurationMonths: e.target.value })} placeholder="12" /></div>
              <div><Label className="text-sm">Grace Period (months)</Label><Input className="mt-1" type="number" value={form.gracePeriodMonths} onChange={(e) => setForm({ ...form, gracePeriodMonths: e.target.value })} placeholder="0" /></div>
              <div><Label className="text-sm">Late Penalty %/mo</Label><Input className="mt-1" type="number" value={form.latePaymentPenalty} onChange={(e) => setForm({ ...form, latePaymentPenalty: e.target.value })} placeholder="2" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm">Processing Fee %</Label><Input className="mt-1" type="number" value={form.processingFeePercent} onChange={(e) => setForm({ ...form, processingFeePercent: e.target.value })} placeholder="1" /></div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.collateralRequired} onChange={(e) => setForm({ ...form, collateralRequired: e.target.checked })} className="rounded" />
                  Collateral Required
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Partner Manager ─────────────────────────────────────────────────────────

function PartnerManager({ partners, onRefresh }: { partners: any[]; onRefresh: () => void }) {
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', partnerType: 'MFI', code: '', contactName: '', contactEmail: '', contactPhone: '', address: '', country: '', apiEndpoint: '', maxExposure: '' })

  const handleCreate = async () => {
    if (!form.name || !form.partnerType) { toast.error('Fill in required fields'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/mfi/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          maxExposure: form.maxExposure ? parseFloat(form.maxExposure) : undefined,
        }),
      })
      if (!res.ok) { const err = await res.json(); toast.error(err.error || 'Failed') }
      else { toast.success('Partner created'); setCreateOpen(false); setForm({ name: '', partnerType: 'MFI', code: '', contactName: '', contactEmail: '', contactPhone: '', address: '', country: '', apiEndpoint: '', maxExposure: '' }); onRefresh() }
    } catch (e) { toast.error('Failed') }
    finally { setLoading(false) }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {partners.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Landmark className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No MFI/Bank partners</p>
            <p className="text-sm mt-1">Add partners to manage external loan products</p>
          </div>
        ) : (
          partners.map((p: any) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-sm">{p.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.partnerType} {p.code && `· ${p.code}`}</p>
                  </div>
                  <Badge className={cn('text-[10px]', p.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600')}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-muted-foreground">Contact</p><p className="font-medium">{p.contactName || '—'}</p></div>
                  <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{p.contactPhone || '—'}</p></div>
                  <div><p className="text-muted-foreground">Exposure</p><p className="font-medium">UGX {(p.currentExposure || 0).toLocaleString()}</p></div>
                  <div><p className="text-muted-foreground">Max Exposure</p><p className="font-medium">{p.maxExposure ? `UGX ${p.maxExposure.toLocaleString()}` : 'Unlimited'}</p></div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="mt-4 flex justify-center">
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="h-8">
          <Plus className="w-4 h-4 mr-1" /> Add Partner
        </Button>
      </div>

      {/* Create Partner Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Add MFI/Bank Partner</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm">Name *</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. BRAC Uganda" /></div>
              <div>
                <Label className="text-sm">Type *</Label>
                <Select value={form.partnerType} onValueChange={(v) => setForm({ ...form, partnerType: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MFI">MFI</SelectItem>
                    <SelectItem value="BANK">Bank</SelectItem>
                    <SelectItem value="SACCO">SACCO</SelectItem>
                    <SelectItem value="MICROFINANCE">Microfinance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-sm">Partner Code</Label><Input className="mt-1" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. BRAC_UG" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm">Contact Name</Label><Input className="mt-1" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
              <div><Label className="text-sm">Phone</Label><Input className="mt-1" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
            </div>
            <div><Label className="text-sm">Email</Label><Input className="mt-1" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
            <div><Label className="text-sm">Max Exposure (UGX)</Label><Input className="mt-1" type="number" value={form.maxExposure} onChange={(e) => setForm({ ...form, maxExposure: e.target.value })} placeholder="100000000" /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Add Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Schedule View ───────────────────────────────────────────────────────────

function ScheduleView({ loans }: { loans: any[] }) {
  const [selectedLoanId, setSelectedLoanId] = useState('')
  const [schedule, setSchedule] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const disbursedLoans = loans.filter((l) => ['DISBURSED', 'OVERDUE', 'REPAID'].includes(l.status))

  useEffect(() => {
    if (!selectedLoanId) { setSchedule(null); return }
    setLoading(true)
    fetch(`/api/mfi/loans/${selectedLoanId}/schedule`)
      .then((r) => r.json())
      .then((json) => setSchedule(json.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedLoanId])

  const scheduleStatusColor: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    PARTIAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Repayment Schedule</CardTitle>
          <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
            <SelectTrigger className="h-8 w-64 text-sm"><SelectValue placeholder="Select a disbursed loan..." /></SelectTrigger>
            <SelectContent>
              {disbursedLoans.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.applicantName} — UGX {l.amount?.toLocaleString()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}

        {!loading && !schedule && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Select a loan to view its repayment schedule</p>
            <p className="text-sm mt-1">{disbursedLoans.length} disbursed loans available</p>
          </div>
        )}

        {!loading && schedule && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground">Total Due</p>
                <p className="text-sm font-bold">UGX {schedule.summary?.totalDue?.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground">Total Paid</p>
                <p className="text-sm font-bold text-emerald-600">UGX {schedule.summary?.totalPaid?.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground">Remaining</p>
                <p className="text-sm font-bold text-amber-600">UGX {schedule.summary?.remaining?.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground">Interest Due</p>
                <p className="text-sm font-bold">UGX {schedule.summary?.totalInterestDue?.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground">Penalty Due</p>
                <p className="text-sm font-bold text-red-600">UGX {schedule.summary?.totalPenaltyDue?.toLocaleString()}</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Penalty</TableHead>
                  <TableHead className="text-right">Total Due</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.schedule.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm font-mono">{s.installmentNumber}</TableCell>
                    <TableCell className="text-sm">{new Date(s.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right text-sm">UGX {s.principalDue?.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm">UGX {s.interestDue?.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm">{s.penaltyDue > 0 ? `UGX ${s.penaltyDue.toLocaleString()}` : '—'}</TableCell>
                    <TableCell className="text-right text-sm font-medium">UGX {s.totalDue?.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm">{s.totalPaid > 0 ? `UGX ${s.totalPaid.toLocaleString()}` : '—'}</TableCell>
                    <TableCell><Badge className={cn('text-[10px]', scheduleStatusColor[s.status] || '')}>{s.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function MfiSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full rounded" /></CardContent></Card>
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded" />
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  )
}

function TableTerm({ children }: { children: React.ReactNode }) {
  return <th className="text-sm text-muted-foreground">{children}</th>
}