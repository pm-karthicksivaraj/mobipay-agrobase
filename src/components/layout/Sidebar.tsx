'use client'

import React from 'react'
import { useAppStore, type ModuleKey } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Store, CreditCard, GraduationCap,
  Settings, MessageSquare, BarChart3, Target,
  Package, Truck, ClipboardCheck, Building2, UserCheck, Shield, Layers,
  Receipt, TrendingUp, Phone, Map, Radio, ShoppingCart,
  Sprout, PiggyBank, DollarSign, FileText, Leaf,
  Stethoscope, Activity, Smartphone, TreePine, UsersRound, Landmark, MapPin,
  Cloud, Calculator, BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItem {
  key: ModuleKey
  label: string
  icon: React.ElementType
  group: string
}

const ALL_MODULES: NavItem[] = [
  // Overview
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  // Core Operations
  { key: 'farmers', label: 'Farmer Profiling', icon: Users, group: 'Core Operations' },
  { key: 'farm-lands', label: 'Farm Land Registry', icon: MapPin, group: 'Core Operations' },
  { key: 'cultivations', label: 'Cultivations', icon: Sprout, group: 'Core Operations' },
  { key: 'vsla', label: 'VSLA Management', icon: PiggyBank, group: 'Core Operations' },
  { key: 'marketplace', label: 'Marketplace', icon: Store, group: 'Core Operations' },
  { key: 'payments', label: 'Payments', icon: CreditCard, group: 'Core Operations' },
  { key: 'loans', label: 'Loan Management', icon: DollarSign, group: 'Core Operations' },
  { key: 'training', label: 'Training & Groups', icon: GraduationCap, group: 'Core Operations' },
  { key: 'farm-visits', label: 'Farm Visits', icon: Leaf, group: 'Core Operations' },
  // Farm Management (Core Product)
  { key: 'crop-stages', label: 'Crop Stage Library', icon: BookOpen, group: 'Farm Management' },
  { key: 'farm5x', label: 'Farm5X & DREAM MRV', icon: Layers, group: 'Farm Management' },
  { key: 'cost-of-cultivation', label: 'Cost of Cultivation', icon: Calculator, group: 'Farm Management' },
  { key: 'carbon', label: 'Carbon & Compliance', icon: Cloud, group: 'Farm Management' },
  // Supply Chain
  { key: 'input-aggregation', label: 'Input Aggregation', icon: Package, group: 'Supply Chain' },
  { key: 'purchases', label: 'Purchases', icon: ShoppingCart, group: 'Supply Chain' },
  { key: 'approvals', label: 'Approvals Hub', icon: ClipboardCheck, group: 'Supply Chain' },
  { key: 'processing', label: 'Processing', icon: Layers, group: 'Supply Chain' },
  { key: 'sales', label: 'Sales', icon: Receipt, group: 'Supply Chain' },
  { key: 'deliveries', label: 'Deliveries', icon: Truck, group: 'Supply Chain' },
  { key: 'consignments', label: 'Consignments', icon: Truck, group: 'Supply Chain' },
  { key: 'trace', label: 'Traceability', icon: Map, group: 'Supply Chain' },
  { key: 'plots', label: 'Plot-Level Trace', icon: MapPin, group: 'Supply Chain' },
  // Intelligence
  { key: 'reports', label: 'Reports & Analytics', icon: BarChart3, group: 'Intelligence' },
  { key: 'agritrack', label: 'AgriTrack', icon: Target, group: 'Intelligence' },
  { key: 'impact-assessment', label: 'Impact Assessment', icon: Activity, group: 'Intelligence' },
  // Engagement
  { key: 'communication', label: 'Communication', icon: MessageSquare, group: 'Engagement' },
  { key: 'surveys', label: 'Surveys', icon: FileText, group: 'Engagement' },
  { key: 'feedback', label: 'Feedback', icon: Radio, group: 'Engagement' },
  { key: 'channel-sim', label: 'Channel Simulator', icon: Smartphone, group: 'Engagement' },
  // Programs
  { key: 'ccrp', label: 'CCRP', icon: TreePine, group: 'Programs' },
  { key: 'cohort1', label: 'Cohort 1', icon: Users, group: 'Programs' },
  { key: 'cohort2', label: 'Cohort 2', icon: UsersRound, group: 'Programs' },
  { key: 'smile', label: 'SMILE', icon: TrendingUp, group: 'Programs' },
  { key: 'nakivaale', label: 'Nakivaale', icon: Map, group: 'Programs' },
  // Admin
  { key: 'mfi', label: 'MFI / Bank Portal', icon: Landmark, group: 'Finance' },
  { key: 'transport', label: 'Transport & Logistics', icon: Truck, group: 'Supply Chain' },
  { key: 'compliance', label: 'Compliance Hub', icon: Shield, group: 'Admin' },
  { key: 'companies', label: 'Companies', icon: Building2, group: 'Admin' },
  { key: 'users', label: 'User Management', icon: UserCheck, group: 'Admin' },
  { key: 'settings', label: 'Settings', icon: Settings, group: 'Admin' },
  { key: 'profile', label: 'Profile', icon: Stethoscope, group: 'Admin' },
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
            {Object.entries(MODULE_GROUPS).map(([groupLabel, items]) => {
              // Hide Super Admin group for non-super-admin users
              if (groupLabel === 'Super Admin' && user?.role !== 'SUPER_ADMIN') return null
              // For SUPER_ADMIN role: ONLY show Super Admin group (they manage tenants/subscriptions/revenue)
              if (user?.role === 'SUPER_ADMIN' && groupLabel !== 'Super Admin') return null
              return (
              <div key={groupLabel} className="mb-3">
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {groupLabel}
                </p>
                {items.map((item) => {
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
            })}
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