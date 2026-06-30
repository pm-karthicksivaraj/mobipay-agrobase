'use client'

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  BookOpen, Sprout, Coffee, Trees, Apple, Leaf, Fish, TreePine,
  Layers, ChevronRight, ArrowLeft, Ruler, Calendar, DollarSign, FlaskConical,
  Wheat, Flower, Milk
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { COFFEECORE_STAGES, type StageDefinition } from '@/lib/crop-stages/coffeecore-stages'
import { LIVECORE_STAGES, type LiveStageDefinition } from '@/lib/crop-stages/livecore-stages'
import {
  CROPCORE_STAGES, ORCHARDCORE_STAGES, VEGCORE_STAGES, AQUACORE_STAGES,
  FORESTCORE_STAGES, TIMBERCORE_STAGES, MANGROVECORE_STAGES, FLORACORE_STAGES
} from '@/lib/crop-stages/remaining-stages'

interface Vertical {
  id: string
  name: string
  label: string
  icon: React.ElementType
  color: string
  stages: any[]
  stageCount: number
  totalFields: number
  description: string
  crops: string[]
}

const VERTICALS: Vertical[] = [
  {
    id: 'coffeecore', name: 'CoffeeCore', label: 'Coffee & Cocoa', icon: Coffee, color: 'amber',
    stages: COFFEECORE_STAGES, stageCount: COFFEECORE_STAGES.length,
    totalFields: COFFEECORE_STAGES.reduce((s, st) => s + (st.sections?.reduce((ss, sec) => ss + (sec.fields?.length || 0), 0) || 0), 0),
    description: 'Complete coffee & cocoa production cycle from nursery to post-harvest. 12 stages with cost, carbon, and compliance tracking.',
    crops: ['Arabica Coffee', 'Robusta Coffee', 'Cocoa'],
  },
  {
    id: 'livecore', name: 'LiveCore', label: 'Livestock & Dairy', icon: Milk, color: 'blue',
    stages: LIVECORE_STAGES, stageCount: LIVECORE_STAGES.length,
    totalFields: LIVECORE_STAGES.reduce((s, st) => s + (st.sections?.reduce((ss, sec) => ss + (sec.fields?.length || 0), 0) || 0), 0),
    description: 'Livestock & dairy production cycle covering breeding, feeding, health, milking, and processing. IPCC Tier 2 enteric fermentation.',
    crops: ['Dairy Cattle', 'Beef Cattle', 'Goats', 'Sheep', 'Poultry'],
  },
  {
    id: 'cropcore', name: 'CropCore', label: 'Field Crops', icon: Wheat, color: 'emerald',
    stages: CROPCORE_STAGES, stageCount: CROPCORE_STAGES.length,
    totalFields: CROPCORE_STAGES.reduce((s, st) => s + (st.sections?.reduce((ss, sec) => ss + (sec.fields?.length || 0), 0) || 0), 0),
    description: 'Field crops: rice, maize, wheat, soybean. From land preparation to harvest. 11 stages with cost & emission tracking.',
    crops: ['Rice', 'Maize', 'Wheat', 'Soybean', 'Beans'],
  },
  {
    id: 'orchardcore', name: 'OrchardCore', label: 'Orchard Fruits', icon: Apple, color: 'red',
    stages: ORCHARDCORE_STAGES, stageCount: ORCHARDCORE_STAGES.length,
    totalFields: ORCHARDCORE_STAGES.reduce((s, st) => s + (st.sections?.reduce((ss, sec) => ss + (sec.fields?.length || 0), 0) || 0), 0),
    description: 'Orchard fruit production: mango, citrus, banana, avocado. Perennial crop cycle with flowering, fruiting, and harvest stages.',
    crops: ['Mango', 'Citrus', 'Banana', 'Avocado', 'Passion Fruit'],
  },
  {
    id: 'vegcore', name: 'VegCore', label: 'Vegetables', icon: Sprout, color: 'green',
    stages: VEGCORE_STAGES, stageCount: VEGCORE_STAGES.length,
    totalFields: VEGCORE_STAGES.reduce((s, st) => s + (st.sections?.reduce((ss, sec) => ss + (sec.fields?.length || 0), 0) || 0), 0),
    description: 'Vegetable production: tomato, onion, cabbage, peppers. Short-cycle crops with rotation planning and post-harvest handling.',
    crops: ['Tomato', 'Onion', 'Cabbage', 'Peppers', 'Carrot'],
  },
  {
    id: 'floracore', name: 'FloraCore', label: 'Floriculture', icon: Flower, color: 'pink',
    stages: FLORACORE_STAGES, stageCount: FLORACORE_STAGES.length,
    totalFields: FLORACORE_STAGES.reduce((s, st) => s + (st.sections?.reduce((ss, sec) => ss + (sec.fields?.length || 0), 0) || 0), 0),
    description: 'Cut flowers & ornamentals: rose, lily, carnation. Greenhouse and open-field cultivation with grading & export compliance.',
    crops: ['Rose', 'Lily', 'Carnation', 'Chrysanthemum'],
  },
  {
    id: 'aquacore', name: 'AquaCore', label: 'Aquaculture', icon: Fish, color: 'cyan',
    stages: AQUACORE_STAGES, stageCount: AQUACORE_STAGES.length,
    totalFields: AQUACORE_STAGES.reduce((s, st) => s + (st.sections?.reduce((ss, sec) => ss + (sec.fields?.length || 0), 0) || 0), 0),
    description: 'Aquaculture: tilapia, catfish, prawns. Pond preparation, stocking, feeding, water quality, harvest. 15 stages.',
    crops: ['Tilapia', 'Catfish', 'Prawns', 'Nile Perch'],
  },
  {
    id: 'forestcore', name: 'ForestCore', label: 'Forestry / Agroforestry', icon: TreePine, color: 'green',
    stages: FORESTCORE_STAGES, stageCount: FORESTCORE_STAGES.length,
    totalFields: FORESTCORE_STAGES.reduce((s, st) => s + (st.sections?.reduce((ss, sec) => ss + (sec.fields?.length || 0), 0) || 0), 0),
    description: 'Forestry & agroforestry: timber, fuelwood, NTFP. Plantation establishment, thinning, pruning, sustainable harvesting.',
    crops: ['Eucalyptus', 'Pine', 'Mahogany', 'Grevillea'],
  },
  {
    id: 'timbercore', name: 'TimberCore', label: 'Timber Tracking', icon: Trees, color: 'amber',
    stages: TIMBERCORE_STAGES, stageCount: TIMBERCORE_STAGES.length,
    totalFields: TIMBERCORE_STAGES.reduce((s, st) => s + (st.sections?.reduce((ss, sec) => ss + (sec.fields?.length || 0), 0) || 0), 0),
    description: 'Timber tracking: chain of custody, log grading, sawmill yields, kiln drying, certification (FSC).',
    crops: ['Pine Logs', 'Eucalyptus Logs', 'Teak', 'Mahogany'],
  },
  {
    id: 'mangrovecore', name: 'MangroveCore', label: 'Mangrove Restoration', icon: Leaf, color: 'teal',
    stages: MANGROVECORE_STAGES, stageCount: MANGROVECORE_STAGES.length,
    totalFields: MANGROVECORE_STAGES.reduce((s, st) => s + (st.sections?.reduce((ss, sec) => ss + (sec.fields?.length || 0), 0) || 0), 0),
    description: 'Mangrove restoration: nursery, planting, monitoring, blue carbon credits. Climate resilience & coastal protection.',
    crops: ['Red Mangrove', 'Black Mangrove', 'White Mangrove'],
  },
]

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', gradient: 'from-amber-500 to-orange-500' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', gradient: 'from-blue-500 to-cyan-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', gradient: 'from-emerald-500 to-green-500' },
  red: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', gradient: 'from-red-500 to-rose-500' },
  green: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800', gradient: 'from-green-500 to-emerald-500' },
  pink: { bg: 'bg-pink-50 dark:bg-pink-950/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800', gradient: 'from-pink-500 to-rose-500' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800', gradient: 'from-cyan-500 to-blue-500' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800', gradient: 'from-teal-500 to-emerald-500' },
}

export default function CropStagesLibraryView() {
  const [selected, setSelected] = useState<Vertical | null>(null)

  const totalStages = VERTICALS.reduce((s, v) => s + v.stageCount, 0)
  const totalFields = VERTICALS.reduce((s, v) => s + v.totalFields, 0)

  if (selected) {
    return <VerticalDetail vertical={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Crop Stage Library</h3>
        <p className="text-sm text-muted-foreground">
          {VERTICALS.length} crop verticals · {totalStages} stages · {totalFields.toLocaleString()} data fields · Excel-aligned
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {VERTICALS.map(v => {
          const Icon = v.icon
          const c = COLOR_MAP[v.color]
          return (
            <Card
              key={v.id}
              className={cn('cursor-pointer hover:shadow-md transition-all border-2', c.border)}
              onClick={() => setSelected(v)}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white', c.gradient)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.label}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{v.description}</p>
                <div className="flex items-center gap-3 mt-3">
                  <Badge variant="outline" className="text-[10px]">{v.stageCount} stages</Badge>
                  <Badge variant="outline" className="text-[10px]">{v.totalFields} fields</Badge>
                </div>
                <Separator className="my-3" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Crops covered</p>
                <p className="text-xs font-medium mt-0.5">{v.crops.join(' · ')}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function VerticalDetail({ vertical, onBack }: { vertical: Vertical; onBack: () => void }) {
  const Icon = vertical.icon
  const c = COLOR_MAP[vertical.color]

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back to Library</Button>

      <Card className={cn('border-2', c.border)}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white shrink-0', c.gradient)}>
              <Icon className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{vertical.name}</h2>
              <p className="text-sm text-muted-foreground">{vertical.label}</p>
              <p className="text-sm mt-2">{vertical.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline">{vertical.stageCount} stages</Badge>
                <Badge variant="outline">{vertical.totalFields} fields</Badge>
                {vertical.crops.map(cr => <Badge key={cr} variant="outline" className="text-[10px]">{cr}</Badge>)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Layers className="w-4 h-4" /> Stage Definitions</CardTitle>
          <CardDescription>Each stage has sections (Basic, Cost, Carbon, Compliance, etc.) with structured fields.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {vertical.stages.map((stage, i) => (
              <AccordionItem key={stage.stageNumber || i} value={`stage-${stage.stageNumber || i}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br', c.gradient)}>
                      {stage.stageNumber || i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{stage.stageName || stage.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {stage.sections?.length || 0} sections · {stage.sections?.reduce((s: number, sec: any) => s + (sec.fields?.length || 0), 0) || 0} fields
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pl-11">
                    {stage.sections?.map((section: any, idx: number) => (
                      <div key={idx} className={cn('p-3 rounded-lg border', c.bg, c.border)}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2">{section.sectionName || section.name}</p>
                        {section.fields?.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                            {section.fields.map((f: any, fi: number) => (
                              <div key={fi} className="text-xs flex items-start gap-1">
                                <span className={cn('font-mono mt-0.5', c.text)}>•</span>
                                <span>{f.label || f.name}{f.unit ? ` (${f.unit})` : ''}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No fields defined.</p>
                        )}
                      </div>
                    ))}
                    {(!stage.sections || stage.sections.length === 0) && (
                      <p className="text-xs text-muted-foreground italic">No section data available.</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
