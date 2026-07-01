'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import {
  Shield, Users, Building2, UserCheck, GraduationCap, HandHelping,
  Sprout, PiggyBank, CheckCircle, XCircle, Database, Filter, Eye
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ROLE_PERMISSIONS, MODULES } from '@/lib/permissions'

interface RoleDef {
  role: string
  label: string
  icon: React.ElementType
  color: string
  description: string
  responsibilities: string[]
  dataScope: string
  tenantFiltering: string
}

const ROLE_DEFINITIONS: RoleDef[] = [
  {
    role: 'SUPER_ADMIN',
    label: 'Super Admin',
    icon: Shield,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    description: 'Platform owner (MobiPay AgroSys). Manages the entire SaaS platform — all tenants, subscriptions, revenue, and global configuration.',
    responsibilities: [
      'Create / suspend / activate tenants (cooperatives, NGOs, exporters, MFIs)',
      'Manage subscription plans (BASIC, PROFESSIONAL, ENTERPRISE) and pricing',
      'View platform-wide revenue (MRR, ARR, churn)',
      'View platform-wide impact (all farmers, all carbon credits, all EUDR compliance)',
      'Configure global settings (currencies, languages, modules)',
      'Monitor mobile app usage across all tenants',
      'Cannot see or edit individual farmer records (that is tenant-scoped)',
    ],
    dataScope: 'ALL tenants (no tenant filter)',
    tenantFiltering: 'tenantScope = "all" → no WHERE clause on tenantId. Sees aggregated platform stats only.',
  },
  {
    role: 'COUNTRY_ADMIN',
    label: 'Country Admin',
    icon: Building2,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    description: 'Country-level administrator (e.g., Agrobase Uganda). Manages all tenants and users within their country.',
    responsibilities: [
      'Manage all tenants within their country (cooperatives, agribusinesses)',
      'Create and manage users within their country',
      'View country-wide farmer statistics',
      'Approve high-value transactions',
      'Configure country-specific settings (currency, language)',
      'Cannot manage subscriptions or billing (that is Super Admin only)',
    ],
    dataScope: 'All tenants in their COUNTRY (via parent tenant hierarchy)',
    tenantFiltering: 'tenantScope = [own tenant ID + all child tenant IDs]. Sees data from all tenants under their country tenant.',
  },
  {
    role: 'TENANT_ADMIN',
    label: 'Tenant Admin',
    icon: UserCheck,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    description: 'Administrator of a single tenant (e.g., a cooperative, NGO, or agribusiness). Full CRUD within their tenant.',
    responsibilities: [
      'Manage all data within their tenant (farmers, farms, VSLA, sales, etc.)',
      'Create and manage users within their tenant',
      'Configure tenant-specific settings',
      'View tenant-wide analytics and reports',
      'Approve purchases, loans, and input requests',
      'Manage compliance (EUDR, CBAM, certifications)',
      'Cannot create new tenants or manage billing',
    ],
    dataScope: 'ONLY their own tenant',
    tenantFiltering: 'tenantScope = [own tenantId]. All queries filter WHERE tenantId = their ID.',
  },
  {
    role: 'EXTENSION_OFFICER',
    label: 'Extension Officer',
    icon: GraduationCap,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    description: 'Field officer who provides agricultural advisory services. Conducts trainings and farm visits.',
    responsibilities: [
      'Register and update farmer profiles',
      'Schedule and conduct trainings (group, farm visit, demo plot, workshop, field day)',
      'Enroll farmers in trainings and mark attendance',
      'Conduct farm visits and log observations',
      'Create and manage surveys',
      'Log Farm5X practice adoptions for farmers',
      'View (read-only) compliance and carbon data',
    ],
    dataScope: 'Their own tenant — all farmers (no per-officer assignment filter yet)',
    tenantFiltering: 'tenantScope = [own tenantId]. Same as Tenant Admin but limited permissions (no delete, no user management).',
  },
  {
    role: 'AGENT',
    label: 'Agent',
    icon: HandHelping,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    description: 'Field agent who mobilizes farmers and collects data. Lighter role than Extension Officer.',
    responsibilities: [
      'Register new farmers (field data collection)',
      'Update farmer profile information',
      'Record VSLA savings and loan applications',
      'Enroll farmers in trainings',
      'Conduct basic surveys',
      'Cannot delete records or manage users',
    ],
    dataScope: 'Their own tenant',
    tenantFiltering: 'tenantScope = [own tenantId]. Read+Create+Update only (no Delete).',
  },
  {
    role: 'CBT',
    label: 'Community Based Trainer',
    icon: Users,
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    description: 'Community-based trainer who leads demo plots and field days.',
    responsibilities: [
      'Conduct trainings (demo plot, field day)',
      'Update training notes and materials used',
      'Mark attendance',
      'View farmer profiles (read-only)',
      'View and update compliance records',
      'Conduct surveys',
    ],
    dataScope: 'Their own tenant',
    tenantFiltering: 'tenantScope = [own tenantId]. Read + Training CRUD + Compliance update.',
  },
  {
    role: 'FARMER',
    label: 'Farmer',
    icon: Sprout,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    description: 'Individual farmer. Self-service access to their own records.',
    responsibilities: [
      'View their own profile and farm data',
      'List products on the marketplace',
      'View VSLA group information',
      'View upcoming trainings',
      'Submit feedback',
      'Respond to surveys',
    ],
    dataScope: 'Their own tenant (limited modules)',
    tenantFiltering: 'tenantScope = [own tenantId]. Very restricted — only Dashboard, Profile, Marketplace, VSLA (read), Training (read), Surveys (read), Feedback (create).',
  },
  {
    role: 'VSLA_MEMBER',
    label: 'VSLA Member',
    icon: PiggyBank,
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    description: 'VSLA group member. Can view VSLA group info and their savings/loans.',
    responsibilities: [
      'View their VSLA group info',
      'View their savings and loan history',
      'View upcoming meetings',
      'View trainings',
    ],
    dataScope: 'Their own tenant (very limited)',
    tenantFiltering: 'tenantScope = [own tenantId]. Only Dashboard, VSLA (read), Profile, Training (read).',
  },
]

// Build a permission matrix: rows = modules, columns = roles
const ROLES = ['SUPER_ADMIN', 'COUNTRY_ADMIN', 'TENANT_ADMIN', 'EXTENSION_OFFICER', 'AGENT', 'CBT', 'FARMER', 'VSLA_MEMBER']

function hasReadPerm(role: string, module: string): boolean {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false
  if (perms.includes('*')) return true
  // Check exact match
  if (perms.includes(`${module}:read`)) return true
  if (perms.includes(`${module}:*`)) return true
  // Check wildcards
  for (const p of perms) {
    if (p.startsWith('!')) continue
    const [mod, action] = p.split(':')
    if (mod === '*' && (action === 'read' || action === '*')) return true
    if (action === '*' && mod === module) return true
  }
  return false
}

function hasWritePerm(role: string, module: string): 'full' | 'partial' | 'none' {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return 'none'
  if (perms.includes('*')) return 'full'
  const hasCreate = perms.includes(`${module}:create`) || perms.includes(`${module}:*`)
  const hasUpdate = perms.includes(`${module}:update`) || perms.includes(`${module}:*`)
  const hasDelete = perms.includes(`${module}:delete`) || perms.includes(`${module}:*`)
  if (hasCreate && hasUpdate && hasDelete) return 'full'
  if (hasCreate || hasUpdate) return 'partial'
  // Check wildcards
  for (const p of perms) {
    if (p.startsWith('!')) continue
    const [mod, action] = p.split(':')
    if (mod === '*' && (action === 'create' || action === 'update' || action === '*')) return 'partial'
    if (action === '*' && mod === module) return 'full'
  }
  return 'none'
}

export default function RolesPermissionsView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles &amp; Permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          8 roles · {MODULES.length} modules · Role-based access control (RBAC) with tenant isolation
        </p>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Role Definitions</TabsTrigger>
          <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
          <TabsTrigger value="filtering">Data Filtering</TabsTrigger>
        </TabsList>

        {/* ROLE DEFINITIONS */}
        <TabsContent value="roles" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ROLE_DEFINITIONS.map(rd => {
              const Icon = rd.icon
              return (
                <Card key={rd.role}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', rd.color)}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-base">{rd.label}</h3>
                        <Badge variant="outline" className="text-[10px] font-mono mt-1">{rd.role}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{rd.description}</p>
                    <Separator className="my-3" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Responsibilities</p>
                    <ul className="space-y-1 mb-3">
                      {rd.responsibilities.map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <CheckCircle className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="flex items-start gap-2">
                        <Database className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-muted-foreground">Data Scope: </span>
                          <span className="font-medium">{rd.dataScope}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Filter className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-muted-foreground">Tenant Filtering: </span>
                          <span className="font-mono text-[11px]">{rd.tenantFiltering}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* PERMISSION MATRIX */}
        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Module × Role Permission Matrix</CardTitle>
              <CardDescription>✓ = Read access · ✎ = Create/Update · ✎✓ = Full CRUD (incl. Delete)</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">Module</TableHead>
                    {ROLE_DEFINITIONS.map(rd => (
                      <TableHead key={rd.role} className="text-center min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          {React.createElement(rd.icon, { className: 'w-4 h-4' })}
                          <span className="text-[10px]">{rd.label}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODULES.map(mod => (
                    <TableRow key={mod}>
                      <TableCell className="font-medium text-sm sticky left-0 bg-background z-10 capitalize">
                        {mod.replace(/_/g, ' ')}
                      </TableCell>
                      {ROLES.map(role => {
                        const read = hasReadPerm(role, mod)
                        const write = hasWritePerm(role, mod)
                        return (
                          <TableCell key={role} className="text-center">
                            {!read ? (
                              <XCircle className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                            ) : write === 'full' ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">✎✓</Badge>
                            ) : write === 'partial' ? (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[10px]">✎</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">✓</Badge>
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">✓</Badge>
                  <span className="text-muted-foreground">Read-only access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-700 text-[10px]">✎</Badge>
                  <span className="text-muted-foreground">Create + Update (no Delete)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">✎✓</Badge>
                  <span className="text-muted-foreground">Full CRUD (Create, Read, Update, Delete)</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-muted-foreground/30" />
                  <span className="text-muted-foreground">No access (module hidden from sidebar)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DATA FILTERING */}
        <TabsContent value="filtering" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Filter className="w-4 h-4" /> How Data Is Filtered Per User / Tenant</CardTitle>
              <CardDescription>Multi-tenant isolation via middleware-injected headers + Prisma where clauses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border">
                <p className="font-semibold text-sm mb-2">1. Authentication (NextAuth JWT)</p>
                <p className="text-xs text-muted-foreground">
                  User logs in with email/phone + password. NextAuth CredentialsProvider verifies against the User table.
                  JWT token includes: <code className="text-[11px] bg-background px-1 rounded">userId</code>, <code className="text-[11px] bg-background px-1 rounded">tenantId</code>, <code className="text-[11px] bg-background px-1 rounded">role</code>.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border">
                <p className="font-semibold text-sm mb-2">2. Middleware (src/middleware.ts)</p>
                <p className="text-xs text-muted-foreground mb-2">For every API request, the middleware:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Verifies the JWT token (rejects if invalid → 401)</li>
                  <li>Checks rate limits (per-user, per-IP)</li>
                  <li>Checks module-level permission via <code className="text-[11px] bg-background px-1 rounded">hasPermission(role, 'module:read')</code> → 403 if denied</li>
                  <li>Checks tenant entitlement (is this module included in the tenant's subscription plan?)</li>
                  <li>Sets headers: <code className="text-[11px] bg-background px-1 rounded">x-user-id</code>, <code className="text-[11px] bg-background px-1 rounded">x-user-role</code>, <code className="text-[11px] bg-background px-1 rounded">x-tenant-id</code>, <code className="text-[11px] bg-background px-1 rounded">x-tenant-scope</code></li>
                </ol>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border">
                <p className="font-semibold text-sm mb-2">3. Tenant Scope Resolution</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <Badge className="bg-red-100 text-red-700 text-[10px]">SUPER_ADMIN</Badge>
                    <span className="text-muted-foreground"><code className="text-[11px] bg-background px-1 rounded">x-tenant-scope = "all"</code> → No tenantId filter in queries. Sees all tenants' data.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="bg-blue-100 text-blue-700 text-[10px]">COUNTRY_ADMIN</Badge>
                    <span className="text-muted-foreground"><code className="text-[11px] bg-background px-1 rounded">x-tenant-scope = "tenant-id-1,tenant-id-2,..."</code> → All child tenants under their country tenant.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">TENANT_ADMIN / EO / AGENT / CBT / FARMER / VSLA_MEMBER</Badge>
                    <span className="text-muted-foreground"><code className="text-[11px] bg-background px-1 rounded">x-tenant-scope = "own-tenant-id"</code> → Only their own tenant's data.</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border">
                <p className="font-semibold text-sm mb-2">4. API Route Query Filtering</p>
                <p className="text-xs text-muted-foreground mb-2">Every API route calls <code className="text-[11px] bg-background px-1 rounded">getTenantContext()</code> then <code className="text-[11px] bg-background px-1 rounded">buildTenantFilter(ctx)</code>:</p>
                <pre className="text-[11px] bg-background p-3 rounded font-mono overflow-x-auto">{`// In every API route:
const ctx = await getTenantContext()
const tf = buildTenantFilter(ctx, 'tenantId')
// tf = {} for SUPER_ADMIN (no filter)
// tf = { tenantId: { in: ['tenant-id-1'] } } for everyone else

const farmers = await db.farmerProfile.findMany({
  where: { ...tf, status: 'ACTIVE' }
})`}</pre>
                <p className="text-xs text-muted-foreground mt-2">
                  This ensures a farmer in Uganda can NEVER see a farmer in Ghana's data, even if they know the ID.
                  The filter is applied at the database query level.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border">
                <p className="font-semibold text-sm mb-2">5. Sidebar Menu Filtering (Client-side)</p>
                <p className="text-xs text-muted-foreground">
                  The Sidebar component uses <code className="text-[11px] bg-background px-1 rounded">hasPermission(role, 'module:read')</code> to show/hide menu items.
                  A FARMER only sees Dashboard, Profile, Marketplace, VSLA, Training, Surveys, Feedback.
                  A SUPER_ADMIN only sees the Super Admin group (Platform Overview, Tenants, Revenue, Impact, Users, Mobile, Config).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
