'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { safeFetch, extractArray } from '@/lib/safe-fetch'
import {
  PiggyBank, Users, DollarSign, Calendar, CheckCircle, Clock, XCircle,
  HandCoins, Plus, Eye, ChevronLeft, ChevronRight, Search, Filter, X, Loader2,
  AlertCircle, TrendingUp, CircleDollarSign, Save, Trash2, Pencil, Download
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie } from 'recharts'
import { exportToCSV } from '@/components/ui/empty-state'

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#f59e0b']

const loanStatusColor: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  DISBURSED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  REPAID: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function VslaView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [groups, setGroups] = useState<any[]>([])
  const [savings, setSavings] = useState<any[]>([])
  const [loans, setLoans] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(activeSubTab || 'groups')
  const [showCreate, setShowCreate] = useState<string | null>(null)
  const [editing, setEditing] = useState<any | null>(null)

  const fetchGroups = useCallback(async () => {
    const data = await safeFetch('/api/vsla/groups')
    if (data) setGroups(extractArray(data, 'groups', 'data'))
  }, [])

  const fetchSavings = useCallback(async () => {
    const data = await safeFetch('/api/vsla/savings')
    if (data) setSavings(extractArray(data, 'savings', 'data'))
  }, [])

  const fetchLoans = useCallback(async () => {
    const data = await safeFetch('/api/vsla/loans')
    if (data) setLoans(extractArray(data, 'loans', 'data'))
  }, [])

  const fetchMeetings = useCallback(async () => {
    const data = await safeFetch('/api/vsla/meetings')
    if (data) setMeetings(extractArray(data, 'meetings', 'data'))
  }, [])

  const loadTab = useCallback((tab: string) => {
    setActiveTab(tab)
    setActiveSubTab(tab)
  }, [setActiveSubTab])

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchGroups(), fetchSavings(), fetchLoans(), fetchMeetings()])
  }, [fetchGroups, fetchSavings, fetchLoans, fetchMeetings])

  useEffect(() => {
    refreshAll().finally(() => setLoading(false))
  }, [refreshAll])

  const handleDelete = async (type: string, id: string) => {
    if (!confirm(`Delete this ${type}?`)) return
    try {
      const res = await fetch(`/api/vsla/${type}s/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(`${type} deleted`)
        refreshAll()
      } else {
        toast.error(`Failed to delete ${type}`)
      }
    } catch {
      toast.error('Network error')
    }
  }

  if (loading) return <VslaSkeleton />

  const totalSavings = savings.reduce((s: number, v: any) => s + (v.amount || 0), 0)
  const totalLoans = loans.reduce((s: number, v: any) => s + (v.amount || 0), 0)

  const loanStatusCounts = loans.reduce((acc: Record<string, number>, l: any) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(loanStatusCounts).map(([name, value]) => ({ name, value }))
  const pieConfig: ChartConfig = Object.fromEntries(
    pieData.map((d, i) => [d.name, { label: d.name, color: COLORS[i % COLORS.length] }])
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"><PiggyBank className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">VSLA Groups</p><p className="text-xl font-bold">{groups.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Members</p><p className="text-xl font-bold">{groups.reduce((s: number, g: any) => s + (g._count?.members || 0), 0)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center"><CircleDollarSign className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Savings</p><p className="text-lg font-bold">UGX {totalSavings.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center"><DollarSign className="w-5 h-5 text-purple-600" /></div>
          <div><p className="text-xs text-muted-foreground">Outstanding Loans</p><p className="text-lg font-bold">UGX {totalLoans.toLocaleString()}</p></div>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={loadTab}>
        <div className="flex items-center justify-between">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
          </TabsList>
          {activeTab === 'groups' && <Button onClick={() => { setEditing(null); setShowCreate('group') }} className="gap-2"><Plus className="w-4 h-4" /> New Group</Button>}
          {activeTab === 'savings' && <Button onClick={() => { setEditing(null); setShowCreate('saving') }} className="gap-2"><Plus className="w-4 h-4" /> Record Saving</Button>}
          {activeTab === 'loans' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportToCSV(loans, 'vsla-loans')} disabled={loans.length === 0} className="gap-2">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
              <Button onClick={() => { setEditing(null); setShowCreate('loan') }} className="gap-2"><Plus className="w-4 h-4" /> Issue Loan</Button>
            </div>
          )}
          {activeTab === 'meetings' && <Button onClick={() => { setEditing(null); setShowCreate('meeting') }} className="gap-2"><Plus className="w-4 h-4" /> Schedule Meeting</Button>}
        </div>

        {/* GROUPS TAB */}
        <TabsContent value="groups" className="mt-4">
          {groups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <PiggyBank className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No VSLA groups yet</p>
              <p className="text-sm mt-1">Click "New Group" to create the first one</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {groups.map((g: any) => (
                <Card key={g.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-sm">{g.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{g._count?.members || 0} members &middot; {g.meetingFrequency || 'Weekly'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={g.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600'}>{g.isActive ? 'Active' : 'Closed'}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(g); setShowCreate('group') }}><Pencil className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><p className="text-muted-foreground">Share Value</p><p className="font-semibold">UGX {g.shareValue?.toLocaleString()}</p></div>
                      <div><p className="text-muted-foreground">Loan Rate</p><p className="font-semibold">{g.loanRate}%</p></div>
                      <div><p className="text-muted-foreground">Max Loan</p><p className="font-semibold">UGX {g.maxLoanAmount?.toLocaleString()}</p></div>
                      <div><p className="text-muted-foreground">Welfare</p><p className="font-semibold">UGX {g.welfareAmount?.toLocaleString()}</p></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* SAVINGS TAB */}
        <TabsContent value="savings" className="mt-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Farmer</TableHead><TableHead>Group</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead>Shares</TableHead>
                <TableHead>Date</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {savings.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No savings records. Click "Record Saving" to add.</TableCell></TableRow>
                ) : savings.slice(0, 50).map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">{s.farmer?.firstName} {s.farmer?.lastName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.vslaGroup?.name || '—'}</TableCell>
                    <TableCell className="text-right text-sm font-medium">UGX {s.amount?.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{s.sharesBought}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</TableCell>
                    <TableCell><Badge className={cn('text-[10px]', s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300')}>{s.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* LOANS TAB */}
        <TabsContent value="loans" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Farmer</TableHead><TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Repayable</TableHead><TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead><TableHead className="w-[80px]"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {loans.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No loan records. Click "Issue Loan" to add.</TableCell></TableRow>
                    ) : loans.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium text-sm">{l.farmer?.firstName} {l.farmer?.lastName}</TableCell>
                        <TableCell className="text-right text-sm font-medium">UGX {l.amount?.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">UGX {l.totalRepayable?.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{l.purpose || '—'}</TableCell>
                        <TableCell><Badge className={cn('text-[10px]', loanStatusColor[l.status] || '')}>{l.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(l); setShowCreate('loan') }}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => handleDelete('loan', l.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Loan Status Distribution</CardTitle></CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ChartContainer config={pieConfig} className="h-[200px] w-full">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : <p className="text-center text-sm text-muted-foreground py-8">No data</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MEETINGS TAB */}
        <TabsContent value="meetings" className="mt-4">
          {meetings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No meetings scheduled</p>
              <p className="text-sm mt-1">Click "Schedule Meeting" to create one</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {meetings.map((m: any) => (
                <Card key={m.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-primary" /></div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-[10px]',
                          m.status === 'CONCLUDED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                          m.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        )}>{m.status}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(m); setShowCreate('meeting') }}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => handleDelete('meeting', m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    <h4 className="font-semibold text-sm">{m.vslaGroup?.name || 'Meeting'}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {m.meetingDate ? new Date(m.meetingDate).toLocaleDateString() : '—'} {m.startTime && `at ${m.startTime}`}
                    </p>
                    {m.agenda && <p className="text-xs mt-2 line-clamp-2">{m.agenda}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialogs */}
      <Dialog open={showCreate === 'group'} onOpenChange={(open) => !open && setShowCreate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit VSLA Group' : 'New VSLA Group'}</DialogTitle></DialogHeader>
          <GroupForm group={editing} onClose={() => setShowCreate(null)} onSaved={() => { setShowCreate(null); refreshAll() }} />
        </DialogContent>
      </Dialog>
      <Dialog open={showCreate === 'saving'} onOpenChange={(open) => !open && setShowCreate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Record Saving</DialogTitle></DialogHeader>
          <SavingForm groups={groups} onClose={() => setShowCreate(null)} onSaved={() => { setShowCreate(null); refreshAll() }} />
        </DialogContent>
      </Dialog>
      <Dialog open={showCreate === 'loan'} onOpenChange={(open) => !open && setShowCreate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Loan' : 'Issue VSLA Loan'}</DialogTitle></DialogHeader>
          <LoanForm loan={editing} groups={groups} onClose={() => setShowCreate(null)} onSaved={() => { setShowCreate(null); refreshAll() }} />
        </DialogContent>
      </Dialog>
      <Dialog open={showCreate === 'meeting'} onOpenChange={(open) => !open && setShowCreate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Meeting' : 'Schedule Meeting'}</DialogTitle></DialogHeader>
          <MeetingForm meeting={editing} groups={groups} onClose={() => setShowCreate(null)} onSaved={() => { setShowCreate(null); refreshAll() }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Group Form ───────────────────────────────────────────────────
function GroupForm({ group, onClose, onSaved }: { group: any; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: group?.name || '', shareValue: group?.shareValue || 5000,
    loanRate: group?.loanRate || 10, maxLoanAmount: group?.maxLoanAmount || 200000,
    fines: group?.fines || 0, welfareAmount: group?.welfareAmount || 0,
    meetingFrequency: group?.meetingFrequency || 'Weekly',
  })
  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { toast.error('Group name is required'); return }
    setSaving(true)
    try {
      const url = group ? `/api/vsla/groups/${group.id}` : '/api/vsla/groups'
      const method = group ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) { toast.success(group ? 'Group updated' : 'Group created'); onSaved() }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Failed') }
    } catch { toast.error('Network error') } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5"><Label>Group Name *</Label><Input value={form.name} onChange={e => update('name', e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Share Value (UGX)</Label><Input type="number" value={form.shareValue} onChange={e => update('shareValue', parseFloat(e.target.value))} /></div>
        <div className="space-y-1.5"><Label>Loan Rate (%)</Label><Input type="number" step="0.1" value={form.loanRate} onChange={e => update('loanRate', parseFloat(e.target.value))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Max Loan Amount</Label><Input type="number" value={form.maxLoanAmount} onChange={e => update('maxLoanAmount', parseFloat(e.target.value))} /></div>
        <div className="space-y-1.5"><Label>Welfare Amount</Label><Input type="number" value={form.welfareAmount} onChange={e => update('welfareAmount', parseFloat(e.target.value))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Fines</Label><Input type="number" value={form.fines} onChange={e => update('fines', parseFloat(e.target.value))} /></div>
        <div className="space-y-1.5"><Label>Meeting Frequency</Label>
          <Select value={form.meetingFrequency} onValueChange={v => update('meetingFrequency', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Weekly">Weekly</SelectItem><SelectItem value="Bi-weekly">Bi-weekly</SelectItem><SelectItem value="Monthly">Monthly</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {group ? 'Update' : 'Create'} Group</Button>
      </DialogFooter>
    </form>
  )
}

// ─── Saving Form ──────────────────────────────────────────────────
function SavingForm({ groups, onClose, onSaved }: { groups: any[]; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [farmers, setFarmers] = useState<any[]>([])
  const [form, setForm] = useState({ vslaGroupId: '', farmerId: '', amount: '' })

  useEffect(() => {
    fetch('/api/farmers?limit=200').then(r => r.json()).then(data => setFarmers(data.farmers || data.data || [])).catch(() => {})
  }, [])

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vslaGroupId || !form.farmerId || !form.amount) { toast.error('All fields are required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/vsla/savings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }) })
      if (res.ok) { toast.success('Saving recorded'); onSaved() }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Failed') }
    } catch { toast.error('Network error') } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>VSLA Group *</Label>
        <Select value={form.vslaGroupId} onValueChange={v => update('vslaGroupId', v)}>
          <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
          <SelectContent>{groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Farmer *</Label>
        <Select value={form.farmerId} onValueChange={v => update('farmerId', v)}>
          <SelectTrigger><SelectValue placeholder="Select farmer" /></SelectTrigger>
          <SelectContent className="max-h-72">{farmers.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.firstName} {f.lastName}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Amount (UGX) *</Label><Input type="number" value={form.amount} onChange={e => update('amount', e.target.value)} required /></div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Record Saving</Button>
      </DialogFooter>
    </form>
  )
}

// ─── Loan Form ────────────────────────────────────────────────────
function LoanForm({ loan, groups, onClose, onSaved }: { loan: any; groups: any[]; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [farmers, setFarmers] = useState<any[]>([])
  const [form, setForm] = useState({
    vslaGroupId: loan?.vslaGroupId || '', farmerId: loan?.farmerId || '',
    amount: loan?.amount?.toString() || '', purpose: loan?.purpose || '',
    interestRate: loan?.interestRate?.toString() || '10', status: loan?.status || 'PENDING',
  })

  useEffect(() => {
    fetch('/api/farmers?limit=200').then(r => r.json()).then(data => setFarmers(data.farmers || data.data || [])).catch(() => {})
  }, [])

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const amount = parseFloat(form.amount) || 0
  const rate = parseFloat(form.interestRate) || 0
  const repayable = amount + (amount * rate / 100)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vslaGroupId || !form.farmerId || !form.amount) { toast.error('Group, farmer, and amount are required'); return }
    setSaving(true)
    try {
      const payload = { ...form, amount: parseFloat(form.amount), interestRate: parseFloat(form.interestRate) }
      const url = loan ? `/api/vsla/loans/${loan.id}` : '/api/vsla/loans'
      const method = loan ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) { toast.success(loan ? 'Loan updated' : 'Loan issued'); onSaved() }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Failed') }
    } catch { toast.error('Network error') } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>VSLA Group *</Label>
        <Select value={form.vslaGroupId} onValueChange={v => update('vslaGroupId', v)}>
          <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
          <SelectContent>{groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Farmer *</Label>
        <Select value={form.farmerId} onValueChange={v => update('farmerId', v)}>
          <SelectTrigger><SelectValue placeholder="Select farmer" /></SelectTrigger>
          <SelectContent className="max-h-72">{farmers.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.firstName} {f.lastName}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Amount (UGX) *</Label><Input type="number" value={form.amount} onChange={e => update('amount', e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Interest Rate (%)</Label><Input type="number" step="0.1" value={form.interestRate} onChange={e => update('interestRate', e.target.value)} /></div>
      </div>
      {amount > 0 && <p className="text-xs text-muted-foreground">Total repayable: <strong>UGX {repayable.toLocaleString()}</strong></p>}
      <div className="space-y-1.5"><Label>Purpose</Label><Input value={form.purpose} onChange={e => update('purpose', e.target.value)} placeholder="e.g. Buy seeds for next season" /></div>
      {loan && (
        <div className="space-y-1.5"><Label>Status</Label>
          <Select value={form.status} onValueChange={v => update('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem><SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="DISBURSED">Disbursed</SelectItem><SelectItem value="REPAID">Repaid</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {loan ? 'Update' : 'Issue'} Loan</Button>
      </DialogFooter>
    </form>
  )
}

// ─── Meeting Form ─────────────────────────────────────────────────
function MeetingForm({ meeting, groups, onClose, onSaved }: { meeting: any; groups: any[]; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    vslaGroupId: meeting?.vslaGroupId || '',
    meetingDate: meeting?.meetingDate ? new Date(meeting.meetingDate).toISOString().split('T')[0] : '',
    startTime: meeting?.startTime || '10:00', endTime: meeting?.endTime || '12:00',
    agenda: meeting?.agenda || '', status: meeting?.status || 'SCHEDULED',
  })

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vslaGroupId || !form.meetingDate) { toast.error('Group and date are required'); return }
    setSaving(true)
    try {
      const url = meeting ? `/api/vsla/meetings/${meeting.id}` : '/api/vsla/meetings'
      const method = meeting ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) { toast.success(meeting ? 'Meeting updated' : 'Meeting scheduled'); onSaved() }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Failed') }
    } catch { toast.error('Network error') } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>VSLA Group *</Label>
        <Select value={form.vslaGroupId} onValueChange={v => update('vslaGroupId', v)}>
          <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
          <SelectContent>{groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5"><Label>Date *</Label><Input type="date" value={form.meetingDate} onChange={e => update('meetingDate', e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Start</Label><Input type="time" value={form.startTime} onChange={e => update('startTime', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>End</Label><Input type="time" value={form.endTime} onChange={e => update('endTime', e.target.value)} /></div>
      </div>
      <div className="space-y-1.5"><Label>Agenda</Label><Textarea value={form.agenda} onChange={e => update('agenda', e.target.value)} rows={2} placeholder="Meeting agenda..." /></div>
      {meeting && (
        <div className="space-y-1.5"><Label>Status</Label>
          <Select value={form.status} onValueChange={v => update('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem><SelectItem value="IN_PROGRESS">In Progress</SelectItem><SelectItem value="CONCLUDED">Concluded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {meeting ? 'Update' : 'Schedule'} Meeting</Button>
      </DialogFooter>
    </form>
  )
}

function VslaSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full rounded" /></CardContent></Card>)}
      </div>
      <Skeleton className="h-10 w-full rounded" />
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  )
}
