'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Tractor, Plus, Calendar, Clock, CheckCircle, XCircle, Search,
  Loader2, MapPin, Eye, CalendarDays, BarChart3, User, ChevronLeft, ChevronRight
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const VISIT_TOPICS = [
  'Soil Management', 'Pest Control', 'Harvesting', 'Post-Harvest',
  'Pruning', 'Fertilizer Application', 'Crop Rotation', 'Water Management',
] as const

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  SCHEDULED: { label: 'Scheduled', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  COMPLETED: { label: 'Completed', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  CANCELLED: { label: 'Cancelled', class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
}

export default function FarmVisitsView() {
  const { activeSubTab, setActiveSubTab, user, selectedFarmerId, setSelectedFarmerId } = useAppStore()
  const [visits, setVisits] = useState<any[]>([])
  const [farmers, setFarmers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(activeSubTab || 'visits')
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<any>(null)
  const [historyFarmer, setHistoryFarmer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  // Form state
  const [formFarmer, setFormFarmer] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formTopic, setFormTopic] = useState('')
  const [formObservations, setFormObservations] = useState('')
  const [formRecommendations, setFormRecommendations] = useState('')
  const [formFollowUp, setFormFollowUp] = useState('')

  const fetchVisits = useCallback(async () => {
    try {
      const res = await fetch('/api/farm-visits')
      if (res.ok) {
        const data = await res.json()
        setVisits(data.visits || data || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  const fetchFarmers = useCallback(async () => {
    try {
      const res = await fetch('/api/farmers?limit=200')
      if (res.ok) {
        const data = await res.json()
        setFarmers(data.farmers || data || [])
      }
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { fetchVisits(); fetchFarmers() }, [fetchVisits, fetchFarmers])

  useEffect(() => {
    if (selectedFarmerId) {
      setHistoryFarmer(selectedFarmerId)
      setActiveTab('history')
      setActiveSubTab('history')
    }
  }, [selectedFarmerId])

  const loadTab = (tab: string) => { setActiveTab(tab); setActiveSubTab(tab) }

  const resetForm = () => {
    setFormFarmer(''); setFormDate(''); setFormTopic('')
    setFormObservations(''); setFormRecommendations(''); setFormFollowUp('')
  }

  const handleSubmit = async () => {
    if (!formFarmer) { toast.error('Please select a farmer'); return }
    if (!formDate) { toast.error('Please select a date'); return }
    if (!formTopic) { toast.error('Please select a topic'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/farm-visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerId: formFarmer,
          visitDate: new Date(formDate).toISOString(),
          topic: formTopic,
          observations: formObservations,
          recommendations: formRecommendations,
          followUpDate: formFollowUp ? new Date(formFollowUp).toISOString() : null,
          extensionOfficerId: user?.userId,
          status: 'SCHEDULED',
        }),
      })
      if (res.ok) {
        toast.success('Farm visit scheduled successfully')
        setDialogOpen(false); resetForm(); fetchVisits()
      } else { toast.error('Failed to schedule visit') }
    } catch { toast.error('Network error') }
    finally { setSubmitting(false) }
  }

  const filtered = visits.filter((v: any) => {
    const name = v.farmer ? `${v.farmer.firstName} ${v.farmer.lastName}` : ''
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.status?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const now = new Date()
  const totalVisits = visits.length
  const thisMonth = visits.filter((v: any) => {
    const d = new Date(v.visitDate)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const scheduled = visits.filter((v: any) => v.status === 'SCHEDULED').length
  const completed = visits.filter((v: any) => v.status === 'COMPLETED').length

  const topicCounts = VISIT_TOPICS.map(topic => ({
    topic,
    count: visits.filter((v: any) => v.topic === topic).length,
  })).filter(t => t.count > 0)

  // Calendar helpers
  const calendarYear = calendarMonth.getFullYear()
  const calendarMonthIdx = calendarMonth.getMonth()
  const firstDay = new Date(calendarYear, calendarMonthIdx, 1).getDay()
  const daysInMonth = new Date(calendarYear, calendarMonthIdx + 1, 0).getDate()
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const visitDates = new Set(
    visits
      .filter((v: any) => {
        const d = new Date(v.visitDate)
        return d.getMonth() === calendarMonthIdx && d.getFullYear() === calendarYear
      })
      .map((v: any) => new Date(v.visitDate).getDate())
  )

  // Farmer visit history
  const historyVisits = visits
    .filter((v: any) => v.farmerId === historyFarmer)
    .sort((a: any, b: any) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())

  const historyFarmerName = farmers.find((f: any) => f.id === historyFarmer)
    ? `${farmers.find((f: any) => f.id === historyFarmer).firstName} ${farmers.find((f: any) => f.id === historyFarmer).lastName}`
    : 'Select a farmer'

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
              <Tractor className="w-5 h-5 text-emerald-600" />
            </div>
            <div><p className="text-xs text-muted-foreground">Total Visits</p><p className="text-xl font-bold">{totalVisits}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div><p className="text-xs text-muted-foreground">This Month</p><p className="text-xl font-bold">{thisMonth}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div><p className="text-xs text-muted-foreground">Scheduled</p><p className="text-xl font-bold">{scheduled}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div><p className="text-xs text-muted-foreground">Completed</p><p className="text-xl font-bold">{completed}</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={loadTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="schedule">Schedule Visit</TabsTrigger>
          <TabsTrigger value="history">Visit History</TabsTrigger>
        </TabsList>

        {/* Tab 1: Visits */}
        <TabsContent value="visits" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search visits..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Button onClick={() => { resetForm(); setDialogOpen(true) }} className="gap-2">
              <Plus className="w-4 h-4" /> Schedule Visit
            </Button>
          </div>

          {/* Mini Calendar */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Visit Calendar</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(new Date(calendarYear, calendarMonthIdx - 1, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[140px] text-center">
                    {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(new Date(calendarYear, calendarMonthIdx + 1, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="font-medium text-muted-foreground py-1">{d}</div>
                ))}
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {calendarDays.map(day => (
                  <div
                    key={day}
                    className={`p-2 rounded-md text-sm relative ${
                      visitDates.has(day) ? 'bg-emerald-100 dark:bg-emerald-900/40 font-bold text-emerald-700 dark:text-emerald-300' : 'hover:bg-muted/50'
                    } ${day === now.getDate() && calendarMonthIdx === now.getMonth() && calendarYear === now.getFullYear() ? 'ring-2 ring-emerald-500' : ''}`}
                  >
                    {day}
                    {visitDates.has(day) && <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Visits Table */}
          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          <Tractor className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No farm visits found
                        </TableCell>
                      </TableRow>
                    ) : filtered.map((v: any) => {
                      const name = v.farmer ? `${v.farmer.firstName} ${v.farmer.lastName}` : 'Unknown'
                      const sc = STATUS_CONFIG[v.status] || STATUS_CONFIG.SCHEDULED
                      return (
                        <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedVisit(v); setDetailOpen(true) }}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(v.visitDate).toLocaleDateString()}</TableCell>
                          <TableCell><Badge variant="outline">{v.topic}</Badge></TableCell>
                          <TableCell><Badge className={sc.class}>{sc.label}</Badge></TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedVisit(v); setDetailOpen(true) }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Topics Bar Chart */}
          {topicCounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Topics Covered</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ count: { label: 'Visits', color: '#059669' } }} className="h-[250px] w-full">
                  <BarChart data={topicCounts} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="topic" type="category" width={120} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Visits">
                      {topicCounts.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Schedule Visit Form */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Farm Visit</CardTitle>
              <CardDescription>Individual training visit by an extension officer to a farmer&apos;s field.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Farmer</Label>
                  <Select value={formFarmer} onValueChange={setFormFarmer}>
                    <SelectTrigger><SelectValue placeholder="Choose a farmer..." /></SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {farmers.map((f: any) => (
                        <SelectItem key={f.id} value={f.id}>{f.firstName} {f.lastName} — {f.phone || 'No phone'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Visit Date</Label>
                  <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Select value={formTopic} onValueChange={setFormTopic}>
                    <SelectTrigger><SelectValue placeholder="Select topic..." /></SelectTrigger>
                    <SelectContent>
                      {VISIT_TOPICS.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Follow-up Date (optional)</Label>
                  <Input type="date" value={formFollowUp} onChange={e => setFormFollowUp(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observations</Label>
                <Textarea
                  placeholder="What did you observe during the visit? Soil condition, crop health, pest issues..."
                  value={formObservations} onChange={e => setFormObservations(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Recommendations</Label>
                <Textarea
                  placeholder="What recommendations do you have for the farmer?"
                  value={formRecommendations} onChange={e => setFormRecommendations(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {submitting ? 'Scheduling...' : 'Schedule Visit'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Visit History (per farmer timeline) */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label className="mb-1 block">Select Farmer</Label>
              <Select value={historyFarmer} onValueChange={setHistoryFarmer}>
                <SelectTrigger><SelectValue placeholder="Choose a farmer..." /></SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  {farmers.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.firstName} {f.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {historyFarmer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Visit Timeline — {historyFarmerName}
                </CardTitle>
                <CardDescription>{historyVisits.length} visit(s) recorded</CardDescription>
              </CardHeader>
              <CardContent>
                {historyVisits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tractor className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No visits recorded for this farmer</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96 pr-3">
                    <div className="relative pl-6 space-y-6 border-l-2 border-emerald-200 dark:border-emerald-800 ml-2">
                      {historyVisits.map((v: any) => {
                        const sc = STATUS_CONFIG[v.status] || STATUS_CONFIG.SCHEDULED
                        return (
                          <div key={v.id} className="relative">
                            <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-background ${
                              v.status === 'COMPLETED' ? 'bg-emerald-500' : v.status === 'SCHEDULED' ? 'bg-blue-500' : 'bg-red-500'
                            }`} />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold">{new Date(v.visitDate).toLocaleDateString()}</span>
                                <Badge variant="outline">{v.topic}</Badge>
                                <Badge className={sc.class}>{sc.label}</Badge>
                              </div>
                              {v.observations && <p className="text-sm text-muted-foreground">{v.observations}</p>}
                              {v.recommendations && (
                                <p className="text-sm"><span className="font-medium">Recommendations:</span> {v.recommendations}</p>
                              )}
                              {v.followUpDate && (
                                <p className="text-xs text-muted-foreground">
                                  Follow-up: {new Date(v.followUpDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Visit Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Farm Visit Details</DialogTitle>
          </DialogHeader>
          {selectedVisit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Farmer:</span> <span className="font-medium">{selectedVisit.farmer ? `${selectedVisit.farmer.firstName} ${selectedVisit.farmer.lastName}` : 'Unknown'}</span></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(selectedVisit.visitDate).toLocaleDateString()}</div>
                <div><span className="text-muted-foreground">Topic:</span> <Badge variant="outline">{selectedVisit.topic}</Badge></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={STATUS_CONFIG[selectedVisit.status]?.class}>{STATUS_CONFIG[selectedVisit.status]?.label}</Badge></div>
              </div>
              {selectedVisit.observations && (
                <div className="text-sm border-t pt-3"><span className="text-muted-foreground">Observations:</span><p className="mt-1">{selectedVisit.observations}</p></div>
              )}
              {selectedVisit.recommendations && (
                <div className="text-sm border-t pt-3"><span className="text-muted-foreground">Recommendations:</span><p className="mt-1">{selectedVisit.recommendations}</p></div>
              )}
              {selectedVisit.followUpDate && (
                <div className="text-sm border-t pt-3"><span className="text-muted-foreground">Follow-up Date:</span> {new Date(selectedVisit.followUpDate).toLocaleDateString()}</div>
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