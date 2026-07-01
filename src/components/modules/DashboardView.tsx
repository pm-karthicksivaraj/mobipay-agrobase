'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Users, PiggyBank, DollarSign, Store, ArrowUpRight, ArrowDownRight,
  Activity, Loader2, TrendingUp, UserCheck, GraduationCap, AlertCircle,
  Calendar, MapPin, Sprout, ShoppingCart, Receipt, Award, Leaf, Target,
  Building2, CreditCard, FileText, TrendingDown, CheckCircle, Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie, LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#06b6d4', '#0ea5e9', '#3b82f6', '#8b5cf6', '#a855f7']

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

const statusColor: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function DashboardView() {
  const { user } = useAppStore()
  const role = user?.role || 'TENANT_ADMIN'

  // Route to role-specific dashboard
  switch (role) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />
    case 'COUNTRY_ADMIN':
      return <CountryAdminDashboard />
    case 'FARMER':
      return <FarmerDashboard userId={user?.userId || ''} />
    case 'VSLA_MEMBER':
      return <VslaMemberDashboard userId={user?.userId || ''} />
    case 'EXTENSION_OFFICER':
      return <ExtensionOfficerDashboard userId={user?.userId || ''} />
    case 'AGENT':
      return <AgentDashboard userId={user?.userId || ''} />
    case 'CBT':
      return <CbtDashboard userId={user?.userId || ''} />
    case 'TENANT_ADMIN':
    default:
      return <TenantAdminDashboard />
  }
}

// ─── Shared Loading & Error Components ────────────────────────────

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

function DashboardError() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p className="font-medium">Dashboard data unavailable</p>
      <p className="text-sm mt-1">Please try refreshing the page.</p>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, trend }: {
  label: string; value: any; icon: any; color: string; trend?: string
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-600 font-medium">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Tenant Admin Dashboard ───────────────────────────────────────

interface DashboardStats {
  farmerCount: number; vslaCount: number; totalSavings: number
  activeLoanCount: number; marketListings: number; trainingCount: number
  maleCount: number; femaleCount: number; groupCount: number
  loanCount: number; completedLoans: number; overdueLoans: number; pendingLoans: number
}
interface Transaction { id: string; type: string; recipientName: string; amount: number; status: string; createdAt: string; description?: string }
interface MonthlyReg { month: string; count: number }
interface VslaSavingsRow { name: string; total: number }

function TenantAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthlyRegs, setMonthlyRegs] = useState<MonthlyReg[]>([])
  const [vslaSavings, setVslaSavings] = useState<VslaSavingsRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/stats')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setStats(data.stats || {
        farmerCount: 0, vslaCount: 0, totalSavings: 0,
        activeLoanCount: 0, marketListings: 0, trainingCount: 0,
        maleCount: 0, femaleCount: 0, groupCount: 0,
        loanCount: 0, completedLoans: 0, overdueLoans: 0, pendingLoans: 0,
      })
      setTransactions(data.recentTransactions || [])
      setMonthlyRegs(data.monthlyRegistrations || [])
      setVslaSavings(data.vslaSavingsByGroup || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <DashboardSkeleton />
  if (!stats) return <DashboardError />

  const s = stats
  const fmt = (num: number) => 'UGX ' + num.toLocaleString()
  const lineConfig: ChartConfig = { value: { label: 'Farmers', color: 'var(--chart-1)' } }
  const savingsConfig: ChartConfig = { total: { label: 'Savings (UGX)', color: 'var(--chart-2)' } }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Tenant Dashboard</h2>
        <p className="text-sm text-muted-foreground">Overview of your cooperative/organization</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Farmers" value={s.farmerCount.toLocaleString()} icon={Users} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" trend="+12%" />
        <StatCard label="VSLA Groups" value={s.vslaCount} icon={PiggyBank} color="bg-blue-50 dark:bg-blue-950/40 text-blue-600" />
        <StatCard label="Active Loans" value={s.activeLoanCount} icon={DollarSign} color="bg-amber-50 dark:bg-amber-950/40 text-amber-600" />
        <StatCard label="Market Listings" value={s.marketListings} icon={Store} color="bg-purple-50 dark:bg-purple-950/40 text-purple-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Farmer Registrations</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={lineConfig} className="h-[260px] w-full">
              <BarChart data={monthlyRegs.map(m => ({ ...m, month: formatMonth(m.month) }))}>
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
          <CardHeader className="pb-2"><CardTitle className="text-base">VSLA Savings by Group</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={savingsConfig} className="h-[260px] w-full">
              <BarChart data={vslaSavings} layout="vertical">
                <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
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
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Gender Split</p>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-300">{s.maleCount}</div>
              <div className="w-7 h-7 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center text-[10px] font-bold text-pink-700 dark:text-pink-300">{s.femaleCount}</div>
            </div>
            <div className="text-xs"><span className="text-blue-600 font-medium">M {s.maleCount}</span><span className="text-muted-foreground mx-1">/</span><span className="text-pink-600 font-medium">F {s.femaleCount}</span></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Farmer Groups</p><p className="text-xl font-bold">{s.groupCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Trainings</p><p className="text-xl font-bold">{s.trainingCount}</p></CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Loan Portfolio</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="outline" className="text-[10px]">Total: {s.loanCount}</Badge>
            <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Done: {s.completedLoans}</Badge>
            <Badge className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Overdue: {s.overdueLoans}</Badge>
          </div>
        </CardContent></Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No recent transactions</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-[100px]">Type</TableHead><TableHead>Recipient</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead>Date</TableHead><TableHead className="w-[100px]">Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {transactions.slice(0, 8).map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell><Badge variant="outline" className="text-[10px] font-mono">{tx.type || 'PAYMENT'}</Badge></TableCell>
                    <TableCell className="font-medium text-sm">{tx.recipientName}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmt(tx.amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}</TableCell>
                    <TableCell><Badge className={cn('text-[10px]', statusColor[tx.status] || 'bg-gray-100')}>{tx.status}</Badge></TableCell>
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

// ─── Country Admin Dashboard ──────────────────────────────────────

function CountryAdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />
  if (!data) return <DashboardError />

  const s = data.stats || {}
  const fmt = (n: number) => n?.toLocaleString() || '0'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Country Dashboard</h2>
        <p className="text-sm text-muted-foreground">Overview across all tenants in your country</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Farmers" value={fmt(s.farmerCount)} icon={Users} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
        <StatCard label="VSLA Groups" value={fmt(s.vslaCount)} icon={PiggyBank} color="bg-blue-50 dark:bg-blue-950/40 text-blue-600" />
        <StatCard label="Total Savings" value={`UGX ${fmt(s.totalSavings)}`} icon={DollarSign} color="bg-amber-50 dark:bg-amber-950/40 text-amber-600" />
        <StatCard label="Active Loans" value={fmt(s.activeLoanCount)} icon={CreditCard} color="bg-purple-50 dark:bg-purple-950/40 text-purple-600" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Trainings" value={fmt(s.trainingCount)} icon={GraduationCap} color="bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600" />
        <StatCard label="Market Listings" value={fmt(s.marketListings)} icon={Store} color="bg-pink-50 dark:bg-pink-950/40 text-pink-600" />
        <StatCard label="Farmer Groups" value={fmt(s.groupCount)} icon={Users} color="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600" />
        <StatCard label="Total Loans" value={fmt(s.loanCount)} icon={FileText} color="bg-teal-50 dark:bg-teal-950/40 text-teal-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Farmer Registrations (Monthly)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={(data.monthlyRegistrations || []).map((m: any) => ({ ...m, month: formatMonth(m.month) }))}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">VSLA Savings by Group</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.vslaSavingsByGroup || []} layout="vertical">
                <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Super Admin Dashboard ────────────────────────────────────────

function SuperAdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />
  if (!data) return <DashboardError />

  const countryData = Object.entries(data.tenants?.byCountry || {}).map(([name, value]) => ({ name, value: value as number }))
  const planData = Object.entries(data.revenue?.byPlan || {}).map(([name, value]) => ({ name, value: value as number }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Platform Overview</h2>
        <p className="text-sm text-muted-foreground">Cross-tenant platform metrics across all countries</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Tenants" value={data.tenants?.active || 0} icon={Building2} color="bg-blue-50 dark:bg-blue-950/40 text-blue-600" />
        <StatCard label="Total Farmers" value={(data.farmers?.total || 0).toLocaleString()} icon={Users} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
        <StatCard label="MRR" value={`$${((data.revenue?.mrr || 0) / 1000).toFixed(1)}K`} icon={DollarSign} color="bg-amber-50 dark:bg-amber-950/40 text-amber-600" />
        <StatCard label="EUDR Compliance" value={`${data.compliance?.eudrRate || 0}%`} icon={CheckCircle} color="bg-purple-50 dark:bg-purple-950/40 text-purple-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Impact Events" value={data.impact?.totalImpactEvents || 0} icon={Activity} color="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600" />
        <StatCard label="Carbon Credits" value={data.impact?.carbonCreditsIssued || 0} icon={Leaf} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
        <StatCard label="Active Subscriptions" value={data.revenue?.activeSubscriptions || 0} icon={CreditCard} color="bg-pink-50 dark:bg-pink-950/40 text-pink-600" />
        <StatCard label="VSLA Groups" value={data.platform?.activeVslaGroups || 0} icon={PiggyBank} color="bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Tenants by Country</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={countryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {countryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Subscriptions by Plan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {planData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent Activity (30d)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">New farmers</span><span className="font-bold">{data.recentActivity?.newFarmers || 0}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">New tenants</span><span className="font-bold">{data.recentActivity?.newTenants || 0}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">New loans</span><span className="font-bold">{data.recentActivity?.newLoans || 0}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">New payments</span><span className="font-bold">{data.recentActivity?.newPayments || 0}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tenants Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Recently Onboarded Tenants</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Country</TableHead>
              <TableHead className="text-right">Users</TableHead><TableHead className="text-right">Farmers</TableHead><TableHead className="text-center">Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(data.tenants?.recent || []).map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-sm">{t.name}</TableCell>
                  <TableCell className="text-sm">{t.type}</TableCell>
                  <TableCell className="text-sm">{t.country || '—'}</TableCell>
                  <TableCell className="text-right text-sm">{t._count?.users || 0}</TableCell>
                  <TableCell className="text-right text-sm">{t._count?.farmerProfiles || 0}</TableCell>
                  <TableCell className="text-center"><Badge variant={t.isActive ? 'default' : 'secondary'} className="text-[10px]">{t.isActive ? 'Active' : 'Suspended'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Farmer Dashboard ─────────────────────────────────────────────

function FarmerDashboard({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch farmer's own profile + their data
    fetch(`/api/mobile/dashboard?userId=${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId])

  if (loading) return <DashboardSkeleton />

  const farmer = data?.farmer || {}
  const farms = data?.farms || []
  const trainings = data?.upcomingTrainings || []
  const savings = data?.savings || 0
  const loans = data?.loans || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">My Farm Dashboard</h2>
        <p className="text-sm text-muted-foreground">Your farm overview and upcoming activities</p>
      </div>

      {/* Personal Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Farm Lands" value={farms.length} icon={MapPin} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
        <StatCard label="My Savings" value={`UGX ${savings.toLocaleString()}`} icon={PiggyBank} color="bg-blue-50 dark:bg-blue-950/40 text-blue-600" />
        <StatCard label="Active Loans" value={loans.filter((l: any) => l.status === 'DISBURSED').length} icon={DollarSign} color="bg-amber-50 dark:bg-amber-950/40 text-amber-600" />
        <StatCard label="Upcoming Trainings" value={trainings.length} icon={GraduationCap} color="bg-purple-50 dark:bg-purple-950/40 text-purple-600" />
      </div>

      {/* My Farms */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">My Farm Lands</CardTitle></CardHeader>
        <CardContent className="p-0">
          {farms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No farm lands registered yet</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Farm Name</TableHead><TableHead>Area (ha)</TableHead><TableHead>Crops</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {farms.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium text-sm">{f.name}</TableCell>
                    <TableCell className="text-sm">{f.sizeHectares?.toFixed(2) ?? '—'}</TableCell>
                    <TableCell className="text-sm">{f._count?.cultivations || 0} cultivation(s)</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Trainings */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Upcoming Trainings</CardTitle></CardHeader>
        <CardContent>
          {trainings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No upcoming trainings</div>
          ) : (
            <div className="space-y-2">
              {trainings.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{t.topic}</p>
                    <p className="text-xs text-muted-foreground">{t.date ? new Date(t.date).toLocaleDateString() : '—'} {t.location && `· ${t.location}`}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{t.type || 'Training'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── VSLA Member Dashboard ────────────────────────────────────────

function VslaMemberDashboard({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/mobile/dashboard?userId=${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId])

  if (loading) return <DashboardSkeleton />

  const savings = data?.savings || 0
  const loans = data?.loans || []
  const meetings = data?.upcomingMeetings || []
  const group = data?.vslaGroup || {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">My VSLA Dashboard</h2>
        <p className="text-sm text-muted-foreground">Savings, loans, and meeting schedule</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Savings" value={`UGX ${savings.toLocaleString()}`} icon={PiggyBank} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
        <StatCard label="Active Loans" value={loans.filter((l: any) => l.status === 'DISBURSED').length} icon={DollarSign} color="bg-amber-50 dark:bg-amber-950/40 text-amber-600" />
        <StatCard label="Shares Owned" value={data?.sharesOwned || 0} icon={Award} color="bg-blue-50 dark:bg-blue-950/40 text-blue-600" />
        <StatCard label="Upcoming Meetings" value={meetings.length} icon={Calendar} color="bg-purple-50 dark:bg-purple-950/40 text-purple-600" />
      </div>

      {/* My VSLA Group */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">My VSLA Group: {group.name || '—'}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-muted-foreground text-xs">Share Value</p><p className="font-medium">UGX {group.shareValue?.toLocaleString() || '—'}</p></div>
          <div><p className="text-muted-foreground text-xs">Loan Rate</p><p className="font-medium">{group.loanRate || '—'}%</p></div>
          <div><p className="text-muted-foreground text-xs">Max Loan</p><p className="font-medium">UGX {group.maxLoanAmount?.toLocaleString() || '—'}</p></div>
          <div><p className="text-muted-foreground text-xs">Meeting</p><p className="font-medium">{group.meetingFrequency || 'Weekly'}</p></div>
        </CardContent>
      </Card>

      {/* Upcoming Meetings */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Upcoming Meetings</CardTitle></CardHeader>
        <CardContent>
          {meetings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No upcoming meetings scheduled</div>
          ) : (
            <div className="space-y-2">
              {meetings.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{m.agenda || 'VSLA Meeting'}</p>
                    <p className="text-xs text-muted-foreground">{m.meetingDate ? new Date(m.meetingDate).toLocaleDateString() : '—'} {m.startTime && `at ${m.startTime}`}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Extension Officer Dashboard ──────────────────────────────────

function ExtensionOfficerDashboard({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />

  const s = data?.stats || {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Extension Officer Dashboard</h2>
        <p className="text-sm text-muted-foreground">Farmers under your advisory, trainings, and farm visits</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Farmers Registered" value={s.farmerCount || 0} icon={Users} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
        <StatCard label="Trainings Conducted" value={s.trainingCount || 0} icon={GraduationCap} color="bg-purple-50 dark:bg-purple-950/40 text-purple-600" />
        <StatCard label="VSLA Groups" value={s.vslaCount || 0} icon={PiggyBank} color="bg-blue-50 dark:bg-blue-950/40 text-blue-600" />
        <StatCard label="Farmer Groups" value={s.groupCount || 0} icon={Users} color="bg-amber-50 dark:bg-amber-950/40 text-amber-600" />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ActionCard label="Register Farmer" icon={UserCheck} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
          <ActionCard label="Schedule Training" icon={GraduationCap} color="bg-purple-50 dark:bg-purple-950/40 text-purple-600" />
          <ActionCard label="Log Farm Visit" icon={Leaf} color="bg-teal-50 dark:bg-teal-950/40 text-teal-600" />
          <ActionCard label="Log Mazao Safi Practice" icon={Sprout} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Agent Dashboard ──────────────────────────────────────────────

function AgentDashboard({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />

  const s = data?.stats || {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Agent Dashboard</h2>
        <p className="text-sm text-muted-foreground">Farmer mobilization and field data collection</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Farmers Registered" value={s.farmerCount || 0} icon={Users} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
        <StatCard label="VSLA Savings" value={`UGX ${(s.totalSavings || 0).toLocaleString()}`} icon={PiggyBank} color="bg-blue-50 dark:bg-blue-950/40 text-blue-600" />
        <StatCard label="Trainings" value={s.trainingCount || 0} icon={GraduationCap} color="bg-purple-50 dark:bg-purple-950/40 text-purple-600" />
        <StatCard label="Farmer Groups" value={s.groupCount || 0} icon={Users} color="bg-amber-50 dark:bg-amber-950/40 text-amber-600" />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <ActionCard label="Register Farmer" icon={UserCheck} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
          <ActionCard label="Record Saving" icon={PiggyBank} color="bg-blue-50 dark:bg-blue-950/40 text-blue-600" />
          <ActionCard label="Enroll in Training" icon={GraduationCap} color="bg-purple-50 dark:bg-purple-950/40 text-purple-600" />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── CBT Dashboard ────────────────────────────────────────────────

function CbtDashboard({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />

  const s = data?.stats || {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">CBT Dashboard</h2>
        <p className="text-sm text-muted-foreground">Community-based training activities</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Trainings" value={s.trainingCount || 0} icon={GraduationCap} color="bg-purple-50 dark:bg-purple-950/40 text-purple-600" />
        <StatCard label="Farmers" value={s.farmerCount || 0} icon={Users} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
        <StatCard label="VSLA Groups" value={s.vslaCount || 0} icon={PiggyBank} color="bg-blue-50 dark:bg-blue-950/40 text-blue-600" />
        <StatCard label="Market Listings" value={s.marketListings || 0} icon={Store} color="bg-pink-50 dark:bg-pink-950/40 text-pink-600" />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <ActionCard label="Schedule Training" icon={GraduationCap} color="bg-purple-50 dark:bg-purple-950/40 text-purple-600" />
          <ActionCard label="Mark Attendance" icon={CheckCircle} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
          <ActionCard label="View Farmers" icon={Users} color="bg-blue-50 dark:bg-blue-950/40 text-blue-600" />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Shared Action Card ───────────────────────────────────────────

function ActionCard({ label, icon: Icon, color }: { label: string; icon: any; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-2', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-center">{label}</span>
    </div>
  )
}
