'use client'

import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Building2, Users, Sprout, Layers, Rocket, CheckCircle, ArrowRight,
  ArrowLeft, Loader2, X, UserPlus, Upload, Shield, Sparkles
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

const STORAGE_KEY = 'agrobase_onboarding_completed'

const STEPS = [
  { key: 'company', label: 'Company Profile', icon: Building2, description: 'Set up your organization details' },
  { key: 'users', label: 'Team Members', icon: Users, description: 'Add staff users to your tenant' },
  { key: 'farmers', label: 'Farmer Data', icon: Sprout, description: 'Import or add your farmers' },
  { key: 'modules', label: 'Module Setup', icon: Layers, description: 'Review your active modules' },
  { key: 'golive', label: 'Go Live', icon: Rocket, description: 'Review and launch' },
]

const MODULE_CATALOG = [
  { key: 'farmers', label: 'Farmer Profiling', desc: 'Register and manage farmer profiles' },
  { key: 'vsla', label: 'VSLA Management', desc: 'Savings groups, loans, meetings' },
  { key: 'training', label: 'Training & Groups', desc: 'Schedule trainings, track attendance' },
  { key: 'marketplace', label: 'Marketplace', desc: 'List and trade produce' },
  { key: 'loans', label: 'Loan Management', desc: 'Loan products and applications' },
  { key: 'carbon', label: 'Carbon & Compliance', desc: 'EUDR, CBAM, carbon credits' },
  { key: 'trace', label: 'Traceability', desc: 'Farm-to-export traceability' },
  { key: 'reports', label: 'Reports & Analytics', desc: 'Dashboards and exports' },
]

export function OnboardingWizard() {
  const { user, setActiveModule } = useAppStore()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Only show for TENANT_ADMIN and COUNTRY_ADMIN who haven't completed onboarding
    const isEligible = user?.role === 'TENANT_ADMIN' || user?.role === 'COUNTRY_ADMIN'
    const alreadyDone = localStorage.getItem(`${STORAGE_KEY}_${user?.tenantId}`)
    if (isEligible && !alreadyDone) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setOpen(true), 800)
      return () => clearTimeout(timer)
    }
  }, [user])

  const handleComplete = () => {
    if (user?.tenantId) {
      localStorage.setItem(`${STORAGE_KEY}_${user?.tenantId}`, 'true')
    }
    setOpen(false)
    toast.success('Onboarding complete! Welcome to Agrobase V3.')
    setActiveModule('dashboard')
  }

  const handleSkip = () => {
    if (user?.tenantId) {
      localStorage.setItem(`${STORAGE_KEY}_${user?.tenantId}`, 'true')
    }
    setOpen(false)
    toast.info('Onboarding skipped. You can access all features from the sidebar.')
  }

  const nextStep = () => {
    const stepKey = STEPS[step].key
    setCompleted(prev => new Set(prev).add(stepKey))
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  const prevStep = () => {
    if (step > 0) setStep(step - 1)
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleSkip()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b z-10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Welcome to Agrobase V3</DialogTitle>
              <p className="text-xs text-muted-foreground">Let's set up your tenant in 5 quick steps</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSkip} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Step {step + 1} of {STEPS.length}: {STEPS[step].label}
            </span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
          {/* Step indicators */}
          <div className="flex items-center justify-between mt-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const isDone = completed.has(s.key)
              const isCurrent = i === step
              return (
                <React.Fragment key={s.key}>
                  <div className={cn(
                    'flex flex-col items-center gap-1 transition-all',
                    isCurrent ? 'text-primary' : isDone ? 'text-emerald-600' : 'text-muted-foreground/50'
                  )}>
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                      isCurrent ? 'border-primary bg-primary/10' :
                      isDone ? 'border-emerald-500 bg-emerald-500 text-white' :
                      'border-muted-foreground/30'
                    )}>
                      {isDone ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className="text-[10px] hidden sm:block">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn('flex-1 h-0.5 mx-1', completed.has(s.key) ? 'bg-emerald-500' : 'bg-muted-foreground/20')} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-6 min-h-[300px]">
          {step === 0 && <CompanyProfileStep />}
          {step === 1 && <TeamMembersStep />}
          {step === 2 && <FarmerDataStep />}
          {step === 3 && <ModuleSetupStep />}
          {step === 4 && <GoLiveStep completed={completed} />}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={handleSkip} className="text-xs">
            Skip onboarding
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={prevStep} className="gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            )}
            <Button onClick={nextStep} className="gap-1.5">
              {step === STEPS.length - 1 ? (
                <> <Rocket className="w-4 h-4" /> Go Live</>
              ) : (
                <> Next <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Step 1: Company Profile ──────────────────────────────────────

function CompanyProfileStep() {
  const { user } = useAppStore()
  const [form, setForm] = useState({
    companyName: '',
    type: 'COOPERATIVE',
    country: 'Uganda',
    currency: 'UGX',
    address: '',
    contactEmail: '',
    contactPhone: '',
    description: '',
  })

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        contactEmail: user.email || '',
        contactPhone: user.phone || '',
      }))
    }
  }, [user])

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" /> Company Profile
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Tell us about your organization. This information appears on reports, invoices, and farmer-facing materials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Organization Name *</Label>
          <Input value={form.companyName} onChange={e => update('companyName', e.target.value)} placeholder="e.g. EKIBBO Coffee Exporters" />
        </div>
        <div className="space-y-1.5">
          <Label>Organization Type</Label>
          <Select value={form.type} onValueChange={v => update('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="COOPERATIVE">Cooperative</SelectItem>
              <SelectItem value="NGO">NGO / Development Programme</SelectItem>
              <SelectItem value="EXPORTER">Exporter</SelectItem>
              <SelectItem value="AGRIBUSINESS">Agribusiness</SelectItem>
              <SelectItem value="MFI">Microfinance Institution</SelectItem>
              <SelectItem value="INPUT_SUPPLIER">Input Supplier</SelectItem>
              <SelectItem value="PROCESSING">Processing Company</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Country</Label>
          <Select value={form.country} onValueChange={v => {
            update('country', v)
            update('currency', v === 'Uganda' ? 'UGX' : v === 'Ghana' ? 'GHS' : 'KES')
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Uganda">🇺🇬 Uganda</SelectItem>
              <SelectItem value="Ghana">🇬🇭 Ghana</SelectItem>
              <SelectItem value="Kenya">🇰🇪 Kenya</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Default Currency</Label>
          <Select value={form.currency} onValueChange={v => update('currency', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="UGX">UGX — Ugandan Shilling</SelectItem>
              <SelectItem value="GHS">GHS — Ghanaian Cedi</SelectItem>
              <SelectItem value="KES">KES — Kenyan Shilling</SelectItem>
              <SelectItem value="USD">USD — US Dollar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Contact Email</Label>
          <Input type="email" value={form.contactEmail} onChange={e => update('contactEmail', e.target.value)} placeholder="admin@yourorg.com" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Address</Label>
          <Input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Street, City, District" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Description (optional)</Label>
          <Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={2} placeholder="Brief description of your organization..." />
        </div>
      </div>

      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          💡 This information can be updated later in Settings → Company Profile.
        </p>
      </div>
    </div>
  )
}

// ─── Step 2: Team Members ─────────────────────────────────────────

function TeamMembersStep() {
  const [members, setMembers] = useState<Array<{ firstName: string; lastName: string; email: string; role: string }>>([
    { firstName: '', lastName: '', email: '', role: 'EXTENSION_OFFICER' },
  ])

  const addMember = () => setMembers(prev => [...prev, { firstName: '', lastName: '', email: '', role: 'EXTENSION_OFFICER' }])
  const removeMember = (i: number) => setMembers(prev => prev.filter((_, idx) => idx !== i))
  const updateMember = (i: number, k: string, v: string) => setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, [k]: v } : m))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> Team Members
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add staff who will use this platform. You can add more later in User Management.
        </p>
      </div>

      <div className="space-y-3">
        {members.map((m, i) => (
          <div key={i} className="p-3 rounded-lg border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Member {i + 1}</span>
              {members.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeMember(i)} className="text-red-600 h-7 text-xs">Remove</Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">First Name</Label>
                <Input value={m.firstName} onChange={e => updateMember(i, 'firstName', e.target.value)} placeholder="John" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last Name</Label>
                <Input value={m.lastName} onChange={e => updateMember(i, 'lastName', e.target.value)} placeholder="Okello" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={m.email} onChange={e => updateMember(i, 'email', e.target.value)} placeholder="john@org.com" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Select value={m.role} onValueChange={v => updateMember(i, 'role', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TENANT_ADMIN">Tenant Admin</SelectItem>
                    <SelectItem value="EXTENSION_OFFICER">Extension Officer</SelectItem>
                    <SelectItem value="AGENT">Agent</SelectItem>
                    <SelectItem value="CBT">Community Based Trainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addMember} className="gap-2">
        <UserPlus className="w-4 h-4" /> Add Another Member
      </Button>

      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          ⚠️ Team members will receive a welcome email with temporary password <code className="bg-background px-1 rounded">password123</code>. They'll be prompted to change it on first login.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Users className="w-5 h-5 mx-auto text-blue-600 mb-1" />
          <p className="text-lg font-bold">{members.length}</p>
          <p className="text-[10px] text-muted-foreground">Members to add</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Shield className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
          <p className="text-lg font-bold">8</p>
          <p className="text-[10px] text-muted-foreground">Available roles</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <CheckCircle className="w-5 h-5 mx-auto text-purple-600 mb-1" />
          <p className="text-lg font-bold">∞</p>
          <p className="text-[10px] text-muted-foreground">User limit</p>
        </CardContent></Card>
      </div>
    </div>
  )
}

// ─── Step 3: Farmer Data ──────────────────────────────────────────

function FarmerDataStep() {
  const [method, setMethod] = useState<'csv' | 'manual' | 'skip'>('csv')

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sprout className="w-5 h-5 text-primary" /> Farmer Data
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          How would you like to add your farmers? You can always add more later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => setMethod('csv')}
          className={cn(
            'p-4 rounded-lg border-2 text-left transition-all',
            method === 'csv' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
          )}
        >
          <Upload className="w-8 h-8 text-emerald-600 mb-2" />
          <p className="font-semibold text-sm">Import from CSV</p>
          <p className="text-xs text-muted-foreground mt-1">Bulk upload farmers from a spreadsheet. Best for existing data.</p>
          {method === 'csv' && <Badge className="mt-2 text-[10px]">Selected</Badge>}
        </button>

        <button
          onClick={() => setMethod('manual')}
          className={cn(
            'p-4 rounded-lg border-2 text-left transition-all',
            method === 'manual' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
          )}
        >
          <UserPlus className="w-8 h-8 text-blue-600 mb-2" />
          <p className="font-semibold text-sm">Add Manually</p>
          <p className="text-xs text-muted-foreground mt-1">Add farmers one at a time through the form. Best for small numbers.</p>
          {method === 'manual' && <Badge className="mt-2 text-[10px]">Selected</Badge>}
        </button>

        <button
          onClick={() => setMethod('skip')}
          className={cn(
            'p-4 rounded-lg border-2 text-left transition-all',
            method === 'skip' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
          )}
        >
          <X className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="font-semibold text-sm">Skip for Now</p>
          <p className="text-xs text-muted-foreground mt-1">Add farmers later. You can start with an empty registry.</p>
          {method === 'skip' && <Badge className="mt-2 text-[10px]">Selected</Badge>}
        </button>
      </div>

      {method === 'csv' && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">CSV Import</p>
          <p className="text-xs text-muted-foreground">
            After completing onboarding, go to Farmer Profiling → Import CSV to upload your farmer data.
            We support Excel/Google Sheets CSV exports with columns: firstName, lastName, phone, gender, village, etc.
          </p>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
            const template = `firstName,lastName,phone,gender,email,memberType,mainCrops,villageName,district,country,farmSize
John,Mugisha,+256700000020,Male,john@example.com,General,Coffee,Kibale,Mukono,Uganda,1.5
Sarah,Achieng,+256700000021,Female,sarah@example.com,General,Maize,Wakiso,Wakiso,Uganda,2.0`
            const blob = new Blob([template], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'farmer-import-template.csv'
            a.click()
            URL.revokeObjectURL(url)
          }}>
            <Upload className="w-3.5 h-3.5" /> Download CSV Template
          </Button>
        </div>
      )}

      {method === 'manual' && (
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Manual Entry</p>
          <p className="text-xs text-muted-foreground mt-1">
            After onboarding, go to Farmer Profiling → Add Farmer to register farmers one by one.
            The form captures all 84 fields including demographics, farm details, and family information.
          </p>
        </div>
      )}

      {method === 'skip' && (
        <div className="p-4 rounded-lg bg-muted/30 border">
          <p className="text-sm font-medium">No problem!</p>
          <p className="text-xs text-muted-foreground mt-1">
            You can add farmers anytime from the Farmer Profiling module. Your tenant is ready to use with an empty registry.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Step 4: Module Setup ─────────────────────────────────────────

function ModuleSetupStep() {
  const [enabledModules, setEnabledModules] = useState<Set<string>>(
    new Set(['farmers', 'vsla', 'training', 'marketplace', 'reports'])
  )

  const toggle = (key: string) => {
    setEnabledModules(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" /> Module Setup
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Review the modules available in your plan. Toggle on the ones you want to activate now.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MODULE_CATALOG.map(m => {
          const enabled = enabledModules.has(m.key)
          return (
            <div
              key={m.key}
              className={cn(
                'p-4 rounded-lg border-2 cursor-pointer transition-all',
                enabled ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              )}
              onClick={() => toggle(m.key)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                  enabled ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                )}>
                  {enabled && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
        <p className="text-xs text-purple-700 dark:text-purple-300">
          💡 Your subscription plan determines which modules are available. Contact your Super Admin to upgrade.
          Currently <strong>{enabledModules.size}</strong> modules selected.
        </p>
      </div>
    </div>
  )
}

// ─── Step 5: Go Live ──────────────────────────────────────────────

function GoLiveStep({ completed }: { completed: Set<string> }) {
  const steps = [
    { key: 'company', label: 'Company Profile', icon: Building2 },
    { key: 'users', label: 'Team Members', icon: Users },
    { key: 'farmers', label: 'Farmer Data', icon: Sprout },
    { key: 'modules', label: 'Module Setup', icon: Layers },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-4">
          <Rocket className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold">Ready to Go Live!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Review your setup and launch your Agrobase tenant.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">Setup Summary</p>
          {steps.map(s => {
            const Icon = s.icon
            const isDone = completed.has(s.key)
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  isDone ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {isDone ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={cn('text-sm', isDone ? 'font-medium' : 'text-muted-foreground')}>
                  {s.label}
                </span>
                {isDone && <Badge className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Complete</Badge>}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          🎉 You're all set! Click "Go Live" to start using Agrobase V3. You can always update your settings,
          add more users, and import farmers from the sidebar menus.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 rounded-lg border">
          <p className="text-2xl font-bold text-emerald-600">✓</p>
          <p className="text-[10px] text-muted-foreground">Tenant Configured</p>
        </div>
        <div className="p-3 rounded-lg border">
          <p className="text-2xl font-bold text-blue-600">8</p>
          <p className="text-[10px] text-muted-foreground">Roles Available</p>
        </div>
        <div className="p-3 rounded-lg border">
          <p className="text-2xl font-bold text-purple-600">42</p>
          <p className="text-[10px] text-muted-foreground">Modules Available</p>
        </div>
      </div>
    </div>
  )
}
