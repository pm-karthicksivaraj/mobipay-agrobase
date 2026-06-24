'use client'

import React from 'react'
import { useAppStore, type ModuleKey } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Landmark, Store, CreditCard, FileText, GraduationCap,
  Settings, MessageSquare, BarChart3, Leaf, Tractor, Wheat, Fish, TreePine,
  Package, Truck, ClipboardCheck, Building2, DollarSign, Target,
  Smartphone, Map, Radio, Database, ShoppingCart,
  ChevronDown, ChevronRight, Sprout, Receipt, Layers, TrendingUp,
  X, HandCoins, Shield, UserCheck, PiggyBank
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItem {
  key: ModuleKey
  label: string
  icon: React.ElementType
  group?: string
}

const CORE_MODULES: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { key: 'farmers', label: 'Farmer Profiling', icon: Users, group: 'Core Operations' },
  { key: 'vsla', label: 'VSLA Management', icon: PiggyBank, group: 'Core Operations' },
  { key: 'marketplace', label: 'Marketplace', icon: Store, group: 'Core Operations' },
  { key: 'payments', label: 'Payments', icon: CreditCard, group: 'Core Operations' },
  { key: 'loans', label: 'Loan Management', icon: DollarSign, group: 'Core Operations' },
  { key: 'training', label: 'Training & Extension', icon: GraduationCap, group: 'Core Operations' },
  { key: 'reports', label: 'Reports & Analytics', icon: BarChart3, group: 'Intelligence' },
  { key: 'agritrack', label: 'AgriTrack', icon: Target, group: 'Intelligence' },
]

const EXTENDED_MODULES: NavItem[] = [
  { key: 'input-aggregation', label: 'Input Aggregation', icon: Package, group: 'Supply Chain' },
  { key: 'purchases', label: 'Purchases', icon: ShoppingCart, group: 'Supply Chain' },
  { key: 'consignments', label: 'Consignments', icon: Truck, group: 'Supply Chain' },
  { key: 'trace', label: 'Traceability', icon: Map, group: 'Supply Chain' },
  { key: 'communication', label: 'Communication', icon: MessageSquare, group: 'Engagement' },
  { key: 'surveys', label: 'Surveys', icon: ClipboardCheck, group: 'Engagement' },
  { key: 'feedback', label: 'Feedback', icon: Radio, group: 'Engagement' },
  { key: 'companies', label: 'Companies', icon: Building2, group: 'Admin' },
  { key: 'users', label: 'User Management', icon: UserCheck, group: 'Admin' },
  { key: 'settings', label: 'Settings', icon: Settings, group: 'Admin' },
  { key: 'profile', label: 'Profile', icon: Shield, group: 'Admin' },
]

const MODULE_GROUPS: Record<string, NavItem[]> = {
  'Core Operations': CORE_MODULES.filter(m => m.group === 'Core Operations'),
  'Intelligence': CORE_MODULES.filter(m => m.group === 'Intelligence'),
  'Supply Chain': EXTENDED_MODULES.filter(m => m.group === 'Supply Chain'),
  'Engagement': EXTENDED_MODULES.filter(m => m.group === 'Engagement'),
  'Admin': EXTENDED_MODULES.filter(m => m.group === 'Admin'),
}

export function Sidebar() {
  const { activeModule, setActiveModule, sidebarOpen, setSidebarOpen } = useAppStore()

  const handleNav = (key: ModuleKey) => {
    setActiveModule(key)
    setSidebarOpen(false)
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo area */}
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
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <div className="px-3 space-y-1">
            {Object.entries(MODULE_GROUPS).map(([groupLabel, items]) => (
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
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-primary">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Super Admin</p>
              <p className="text-[11px] text-sidebar-foreground/50 truncate">admin@agrobase.co</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}