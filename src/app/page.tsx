'use client'

import React, { Suspense, lazy, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/lib/store'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { LoginPage } from '@/components/auth/LoginPage'
import { Skeleton } from '@/components/ui/skeleton'

// Core modules (11 existing)
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

// Extended modules (20 new)
const TraceabilityView = lazy(() => import('@/components/modules/TraceabilityView'))
const SurveysView = lazy(() => import('@/components/modules/SurveysView'))
const InputAggregationView = lazy(() => import('@/components/modules/InputAggregationView'))
const PurchasesView = lazy(() => import('@/components/modules/PurchasesView'))
const ConsignmentsView = lazy(() => import('@/components/modules/ConsignmentsView'))
const SalesView = lazy(() => import('@/components/modules/SalesView'))
const DeliveriesView = lazy(() => import('@/components/modules/DeliveriesView'))
const CompaniesView = lazy(() => import('@/components/modules/CompaniesView'))
const UsersView = lazy(() => import('@/components/modules/UsersView'))
const FeedbackView = lazy(() => import('@/components/modules/FeedbackView'))
const ApprovalsView = lazy(() => import('@/components/modules/ApprovalsView'))
const ProcessingView = lazy(() => import('@/components/modules/ProcessingView'))
const ComplianceView = lazy(() => import('@/components/modules/ComplianceView'))
const ImpactAssessmentView = lazy(() => import('@/components/modules/ImpactAssessmentView'))
const FarmVisitsView = lazy(() => import('@/components/modules/FarmVisitsView'))
const ProfileView = lazy(() => import('@/components/modules/ProfileView'))
const ChannelSimulatorView = lazy(() => import('@/components/modules/ChannelSimulatorView'))
const CcrpView = lazy(() => import('@/components/modules/CcrpView'))
const CohortsView = lazy(() => import('@/components/modules/CohortsView'))
const ProgramsView = lazy(() => import('@/components/modules/ProgramsView'))
const MfiPortalView = lazy(() => import('@/components/modules/MfiPortalView'))
const TransportPortalView = lazy(() => import('@/components/modules/TransportPortalView'))
const PlotsView = lazy(() => import('@/components/modules/PlotsView'))

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
    // Core
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
    // Supply Chain
    case 'input-aggregation': return <InputAggregationView />
    case 'purchases': return <PurchasesView />
    case 'approvals': return <ApprovalsView />
    case 'processing': return <ProcessingView />
    case 'sales': return <SalesView />
    case 'deliveries': return <DeliveriesView />
    case 'consignments': return <ConsignmentsView />
    case 'trace': return <TraceabilityView />
    // Engagement
    case 'surveys': return <SurveysView />
    case 'feedback': return <FeedbackView />
    case 'farm-visits': return <FarmVisitsView />
    case 'impact-assessment': return <ImpactAssessmentView />
    // Admin
    case 'companies': return <CompaniesView />
    case 'users': return <UsersView />
    case 'compliance': return <ComplianceView />
    case 'profile': return <ProfileView />
    // Programs
    case 'ccrp': return <CcrpView />
    case 'cohort1': return <CohortsView />
    case 'cohort2': return <CohortsView />
    case 'smile': return <ProgramsView />
    case 'nakivaale': return <ProgramsView />
    // Channel
    case 'ivr': return <ChannelSimulatorView />
    case 'channel-sim': return <ChannelSimulatorView />
    // Finance
    case 'mfi': return <MfiPortalView />
    case 'transport': return <TransportPortalView />
    // Plot-Level Traceability
    case 'plots': return <PlotsView />
    default: return <DashboardView />
  }
}

function AuthenticatedApp() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
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

export default function HomePage() {
  const { data: session, status } = useSession()
  const setUser = useAppStore((s) => s.setUser)

  useEffect(() => {
    if (session?.user) {
      setUser({
        userId: (session.user as { userId: string }).userId,
        tenantId: (session.user as { tenantId: string }).tenantId,
        role: (session.user as { role: string }).role,
        name: session.user.name || '',
      })
    } else {
      setUser(null)
    }
  }, [session, setUser])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="h-3 w-48 bg-muted/50 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return <AuthenticatedApp />
}