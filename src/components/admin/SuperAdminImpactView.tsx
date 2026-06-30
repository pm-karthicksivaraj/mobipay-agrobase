'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts'
import { Leaf, TrendingUp, Activity, Award } from 'lucide-react'

interface ImpactData {
  period: string
  summary: { totalKpiSnapshots: number; farmersWithScores: number; avgClimateScore: number; totalImpactEvents: number; totalPractices: number; verifiedPractices: number; totalBaselines: number }
  pillarSummary: { pillar: string; label: string; color: string; description: string; computedCount: number; totalDefined: number; coverage: number; farmerCount: number }[]
  kpis: { code: string; pillar: string; name: string; unit: string; avg: number; avgBaseline: number | null; sampleCount: number; farmerCount: number; target: string; irisPlus?: string }[]
  riskDistribution: Record<string, number>
  topTenants: { tenantId: string; avgScore: number; farmerCount: number; tenant: { name: string; country: string; type: string } }[]
}

const PILLAR_COLORS: Record<string, string> = {
  INCOME: '#428e5c', YIELD: '#2798d1', CLIMATE: '#8f784b', INCLUSION: '#bc4156', COMPLIANCE: '#577592',
}

export default function SuperAdminImpactView() {
  const [data, setData] = useState<ImpactData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/impact')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>

  const riskData = Object.entries(data.riskDistribution).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Impact</h1>
          <p className="text-sm text-muted-foreground">Aggregate impact across all tenants · Period: {data.period}</p>
        </div>
        <Badge variant="outline">IRIS+ aligned · DiD attribution</Badge>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Leaf className="w-4 h-4 text-emerald-600" /><span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Avg Climate Score</span></div>
          <div className="text-2xl font-bold">{data.summary.avgClimateScore}<span className="text-sm text-muted-foreground">/100</span></div>
          <div className="text-xs text-muted-foreground mt-1">{data.summary.farmersWithScores} farmers scored</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-blue-600" /><span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Impact Events</span></div>
          <div className="text-2xl font-bold">{data.summary.totalImpactEvents.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">{data.summary.totalBaselines} baselines captured</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-amber-600" /><span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Verified Practices</span></div>
          <div className="text-2xl font-bold">{data.summary.verifiedPractices}</div>
          <div className="text-xs text-muted-foreground mt-1">{data.summary.totalPractices} total logged</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Award className="w-4 h-4 text-purple-600" /><span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">KPI Snapshots</span></div>
          <div className="text-2xl font-bold">{data.summary.totalKpiSnapshots}</div>
          <div className="text-xs text-muted-foreground mt-1">computed this period</div>
        </Card>
      </div>

      {/* Pillar Coverage */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Impact Pillar Coverage</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {data.pillarSummary.map(p => (
            <div key={p.pillar} className="rounded-lg border p-4" style={{ borderTopColor: p.color, borderTopWidth: 3 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm" style={{ color: p.color }}>{p.label}</span>
                <Badge variant="secondary" className="text-[10px]">{p.computedCount}/{p.totalDefined}</Badge>
              </div>
              <div className="text-2xl font-bold">{p.coverage}%</div>
              <div className="text-[10px] text-muted-foreground mt-1">{p.farmerCount} farmers</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Distribution */}
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Climate Risk Distribution</h3>
          {riskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={riskData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {riskData.map((_, i) => (
                    <Cell key={i} fill={['#428e5c', '#8f784b', '#bc4156', '#954841'][i % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No scores computed yet this period</div>
          )}
        </Card>

        {/* Top Tenants */}
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Top Performing Tenants (by climate score)</h3>
          <div className="space-y-2">
            {data.topTenants.slice(0, 8).map((t, i) => (
              <div key={t.tenantId} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30">
                <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.tenant.name}</div>
                  <div className="text-[10px] text-muted-foreground">{t.tenant.country} · {t.tenant.type}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold" style={{ color: t.avgScore >= 70 ? '#428e5c' : t.avgScore >= 50 ? '#8f784b' : '#bc4156' }}>
                    {t.avgScore}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{t.farmerCount} farmers</div>
                </div>
              </div>
            ))}
            {data.topTenants.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">No scores computed yet</div>
            )}
          </div>
        </Card>
      </div>

      {/* KPI Averages Table */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">KPI Averages (platform-wide)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-xs uppercase text-muted-foreground">Code</th>
                <th className="text-left py-2 px-3 text-xs uppercase text-muted-foreground">KPI</th>
                <th className="text-left py-2 px-3 text-xs uppercase text-muted-foreground">Pillar</th>
                <th className="text-right py-2 px-3 text-xs uppercase text-muted-foreground">Avg</th>
                <th className="text-right py-2 px-3 text-xs uppercase text-muted-foreground">Baseline</th>
                <th className="text-center py-2 px-3 text-xs uppercase text-muted-foreground">Farmers</th>
                <th className="text-left py-2 px-3 text-xs uppercase text-muted-foreground">Target</th>
                <th className="text-center py-2 px-3 text-xs uppercase text-muted-foreground">IRIS+</th>
              </tr>
            </thead>
            <tbody>
              {data.kpis.map(k => (
                <tr key={k.code} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-3"><code className="text-[10px] font-mono" style={{ color: PILLAR_COLORS[k.pillar] }}>{k.code}</code></td>
                  <td className="py-2 px-3">{k.name}</td>
                  <td className="py-2 px-3"><Badge variant="secondary" className="text-[9px]" style={{ color: PILLAR_COLORS[k.pillar] }}>{k.pillar}</Badge></td>
                  <td className="py-2 px-3 text-right font-medium">{k.avg} <span className="text-[10px] text-muted-foreground">{k.unit}</span></td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{k.avgBaseline ?? '—'}</td>
                  <td className="py-2 px-3 text-center">{k.farmerCount}</td>
                  <td className="py-2 px-3 text-xs text-muted-foreground">{k.target}</td>
                  <td className="py-2 px-3 text-center">{k.irisPlus ? <Badge variant="outline" className="text-[9px]">{k.irisPlus}</Badge> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
