'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts'
import {
  Building2, Users, DollarSign, Leaf, ShieldCheck, Smartphone,
  TrendingUp, TrendingDown, Activity, Globe, AlertCircle
} from 'lucide-react'

interface DashboardData {
  tenants: { total: number; active: number; suspended: number; byType: Record<string, number>; byCountry: Record<string, number>; recent: any[] }
  farmers: { total: number; active: number; newLast30Days: number }
  users: { total: number; active: number }
  revenue: { mrr: number; arr: number; activeSubscriptions: number; byPlan: Record<string, number>; recent: any[] }
  impact: { snapshotsComputed: number; climateScoresComputed: number; verifiedPractices: number; totalImpactEvents: number; carbonCreditsIssued: number }
  compliance: { eudrCompliant: number; eudrTotal: number; eudrRate: number; cbamReports: number; activeCerts: number }
  platform: { totalPlots: number; verifiedPlots: number; plotVerificationRate: number; totalCoops: number; activeVslaGroups: number }
  recentActivity: { newFarmers: number; newTenants: number; newLoans: number; newPayments: number }
}

export default function SuperAdminOverviewView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <OverviewSkeleton />
  if (error || !data) return <div className="p-8 text-center text-muted-foreground">Failed to load: {error}</div>

  const countryData = Object.entries(data.tenants.byCountry).map(([name, value]) => ({ name, value }))
  const planData = Object.entries(data.revenue.byPlan).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-sm text-muted-foreground">Everything happening across all tenants in Uganda, Ghana & Kenya</p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </Badge>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Tenants" value={data.tenants.active} sub={`${data.tenants.suspended} suspended`} icon={Building2} color="#2798d1" />
        <KpiCard label="Total Farmers" value={data.farmers.total} sub={`${data.farmers.newLast30Days} new (30d)`} icon={Users} color="#428e5c" />
        <KpiCard label="MRR" value={`$${(data.revenue.mrr / 1000).toFixed(1)}K`} sub={`ARR $${(data.revenue.arr / 1000).toFixed(0)}K`} icon={DollarSign} color="#bc4156" />
        <KpiCard label="EUDR Compliance" value={`${data.compliance.eudrRate}%`} sub={`${data.compliance.eudrCompliant}/${data.compliance.eudrTotal} plots`} icon={ShieldCheck} color="#577592" />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Impact Events" value={data.impact.totalImpactEvents} sub={`${data.impact.verifiedPractices} practices`} icon={Activity} color="#8f784b" />
        <KpiCard label="Climate Scores" value={data.impact.climateScoresComputed} sub="computed this month" icon={Leaf} color="#428e5c" />
        <KpiCard label="Carbon Credits" value={data.impact.carbonCreditsIssued} sub="issued" icon={TrendingUp} color="#2798d1" />
        <KpiCard label="Active Subscriptions" value={data.revenue.activeSubscriptions} sub={`${data.platform.activeVslaGroups} VSLA groups`} icon={DollarSign} color="#bc4156" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tenants by country */}
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground" /> Tenants by Country</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={countryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {countryData.map((_, i) => <Cell key={i} fill={['#428e5c', '#bc4156', '#2798d1'][i % 3]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {countryData.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: ['#428e5c', '#bc4156', '#2798d1'][i % 3] }} />
                <span className="flex-1 text-muted-foreground">{c.name}</span>
                <span className="font-medium">{c.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Subscriptions by plan */}
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-muted-foreground" /> Subscriptions by Plan</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {planData.map((_, i) => <Cell key={i} fill={['#577592', '#2798d1', '#428e5c'][i % 3]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {planData.map((p, i) => (
              <div key={p.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: ['#577592', '#2798d1', '#428e5c'][i % 3] }} />
                <span className="flex-1 text-muted-foreground">{p.name}</span>
                <span className="font-medium">{p.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-muted-foreground" /> Recent Activity (30 days)</h3>
          <div className="space-y-3">
            <ActivityRow label="New farmers" value={data.recentActivity.newFarmers} icon={Users} color="#428e5c" />
            <ActivityRow label="New tenants" value={data.recentActivity.newTenants} icon={Building2} color="#2798d1" />
            <ActivityRow label="New loans" value={data.recentActivity.newLoans} icon={DollarSign} color="#bc4156" />
            <ActivityRow label="New payments" value={data.recentActivity.newPayments} icon={TrendingUp} color="#8f784b" />
          </div>
        </Card>
      </div>

      {/* Recent Tenants Table */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Recently Onboarded Tenants</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 text-xs uppercase text-muted-foreground">Name</th>
                <th className="text-left py-2 px-2 text-xs uppercase text-muted-foreground">Type</th>
                <th className="text-left py-2 px-2 text-xs uppercase text-muted-foreground">Country</th>
                <th className="text-right py-2 px-2 text-xs uppercase text-muted-foreground">Users</th>
                <th className="text-right py-2 px-2 text-xs uppercase text-muted-foreground">Farmers</th>
                <th className="text-center py-2 px-2 text-xs uppercase text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.tenants.recent.map((t: any) => (
                <tr key={t.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 font-medium">{t.name}</td>
                  <td className="py-2 px-2 text-muted-foreground">{t.type}</td>
                  <td className="py-2 px-2">{t.country || '—'}</td>
                  <td className="py-2 px-2 text-right">{t._count?.users || 0}</td>
                  <td className="py-2 px-2 text-right">{t._count?.farmerProfiles || 0}</td>
                  <td className="py-2 px-2 text-center">
                    <Badge variant={t.isActive ? 'default' : 'secondary'} className="text-[10px]">
                      {t.isActive ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: any; sub: string; icon: any; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mt-1">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </Card>
  )
}

function ActivityRow({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <span className="flex-1 text-sm text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
      </div>
    </div>
  )
}
