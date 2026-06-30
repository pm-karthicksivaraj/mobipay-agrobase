'use client'

import React, { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  User, MapPin, Users, Home, DollarSign, Shield, Tractor,
  ChevronLeft, ChevronRight, Save, Camera
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface FarmerFormProps {
  onSaved?: (farmer: any) => void
  initialData?: any
}

const SECTIONS = [
  { id: 'enrollment', label: 'Enrollment', icon: User },
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'contact', label: 'Contact & Location', icon: MapPin },
  { id: 'family', label: 'Family', icon: Users },
  { id: 'assets', label: 'Assets', icon: Home },
  { id: 'finance', label: 'Finance & Loans', icon: DollarSign },
  { id: 'insurance', label: 'Insurance', icon: Shield },
  { id: 'equipment', label: 'Farm Equipment', icon: Tractor },
]

const COUNTRIES = ['Uganda', 'Ghana', 'Kenya']
const EDUCATION_LEVELS = ['Primary', 'Secondary', 'UG', 'PG', 'Other']
const MARITAL_STATUS = ['Un-Married', 'Married', 'Widow']
const GENDERS = ['Male', 'Female', 'Other']
const ID_TYPES = ['National ID', 'Driving License', 'Passport']
const HOUSE_TYPES = ['Brick house', 'Wooden house', 'Hut', 'Other']
const HOUSE_OWNERSHIP = ['Owned', 'Rent', 'Lease']
const ELECTRONICS = ['TV', 'Washing Machine', 'Air Conditioner', 'Fridge']
const VEHICLES = ['Bike', 'Car', 'Boat']
const LOAN_SOURCES = ['Bank', 'Relative', 'Friend', 'Farming contract', 'Other']
const LOAN_PURPOSES = ['Farm Inputs', 'Equipment', 'Land', 'Education', 'Medical', 'Other']
const EQUIPMENT_ITEMS = ['Tractor', 'Power Tiller', 'Sprayer', 'Harvester', 'Irrigation Pump', 'Hand Tools', 'Ox Plow']
const ENROLLMENT_PLACES = ['At Farmer Place', 'At Cooperative', 'At Farmer Organization', 'At Warehouse']

export function FarmerRegistrationForm({ onSaved, initialData }: FarmerFormProps) {
  const [activeSection, setActiveSection] = useState('enrollment')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, any>>(initialData || {})

  const update = useCallback((field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const toggleArrayItem = (field: string, item: string) => {
    setForm(prev => {
      const arr = prev[field] || []
      return { ...prev, [field]: arr.includes(item) ? arr.filter((i: string) => i !== item) : [...arr, item] }
    })
  }

  const save = async () => {
    if (!form.firstName || !form.lastName || !form.phone) {
      toast.error('First name, last name, and phone are required')
      return
    }
    setSaving(true)
    try {
      // Build insurance data from individual fields
      const insuranceData: any = {}
      ;['life', 'health', 'crop', 'social'].forEach(type => {
        if (form[`insurance_${type}_enabled`]) {
          insuranceData[type] = {
            provider: form[`insurance_${type}_provider`],
            amount: form[`insurance_${type}_amount`],
            enrolledDate: form[`insurance_${type}_enrolled`],
          }
        }
      })
      if (form.insuranceOther) insuranceData.other = form.insuranceOther

      const payload = { ...form }
      if (Object.keys(insuranceData).length > 0) payload.insuranceData = insuranceData

      const res = await fetch('/api/farmers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Farmer ${form.firstName} ${form.lastName} registered successfully!`)
        onSaved?.(data)
      } else {
        toast.error(data.error || 'Failed to register farmer')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const currentIndex = SECTIONS.findIndex(s => s.id === activeSection)

  return (
    <div className="space-y-4">
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <div className="overflow-x-auto">
          <TabsList className="h-auto flex-wrap">
            {SECTIONS.map((s, i) => {
              const Icon = s.icon
              return (
                <TabsTrigger key={s.id} value={s.id} className="gap-1.5 text-xs">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{i + 1}. {s.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* Section 1: Enrollment */}
        <TabsContent value="enrollment" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Enrollment Date</Label><Input type="date" value={form.enrollmentDate?.split('T')[0] || new Date().toISOString().split('T')[0]} onChange={e => update('enrollmentDate', e.target.value)} /></div>
              <div className="space-y-2"><Label>Enrollment Place</Label>
                <Select value={form.enrollmentPlace || ''} onValueChange={v => update('enrollmentPlace', v)}>
                  <SelectTrigger><SelectValue placeholder="Select place" /></SelectTrigger>
                  <SelectContent>{ENROLLMENT_PLACES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Farmer Code <span className="text-xs text-muted-foreground">(auto-generated)</span></Label><Input value={form.farmerCode || ''} onChange={e => update('farmerCode', e.target.value)} placeholder="Auto-generated" /></div>
              <div className="space-y-2"><Label>Member Type</Label>
                <Select value={form.memberType || 'General'} onValueChange={v => update('memberType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="General">General</SelectItem><SelectItem value="Commercial">Commercial</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Is Certified Farmer?</Label>
              <RadioGroup value={form.isCertified ? 'YES' : 'NO'} onValueChange={v => update('isCertified', v === 'YES')}>
                <div className="flex gap-4"><div className="flex items-center gap-2"><RadioGroupItem value="NO" id="cert-no" /><Label htmlFor="cert-no">No</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="YES" id="cert-yes" /><Label htmlFor="cert-yes">Yes</Label></div></div>
              </RadioGroup>
            </div>
            {form.isCertified && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg bg-muted/40">
                <div className="space-y-2"><Label>Certification Type</Label>
                  <Select value={form.certificationType || ''} onValueChange={v => update('certificationType', v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent><SelectItem value="Individual">Individual</SelectItem><SelectItem value="Group">Group</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Year of ICS</Label><Input type="number" value={form.icsYear || ''} onChange={e => update('icsYear', e.target.value)} placeholder="2024" /></div>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* Section 2: Personal Info */}
        <TabsContent value="personal" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>First Name *</Label><Input value={form.firstName || ''} onChange={e => update('firstName', e.target.value)} /></div>
              <div className="space-y-2"><Label>Last Name *</Label><Input value={form.lastName || ''} onChange={e => update('lastName', e.target.value)} /></div>
              <div className="space-y-2"><Label>Contact Number *</Label><Input value={form.phone || ''} onChange={e => update('phone', e.target.value)} placeholder="+256..." /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Gender</Label><Select value={form.gender || ''} onValueChange={v => update('gender', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth?.split('T')[0] || ''} onChange={e => update('dateOfBirth', e.target.value)} /></div>
              <div className="space-y-2"><Label>Education</Label><Select value={form.education || ''} onValueChange={v => update('education', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{EDUCATION_LEVELS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Marital Status</Label><Select value={form.maritalStatus || ''} onValueChange={v => update('maritalStatus', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{MARITAL_STATUS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Guardian/Parent Name</Label><Input value={form.guardianName || ''} onChange={e => update('guardianName', e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email || ''} onChange={e => update('email', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>National ID Type</Label><Select value={form.nationalIdType || ''} onValueChange={v => update('nationalIdType', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{ID_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>ID Number</Label><Input value={form.nationalIdNo || ''} onChange={e => update('nationalIdNo', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Password (for farmer app login)</Label><Input type="password" value={form.password || ''} onChange={e => update('password', e.target.value)} /></div>
              <div className="space-y-2"><Label>Farmer Photo URL</Label><Input value={form.photoUrl || ''} onChange={e => update('photoUrl', e.target.value)} placeholder="Photo URL" /></div>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* Section 3: Contact & Location */}
        <TabsContent value="contact" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Country *</Label><Select value={form.country || ''} onValueChange={v => update('country', v)}><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger><SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Province/Region</Label><Input value={form.province || ''} onChange={e => update('province', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>District</Label><Input value={form.district || ''} onChange={e => update('district', e.target.value)} /></div>
              <div className="space-y-2"><Label>Commune/Sub-County</Label><Input value={form.commune || ''} onChange={e => update('commune', e.target.value)} /></div>
              <div className="space-y-2"><Label>Village</Label><Input value={form.villageName || ''} onChange={e => update('villageName', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Zip Code</Label><Input value={form.zipCode || ''} onChange={e => update('zipCode', e.target.value)} /></div>
              <div className="space-y-2"><Label>GPS Latitude</Label><Input type="number" step="any" value={form.gpsLatitude ?? ''} onChange={e => update('gpsLatitude', parseFloat(e.target.value) || null)} /></div>
              <div className="space-y-2"><Label>GPS Longitude</Label><Input type="number" step="any" value={form.gpsLongitude ?? ''} onChange={e => update('gpsLongitude', parseFloat(e.target.value) || null)} /></div>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* Section 4: Family */}
        <TabsContent value="family" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Spouse Name</Label><Input value={form.spouseName || ''} onChange={e => update('spouseName', e.target.value)} /></div>
              <div className="space-y-2"><Label>No. of Family Members</Label><Input type="number" value={form.familyMembers ?? ''} onChange={e => update('familyMembers', parseInt(e.target.value) || null)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Children Below 18 (Male)</Label><Input type="number" value={form.childrenMaleUnder18 ?? ''} onChange={e => update('childrenMaleUnder18', parseInt(e.target.value) || null)} /></div>
              <div className="space-y-2"><Label>Children Below 18 (Female)</Label><Input type="number" value={form.childrenFemaleUnder18 ?? ''} onChange={e => update('childrenFemaleUnder18', parseInt(e.target.value) || null)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>School-Going Children (Male)</Label><Input type="number" value={form.schoolGoingMale ?? ''} onChange={e => update('schoolGoingMale', parseInt(e.target.value) || null)} /></div>
              <div className="space-y-2"><Label>School-Going Children (Female)</Label><Input type="number" value={form.schoolGoingFemale ?? ''} onChange={e => update('schoolGoingFemale', parseInt(e.target.value) || null)} /></div>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* Section 5: Assets */}
        <TabsContent value="assets" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Housing Ownership</Label><Select value={form.housingOwnership || ''} onValueChange={v => update('housingOwnership', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{HOUSE_OWNERSHIP.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>House Type</Label><Select value={form.houseType || ''} onValueChange={v => update('houseType', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{HOUSE_TYPES.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Consumer Electronics</Label><div className="flex flex-wrap gap-2">{ELECTRONICS.map(e => <Badge key={e} variant={form.consumerElectronics?.includes(e) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleArrayItem('consumerElectronics', e)}>{e}</Badge>)}</div></div>
            <div className="space-y-2"><Label>Vehicle</Label><div className="flex flex-wrap gap-2">{VEHICLES.map(v => <Badge key={v} variant={form.vehicle?.includes(v) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleArrayItem('vehicle', v)}>{v}</Badge>)}</div></div>
          </CardContent></Card>
        </TabsContent>

        {/* Section 6: Finance & Loans */}
        <TabsContent value="finance" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Bank Name</Label><Input value={form.bankName || ''} onChange={e => update('bankName', e.target.value)} /></div>
              <div className="space-y-2"><Label>Account Number</Label><Input value={form.bankAccountNo || ''} onChange={e => update('bankAccountNo', e.target.value)} /></div>
              <div className="space-y-2"><Label>Branch</Label><Input value={form.bankBranch || ''} onChange={e => update('bankBranch', e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Loan Taken Last Year?</Label>
              <RadioGroup value={form.loanTakenLastYear ? 'YES' : 'NO'} onValueChange={v => update('loanTakenLastYear', v === 'YES')}>
                <div className="flex gap-4"><div className="flex items-center gap-2"><RadioGroupItem value="NO" id="loan-no" /><Label htmlFor="loan-no">No</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="YES" id="loan-yes" /><Label htmlFor="loan-yes">Yes</Label></div></div>
              </RadioGroup>
            </div>
            {form.loanTakenLastYear && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg bg-muted/40">
                <div className="space-y-2"><Label>Loan Taken From</Label><Select value={form.loanTakenFrom || ''} onValueChange={v => update('loanTakenFrom', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{LOAN_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Loan Amount</Label><Input type="number" value={form.loanAmount ?? ''} onChange={e => update('loanAmount', parseFloat(e.target.value) || null)} /></div>
                <div className="space-y-2"><Label>Loan Purpose</Label><Select value={form.loanPurpose || ''} onValueChange={v => update('loanPurpose', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{LOAN_PURPOSES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Interest Rate (%)</Label><Input type="number" step="0.1" value={form.loanInterestPct ?? ''} onChange={e => update('loanInterestPct', parseFloat(e.target.value) || null)} /></div>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* Section 7: Insurance */}
        <TabsContent value="insurance" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            {['life', 'health', 'crop', 'social'].map(type => {
              const enabled = form[`insurance_${type}_enabled`] || false
              return (
                <div key={type} className="space-y-2 p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize font-medium">{type} Insurance</Label>
                    <RadioGroup value={enabled ? 'YES' : 'NO'} onValueChange={v => update(`insurance_${type}_enabled`, v === 'YES')}>
                      <div className="flex gap-3"><div className="flex items-center gap-1"><RadioGroupItem value="NO" id={`${type}-no`} /><Label htmlFor={`${type}-no`} className="text-xs">No</Label></div><div className="flex items-center gap-1"><RadioGroupItem value="YES" id={`${type}-yes`} /><Label htmlFor={`${type}-yes`} className="text-xs">Yes</Label></div></div>
                    </RadioGroup>
                  </div>
                  {enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                      <Input placeholder="Provider" value={form[`insurance_${type}_provider`] || ''} onChange={e => update(`insurance_${type}_provider`, e.target.value)} />
                      <Input placeholder="Amount" type="number" value={form[`insurance_${type}_amount`] ?? ''} onChange={e => update(`insurance_${type}_amount`, parseFloat(e.target.value) || null)} />
                      <Input placeholder="Enrolled Date" type="date" value={form[`insurance_${type}_enrolled`]?.split('T')[0] || ''} onChange={e => update(`insurance_${type}_enrolled`, e.target.value)} />
                    </div>
                  )}
                </div>
              )
            })}
            <div className="space-y-2"><Label>Other Insurance</Label><Input value={form.insuranceOther || ''} onChange={e => update('insuranceOther', e.target.value)} /></div>
          </CardContent></Card>
        </TabsContent>

        {/* Section 8: Farm Equipment */}
        <TabsContent value="equipment" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">Select equipment items and their count.</p>
            <div className="space-y-2">
              {EQUIPMENT_ITEMS.map(item => {
                const equipped = (form.farmEquipment || []).find((e: any) => e.item === item)
                return (
                  <div key={item} className="flex items-center gap-3 p-2 rounded-md border">
                    <Badge variant={equipped ? 'default' : 'outline'} className="cursor-pointer" onClick={() => {
                      const arr = form.farmEquipment || []
                      if (equipped) { update('farmEquipment', arr.filter((e: any) => e.item !== item)) }
                      else { update('farmEquipment', [...arr, { item, count: 1 }]) }
                    }}>{item}</Badge>
                    {equipped && (
                      <Input type="number" min="1" value={equipped.count} onChange={e => {
                        const arr = form.farmEquipment.map((eq: any) => eq.item === item ? { ...eq, count: parseInt(e.target.value) || 1 } : eq)
                        update('farmEquipment', arr)
                      }} className="w-24" />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" disabled={currentIndex === 0} onClick={() => setActiveSection(SECTIONS[currentIndex - 1].id)}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <div className="flex items-center gap-2">
          {SECTIONS.map((s, i) => (
            <div key={s.id} className={cn('w-2 h-2 rounded-full', i === currentIndex ? 'bg-primary' : i < currentIndex ? 'bg-primary/40' : 'bg-muted')} />
          ))}
        </div>
        {currentIndex < SECTIONS.length - 1 ? (
          <Button onClick={() => setActiveSection(SECTIONS[currentIndex + 1].id)}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
        ) : (
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : <><Save className="w-4 h-4 mr-1" /> Register Farmer</>}</Button>
        )}
      </div>
    </div>
  )
}
