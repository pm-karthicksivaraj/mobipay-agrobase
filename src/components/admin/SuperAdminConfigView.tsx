'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Save, Globe, DollarSign, Bell, Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ConfigData {
  defaultCurrency: string
  defaultLanguage: string
  supportedCountries: string[]
  smsGateway: string
  emailGateway: string
  maintenanceMode: boolean
  signupEnabled: boolean
  maxFileUploadMB: number
}

export default function SuperAdminConfigView() {
  const [data, setData] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<ConfigData>>({})

  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => r.json())
      .then(d => {
        setData(d)
        setForm(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success('Configuration updated')
      } else {
        toast.error('Failed to update configuration')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Configuration</h1>
          <p className="text-sm text-muted-foreground">Global settings applied across all tenants</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Localization */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Localization</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Default Currency</Label>
              <Select value={form.defaultCurrency || 'UGX'} onValueChange={v => setForm(p => ({ ...p, defaultCurrency: v }))}>
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
              <Label>Default Language</Label>
              <Select value={form.defaultLanguage || 'en'} onValueChange={v => setForm(p => ({ ...p, defaultLanguage: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sw">Swahili</SelectItem>
                  <SelectItem value="lg">Luganda</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Communication */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" /> Communication Gateways</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>SMS Gateway</Label>
              <Input value={form.smsGateway || ''} onChange={e => setForm(p => ({ ...p, smsGateway: e.target.value }))} placeholder="e.g. Africa's Talking" />
            </div>
            <div className="space-y-1.5">
              <Label>Email Gateway</Label>
              <Input value={form.emailGateway || ''} onChange={e => setForm(p => ({ ...p, emailGateway: e.target.value }))} placeholder="e.g. SendGrid" />
            </div>
          </CardContent>
        </Card>

        {/* Platform */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Platform Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">Temporarily disable all non-admin access</p>
              </div>
              <Badge variant={form.maintenanceMode ? 'destructive' : 'secondary'}>
                {form.maintenanceMode ? 'ON' : 'OFF'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Tenant Self-Signup</p>
                <p className="text-xs text-muted-foreground">Allow new tenants to register</p>
              </div>
              <Badge variant={form.signupEnabled ? 'default' : 'secondary'}>
                {form.signupEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <Label>Max File Upload (MB)</Label>
              <Input type="number" value={form.maxFileUploadMB || 10} onChange={e => setForm(p => ({ ...p, maxFileUploadMB: parseInt(e.target.value) }))} />
            </div>
          </CardContent>
        </Card>

        {/* Supported Countries */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Supported Countries</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(form.supportedCountries || ['Uganda', 'Ghana', 'Kenya']).map((c, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border">
                  <span className="text-lg">{c === 'Uganda' ? '🇺🇬' : c === 'Ghana' ? '🇬🇭' : c === 'Kenya' ? '🇰🇪' : '🌍'}</span>
                  <span className="text-sm font-medium">{c}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
