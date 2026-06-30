'use client'
import { safeFetch, extractArray } from '@/lib/safe-fetch'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import {
  ClipboardCheck, BarChart3, Plus, TrendingUp, Award, Users, Calendar,
  Loader2, Search, Lightbulb, Target, Pencil, Trash2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#ef4444', '#8b5cf6']

const CATEGORIES = ['Income', 'Yield', 'QualityOfLife', 'TrainingImpact', 'MarketAccess'] as const

const CATEGORY_LABELS: Record<string, string> = {
  Income: 'Income',
  Yield: 'Crop Yield',
  QualityOfLife: 'Quality of Life',
  TrainingImpact: 'Training Impact',
  MarketAccess: 'Market Access',
}

const QUESTIONS: Record<string, { question: string; type: 'radio' | 'number'; options?: string[]; max?: number }[]> = {
  Income: [
    { question: 'Has your income increased?', type: 'radio', options: ['Yes, significantly', 'Yes, moderately', 'Slightly', 'No change', 'Decreased'] },
    { question: 'By what percentage has your income changed?', type: 'number', max: 200 },
    { question: 'Do you have savings now?', type: 'radio', options: ['Yes, regularly saving', 'Sometimes save', 'Rarely save', 'No savings'] },
    { question: 'Can you afford school fees?', type: 'radio', options: ['Yes, all fees', 'Most fees', 'Some fees', 'Struggling'] },
    { question: 'Have you diversified income sources?', type: 'radio', options: ['Yes, 3+ sources', 'Yes, 2 sources', 'Yes, 1 extra source', 'No diversification'] },
  ],
  Yield: [
    { question: 'Has your crop yield improved?', type: 'radio', options: ['Yes, significantly', 'Yes, moderately', 'Slightly', 'No change', 'Worse'] },
    { question: 'By what percentage has yield changed?', type: 'number', max: 200 },
    { question: 'Are you using improved seeds?', type: 'radio', options: ['Always', 'Mostly', 'Sometimes', 'Rarely', 'Never'] },
    { question: 'Do you use fertilizers?', type: 'radio', options: ['Yes, organic & chemical', 'Yes, organic only', 'Yes, chemical only', 'Sometimes', 'Never'] },
    { question: 'How many harvests per year?', type: 'number', max: 6 },
  ],
  QualityOfLife: [
    { question: 'Has food security improved?', type: 'radio', options: ['Yes, very secure', 'Yes, improved', 'Same as before', 'Slightly worse', 'Much worse'] },
    { question: 'Access to clean water?', type: 'radio', options: ['Piped water', 'Borehole/well', 'Protected spring', 'Unprotected source'] },
    { question: 'Healthcare access?', type: 'radio', options: ['Health insurance', 'Can afford clinic', 'Community health', 'Limited access', 'No access'] },
    { question: 'Housing improvement?', type: 'radio', options: ['Permanent house', 'Semi-permanent', 'Improved temporary', 'Same as before', 'Worsened'] },
    { question: 'Overall satisfaction (1-10)?', type: 'number', max: 10 },
  ],
  TrainingImpact: [
    { question: 'How many trainings attended?', type: 'number', max: 50 },
    { question: 'Have you applied training knowledge?', type: 'radio', options: ['All of it', 'Most of it', 'Some of it', 'Very little', 'None'] },
    { question: 'Has training changed your practices?', type: 'radio', options: ['Completely changed', 'Major changes', 'Some changes', 'Minor changes', 'No change'] },
    { question: 'Would you recommend training to others?', type: 'radio', options: ['Definitely yes', 'Probably yes', 'Maybe', 'Probably not', 'No'] },
    { question: 'Training quality rating (1-10)?', type: 'number', max: 10 },
  ],
  MarketAccess: [
    { question: 'Do you have access to better markets?', type: 'radio', options: ['Export market', 'Urban market', 'District market', 'Local market', 'No market access'] },
    { question: 'Has your selling price improved?', type: 'radio', options: ['More than 50% increase', '20-50% increase', '10-20% increase', 'Less than 10%', 'No change'] },
    { question: 'Do you sell in groups/cooperatives?', type: 'radio', options: ['Yes, always', 'Sometimes', 'Rarely', 'Never', 'Not available'] },
    { question: 'Market information access?', type: 'radio', options: ['Real-time via phone', 'Weekly updates', 'Monthly updates', 'Occasional', 'No information'] },
    { question: 'Post-harvest loss reduction (%)?', type: 'number', max: 100 },
  ],
}

function calculateScore(category: string, answers: Record<string, string | number>): number {
  const questions = QUESTIONS[category]
  if (!questions) return 0
  let total = 0
  let count = 0
  questions.forEach((q, idx) => {
    const answer = answers[`q${idx}`]
    if (q.type === 'radio' && q.options) {
      const optIdx = q.options.indexOf(String(answer))
      if (optIdx >= 0) {
        total += ((q.options.length - 1 - optIdx) / (q.options.length - 1)) * 20
        count++
      }
    } else if (q.type === 'number') {
      const num = Number(answer) || 0
      const max = q.max || 100
      total += Math.min((num / max) * 20, 20)
      count++
    }
  })
  return count > 0 ? Math.round((total / count) * 10) / 10 : 0
}

export default function ImpactAssessmentView() {
  const { activeSubTab, setActiveSubTab, user } = useAppStore()
  const [assessments, setAssessments] = useState<any[]>([])
  const [farmers, setFarmers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(activeSubTab || 'assessments')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Income')
  const [selectedFarmer, setSelectedFarmer] = useState('')
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [autoScore, setAutoScore] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null)
  const [editingAssessment, setEditingAssessment] = useState<any | null>(null)

  const fetchAssessments = useCallback(async () => {
    try {
      const data = await safeFetch('/api/impact-assessments')
      if (data) {
        setAssessments(extractArray(data, 'assessments'))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchFarmers = useCallback(async () => {
    try {
      const data = await safeFetch('/api/farmers?limit=200')
      if (data) {
        setFarmers(extractArray(data, 'farmers'))
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => { fetchAssessments(); fetchFarmers() }, [fetchAssessments, fetchFarmers])

  useEffect(() => {
    const score = calculateScore(selectedCategory, answers)
    setAutoScore(score)
  }, [selectedCategory, answers])

  const loadTab = (tab: string) => {
    setActiveTab(tab)
    setActiveSubTab(tab)
  }

  const resetForm = () => {
    setSelectedFarmer('')
    setSelectedCategory('Income')
    setAnswers({})
    setAutoScore(0)
    setEditingAssessment(null)
  }

  const openAdd = () => {
    setEditingAssessment(null)
    setSelectedFarmer('')
    setSelectedCategory('Income')
    setAnswers({})
    setAutoScore(0)
    loadTab('new')
  }

  const openEdit = (a: any) => {
    setEditingAssessment(a)
    setSelectedFarmer(a.farmerId || '')
    setSelectedCategory(a.category || 'Income')
    let parsedAnswers: Record<string, string | number> = {}
    try {
      parsedAnswers = typeof a.response === 'string' ? JSON.parse(a.response) : (a.response || {})
    } catch {
      parsedAnswers = {}
    }
    setAnswers(parsedAnswers)
    setAutoScore(a.score || 0)
    loadTab('new')
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this impact assessment?')) return
    try {
      const res = await fetch(`/api/impact-assessments/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Assessment deleted')
        fetchAssessments()
      } else {
        toast.error('Failed to delete assessment')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const handleSubmit = async () => {
    if (!selectedFarmer) { toast.error('Please select a farmer'); return }
    if (Object.keys(answers).length < 3) { toast.error('Please answer at least 3 questions'); return }
    setSubmitting(true)
    try {
      const payload = {
        farmerId: selectedFarmer,
        category: selectedCategory,
        response: JSON.stringify(answers),
        score: autoScore,
        conductedBy: user?.name || user?.userId,
      }
      const isEdit = !!editingAssessment
      const url = isEdit ? `/api/impact-assessments/${editingAssessment.id}` : '/api/impact-assessments'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success(isEdit ? 'Impact assessment updated' : 'Impact assessment saved successfully')
        resetForm()
        loadTab('assessments')
        fetchAssessments()
      } else {
        toast.error(isEdit ? 'Failed to update assessment' : 'Failed to save assessment')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = assessments.filter((a: any) => {
    const name = a.farmer?.firstName ? `${a.farmer.firstName} ${a.farmer.lastName}` : a.farmerName || ''
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.category?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const totalAssessments = assessments.length
  const avgScore = assessments.length > 0 ? Math.round(assessments.reduce((s: number, a: any) => s + (a.score || 0), 0) / assessments.length * 10) / 10 : 0
  const now = new Date()
  const thisMonth = assessments.filter((a: any) => {
    const d = new Date(a.assessmentDate || a.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const categoryScores = CATEGORIES.map(cat => {
    const catAssessments = assessments.filter((a: any) => a.category === cat)
    const avg = catAssessments.length > 0 ? Math.round(catAssessments.reduce((s: number, a: any) => s + (a.score || 0), 0) / catAssessments.length * 10) / 10 : 0
    return { category: CATEGORY_LABELS[cat] || cat, score: avg, count: catAssessments.length }
  })
  const mostImproved = categoryScores.reduce((best: any, cur: any) => cur.score > best.score ? cur : best, categoryScores[0])

  const scoreDistribution = [
    { range: '0-20', count: assessments.filter((a: any) => (a.score || 0) <= 20).length },
    { range: '21-40', count: assessments.filter((a: any) => (a.score || 0) > 20 && (a.score || 0) <= 40).length },
    { range: '41-60', count: assessments.filter((a: any) => (a.score || 0) > 40 && (a.score || 0) <= 60).length },
    { range: '61-80', count: assessments.filter((a: any) => (a.score || 0) > 60 && (a.score || 0) <= 80).length },
    { range: '81-100', count: assessments.filter((a: any) => (a.score || 0) > 80).length },
  ]

  const trendData = (() => {
    const monthMap: Record<string, { Income: number; Yield: number; QualityOfLife: number; TrainingImpact: number; MarketAccess: number }> = {}
    assessments.forEach((a: any) => {
      const d = new Date(a.assessmentDate || a.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!monthMap[key]) monthMap[key] = { Income: 0, Yield: 0, QualityOfLife: 0, TrainingImpact: 0, MarketAccess: 0 }
      monthMap[key][a.category] = (monthMap[key][a.category] || 0) + (a.score || 0)
    })
    return Object.entries(monthMap).slice(-6).map(([month, scores]) => {
      const catCounts: Record<string, number> = { Income: 0, Yield: 0, QualityOfLife: 0, TrainingImpact: 0, MarketAccess: 0 }
      assessments.forEach((a: any) => {
        const d = new Date(a.assessmentDate || a.createdAt)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (key === month) catCounts[a.category] = (catCounts[a.category] || 0) + 1
      })
      return {
        month,
        Income: catCounts.Income > 0 ? Math.round(scores.Income / catCounts.Income * 10) / 10 : 0,
        Yield: catCounts.Yield > 0 ? Math.round(scores.Yield / catCounts.Yield * 10) / 10 : 0,
        QualityOfLife: catCounts.QualityOfLife > 0 ? Math.round(scores.QualityOfLife / catCounts.QualityOfLife * 10) / 10 : 0,
        TrainingImpact: catCounts.TrainingImpact > 0 ? Math.round(scores.TrainingImpact / catCounts.TrainingImpact * 10) / 10 : 0,
        MarketAccess: catCounts.MarketAccess > 0 ? Math.round(scores.MarketAccess / catCounts.MarketAccess * 10) / 10 : 0,
      }
    })
  })()

  const chartConfig: ChartConfig = {
    Income: { label: 'Income', color: '#059669' },
    Yield: { label: 'Yield', color: '#10b981' },
    QualityOfLife: { label: 'Quality of Life', color: '#34d399' },
    TrainingImpact: { label: 'Training Impact', color: '#f59e0b' },
    MarketAccess: { label: 'Market Access', color: '#6ee7b7' },
  }

  const viewDetail = (assessment: any) => {
    setSelectedAssessment(assessment)
    setDetailOpen(true)
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
              <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Assessments</p>
              <p className="text-xl font-bold">{totalAssessments}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Score</p>
              <p className="text-xl font-bold">{avgScore}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Most Improved</p>
              <p className="text-sm font-bold truncate">{mostImproved?.category || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-xl font-bold">{thisMonth}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={loadTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="new">New Assessment</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Tab 1: Assessments Table */}
        <TabsContent value="assessments" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by farmer or category..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Button onClick={openAdd} className="gap-2">
              <Plus className="w-4 h-4" /> New Assessment
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Conducted By</TableHead>
                      <TableHead className="w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No assessments found
                        </TableCell>
                      </TableRow>
                    ) : filtered.map((a: any) => {
                      const name = a.farmer ? `${a.farmer.firstName} ${a.farmer.lastName}` : a.farmerName || 'Unknown'
                      return (
                        <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewDetail(a)}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell><Badge variant="outline">{CATEGORY_LABELS[a.category] || a.category}</Badge></TableCell>
                          <TableCell>
                            <span className={`font-bold ${a.score >= 70 ? 'text-emerald-600' : a.score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                              {a.score || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(a.assessmentDate || a.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm">{a.conductedBy || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); viewDetail(a) }} aria-label="View detail">
                                <BarChart3 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(a) }} aria-label="Edit assessment">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={(e) => { e.stopPropagation(); handleDelete(a.id) }}
                                aria-label="Delete assessment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: New / Edit Assessment Form */}
        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{editingAssessment ? 'Edit Impact Assessment' : 'Create New Impact Assessment'}</CardTitle>
              <CardDescription>
                {editingAssessment
                  ? 'Update the farmer, category, or answers below. Changes will overwrite this assessment.'
                  : 'Select a farmer, choose a category, and answer the questions below.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Farmer</Label>
                  <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
                    <SelectTrigger><SelectValue placeholder="Choose a farmer..." /></SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {farmers.map((f: any) => (
                        <SelectItem key={f.id} value={f.id}>{f.firstName} {f.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setAnswers({}) }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-4 border-t pt-4">
                {QUESTIONS[selectedCategory]?.map((q, idx) => (
                  <div key={idx} className="space-y-2 p-4 rounded-lg bg-muted/30">
                    <Label className="font-medium">{idx + 1}. {q.question}</Label>
                    {q.type === 'radio' && q.options && (
                      <RadioGroup value={String(answers[`q${idx}`] || '')} onValueChange={(v) => setAnswers(prev => ({ ...prev, [`q${idx}`]: v }))}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                              <RadioGroupItem value={opt} id={`q${idx}-${oi}`} />
                              <Label htmlFor={`q${idx}-${oi}`} className="cursor-pointer text-sm font-normal">{opt}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    )}
                    {q.type === 'number' && (
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={0}
                          max={q.max}
                          value={answers[`q${idx}`] || ''}
                          onChange={e => setAnswers(prev => ({ ...prev, [`q${idx}`]: e.target.value }))}
                          className="w-32"
                          placeholder={`0-${q.max}`}
                        />
                        <span className="text-sm text-muted-foreground">/ {q.max}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Auto Score */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">Auto-Calculated Score</span>
                </div>
                <span className="text-2xl font-bold text-emerald-600">{autoScore}</span>
              </div>

              <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                {submitting ? 'Saving...' : editingAssessment ? 'Update Assessment' : 'Submit Assessment'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Insights */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average Score by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={categoryScores} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="category" type="category" width={110} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="score" fill="#059669" radius={[0, 4, 4, 0]} name="Avg Score">
                      {categoryScores.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ count: { label: 'Assessments', color: '#10b981' } }} className="h-[300px] w-full">
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Count" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Trend Over Time */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Impact Trends Over Time</CardTitle>
                <CardDescription>Average scores by category per month</CardDescription>
              </CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="Income" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Yield" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="QualityOfLife" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="TrainingImpact" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="MarketAccess" stroke="#6ee7b7" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <Lightbulb className="w-8 h-8 mr-2 opacity-40" />
                    <p>Complete more assessments to see trends</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Assessment Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assessment Detail</DialogTitle>
          </DialogHeader>
          {selectedAssessment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Farmer:</span> <span className="font-medium">{selectedAssessment.farmer ? `${selectedAssessment.farmer.firstName} ${selectedAssessment.farmer.lastName}` : selectedAssessment.farmerName || 'Unknown'}</span></div>
                <div><span className="text-muted-foreground">Category:</span> <Badge>{CATEGORY_LABELS[selectedAssessment.category] || selectedAssessment.category}</Badge></div>
                <div><span className="text-muted-foreground">Score:</span> <span className="font-bold text-lg">{selectedAssessment.score || 0}</span></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(selectedAssessment.assessmentDate || selectedAssessment.createdAt).toLocaleDateString()}</div>
              </div>
              {selectedAssessment.response && (
                <div className="space-y-2 border-t pt-3">
                  <p className="font-medium text-sm">Responses:</p>
                  {(() => {
                    try {
                      const resp = typeof selectedAssessment.response === 'string' ? JSON.parse(selectedAssessment.response) : selectedAssessment.response
                      return Object.entries(resp).map(([key, val]) => (
                        <div key={key} className="text-sm flex gap-2">
                          <span className="text-muted-foreground min-w-[20px]">{key}:</span>
                          <span>{String(val)}</span>
                        </div>
                      ))
                    } catch { return <p className="text-sm text-muted-foreground">Unable to parse responses</p> }
                  })()}
                </div>
              )}
              {selectedAssessment.notes && (
                <div className="text-sm border-t pt-3">
                  <span className="text-muted-foreground">Notes:</span> {selectedAssessment.notes}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}