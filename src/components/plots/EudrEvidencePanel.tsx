'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Shield, FileText, Satellite, MapPin, Link2, CheckCircle,
  AlertTriangle, XCircle, Clock, ChevronDown, ChevronUp,
  Loader2, Send, Download, TreePine, BarChart3, Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────

interface EvidenceCategory {
  category: string
  label: string
  status: 'PRESENT' | 'PARTIAL' | 'MISSING' | 'EXPIRED'
  itemCount: number
  requiredItems: number
  items: Array<{
    id: string
    label: string
    status: 'VALID' | 'INVALID' | 'EXPIRED' | 'PENDING'
    date?: string
    details?: string
  }>
}

interface EvidencePack {
  plotId: string
  plotCode: string
  plotName: string
  generatedAt: string
  eudrReference: string | null
  overallStatus: 'COMPLETE' | 'PARTIAL' | 'INCOMPLETE' | 'NON_COMPLIANT'
  completenessScore: number
  evidenceCategories: EvidenceCategory[]
  riskAssessment: {
    overallScore: number
    riskLevel: string
    forestProximity: { score: number; details: string }
    historicalDeforestation: { score: number; details: string }
    countryRisk: { score: number; details: string; country: string }
    plotSize: { score: number; details: string }
    documentation: { score: number; details: string }
  } | null
  deforestationEvidence: {
    deforestationFree: boolean
    confidence: number
    currentNdvi: number
    baselineNdvi: number
    ndviChange: number
    severity: string
    satelliteSource: string
    recommendations: string[]
  } | null
  geolocationEvidence: {
    hasBoundary: boolean
    areaHectares: number | null
    pointCount: number
    gpsVerificationDate: string | null
    gpsAccuracyMeters: number | null
    boundaryMatchPercent: number | null
    verificationStatus: string
  } | null
  documentEvidence: Array<{
    id: string
    docType: string
    title: string
    issuedBy: string | null
    issuedAt: string | null
    expiresAt: string | null
    isVerified: boolean
    isExpired: boolean
    isRequired: boolean
  }>
  verificationAudit: Array<{
    id: string
    verificationType: string
    result: string
    verifiedBy: string | null
    verifiedAt: string | null
    boundaryMatchPercent: number | null
    notes: string | null
  }>
  recommendations: string[]
}

// ─── Component ────────────────────────────────────────────────────

export default function EudrEvidencePanel({ plotId, plotCode }: { plotId: string; plotCode: string }) {
  const [pack, setPack] = useState<EvidencePack | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['GEOLOCATION', 'DEFORESTATION', 'RISK_ASSESSMENT'])
  )

  useEffect(() => {
    setLoading(true)
    fetch(`/api/plots/${plotId}/eudr-evidence`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.statusText)))
      .then(data => { setPack(data); setLoading(false) })
      .catch(err => { toast.error('Failed to load evidence pack'); setLoading(false) })
  }, [plotId])

  const handleSubmitEudr = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/plots/${plotId}/eudr-evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit-eudr' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`EUDR submitted! Ref: ${data.complianceRef}`)
      } else {
        toast.error(`Submission failed: ${data.errors.join(', ')}`)
      }
    } catch {
      toast.error('EUDR submission failed')
    }
    setSubmitting(false)
  }

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) { next.delete(cat) } else { next.add(cat) }
      return next
    })
  }

  const STATUS_STYLES: Record<string, string> = {
    COMPLETE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    PARTIAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    INCOMPLETE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    NON_COMPLIANT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  }

  const CAT_STATUS_STYLES: Record<string, string> = {
    PRESENT: 'text-emerald-600',
    PARTIAL: 'text-amber-600',
    MISSING: 'text-red-600',
    EXPIRED: 'text-orange-600',
  }

  const ITEM_STATUS_ICONS: Record<string, React.ReactNode> = {
    VALID: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
    PENDING: <Clock className="w-3.5 h-3.5 text-amber-500" />,
    INVALID: <XCircle className="w-3.5 h-3.5 text-red-500" />,
    EXPIRED: <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />,
  }

  const CAT_ICONS: Record<string, React.ReactNode> = {
    GEOLOCATION: <MapPin className="w-4 h-4" />,
    DEFORESTATION: <TreePine className="w-4 h-4" />,
    RISK_ASSESSMENT: <BarChart3 className="w-4 h-4" />,
    LEGAL_DOCUMENTS: <FileText className="w-4 h-4" />,
    TRACEABILITY: <Link2 className="w-4 h-4" />,
  }

  if (loading) {
    return (
      <div className="space-y-4 p-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (!pack) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            EUDR Evidence Pack
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pack.eudrReference ? `Ref: ${pack.eudrReference}` : 'No EUDR reference yet'}
            {' · '}
            Generated: {new Date(pack.generatedAt).toLocaleString()}
          </p>
        </div>
        <Badge className={cn('text-xs', STATUS_STYLES[pack.overallStatus])}>
          {pack.overallStatus}
        </Badge>
      </div>

      {/* Completeness Score */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Evidence Completeness</span>
          <span className="font-bold">{pack.completenessScore}%</span>
        </div>
        <Progress value={pack.completenessScore} className="h-2" />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2.5 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Deforestation</p>
          <p className={cn('text-base font-bold mt-0.5', pack.deforestationEvidence?.deforestationFree ? 'text-emerald-600' : 'text-red-600')}>
            {pack.deforestationEvidence?.deforestationFree ? 'Clear' : 'At Risk'}
          </p>
        </div>
        <div className="text-center p-2.5 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Risk Level</p>
          <Badge variant="secondary" className="mt-1">
            {pack.riskAssessment?.riskLevel ?? 'N/A'}
          </Badge>
        </div>
        <div className="text-center p-2.5 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Risk Score</p>
          <p className="text-base font-bold mt-0.5">{pack.riskAssessment?.overallScore ?? '—'}/100</p>
        </div>
      </div>

      {/* Evidence Categories (Accordion) */}
      <div className="space-y-2">
        {pack.evidenceCategories.map(cat => {
          const isExpanded = expandedCategories.has(cat.category)
          const statusIcon = cat.status === 'PRESENT'
            ? <CheckCircle className="w-4 h-4 text-emerald-500" />
            : cat.status === 'PARTIAL'
              ? <AlertTriangle className="w-4 h-4 text-amber-500" />
              : <XCircle className="w-4 h-4 text-red-500" />

          return (
            <Card key={cat.category} className="overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                onClick={() => toggleCategory(cat.category)}
              >
                <div className="flex items-center gap-2.5">
                  {CAT_ICONS[cat.category] ?? <FileText className="w-4 h-4" />}
                  <div>
                    <span className="text-sm font-medium">{cat.label}</span>
                    <span className={cn('ml-2 text-xs font-medium', CAT_STATUS_STYLES[cat.status])}>
                      {cat.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{cat.itemCount}/{cat.requiredItems}</span>
                  {statusIcon}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t px-3 pb-3">
                  <div className="divide-y">
                    {cat.items.map(item => (
                      <div key={item.id} className="flex items-start gap-2.5 py-2">
                        <div className="mt-0.5">{ITEM_STATUS_ICONS[item.status] ?? ITEM_STATUS_ICONS.PENDING}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{item.label}</p>
                          {item.details && <p className="text-xs text-muted-foreground mt-0.5">{item.details}</p>}
                          {item.date && <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(item.date).toLocaleDateString()}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Category-specific detail */}
                  {cat.category === 'RISK_ASSESSMENT' && pack.riskAssessment && (
                    <div className="mt-3 space-y-2">
                      <RiskFactorBar label="Forest Proximity" score={pack.riskAssessment.forestProximity.score} max={25} details={pack.riskAssessment.forestProximity.details} />
                      <RiskFactorBar label="Historical Deforestation" score={pack.riskAssessment.historicalDeforestation.score} max={25} details={pack.riskAssessment.historicalDeforestation.details} />
                      <RiskFactorBar label="Country Risk" score={pack.riskAssessment.countryRisk.score} max={20} details={pack.riskAssessment.countryRisk.details} />
                      <RiskFactorBar label="Plot Size" score={pack.riskAssessment.plotSize.score} max={15} details={pack.riskAssessment.plotSize.details} />
                      <RiskFactorBar label="Documentation" score={pack.riskAssessment.documentation.score} max={15} details={pack.riskAssessment.documentation.details} />
                    </div>
                  )}

                  {cat.category === 'DEFORESTATION' && pack.deforestationEvidence && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">Current NDVI</span>
                        <p className="font-mono font-bold">{pack.deforestationEvidence.currentNdvi.toFixed(3)}</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">Baseline NDVI</span>
                        <p className="font-mono font-bold">{pack.deforestationEvidence.baselineNdvi.toFixed(3)}</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">NDVI Change</span>
                        <p className={cn('font-mono font-bold', pack.deforestationEvidence.ndviChange < -0.05 ? 'text-red-600' : 'text-emerald-600')}>
                          {pack.deforestationEvidence.ndviChange > 0 ? '+' : ''}{pack.deforestationEvidence.ndviChange.toFixed(3)}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">Confidence</span>
                        <p className="font-mono font-bold">{Math.round(pack.deforestationEvidence.confidence * 100)}%</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Recommendations */}
      {pack.recommendations.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-3 pb-0">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-2">
            <ul className="space-y-1.5">
              {pack.recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Verification Audit Trail */}
      {pack.verificationAudit.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold mb-2">Verification Audit Trail</h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {pack.verificationAudit.map(v => (
              <div key={v.id} className="flex items-center justify-between p-2 rounded-lg border text-xs">
                <div className="flex items-center gap-2">
                  {v.result === 'PASSED' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  <span className="font-medium">{v.verificationType}</span>
                  {v.boundaryMatchPercent && <span className="text-muted-foreground">{v.boundaryMatchPercent}% match</span>}
                </div>
                <span className="text-muted-foreground">{v.verifiedAt ? new Date(v.verifiedAt).toLocaleDateString() : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <Separator />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="gap-1.5"
          disabled={submitting || pack.overallStatus === 'NON_COMPLIANT'}
          onClick={handleSubmitEudr}
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Submit to EUDR
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
          const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `eudr-evidence-${plotCode}.json`
          a.click()
          URL.revokeObjectURL(url)
          toast.success('Evidence pack downloaded')
        }}>
          <Download className="w-3.5 h-3.5" />
          Export JSON
        </Button>
      </div>
    </div>
  )
}

// ─── Risk Factor Bar ──────────────────────────────────────────────

function RiskFactorBar({ label, score, max, details }: { label: string; score: number; max: number; details: string }) {
  const pct = Math.round((score / max) * 100)
  const color = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-[11px]">{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{details}</p>
    </div>
  )
}