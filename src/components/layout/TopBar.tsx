'use client'

import React from 'react'
import { useAppStore } from '@/lib/store'
import { useTheme } from 'next-themes'
import { useSession, signOut } from 'next-auth/react'
import {
  Sun, Moon, Menu, Bell, Search, ChevronDown, LogOut, Leaf, User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const MODULE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  farmers: 'Farmer Profiling',
  vsla: 'VSLA Management',
  marketplace: 'Marketplace',
  payments: 'Payments',
  loans: 'Loan Management',
  reports: 'Reports & Analytics',
  training: 'Training & Groups',
  settings: 'Settings',
  communication: 'Communication',
  agritrack: 'AgriTrack',
  'input-aggregation': 'Input Aggregation',
  purchases: 'Purchases',
  approvals: 'Approvals Hub',
  sales: 'Sales',
  deliveries: 'Deliveries',
  consignments: 'Consignments',
  processing: 'Processing',
  ccrp: 'CCRP',
  cohort1: 'Cohort 1',
  cohort2: 'Cohort 2',
  smile: 'SMILE Program',
  nakivaale: 'Nakivaale Project',
  ivr: 'IVR',
  'channel-sim': 'Channel Simulator',
  feedback: 'Feedback',
  trace: 'Traceability',
  users: 'User Management',
  surveys: 'Surveys',
  'farm-visits': 'Farm Visits',
  'impact-assessment': 'Impact Assessment',
  compliance: 'Compliance Hub',
  profile: 'Profile',
  companies: 'Companies',
}

export function TopBar() {
  const { activeModule, setSidebarOpen, user } = useAppStore()
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()

  const userName = user?.name || session?.user?.name || 'Super Admin'
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center px-4 lg:px-6 gap-4 shrink-0 sticky top-0 z-30">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-9 w-9"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      <div className="flex items-center gap-2 min-w-0">
        <Leaf className="w-4 h-4 text-primary shrink-0" />
        <h2 className="text-lg font-semibold truncate">
          {MODULE_TITLES[activeModule] || 'Dashboard'}
        </h2>
      </div>

      <div className="flex-1" />

      <div className="hidden md:flex items-center relative max-w-xs w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search farmers, VSLAs..."
          className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="w-4 h-4" />
              <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
                5
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
              <span className="text-sm font-medium">3 new loan applications</span>
              <span className="text-xs text-muted-foreground">2 minutes ago</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
              <span className="text-sm font-medium">VSLA savings target reached</span>
              <span className="text-xs text-muted-foreground">1 hour ago</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
              <span className="text-sm font-medium">EUDR compliance expiring soon</span>
              <span className="text-xs text-muted-foreground">3 hours ago</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium">{userName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => useAppStore.getState().setActiveModule('profile')}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => useAppStore.getState().setActiveModule('settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => signOut({ callbackUrl: '/' })}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}