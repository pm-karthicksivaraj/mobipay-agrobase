'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  UserPlus, Sprout, MapPin, GraduationCap, PiggyBank, DollarSign,
  Receipt, Leaf, Activity, Award, CheckCircle, Calendar, MapPin as Location
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

interface TimelineEvent {
  id: string
  date: string
  type: 'REGISTRATION' | 'FARM_LAND' | 'CULTIVATION' | 'TRAINING' | 'SAVING' | 'LOAN' | 'SALE' | 'FARM_VISIT' | 'IMPACT' | 'CARBON'
  title: string
  description?: string
  icon: React.ElementType
  color: string
}

interface FarmerTimelineProps {
  farmerId: string
}

export function FarmerTimeline({ farmerId }: FarmerTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/farmers/${farmerId}`)
      .then(r => r.json())
      .then(data => {
        const farmer = data.data || data.farmer || data
        const timeline: TimelineEvent[] = []

        // Registration event
        if (farmer.createdAt) {
          timeline.push({
            id: 'reg',
            date: farmer.createdAt,
            type: 'REGISTRATION',
            title: 'Farmer Registered',
            description: `${farmer.firstName} ${farmer.lastName} was registered${farmer.farmerCode ? ` with code ${farmer.farmerCode}` : ''}`,
            icon: UserPlus,
            color: 'bg-emerald-500',
          })
        }

        // Farm lands
        ;(farmer.farms || []).forEach((farm: any, i: number) => {
          timeline.push({
            id: `farm-${farm.id}`,
            date: farm.createdAt,
            type: 'FARM_LAND',
            title: `Farm Land: ${farm.name}`,
            description: `${farm.sizeHectares?.toFixed(2) || '—'} ha${farm.landOwnership ? ` · ${farm.landOwnership}` : ''}`,
            icon: MapPin,
            color: 'bg-blue-500',
          })

          // Cultivations under this farm
          ;(farm.cultivations || []).forEach((c: any) => {
            timeline.push({
              id: `cult-${c.id}`,
              date: c.createdAt,
              type: 'CULTIVATION',
              title: `Cultivation: ${c.cropName}`,
              description: `${c.variety ? c.variety + ' · ' : ''}${c.cultivationAreaHa?.toFixed(2) || '—'} ha${c.season ? ` · ${c.season}` : ''}`,
              icon: Sprout,
              color: 'bg-green-500',
            })
          })
        })

        // Trainings
        ;(farmer.trainings || []).forEach((ta: any) => {
          if (ta.training) {
            timeline.push({
              id: `train-${ta.id}`,
              date: ta.training.date || ta.createdAt,
              type: 'TRAINING',
              title: `Training: ${ta.training.topic}`,
              description: `${ta.attended ? '✓ Attended' : '✗ Absent'}${ta.training.trainerName ? ` · Trainer: ${ta.training.trainerName}` : ''}`,
              icon: GraduationCap,
              color: ta.attended ? 'bg-purple-500' : 'bg-gray-400',
            })
          }
        })

        // Savings
        ;(farmer.savings || []).forEach((s: any) => {
          timeline.push({
            id: `sav-${s.id}`,
            date: s.createdAt,
            type: 'SAVING',
            title: `VSLA Saving: UGX ${s.amount?.toLocaleString()}`,
            description: `${s.sharesBought} shares${s.vslaGroup?.name ? ` · ${s.vslaGroup.name}` : ''}`,
            icon: PiggyBank,
            color: 'bg-amber-500',
          })
        })

        // Loans
        ;(farmer.vslaLoans || []).forEach((l: any) => {
          timeline.push({
            id: `loan-${l.id}`,
            date: l.createdAt,
            type: 'LOAN',
            title: `VSLA Loan: UGX ${l.amount?.toLocaleString()}`,
            description: `Status: ${l.status}${l.purpose ? ` · ${l.purpose}` : ''}`,
            icon: DollarSign,
            color: 'bg-pink-500',
          })
        })

        // Sales
        ;(farmer.sales || []).forEach((s: any) => {
          timeline.push({
            id: `sale-${s.id}`,
            date: s.createdAt,
            type: 'SALE',
            title: `Sale: ${s.commodity || s.product || 'Produce'}`,
            description: `${s.quantity ? `${s.quantity} ${s.unit || 'kg'}` : ''} · UGX ${s.totalAmount?.toLocaleString() || s.netAmount?.toLocaleString() || '—'}`,
            icon: Receipt,
            color: 'bg-cyan-500',
          })
        })

        // Farm visits
        ;(farmer.farmVisits || []).forEach((v: any) => {
          timeline.push({
            id: `visit-${v.id}`,
            date: v.visitDate || v.createdAt,
            type: 'FARM_VISIT',
            title: `Farm Visit`,
            description: v.purpose || v.notes || 'Field visit conducted',
            icon: Leaf,
            color: 'bg-teal-500',
          })
        })

        // Impact assessments
        ;(farmer.impactAssessments || []).forEach((a: any) => {
          timeline.push({
            id: `impact-${a.id}`,
            date: a.assessmentDate || a.createdAt,
            type: 'IMPACT',
            title: `Impact Assessment`,
            description: `Score: ${a.score || '—'}/100${a.category ? ` · ${a.category}` : ''}`,
            icon: Activity,
            color: 'bg-indigo-500',
          })
        })

        // Practice adoptions (Mazao Safi)
        ;(farmer.practiceAdoptions || []).forEach((p: any) => {
          timeline.push({
            id: `practice-${p.id}`,
            date: p.adoptedAt,
            type: 'CARBON',
            title: `Mazao Safi Practice: ${p.practiceCode}`,
            description: `${p.frameworkVariant} · ${p.cropType}${p.verificationStatus ? ` · ${p.verificationStatus}` : ''}`,
            icon: Award,
            color: 'bg-emerald-600',
          })
        })

        // Sort by date descending (most recent first)
        timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        setEvents(timeline)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [farmerId])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No timeline events yet</p>
        <p className="text-sm mt-1">Events will appear as the farmer's journey progresses</p>
      </div>
    )
  }

  // Group events by type for summary
  const summary = events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {summary.REGISTRATION > 0 && <Badge variant="outline" className="gap-1"><UserPlus className="w-3 h-3" /> {summary.REGISTRATION} Registration</Badge>}
        {summary.FARM_LAND > 0 && <Badge variant="outline" className="gap-1"><MapPin className="w-3 h-3" /> {summary.FARM_LAND} Farm Lands</Badge>}
        {summary.CULTIVATION > 0 && <Badge variant="outline" className="gap-1"><Sprout className="w-3 h-3" /> {summary.CULTIVATION} Cultivations</Badge>}
        {summary.TRAINING > 0 && <Badge variant="outline" className="gap-1"><GraduationCap className="w-3 h-3" /> {summary.TRAINING} Trainings</Badge>}
        {summary.SAVING > 0 && <Badge variant="outline" className="gap-1"><PiggyBank className="w-3 h-3" /> {summary.SAVING} Savings</Badge>}
        {summary.LOAN > 0 && <Badge variant="outline" className="gap-1"><DollarSign className="w-3 h-3" /> {summary.LOAN} Loans</Badge>}
        {summary.SALE > 0 && <Badge variant="outline" className="gap-1"><Receipt className="w-3 h-3" /> {summary.SALE} Sales</Badge>}
        {summary.FARM_VISIT > 0 && <Badge variant="outline" className="gap-1"><Leaf className="w-3 h-3" /> {summary.FARM_VISIT} Visits</Badge>}
        {summary.IMPACT > 0 && <Badge variant="outline" className="gap-1"><Activity className="w-3 h-3" /> {summary.IMPACT} Assessments</Badge>}
        {summary.CARBON > 0 && <Badge variant="outline" className="gap-1"><Award className="w-3 h-3" /> {summary.CARBON} Practices</Badge>}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-muted" />

        <div className="space-y-4">
          {events.map((event, i) => {
            const Icon = event.icon
            return (
              <div key={event.id} className="relative flex gap-4">
                {/* Node */}
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 z-10', event.color)}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      {event.description && <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                      {event.date ? new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
