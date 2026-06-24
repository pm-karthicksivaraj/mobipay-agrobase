'use client'

import React, { Suspense, lazy } from 'react'
import { useAppStore } from '@/lib/store'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Construction, Users, Store, FileText, GraduationCap,
  Settings, BarChart3, Target, Map, Package, ShoppingCart, Truck,
  ClipboardCheck, Radio, Building2, UserCheck, Shield, Layers,
  Receipt, TrendingUp, Phone, Sprout
} from 'lucide-react'

// Lazy-load module views for performance
const DashboardView = lazy(() => import('@/components/modules/DashboardView'))
const FarmersView = lazy(() => import('@/components/modules/FarmersView'))
const VslaView = lazy(() => import('@/components/modules/VslaView'))
const MarketplaceView = lazy(() => import('@/components/modules/MarketplaceView'))
const PaymentsView = lazy(() => import('@/components/modules/PaymentsView'))
const LoansView = lazy(() => import('@/components/modules/LoansView'))
const ReportsView = lazy(() => import('@/components/modules/ReportsView'))
const TrainingView = lazy(() => import('@/components/modules/TrainingView'))
const SettingsView = lazy(() => import('@/components/modules/SettingsView'))
const CommunicationView = lazy(() => import('@/components/modules/CommunicationView'))
const AgriTrackView = lazy(() => import('@/components/modules/AgriTrackView'))

// Placeholder component for modules not yet built
function PlaceholderModule({ title, icon: Icon, description }: { title: string; icon: React.ElementType; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      <p className="text-xs text-muted-foreground mt-4">This module is coming soon in Agrobase V3</p>
    </div>
  )
}

const PLACEHOLDER_CONFIG: Record<string, { title: string; icon: React.ElementType; description: string }> = {
  'profile': { title: 'Profile', icon: Shield, description: 'User profile, security settings, and account preferences' },
  'companies': { title: 'Companies', icon: Building2, description: 'Manage cooperatives, agribusinesses, exporters, and partner organizations' },
  'input-aggregation': { title: 'Input Aggregation', icon: Package, description: 'Manage agricultural input dealers, products, and farmer requests' },
  'purchases': { title: 'Purchases', icon: ShoppingCart, description: 'Bulk purchase management, review and approval workflows' },
  'approvals': { title: 'Approvals', icon: ClipboardCheck, description: 'Pending approvals for purchases, loans, and transactions' },
  'sales': { title: 'Sales', icon: Receipt, description: 'Track sales, customer orders, and revenue' },
  'deliveries': { title: 'Deliveries', icon: Truck, description: 'Delivery tracking, dispatch management, and logistics' },
  'consignments': { title: 'Consignments', icon: Truck, description: 'Consignments management for bulk commodity transport' },
  'processing': { title: 'Processing', icon: Layers, description: 'Post-harvest processing, quality control, and value addition' },
  'ccrp': { title: 'CCRP', icon: Sprout, description: 'Climate Change Resilience Program tracking and management' },
  'cohort1': { title: 'Cohort 1', icon: Users, description: 'First cohort farmer group management and tracking' },
  'cohort2': { title: 'Cohort 2', icon: Users, description: 'Second cohort farmer group management and tracking' },
  'smile': { title: 'SMILE', icon: TrendingUp, description: 'SMILE program monitoring, evaluation, and reporting' },
  'nakivaale': { title: 'Nakivaale', icon: Map, description: 'Nakivaale project-specific tracking and management' },
  'ivr': { title: 'IVR', icon: Phone, description: 'Interactive Voice Response campaigns and reporting' },
  'feedback': { title: 'Feedback', icon: Radio, description: 'Farmer feedback collection, review, and resolution tracking' },
  'trace': { title: 'Traceability', icon: Map, description: 'Supply chain traceability and commodity tracking from farm to market' },
  'users': { title: 'User Management', icon: UserCheck, description: 'Manage platform users, roles, permissions, and access control' },
  'surveys': { title: 'Surveys', icon: ClipboardCheck, description: 'Design, deploy, and analyze farmer surveys and data collection' },
}

function ModuleLoader() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted/50 rounded-xl" />
        ))}
      </div>
      <div className="h-80 bg-muted/50 rounded-xl" />
    </div>
  )
}

function ModuleRouter() {
  const { activeModule } = useAppStore()

  switch (activeModule) {
    case 'dashboard': return <DashboardView />
    case 'farmers': return <FarmersView />
    case 'vsla': return <VslaView />
    case 'marketplace': return <MarketplaceView />
    case 'payments': return <PaymentsView />
    case 'loans': return <LoansView />
    case 'reports': return <ReportsView />
    case 'training': return <TrainingView />
    case 'settings': return <SettingsView />
    case 'communication': return <CommunicationView />
    case 'agritrack': return <AgriTrackView />
    default: {
      const config = PLACEHOLDER_CONFIG[activeModule]
      if (config) {
        return <PlaceholderModule title={config.title} icon={config.icon} description={config.description} />
      }
      return <PlaceholderModule title={activeModule} icon={Construction} description="Module not found" />
    }
  }
}

export default function HomePage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />

        {/* Page content with scroll */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
            <Suspense fallback={<ModuleLoader />}>
              <ModuleRouter />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}