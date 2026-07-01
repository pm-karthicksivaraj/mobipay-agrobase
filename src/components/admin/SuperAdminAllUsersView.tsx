'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Download, Power, Users, UserCheck, UserX, Shield } from 'lucide-react'
import { toast } from 'sonner'

interface AdminUser {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  role: string
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  tenant: { id: string; name: string; country: string | null; type: string } | null
}

interface AdminUsersResponse {
  users: AdminUser[]
  total: number
  page: number
  totalPages: number
  stats: {
    totalUsers: number
    activeUsers: number
    usersByRole: { role: string; count: number }[]
  }
}

const ROLE_OPTIONS = [
  'SUPER_ADMIN', 'TENANT_ADMIN', 'FIELD_AGENT', 'FARMER', 'COOP_MANAGER',
  'MFI_OFFICER', 'TRANSPORTER', 'EXPORTER', 'COMPLIANCE_OFFICER', 'FINANCE',
]

function fullName(u: AdminUser): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—'
}

function exportCsv(users: AdminUser[]) {
  const headers = ['Name', 'Email', 'Phone', 'Role', 'Tenant', 'Tenant Type', 'Country', 'Active', 'Last Login', 'Created At']
  const rows = users.map(u => [
    fullName(u),
    u.email || '',
    u.phone || '',
    u.role,
    u.tenant?.name || '',
    u.tenant?.type || '',
    u.tenant?.country || '',
    u.isActive ? 'Yes' : 'No',
    u.lastLogin ? new Date(u.lastLogin).toISOString() : '',
    u.createdAt ? new Date(u.createdAt).toISOString() : '',
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `all-users-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function SuperAdminAllUsersView() {
  const [data, setData] = useState<AdminUsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')

  const load = () => {
    setLoading(true)
    setError(null)
    fetch('/api/admin/users?limit=500')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: AdminUsersResponse) => setData(d))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const tenants = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: string }>()
    data?.users.forEach(u => {
      if (u.tenant) map.set(u.tenant.id, { id: u.tenant.id, name: u.tenant.name, type: u.tenant.type })
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [data])

  const filtered = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.users.filter(u => {
      if (q) {
        const haystack = [fullName(u), u.email || '', u.phone || ''].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (roleFilter && u.role !== roleFilter) return false
      if (tenantFilter && u.tenant?.id !== tenantFilter) return false
      return true
    })
  }, [data, search, roleFilter, tenantFilter])

  const toggleActive = async (u: AdminUser) => {
    const res = await fetch(`/api/users/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.isActive }),
    })
    if (res.ok) {
      toast.success(`${fullName(u)} ${u.isActive ? 'deactivated' : 'activated'}`)
      setData(prev => prev ? {
        ...prev,
        users: prev.users.map(x => x.id === u.id ? { ...x, isActive: !u.isActive } : x),
      } : prev)
    } else {
      toast.error('Failed to update user')
    }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-96" /></div>
  if (error || !data) return <div className="p-8 text-center text-muted-foreground">Failed to load: {error}</div>

  const stats = data.stats

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Users</h1>
          <p className="text-sm text-muted-foreground">
            {stats.totalUsers} total · {stats.activeUsers} active · {stats.totalUsers - stats.activeUsers} inactive
          </p>
        </div>
        <Button variant="outline" onClick={() => exportCsv(filtered)} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV ({filtered.length})
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Users" value={stats.totalUsers} sub="across all tenants" icon={Users} color="#2798d1" />
        <KpiCard label="Active" value={stats.activeUsers} sub="can log in" icon={UserCheck} color="#428e5c" />
        <KpiCard label="Inactive" value={stats.totalUsers - stats.activeUsers} sub="deactivated" icon={UserX} color="#bc4156" />
        <KpiCard label="Roles" value={stats.usersByRole.length} sub="distinct roles" icon={Shield} color="#577592" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm border rounded-md bg-background"
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={tenantFilter}
          onChange={e => setTenantFilter(e.target.value)}
          className="px-3 py-2 text-sm border rounded-md bg-background max-w-[220px]"
        >
          <option value="">All tenants</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Name</th>
                <th className="text-left py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Email</th>
                <th className="text-left py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Phone</th>
                <th className="text-left py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Role</th>
                <th className="text-left py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Tenant</th>
                <th className="text-left py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Country</th>
                <th className="text-center py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Active</th>
                <th className="text-left py-3 px-4 text-xs uppercase text-muted-foreground font-semibold">Last Login</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No users match your filters.
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="border-b hover:bg-muted/30">
                  <td className="py-3 px-4 font-medium">{fullName(u)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{u.email || '—'}</td>
                  <td className="py-3 px-4 text-muted-foreground">{u.phone || '—'}</td>
                  <td className="py-3 px-4"><Badge variant="outline" className="text-[10px]">{u.role}</Badge></td>
                  <td className="py-3 px-4">
                    {u.tenant ? (
                      <div>
                        <div className="text-sm">{u.tenant.name}</div>
                        <div className="text-[10px] text-muted-foreground">{u.tenant.type}</div>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-3 px-4">{u.tenant?.country || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={u.isActive ? 'default' : 'secondary'} className="text-[10px]">
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-3 px-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleActive(u)}
                      title={u.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <Power className={`w-4 h-4 ${u.isActive ? 'text-red-500' : 'text-green-500'}`} />
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

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: any; sub: string; icon: any; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mt-1">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </Card>
  )
}
