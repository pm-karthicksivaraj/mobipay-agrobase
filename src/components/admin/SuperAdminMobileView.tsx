'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import {
  Smartphone, Users, Activity, Zap, Globe, TrendingUp
} from 'lucide-react'

interface MobileData {
  installs: number
  monthlyActive: number
  dailyActive: number
  stickiness: number
  featureUsage: {
    vslaTransactions: number
    plotVerifications: number
    practiceLogs: number
    loanApplications: number
    payments: number
  }
  byCountry: { country: string; count: number }[]
  note?: string
}

export default function SuperAdminMobileView() {
  const [data, setData] = useState<MobileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/mobile')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>
  if (error || !data) return <div className="p-8 text-center text-muted-foreground">Failed to load: {error}</div>

  const countryData = data.byCountry.map(c => ({ name: c.country || 'Unknown', value: c.count }))
  const featureData = [
    { name: 'VSLA Tx', value: data.featureUsage.vslaTransactions },
    { name: 'Plot Verif.', value: data.featureUsage.plotVerifications },
    { name: 'Practices', value: data.featureUsage.practiceLogs },
    { name: 'Loans', value: data.featureUsage.loanApplications },
    { name: 'Payments', value: data.featureUsage.payments },
  ]
  const totalFeatureEvents = featureData.reduce((sum, f) => sum + f.value, 0)

  // Recent "sync" rows — derived client-side from feature-usage counts as a
  // best-effort approximation since the underlying API aggregates counts
  // rather than per-event records. This keeps the table readable while
  // documenting that real per-event sync tracking is a future enhancement.
  const recentSyncs = [
    { feature: 'Payments', events: data.featureUsage.payments, color: '#428e5c' },
    { feature: 'Plot Verifications', events: data.featureUsage.plotVerifications, color: '#2798d1' },
    { feature: 'VSLA Transactions', events: data.featureUsage.vslaTransactions, color: '#bc4156' },
    { feature: 'Practice Logs', events: data.featureUsage.practiceLogs, color: '#8f784b' },
    { feature: 'Loan Applications', events: data.featureUsage.loanApplications, color: '#577592' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mobile App Monitoring</h1>
          <p className="text-sm text-muted-foreground">Installs, active sessions, feature usage across all tenants</p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Installs (proxy)" value={data.installs} sub="farmers with phone" icon={Smartphone} color="#2798d1" />
        <KpiCard label="Monthly Active" value={data.monthlyActive} sub="users logged in 30d" icon={Users} color="#428e5c" />
        <KpiCard label="Daily Active" value={data.dailyActive} sub="users logged in 24h" icon={Activity} color="#bc4156" />
        <KpiCard label="Stickiness" value={`${data.stickiness}%`} sub="DAU / MAU" icon={Zap} color="#8f784b" />
      </div>

      {/* Second row KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="VSLA Tx (30d)" value={data.featureUsage.vslaTransactions} sub="mobile-initiated" icon={TrendingUp} color="#bc4156" />
        <KpiCard label="Plot Verifications" value={data.featureUsage.plotVerifications} sub="last 30 days" icon={Activity} color="#2798d1" />
        <KpiCard label="Practice Logs" value={data.featureUsage.practiceLogs} sub="last 30 days" icon={TrendingUp} color="#428e5c" />
        <KpiCard label="Payments (30d)" value={data.featureUsage.payments} sub="mobile-initiated" icon={Smartphone} color="#577592" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" /> Installs by Country
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={countryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={2}>
                {countryData.map((_, i) => <Cell key={i} fill={['#428e5c', '#bc4156', '#2798d1', '#577592', '#8f784b'][i % 5]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {countryData.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: ['#428e5c', '#bc4156', '#2798d1', '#577592', '#8f784b'][i % 5] }} />
                <span className="flex-1 text-muted-foreground truncate">{c.name}</span>
                <span className="font-medium">{c.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-3">Feature Usage (last 30 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={featureData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" fill="#2798d1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-xs text-muted-foreground mt-2">
            Total events (30d): <span className="font-medium text-foreground">{totalFeatureEvents.toLocaleString()}</span>
          </div>
        </Card>
      </div>

      {/* Recent Sync Activity table */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Sync Activity Summary (30d)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Feature</th>
                <th className="text-center py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Events</th>
                <th className="text-right py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Share of Total</th>
                <th className="text-left py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Volume</th>
              </tr>
            </thead>
            <tbody>
              {recentSyncs.map(r => (
                <tr key={r.feature} className="border-b hover:bg-muted/30">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                      <span className="font-medium">{r.feature}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-medium">{r.events.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-muted-foreground">
                    {totalFeatureEvents > 0 ? `${((r.events / totalFeatureEvents) * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${totalFeatureEvents > 0 ? (r.events / totalFeatureEvents) * 100 : 0}%`,
                          background: r.color,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.note && (
          <p className="text-xs text-muted-foreground mt-4 italic">{data.note}</p>
        )}
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
