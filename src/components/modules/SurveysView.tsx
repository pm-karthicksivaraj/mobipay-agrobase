'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Search, Plus, FileText, Users, Calendar, CheckCircle, Clock, X, Loader2,
  Eye, Trash2, Pencil, AlertCircle, ChevronDown, ChevronUp, ListChecks, ClipboardList
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
import { safeFetch, extractArray } from '@/lib/safe-fetch'

const safeJsonParse = (str: string): any => {
  try { return JSON.parse(str) } catch { return {} }
}

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
  // From real API: Prisma _count
  _count?: { questions?: number; responses?: number }
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

export default function SurveysView() {
  const { } = useAppStore()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateSurvey, setShowCreateSurvey] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null)
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null)
  const [viewResponsesFor, setViewResponsesFor] = useState<Survey | null>(null)
  const [responsesForSurvey, setResponsesForSurvey] = useState<SurveyResponse[]>([])
  const [loadingResponses, setLoadingResponses] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const sData = await safeFetch('/api/surveys')
      const rawSurveys = extractArray(sData, 'data', 'surveys')
      const normalized: Survey[] = rawSurveys.map((s: any) => ({
        id: s.id,
        title: s.title || 'Untitled',
        description: s.description || '',
        status: s.status || 'DRAFT',
        questions: Array.isArray(s.questions) ? s.questions.map((q: any) => ({
          id: q.id,
          text: q.question || q.text || '',
          type: q.type || 'TEXT',
          options: q.options ? (typeof q.options === 'string' ? safeJsonParse(q.options) : q.options) : [],
          required: q.required ?? false,
        })) : [],
        responseCount: s._count?.responses ?? s.responseCount ?? 0,
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '',
        updatedAt: s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '',
        _count: s._count,
      }))
      setSurveys(normalized)
      // Responses are no longer fetched up-front — see per-survey "View Responses" button.
      setResponses([])
    } catch {
      setSurveys([])
      setResponses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this survey? This action cannot be undone.')) return
    try {
      const res = await fetch(`/api/surveys/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Survey deleted')
      fetchData()
    } catch {
      toast.error('Failed to delete survey')
    }
  }

  const handleViewResponses = async (survey: Survey) => {
    setViewResponsesFor(survey)
    setLoadingResponses(true)
    setResponsesForSurvey([])
    try {
      const data = await safeFetch(`/api/surveys/${survey.id}/responses`)
      const arr = extractArray(data, 'data', 'responses')
      setResponsesForSurvey(arr.map((r: any) => ({
        id: r.id,
        surveyId: r.surveyId,
        surveyTitle: survey.title,
        farmerName: r.respondentId || 'Anonymous',
        farmerCode: '',
        answers: typeof r.answers === 'string' ? safeJsonParse(r.answers) : (r.answers || {}),
        submittedAt: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '',
      })))
    } catch {
      setResponsesForSurvey([])
    } finally {
      setLoadingResponses(false)
    }
  }

  const filteredSurveys = surveys.filter(s => {
    const matchSearch = !search || (s.title || '').toLowerCase().includes(search.toLowerCase()) || (s.description || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || s.status === statusFilter
    return matchSearch && matchStatus
  })

  const filteredResponses = responses.filter(r => {
    const matchSearch = !search || (r.farmerName || '').toLowerCase().includes(search.toLowerCase()) || (r.surveyTitle || '').toLowerCase().includes(search.toLowerCase())
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
            <div className="text-center py-12">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40 text-muted-foreground" />
              <p className="font-medium">No surveys created yet</p>
              <p className="text-sm text-muted-foreground mt-1">Click 'Create Survey' to get started.</p>
              <Button onClick={() => setShowCreateSurvey(true)} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Create Survey</Button>
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
                      <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" /> {survey._count?.questions ?? survey.questions.length} questions</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {survey.responseCount} responses</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {survey.createdAt}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {survey.questions.slice(0, 3).map(q => (
                        <Badge key={q.id} variant="outline" className="text-[10px]">{q.type}</Badge>
                      ))}
                      {(survey._count?.questions ?? survey.questions.length) > 3 && (
                        <Badge variant="outline" className="text-[10px]">+{(survey._count?.questions ?? survey.questions.length) - 3}</Badge>
                      )}
                      {(survey.questions.length === 0 && survey._count?.questions) ? (
                        <Badge variant="outline" className="text-[10px]">{survey._count.questions} questions</Badge>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleViewResponses(survey)} className="gap-1 h-7">
                        <Eye className="w-3.5 h-3.5" /> View Responses
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setEditingSurvey(survey); setShowCreateSurvey(false) }} className="gap-1 h-7">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(survey.id)} className="gap-1 h-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
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
      <Dialog open={showCreateSurvey || !!editingSurvey} onOpenChange={(open) => { if (!open) { setShowCreateSurvey(false); setEditingSurvey(null) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSurvey ? 'Edit Survey' : 'Create New Survey'}</DialogTitle>
          </DialogHeader>
          <CreateSurveyForm
            initial={editingSurvey}
            onSave={() => { setShowCreateSurvey(false); setEditingSurvey(null); fetchData() }}
          />
        </DialogContent>
      </Dialog>

      {/* View Responses dialog */}
      <Dialog open={!!viewResponsesFor} onOpenChange={(open) => { if (!open) { setViewResponsesFor(null); setResponsesForSurvey([]) } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Responses: {viewResponsesFor?.title}</DialogTitle>
          </DialogHeader>
          {loadingResponses ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded" />)}</div>
          ) : responsesForSurvey.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No responses yet for this survey</p>
            </div>
          ) : (
            <div className="space-y-3">
              {responsesForSurvey.map(r => (
                <Card key={r.id}>
                  <CardContent className="p-3">
                    <div className="flex justify-between mb-2">
                      <p className="font-medium text-sm">{r.farmerName}</p>
                      <p className="text-xs text-muted-foreground">{r.submittedAt}</p>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(r.answers).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="text-muted-foreground">{key}:</span>{' '}
                          <span>{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CreateSurveyForm({ initial, onSave }: { initial?: Survey | null; onSave: () => void }) {
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [questions, setQuestions] = useState<SurveyQuestion[]>(
    initial?.questions && initial.questions.length > 0
      ? initial.questions.map(q => ({
          id: q.id,
          text: q.text,
          type: q.type,
          options: q.options ? [...q.options] : [],
          required: q.required,
        }))
      : [{ id: 'q_new_1', text: '', type: 'TEXT', options: [], required: false }]
  )

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
    if (!initial && validQuestions.length === 0) { toast.error('Add at least one question'); return }

    setSaving(true)
    try {
      const url = initial ? `/api/surveys/${initial.id}` : '/api/surveys'
      const method = initial ? 'PUT' : 'POST'
      const body = initial
        ? { title, description, status: initial.status || 'DRAFT' }
        : {
            title,
            description,
            questions: validQuestions.map(q => ({
              question: q.text,
              type: q.type,
              options: q.options && q.options.length > 0 ? q.options : undefined,
            })),
          }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success(initial ? 'Survey updated successfully' : 'Survey created successfully')
      onSave()
    } catch {
      toast.error(initial ? 'Failed to update survey' : 'Failed to create survey')
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