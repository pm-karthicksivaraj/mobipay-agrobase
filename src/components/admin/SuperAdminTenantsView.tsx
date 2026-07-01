'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog'
import { Building2, Plus, Search, MoreVertical, Power } from 'lucide-react'
import { toast } from 'sonner'

interface Tenant {
  id: string; name: string; type: string; country: string; isActive: boolean
  defaultCurrency: string; createdAt: string
  _count: { users: number; farmerProfiles: number; vslaGroups: number; plots: number }
  subscription: {
    plan: string; amount: number; billingCycle: string; status?: string
    trialStartsAt?: string | null; trialEndsAt?: string | null
  } | null
  mrr: number
}

export default function SuperAdminTenantsView() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/tenants')
      .then(r => r.json())
      .then(d => setTenants(d.tenants || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = tenants.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterType && t.type !== filterType) return false
    return true
  })

  const toggleActive = async (t: Tenant) => {
    const res = await fetch(`/api/admin/tenants/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !t.isActive }),
    })
    if (res.ok) {
      toast.success(`${t.name} ${t.isActive ? 'suspended' : 'activated'}`)
      load()
    } else {
      toast.error('Failed to update tenant')
    }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-96" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-sm text-muted-foreground">{tenants.length} tenants · {tenants.filter(t => t.isActive).length} active</p>
        </div>
        <CreateTenantDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 text-sm border rounded-md bg-background"
        >
          <option value="">All types</option>
          <option value="COOPERATIVE">Cooperative</option>
          <option value="EXPORTER">Exporter</option>
          <option value="NGO">NGO</option>
          <option value="MFI">MFI</option>
          <option value="AGRIBUSINESS">Agribusiness</option>
          <option value="COUNTRY">Country</option>
        </select>
      </div>

      {/* Tenants Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Tenant</th>
                <th className="text-left py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Type</th>
                <th className="text-left py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Country</th>
                <th className="text-center py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Farmers</th>
                <th className="text-center py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Users</th>
                <th className="text-center py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Plots</th>
                <th className="text-left py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Plan</th>
                <th className="text-right py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">MRR</th>
                <th className="text-center py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Status</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b hover:bg-muted/30">
                  <td className="py-3 px-4">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.defaultCurrency}</div>
                  </td>
                  <td className="py-3 px-4"><Badge variant="outline" className="text-[10px]">{t.type}</Badge></td>
                  <td className="py-3 px-4">{t.country || '—'}</td>
                  <td className="py-3 px-4 text-center">{t._count.farmerProfiles}</td>
                  <td className="py-3 px-4 text-center">{t._count.users}</td>
                  <td className="py-3 px-4 text-center">{t._count.plots}</td>
                  <td className="py-3 px-4">
                    {t.subscription?.status === 'TRIAL' && t.subscription?.trialEndsAt ? (
                      <div>
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                          TRIAL · {Math.max(0, Math.ceil((new Date(t.subscription.trialEndsAt).getTime() - Date.now()) / 86400000))}d left
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-0.5">{t.subscription?.plan || '—'}</div>
                      </div>
                    ) : (
                      <>
                        <div>{t.subscription?.plan || '—'}</div>
                        <div className="text-[10px] text-muted-foreground">{t.subscription?.status?.toLowerCase() || ''}</div>
                      </>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">{t.mrr > 0 ? `$${t.mrr.toFixed(0)}` : '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={t.isActive ? 'default' : 'secondary'} className="text-[10px]">
                      {t.isActive ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleActive(t)}
                      title={t.isActive ? 'Suspend' : 'Activate'}
                    >
                      <Power className={`w-4 h-4 ${t.isActive ? 'text-red-500' : 'text-green-500'}`} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function CreateTenantDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('COOPERATIVE')
  const [country, setCountry] = useState('Uganda')
  const [trialDays, setTrialDays] = useState(14)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, country, trialDays }),
    })
    setSubmitting(false)
    if (res.ok) {
      toast.success(`Tenant created · ${trialDays}-day trial`)
      setName('')
      setTrialDays(14)
      onOpenChange(false)
      onCreated()
    } else {
      toast.error('Failed to create tenant')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> New Tenant</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Tenant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mt. Elgon Coffee Coop" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-background text-sm">
              <option value="COOPERATIVE">Cooperative</option>
              <option value="EXPORTER">Exporter</option>
              <option value="NGO">NGO</option>
              <option value="MFI">MFI</option>
              <option value="AGRIBUSINESS">Agribusiness</option>
              <option value="COUNTRY">Country</option>
              <option value="BANK">Bank</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Country</label>
            <select value={country} onChange={e => setCountry(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-background text-sm">
              <option value="Uganda">🇺🇬 Uganda (UGX)</option>
              <option value="Ghana">🇬🇭 Ghana (GHS)</option>
              <option value="Kenya">🇰🇪 Kenya (KES)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Trial Period (days)</label>
            <Input
              type="number"
              min={0}
              max={365}
              value={trialDays}
              onChange={e => setTrialDays(Math.max(0, Math.min(365, Number(e.target.value) || 0)))}
              placeholder="14"
            />
            <p className="text-xs text-muted-foreground">
              Subscription is created with status <code className="text-[10px] bg-muted px-1 rounded">TRIAL</code>.
              A daily Vercel cron will auto-suspend when the trial ends. Set to 0 to disable the trial.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !name}>
            {submitting ? 'Creating...' : 'Create Tenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
