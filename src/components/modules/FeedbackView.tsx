'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Search, X, Loader2, Filter, MessageSquare, CheckCircle, Clock,
  AlertCircle, Eye, MessageCircle, Star, ChevronDown, TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell } from 'recharts'

interface Feedback {
  id: string
  farmerName?: string
  farmerPhone?: string
  category: string
  message: string
  status: 'NEW' | 'REVIEWED' | 'RESOLVED'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  reviewNotes?: string
  reviewedBy?: string
  reviewedAt?: string
  resolvedAt?: string
  createdAt: string
}

const CATEGORIES = [
  'Complaint', 'Suggestion', 'Query', 'Compliment', 'Bug Report',
  'Training Request', 'Input Supply', 'Payment Issue', 'Market Access', 'Other'
]

const statusColor: Record<string, string> = {
  NEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  REVIEWED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const statusIcon: Record<string, React.ReactNode> = {
  NEW: <AlertCircle className="w-3.5 h-3.5" />,
  REVIEWED: <Eye className="w-3.5 h-3.5" />,
  RESOLVED: <CheckCircle className="w-3.5 h-3.5" />,
}

const priorityColor: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#10b981']

const DEMO_FEEDBACK: Feedback[] = [
  { id: '1', farmerName: 'Linda Nakasujja', farmerPhone: '+256 773 100008', category: 'Complaint', message: 'The fertilizer supplied last month was of poor quality. My maize crop showed signs of burning after application. I need a replacement or refund.', status: 'NEW', priority: 'HIGH', createdAt: '2024-04-15T08:30:00Z' },
  { id: '2', farmerName: 'David Wanyama', farmerPhone: '+256 783 100009', category: 'Suggestion', message: 'We would like the training sessions to be scheduled during the morning hours when most farmers are available. Afternoon sessions have low attendance.', status: 'REVIEWED', priority: 'MEDIUM', reviewNotes: 'Good suggestion. Will coordinate with training team for morning scheduling next quarter.', reviewedBy: 'Sarah Achieng', reviewedAt: '2024-04-14T10:00:00Z', createdAt: '2024-04-13T14:20:00Z' },
  { id: '3', farmerName: 'Rose Amodoi', farmerPhone: '+256 773 100013', category: 'Query', message: 'I have not received my payment for the coffee delivered on March 20th. The tracking number is COF-2024-0320. Please check the status.', status: 'REVIEWED', priority: 'HIGH', reviewNotes: 'Payment was delayed due to bank processing. Resolved with finance team - payment dispatched on April 12.', reviewedBy: 'Grace Nakamya', reviewedAt: '2024-04-13T09:15:00Z', createdAt: '2024-04-11T16:45:00Z' },
  { id: '4', farmerName: 'Maria Nakamya', farmerPhone: '+256 704 100010', category: 'Compliment', message: 'The new VSLA tracking system is excellent! Our group can now easily see our savings progress and loan repayment schedules. Thank you EKIBBO team!', status: 'RESOLVED', priority: 'LOW', reviewNotes: 'Thank you for the positive feedback! Shared with the development team.', reviewedBy: 'Agnes Birungi', reviewedAt: '2024-04-10T08:00:00Z', resolvedAt: '2024-04-10T08:00:00Z', createdAt: '2024-04-09T11:30:00Z' },
  { id: '5', farmerName: 'Charles Draku', farmerPhone: '+256 473 100011', category: 'Training Request', message: 'Our cooperative members need training on post-harvest handling techniques for sesame. We have 45 members interested in the upcoming season.', status: 'NEW', priority: 'MEDIUM', createdAt: '2024-04-15T07:00:00Z' },
  { id: '6', farmerName: 'Florence Akello', farmerPhone: '+256 783 100015', category: 'Input Supply', message: 'We need improved sesame seeds for the next planting season. The current variety is susceptible to drought conditions in our region.', status: 'NEW', priority: 'HIGH', createdAt: '2024-04-14T15:30:00Z' },
  { id: '7', farmerName: 'Peter Okello', farmerPhone: '+256 773 100003', category: 'Payment Issue', message: 'The loan deduction from my last payment was incorrect. I was supposed to pay UGX 50,000 but UGX 75,000 was deducted. Please investigate.', status: 'REVIEWED', priority: 'HIGH', reviewNotes: 'Under investigation with the loans department. Possible system calculation error on interest.', reviewedBy: 'Tom Otim', reviewedAt: '2024-04-14T11:00:00Z', createdAt: '2024-04-12T09:45:00Z' },
  { id: '8', farmerName: 'Hassan Wabwire', farmerPhone: '+256 758 100012', category: 'Market Access', message: 'We are looking for buyers for our organic sunflower produce. We have 2 tonnes ready for immediate sale. Can the marketplace team help connect us?', status: 'RESOLVED', priority: 'MEDIUM', reviewNotes: 'Connected with Tropical Commodity Traders. Meeting scheduled for April 16.', reviewedBy: 'John Mugisha', reviewedAt: '2024-04-13T14:00:00Z', resolvedAt: '2024-04-13T16:00:00Z', createdAt: '2024-04-10T10:20:00Z' },
  { id: '9', category: 'Bug Report', message: 'The mobile app crashes when I try to upload photos of my crops. This happens consistently on my Samsung Galaxy A12.', status: 'NEW', priority: 'MEDIUM', createdAt: '2024-04-15T06:15:00Z' },
  { id: '10', farmerName: 'Sarah Nambuya', farmerPhone: '+256 414 567890', category: 'Complaint', message: 'The coffee grading results for our last batch (BCH-2024-045) seem incorrect. We expected Grade 1 but received Grade 2 classification. Requesting re-evaluation.', status: 'REVIEWED', priority: 'HIGH', reviewNotes: 'Re-evaluation scheduled. Quality team to visit the cooperative on April 17.', reviewedBy: 'Grace Nakamya', reviewedAt: '2024-04-14T16:00:00Z', createdAt: '2024-04-13T08:00:00Z' },
  { id: '11', farmerName: 'Agnes Birungi', farmerPhone: '+256 773 876543', category: 'Suggestion', message: 'Can we add a feature to track individual tree growth in the agroforestry module? This would help monitor our climate resilience program progress.', status: 'RESOLVED', priority: 'LOW', reviewNotes: 'Feature request logged in product backlog. Estimated delivery Q3 2024.', reviewedBy: 'Admin User', reviewedAt: '2024-04-08T10:00:00Z', resolvedAt: '2024-04-08T10:30:00Z', createdAt: '2024-04-07T14:00:00Z' },
  { id: '12', category: 'Query', message: 'Anonymous inquiry: What are the requirements for a cooperative to become GLOBALG.A.P. certified? We are a group of 80 farmers in Eastern Uganda.', status: 'NEW', priority: 'LOW', createdAt: '2024-04-15T10:00:00Z' },
]

export default function FeedbackView() {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showReview, setShowReview] = useState<Feedback | null>(null)
  const [showResolve, setShowResolve] = useState<Feedback | null>(null)

  const fetchFeedback = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (categoryFilter) params.set('category', categoryFilter)
      const res = await fetch(`/api/modules?module=feedback&${params}`)
      if (res.ok) {
        const data = await res.json()
        if (data.feedback && data.feedback.length > 0) {
          setFeedback(data.feedback)
          setLoading(false)
          return
        }
      }
      setFeedback(DEMO_FEEDBACK)
    } catch {
      setFeedback(DEMO_FEEDBACK)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, categoryFilter])

  useEffect(() => { fetchFeedback() }, [fetchFeedback])

  const filtered = feedback.filter(f => {
    if (search && !f.message.toLowerCase().includes(search.toLowerCase()) && !(f.farmerName || '').toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && f.status !== statusFilter) return false
    if (categoryFilter && f.category !== categoryFilter) return false
    return true
  })

  const newCount = feedback.filter(f => f.status === 'NEW').length
  const reviewedCount = feedback.filter(f => f.status === 'REVIEWED').length
  const resolvedCount = feedback.filter(f => f.status === 'RESOLVED').length

  // Calculate avg resolution time (demo: random but realistic)
  const resolved = feedback.filter(f => f.status === 'RESOLVED' && f.resolvedAt && f.createdAt)
  const avgResolutionDays = resolved.length > 0
    ? (resolved.reduce((sum, f) => {
        const days = (new Date(f.resolvedAt!).getTime() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        return sum + days
      }, 0) / resolved.length).toFixed(1)
    : '—'

  // Category breakdown pie
  const catCounts = feedback.reduce<Record<string, number>>((acc, f) => { acc[f.category] = (acc[f.category] || 0) + 1; return acc }, {})
  const catPieData = Object.entries(catCounts).map(([name, value]) => ({ name, value }))
  const catPieConfig: ChartConfig = Object.fromEntries(catPieData.map((d, i) => [d.name, { label: d.name, color: PIE_COLORS[i % PIE_COLORS.length] }]))
  const CAT_PIE_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#6b7280']

  const handleReview = (notes: string) => {
    if (!showReview) return
    setFeedback(prev => prev.map(f => f.id === showReview.id ? { ...f, status: 'REVIEWED' as const, reviewNotes: notes, reviewedBy: 'Current User', reviewedAt: new Date().toISOString() } : f))
    toast.success('Feedback marked as reviewed')
    setShowReview(null)
  }

  const handleResolve = (notes: string) => {
    if (!showResolve) return
    setFeedback(prev => prev.map(f => f.id === showResolve.id ? { ...f, status: 'RESOLVED' as const, reviewNotes: notes, resolvedAt: new Date().toISOString() } : f))
    toast.success('Feedback marked as resolved')
    setShowResolve(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            Feedback Management
          </h3>
          <p className="text-sm text-muted-foreground">Farmer feedback collection, review, and resolution tracking</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">New</p>
              <p className="text-xl font-bold">{newCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reviewed</p>
              <p className="text-xl font-bold">{reviewedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Resolved</p>
              <p className="text-xl font-bold">{resolvedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Categories</p>
              <ChartContainer config={catPieConfig} className="h-[50px] w-[50px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={catPieData} cx="50%" cy="50%" innerRadius={8} outerRadius={22} dataKey="value" strokeWidth={1}>
                    {catPieData.map((_, i) => <Cell key={i} fill={CAT_PIE_COLORS[i % CAT_PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {catPieData.slice(0, 4).map((d, i) => (
                <span key={d.name} className="text-[10px] text-muted-foreground">{d.name} ({d.value})</span>
              )).reduce<React.ReactNode[]>((acc, el, i) => i > 0 ? [...acc, <span key={`sep-${i}`} className="text-[10px] text-muted-foreground">·</span>, el] : [el], [])}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avg Resolution Time */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg. Resolution Time</p>
              <p className="text-lg font-bold">{avgResolutionDays} {avgResolutionDays !== '—' ? 'days' : ''}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Resolution Rate</p>
            <p className="text-lg font-bold text-emerald-600">{feedback.length > 0 ? ((resolvedCount / feedback.length) * 100).toFixed(0) : 0}%</p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search feedback by message or farmer..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[150px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="REVIEWED">Reviewed</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {(statusFilter || categoryFilter || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(''); setCategoryFilter(''); setSearch('') }} className="gap-1">
            <X className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No feedback found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell">Message</TableHead>
                    <TableHead className="hidden sm:table-cell">Priority</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(f => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <Badge className={cn('text-[10px] gap-1', statusColor[f.status])}>
                          {statusIcon[f.status]} {f.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{f.farmerName || 'Anonymous'}</p>
                          {f.farmerPhone && <p className="text-[10px] text-muted-foreground">{f.farmerPhone}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-[10px]">{f.category}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <p className="text-sm text-muted-foreground truncate max-w-[280px]">{f.message}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {f.priority && <Badge className={cn('text-[10px]', priorityColor[f.priority])}>{f.priority}</Badge>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {f.status === 'NEW' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowReview(f)}>
                              <Eye className="w-3 h-3" /> Review
                            </Button>
                          )}
                          {f.status === 'REVIEWED' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-300" onClick={() => setShowResolve(f)}>
                              <CheckCircle className="w-3 h-3" /> Resolve
                            </Button>
                          )}
                          {f.reviewNotes && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="View notes">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!showReview} onOpenChange={() => setShowReview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Review Feedback
            </DialogTitle>
          </DialogHeader>
          {showReview && (
            <ReviewResolveForm
              feedback={showReview}
              actionLabel="Mark as Reviewed"
              onSubmit={handleReview}
              onClose={() => setShowReview(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={!!showResolve} onOpenChange={() => setShowResolve(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Resolve Feedback
            </DialogTitle>
          </DialogHeader>
          {showResolve && (
            <ReviewResolveForm
              feedback={showResolve}
              actionLabel="Mark as Resolved"
              onSubmit={handleResolve}
              onClose={() => setShowResolve(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReviewResolveForm({ feedback, actionLabel, onSubmit, onClose }: {
  feedback: Feedback; actionLabel: string; onSubmit: (notes: string) => void; onClose: () => void
}) {
  const [notes, setNotes] = useState(feedback.reviewNotes || '')
  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <p className="text-xs text-muted-foreground">From: {feedback.farmerName || 'Anonymous'}</p>
        <p className="text-sm">{feedback.message}</p>
      </div>
      <div className="space-y-1.5">
        <Label>Notes *</Label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add your review or resolution notes..."
          rows={4}
        />
      </div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button onClick={() => { if (!notes.trim()) { (toast as any).error('Please add notes'); return }; onSubmit(notes) }}>
          {actionLabel}
        </Button>
      </DialogFooter>
    </div>
  )
}