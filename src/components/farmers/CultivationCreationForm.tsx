'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Save, Sprout, Calculator } from 'lucide-react'
import { toast } from 'sonner'

const CROP_CATEGORIES = ['Main Crop', 'Inter Crop', 'Border Crop']
const SEASONS = ['2026A', '2026B', '2025A', '2025B', 'Annual']
const CROPS = ['Coffee', 'Maize', 'Cocoa', 'Tea', 'Vanilla', 'Beans', 'Rice', 'Cassava', 'Banana', 'Groundnuts', 'Sorghum']
const SEED_SOURCES = ['Seed Company', 'Agent', 'Self-save']
const SEED_TYPES = ['Certified 1', 'Certified 2', 'Self-save', 'Other']
const SOWING_TYPES = ['Row sowing', 'Hand sowing', 'Drone sowing', 'Transplanting', 'Re-planting']
const SOWING_CHARGES_BY = ['hour', 'hectare']

interface CultivationFormProps {
  farmId: string
  farmAreaHa?: number
  onSaved?: (cultivation: any) => void
}

export function CultivationCreationForm({ farmId, farmAreaHa, onSaved }: CultivationFormProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({ farmId, cropCategory: 'Main Crop' })

  const update = useCallback((field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  // Auto-calc: seedCost = seedQuantity × seedPrice
  const seedCost = useMemo(() => {
    const qty = parseFloat(form.seedQuantity) || 0
    const price = parseFloat(form.seedPrice) || 0
    return qty * price
  }, [form.seedQuantity, form.seedPrice])

  // Auto-calc: sowingCost
  const sowingCost = useMemo(() => {
    const charges = parseFloat(form.sowingCharges) || 0
    if (form.sowingChargesBy === 'hectare') {
      const area = parseFloat(form.cultivationAreaHa) || farmAreaHa || 0
      return area * charges
    }
    if (form.sowingChargesBy === 'hour') {
      const hours = parseFloat(form.sowingHours) || 0
      return hours * charges
    }
    return 0
  }, [form.sowingCharges, form.sowingChargesBy, form.cultivationAreaHa, form.sowingHours, farmAreaHa])

  const save = async () => {
    if (!form.cropName) {
      toast.error('Crop name is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/cultivations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Cultivation created for ${form.cropName}!`)
        onSaved?.(data.cultivation)
      } else {
        toast.error(data.error || 'Failed to create cultivation')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Cultivation Information */}
      <Card><CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2"><Sprout className="w-4 h-4 text-primary" /><span className="font-medium text-sm">Cultivation Information</span></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Crop Category</Label>
            <Select value={form.cropCategory || 'Main Crop'} onValueChange={v => update('cropCategory', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CROP_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Harvest Season *</Label>
            <Select value={form.season || ''} onValueChange={v => update('season', v)}>
              <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
              <SelectContent>{SEASONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Cultivated Crop *</Label>
            <Select value={form.cropName || ''} onValueChange={v => update('cropName', v)}>
              <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
              <SelectContent>{CROPS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Crop Variety</Label><Input value={form.variety || ''} onChange={e => update('variety', e.target.value)} placeholder="e.g. SL28, Longe 10H" /></div>
          <div className="space-y-2"><Label>Cultivation Area (Ha) *</Label><Input type="number" step="0.01" value={form.cultivationAreaHa ?? ''} onChange={e => update('cultivationAreaHa', e.target.value)} placeholder={farmAreaHa ? `Farm area: ${farmAreaHa} ha` : 'Enter area'} /></div>
          <div className="space-y-2"><Label>Sowing Date *</Label><Input type="date" value={form.sowingDate?.split('T')[0] || ''} onChange={e => update('sowingDate', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Estimated Yield</Label><Input type="number" value={form.estimatedYield ?? ''} onChange={e => update('estimatedYield', e.target.value)} placeholder="kg" /></div>
          <div className="space-y-2"><Label>Photo URL</Label><Input value={form.photoUrl || ''} onChange={e => update('photoUrl', e.target.value)} /></div>
        </div>
      </CardContent></Card>

      {/* Seed Information */}
      <Card><CardContent className="p-4 space-y-4">
        <span className="font-medium text-sm">Seed Information</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Seed Source *</Label>
            <Select value={form.seedSource || ''} onValueChange={v => update('seedSource', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{SEED_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Is Seed Treated?</Label>
            <RadioGroup value={form.isSeedTreated ? 'YES' : 'NO'} onValueChange={v => update('isSeedTreated', v === 'YES')}>
              <div className="flex gap-4"><div className="flex items-center gap-2"><RadioGroupItem value="NO" id="treated-no" /><Label htmlFor="treated-no">No</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="YES" id="treated-yes" /><Label htmlFor="treated-yes">Yes</Label></div></div>
            </RadioGroup>
          </div>
          <div className="space-y-2"><Label>Seed Type</Label>
            <Select value={form.seedType || ''} onValueChange={v => update('seedType', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{SEED_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Seed Quantity (kg) *</Label><Input type="number" step="0.1" value={form.seedQuantity ?? ''} onChange={e => update('seedQuantity', e.target.value)} /></div>
          <div className="space-y-2"><Label>Seed Price (per kg) *</Label><Input type="number" step="0.01" value={form.seedPrice ?? ''} onChange={e => update('seedPrice', e.target.value)} /></div>
          {/* Auto-calc display */}
          <div className="space-y-2">
            <Label>Seed Cost <span className="text-xs text-muted-foreground">(auto-calc)</span></Label>
            <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{seedCost.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">= {form.seedQuantity || 0} kg × {form.seedPrice || 0}/kg</p>
            </div>
          </div>
        </div>
      </CardContent></Card>

      {/* Sowing Information */}
      <Card><CardContent className="p-4 space-y-4">
        <span className="font-medium text-sm">Sowing Information</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Type of Sowing *</Label>
            <Select value={form.sowingType || ''} onValueChange={v => update('sowingType', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{SOWING_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Sowing Charges By *</Label>
            <Select value={form.sowingChargesBy || ''} onValueChange={v => update('sowingChargesBy', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{SOWING_CHARGES_BY.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Sowing Charges *</Label><Input type="number" step="0.01" value={form.sowingCharges ?? ''} onChange={e => update('sowingCharges', e.target.value)} /></div>
        </div>
        {form.sowingChargesBy === 'hour' && (
          <div className="space-y-2"><Label>Sowing Hours</Label><Input type="number" step="0.5" value={form.sowingHours ?? ''} onChange={e => update('sowingHours', e.target.value)} placeholder="Total hours" /></div>
        )}
        {/* Auto-calc display */}
        <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Sowing Cost: {sowingCost.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">
            {form.sowingChargesBy === 'hectare'
              ? `= ${form.cultivationAreaHa || farmAreaHa || 0} ha × ${form.sowingCharges || 0}/ha`
              : `= ${form.sowingHours || 0} hrs × ${form.sowingCharges || 0}/hr`}
          </p>
        </div>
      </CardContent></Card>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving} size="lg">{saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Create Cultivation</>}</Button>
      </div>
    </div>
  )
}
