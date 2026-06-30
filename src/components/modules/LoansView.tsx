'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  DollarSign, Calculator, Plus, CheckCircle, Clock, XCircle, AlertTriangle,
  TrendingUp, FileText, Users, ArrowRight, Loader2
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
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie } from 'recharts'
import { useAppStore } from '@/lib/store'

const loanStatusColor: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  LEVEL1_APPROVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  LEVEL2_APPROVED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  DISBURSED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  COMPLETED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const COLORS = ['#f59e0b', '#3b82f6', '#6366f1', '#059669', '#10b981', '#ef4444', '#6b7280', '#dc2626']

export default function LoansView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [loans, setLoans] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCalc, setShowCalc] = useState(false)
  const [showApply, setShowApply] = useState(false)
  const [activeTab, setActiveTab] = useState(activeSubTab || 'applications')

  const loadData = useCallback(async () => {
    try {
      const [lRes, pRes] = await Promise.all([
        fetch('/api/loans').then(r => r.json()),
        fetch('/api/loans?type=products').then(r => r.json()).catch(() => []),
      ])
      setLoans(lRes.loans || lRes.applications || lRes || [])
      setProducts(pRes.products || pRes || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleTabChange = (t: string) => { setActiveTab(t); setActiveSubTab(t) }

  if (loading) return <LoansSkeleton />

  const totalDisbursed = loans.filter((l: any) => l.status === 'DISBURSED').reduce((s: number, l: any) => s + (l.amount || 0), 0)
  const pendingCount = loans.filter((l: any) => l.status === 'PENDING').length
  const overdueCount = loans.filter((l: any) => l.status === 'OVERDUE').length

  const statusCounts = loans.reduce((acc: Record<string, number>, l: any) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
  const pieConfig: ChartConfig = Object.fromEntries(pieData.map((d, i) => [d.name, { label: d.name, color: COLORS[i % COLORS.length] }]))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Disbursed</p><p className="text-lg font-bold">UGX {totalDisbursed.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold">{pendingCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-xs text-muted-foreground">Overdue</p><p className="text-xl font-bold">{overdueCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Loan Products</p><p className="text-xl font-bold">{products.length}</p></div>
        </CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="flow" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> How It Works</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCalc(true)} className="gap-2">
            <Calculator className="w-4 h-4" /> Calculator
          </Button>
          <Button onClick={() => setShowApply(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Apply for Loan
          </Button>
        </div>
      </div>

      {activeTab === 'applications' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No loan applications</TableCell></TableRow>
                ) : (
                  loans.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium text-sm">{l.applicantName}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{l.applicantPhone}</TableCell>
                      <TableCell className="text-right text-sm font-medium">UGX {l.amount?.toLocaleString()}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{l.purpose || '—'}</TableCell>
                      <TableCell><Badge className={cn('text-[10px]', loanStatusColor[l.status] || '')}>{l.status}</Badge></TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No loan products configured</p>
            </div>
          ) : (
            products.map((p: any) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-sm">{p.name}</h4>
                    <Badge className={p.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600'}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-muted-foreground">Interest Rate</p><p className="font-semibold">{p.interestRate}%</p></div>
                    <div><p className="text-muted-foreground">Max Duration</p><p className="font-semibold">{p.maxDuration} months</p></div>
                    <div><p className="text-muted-foreground">Min Amount</p><p className="font-semibold">UGX {p.minAmount?.toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Max Amount</p><p className="font-semibold">UGX {p.maxAmount?.toLocaleString()}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Loan Calculator Dialog */}
      <Dialog open={showCalc} onOpenChange={setShowCalc}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Loan Calculator</DialogTitle></DialogHeader>
          <LoanCalculator />
        </DialogContent>
      </Dialog>

      {/* Apply for Loan Dialog */}
      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Apply for Loan</DialogTitle></DialogHeader>
          <ApplyLoanForm products={products} onClose={() => setShowApply(false)} onSaved={() => { setShowApply(false); loadData() }} />
        </DialogContent>
      </Dialog>

      {activeTab === 'flow' && <LoanFlowGuide />}
    </div>
  )
}

function ApplyLoanForm({ products, onClose, onSaved }: { products: any[]; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ loanProductId: '', applicantName: '', applicantPhone: '', amount: '', purpose: '' })

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.loanProductId || !form.applicantName || !form.amount) {
      toast.error('Product, applicant name, and amount are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Loan application submitted')
        onSaved()
      } else {
        toast.error(data.error || 'Failed to apply')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Loan Product *</Label>
        <Select value={form.loanProductId} onValueChange={v => update('loanProductId', v)}>
          <SelectTrigger><SelectValue placeholder="Select a loan product" /></SelectTrigger>
          <SelectContent>
            {products.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name} ({p.interestRate}% / {p.maxDuration}mo)</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Applicant Name *</Label><Input value={form.applicantName} onChange={e => update('applicantName', e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Applicant Phone</Label><Input value={form.applicantPhone} onChange={e => update('applicantPhone', e.target.value)} placeholder="+256..." /></div>
      </div>
      <div className="space-y-1.5"><Label>Amount (UGX) *</Label><Input type="number" value={form.amount} onChange={e => update('amount', e.target.value)} required /></div>
      <div className="space-y-1.5"><Label>Purpose</Label><Textarea value={form.purpose} onChange={e => update('purpose', e.target.value)} placeholder="e.g. Purchase fertilizers and seed for next season" rows={2} /></div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Submit Application</Button>
      </DialogFooter>
    </form>
  )
}

function LoanFlowGuide() {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Loan Management Flow</CardTitle><CardDescription>From application to disbursement and repayment</CardDescription></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            { step: '1', title: 'Configure Product', color: 'blue', desc: 'Tenant Admin creates Loan Products (name, min/max amount, interest rate, max duration). One per tenant.' },
            { step: '2', title: 'Apply', color: 'purple', desc: 'Farmer or Extension Officer submits an application via "Apply for Loan". Selects product, enters amount, purpose.' },
            { step: '3', title: 'Approve (L1)', color: 'amber', desc: 'CBT or Extension Officer does first-level review against farmer credit score (AgriTrack). Status: PENDING → LEVEL1_APPROVED.' },
            { step: '4', title: 'Approve (L2)', color: 'emerald', desc: 'Tenant Admin or MFI partner does final approval. Status: LEVEL1_APPROVED → APPROVED → DISBURSED via mobile money.' },
            { step: '5', title: 'Repay', color: 'pink', desc: 'Auto-deducted from produce sales or VSLA savings. Status: DISBURSED → COMPLETED. Overdue triggers alerts.' },
          ].map(s => (
            <div key={s.step} className={cn('p-3 rounded-lg border',
              s.color === 'blue' ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' :
              s.color === 'purple' ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' :
              s.color === 'amber' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' :
              s.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' :
              'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800'
            )}>
              <div className="w-8 h-8 rounded-full bg-white dark:bg-background flex items-center justify-center text-sm font-bold mb-2">{s.step}</div>
              <p className="font-semibold text-sm">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
        <Separator className="my-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="font-semibold mb-1">Credit Score Integration</p>
            <p className="text-xs text-muted-foreground">Loan approvals reference the 4-factor credit score from AgriTrack: Demographics (15%) + Assets (25%) + Crop Performance (25%) + Financial Discipline (35%).</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="font-semibold mb-1">Repayment Sources</p>
            <p className="text-xs text-muted-foreground">Auto-deduct from produce sales (Cooperative ERP), VSLA savings withdrawals, or direct mobile money (M-Pesa, MTN, Airtel).</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LoanCalculator() {
  const [principal, setPrincipal] = useState('1000000')
  const [rate, setRate] = useState('10')
  const [months, setMonths] = useState('6')

  const p = parseFloat(principal) || 0
  const r = parseFloat(rate) || 0
  const m = parseInt(months) || 1
  const monthlyRate = r / 100 / 12
  const monthlyPayment = monthlyRate > 0
    ? (p * monthlyRate * Math.pow(1 + monthlyRate, m)) / (Math.pow(1 + monthlyRate, m) - 1)
    : p / m
  const totalRepayable = monthlyPayment * m
  const totalInterest = totalRepayable - p

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Principal (UGX)</Label>
        <Input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Annual Interest Rate (%)</Label>
        <Input type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Duration (months)</Label>
        <Input type="number" value={months} onChange={e => setMonths(e.target.value)} />
      </div>
      <Separator />
      <div className="space-y-2">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monthly Payment</span><span className="font-bold text-primary">UGX {Math.round(monthlyPayment).toLocaleString()}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Repayable</span><span className="font-semibold">UGX {Math.round(totalRepayable).toLocaleString()}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Interest</span><span className="font-semibold text-amber-600">UGX {Math.round(totalInterest).toLocaleString()}</span></div>
      </div>
    </div>
  )
}

function LoansSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full rounded" /></CardContent></Card>)}
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  )
}