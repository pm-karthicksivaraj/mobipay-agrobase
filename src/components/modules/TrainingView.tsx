'use client'
import { safeFetch, extractArray } from '@/lib/safe-fetch'

import React, { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  GraduationCap, Calendar, MapPin, Users, Plus, Clock, CheckCircle, Eye,
  Trash2, Pencil, X, Loader2, UserCheck, AlertCircle, ListChecks, Save,
  ClipboardList, Send, UserPlus, UserX, Download
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { EmptyState, exportToCSV } from '@/components/ui/empty-state'

interface Training {
  id: string
  topic: string
  description?: string | null
  date: string
  location?: string | null
  trainerName?: string | null
  type?: string
  status?: string
  startTime?: string | null
  endTime?: string | null
  durationMinutes?: number | null
  expectedAttendees?: number | null
  materialsUsed?: string | null
  notes?: string | null
  groupId?: string | null
  _count?: { attendance: number }
  attendance?: Array<{
    id: string
    farmerId: string
    farmer?: { id: string; firstName: string; lastName: string; farmerCode?: string | null }
    attended: boolean
    enrollmentStatus?: string
    enrolledAt?: string | null
    feedbackRating?: number | null
    feedbackNotes?: string | null
  }>
}

interface Farmer {
  id: string
  firstName: string
  lastName: string
  farmerCode?: string | null
  phone?: string
}

const TRAINING_TYPES = [
  { value: 'GROUP_TRAINING', label: 'Group Training' },
  { value: 'FARM_VISIT', label: 'Farm Visit' },
  { value: 'DEMO_PLOT', label: 'Demo Plot' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'FIELD_DAY', label: 'Field Day' },
]

const TRAINING_STATUS = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const statusColor: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ONGOING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const typeColor: Record<string, string> = {
  GROUP_TRAINING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  FARM_VISIT: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  DEMO_PLOT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  WORKSHOP: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  FIELD_DAY: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
}

export default function TrainingView() {
  const [trainings, setTrainings] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Training | null>(null)
  const [detail, setDetail] = useState<Training | null>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'flow'>('list')

  const fetchTrainings = useCallback(async () => {
    setLoading(true)
    try {
      const data = await safeFetch('/api/trainings')
      if (!data) { setTrainings([]); setLoading(false); return }
      setTrainings(extractArray(data, 'trainings', 'data'))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTrainings() }, [fetchTrainings])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this training? Attendance records will also be removed.')) return
    try {
      const res = await fetch(`/api/trainings/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Training deleted')
        fetchTrainings()
      } else {
        toast.error('Failed to delete')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const totalAttendees = trainings.reduce((s, t) => s + (t._count?.attendance || 0), 0)
  const completedCount = trainings.filter(t => t.status === 'COMPLETED').length
  const scheduledCount = trainings.filter(t => t.status === 'SCHEDULED').length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Trainings</p><p className="text-xl font-bold">{trainings.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center"><Calendar className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Scheduled</p><p className="text-xl font-bold">{scheduledCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-muted-foreground">Completed</p><p className="text-xl font-bold">{completedCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center"><Users className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Attendees</p><p className="text-xl font-bold">{totalAttendees}</p></div>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'flow')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list" className="gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Trainings</TabsTrigger>
            <TabsTrigger value="flow" className="gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> How It Works</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToCSV(trainings, 'trainings')} disabled={trainings.length === 0} className="gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button onClick={() => { setEditing(null); setShowCreate(true) }} className="gap-2">
              <Plus className="w-4 h-4" /> Schedule Training
            </Button>
          </div>
        </div>

        <TabsContent value="list" className="mt-4">
          {loading ? (
            <TrainingSkeleton />
          ) : trainings.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No trainings scheduled"
              description='Click "Schedule Training" to create the first one'
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {trainings.map((t) => (
                <Card key={t.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm truncate">{t.topic}</h4>
                        {t.trainerName && <p className="text-xs text-muted-foreground">Trainer: {t.trainerName}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(t); setShowCreate(true) }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{t.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{t.date ? new Date(t.date).toLocaleDateString() : '—'}</div>
                      {t.location && <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.location}</div>}
                    </div>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {t.type && <Badge className={cn('text-[10px]', typeColor[t.type] || '')}>{(TRAINING_TYPES.find(x => x.value === t.type)?.label) || t.type}</Badge>}
                      {t.status && <Badge className={cn('text-[10px]', statusColor[t.status] || '')}>{t.status}</Badge>}
                      <Badge variant="outline" className="text-[10px]">
                        <Users className="w-3 h-3 mr-1" />{t._count?.attendance || 0} enrolled
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5" onClick={() => setDetail(t)}>
                      <Eye className="w-3.5 h-3.5" /> Manage Enrollment & Attendance
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="flow" className="mt-4">
          <TrainingFlowGuide />
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Training' : 'Schedule New Training'}</DialogTitle>
            <CardDescription>Define who conducts it, when, where, and what materials are needed.</CardDescription>
          </DialogHeader>
          <TrainingForm
            training={editing}
            onClose={() => { setShowCreate(false); setEditing(null) }}
            onSaved={() => { setShowCreate(false); setEditing(null); fetchTrainings() }}
          />
        </DialogContent>
      </Dialog>

      {/* Detail / Enrollment Dialog */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Training Details &amp; Enrollment</DialogTitle></DialogHeader>
          {detail && <TrainingDetail training={detail} onUpdate={() => { fetchTrainings(); setDetail(null) }} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Training Create/Edit Form ─────────────────────────────────────

function TrainingForm({ training, onClose, onSaved }: { training: Training | null; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({
    topic: training?.topic || '',
    description: training?.description || '',
    date: training?.date ? new Date(training.date).toISOString().split('T')[0] : '',
    location: training?.location || '',
    trainerName: training?.trainerName || '',
    type: training?.type || 'GROUP_TRAINING',
    status: training?.status || 'SCHEDULED',
    startTime: training?.startTime ? new Date(training.startTime).toISOString().split('T')[1].substring(0, 5) : '',
    endTime: training?.endTime ? new Date(training.endTime).toISOString().split('T')[1].substring(0, 5) : '',
    expectedAttendees: training?.expectedAttendees ?? '',
    materialsUsed: training?.materialsUsed || '',
    notes: training?.notes || '',
  })

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.topic || !form.date) {
      toast.error('Topic and date are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        topic: form.topic,
        description: form.description || null,
        date: form.date,
        location: form.location || null,
        trainerName: form.trainerName || null,
        type: form.type,
        status: form.status,
        startTime: form.startTime ? new Date(`${form.date}T${form.startTime}`).toISOString() : null,
        endTime: form.endTime ? new Date(`${form.date}T${form.endTime}`).toISOString() : null,
        expectedAttendees: form.expectedAttendees ? parseInt(form.expectedAttendees) : null,
        materialsUsed: form.materialsUsed || null,
        notes: form.notes || null,
      }
      const url = training ? `/api/trainings/${training.id}` : '/api/trainings'
      const method = training ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(training ? 'Training updated' : 'Training scheduled')
        onSaved()
      } else {
        toast.error(data.error || 'Failed to save')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Topic / Title *</Label>
        <Input value={form.topic} onChange={e => update('topic', e.target.value)} placeholder="e.g. Coffee Pruning Best Practices" required />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="What will be covered..." rows={2} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Date *</Label>
          <Input type="date" value={form.date} onChange={e => update('date', e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Input value={form.location} onChange={e => update('location', e.target.value)} placeholder="e.g. Kibale Community Hall" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Trainer / Conductor Name</Label>
          <Input value={form.trainerName} onChange={e => update('trainerName', e.target.value)} placeholder="Who will conduct this training?" />
        </div>
        <div className="space-y-1.5">
          <Label>Expected Attendees</Label>
          <Input type="number" value={form.expectedAttendees} onChange={e => update('expectedAttendees', e.target.value)} placeholder="e.g. 25" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={form.type} onValueChange={v => update('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TRAINING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => update('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TRAINING_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Start Time</Label>
          <Input type="time" value={form.startTime} onChange={e => update('startTime', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>End Time</Label>
          <Input type="time" value={form.endTime} onChange={e => update('endTime', e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Materials Used</Label>
        <Input value={form.materialsUsed} onChange={e => update('materialsUsed', e.target.value)} placeholder="e.g. Booklets, seed samples, demo tools" />
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} placeholder="Internal notes for the trainer..." />
      </div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {training ? 'Update Training' : 'Schedule Training'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ─── Training Detail (Enrollment + Attendance) ─────────────────────

function TrainingDetail({ training, onUpdate }: { training: Training; onUpdate: () => void }) {
  const [enrollment, setEnrollment] = useState<any[]>(training.attendance || [])
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)
  const [showEnroll, setShowEnroll] = useState(false)
  const [search, setSearch] = useState('')

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/trainings/${training.id}`)
      const data = await res.json()
      const t = data.data || data.training || data
      setEnrollment(t.attendance || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [training.id])

  const fetchFarmers = useCallback(async () => {
    try {
      const res = await fetch('/api/farmers?limit=200')
      const data = await res.json()
      setFarmers(data.farmers || data.data || [])
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchDetail()
    fetchFarmers()
  }, [fetchDetail, fetchFarmers])

  const enrolledIds = new Set(enrollment.map(e => e.farmerId))
  const availableFarmers = farmers.filter(f => !enrolledIds.has(f.id) && (
    !search || `${f.firstName} ${f.lastName}`.toLowerCase().includes(search.toLowerCase()) || (f.farmerCode || '').toLowerCase().includes(search.toLowerCase())
  ))

  const enrollFarmer = async (farmerId: string) => {
    try {
      const res = await fetch(`/api/trainings/${training.id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerId, enrollmentStatus: 'ENROLLED' }),
      })
      if (res.ok) {
        toast.success('Farmer enrolled')
        fetchDetail()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to enroll')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const markAttendance = async (attendanceId: string, attended: boolean) => {
    try {
      const res = await fetch(`/api/trainings/${training.id}/attendance/${attendanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attended, enrollmentStatus: attended ? 'ATTENDED' : 'ABSENT' }),
      })
      if (res.ok) {
        toast.success(attended ? 'Marked present' : 'Marked absent')
        fetchDetail()
      } else {
        toast.error('Failed to update')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const removeEnrollment = async (attendanceId: string) => {
    if (!confirm('Remove this farmer from the training?')) return
    try {
      const res = await fetch(`/api/trainings/${training.id}/attendance/${attendanceId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Removed')
        fetchDetail()
      }
    } catch {
      toast.error('Network error')
    }
  }

  const present = enrollment.filter(e => e.attended).length
  const absent = enrollment.filter(e => !e.attended && e.enrollmentStatus !== 'INVITED').length

  return (
    <div className="space-y-4">
      {/* Training info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{training.topic}</h3>
              <p className="text-xs text-muted-foreground">
                {training.date ? new Date(training.date).toLocaleDateString() : '—'} {training.startTime && `at ${training.startTime.substring(0, 5)}`}
                {training.location && ` · ${training.location}`}
                {training.trainerName && ` · Trainer: ${training.trainerName}`}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {training.type && <Badge className={cn('text-[10px]', typeColor[training.type] || '')}>{training.type.replace(/_/g, ' ')}</Badge>}
                {training.status && <Badge className={cn('text-[10px]', statusColor[training.status] || '')}>{training.status}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center"><Users className="w-4 h-4 mx-auto text-blue-600 mb-1" /><p className="text-xs text-muted-foreground">Enrolled</p><p className="text-lg font-bold">{enrollment.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><CheckCircle className="w-4 h-4 mx-auto text-emerald-600 mb-1" /><p className="text-xs text-muted-foreground">Present</p><p className="text-lg font-bold">{present}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><UserX className="w-4 h-4 mx-auto text-red-600 mb-1" /><p className="text-xs text-muted-foreground">Absent</p><p className="text-lg font-bold">{absent}</p></CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Enrolled Farmers</h4>
        <Button size="sm" onClick={() => setShowEnroll(true)} className="gap-1.5"><UserPlus className="w-3.5 h-3.5" /> Enroll Farmer</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
      ) : enrollment.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No farmers enrolled yet. Click "Enroll Farmer" to add.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Farmer</TableHead>
              <TableHead className="hidden sm:table-cell">Code</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollment.map(e => (
              <TableRow key={e.id}>
                <TableCell className="font-medium text-sm">
                  {e.farmer ? `${e.farmer.firstName} ${e.farmer.lastName}` : 'Unknown'}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs font-mono">{e.farmer?.farmerCode || '—'}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className="text-[10px]">{e.enrollmentStatus || 'INVITED'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant={e.attended ? 'default' : 'outline'} className="h-7 text-xs gap-1" onClick={() => markAttendance(e.id, true)}>
                      <CheckCircle className="w-3 h-3" /> Present
                    </Button>
                    <Button size="sm" variant={!e.attended && e.enrollmentStatus !== 'INVITED' ? 'destructive' : 'outline'} className="h-7 text-xs" onClick={() => markAttendance(e.id, false)}>
                      Absent
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => removeEnrollment(e.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Enroll Farmer Dialog */}
      <Dialog open={showEnroll} onOpenChange={setShowEnroll}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Enroll Farmer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Search farmers..." value={search} onChange={e => setSearch(e.target.value)} />
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {availableFarmers.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No available farmers</p>
              ) : availableFarmers.slice(0, 50).map(f => (
                <div key={f.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{f.firstName} {f.lastName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{f.farmerCode || '—'}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => enrollFarmer(f.id)}>
                    <UserPlus className="w-3 h-3 mr-1" /> Enroll
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Training Flow Guide ───────────────────────────────────────────

function TrainingFlowGuide() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Training Program Flow</CardTitle><CardDescription>End-to-end workflow from scheduling to feedback collection</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <FlowStep step="1" title="Schedule" color="blue" desc="Extension Officer or CBT schedules a training. Defines topic, date, location, type (Group/Visit/Demo/Workshop/Field Day), trainer name, expected attendees, and materials needed." />
            <FlowStep step="2" title="Enroll" color="purple" desc="Extension Officer enrolls farmers from the farmer registry. Each enrollment creates a TrainingAttendance record with status ENROLLED. Group-based trainings auto-enroll all group members." />
            <FlowStep step="3" title="Conduct" color="amber" desc="On the training day, the trainer conducts the session. Status moves SCHEDULED → ONGOING. Materials used are logged. Notes can be added during/after the session." />
            <FlowStep step="4" title="Mark Attendance" color="emerald" desc="After the session, the Extension Officer marks each enrolled farmer as Present or Absent. Enrollment status updates to ATTENDED or ABSENT. Mobile app supports offline attendance via QR scan." />
            <FlowStep step="5" title="Feedback & Impact" color="pink" desc="Farmers provide 1-5 rating + notes. Training status → COMPLETED. Attendance data feeds into farmer credit scores (Financial Discipline 35%), impact KPIs, and CCRP/SMILE program reports." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Who Does What</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RoleCard role="Extension Officer" color="blue" responsibilities={['Schedules trainings', 'Enrolls farmers from registry', 'Conducts group training & farm visits', 'Marks attendance after session', 'Collects farmer feedback']} />
            <RoleCard role="CBT (Community Based Trainer)" color="purple" responsibilities={['Conducts demo plot sessions', 'Lead trainer for field days', 'Logs materials used', 'Updates training notes']} />
            <RoleCard role="Agent" color="amber" responsibilities={['Mobilizes farmers for enrollment', 'Confirms farmer availability', 'Assists with on-site registration']} />
            <RoleCard role="Farmer" color="emerald" responsibilities={['Attends scheduled training', 'Provides feedback rating', 'Receives training materials', 'Applies learned practices (tracked via Mazao Safi)']} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Training Types</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <TypeCard type="GROUP_TRAINING" label="Group Training" desc="Classroom-style at community hall. Multiple farmers, presentation + Q&A." />
            <TypeCard type="FARM_VISIT" label="Farm Visit" desc="One-on-one at farmer's field. Personalized advisory on specific issues." />
            <TypeCard type="DEMO_PLOT" label="Demo Plot" desc="Practical demonstration at a model plot. Hands-on practice with new techniques." />
            <TypeCard type="WORKSHOP" label="Workshop" desc="Interactive session with group exercises. Used for capacity building." />
            <TypeCard type="FIELD_DAY" label="Field Day" desc="Large gathering at harvest time. Field tours, farmer-to-farmer learning." />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FlowStep({ step, title, color, desc }: { step: string; title: string; color: string; desc: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    pink: 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800',
  }
  return (
    <div className={cn('p-3 rounded-lg border', colorMap[color])}>
      <div className="w-8 h-8 rounded-full bg-white dark:bg-background flex items-center justify-center text-sm font-bold mb-2">{step}</div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  )
}

function RoleCard({ role, color, responsibilities }: { role: string; color: string; responsibilities: string[] }) {
  const colorMap: Record<string, string> = {
    blue: 'border-blue-200 dark:border-blue-800',
    purple: 'border-purple-200 dark:border-purple-800',
    amber: 'border-amber-200 dark:border-amber-800',
    emerald: 'border-emerald-200 dark:border-emerald-800',
  }
  return (
    <div className={cn('p-3 rounded-lg border', colorMap[color])}>
      <p className="font-semibold text-sm mb-2">{role}</p>
      <ul className="space-y-1">
        {responsibilities.map((r, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1"><span className="text-primary">•</span>{r}</li>)}
      </ul>
    </div>
  )
}

function TypeCard({ type, label, desc }: { type: string; label: string; desc: string }) {
  return (
    <div className="p-3 rounded-lg border">
      <Badge className={cn('text-[10px] mb-1', typeColor[type] || '')}>{label}</Badge>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  )
}

function TrainingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}</div>
    </div>
  )
}
