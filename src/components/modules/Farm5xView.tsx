'use client'

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  Layers, Leaf, Shield, TrendingDown, CheckCircle, Circle, Award, Globe,
  BookOpen, Sprout, TreePine, Fish, Trees, Flower, Apple, Wheat, Milk, Coffee
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { FARM5X_VARIANTS, type Farm5xVariantDefinition, type Farm5xPractice } from '@/lib/farm5x/definitions'

const ICON_MAP: Record<string, React.ElementType> = {
  '🌾': Sprout, '☕': Coffee, '🌽': Wheat, '🍫': Sprout, '🌱': Leaf,
  '🐄': Milk, '🥬': Sprout, '🍎': Apple, '🐟': Fish, '🌳': TreePine,
  '🌺': Flower, '🌲': Trees,
}

export default function Farm5xView() {
  const [selectedVariant, setSelectedVariant] = useState<Farm5xVariantDefinition>(FARM5X_VARIANTS[1]) // default: Coffee
  const [adoptedPractices, setAdoptedPractices] = useState<Set<string>>(new Set())

  const togglePractice = (code: string) => {
    setAdoptedPractices(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const allPractices: Farm5xPractice[] = useMemo(() => {
    return [selectedVariant.mandatoryPractice, ...selectedVariant.reducePractices]
  }, [selectedVariant])

  const adoptedCount = allPractices.filter(p => adoptedPractices.has(p.code)).length
  const totalReduction = allPractices
    .filter(p => adoptedPractices.has(p.code))
    .reduce((s, p) => s + p.emissionReductionPct, 0)
  const qualifiesForCredits = adoptedPractices.has(selectedVariant.mandatoryPractice.code) &&
    selectedVariant.reducePractices.filter(p => adoptedPractices.has(p.code)).length >= 5

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2"><Layers className="w-5 h-5 text-emerald-600" /> Farm5X &amp; DREAM MRV</h3>
        <p className="text-sm text-muted-foreground">
          1 Mandatory practice + 5 Reduce practices per crop vertical · DREAM 5-phase MRV pipeline · Verra VM0042 / Gold Standard eligible
        </p>
      </div>

      <Tabs defaultValue="calculator">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="calculator">Practice Calculator</TabsTrigger>
          <TabsTrigger value="variants">All 10 Verticals</TabsTrigger>
          <TabsTrigger value="dream">DREAM Pipeline</TabsTrigger>
        </TabsList>

        {/* Calculator */}
        <TabsContent value="calculator" className="mt-4 space-y-4">
          {/* Variant selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2">
            {FARM5X_VARIANTS.map(v => {
              const Icon = ICON_MAP[v.icon] || Sprout
              const isActive = v.variant === selectedVariant.variant
              return (
                <button
                  key={v.variant}
                  onClick={() => { setSelectedVariant(v); setAdoptedPractices(new Set()) }}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1',
                    isActive
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  )}
                >
                  <Icon className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="text-[10px] font-mono">{v.variant}</span>
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">{v.cropLabel}</span>
                </button>
              )
            })}
          </div>

          {/* Selected variant header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                  {React.createElement(ICON_MAP[selectedVariant.icon] || Sprout, { className: 'w-7 h-7 text-emerald-600' })}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{selectedVariant.variant} — {selectedVariant.cropLabel}</h2>
                  <p className="text-sm text-muted-foreground">Target: {selectedVariant.targetReduction}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">{selectedVariant.sustainabilityStandard}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adoption status */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Practices Adopted</p>
              <p className="text-2xl font-bold">{adoptedCount} / {allPractices.length}</p>
              <Progress value={(adoptedCount / allPractices.length) * 100} className="mt-2 h-2" />
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Emission Reduction</p>
              <p className="text-2xl font-bold text-emerald-600">{totalReduction}%</p>
              <p className="text-xs text-muted-foreground mt-1">cumulative (capped at 80%)</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Mandatory Practice</p>
              {adoptedPractices.has(selectedVariant.mandatoryPractice.code) ? (
                <p className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Adopted</p>
              ) : (
                <p className="text-sm font-bold text-red-600 mt-1 flex items-center gap-1"><Circle className="w-4 h-4" /> Required</p>
              )}
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Carbon Credit Eligible</p>
              {qualifiesForCredits ? (
                <p className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1"><Award className="w-4 h-4" /> Yes — Verified</p>
              ) : (
                <p className="text-sm font-bold text-amber-600 mt-1">Need 1M + all 5R</p>
              )}
            </CardContent></Card>
          </div>

          {/* Practice cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Mandatory */}
            <PracticeCard
              practice={selectedVariant.mandatoryPractice}
              isAdopted={adoptedPractices.has(selectedVariant.mandatoryPractice.code)}
              onToggle={() => togglePractice(selectedVariant.mandatoryPractice.code)}
            />
            {/* Reduce practices */}
            {selectedVariant.reducePractices.map(p => (
              <PracticeCard
                key={p.code}
                practice={p}
                isAdopted={adoptedPractices.has(p.code)}
                onToggle={() => togglePractice(p.code)}
              />
            ))}
          </div>
        </TabsContent>

        {/* All Variants */}
        <TabsContent value="variants" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FARM5X_VARIANTS.map(v => (
              <Card key={v.variant} className="hover:shadow-md transition-shadow cursor-pointer" >
                <CardContent className="p-5" onClick={() => { setSelectedVariant(v); setAdoptedPractices(new Set()); (document.querySelector('[value="calculator"]') as HTMLButtonElement)?.click() }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                      {React.createElement(ICON_MAP[v.icon] || Sprout, { className: 'w-5 h-5 text-emerald-600' })}
                    </div>
                    <div>
                      <p className="font-bold">{v.variant}</p>
                      <p className="text-xs text-muted-foreground">{v.cropLabel}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Target reduction: <strong className="text-foreground">{v.targetReduction}</strong></p>
                  <Separator className="my-2" />
                  <p className="text-xs font-medium text-muted-foreground">Must practice:</p>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{v.mandatoryPractice.label}</p>
                  <Separator className="my-2" />
                  <p className="text-xs font-medium text-muted-foreground">5 Reduce practices:</p>
                  <ul className="text-xs mt-1 space-y-0.5">
                    {v.reducePractices.map(p => <li key={p.code} className="flex items-start gap-1"><span className="text-emerald-600">•</span><span>{p.label}</span></li>)}
                  </ul>
                  <Separator className="my-2" />
                  <p className="text-xs text-muted-foreground">IPCC: <span className="font-mono">{v.ipccEmissionModel.substring(0, 80)}...</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Standard: <strong>{v.sustainabilityStandard}</strong></p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* DREAM Pipeline */}
        <TabsContent value="dream" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> DREAM 5-Phase MRV Pipeline</CardTitle><CardDescription>Define → Register → Engage → Adopt → Measure. Per-cultivation lifecycle.</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <DreamPhase phase="D" name="Define" color="blue" desc="Register cultivation, plot polygon, baseline yield, soil type." dataSource={selectedVariant.dreamDataSources.D} />
                <DreamPhase phase="R" name="Register" color="purple" desc="Remote-sensing baseline: NDVI, deforestation, rainfall." dataSource={selectedVariant.dreamDataSources.R} />
                <DreamPhase phase="E" name="Engage" color="amber" desc="Event detection: practice adoption log, photo evidence, satellite alerts." dataSource={selectedVariant.dreamDataSources.E} />
                <DreamPhase phase="A" name="Adopt" color="emerald" desc="Analytics: IPCC emission factor applied, GHG reduction calculated." dataSource={selectedVariant.dreamDataSources.A} />
                <DreamPhase phase="M" name="Measure" color="pink" desc="Monitoring: weekly KPIs, carbon credit accrual, climate resilience score." dataSource={selectedVariant.dreamDataSources.M} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PracticeCard({ practice, isAdopted, onToggle }: { practice: Farm5xPractice; isAdopted: boolean; onToggle: () => void }) {
  return (
    <Card className={cn('transition-all', isAdopted && 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/10')}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            className={cn(
              'mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
              isAdopted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/40 hover:border-primary'
            )}
          >
            {isAdopted && <CheckCircle className="w-4 h-4" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {practice.isMandatory ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">MUST</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">{practice.code.split('_')[1]}</Badge>
              )}
              <p className="font-medium text-sm">{practice.label}</p>
            </div>
            <p className="text-xs text-muted-foreground">{practice.description}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="text-[10px]">
                <TrendingDown className="w-3 h-3 mr-1" /> −{practice.emissionReductionPct}% GHG
              </Badge>
              <Badge variant="outline" className="text-[10px]">{practice.verificationMethod.replace(/_/g, ' ')}</Badge>
              {practice.carbonCreditEligible && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[10px]">
                  <Award className="w-3 h-3 mr-1" /> Credit Eligible
                </Badge>
              )}
            </div>
            <div className="flex gap-1 mt-2">
              {practice.sdgGoals.map(g => (
                <span key={g} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">SDG {g}</span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DreamPhase({ phase, name, color, desc, dataSource }: { phase: string; name: string; color: string; desc: string; dataSource: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    pink: 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800',
  }
  return (
    <div className={cn('p-4 rounded-lg border', colorMap[color])}>
      <div className="w-10 h-10 rounded-full bg-white dark:bg-background flex items-center justify-center text-lg font-bold mb-2">{phase}</div>
      <p className="font-semibold">{name}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      <Separator className="my-2" />
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Data source</p>
      <p className="text-xs font-mono">{dataSource}</p>
    </div>
  )
}
