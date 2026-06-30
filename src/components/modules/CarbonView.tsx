'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Cloud, Plus, Eye, Leaf, Award, Shield, TrendingUp, Globe, FileText,
  Loader2, ArrowLeft, Calendar, DollarSign, TreePine, Layers, Activity,
  CheckCircle, XCircle, Save
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { safeFetch, extractArray } from '@/lib/safe-fetch'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  REGISTERED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  VALIDATED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  VERIFIED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  ISSUED: 'bg-emerald-600 text-white',
  RETIRED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

const methodologyColor: Record<string, string> = {
  'VM0042': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'IPCC-2019': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'GOLD-STANDARD': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'VERRA-VCS': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'DREAM': 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'CBAM': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

export default function CarbonView() {
  const [projects, setProjects] = useState<any[]>([])
  const [credits, setCredits] = useState<any[]>([])
  const [cbamReports, setCbamReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showCreate, setShowCreate] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [p, c, cb] = await Promise.all([
      safeFetch('/api/carbon/projects'),
      safeFetch('/api/carbon/credits'),
      safeFetch('/api/carbon/cbam'),
    ])
    setProjects(extractArray(p, 'projects', 'data'))
    setCredits(extractArray(c, 'credits', 'data'))
    setCbamReports(extractArray(cb, 'reports', 'data'))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const stats = {
    totalProjects: projects.length,
    totalCredits: credits.reduce((s, c) => s + (c.amount || 0), 0),
    issuedCredits: credits.filter(c => c.status === 'ISSUED').reduce((s, c) => s + (c.amount || 0), 0),
    retiredCredits: credits.filter(c => c.status === 'RETIRED').reduce((s, c) => s + (c.amount || 0), 0),
    cbamReports: cbamReports.length,
  }

  // Group by methodology
  const byMethodology = projects.reduce((acc, p) => {
    const m = p.methodology || 'UNKNOWN'
    acc[m] = (acc[m] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const methodologyData = Object.entries(byMethodology).map(([name, value]) => ({ name, value }))

  // Credits by status
  const creditsByStatus = credits.reduce((acc, c) => {
    const s = c.status || 'UNKNOWN'
    acc[s] = (acc[s] || 0) + (c.amount || 0)
    return acc
  }, {} as Record<string, number>)
  const statusData = Object.entries(creditsByStatus).map(([name, value]) => ({ name, value }))

  if (selectedProject) {
    return <ProjectDetail project={selectedProject} onBack={() => setSelectedProject(null)} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Cloud className="w-5 h-5 text-emerald-600" /> Carbon &amp; Compliance</h3>
          <p className="text-sm text-muted-foreground">IPCC · Verra VCS · Gold Standard · DREAM MRV · CBAM · EUDR</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" /> Create Project</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"><TreePine className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Projects</p><p className="text-lg font-bold">{stats.totalProjects}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center"><Award className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">Total Credits</p><p className="text-lg font-bold">{stats.totalCredits.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-purple-600" /></div><div><p className="text-xs text-muted-foreground">Issued</p><p className="text-lg font-bold">{stats.issuedCredits.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center"><XCircle className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-muted-foreground">Retired</p><p className="text-lg font-bold">{stats.retiredCredits.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center"><Shield className="w-5 h-5 text-red-600" /></div><div><p className="text-xs text-muted-foreground">CBAM Reports</p><p className="text-lg font-bold">{stats.cbamReports}</p></div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="cbam">CBAM</TabsTrigger>
          <TabsTrigger value="methodologies">Methodologies</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {loading ? <Skeleton className="h-80 w-full rounded-xl" /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Projects by Methodology</CardTitle></CardHeader>
                <CardContent>
                  {methodologyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={methodologyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                          {methodologyData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-sm text-muted-foreground py-8">No projects yet</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Credits by Status (tCO₂e)</CardTitle></CardHeader>
                <CardContent>
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={statusData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-sm text-muted-foreground py-8">No credits yet</p>}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Methodology info */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Supported Methodologies</CardTitle><CardDescription>Standards-aligned carbon accounting frameworks</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <MethodologyCard code="IPCC-2019" name="IPCC 2019 Refinement" desc="Tier 1/2/3 GHG inventory for AFOLU sector. Default emission factors for soil, livestock, rice." color="purple" />
                <MethodologyCard code="VERRA-VCS" name="Verra VCS (VM0042)" desc="Soil Carbon Quantification Methodology — agricultural land management." color="emerald" />
                <MethodologyCard code="GOLD-STANDARD" name="Gold Standard" desc="GS-Agri / GS-REDD+ — smallholder agroforestry & energy." color="amber" />
                <MethodologyCard code="DREAM" name="DREAM MRV" desc="DREAM 5-phase: Define, Register, Engage, Adopt, Measure. Farm5x-native." color="pink" />
                <MethodologyCard code="CBAM" name="EU CBAM" desc="Carbon Border Adjustment Mechanism — declarant reporting for EU imports." color="red" />
                <MethodologyCard code="EUDR" name="EU EUDR" desc="Deforestation-free supply chain due diligence (coffee, cocoa, palm oil)." color="blue" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects */}
        <TabsContent value="projects" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Carbon Projects</CardTitle></CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><TreePine className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="font-medium">No carbon projects yet</p><p className="text-sm mt-1">Create a project to register with Verra, Gold Standard, or DREAM.</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Methodology</TableHead>
                      <TableHead className="hidden md:table-cell">Country</TableHead>
                      <TableHead className="text-right">Est. tCO₂e/yr</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map(p => (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedProject(p)}>
                        <TableCell className="font-medium text-sm">{p.name}</TableCell>
                        <TableCell><Badge className={cn('text-[10px]', methodologyColor[p.methodology] || '')}>{p.methodology || '—'}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{p.country || '—'}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{p.estimatedAnnualCredits?.toLocaleString() || '—'}</TableCell>
                        <TableCell><Badge className={cn('text-[10px]', statusColor[p.status] || '')}>{p.status}</Badge></TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credits */}
        <TabsContent value="credits" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Carbon Credit Ledger</CardTitle></CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
              ) : credits.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Award className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="font-medium">No credits issued yet</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serial</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Amount (tCO₂e)</TableHead>
                      <TableHead className="hidden md:table-cell">Vintage</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credits.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.serialNumber || c.id.slice(0, 10)}</TableCell>
                        <TableCell className="text-sm">{c.project?.name || '—'}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{c.amount?.toLocaleString()}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{c.vintageYear || '—'}</TableCell>
                        <TableCell><Badge className={cn('text-[10px]', statusColor[c.status] || '')}>{c.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CBAM */}
        <TabsContent value="cbam" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">EU CBAM Reports</CardTitle><CardDescription>Carbon Border Adjustment Mechanism declarant reports</CardDescription></CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
              ) : cbamReports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Shield className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="font-medium">No CBAM reports yet</p><p className="text-sm mt-1">CBAM reports will be auto-generated quarterly.</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report ID</TableHead>
                      <TableHead className="hidden md:table-cell">Period</TableHead>
                      <TableHead className="text-right">Emissions (tCO₂e)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cbamReports.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.reportId || r.id.slice(0, 10)}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{r.reportingPeriod || '—'}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{r.totalEmissions?.toLocaleString() || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{r.status || 'DRAFT'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Methodologies */}
        <TabsContent value="methodologies" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Methodology Documentation</CardTitle><CardDescription>Standards-aligned carbon accounting frameworks supported by Agrobase V3</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MethodologyDetail code="IPCC-2019" name="IPCC 2019 Refinement" desc="The 2019 Refinement to the 2006 IPCC Guidelines for National GHG Inventories. Tier 1/2/3 methods for AFOLU (Agriculture, Forestry and Other Land Use). Agrobase uses Tier 2 for soil carbon and Tier 1 for enteric fermentation, manure management, and rice cultivation." link="https://www.ipcc.ch/report/2019-refinement-to-the-2006-ipcc-guidelines-for-national-greenhouse-gas-inventories/" />
                <MethodologyDetail code="VCS-VM0042" name="Verra VM0042" desc="VCS Methodology VM0042 v2.0 — Soil Carbon Quantification Methodology. Approved for agricultural land management projects. Covers cropland, grassland, and agroforestry. Agrobase integrates with the Verra registry for project listing & verification." link="https://verra.org/methodologies/vm0042/" />
                <MethodologyDetail code="GOLD-STANDARD" name="Gold Standard for the Global Goals" desc="GS-Agri (land-use & agriculture), GS-REDD+ (deforestation). Includes co-benefits certification (gender, livelihoods, biodiversity). Used for smallholder agroforestry carbon projects in East Africa." link="https://www.goldstandard.org/" />
                <MethodologyDetail code="DREAM" name="DREAM MRV Framework" desc="DREAM = Define, Register, Engage, Adopt, Measure. A 5-phase MRV framework built specifically for smallholder farmer programs. Farm5x-aligned: 1M5R (5Rs), 1M5C, 1M5K, 1M5T, etc. Each cultivation has a DREAM lifecycle." link="#" />
                <MethodologyDetail code="CBAM" name="EU CBAM Regulation" desc="Carbon Border Adjustment Mechanism (Reg. 2023/956). Transitional reporting from Oct 2023; definitive from Jan 2026. Agrobase generates quarterly CBAM declarant reports with embedded emissions & CN code mapping." link="https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en" />
                <MethodologyDetail code="EUDR" name="EU Deforestation Regulation" desc="Reg. (EU) 2023/1115. Deforestation-free supply chain for coffee, cocoa, palm oil, soy, rubber, cattle, wood. Agrobase auto-checks plot polygons against satellite deforestation baselines (Dec 31, 2020 cutoff)." link="https://environment.ec.europa.eu/topics/forests/deforestation/regulation-deforestation-free-products_en" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Project Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Carbon Project</DialogTitle>
            <CardDescription>Register a new carbon project under IPCC, Verra VCS, Gold Standard, or DREAM methodology.</CardDescription>
          </DialogHeader>
          <CreateProjectForm onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchAll() }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MethodologyCard({ code, name, desc, color }: { code: string; name: string; desc: string; color: string }) {
  const colorMap: Record<string, string> = {
    purple: 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20',
    emerald: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20',
    amber: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20',
    pink: 'border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/20',
    red: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20',
    blue: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20',
  }
  return (
    <div className={cn('p-3 rounded-lg border', colorMap[color])}>
      <Badge variant="outline" className="text-[10px] font-mono mb-1">{code}</Badge>
      <p className="font-medium text-sm">{name}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  )
}

function MethodologyDetail({ code, name, desc, link }: { code: string; name: string; desc: string; link: string }) {
  return (
    <div className="p-4 rounded-lg border">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-[10px] font-mono">{code}</Badge>
        <p className="font-semibold">{name}</p>
      </div>
      <p className="text-sm text-muted-foreground">{desc}</p>
      {link !== '#' && <a href={link} target="_blank" rel="noreferrer" className="text-xs text-primary mt-2 inline-block hover:underline">View official documentation →</a>}
    </div>
  )
}

function ProjectDetail({ project, onBack }: { project: any; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back to Projects</Button>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0"><TreePine className="w-7 h-7 text-emerald-600" /></div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{project.name}</h2>
              <p className="text-sm text-muted-foreground">{project.country || 'No country'} · Created {new Date(project.createdAt).toLocaleDateString()}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className={cn('text-[10px]', methodologyColor[project.methodology] || '')}>{project.methodology}</Badge>
                <Badge className={cn('text-[10px]', statusColor[project.status] || '')}>{project.status}</Badge>
                {project.vintageYear && <Badge variant="outline">Vintage {project.vintageYear}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><TrendingUp className="w-5 h-5 mx-auto text-emerald-600 mb-1" /><p className="text-xs text-muted-foreground">Est. Annual Credits</p><p className="text-lg font-bold">{project.estimatedAnnualCredits?.toLocaleString() || '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Award className="w-5 h-5 mx-auto text-blue-600 mb-1" /><p className="text-xs text-muted-foreground">Issued</p><p className="text-lg font-bold">{project.issuedCredits?.toLocaleString() || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Calendar className="w-5 h-5 mx-auto text-amber-600 mb-1" /><p className="text-xs text-muted-foreground">Project Start</p><p className="text-sm font-bold">{project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Calendar className="w-5 h-5 mx-auto text-red-600 mb-1" /><p className="text-xs text-muted-foreground">Project End</p><p className="text-sm font-bold">{project.endDate ? new Date(project.endDate).toLocaleDateString() : '—'}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Project Description</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm">{project.description || 'No description provided.'}</p>
          {project.pddUrl && <a href={project.pddUrl} target="_blank" rel="noreferrer" className="text-xs text-primary mt-2 inline-block hover:underline"><FileText className="w-3 h-3 inline mr-1" />Download Project Design Document (PDD)</a>}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Create Project Form ───────────────────────────────────────────

function CreateProjectForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({
    name: '',
    description: '',
    standard: 'VERRA_VCS',
    methodologyCode: 'VM0042',
    projectType: 'AGROFORESTRY',
    country: 'Uganda',
    region: '',
    totalAreaHectares: '',
    estimatedAnnualRemovals: '',
    projectStartDate: '',
    projectEndDate: '',
    creditingPeriodYears: '10',
    proponentName: '',
    proponentContact: '',
  })

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { toast.error('Project name is required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        totalAreaHectares: form.totalAreaHectares ? parseFloat(form.totalAreaHectares) : null,
        estimatedAnnualRemovals: form.estimatedAnnualRemovals ? parseFloat(form.estimatedAnnualRemovals) : null,
        projectStartDate: form.projectStartDate || null,
        projectEndDate: form.projectEndDate || null,
        creditingPeriodYears: form.creditingPeriodYears ? parseInt(form.creditingPeriodYears) : null,
        creditingPeriodStart: form.projectStartDate || null,
        creditingPeriodEnd: form.projectEndDate || null,
      }
      const res = await fetch('/api/carbon/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Carbon project created')
        onSaved()
      } else {
        toast.error(data.error || 'Failed to create project')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Project Name *</Label>
        <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Mt. Elgon Coffee Agroforestry" required />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={2} placeholder="Brief description of the project..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Standard</Label>
          <Select value={form.standard} onValueChange={v => update('standard', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="VERRA_VCS">Verra VCS</SelectItem>
              <SelectItem value="GOLD_STANDARD">Gold Standard</SelectItem>
              <SelectItem value="PLANET">Planet</SelectItem>
              <SelectItem value="AMERICAN_CARBON_REGISTRY">American Carbon Registry</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Methodology Code</Label>
          <Input value={form.methodologyCode} onChange={e => update('methodologyCode', e.target.value)} placeholder="e.g. VM0042" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Project Type</Label>
          <Select value={form.projectType} onValueChange={v => update('projectType', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="AFFORESTATION">Afforestation</SelectItem>
              <SelectItem value="REFORESTATION">Reforestation</SelectItem>
              <SelectItem value="AGRICULTURE">Agriculture</SelectItem>
              <SelectItem value="SOIL_CARBON">Soil Carbon</SelectItem>
              <SelectItem value="BIOCHAR">Biochar</SelectItem>
              <SelectItem value="AGROFORESTRY">Agroforestry</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Country</Label>
          <Select value={form.country} onValueChange={v => update('country', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Uganda">Uganda</SelectItem>
              <SelectItem value="Ghana">Ghana</SelectItem>
              <SelectItem value="Kenya">Kenya</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5"><Label>Area (ha)</Label><Input type="number" step="0.1" value={form.totalAreaHectares} onChange={e => update('totalAreaHectares', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Est. Annual Removals (tCO₂e)</Label><Input type="number" value={form.estimatedAnnualRemovals} onChange={e => update('estimatedAnnualRemovals', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Crediting Period (years)</Label><Input type="number" value={form.creditingPeriodYears} onChange={e => update('creditingPeriodYears', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.projectStartDate} onChange={e => update('projectStartDate', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={form.projectEndDate} onChange={e => update('projectEndDate', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Proponent Name</Label><Input value={form.proponentName} onChange={e => update('proponentName', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Proponent Contact</Label><Input value={form.proponentContact} onChange={e => update('proponentContact', e.target.value)} placeholder="email or phone" /></div>
      </div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Create Project</Button>
      </DialogFooter>
    </form>
  )
}
