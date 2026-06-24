'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Settings, Users, MapPin, Shield, Key, Database, Building2,
  Plus, Search, ChevronRight, Globe, Layers
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'

const tenantTypeColor: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  COUNTRY: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  NGO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  COOPERATIVE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  AGRIBUSINESS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  EXPORTER: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  MFI: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  BANK: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
}

// Mock tenant data - in production this would come from an API
const MOCK_TENANTS = [
  { id: '1', name: 'MobiPay AgroSys HQ', type: 'SUPER_ADMIN', country: 'Uganda', children: 3, isActive: true },
  { id: '2', name: 'Agrobase Uganda', type: 'COUNTRY', country: 'Uganda', children: 2, isActive: true },
  { id: '3', name: 'Agrobase Ghana', type: 'COUNTRY', country: 'Ghana', children: 1, isActive: true },
  { id: '4', name: 'Agrobase Kenya', type: 'COUNTRY', country: 'Kenya', children: 1, isActive: true },
  { id: '5', name: 'Send a Cow Uganda', type: 'NGO', country: 'Uganda', children: 0, isActive: true },
  { id: '6', name: 'Uganda Coffee Cooperative', type: 'COOPERATIVE', country: 'Uganda', children: 0, isActive: true },
  { id: '7', name: 'Ghana Cocoa Board', type: 'AGRIBUSINESS', country: 'Ghana', children: 0, isActive: true },
  { id: '8', name: 'Kenya Fresh Export', type: 'EXPORTER', country: 'Kenya', children: 0, isActive: true },
  { id: '9', name: 'Equity Bank Uganda', type: 'BANK', country: 'Uganda', children: 0, isActive: false },
]

const MOCK_MODULES = [
  { code: 'FARMER_PROFILING', name: 'Farmer Profiling', enabled: true },
  { code: 'VSLA', name: 'VSLA Management', enabled: true },
  { code: 'MARKETPLACE', name: 'Marketplace', enabled: true },
  { code: 'TRAINING', name: 'Training & Extension', enabled: true },
  { code: 'CREDIT_SCORING', name: 'Credit Scoring', enabled: true },
  { code: 'INPUT_AGGREGATION', name: 'Input Aggregation', enabled: false },
  { code: 'TRACEABILITY', name: 'Traceability', enabled: false },
  { code: 'SURVEYS', name: 'Surveys', enabled: true },
  { code: 'PAYMENTS', name: 'Payments', enabled: true },
  { code: 'LOANS', name: 'Loan Management', enabled: true },
  { code: 'REPORTS', name: 'Reports & Analytics', enabled: true },
  { code: 'COMMUNICATION', name: 'Communication', enabled: true },
]

const COUNTRIES = ['Uganda', 'Ghana', 'Kenya']
const CURRENCIES: Record<string, string> = { Uganda: 'UGX', Ghana: 'GHS', Kenya: 'KES' }

export default function SettingsView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [activeTab, setActiveTab] = useState(activeSubTab || 'tenants')
  const [tenantSearch, setTenantSearch] = useState('')

  const handleTabChange = (t: string) => { setActiveTab(t); setActiveSubTab(t) }

  const filteredTenants = MOCK_TENANTS.filter(t =>
    t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.type.toLowerCase().includes(tenantSearch.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="tenants" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Tenants</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="geo" className="gap-1.5"><MapPin className="w-3.5 h-3.5" /> Geography</TabsTrigger>
          <TabsTrigger value="modules" className="gap-1.5"><Layers className="w-3.5 h-3.5" /> Modules</TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5"><Database className="w-3.5 h-3.5" /> System</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search tenants..." className="pl-9" value={tenantSearch} onChange={e => setTenantSearch(e.target.value)} />
            </div>
            <Button className="gap-2 ml-3" onClick={() => toast.info('Create tenant — Coming soon')}>
              <Plus className="w-4 h-4" /> Add Tenant
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Sub-tenants</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {t.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                          </div>
                          <span className="font-medium text-sm">{t.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge className={cn('text-[10px]', tenantTypeColor[t.type] || '')}>{t.type}</Badge></TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1"><Globe className="w-3 h-3 text-muted-foreground" />{t.country}</div>
                      </TableCell>
                      <TableCell className="text-sm">{t.children > 0 ? <Badge variant="outline" className="text-[10px]">{t.children}</Badge> : '—'}</TableCell>
                      <TableCell>
                        <Badge className={cn('text-[10px]', t.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        )}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">User Management</p>
              <p className="text-sm mt-1">Manage users, roles, and permissions across tenants</p>
              <Button className="mt-4" variant="outline" onClick={() => toast.info('User management — Coming soon')}>Configure Users</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geo" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Geographic Hierarchy</p>
              <p className="text-sm mt-1">Manage regions, districts, sub-counties, parishes, and villages for Uganda, Ghana, and Kenya</p>
              <div className="flex justify-center gap-2 mt-4">
                {COUNTRIES.map(c => (
                  <Button key={c} variant="outline" onClick={() => toast.info(`${c} geography management — Coming soon`)} className="gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> {c} ({CURRENCIES[c]})
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Module Entitlements</CardTitle>
              <CardDescription>Enable or disable platform modules per tenant subscription</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_MODULES.map(mod => (
                  <div key={mod.code} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{mod.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{mod.code}</p>
                    </div>
                    <Switch
                      checked={mod.enabled}
                      onCheckedChange={() => toast.info(`Module "${mod.name}" toggle — Coming soon`)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Platform Info</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-mono font-medium">V3.0.0</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Environment</span><Badge variant="outline" className="text-[10px]">Development</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Database</span><span className="font-mono text-xs">SQLite</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Framework</span><span>Next.js 16</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Multi-Channel</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span>USSD Access</span><Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">*284*56#</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span>Mobile App</span><Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Android + iOS</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span>IVR</span><Badge className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span>SMS Gateway</span><Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}