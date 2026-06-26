'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Search, Plus, FileText, Users, Calendar, CheckCircle, Clock, X, Loader2,
  Eye, Trash2, AlertCircle, ChevronDown, ChevronUp, ListChecks, ClipboardList
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface SurveyQuestion {
  id: string
  text: string
  type: 'TEXT' | 'RADIO' | 'CHECKBOX' | 'NUMBER'
  options?: string[]
  required: boolean
}

interface Survey {
  id: string
  title: string
  description: string
  status: 'ACTIVE' | 'DRAFT' | 'CLOSED'
  questions: SurveyQuestion[]
  responseCount: number
  createdAt: string
  updatedAt: string
}

interface SurveyResponse {
  id: string
  surveyId: string
  surveyTitle: string
  farmerName: string
  farmerCode: string
  answers: Record<string, string | string[]>
  submittedAt: string
}

const surveyStatusColor: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  DRAFT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const mockSurveys: Survey[] = [
  {
    id: 's1', title: 'Coffee Farming Practices 2024', description: 'Annual survey on coffee farming methods, yields, and challenges faced by farmers in the Mt. Elgon region.',
    status: 'ACTIVE', responseCount: 47,
    questions: [
      { id: 'q1', text: 'What is your primary coffee variety?', type: 'RADIO', options: ['Arabica', 'Robusta', 'Both'], required: true },
      { id: 'q2', text: 'What farming methods do you use?', type: 'CHECKBOX', options: ['Organic', 'Conventional', 'Shade-grown', 'Irrigated'], required: false },
      { id: 'q3', text: 'How many bags of coffee did you harvest last season?', type: 'NUMBER', required: true },
      { id: 'q4', text: 'What are your main challenges?', type: 'TEXT', required: false },
    ],
    createdAt: '2024-11-01', updatedAt: '2024-11-15',
  },
  {
    id: 's2', title: 'Input Needs Assessment', description: 'Assessment of farmer input requirements for the upcoming planting season including fertilizers, seeds, and equipment.',
    status: 'ACTIVE', responseCount: 32,
    questions: [
      { id: 'q5', text: 'What inputs do you need?', type: 'CHECKBOX', options: ['Fertilizers', 'Seeds', 'Pesticides', 'Equipment', 'Tarpaulins'], required: true },
      { id: 'q6', text: 'What is your estimated budget for inputs?', type: 'NUMBER', required: true },
      { id: 'q7', text: 'Preferred input brand?', type: 'TEXT', required: false },
    ],
    createdAt: '2024-11-10', updatedAt: '2024-11-20',
  },
  {
    id: 's3', title: 'Post-Harvest Handling Survey', description: 'Survey to understand post-harvest practices and storage capabilities.',
    status: 'DRAFT', responseCount: 0,
    questions: [
      { id: 'q8', text: 'How do you dry your coffee?', type: 'RADIO', options: ['Sun-dried on raised beds', 'Machine-dried', 'Both'], required: true },
      { id: 'q9', text: 'Do you have proper storage facilities?', type: 'RADIO', options: ['Yes', 'No'], required: true },
    ],
    createdAt: '2024-11-20', updatedAt: '2024-11-20',
  },
  {
    id: 's4', title: 'Farmer Satisfaction Q3 2024', description: 'Quarterly satisfaction survey for farmers on extension services and market access.',
    status: 'CLOSED', responseCount: 89,
    questions: [
      { id: 'q10', text: 'Rate extension services (1-5)', type: 'NUMBER', required: true },
      { id: 'q11', text: 'Any suggestions for improvement?', type: 'TEXT', required: false },
    ],
    createdAt: '2024-07-01', updatedAt: '2024-09-30',
  },
]

const mockResponses: SurveyResponse[] = [
  { id: 'r1', surveyId: 's1', surveyTitle: 'Coffee Farming Practices 2024', farmerName: 'James Okello', farmerCode: 'FRM-001', answers: { q1: 'Arabica', q2: 'Organic, Shade-grown', q3: '25' }, submittedAt: '2024-11-05' },
  { id: 'r2', surveyId: 's1', surveyTitle: 'Coffee Farming Practices 2024', farmerName: 'Grace Achieng', farmerCode: 'FRM-012', answers: { q1: 'Robusta', q2: 'Conventional', q3: '40' }, submittedAt: '2024-11-06' },
  { id: 'r3', surveyId: 's1', surveyTitle: 'Coffee Farming Practices 2024', farmerName: 'Peter Ochieng', farmerCode: 'FRM-031', answers: { q1: 'Both', q3: '15' }, submittedAt: '2024-11-07' },
  { id: 'r4', surveyId: 's2', surveyTitle: 'Input Needs Assessment', farmerName: 'Sarah Nakamya', farmerCode: 'FRM-023', answers: { q5: 'Fertilizers, Seeds', q6: '150000' }, submittedAt: '2024-11-12' },
  { id: 'r5', surveyId: 's2', surveyTitle: 'Input Needs Assessment', farmerName: 'Wangari Muthoni', farmerCode: 'FRM-045', answers: { q5: 'Seeds, Tarpaulins', q6: '85000' }, submittedAt: '2024-11-13' },
  { id: 'r6', surveyId: 's4', surveyTitle: 'Farmer Satisfaction Q3 2024', farmerName: 'Kwame Asante', farmerCode: 'FRM-078', answers: { q10: '4', q11: 'Need more training on post-harvest handling' }, submittedAt: '2024-07-15' },
  { id: 'r7', surveyId: 's4', surveyTitle: 'Farmer Satisfaction Q3 2024', farmerName: 'James Okello', farmerCode: 'FRM-001', answers: { q10: '5' }, submittedAt: '2024-07-18' },
  { id: 'r8', surveyId: 's1', surveyTitle: 'Coffee Farming Practices 2024', farmerName: 'Kwame Asante', farmerCode: 'FRM-078', answers: { q1: 'Arabica', q2: 'Organic', q3: '60' }, submittedAt: '2024-11-10' },
]

export default function SurveysView() {
  const { } = useAppStore()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateSurvey, setShowCreateSurvey] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, rRes] = await Promise.all([
        fetch('/api/surveys'),
        fetch('/api/surveys/responses'),
      ])
      if (sRes.ok) {
        const sData = await sRes.json()
        setSurveys(sData.surveys || sData.data || [])
      } else {
        setSurveys(mockSurveys)
      }
      if (rRes.ok) {
        const rData = await rRes.json()
        setResponses(rData.responses || rData.data || [])
      } else {
        setResponses(mockResponses)
      }
    } catch {
      setSurveys(mockSurveys)
      setResponses(mockResponses)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredSurveys = surveys.filter(s => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || s.status === statusFilter
    return matchSearch && matchStatus
  })

  const filteredResponses = responses.filter(r => {
    const matchSearch = !search || r.farmerName.toLowerCase().includes(search.toLowerCase()) || r.surveyTitle.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  const totalResponses = surveys.reduce((sum, s) => sum + s.responseCount, 0)
  const activeSurveys = surveys.filter(s => s.status === 'ACTIVE').length

  const statusPieData = [
    { name: 'Active', value: surveys.filter(s => s.status === 'ACTIVE').length, color: '#10b981' },
    { name: 'Draft', value: surveys.filter(s => s.status === 'DRAFT').length, color: '#f59e0b' },
    { name: 'Closed', value: surveys.filter(s => s.status === 'CLOSED').length, color: '#6b7280' },
  ]

  const responsesPerSurvey = surveys.filter(s => s.responseCount > 0).map(s => ({ name: s.title.length > 20 ? s.title.substring(0, 20) + '...' : s.title, responses: s.responseCount }))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Survey Management</h3>
          <p className="text-sm text-muted-foreground">Create and manage farmer surveys</p>
        </div>
        <Button onClick={() => setShowCreateSurvey(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Create Survey
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Total Surveys</p><p className="text-xl font-bold">{surveys.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold">{activeSurveys}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">Total Responses</p><p className="text-xl font-bold">{totalResponses}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center"><FileText className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-muted-foreground">Questions Total</p><p className="text-xl font-bold">{surveys.reduce((sum, s) => sum + ((s as any).questions?.length || 0), 0)}</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="surveys" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="create">Create Survey</TabsTrigger>
        </TabsList>

        {/* Tab 1: Surveys */}
        <TabsContent value="surveys" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search surveys..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            {(search || statusFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('') }} className="gap-1"><X className="w-3.5 h-3.5" /> Clear</Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded" />)}</div>
          ) : filteredSurveys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No surveys found</p>
              <p className="text-sm mt-1">Create a new survey to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSurveys.map(survey => (
                <Card key={survey.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{survey.title}</h4>
                          <Badge className={cn('text-[10px]', surveyStatusColor[survey.status] || '')}>{survey.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{survey.description}</p>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" /> {survey.questions.length} questions</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {survey.responseCount} responses</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {survey.createdAt}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {survey.questions.slice(0, 3).map(q => (
                        <Badge key={q.id} variant="outline" className="text-[10px]">{q.type}</Badge>
                      ))}
                      {survey.questions.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">+{survey.questions.length - 3}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Charts */}
          {surveys.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Survey Status Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {statusPieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Responses Per Survey</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={responsesPerSurvey}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="responses" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Responses */}
        <TabsContent value="responses" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by farmer name or survey title..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
              ) : filteredResponses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No responses found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead className="hidden sm:table-cell">Survey</TableHead>
                      <TableHead className="hidden md:table-cell">Answers</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResponses.map(r => (
                      <TableRow key={r.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{r.farmerName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{r.farmerCode}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{r.surveyTitle}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {Object.values(r.answers).filter(Boolean).length} answered
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.submittedAt}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedResponse(selectedResponse?.id === r.id ? null : r)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Expanded response */}
          {selectedResponse && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedResponse.surveyTitle}</CardTitle>
                    <CardDescription>{selectedResponse.farmerName} ({selectedResponse.farmerCode}) - {selectedResponse.submittedAt}</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedResponse(null)}><X className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(selectedResponse.answers).map(([key, value]) => (
                    value && (
                      <div key={key} className="flex gap-3">
                        <Badge variant="outline" className="text-[10px] h-fit shrink-0">{key.toUpperCase()}</Badge>
                        <p className="text-sm">{Array.isArray(value) ? value.join(', ') : String(value)}</p>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Create Survey */}
        <TabsContent value="create">
          <CreateSurveyForm onSave={() => { setShowCreateSurvey(false); fetchData() }} />
        </TabsContent>
      </Tabs>

      {/* Quick create dialog */}
      <Dialog open={showCreateSurvey} onOpenChange={setShowCreateSurvey}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Survey</DialogTitle>
          </DialogHeader>
          <CreateSurveyForm onSave={() => { setShowCreateSurvey(false); fetchData(); toast.success('Survey created successfully') }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CreateSurveyForm({ onSave }: { onSave: () => void }) {
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<SurveyQuestion[]>([
    { id: 'q_new_1', text: '', type: 'TEXT', options: [], required: false }
  ])

  const addQuestion = () => {
    const newId = `q_new_${Date.now()}`
    setQuestions([...questions, { id: newId, text: '', type: 'TEXT', options: [], required: false }])
  }

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) return
    setQuestions(questions.filter(q => q.id !== id))
  }

  const updateQuestion = (id: string, field: string, value: string | boolean | string[]) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  const addOption = (qId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: [...(q.options || []), ''] }
      }
      return q
    }))
  }

  const updateOption = (qId: string, idx: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOpts = [...(q.options || [])]
        newOpts[idx] = value
        return { ...q, options: newOpts }
      }
      return q
    }))
  }

  const removeOption = (qId: string, idx: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: (q.options || []).filter((_, i) => i !== idx) }
      }
      return q
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Survey title is required'); return }
    const validQuestions = questions.filter(q => q.text.trim())
    if (validQuestions.length === 0) { toast.error('Add at least one question'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, questions: validQuestions, status: 'DRAFT' }),
      })
      if (!res.ok) throw new Error()
      toast.success('Survey created successfully')
      onSave()
    } catch {
      toast.error('Failed to create survey')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <Label>Survey Title *</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Coffee Farming Practices 2024" required />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the purpose of this survey..." rows={3} />
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Questions ({questions.length})</Label>
          <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="gap-1"><Plus className="w-3.5 h-3.5" /> Add Question</Button>
        </div>

        {questions.map((q, idx) => (
          <Card key={q.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">Question {idx + 1}</p>
                {questions.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeQuestion(q.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                )}
              </div>
              <Input value={q.text} onChange={e => updateQuestion(q.id, 'text', e.target.value)} placeholder="Enter question text..." />
              <div className="flex items-center gap-2">
                <Select value={q.type} onValueChange={v => updateQuestion(q.id, 'type', v)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEXT">Text</SelectItem>
                    <SelectItem value="RADIO">Radio</SelectItem>
                    <SelectItem value="CHECKBOX">Checkbox</SelectItem>
                    <SelectItem value="NUMBER">Number</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={q.required} onChange={e => updateQuestion(q.id, 'required', e.target.checked)} className="rounded" />
                  Required
                </label>
              </div>
              {(q.type === 'RADIO' || q.type === 'CHECKBOX') && (
                <div className="space-y-2 ml-2">
                  <p className="text-xs text-muted-foreground">Options:</p>
                  {(q.options || []).map((opt, oIdx) => (
                    <div key={oIdx} className="flex gap-2">
                      <Input value={opt} onChange={e => updateOption(q.id, oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`} className="h-8 text-sm" />
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeOption(q.id, oIdx)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => addOption(q.id)} className="gap-1 text-xs">
                    <Plus className="w-3 h-3" /> Add Option
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <DialogFooter className="gap-2">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Survey
        </Button>
      </DialogFooter>
    </form>
  )
}