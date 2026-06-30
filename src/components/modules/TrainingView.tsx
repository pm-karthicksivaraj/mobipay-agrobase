'use client'
import { safeFetch, extractArray } from '@/lib/safe-fetch'

import React, { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  GraduationCap, Calendar, MapPin, Users, Plus, Clock, CheckCircle, Eye
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

export default function TrainingView() {
  const [trainings, setTrainings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTrainings = useCallback(async () => {
    try {
      const data = await safeFetch('/api/trainings')
      if (!data) { setLoading(false); return }
      setTrainings(extractArray(data, 'trainings'))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTrainings() }, [fetchTrainings])

  if (loading) return <TrainingSkeleton />

  const totalAttendees = trainings.reduce((s: number, t: any) => s + (t._count?.attendance || 0), 0)
  const totalPresent = trainings.reduce((s: number, t: any) => {
    return s + (t.attendance?.filter((a: any) => a.attended)?.length || 0)
  }, 0)

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Trainings</p><p className="text-xl font-bold">{trainings.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Attendees</p><p className="text-xl font-bold">{totalAttendees}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-muted-foreground">Present</p><p className="text-xl font-bold">{totalPresent}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center"><Calendar className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Attendance Rate</p><p className="text-xl font-bold">{totalAttendees > 0 ? Math.round((totalPresent / totalAttendees) * 100) : 0}%</p></div>
        </CardContent></Card>
      </div>

      {/* Training List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {trainings.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No trainings scheduled</p>
            <p className="text-sm mt-1">Trainings will appear here once scheduled</p>
          </div>
        ) : (
          trainings.map((t: any) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm truncate">{t.topic}</h4>
                    {t.trainerName && <p className="text-xs text-muted-foreground">Trainer: {t.trainerName}</p>}
                  </div>
                </div>
                {t.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{t.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{t.date ? new Date(t.date).toLocaleDateString() : '—'}</div>
                  {t.location && <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.location}</div>}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    <Users className="w-3 h-3 mr-1" />{t._count?.attendance || 0} registered
                  </Badge>
                  {t._count?.attendance > 0 && (
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {t.attendance?.filter((a: any) => a.attended)?.length || 0} present
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function TrainingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full rounded" /></CardContent></Card>)}
      </div>
      <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}</div>
    </div>
  )
}