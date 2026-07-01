'use client'

import React from 'react'
import { useAppStore, type ModuleKey } from '@/lib/store'
import { cn } from '@/lib/utils'
import { hasPermission, getRoleModules } from '@/lib/permissions'
import {
  LayoutDashboard, Users, Store, CreditCard, GraduationCap,
  Settings, MessageSquare, BarChart3, Target,
  Package, Truck, ClipboardCheck, Building2, UserCheck, Shield, Layers,
  Receipt, TrendingUp, Phone, Map, Radio, ShoppingCart,
  Sprout, PiggyBank, DollarSign, FileText, Leaf,
  Stethoscope, Activity, Smartphone, TreePine, UsersRound, Landmark, MapPin,
  Cloud, Calculator, BookOpen, KeyRound
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItem {
  key: ModuleKey
  label: string
  icon: React.ElementType
  group: string
  /** Maps sidebar module key → RBAC module name used in permissions.ts */
  permModule?: string
  /** Special keys always visible (Profile, Settings for self) */
  alwaysVisible?: boolean
}

const ALL_MODULES: NavItem[] = [
  // Overview
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview', permModule: 'dashboard', alwaysVisible: true },
  // Core Operations
  { key: 'farmers', label: 'Farmer Profiling', icon: Users, group: 'Core Operations', permModule: 'farmers' },
  { key: 'farm-lands', label: 'Farm Land Registry', icon: MapPin, group: 'Core Operations', permModule: 'farmers' },
  { key: 'cultivations', label: 'Cultivations', icon: Sprout, group: 'Core Operations', permModule: 'farmers' },
  { key: 'vsla', label: 'VSLA Management', icon: PiggyBank, group: 'Core Operations', permModule: 'vsla' },
  { key: 'marketplace', label: 'Marketplace', icon: Store, group: 'Core Operations', permModule: 'marketplace' },
  { key: 'payments', label: 'Payments', icon: CreditCard, group: 'Core Operations', permModule: 'payments' },
  { key: 'loans', label: 'Loan Management', icon: DollarSign, group: 'Core Operations', permModule: 'loans' },
  { key: 'training', label: 'Training & Groups', icon: GraduationCap, group: 'Core Operations', permModule: 'training' },
  { key: 'farm-visits', label: 'Farm Visits', icon: Leaf, group: 'Core Operations', permModule: 'farm_visits' },
  // Farm Management (Core Product)
  { key: 'crop-stages', label: 'Crop Stage Library', icon: BookOpen, group: 'Farm Management', permModule: 'farmers' },
  { key: 'farm5x', label: 'Mazao Safi Practices', icon: Layers, group: 'Farm Management', permModule: 'carbon' },
  { key: 'cost-of-cultivation', label: 'Cost of Cultivation', icon: Calculator, group: 'Farm Management', permModule: 'farmers' },
  { key: 'carbon', label: 'Carbon & Compliance', icon: Cloud, group: 'Farm Management', permModule: 'carbon' },
  // Supply Chain
  { key: 'input-aggregation', label: 'Input Aggregation', icon: Package, group: 'Supply Chain', permModule: 'input_aggregation' },
  { key: 'purchases', label: 'Purchases', icon: ShoppingCart, group: 'Supply Chain', permModule: 'purchases' },
  { key: 'approvals', label: 'Approvals Hub', icon: ClipboardCheck, group: 'Supply Chain', permModule: 'approvals' },
  { key: 'processing', label: 'Processing', icon: Layers, group: 'Supply Chain', permModule: 'processing' },
  { key: 'sales', label: 'Sales', icon: Receipt, group: 'Supply Chain', permModule: 'sales' },
  { key: 'deliveries', label: 'Deliveries', icon: Truck, group: 'Supply Chain', permModule: 'deliveries' },
  { key: 'consignments', label: 'Consignments', icon: Truck, group: 'Supply Chain', permModule: 'consignments' },
  { key: 'trace', label: 'Traceability', icon: Map, group: 'Supply Chain', permModule: 'trace' },
  { key: 'plots', label: 'Plot-Level Trace', icon: MapPin, group: 'Supply Chain', permModule: 'trace' },
  // Intelligence
  { key: 'reports', label: 'Reports & Analytics', icon: BarChart3, group: 'Intelligence', permModule: 'reports' },
  { key: 'agritrack', label: 'AgriTrack', icon: Target, group: 'Intelligence', permModule: 'agritrack' },
  { key: 'impact-assessment', label: 'Impact Assessment', icon: Activity, group: 'Intelligence', permModule: 'impact_assessment' },
  // Engagement
  { key: 'communication', label: 'Communication', icon: MessageSquare, group: 'Engagement', permModule: 'communication' },
  { key: 'surveys', label: 'Surveys', icon: FileText, group: 'Engagement', permModule: 'surveys' },
  { key: 'feedback', label: 'Feedback', icon: Radio, group: 'Engagement', permModule: 'feedback' },
  { key: 'channel-sim', label: 'Channel Simulator', icon: Smartphone, group: 'Engagement', permModule: 'communication' },
  // Programs
  { key: 'ccrp', label: 'CCRP', icon: TreePine, group: 'Programs', permModule: 'training' },
  { key: 'cohort1', label: 'Cohort 1', icon: Users, group: 'Programs', permModule: 'training' },
  { key: 'cohort2', label: 'Cohort 2', icon: UsersRound, group: 'Programs', permModule: 'training' },
  { key: 'smile', label: 'SMILE', icon: TrendingUp, group: 'Programs', permModule: 'training' },
  { key: 'nakivaale', label: 'Nakivaale', icon: Map, group: 'Programs', permModule: 'training' },
  // Admin
  { key: 'mfi', label: 'MFI / Bank Portal', icon: Landmark, group: 'Finance', permModule: 'mfi' },
  { key: 'transport', label: 'Transport & Logistics', icon: Truck, group: 'Supply Chain', permModule: 'transport' },
  { key: 'compliance', label: 'Compliance Hub', icon: Shield, group: 'Admin', permModule: 'compliance' },
  { key: 'companies', label: 'Companies', icon: Building2, group: 'Admin', permModule: 'companies' },
  { key: 'users', label: 'User Management', icon: UserCheck, group: 'Admin', permModule: 'users' },
  { key: 'settings', label: 'Settings', icon: Settings, group: 'Admin', alwaysVisible: true },
  { key: 'profile', label: 'Profile', icon: Stethoscope, group: 'Admin', alwaysVisible: true },
  { key: 'roles-permissions', label: 'Roles & Permissions', icon: KeyRound, group: 'Admin', alwaysVisible: true },
  // Super Admin (only visible to SUPER_ADMIN role)
  { key: 'super-admin-overview', label: 'Platform Overview', icon: LayoutDashboard, group: 'Super Admin' },
  { key: 'super-admin-tenants', label: 'Tenants', icon: Building2, group: 'Super Admin' },
  { key: 'super-admin-revenue', label: 'Revenue & Subscriptions', icon: DollarSign, group: 'Super Admin' },
  { key: 'super-admin-impact', label: 'Platform Impact', icon: Leaf, group: 'Super Admin' },
  { key: 'super-admin-users', label: 'All Users', icon: UserCheck, group: 'Super Admin' },
  { key: 'super-admin-mobile', label: 'Mobile App', icon: Smartphone, group: 'Super Admin' },
  { key: 'super-admin-config', label: 'Configuration', icon: Settings, group: 'Super Admin' },
]

const MODULE_GROUPS: Record<string, NavItem[]> = {}
for (const mod of ALL_MODULES) {
  if (!MODULE_GROUPS[mod.group]) MODULE_GROUPS[mod.group] = []
  MODULE_GROUPS[mod.group].push(mod)
}

export function Sidebar() {
  const { activeModule, setActiveModule, sidebarOpen, setSidebarOpen, user } = useAppStore()

  const handleNav = (key: ModuleKey) => {
    setActiveModule(key)
    setSidebarOpen(false)
  }

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'SA'

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Sprout className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold tracking-tight truncate">Agrobase</h1>
            <p className="text-[10px] text-sidebar-foreground/60 font-medium">V3 by MobiPay AgroSys</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="sr-only">Close</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          <div className="px-3 space-y-1">
            {(() => {
              const role = user?.role || ''
              const allowedModules = new Set(getRoleModules(role))
              const isSuperAdmin = role === 'SUPER_ADMIN'

              return Object.entries(MODULE_GROUPS).map(([groupLabel, items]) => {
                // Hide Super Admin group for non-super-admin users
                if (groupLabel === 'Super Admin' && !isSuperAdmin) return null
                // For SUPER_ADMIN role: ONLY show Super Admin group
                if (isSuperAdmin && groupLabel !== 'Super Admin') return null

                // Filter items by role permission (skip check for super admin group items & alwaysVisible items)
                const visibleItems = items.filter(item => {
                  if (isSuperAdmin) return true
                  if (item.alwaysVisible) return true
                  if (!item.permModule) return true
                  // Check if role has read permission for this module
                  return hasPermission(role, `${item.permModule}:read`)
                })

                if (visibleItems.length === 0) return null

                return (
                  <div key={groupLabel} className="mb-3">
                    <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                      {groupLabel}
                    </p>
                    {visibleItems.map((item) => {
                      const Icon = item.icon
                      const isActive = activeModule === item.key
                      return (
                        <Tooltip key={item.key} delayDuration={0}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleNav(item.key)}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                                isActive
                                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                              )}
                            >
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="truncate">{item.label}</span>
                              {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary-foreground" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="lg:hidden">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                )
              })
            })()}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-primary">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'Super Admin'}</p>
              <p className="text-[11px] text-sidebar-foreground/50 truncate">{user?.role || 'SUPER_ADMIN'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}