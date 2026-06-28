import { create } from 'zustand'

export type ModuleKey =
  'dashboard' | 'farmers' | 'vsla' | 'marketplace' | 'payments' | 'loans' |
  'reports' | 'training' | 'settings' | 'communication' | 'agritrack' |
  'profile' | 'companies' | 'input-aggregation' | 'purchases' | 'approvals' |
  'sales' | 'deliveries' | 'consignments' | 'processing' |
  'ccrp' | 'cohort1' | 'cohort2' | 'smile' | 'nakivaale' |
  'ivr' | 'feedback' | 'trace' | 'users' | 'surveys' |
  'farm-visits' | 'impact-assessment' | 'channel-sim' | 'compliance' | 'mfi' | 'transport' | 'plots'

interface AuthUser {
  userId: string
  role: string
  tenantId: string
  name: string
  email?: string
  phone?: string
  avatarUrl?: string
}

interface AppState {
  activeModule: ModuleKey
  activeSubTab: string
  sidebarOpen: boolean
  selectedFarmerId: string | null
  selectedVslaGroupId: string | null
  user: AuthUser | null
  setActiveModule: (m: ModuleKey) => void
  setActiveSubTab: (t: string) => void
  setSidebarOpen: (o: boolean) => void
  setSelectedFarmerId: (id: string | null) => void
  setSelectedVslaGroupId: (id: string | null) => void
  setUser: (user: AuthUser | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeModule: 'dashboard',
  activeSubTab: '',
  sidebarOpen: false,
  selectedFarmerId: null,
  selectedVslaGroupId: null,
  user: null,
  setActiveModule: (m) => set({ activeModule: m, activeSubTab: '', selectedFarmerId: null, selectedVslaGroupId: null }),
  setActiveSubTab: (t) => set({ activeSubTab: t }),
  setSidebarOpen: (o) => set({ sidebarOpen: o }),
  setSelectedFarmerId: (id) => set({ selectedFarmerId: id }),
  setSelectedVslaGroupId: (id) => set({ selectedVslaGroupId: id }),
  setUser: (user) => set({ user }),
}))