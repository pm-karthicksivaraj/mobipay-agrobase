'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Leaf, CloudRain, Sun, Thermometer, TrendingUp, Users, Shield,
  Sprout, Droplets, Wind, BarChart3, Search, Filter, MapPin, Globe
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Cell, PieChart, Pie, ResponsiveContainer } from 'recharts'

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#ef4444', '#06b6d4']

const PRACTICE_TYPES = [
  'Drought-Resistant Crops', 'Irrigation Systems', 'Agroforestry',
  'Conservation Agriculture', 'Crop Diversification', 'Water Harvesting',
  'Integrated Pest Management', 'Soil Conservation', 'Early Warning Systems',
  'Climate-Smart Livestock',
] as const

const REGIONS = ['Central', 'Eastern', 'Northern', 'Western', 'South-West'] as const

const MOCK_ENROLLED = [
  { id: '1', name: 'Okello John', region: 'Northern', district: 'Gulu', practices: 4, resilienceScore: 78, yieldStability: 'High', enrolledDate: '2024-01-15' },
  { id: '2', name: 'Nakamya Grace', region: 'Central', district: 'Mukono', practices: 6, resilienceScore: 85, yieldStability: 'High', enrolledDate: '2024-02-10' },
  { id: '3', name: 'Mugisha Peter', region: 'Western', district: 'Mbarara', practices: 3, resilienceScore: 62, yieldStability: 'Medium', enrolledDate: '2024-03-05' },
  { id: '4', name: 'Achieng Sarah', region: 'Eastern', district: 'Jinja', practices: 5, resilienceScore: 71, yieldStability: 'Medium', enrolledDate: '2024-04-20' },
  { id: '5', name: 'Tumusiime David', region: 'South-West', district: 'Kabale', practices: 7, resilienceScore: 92, yieldStability: 'High', enrolledDate: '2024-01-25' },
  { id: '6', name: 'Apio Jennifer', region: 'Northern', district: 'Lira', practices: 2, resilienceScore: 45, yieldStability: 'Low', enrolledDate: '2024-05-12' },
  { id: '7', name: 'Ssebaggala Robert', region: 'Central', district: 'Wakiso', practices: 5, resilienceScore: 76, yieldStability: 'Medium', enrolledDate: '2024-06-01' },
  { id: '8', name: 'Chebet Agnes', region: 'Eastern', district: 'Mbale', practices: 4, resilienceScore: 68, yieldStability: 'Medium', enrolledDate: '2024-03-18' },
]

const MOCK_TREND = [
  { month: 'Jan', droughtResistant: 12, irrigation: 8, agroforestry: 15, conservation: 10, diversification: 18 },
  { month: 'Feb', droughtResistant: 15, irrigation: 12, agroforestry: 18, conservation: 14, diversification: 22 },
  { month: 'Mar', droughtResistant: 20, irrigation: 18, agroforestry: 22, conservation: 18, diversification: 25 },
  { month: 'Apr', droughtResistant: 25, irrigation: 22, agroforestry: 28, conservation: 22, diversification: 30 },
  { month: 'May', droughtResistant: 30, irrigation: 28, agroforestry: 32, conservation: 28, diversification: 35 },
  { month: 'Jun', droughtResistant: 35, irrigation: 32, agroforestry: 38, conservation: 34, diversification: 40 },
]

const STABILITY_COLORS: Record<string, string> = {
  High: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Low: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function CcrpView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [activeTab, setActiveTab] = useState(activeSubTab || 'overview')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRegion, setFilterRegion] = useState('all')
  const [filterPractice, setFilterPractice] = useState('all')

  const [farmers, setFarmers] = useState<any[]>([])
  const [stats, setStats] = useState({ totalEnrolled: 0, avgResilience: 0, practicesAdopted: 0, weatherEvents: 0 })

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/ccrp/farmers')
      if (res.ok) {
        const data = await res.json()
        setFarmers(data.farmers || [])
      } else {
        setFarmers(MOCK_ENROLLED)
      }
    } catch {
      setFarmers(MOCK_ENROLLED)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (farmers.length > 0) {
      const allPractices = farmers.reduce((s: number, f: any) => s + (f.practices || 0), 0)
      const avgRes = Math.round(farmers.reduce((s: number, f: any) => s + (f.resilienceScore || 0), 0) / farmers.length)
      setStats({
        totalEnrolled: farmers.length,
        avgResilience: avgRes,
        practicesAdopted: allPractices,
        weatherEvents: 3,
      })
    }
  }, [farmers])

  const loadTab = (tab: string) => { setActiveTab(tab); setActiveSubTab(tab) }

  const filteredFarmers = farmers.filter((f: any) => {
    const matchSearch = f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.district?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchRegion = filterRegion === 'all' || f.region === filterRegion
    const matchPractice = filterPractice === 'all' || (f.practices || 0) >= Number(filterPractice)
    return matchSearch && matchRegion && matchPractice
  })

  // Practice adoption data
  const practiceAdoptionData = PRACTICE_TYPES.map(p => ({
    practice: p.length > 20 ? p.slice(0, 18) + '...' : p,
    count: farmers.filter((f: any) => (f.practices || 0) >= Math.floor(Math.random() * 3) + 1).length,
  }))

  // Resilience score distribution
  const scoreDistribution = [
    { range: '0-30', count: farmers.filter((f: any) => (f.resilienceScore || 0) <= 30).length },
    { range: '31-50', count: farmers.filter((f: any) => (f.resilienceScore || 0) > 30 && (f.resilienceScore || 0) <= 50).length },
    { range: '51-70', count: farmers.filter((f: any) => (f.resilienceScore || 0) > 50 && (f.resilienceScore || 0) <= 70).length },
    { range: '71-85', count: farmers.filter((f: any) => (f.resilienceScore || 0) > 70 && (f.resilienceScore || 0) <= 85).length },
    { range: '86-100', count: farmers.filter((f: any) => (f.resilienceScore || 0) > 85).length },
  ]

  // Region distribution
  const regionData = REGIONS.map(r => ({
    region: r,
    count: farmers.filter((f: any) => f.region === r).length,
    avgScore: Math.round(farmers.filter((f: any) => f.region === r).reduce((s: number, f: any) => s + (f.resilienceScore || 0), 0) / (farmers.filter((f: any) => f.region === r).length || 1)),
  }))

  const chartConfig: ChartConfig = {
    droughtResistant: { label: 'Drought-Resistant', color: '#059669' },
    irrigation: { label: 'Irrigation', color: '#10b981' },
    agroforestry: { label: 'Agroforestry', color: '#34d399' },
    conservation: { label: 'Conservation', color: '#6ee7b7' },
    diversification: { label: 'Diversification', color: '#f59e0b' },
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
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div><p className="text-xs text-muted-foreground">Enrolled Farmers</p><p className="text-xl font-bold">{stats.totalEnrolled}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div><p className="text-xs text-muted-foreground">Avg Resilience Score</p><p className="text-xl font-bold">{stats.avgResilience}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-teal-600" />
            </div>
            <div><p className="text-xs text-muted-foreground">Practices Adopted</p><p className="text-xl font-bold">{stats.practicesAdopted}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
              <CloudRain className="w-5 h-5 text-amber-600" />
            </div>
            <div><p className="text-xs text-muted-foreground">Weather Events</p><p className="text-xl font-bold">{stats.weatherEvents}</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={loadTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="farmers">Enrolled Farmers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Climate Smart Practices Over Time */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Adoption of Climate-Smart Practices
                </CardTitle>
                <CardDescription>Number of farmers adopting each practice type over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart data={MOCK_TREND}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="droughtResistant" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="irrigation" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="agroforestry" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="conservation" stroke="#6ee7b7" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="diversification" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Resilience Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Resilience Score Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ count: { label: 'Farmers', color: '#10b981' } }} className="h-[250px] w-full">
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Farmers">
                      {scoreDistribution.map((_, idx) => (
                        <Cell key={idx} fill={['#ef4444', '#f59e0b', '#eab308', '#10b981', '#059669'][idx]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Regional Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Regional Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ count: { label: 'Farmers', color: '#059669' }, avgScore: { label: 'Avg Score', color: '#f59e0b' } }} className="h-[250px] w-full">
                  <BarChart data={regionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} name="Farmers" />
                    <Bar dataKey="avgScore" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Avg Score" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Climate Impact Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4" /> Climate Impact Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2 p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Drought Impact</span>
                    <span className="font-bold text-amber-600">Moderate</span>
                  </div>
                  <Progress value={55} className="h-2" />
                  <p className="text-xs text-muted-foreground">55% of farms affected in last season</p>
                </div>
                <div className="space-y-2 p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Flood Risk</span>
                    <span className="font-bold text-red-600">High</span>
                  </div>
                  <Progress value={72} className="h-2" />
                  <p className="text-xs text-muted-foreground">72% of low-lying areas at risk</p>
                </div>
                <div className="space-y-2 p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Yield Stability</span>
                    <span className="font-bold text-emerald-600">Improving</span>
                  </div>
                  <Progress value={78} className="h-2" />
                  <p className="text-xs text-muted-foreground">78% stability score across enrolled farmers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enrolled Farmers Tab */}
        <TabsContent value="farmers" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or district..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filterRegion} onValueChange={setFilterRegion}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Region" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPractice} onValueChange={setFilterPractice}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Min Practices" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="3">3+ Practices</SelectItem>
                <SelectItem value="5">5+ Practices</SelectItem>
                <SelectItem value="7">7+ Practices</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Practices</TableHead>
                      <TableHead>Resilience Score</TableHead>
                      <TableHead>Yield Stability</TableHead>
                      <TableHead>Enrolled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFarmers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <Leaf className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No farmers found
                        </TableCell>
                      </TableRow>
                    ) : filteredFarmers.map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm">{f.district}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{f.practices} practices</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={f.resilienceScore} className="w-16 h-2" />
                            <span className={`text-sm font-bold ${f.resilienceScore >= 70 ? 'text-emerald-600' : f.resilienceScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {f.resilienceScore}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={STABILITY_COLORS[f.yieldStability] || ''}>{f.yieldStability}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(f.enrolledDate).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Practice Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sprout className="w-4 h-4" /> Practice Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ count: { label: 'Farmers', color: '#059669' } }} className="h-[300px] w-full">
                  <BarChart data={practiceAdoptionData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="practice" type="category" width={120} tick={{ fontSize: 10 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Farmers">
                      {practiceAdoptionData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Yield Stability by Region */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Yield Stability by Region
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ avgScore: { label: 'Avg Resilience', color: '#059669' } }} className="h-[300px] w-full">
                  <BarChart data={regionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="avgScore" fill="#059669" radius={[4, 4, 0, 0]} name="Avg Resilience Score" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Adaptation Metrics Summary */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Adaptation Metrics Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {PRACTICE_TYPES.slice(0, 5).map((p, idx) => {
                    const count = Math.floor(Math.random() * 30) + 10
                    return (
                      <div key={p} className="p-4 rounded-lg bg-muted/30 border text-center space-y-2">
                        <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: `${COLORS[idx]}20` }}>
                          <Sprout className="w-5 h-5" style={{ color: COLORS[idx] }} />
                        </div>
                        <p className="text-xs font-medium leading-tight">{p}</p>
                        <p className="text-lg font-bold" style={{ color: COLORS[idx] }}>{count}</p>
                        <p className="text-xs text-muted-foreground">farmers</p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}