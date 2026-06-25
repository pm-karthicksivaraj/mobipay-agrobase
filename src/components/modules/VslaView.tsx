'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  PiggyBank, Users, DollarSign, Calendar, CheckCircle, Clock, XCircle,
  HandCoins, Plus, Eye, ChevronLeft, ChevronRight, Search, Filter, X, Loader2,
  AlertCircle, TrendingUp, CircleDollarSign
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

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/vsla/groups')
      const data = await res.json()
      setGroups(data.groups || data || [])
    } catch (e) { console.error(e) }
  }, [])

  const fetchSavings = useCallback(async () => {
    try {
      const res = await fetch('/api/vsla/savings')
      const data = await res.json()
      setSavings(data.savings || data || [])
    } catch (e) { console.error(e) }
  }, [])

  const fetchLoans = useCallback(async () => {
    try {
      const res = await fetch('/api/vsla/loans')
      const data = await res.json()
      setLoans(data.loans || data || [])
    } catch (e) { console.error(e) }
  }, [])

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch('/api/vsla/meetings')
      const data = await res.json()
      setMeetings(data.meetings || data || [])
    } catch (e) { console.error(e) }
  }, [])

  const loadTab = useCallback((tab: string) => {
    setActiveTab(tab)
    setActiveSubTab(tab)
  }, [setActiveSubTab])

  useEffect(() => {
    Promise.all([fetchGroups(), fetchSavings(), fetchLoans(), fetchMeetings()])
      .finally(() => setLoading(false))
  }, [fetchGroups, fetchSavings, fetchLoans, fetchMeetings])

  if (loading) return <VslaSkeleton />

  const totalSavings = savings.reduce((s: number, v: any) => s + (v.amount || 0), 0)
  const totalLoans = loans.reduce((s: number, v: any) => s + (v.amount || 0), 0)
  const activeLoans = loans.filter((l: any) => ['DISBURSED', 'PENDING', 'APPROVED'].includes(l.status))

  // Pie data for loan status
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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">VSLA Groups</p>
              <p className="text-xl font-bold">{groups.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Members</p>
              <p className="text-xl font-bold">{groups.reduce((s: number, g: any) => s + (g._count?.members || 0), 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
              <CircleDollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Savings</p>
              <p className="text-lg font-bold">UGX {totalSavings.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding Loans</p>
              <p className="text-lg font-bold">UGX {totalLoans.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={loadTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="savings">Savings</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups.map((g: any) => (
              <Card key={g.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-sm">{g.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {g._count?.members || 0} members &middot; {g.meetingFrequency || 'Weekly'}
                      </p>
                    </div>
                    <Badge className={g.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600'}>
                      {g.isActive ? 'Active' : 'Closed'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Share Value</p>
                      <p className="font-semibold">UGX {g.shareValue?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Loan Rate</p>
                      <p className="font-semibold">{g.loanRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max Loan</p>
                      <p className="font-semibold">UGX {g.maxLoanAmount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Welfare</p>
                      <p className="font-semibold">UGX {g.welfareAmount?.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="savings" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savings.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No savings records</TableCell></TableRow>
                  ) : (
                    savings.slice(0, 20).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-sm">
                          {s.farmer?.firstName} {s.farmer?.lastName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.vslaGroup?.name || '—'}</TableCell>
                        <TableCell className="text-right text-sm font-medium">UGX {s.amount?.toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{s.sharesBought}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={cn('text-[10px]', s.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          )}>{s.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Repayable</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loans.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No loan records</TableCell></TableRow>
                      ) : (
                        loans.map((l: any) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium text-sm">
                              {l.farmer?.firstName} {l.farmer?.lastName}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">UGX {l.amount?.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-sm">UGX {l.totalRepayable?.toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{l.purpose || '—'}</TableCell>
                            <TableCell>
                              <Badge className={cn('text-[10px]', loanStatusColor[l.status] || '')}>{l.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            {/* Loan Status Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Loan Status Distribution</CardTitle>
              </CardHeader>
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
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">No data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="meetings" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {meetings.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No meetings scheduled</p>
              </div>
            ) : (
              meetings.map((m: any) => (
                <Card key={m.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <Badge className={cn('text-[10px]',
                        m.status === 'CONCLUDED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                        m.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      )}>{m.status}</Badge>
                    </div>
                    <h4 className="font-semibold text-sm">{m.vslaGroup?.name || 'Meeting'}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(m.meetingDate).toLocaleDateString()} {m.startTime && `at ${m.startTime}`}
                    </p>
                    {m.agenda && <p className="text-xs mt-2 line-clamp-2">{m.agenda}</p>}
                    {m._count?.attendance > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {m._count.attendance} attendance records
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function VslaSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full rounded" /></CardContent></Card>
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded" />
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  )
}