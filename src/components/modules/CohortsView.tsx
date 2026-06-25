'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Users, GraduationCap, TrendingUp, Calendar, Trophy, BarChart3,
  Search, Loader2, Target, Award, Clock, CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, Legend } from 'recharts'

const COLORS = ['#059669', '#f59e0b']

const MOCK_COHORT_1 = [
  { id: 'c1-1', name: 'Okello John', enrollmentDate: '2023-06-15', trainingCompletion: 92, performanceScore: 85, status: 'GRADUATED', district: 'Gulu' },
  { id: 'c1-2', name: 'Nakamya Grace', enrollmentDate: '2023-06-20', trainingCompletion: 100, performanceScore: 94, status: 'GRADUATED', district: 'Mukono' },
  { id: 'c1-3', name: 'Mugisha Peter', enrollmentDate: '2023-07-01', trainingCompletion: 78, performanceScore: 72, status: 'GRADUATED', district: 'Mbarara' },
  { id: 'c1-4', name: 'Achieng Sarah', enrollmentDate: '2023-07-10', trainingCompletion: 88, performanceScore: 81, status: 'GRADUATED', district: 'Jinja' },
  { id: 'c1-5', name: 'Tumusiime David', enrollmentDate: '2023-08-01', trainingCompletion: 65, performanceScore: 60, status: 'ACTIVE', district: 'Kabale' },
  { id: 'c1-6', name: 'Apio Jennifer', enrollmentDate: '2023-08-15', trainingCompletion: 45, performanceScore: 42, status: 'ACTIVE', district: 'Lira' },
  { id: 'c1-7', name: 'Ssebaggala Robert', enrollmentDate: '2023-09-01', trainingCompletion: 30, performanceScore: 28, status: 'DROPPED', district: 'Wakiso' },
  { id: 'c1-8', name: 'Chebet Agnes', enrollmentDate: '2023-09-15', trainingCompletion: 95, performanceScore: 89, status: 'GRADUATED', district: 'Mbale' },
]

const MOCK_COHORT_2 = [
  { id: 'c2-1', name: 'Lubega Samuel', enrollmentDate: '2024-01-10', trainingCompletion: 85, performanceScore: 80, status: 'ACTIVE', district: 'Wakiso' },
  { id: 'c2-2', name: 'Aol Betty', enrollmentDate: '2024-01-15', trainingCompletion: 92, performanceScore: 88, status: 'ACTIVE', district: 'Gulu' },
  { id: 'c2-3', name: 'Nabukenya Jane', enrollmentDate: '2024-02-01', trainingCompletion: 78, performanceScore: 75, status: 'ACTIVE', district: 'Mukono' },
  { id: 'c2-4', name: 'Kwesiga Mark', enrollmentDate: '2024-02-15', trainingCompletion: 60, performanceScore: 55, status: 'ACTIVE', district: 'Mbarara' },
  { id: 'c2-5', name: 'Obua Patrick', enrollmentDate: '2024-03-01', trainingCompletion: 95, performanceScore: 91, status: 'ACTIVE', district: 'Lira' },
  { id: 'c2-6', name: 'Nakyejwe Faith', enrollmentDate: '2024-03-15', trainingCompletion: 40, performanceScore: 38, status: 'DROPPED', district: 'Jinja' },
  { id: 'c2-7', name: 'Mugerwa Dennis', enrollmentDate: '2024-04-01', trainingCompletion: 88, performanceScore: 82, status: 'ACTIVE', district: 'Kampala' },
]

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  GRADUATED: { label: 'Graduated', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  ACTIVE: { label: 'Active', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  DROPPED: { label: 'Dropped', class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
}

function CohortTable({ data, search }: { data: any[]; search: string }) {
  const filtered = data.filter((f: any) => f.name.toLowerCase().includes(search.toLowerCase()) || f.district?.toLowerCase().includes(search.toLowerCase()))

  return (
    <Card>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farmer</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Training %</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No farmers found
                  </TableCell>
                </TableRow>
              ) : filtered.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.district}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(f.enrollmentDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={f.trainingCompletion} className="w-16 h-2" />
                      <span className="text-sm">{f.trainingCompletion}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${f.performanceScore >= 80 ? 'text-emerald-600' : f.performanceScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {f.performanceScore}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_CONFIG[f.status]?.class || ''}>{STATUS_CONFIG[f.status]?.label || f.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function getCohortStats(data: any[]) {
  const total = data.length
  const graduated = data.filter((f: any) => f.status === 'GRADUATED').length
  const active = data.filter((f: any) => f.status === 'ACTIVE').length
  const dropped = data.filter((f: any) => f.status === 'DROPPED').length
  const avgTraining = total > 0 ? Math.round(data.reduce((s: number, f: any) => s + f.trainingCompletion, 0) / total) : 0
  const avgPerformance = total > 0 ? Math.round(data.reduce((s: number, f: any) => s + f.performanceScore, 0) / total) : 0
  const graduationRate = total > 0 ? Math.round((graduated / total) * 100) : 0
  return { total, graduated, active, dropped, avgTraining, avgPerformance, graduationRate }
}

export default function CohortsView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [activeTab, setActiveTab] = useState(activeSubTab || 'cohort1')
  const [loading, setLoading] = useState(true)
  const [searchC1, setSearchC1] = useState('')
  const [searchC2, setSearchC2] = useState('')

  const [cohort1, setCohort1] = useState<any[]>([])
  const [cohort2, setCohort2] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([fetch('/api/cohorts/1'), fetch('/api/cohorts/2')])
      if (r1.ok) { const d = await r1.json(); setCohort1(d.farmers || d || []) } else { setCohort1(MOCK_COHORT_1) }
      if (r2.ok) { const d = await r2.json(); setCohort2(d.farmers || d || []) } else { setCohort2(MOCK_COHORT_2) }
    } catch {
      setCohort1(MOCK_COHORT_1)
      setCohort2(MOCK_COHORT_2)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const loadTab = (tab: string) => { setActiveTab(tab); setActiveSubTab(tab) }

  const stats1 = getCohortStats(cohort1)
  const stats2 = getCohortStats(cohort2)

  // Comparison data
  const comparisonData = [
    { metric: 'Total Enrolled', cohort1: stats1.total, cohort2: stats2.total },
    { metric: 'Graduated', cohort1: stats1.graduated, cohort2: stats2.graduated },
    { metric: 'Active', cohort1: stats1.active, cohort2: stats2.active },
    { metric: 'Dropped', cohort1: stats1.dropped, cohort2: stats2.dropped },
    { metric: 'Avg Training %', cohort1: stats1.avgTraining, cohort2: stats2.avgTraining },
    { metric: 'Avg Performance', cohort1: stats1.avgPerformance, cohort2: stats2.avgPerformance },
    { metric: 'Graduation Rate %', cohort1: stats1.graduationRate, cohort2: stats2.graduationRate },
  ]

  // Enrollment timeline
  const enrollmentTimeline = (() => {
    const months: Record<string, { c1: number; c2: number }> = {}
    cohort1.forEach((f: any) => {
      const d = new Date(f.enrollmentDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!months[key]) months[key] = { c1: 0, c2: 0 }
      months[key].c1++
    })
    cohort2.forEach((f: any) => {
      const d = new Date(f.enrollmentDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!months[key]) months[key] = { c1: 0, c2: 0 }
      months[key].c2++
    })
    return Object.entries(months).map(([month, counts]) => ({ month, ...counts }))
  })()

  // Radar chart data
  const radarData = [
    { subject: 'Training', c1: stats1.avgTraining, c2: stats2.avgTraining, fullMark: 100 },
    { subject: 'Performance', c1: stats1.avgPerformance, c2: stats2.avgPerformance, fullMark: 100 },
    { subject: 'Graduation', c1: stats1.graduationRate, c2: stats2.graduationRate, fullMark: 100 },
    { subject: 'Retention', c1: Math.round(((stats1.total - stats1.dropped) / stats1.total) * 100), c2: Math.round(((stats2.total - stats2.dropped) / stats2.total) * 100), fullMark: 100 },
    { subject: 'Engagement', c1: Math.min(stats1.avgTraining + 5, 100), c2: Math.min(stats2.avgTraining + 8, 100), fullMark: 100 },
  ]

  const chartConfig: ChartConfig = {
    cohort1: { label: 'Cohort 1', color: '#059669' },
    cohort2: { label: 'Cohort 2', color: '#f59e0b' },
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={loadTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cohort1">Cohort 1</TabsTrigger>
          <TabsTrigger value="cohort2">Cohort 2</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        {/* Cohort 1 */}
        <TabsContent value="cohort1" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{stats1.total}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-green-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Graduated</p><p className="text-xl font-bold">{stats1.graduated}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-amber-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Avg Performance</p><p className="text-xl font-bold">{stats1.avgPerformance}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
                  <Target className="w-5 h-5 text-teal-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Graduation Rate</p><p className="text-xl font-bold">{stats1.graduationRate}%</p></div>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search Cohort 1 farmers..." className="pl-9" value={searchC1} onChange={e => setSearchC1(e.target.value)} />
          </div>
          <CohortTable data={cohort1} search={searchC1} />
        </TabsContent>

        {/* Cohort 2 */}
        <TabsContent value="cohort2" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{stats2.total}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold">{stats2.active}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-amber-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Avg Performance</p><p className="text-xl font-bold">{stats2.avgPerformance}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                  <Award className="w-5 h-5 text-red-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Dropped</p><p className="text-xl font-bold">{stats2.dropped}</p></div>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search Cohort 2 farmers..." className="pl-9" value={searchC2} onChange={e => setSearchC2(e.target.value)} />
          </div>
          <CohortTable data={cohort2} search={searchC2} />
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          {/* Side by Side Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" /> Cohort 1 (2023)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: 'Enrolled', value: stats1.total },
                  { label: 'Graduated', value: stats1.graduated },
                  { label: 'Active', value: stats1.active },
                  { label: 'Dropped', value: stats1.dropped },
                  { label: 'Avg Training', value: `${stats1.avgTraining}%` },
                  { label: 'Avg Performance', value: stats1.avgPerformance },
                  { label: 'Graduation Rate', value: `${stats1.graduationRate}%` },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-bold">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" /> Cohort 2 (2024)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: 'Enrolled', value: stats2.total },
                  { label: 'Graduated', value: stats2.graduated },
                  { label: 'Active', value: stats2.active },
                  { label: 'Dropped', value: stats2.dropped },
                  { label: 'Avg Training', value: `${stats2.avgTraining}%` },
                  { label: 'Avg Performance', value: stats2.avgPerformance },
                  { label: 'Graduation Rate', value: `${stats2.graduationRate}%` },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-bold">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Comparison Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Side-by-Side Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="cohort1" fill="#059669" radius={[4, 4, 0, 0]} name="Cohort 1" />
                  <Bar dataKey="cohort2" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Cohort 2" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Enrollment Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Enrollment Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <LineChart data={enrollmentTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="stepAfter" dataKey="c1" stroke="#059669" strokeWidth={2} name="Cohort 1" dot={{ r: 3 }} />
                    <Line type="stepAfter" dataKey="c2" stroke="#f59e0b" strokeWidth={2} name="Cohort 2" dot={{ r: 3 }} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Performance Radar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="Cohort 1" dataKey="c1" stroke="#059669" fill="#059669" fillOpacity={0.2} strokeWidth={2} />
                    <Radar name="Cohort 2" dataKey="c2" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
                    <Legend />
                  </RadarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}