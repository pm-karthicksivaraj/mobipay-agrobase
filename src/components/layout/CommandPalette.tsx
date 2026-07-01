'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  LayoutDashboard, Users, PiggyBank, Store, CreditCard, DollarSign,
  GraduationCap, Leaf, Package, ShoppingCart, Receipt, Truck, Map,
  BarChart3, Target, MessageSquare, FileText, Radio, Smartphone,
  TreePine, Landmark, Shield, Building2, UserCheck, Settings,
  Sprout, MapPin, Cloud, Layers, Calculator, BookOpen, Search,
  ArrowRight
} from 'lucide-react'
import { useAppStore, type ModuleKey } from '@/lib/store'

interface CommandItemDef {
  key: ModuleKey
  label: string
  icon: React.ElementType
  group: string
  keywords?: string[]
}

const COMMANDS: CommandItemDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview', keywords: ['home', 'overview', 'stats'] },
  { key: 'farmers', label: 'Farmer Profiling', icon: Users, group: 'Core Operations', keywords: ['farmer', 'registration', 'profile'] },
  { key: 'farm-lands', label: 'Farm Land Registry', icon: MapPin, group: 'Core Operations', keywords: ['land', 'plot', 'farm', 'polygon', 'gps'] },
  { key: 'cultivations', label: 'Cultivations', icon: Sprout, group: 'Core Operations', keywords: ['crop', 'cultivation', 'seed', 'sowing'] },
  { key: 'vsla', label: 'VSLA Management', icon: PiggyBank, group: 'Core Operations', keywords: ['vsla', 'savings', 'loan', 'meeting'] },
  { key: 'marketplace', label: 'Marketplace', icon: Store, group: 'Core Operations', keywords: ['market', 'buy', 'sell', 'trade'] },
  { key: 'payments', label: 'Payments', icon: CreditCard, group: 'Core Operations', keywords: ['payment', 'mobile money', 'transfer'] },
  { key: 'loans', label: 'Loan Management', icon: DollarSign, group: 'Core Operations', keywords: ['loan', 'credit', 'borrow'] },
  { key: 'training', label: 'Training & Groups', icon: GraduationCap, group: 'Core Operations', keywords: ['training', 'workshop', 'attendance', 'enroll'] },
  { key: 'farm-visits', label: 'Farm Visits', icon: Leaf, group: 'Core Operations', keywords: ['visit', 'field', 'advisory'] },
  { key: 'crop-stages', label: 'Crop Stage Library', icon: BookOpen, group: 'Farm Management', keywords: ['crop', 'stage', 'coffee', 'maize'] },
  { key: 'farm5x', label: 'Mazao Safi Practices', icon: Layers, group: 'Farm Management', keywords: ['msp', 'mazao safi', 'practice', 'carbon', 'dream'] },
  { key: 'cost-of-cultivation', label: 'Cost of Cultivation', icon: Calculator, group: 'Farm Management', keywords: ['cost', 'expense', 'profit'] },
  { key: 'carbon', label: 'Carbon & Compliance', icon: Cloud, group: 'Farm Management', keywords: ['carbon', 'eudr', 'cbam', 'verra', 'compliance'] },
  { key: 'input-aggregation', label: 'Input Aggregation', icon: Package, group: 'Supply Chain', keywords: ['input', 'dealer', 'seed', 'fertilizer'] },
  { key: 'purchases', label: 'Purchases', icon: ShoppingCart, group: 'Supply Chain', keywords: ['purchase', 'buy', 'procurement'] },
  { key: 'approvals', label: 'Approvals Hub', icon: Shield, group: 'Supply Chain', keywords: ['approve', 'reject', 'pending'] },
  { key: 'processing', label: 'Processing', icon: Layers, group: 'Supply Chain', keywords: ['process', 'batch', 'mill', 'roast'] },
  { key: 'sales', label: 'Sales', icon: Receipt, group: 'Supply Chain', keywords: ['sale', 'sell', 'revenue'] },
  { key: 'deliveries', label: 'Deliveries', icon: Truck, group: 'Supply Chain', keywords: ['delivery', 'dispatch', 'transport'] },
  { key: 'consignments', label: 'Consignments', icon: Truck, group: 'Supply Chain', keywords: ['consignment', 'shipment'] },
  { key: 'trace', label: 'Traceability', icon: Map, group: 'Supply Chain', keywords: ['trace', 'qr', 'passport', 'batch'] },
  { key: 'plots', label: 'Plot-Level Trace', icon: MapPin, group: 'Supply Chain', keywords: ['plot', 'gps', 'map', 'boundary'] },
  { key: 'reports', label: 'Reports & Analytics', icon: BarChart3, group: 'Intelligence', keywords: ['report', 'analytics', 'export'] },
  { key: 'agritrack', label: 'AgriTrack', icon: Target, group: 'Intelligence', keywords: ['agritrack', 'credit', 'score', 'business'] },
  { key: 'impact-assessment', label: 'Impact Assessment', icon: Target, group: 'Intelligence', keywords: ['impact', 'assessment', 'kpi'] },
  { key: 'communication', label: 'Communication', icon: MessageSquare, group: 'Engagement', keywords: ['message', 'sms', 'email', 'broadcast'] },
  { key: 'surveys', label: 'Surveys', icon: FileText, group: 'Engagement', keywords: ['survey', 'question', 'response'] },
  { key: 'feedback', label: 'Feedback', icon: Radio, group: 'Engagement', keywords: ['feedback', 'review', 'complaint'] },
  { key: 'channel-sim', label: 'Channel Simulator', icon: Smartphone, group: 'Engagement', keywords: ['ussd', 'ivr', 'sms', 'channel'] },
  { key: 'mfi', label: 'MFI / Bank Portal', icon: Landmark, group: 'Finance', keywords: ['mfi', 'bank', 'microfinance'] },
  { key: 'compliance', label: 'Compliance Hub', icon: Shield, group: 'Admin', keywords: ['compliance', 'certification', 'audit'] },
  { key: 'companies', label: 'Companies', icon: Building2, group: 'Admin', keywords: ['company', 'cooperative', 'organization'] },
  { key: 'users', label: 'User Management', icon: UserCheck, group: 'Admin', keywords: ['user', 'staff', 'account'] },
  { key: 'settings', label: 'Settings', icon: Settings, group: 'Admin', keywords: ['settings', 'config', 'preference'] },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const { setActiveModule } = useAppStore()

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSelect = useCallback((key: ModuleKey) => {
    setActiveModule(key)
    setOpen(false)
  }, [setActiveModule])

  // Group commands by group label
  const grouped = COMMANDS.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = []
    acc[cmd.group].push(cmd)
    return acc
  }, {} as Record<string, CommandItemDef[]>)

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search modules, pages, or actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(grouped).map(([group, items]) => (
          <React.Fragment key={group}>
            <CommandGroup heading={group}>
              {items.map(cmd => {
                const Icon = cmd.icon
                return (
                  <CommandItem
                    key={cmd.key}
                    value={`${cmd.label} ${cmd.keywords?.join(' ') || ''}`}
                    onSelect={() => handleSelect(cmd.key)}
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{cmd.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            <CommandSeparator />
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
