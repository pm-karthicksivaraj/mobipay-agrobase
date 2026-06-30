'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Legend
} from 'recharts'
import { DollarSign, TrendingUp, TrendingDown, Users } from 'lucide-react'

interface RevenueData {
  summary: { mrr: number; arr: number; activeSubscriptions: number; churnedThisMonth: number; churnRate: number }
  byPlan: { plan: string; count: number; mrr: number }[]
  byCountry: { country: string; count: number; mrr: number }[]
  byType: { type: string; count: number; mrr: number }[]
  trend: { month: string; mrr: number; newSubs: number }[]
  recent: any[]
}

export default function SuperAdminRevenueView() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/revenue')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenue & Subscriptions</h1>
        <p className="text-sm text-muted-foreground">MRR, churn, invoicing across all tenants</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">MRR</div>
          <div className="text-2xl font-bold text-emerald-600">${data.summary.mrr.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">{data.summary.activeSubscriptions} active subs</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">ARR</div>
          <div className="text-2xl font-bold">${data.summary.arr.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">Annualized run rate</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Churn Rate</div>
          <div className="text-2xl font-bold text-rose-600">{data.summary.churnRate}%</div>
          <div className="text-xs text-muted-foreground mt-1">{data.summary.churnedThisMonth} churned</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Avg MRR / Tenant</div>
          <div className="text-2xl font-bold">
            ${data.summary.activeSubscriptions > 0 ? Math.round(data.summary.mrr / data.summary.activeSubscriptions) : 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Per active subscription</div>
        </Card>
      </div>

      {/* MRR Trend */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">MRR Trend (12 months)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data.trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#428e5c" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#428e5c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `$${v / 1000}K`} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'MRR']} />
            <Area type="monotone" dataKey="mrr" stroke="#428e5c" strokeWidth={2} fill="url(#mrrGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Revenue by Plan + Country */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Revenue by Plan</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byPlan}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="plan" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v / 1000}K`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Bar dataKey="mrr" fill="#2798d1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Revenue by Country</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byCountry}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="country" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v / 1000}K`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Bar dataKey="mrr" fill="#428e5c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Subscriptions */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Recent Subscriptions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-xs uppercase text-muted-foreground">Tenant</th>
                <th className="text-left py-2 px-3 text-xs uppercase text-muted-foreground">Country</th>
                <th className="text-left py-2 px-3 text-xs uppercase text-muted-foreground">Plan</th>
                <th className="text-right py-2 px-3 text-xs uppercase text-muted-foreground">Amount</th>
                <th className="text-center py-2 px-3 text-xs uppercase text-muted-foreground">Cycle</th>
                <th className="text-center py-2 px-3 text-xs uppercase text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((s: any) => (
                <tr key={s.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-3 font-medium">{s.tenant}</td>
                  <td className="py-2 px-3">{s.country}</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-[10px]">{s.plan}</Badge></td>
                  <td className="py-2 px-3 text-right font-medium">${s.amount}</td>
                  <td className="py-2 px-3 text-center text-xs">{s.cycle}</td>
                  <td className="py-2 px-3 text-center">
                    <Badge variant={s.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px]">{s.status}</Badge>
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
