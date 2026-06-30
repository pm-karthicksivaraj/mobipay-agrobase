'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Calculator, Sprout, DollarSign, TrendingUp, ArrowLeft, Eye, Loader2,
  Ruler, FlaskConical, Calendar, MapPin, PiggyBank, Award
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts'

interface Cultivation {
  id: string
  cropName: string
  variety?: string | null
  season?: string | null
  cultivationAreaHa?: number | null
  seedCost?: number | null
  sowingCost?: number | null
  estimatedYield?: number | null
  actualYield?: number | null
  status: string
  createdAt: string
  farm?: { id: string; name: string; farmer?: { id: string; firstName: string; lastName: string } }
}

export default function CostOfCultivationView() {
  const [cultivations, setCultivations] = useState<Cultivation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [selected, setSelected] = useState<Cultivation | null>(null)

  const fetchCultivations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cultivations')
      const data = await res.json()
      setCultivations(data.cultivations || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCultivations() }, [fetchCultivations])

  // Stats
  const totalArea = cultivations.reduce((s, c) => s + (c.cultivationAreaHa || 0), 0)
  const totalSeedCost = cultivations.reduce((s, c) => s + (c.seedCost || 0), 0)
  const totalSowingCost = cultivations.reduce((s, c) => s + (c.sowingCost || 0), 0)
  const totalCost = totalSeedCost + totalSowingCost
  const avgCostPerHa = totalArea > 0 ? totalCost / totalArea : 0

  // Cost per crop (aggregated)
  const byCrop = cultivations.reduce((acc, c) => {
    const k = c.cropName
    if (!acc[k]) acc[k] = { crop: k, count: 0, area: 0, seedCost: 0, sowingCost: 0, totalCost: 0 }
    acc[k].count += 1
    acc[k].area += c.cultivationAreaHa || 0
    acc[k].seedCost += c.seedCost || 0
    acc[k].sowingCost += c.sowingCost || 0
    acc[k].totalCost += (c.seedCost || 0) + (c.sowingCost || 0)
    return acc
  }, {} as Record<string, { crop: string; count: number; area: number; seedCost: number; sowingCost: number; totalCost: number }>)
  const cropCostData: Array<{ crop: string; count: number; area: number; Seed: number; Sowing: number; total: number; costPerHa: number }> = Object.values(byCrop).map((d) => ({
    crop: d.crop,
    count: d.count,
    area: d.area,
    Seed: Math.round(d.seedCost),
    Sowing: Math.round(d.sowingCost),
    total: d.totalCost,
    costPerHa: d.area > 0 ? Math.round(d.totalCost / d.area) : 0,
  }))

  if (selected) {
    return <CultivationCostDetail cultivation={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2"><Calculator className="w-5 h-5 text-amber-600" /> Cost of Cultivation</h3>
        <p className="text-sm text-muted-foreground">Per-cultivation cost breakdown · auto-calculated from seed & sowing inputs · Excel-aligned formulas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"><Sprout className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Cultivations</p><p className="text-lg font-bold">{cultivations.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center"><Ruler className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">Total Area</p><p className="text-lg font-bold">{totalArea.toFixed(2)} ha</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center"><DollarSign className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-muted-foreground">Seed Cost</p><p className="text-sm font-bold">UGX {(totalSeedCost / 1000).toFixed(0)}K</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center"><DollarSign className="w-5 h-5 text-purple-600" /></div><div><p className="text-xs text-muted-foreground">Sowing Cost</p><p className="text-sm font-bold">UGX {(totalSowingCost / 1000).toFixed(0)}K</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-pink-600" /></div><div><p className="text-xs text-muted-foreground">Avg Cost / ha</p><p className="text-sm font-bold">UGX {(avgCostPerHa / 1000).toFixed(0)}K</p></div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-crop">By Crop</TabsTrigger>
          <TabsTrigger value="all">All Cultivations</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Cost Breakdown by Crop</CardTitle></CardHeader>
              <CardContent>
                {cropCostData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={cropCostData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="crop" fontSize={10} />
                      <YAxis fontSize={10} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: any) => `UGX ${Number(v).toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="Seed" stackId="a" fill="#10b981" />
                      <Bar dataKey="Sowing" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-sm text-muted-foreground py-8">No data</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Cost per Hectare by Crop</CardTitle></CardHeader>
              <CardContent>
                {cropCostData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={cropCostData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={10} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="crop" fontSize={10} width={70} />
                      <Tooltip formatter={(v: any) => `UGX ${Number(v).toLocaleString()} / ha`} />
                      <Bar dataKey="costPerHa" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-sm text-muted-foreground py-8">No data</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Cost Calculation Formulas (Excel-Aligned)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">Seed Cost</p>
                  <p className="text-xs text-muted-foreground mt-1">seedCost = seedQuantity × seedPrice</p>
                  <p className="text-xs text-muted-foreground">Per kg quantity × per kg price → total seed spend.</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <p className="font-semibold text-purple-700 dark:text-purple-300">Sowing Cost (hectare)</p>
                  <p className="text-xs text-muted-foreground mt-1">sowingCost = cultivationAreaHa × sowingCharges</p>
                  <p className="text-xs text-muted-foreground">When charges are quoted per hectare.</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="font-semibold text-amber-700 dark:text-amber-300">Sowing Cost (hour)</p>
                  <p className="text-xs text-muted-foreground mt-1">sowingCost = sowingHours × sowingCharges</p>
                  <p className="text-xs text-muted-foreground">When charges are quoted per hour (tractor, drone).</p>
                </div>
                <div className="p-3 rounded-lg bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800">
                  <p className="font-semibold text-pink-700 dark:text-pink-300">Cost per Hectare</p>
                  <p className="text-xs text-muted-foreground mt-1">costPerHa = totalCost / cultivationAreaHa</p>
                  <p className="text-xs text-muted-foreground">Total cost (seed + sowing) divided by cultivated area.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Crop */}
        <TabsContent value="by-crop" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crop</TableHead>
                    <TableHead className="text-right">Cultivations</TableHead>
                    <TableHead className="text-right">Area (ha)</TableHead>
                    <TableHead className="text-right">Seed Cost</TableHead>
                    <TableHead className="text-right">Sowing Cost</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Cost/ha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cropCostData.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No cultivations yet</TableCell></TableRow>
                  ) : cropCostData.map(d => (
                    <TableRow key={d.crop}>
                      <TableCell className="font-medium text-sm">{d.crop}</TableCell>
                      <TableCell className="text-right text-sm">{d.count}</TableCell>
                      <TableCell className="text-right text-sm">{d.area.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm">{d.Seed ? `UGX ${d.Seed.toLocaleString()}` : '—'}</TableCell>
                      <TableCell className="text-right text-sm">{d.Sowing ? `UGX ${d.Sowing.toLocaleString()}` : '—'}</TableCell>
                      <TableCell className="text-right text-sm font-bold">UGX {d.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{d.costPerHa ? `UGX ${d.costPerHa.toLocaleString()}` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Cultivations */}
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
              ) : cultivations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Sprout className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="font-medium">No cultivations yet</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crop</TableHead>
                      <TableHead>Farm</TableHead>
                      <TableHead className="hidden md:table-cell">Season</TableHead>
                      <TableHead className="text-right">Area (ha)</TableHead>
                      <TableHead className="text-right">Seed</TableHead>
                      <TableHead className="text-right">Sowing</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cultivations.map(c => {
                      const total = (c.seedCost || 0) + (c.sowingCost || 0)
                      return (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(c)}>
                          <TableCell className="font-medium text-sm">{c.cropName}</TableCell>
                          <TableCell className="text-sm">{c.farm?.name || '—'}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{c.season || '—'}</TableCell>
                          <TableCell className="text-right text-sm">{c.cultivationAreaHa?.toFixed(2) ?? '—'}</TableCell>
                          <TableCell className="text-right text-sm">{c.seedCost ? `UGX ${c.seedCost.toLocaleString()}` : '—'}</TableCell>
                          <TableCell className="text-right text-sm">{c.sowingCost ? `UGX ${c.sowingCost.toLocaleString()}` : '—'}</TableCell>
                          <TableCell className="text-right text-sm font-bold">UGX {total.toLocaleString()}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button></TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CultivationCostDetail({ cultivation, onBack }: { cultivation: Cultivation; onBack: () => void }) {
  const total = (cultivation.seedCost || 0) + (cultivation.sowingCost || 0)
  const area = cultivation.cultivationAreaHa || 0
  const costPerHa = area > 0 ? total / area : 0
  const yieldAmount = cultivation.actualYield || cultivation.estimatedYield || 0
  const costPerKg = yieldAmount > 0 ? total / yieldAmount : 0
  const revenuePerKg = 3500 // sample coffee price
  const revenue = yieldAmount * revenuePerKg
  const profit = revenue - total
  const profitPerHa = area > 0 ? profit / area : 0

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0"><Sprout className="w-7 h-7 text-emerald-600" /></div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{cultivation.cropName}{cultivation.variety ? ` — ${cultivation.variety}` : ''}</h2>
              <p className="text-sm text-muted-foreground">
                {cultivation.farm?.name || 'Unknown farm'}
                {cultivation.farm?.farmer ? ` · ${cultivation.farm.farmer.firstName} ${cultivation.farm.farmer.lastName}` : ''}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{cultivation.season || 'No season'}</Badge>
                <Badge variant="outline">{cultivation.status}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><Ruler className="w-5 h-5 mx-auto text-blue-600 mb-1" /><p className="text-xs text-muted-foreground">Area</p><p className="text-lg font-bold">{area.toFixed(2)} ha</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><DollarSign className="w-5 h-5 mx-auto text-amber-600 mb-1" /><p className="text-xs text-muted-foreground">Total Cost</p><p className="text-sm font-bold">UGX {total.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="w-5 h-5 mx-auto text-purple-600 mb-1" /><p className="text-xs text-muted-foreground">Cost / ha</p><p className="text-sm font-bold">UGX {costPerHa.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Award className="w-5 h-5 mx-auto text-emerald-600 mb-1" /><p className="text-xs text-muted-foreground">Yield</p><p className="text-sm font-bold">{yieldAmount} kg</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Cost Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <CostRow label="Seed Cost (qty × price)" amount={cultivation.seedCost || 0} color="emerald" />
            <CostRow label="Sowing Cost (area × charges)" amount={cultivation.sowingCost || 0} color="purple" />
            <Separator />
            <CostRow label="Total Cost" amount={total} color="amber" bold />
            <CostRow label="Cost per Hectare" amount={costPerHa} color="pink" bold />
            {yieldAmount > 0 && <CostRow label="Cost per kg of yield" amount={costPerKg} color="blue" bold />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Profitability Projection</CardTitle><CardDescription>Using sample farmgate price of UGX 3,500/kg</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs text-muted-foreground">Expected Revenue</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">UGX {revenue.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">UGX {total.toLocaleString()}</p>
            </div>
            <div className={cn('p-3 rounded-lg border', profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800')}>
              <p className="text-xs text-muted-foreground">{profit >= 0 ? 'Net Profit' : 'Net Loss'}</p>
              <p className={cn('text-lg font-bold', profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300')}>UGX {profit.toLocaleString()}</p>
              {area > 0 && <p className="text-xs text-muted-foreground mt-1">UGX {profitPerHa.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ha</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CostRow({ label, amount, color, bold }: { label: string; amount: number; color: string; bold?: boolean }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-700 dark:text-emerald-300',
    purple: 'text-purple-700 dark:text-purple-300',
    amber: 'text-amber-700 dark:text-amber-300',
    pink: 'text-pink-700 dark:text-pink-300',
    blue: 'text-blue-700 dark:text-blue-300',
  }
  return (
    <div className="flex items-center justify-between">
      <span className={cn('text-sm', bold ? 'font-semibold' : 'text-muted-foreground')}>{label}</span>
      <span className={cn(bold ? 'text-base font-bold' : 'text-sm font-medium', colorMap[color])}>
        UGX {amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </span>
    </div>
  )
}
