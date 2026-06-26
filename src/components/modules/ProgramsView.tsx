'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import {
  BarChart3, Download, Target, Users, DollarSign, CheckCircle, Clock,
  MapPin, FileText, TrendingUp, AlertCircle, Activity, Calendar, Flag,
  Eye, Loader2, Milestone, ClipboardList, Wallet
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Cell, PieChart, Pie } from 'recharts'

const COLORS = ['#059669', '#10b981', '#34d399', '#f59e0b', '#ef4444']

// SMILE Program Mock Data
const SMILE_KPIS = [
  { id: 'kpi-1', name: 'Beneficiaries Enrolled', target: 500, current: 342, unit: 'people' },
  { id: 'kpi-2', name: 'Trainings Conducted', target: 24, current: 18, unit: 'sessions' },
  { id: 'kpi-3', name: 'Farmers with Improved Yield', target: 300, current: 210, unit: 'farmers' },
  { id: 'kpi-4', name: 'Income Increase > 30%', target: 200, current: 145, unit: 'farmers' },
  { id: 'kpi-5', name: 'VSLA Groups Formed', target: 20, current: 15, unit: 'groups' },
  { id: 'kpi-6', name: 'Market Linkages Created', target: 50, current: 32, unit: 'linkages' },
]

const SMILE_BENEFICIARIES = [
  { id: 's1', name: 'Okello John', district: 'Gulu', status: 'Active', enrolledDate: '2024-01-15', incomeChange: '+35%', yieldChange: '+42%', trainingsAttended: 8 },
  { id: 's2', name: 'Nakamya Grace', district: 'Mukono', status: 'Active', enrolledDate: '2024-02-10', incomeChange: '+28%', yieldChange: '+38%', trainingsAttended: 6 },
  { id: 's3', name: 'Mugisha Peter', district: 'Mbarara', status: 'Active', enrolledDate: '2024-03-05', incomeChange: '+15%', yieldChange: '+20%', trainingsAttended: 4 },
  { id: 's4', name: 'Achieng Sarah', district: 'Jinja', status: 'Graduated', enrolledDate: '2024-01-25', incomeChange: '+45%', yieldChange: '+52%', trainingsAttended: 12 },
  { id: 's5', name: 'Tumusiime David', district: 'Kabale', status: 'Active', enrolledDate: '2024-04-20', incomeChange: '+32%', yieldChange: '+29%', trainingsAttended: 7 },
  { id: 's6', name: 'Apio Jennifer', district: 'Lira', status: 'At Risk', enrolledDate: '2024-05-12', incomeChange: '+5%', yieldChange: '+8%', trainingsAttended: 2 },
]

const SMILE_PROGRESS_MONTHLY = [
  { month: 'Jan', enrolled: 50, trained: 3, yieldImproved: 30 },
  { month: 'Feb', enrolled: 95, trained: 6, yieldImproved: 55 },
  { month: 'Mar', enrolled: 140, trained: 9, yieldImproved: 85 },
  { month: 'Apr', enrolled: 195, trained: 12, yieldImproved: 120 },
  { month: 'May', enrolled: 260, trained: 15, yieldImproved: 165 },
  { month: 'Jun', enrolled: 342, trained: 18, yieldImproved: 210 },
]

// Nakivaale Project Mock Data
const NAKIVAALE_MILESTONES = [
  { id: 'm1', name: 'Project Kickoff & Baseline Survey', status: 'COMPLETED', dueDate: '2024-02-28', completionDate: '2024-02-20', budget: 5000000, actual: 4800000 },
  { id: 'm2', name: 'Farmer Registration & Onboarding', status: 'COMPLETED', dueDate: '2024-04-30', completionDate: '2024-04-25', budget: 8000000, actual: 7500000 },
  { id: 'm3', name: 'Input Distribution (Seeds & Fertilizers)', status: 'COMPLETED', dueDate: '2024-06-30', completionDate: '2024-07-05', budget: 15000000, actual: 16200000 },
  { id: 'm4', name: 'Training Program Delivery', status: 'IN_PROGRESS', dueDate: '2024-09-30', completionDate: null, budget: 12000000, actual: 8500000 },
  { id: 'm5', name: 'Market Access & Linkages', status: 'NOT_STARTED', dueDate: '2024-11-30', completionDate: null, budget: 7000000, actual: 0 },
  { id: 'm6', name: 'Final Evaluation & Reporting', status: 'NOT_STARTED', dueDate: '2025-01-31', completionDate: null, budget: 5000000, actual: 0 },
]

const NAKIVAALE_ACTIVITIES = [
  { id: 'a1', date: '2024-07-15', description: 'Distributed 200kg of improved maize seeds to 50 farmers', type: 'Distribution', by: 'Sarah M.' },
  { id: 'a2', date: '2024-07-12', description: 'Conducted post-harvest handling training for 30 farmers', type: 'Training', by: 'David K.' },
  { id: 'a3', date: '2024-07-08', description: 'Soil testing completed for 45 farm plots', type: 'Assessment', by: 'James O.' },
  { id: 'a4', date: '2024-07-05', description: 'VSLA group formation meeting with 25 refugees', type: 'Meeting', by: 'Grace N.' },
  { id: 'a5', date: '2024-06-28', description: 'Progress review meeting with UNHCR representatives', type: 'Meeting', by: 'Project Manager' },
  { id: 'a6', date: '2024-06-20', description: 'Pest management training using IPM techniques', type: 'Training', by: 'Robert S.' },
]

const NAKIVAALE_BUDGET = [
  { category: 'Personnel', budget: 20000000, actual: 18500000 },
  { category: 'Inputs', budget: 15000000, actual: 16200000 },
  { category: 'Training', budget: 12000000, actual: 8500000 },
  { category: 'Logistics', budget: 8000000, actual: 7200000 },
  { category: 'Monitoring', budget: 5000000, actual: 4500000 },
  { category: 'Admin', budget: 3000000, actual: 2800000 },
]

const MILESTONE_STATUS: Record<string, { label: string; class: string }> = {
  COMPLETED: { label: 'Completed', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  IN_PROGRESS: { label: 'In Progress', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  NOT_STARTED: { label: 'Not Started', class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  DELAYED: { label: 'Delayed', class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
}

const BENEFICIARY_STATUS: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Graduated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'At Risk': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  Distribution: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Training: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Assessment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Meeting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

const REPORTS = [
  { id: 'r1', program: 'SMILE', name: 'Q2 2024 Progress Report', type: 'Quarterly', date: '2024-07-01', size: '2.4 MB' },
  { id: 'r2', program: 'SMILE', name: 'Beneficiary Impact Assessment', type: 'Assessment', date: '2024-06-15', size: '5.1 MB' },
  { id: 'r3', program: 'Nakivaale', name: 'Mid-Term Review Report', type: 'Review', date: '2024-07-10', size: '3.8 MB' },
  { id: 'r4', program: 'Nakivaale', name: 'Budget Variance Analysis', type: 'Financial', date: '2024-06-30', size: '1.2 MB' },
  { id: 'r5', program: 'SMILE', name: 'Annual Donor Report 2023', type: 'Annual', date: '2024-01-15', size: '8.7 MB' },
  { id: 'r6', program: 'Nakivaale', name: 'Refugee Farmer Survey Results', type: 'Survey', date: '2024-05-20', size: '4.3 MB' },
]

function formatCurrency(amount: number): string {
  return `UGX ${(amount / 1000000).toFixed(1)}M`
}

export default function ProgramsView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [activeTab, setActiveTab] = useState(activeSubTab || 'smile')
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<any>(null)
  const [reportDetail, setReportDetail] = useState<any>(null)
  const [reportOpen, setReportOpen] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      await Promise.all([fetch('/api/programs/smile'), fetch('/api/programs/nakivaale')])
    } catch { /* use mock data */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const loadTab = (tab: string) => { setActiveTab(tab); setActiveSubTab(tab) }

  const smileTotalBeneficiaries = SMILE_BENEFICIARIES.length
  const smileAvgIncome = Math.round(SMILE_BENEFICIARIES.reduce((s: number, b: any) => {
    const val = parseInt(b.incomeChange) || 0
    return s + val
  }, 0) / SMILE_BENEFICIARIES.length)
  const smileAvgYield = Math.round(SMILE_BENEFICIARIES.reduce((s: number, b: any) => {
    const val = parseInt(b.yieldChange) || 0
    return s + val
  }, 0) / SMILE_BENEFICIARIES.length)
  const smileTotalTrainings = SMILE_BENEFICIARIES.reduce((s: number, b: any) => s + (b.trainingsAttended || 0), 0)

  const nakaTotalBudget = NAKIVAALE_BUDGET.reduce((s: number, b: any) => s + b.budget, 0)
  const nakaTotalActual = NAKIVAALE_BUDGET.reduce((s: number, b: any) => s + b.actual, 0)
  const nakaCompleted = NAKIVAALE_MILESTONES.filter(m => m.status === 'COMPLETED').length
  const nakaInProgress = NAKIVAALE_MILESTONES.filter(m => m.status === 'IN_PROGRESS').length

  const smileChartConfig: ChartConfig = {
    enrolled: { label: 'Enrolled', color: '#059669' },
    trained: { label: 'Trainings', color: '#10b981' },
    yieldImproved: { label: 'Yield Improved', color: '#f59e0b' },
  }

  const budgetChartConfig: ChartConfig = {
    budget: { label: 'Budget', color: '#059669' },
    actual: { label: 'Actual', color: '#f59e0b' },
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
          <TabsTrigger value="smile" className="gap-1.5"><Activity className="w-3.5 h-3.5" /> SMILE Program</TabsTrigger>
          <TabsTrigger value="nakivaale" className="gap-1.5"><MapPin className="w-3.5 h-3.5" /> Nakivaale Project</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Reports</TabsTrigger>
        </TabsList>

        {/* ==================== SMILE PROGRAM ==================== */}
        <TabsContent value="smile" className="space-y-4">
          {/* KPI Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Beneficiaries</p><p className="text-xl font-bold">{smileTotalBeneficiaries}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Avg Income Change</p><p className="text-xl font-bold">+{smileAvgIncome}%</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                  <Target className="w-5 h-5 text-amber-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Avg Yield Change</p><p className="text-xl font-bold">+{smileAvgYield}%</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-teal-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Total Trainings</p><p className="text-xl font-bold">{smileTotalTrainings}</p></div>
              </CardContent>
            </Card>
          </div>

          {/* KPI Progress Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" /> KPI Dashboard — Progress Against Targets
              </CardTitle>
              <CardDescription>Monitoring, evaluation, and reporting indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SMILE_KPIS.map(kpi => {
                  const pct = Math.round((kpi.current / kpi.target) * 100)
                  return (
                    <div key={kpi.id} className="p-4 rounded-lg bg-muted/30 border space-y-2">
                      <p className="text-sm font-medium truncate">{kpi.name}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{kpi.current} / {kpi.target} {kpi.unit}</span>
                        <span className={`font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {pct}%
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Monthly Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={smileChartConfig} className="h-[300px] w-full">
                <LineChart data={SMILE_PROGRESS_MONTHLY}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="enrolled" stroke="#059669" strokeWidth={2} name="Enrolled" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="trained" stroke="#10b981" strokeWidth={2} name="Trainings (x10)" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="yieldImproved" stroke="#f59e0b" strokeWidth={2} name="Yield Improved" dot={{ r: 4 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Beneficiary Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Beneficiary Tracking</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Income</TableHead>
                      <TableHead>Yield</TableHead>
                      <TableHead>Trainings</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SMILE_BENEFICIARIES.map(b => (
                      <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedBeneficiary(b); setDetailOpen(true) }}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.district}</TableCell>
                        <TableCell><Badge className={BENEFICIARY_STATUS[b.status] || ''}>{b.status}</Badge></TableCell>
                        <TableCell className="text-sm font-medium text-emerald-600">{b.incomeChange}</TableCell>
                        <TableCell className="text-sm font-medium text-emerald-600">{b.yieldChange}</TableCell>
                        <TableCell className="text-sm">{b.trainingsAttended}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedBeneficiary(b); setDetailOpen(true) }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== NAKIVAALE PROJECT ==================== */}
        <TabsContent value="nakivaale" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <Flag className="w-5 h-5 text-emerald-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Milestones</p><p className="text-xl font-bold">{NAKIVAALE_MILESTONES.length}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Completed</p><p className="text-xl font-bold">{nakaCompleted}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Budget Used</p><p className="text-xl font-bold">{formatCurrency(nakaTotalActual)}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-teal-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Total Budget</p><p className="text-xl font-bold">{formatCurrency(nakaTotalBudget)}</p></div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Milestones */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Milestone className="w-4 h-4" /> Project Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6 space-y-4 border-l-2 border-emerald-200 dark:border-emerald-800 ml-2">
                  {NAKIVAALE_MILESTONES.map(m => {
                    const sc = MILESTONE_STATUS[m.status] || MILESTONE_STATUS.NOT_STARTED
                    return (
                      <div key={m.id} className="relative">
                        <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-background ${
                          m.status === 'COMPLETED' ? 'bg-emerald-500' : m.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`} />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{m.name}</span>
                            <Badge className={sc.class}>{sc.label}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Due: {new Date(m.dueDate).toLocaleDateString()}</span>
                            {m.completionDate && <span>Done: {new Date(m.completionDate).toLocaleDateString()}</span>}
                          </div>
                          <div className="flex gap-4 text-xs">
                            <span>Budget: {formatCurrency(m.budget)}</span>
                            <span className={m.actual > m.budget ? 'text-red-600 font-medium' : 'text-emerald-600'}>
                              Actual: {formatCurrency(m.actual)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Budget vs Actual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Budget vs Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={budgetChartConfig} className="h-[300px] w-full">
                  <BarChart data={NAKIVAALE_BUDGET} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}M`} />
                    <YAxis dataKey="category" type="category" width={80} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="budget" fill="#059669" radius={[0, 4, 4, 0]} name="Budget" />
                    <Bar dataKey="actual" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Actual" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Beneficiary Map Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Beneficiary Map — Nakivaale Settlement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border-2 border-dashed border-emerald-300 dark:border-emerald-700 flex flex-col items-center justify-center gap-2">
                <MapPin className="w-8 h-8 text-emerald-300 dark:text-emerald-700" />
                <p className="text-sm text-muted-foreground">Interactive map placeholder</p>
                <p className="text-xs text-muted-foreground">Showing {smileTotalBeneficiaries} beneficiaries across Nakivaale settlement</p>
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {NAKIVAALE_ACTIVITIES.map(a => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-muted-foreground">{new Date(a.date).toLocaleDateString()}</span>
                        <Badge className={ACTIVITY_TYPE_COLORS[a.type] || ''}>{a.type}</Badge>
                        <span className="text-xs text-muted-foreground">by {a.by}</span>
                      </div>
                      <p className="text-sm">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== REPORTS TAB ==================== */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <h3 className="text-lg font-semibold flex-1">Generated Reports</h3>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => toast.info('Report generation coming soon')}>
                <FileText className="w-4 h-4" /> Generate New
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {REPORTS.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No reports generated yet
                        </TableCell>
                      </TableRow>
                    ) : REPORTS.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={r.program === 'SMILE' ? 'border-emerald-300 text-emerald-700' : 'border-amber-300 text-amber-700'}>
                            {r.program}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{r.type}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(r.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.size}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setReportDetail(r); setReportOpen(true) }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => toast.info(`Downloading ${r.name}... (placeholder)`)}>
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Reports by Program Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Reports by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: 'Reports', color: '#059669' } }} className="h-[250px] w-full">
                <BarChart data={(() => {
                  const types: Record<string, number> = {}
                  REPORTS.forEach(r => { types[r.type] = (types[r.type] || 0) + 1 })
                  return Object.entries(types).map(([type, count]) => ({ type, count }))
                })()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} name="Reports">
                    {REPORTS.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Beneficiary Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Beneficiary Detail</DialogTitle></DialogHeader>
          {selectedBeneficiary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{selectedBeneficiary.name}</span></div>
                <div><span className="text-muted-foreground">District:</span> {selectedBeneficiary.district}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={BENEFICIARY_STATUS[selectedBeneficiary.status]}>{selectedBeneficiary.status}</Badge></div>
                <div><span className="text-muted-foreground">Enrolled:</span> {new Date(selectedBeneficiary.enrolledDate).toLocaleDateString()}</div>
                <div><span className="text-muted-foreground">Income Change:</span> <span className="font-bold text-emerald-600">{selectedBeneficiary.incomeChange}</span></div>
                <div><span className="text-muted-foreground">Yield Change:</span> <span className="font-bold text-emerald-600">{selectedBeneficiary.yieldChange}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Trainings Attended:</span> {selectedBeneficiary.trainingsAttended}</div>
              </div>
            </div>
          )}
          <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Detail Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report Details</DialogTitle></DialogHeader>
          {reportDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2"><span className="text-muted-foreground">Name:</span> <span className="font-medium">{reportDetail.name}</span></div>
                <div><span className="text-muted-foreground">Program:</span> {reportDetail.program}</div>
                <div><span className="text-muted-foreground">Type:</span> {reportDetail.type}</div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(reportDetail.date).toLocaleDateString()}</div>
                <div><span className="text-muted-foreground">Size:</span> {reportDetail.size}</div>
              </div>
              <Button onClick={() => toast.info(`Downloading ${reportDetail.name}... (placeholder)`)} className="w-full gap-2">
                <Download className="w-4 h-4" /> Download Report
              </Button>
            </div>
          )}
          <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}