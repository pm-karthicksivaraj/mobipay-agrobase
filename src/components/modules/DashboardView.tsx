'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Users, PiggyBank, DollarSign, Store, ArrowUpRight, ArrowDownRight,
  Activity, Loader2, TrendingUp, UserCheck, GraduationCap, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

interface DashboardStats {
  farmerCount: number; vslaCount: number; totalSavings: number
  activeLoanCount: number; marketListings: number; trainingCount: number
  maleCount: number; femaleCount: number; groupCount: number
  loanCount: number; completedLoans: number; overdueLoans: number; pendingLoans: number
}
interface Transaction { id: string; type: string; recipientName: string; amount: number; status: string; createdAt: string; description?: string }
interface MonthlyReg { month: string; count: number }
interface VslaSavingsRow { name: string; total: number }

const statCards = [
  { key: 'farmerCount' as const, label: 'Total Farmers', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', trend: '+12%', up: true },
  { key: 'vslaCount' as const, label: 'VSLA Groups', icon: PiggyBank, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40', trend: '+3', up: true },
  { key: 'activeLoanCount' as const, label: 'Active Loans', icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40', trend: null, up: true },
  { key: 'marketListings' as const, label: 'Market Listings', icon: Store, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40', trend: '+8', up: true },
]

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#06b6d4', '#0ea5e9', '#3b82f6', '#8b5cf6', '#a855f7']

const lineConfig: ChartConfig = { value: { label: 'Farmers', color: 'var(--chart-1)' } }
const savingsConfig: ChartConfig = { total: { label: 'Savings (UGX)', color: 'var(--chart-2)' } }

const MONTH_NAMES: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}

function formatMonth(isoMonth: string): string {
  const parts = isoMonth.split('-')
  if (parts.length === 2) return MONTH_NAMES[parts[1]] || isoMonth
  return isoMonth
}

const fmt = (num: number) => 'UGX ' + num.toLocaleString()

const statusColor: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthlyRegs, setMonthlyRegs] = useState<MonthlyReg[]>([])
  const [vslaSavings, setVslaSavings] = useState<VslaSavingsRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/stats')
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      const data = await res.json()
      // Guard against missing stats object — fall back to zeros
      const safeStats: DashboardStats = data.stats || {
        farmerCount: 0, vslaCount: 0, totalSavings: 0,
        activeLoanCount: 0, marketListings: 0, trainingCount: 0,
        maleCount: 0, femaleCount: 0, groupCount: 0,
        loanCount: 0, completedLoans: 0, overdueLoans: 0, pendingLoans: 0,
      }
      setStats(safeStats)
      setTransactions(data.recentTransactions || [])
      setMonthlyRegs(data.monthlyRegistrations || [])
      setVslaSavings(data.vslaSavingsByGroup || [])
    } catch (e) {
      console.error(e)
      // Fall back to zero stats so the dashboard renders instead of crashing
      setStats({
        farmerCount: 0, vslaCount: 0, totalSavings: 0,
        activeLoanCount: 0, marketListings: 0, trainingCount: 0,
        maleCount: 0, femaleCount: 0, groupCount: 0,
        loanCount: 0, completedLoans: 0, overdueLoans: 0, pendingLoans: 0,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <DashboardSkeleton />

  // Null guard — if stats is still null, render empty state instead of crashing
  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Dashboard data unavailable</p>
        <p className="text-sm mt-1">Please try refreshing the page.</p>
      </div>
    )
  }

  const s = stats

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(sc => {
          const Icon = sc.icon
          const val = s[sc.key]
          return (
            <Card key={sc.key} className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{sc.label}</p>
                    <p className="text-2xl font-bold mt-1">{typeof val === 'number' ? val.toLocaleString() : val}</p>
                  </div>
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', sc.bg)}>
                    <Icon className={cn('w-5 h-5', sc.color)} />
                  </div>
                </div>
                {sc.trend && (
                  <div className="flex items-center gap-1 mt-2 text-xs">
                    {sc.up ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />}
                    <span className={sc.up ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>{sc.trend}</span>
                    <span className="text-muted-foreground">vs last month</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Farmer Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={lineConfig} className="h-[260px] w-full">
              <BarChart data={monthlyRegs.map(m => ({ ...m, month: formatMonth(m.month) }))} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">VSLA Savings by Group</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={savingsConfig} className="h-[260px] w-full">
              <BarChart data={vslaSavings} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--chart-2)" radius={[0, 6, 6, 0]}>
                  {vslaSavings.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Gender Split</p>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-300">{s.maleCount}</div>
                <div className="w-7 h-7 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center text-[10px] font-bold text-pink-700 dark:text-pink-300">{s.femaleCount}</div>
              </div>
              <div className="text-xs">
                <span className="text-blue-600 font-medium">M {s.maleCount}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-pink-600 font-medium">F {s.femaleCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Farmer Groups</p>
            <p className="text-xl font-bold">{s.groupCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Trainings</p>
            <p className="text-xl font-bold">{s.trainingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Loan Portfolio</p>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Total: {s.loanCount}</Badge>
              <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Done: {s.completedLoans}</Badge>
              <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Overdue: {s.overdueLoans}</Badge>
              <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Pending: {s.pendingLoans}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No recent transactions</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 8).map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">{tx.type || 'PAYMENT'}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{tx.recipientName}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmt(tx.amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px]', statusColor[tx.status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300')}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardContent className="p-6"><Skeleton className="h-[260px] w-full rounded" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-[260px] w-full rounded" /></CardContent></Card>
      </div>
    </div>
  )
}