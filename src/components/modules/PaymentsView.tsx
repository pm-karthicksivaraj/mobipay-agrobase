'use client'
import { safeFetch, extractArray } from '@/lib/safe-fetch'

import React, { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  CreditCard, Plus, Search, Filter, X, Download, Send,
  DollarSign, Clock, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, Wallet
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { useAppStore } from '@/lib/store'

const payStatusColor: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const typeColor: Record<string, string> = {
  CASUAL: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  BULK_PURCHASE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  BULK_DISBURSEMENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  MARKETPLACE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  VSLA: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

const COLORS = ['#059669', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4']

export default function PaymentsView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSend, setShowSend] = useState(false)
  const [activeTab, setActiveTab] = useState(activeSubTab || 'history')

  const fetchPayments = useCallback(async () => {
    try {
      const data = await safeFetch('/api/payments')
      if (!data) { setLoading(false); return }
      setPayments(data.payments || data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const handleTabChange = (t: string) => { setActiveTab(t); setActiveSubTab(t) }

  if (loading) return <PaymentsSkeleton />

  const totalAmount = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0)
  const completedPayments = payments.filter((p: any) => p.status === 'COMPLETED')
  const completedTotal = completedPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0)
  const pendingCount = payments.filter((p: any) => p.status === 'PENDING').length
  const failedCount = payments.filter((p: any) => p.status === 'FAILED').length

  // By type
  const byType = payments.reduce((acc: Record<string, number>, p: any) => {
    acc[p.type] = (acc[p.type] || 0) + (p.amount || 0)
    return acc
  }, {})
  const typeData = Object.entries(byType).map(([name, value]) => ({ name, value }))
  const pieConfig: ChartConfig = Object.fromEntries(typeData.map((d, i) => [d.name, { label: d.name, color: COLORS[i % COLORS.length] }]))

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"><Wallet className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Volume</p><p className="text-lg font-bold">UGX {totalAmount.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-muted-foreground">Completed</p><p className="text-lg font-bold">UGX {completedTotal.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold">{pendingCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center"><XCircle className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-xs text-muted-foreground">Failed</p><p className="text-xl font-bold">{failedCount}</p></div>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between">
          <TabsList className="grid w-auto grid-cols-2">
            <TabsTrigger value="history">Transaction History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <Button onClick={() => setShowSend(true)} className="gap-2">
            <Send className="w-4 h-4" /> Send Payment
          </Button>
        </div>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payments found</TableCell></TableRow>
                  ) : (
                    payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell><Badge className={cn('text-[10px]', typeColor[p.type] || '')}>{p.type?.replace(/_/g, ' ')}</Badge></TableCell>
                        <TableCell className="font-medium text-sm">{p.recipientName}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{p.recipientPhone}</TableCell>
                        <TableCell className="text-right text-sm font-medium">UGX {p.amount?.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{p.description || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell><Badge className={cn('text-[10px]', payStatusColor[p.status] || '')}>{p.status}</Badge></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Payments by Type</CardTitle></CardHeader>
              <CardContent>
                {typeData.length > 0 ? (
                  <ChartContainer config={pieConfig} className="h-[280px] w-full">
                    <PieChart>
                      <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45}>
                        {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : <p className="text-center text-sm text-muted-foreground py-8">No data</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Payment Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(byType).map(([type, amount]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-[10px]', typeColor[type] || '')}>{type.replace(/_/g, ' ')}</Badge>
                    </div>
                    <span className="font-semibold text-sm">UGX {amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="font-medium">Grand Total</span>
                  <span className="font-bold text-lg">UGX {totalAmount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Send Payment Dialog */}
      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Send Payment</DialogTitle></DialogHeader>
          <SendPaymentForm onClose={() => { setShowSend(false); fetchPayments() }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SendPaymentForm({ onClose }: { onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ recipientName: '', recipientPhone: '', amount: '', type: 'CASUAL', description: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.recipientName || !form.recipientPhone || !form.amount) {
      toast.error('Recipient name, phone, and amount are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      })
      if (!res.ok) throw new Error()
      toast.success('Payment initiated successfully')
      onClose()
    } catch {
      toast.error('Failed to send payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5"><Label>Recipient Name *</Label><Input value={form.recipientName} onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))} required /></div>
      <div className="space-y-1.5"><Label>Phone *</Label><Input value={form.recipientPhone} onChange={e => setForm(p => ({ ...p, recipientPhone: e.target.value }))} required /></div>
      <div className="space-y-1.5"><Label>Amount (UGX) *</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required /></div>
      <div className="space-y-1.5"><Label>Type</Label>
        <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="CASUAL">Casual</SelectItem>
            <SelectItem value="BULK_PURCHASE">Bulk Purchase</SelectItem>
            <SelectItem value="BULK_DISBURSEMENT">Bulk Disbursement</SelectItem>
            <SelectItem value="VSLA">VSLA</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional..." /></div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving}>Send Payment</Button>
      </DialogFooter>
    </form>
  )
}

function PaymentsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full rounded" /></CardContent></Card>)}
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  )
}