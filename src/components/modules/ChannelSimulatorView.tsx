'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Phone, MessageSquare, Radio, Plus, Send, Play, Square, Loader2,
  BarChart3, Users, Clock, Calendar, CheckCircle, AlertCircle, Sparkles, Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LineChart, Line, PieChart, Pie } from 'recharts'

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#f59e0b']

// ==========================================
// USSD MENU DEFINITIONS
// ==========================================
interface UssdStep {
  text: string
  options: { key: string; label: string; nextStep?: string; response?: string }[]
}

const USSD_MENUS: Record<string, UssdStep> = {
  welcome: {
    text: 'Welcome to Agrobase.\n1. My Account\n2. Check Balance\n3. Market Prices\n4. VSLA Info\n0. Exit',
    options: [
      { key: '1', label: 'My Account', nextStep: 'account' },
      { key: '2', label: 'Check Balance', nextStep: 'balance' },
      { key: '3', label: 'Market Prices', nextStep: 'market' },
      { key: '4', label: 'VSLA Info', nextStep: 'vsla' },
      { key: '0', label: 'Exit', response: 'END Thank you for using Agrobase.' },
    ],
  },
  account: {
    text: 'My Account\n1. Check Profile\n2. My Savings\n3. Loan Status\n4. Training Schedule\n00. Back',
    options: [
      { key: '1', label: 'Check Profile', response: 'CON Name: Okello John\nPhone: +256700123456\nVSLA Group: Mukono Farmers\n1. Back  0. Exit' },
      { key: '2', label: 'My Savings', response: 'CON Your VSLA Savings:\nTotal: UGX 450,000\nThis Month: UGX 50,000\n1. Back  0. Exit' },
      { key: '3', label: 'Loan Status', response: 'CON Active Loan: UGX 200,000\nPaid: UGX 75,000\nRemaining: UGX 125,000\nDue: 15 Jul 2025\n1. Back  0. Exit' },
      { key: '4', label: 'Training Schedule', response: 'CON Upcoming Training:\n- Post-Harvest Handling\n  Date: 20 Jul 2025\n  Venue: Mukono Center\n1. Back  0. Exit' },
      { key: '00', label: 'Back', nextStep: 'welcome' },
    ],
  },
  balance: {
    text: 'CON Agrobase Balance:\nMobile Money: UGX 15,000\nVSLA Shares: UGX 450,000\nSavings: UGX 230,000\n\n1. Back  0. Exit',
    options: [
      { key: '1', label: 'Back', nextStep: 'welcome' },
      { key: '0', label: 'Exit', response: 'END Thank you.' },
    ],
  },
  market: {
    text: 'CON Select Commodity:\n1. Coffee\n2. Maize\n3. Beans\n4. Rice\n00. Back',
    options: [
      { key: '1', label: 'Coffee', response: 'CON Coffee Prices (UGX/kg):\nArabica: 8,500\nRobusta: 6,200\nFair-trade: 9,800\n1. Back  0. Exit' },
      { key: '2', label: 'Maize', response: 'CON Maize Prices (UGX/kg):\nWhite: 1,800\nYellow: 1,600\nSeed: 2,500\n1. Back  0. Exit' },
      { key: '3', label: 'Beans', response: 'CON Beans Prices (UGX/kg):\nRed: 3,200\nWhite: 3,500\nSoy: 2,800\n1. Back  0. Exit' },
      { key: '4', label: 'Rice', response: 'CON Rice Prices (UGD/kg):\nPaddy: 1,900\nMilled: 3,200\n1. Back  0. Exit' },
      { key: '00', label: 'Back', nextStep: 'welcome' },
    ],
  },
  vsla: {
    text: 'CON VSLA Information\n1. My Group\n2. Next Meeting\n3. Savings History\n00. Back',
    options: [
      { key: '1', label: 'My Group', response: 'CON Mukono Farmers VSLA\nMembers: 25\nTotal Savings: UGX 12.5M\nMeeting Day: Every Tuesday\n1. Back  0. Exit' },
      { key: '2', label: 'Next Meeting', response: 'CON Next Meeting:\nDate: 22 Jul 2025\nTime: 10:00 AM\nVenue: Community Hall\nAgenda: Savings & Loan Review\n1. Back  0. Exit' },
      { key: '3', label: 'Savings History', response: 'CON Last 3 Savings:\n15 Jul: UGX 20,000\n08 Jul: UGX 20,000\n01 Jul: UGX 10,000\n1. Back  0. Exit' },
      { key: '00', label: 'Back', nextStep: 'welcome' },
    ],
  },
}

const IVR_STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  DRAFT: { label: 'Draft', class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  SCHEDULED: { label: 'Scheduled', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  RUNNING: { label: 'Running', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  COMPLETED: { label: 'Completed', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
}

const SMS_STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  DRAFT: { label: 'Draft', class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  SCHEDULED: { label: 'Scheduled', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  SENT: { label: 'Sent', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  FAILED: { label: 'Failed', class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
}

export default function ChannelSimulatorView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [activeTab, setActiveTab] = useState(activeSubTab || 'ussd')

  // USSD State
  const [ussdPhone, setUssdPhone] = useState('+256 700 123 456')
  const [ussdSessions, setUssdSessions] = useState<any[]>([])
  const [ussdCurrentStep, setUssdCurrentStep] = useState('welcome')
  const [ussdInput, setUssdInput] = useState('')
  const [ussdScreen, setUssdScreen] = useState<string[]>(['Welcome to Agrobase.\n1. My Account\n2. Check Balance\n3. Market Prices\n4. VSLA Info\n0. Exit'])
  const [ussdActive, setUssdActive] = useState(false)
  const [ussdLoading, setUssdLoading] = useState(false)

  // IVR State
  const [ivrCampaigns, setIvrCampaigns] = useState<any[]>([])
  const [ivrDialogOpen, setIvrDialogOpen] = useState(false)
  const [ivrFormName, setIvrFormName] = useState('')
  const [ivrFormDesc, setIvrFormDesc] = useState('')
  const [ivrFormTarget, setIvrFormTarget] = useState('')
  const [ivrFormLang, setIvrFormLang] = useState('en')
  const [ivrFormSchedule, setIvrFormSchedule] = useState('')
  const [ivrSteps, setIvrSteps] = useState<{ message: string; lang: string }[]>([{ message: '', lang: 'en' }])
  const [ivrSubmitting, setIvrSubmitting] = useState(false)
  const [ivrDetailOpen, setIvrDetailOpen] = useState(false)
  const [ivrDetail, setIvrDetail] = useState<any>(null)

  // SMS State
  const [smsBroadcasts, setSmsBroadcasts] = useState<any[]>([])
  const [smsMessage, setSmsMessage] = useState('')
  const [smsRecipient, setSmsRecipient] = useState('all')
  const [smsSending, setSmsSending] = useState(false)
  const [smsScheduled, setSmsScheduled] = useState('')
  const [smsDetailOpen, setSmsDetailOpen] = useState(false)
  const [smsDetail, setSmsDetail] = useState<any>(null)

  const loadTab = (tab: string) => { setActiveTab(tab); setActiveSubTab(tab) }

  // ===================== FETCHES =====================
  const fetchUssdSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/ussd-sessions')
      if (res.ok) { const d = await res.json(); setUssdSessions(d.sessions || d || []) }
    } catch { /* use empty */ }
  }, [])

  const fetchIvrCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/ivr-campaigns')
      if (res.ok) { const d = await res.json(); setIvrCampaigns(d.campaigns || d || []) }
    } catch { /* use empty */ }
  }, [])

  const fetchSmsBroadcasts = useCallback(async () => {
    try {
      const res = await fetch('/api/sms-broadcasts')
      if (res.ok) { const d = await res.json(); setSmsBroadcasts(d.broadcasts || d || []) }
    } catch { /* use empty */ }
  }, [])

  useEffect(() => { fetchUssdSessions(); fetchIvrCampaigns(); fetchSmsBroadcasts() }, [fetchUssdSessions, fetchIvrCampaigns, fetchSmsBroadcasts])

  // ===================== USSD LOGIC =====================
  const startUssdSession = () => {
    setUssdActive(true)
    setUssdCurrentStep('welcome')
    setUssdScreen(['Welcome to Agrobase.\n1. My Account\n2. Check Balance\n3. Market Prices\n4. VSLA Info\n0. Exit'])
    setUssdInput('')
    toast.success('USSD session started')
  }

  const endUssdSession = () => {
    setUssdActive(false)
    setUssdSessions(prev => [...prev, {
      id: `ussd-${Date.now()}`,
      phoneNumber: ussdPhone,
      status: 'COMPLETED',
      steps: ussdScreen.length,
      createdAt: new Date().toISOString(),
    }])
    toast.info('USSD session ended')
  }

  const handleUssdInput = () => {
    if (!ussdInput.trim()) return
    const menu = USSD_MENUS[ussdCurrentStep]
    if (!menu) return

    const option = menu.options.find(o => o.key === ussdInput.trim())
    setUssdLoading(true)

    setTimeout(() => {
      if (!option) {
        setUssdScreen(prev => [...prev, `CON Invalid input. Try again.\n${menu.text}`])
      } else if (option.response) {
        setUssdScreen(prev => [...prev, option.response!])
        if (option.response.startsWith('END')) {
          setUssdActive(false)
          setUssdSessions(prev => [...prev, {
            id: `ussd-${Date.now()}`,
            phoneNumber: ussdPhone,
            status: 'COMPLETED',
            steps: ussdScreen.length + 1,
            createdAt: new Date().toISOString(),
          }])
        }
      } else if (option.nextStep) {
        const nextMenu = USSD_MENUS[option.nextStep]
        if (nextMenu) {
          setUssdCurrentStep(option.nextStep)
          setUssdScreen(prev => [...prev, nextMenu.text])
        }
      }
      setUssdInput('')
      setUssdLoading(false)
    }, 600)
  }

  // ===================== IVR LOGIC =====================
  const handleCreateIvr = async () => {
    if (!ivrFormName) { toast.error('Campaign name is required'); return }
    if (ivrSteps.every(s => !s.message.trim())) { toast.error('Add at least one step with a message'); return }
    setIvrSubmitting(true)
    try {
      const res = await fetch('/api/ivr-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ivrFormName,
          description: ivrFormDesc,
          targetGroup: ivrFormTarget,
          script: JSON.stringify({ steps: ivrSteps }),
          language: ivrFormLang,
          scheduledAt: ivrFormSchedule || null,
          status: 'DRAFT',
        }),
      })
      if (res.ok) {
        toast.success('IVR campaign created')
        setIvrDialogOpen(false)
        setIvrFormName(''); setIvrFormDesc(''); setIvrFormTarget(''); setIvrFormLang('en'); setIvrFormSchedule('')
        setIvrSteps([{ message: '', lang: 'en' }])
        fetchIvrCampaigns()
      } else { toast.error('Failed to create campaign') }
    } catch { toast.error('Network error') }
    finally { setIvrSubmitting(false) }
  }

  // ===================== SMS LOGIC =====================
  const charCount = smsMessage.length
  const segments = Math.ceil(charCount / 160) || 1

  const handleSendSms = async () => {
    if (!smsMessage.trim()) { toast.error('Message is required'); return }
    setSmsSending(true)
    try {
      const res = await fetch('/api/sms-broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: smsMessage,
          recipientType: smsRecipient,
          recipientCount: smsRecipient === 'all' ? 150 : smsRecipient === 'group' ? 45 : 1,
          status: 'SENT',
          scheduledAt: smsScheduled || null,
        }),
      })
      if (res.ok) {
        toast.success(`SMS sent to ${smsRecipient === 'all' ? 'all farmers' : smsRecipient === 'group' ? 'selected group' : 'individual'}`)
        setSmsMessage(''); setSmsScheduled('')
        fetchSmsBroadcasts()
      } else { toast.error('Failed to send SMS') }
    } catch { toast.error('Network error') }
    finally { setSmsSending(false) }
  }

  const handleTestSms = () => {
    toast.success(`Test SMS sent to ${ussdPhone || 'your number'}`)
  }

  // ===================== COMPUTED =====================
  const totalUssdSessions = ussdSessions.length
  const activeUssd = ussdSessions.filter((s: any) => s.status === 'ACTIVE').length
  const completedUssd = ussdSessions.filter((s: any) => s.status === 'COMPLETED').length
  const avgUssdSteps = totalUssdSessions > 0 ? Math.round(ussdSessions.reduce((s: number, x: any) => s + (x.steps || 3), 0) / totalUssdSessions) : 0

  const totalSms = smsBroadcasts.length
  const deliveredSms = smsBroadcasts.filter((s: any) => s.status === 'SENT').length
  const deliveryRate = totalSms > 0 ? Math.round((deliveredSms / totalSms) * 100) : 0
  const smsThisMonth = smsBroadcasts.filter((s: any) => {
    const d = new Date(s.sentAt || s.scheduledAt || s.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  // Chart data for SMS
  const smsStatusData = [
    { status: 'Sent', count: deliveredSms },
    { status: 'Scheduled', count: smsBroadcasts.filter((s: any) => s.status === 'SCHEDULED').length },
    { status: 'Draft', count: smsBroadcasts.filter((s: any) => s.status === 'DRAFT').length },
    { status: 'Failed', count: smsBroadcasts.filter((s: any) => s.status === 'FAILED').length },
  ].filter(d => d.count > 0)

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={loadTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ussd" className="gap-1.5"><Phone className="w-3.5 h-3.5" /> USSD</TabsTrigger>
          <TabsTrigger value="ivr" className="gap-1.5"><Radio className="w-3.5 h-3.5" /> IVR</TabsTrigger>
          <TabsTrigger value="sms" className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> SMS</TabsTrigger>
        </TabsList>

        {/* ==================== USSD TAB ==================== */}
        <TabsContent value="ussd" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-emerald-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Total Sessions</p><p className="text-xl font-bold">{totalUssdSessions}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold">{activeUssd + (ussdActive ? 1 : 0)}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Completed</p><p className="text-xl font-bold">{completedUssd}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Avg Steps</p><p className="text-xl font-bold">{avgUssdSteps}</p></div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Phone Mockup */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">USSD Simulator</CardTitle>
                <CardDescription>Code: *284*56# — Interactive session mockup</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  {/* Phone Frame */}
                  <div className="w-[280px] rounded-[2rem] border-4 border-gray-800 dark:border-gray-600 bg-gray-900 overflow-hidden shadow-2xl">
                    {/* Status Bar */}
                    <div className="flex items-center justify-between px-4 py-1 text-[10px] text-gray-400 bg-gray-800">
                      <span>10:24</span>
                      <span>🔋 87%</span>
                    </div>
                    {/* Screen */}
                    <div className="h-[420px] bg-gray-950 p-3 font-mono text-sm overflow-y-auto">
                      {ussdScreen.map((line, idx) => (
                        <div key={idx} className="mb-2 whitespace-pre-wrap text-emerald-400 leading-relaxed">
                          {line}
                        </div>
                      ))}
                      {ussdLoading && (
                        <div className="text-emerald-500 animate-pulse">Processing...</div>
                      )}
                    </div>
                    {/* Input Area */}
                    <div className="border-t border-gray-800 p-2 bg-gray-900">
                      {ussdActive ? (
                        <div className="flex items-center gap-1">
                          <Input
                            className="bg-gray-800 border-gray-700 text-white text-sm h-9 font-mono"
                            placeholder="Enter option..."
                            value={ussdInput}
                            onChange={e => setUssdInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleUssdInput()}
                            maxLength={2}
                          />
                          <Button
                            size="icon"
                            className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                            onClick={handleUssdInput}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-950/40 shrink-0"
                            onClick={endUssdSession}
                          >
                            <Square className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9"
                          onClick={startUssdSession}
                        >
                          <Play className="w-3.5 h-3.5" /> Start Session
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="mt-4 max-w-[280px] mx-auto">
                  <Label className="text-xs text-muted-foreground">Phone Number</Label>
                  <Input
                    value={ussdPhone}
                    onChange={e => setUssdPhone(e.target.value)}
                    className="font-mono text-sm h-8"
                    placeholder="+256 700 000 000"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Session Log */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Session Log</CardTitle>
                <CardDescription>All USSD sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[520px] overflow-y-auto">
                  {ussdSessions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Phone className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No sessions recorded yet</p>
                      <p className="text-xs mt-1">Start a session to see the log</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ussdSessions.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                          <div>
                            <p className="text-sm font-mono font-medium">{s.phoneNumber}</p>
                            <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700'}>
                              {s.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">{s.steps} steps</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== IVR TAB ==================== */}
        <TabsContent value="ivr" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <h3 className="text-lg font-semibold flex-1">IVR Campaigns</h3>
            <Button onClick={() => setIvrDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Create Campaign
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Calls</TableHead>
                      <TableHead>Completion</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ivrCampaigns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <Radio className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No IVR campaigns yet
                        </TableCell>
                      </TableRow>
                    ) : ivrCampaigns.map((c: any) => {
                      const sc = IVR_STATUS_CONFIG[c.status] || IVR_STATUS_CONFIG.DRAFT
                      const rate = c.totalCalls > 0 ? Math.round((c.completedCalls / c.totalCalls) * 100) : 0
                      return (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setIvrDetail(c); setIvrDetailOpen(true) }}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell><Badge className={sc.class}>{sc.label}</Badge></TableCell>
                          <TableCell>{c.totalCalls}</TableCell>
                          <TableCell>{rate}%</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setIvrDetail(c); setIvrDetailOpen(true) }}>
                              <Sparkles className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* IVR Campaign Chart */}
          {ivrCampaigns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ totalCalls: { label: 'Total Calls', color: '#059669' }, completedCalls: { label: 'Completed', color: '#10b981' } }} className="h-[250px] w-full">
                  <BarChart data={ivrCampaigns.map((c: any) => ({ name: c.name.slice(0, 15), totalCalls: c.totalCalls, completedCalls: c.completedCalls }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="totalCalls" fill="#059669" radius={[4, 4, 0, 0]} name="Total Calls" />
                    <Bar dataKey="completedCalls" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== SMS TAB ==================== */}
        <TabsContent value="sms" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Total Sent</p><p className="text-xl font-bold">{totalSms}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">Delivery Rate</p><p className="text-xl font-bold">{deliveryRate}%</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div><p className="text-xs text-muted-foreground">This Month</p><p className="text-xl font-bold">{smsThisMonth}</p></div>
              </CardContent>
            </Card>
          </div>

          {/* Compose SMS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compose SMS</CardTitle>
              <CardDescription>Send messages to farmers via SMS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recipients</Label>
                  <Select value={smsRecipient} onValueChange={setSmsRecipient}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Farmers</SelectItem>
                      <SelectItem value="group">Specific Group</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Schedule (optional)</Label>
                  <Input type="datetime-local" value={smsScheduled} onChange={e => setSmsScheduled(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Type your message here..."
                  value={smsMessage}
                  onChange={e => setSmsMessage(e.target.value)}
                  rows={4}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{charCount} / 160 characters</span>
                  <span>{segments} segment(s)</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleSendSms} disabled={smsSending} className="gap-2">
                  {smsSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {smsSending ? 'Sending...' : 'Send SMS'}
                </Button>
                <Button variant="outline" onClick={handleTestSms} className="gap-2">
                  <Phone className="w-4 h-4" /> Send Test SMS
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SMS Broadcasts Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">SMS Broadcast History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Message</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {smsBroadcasts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No SMS broadcasts yet
                        </TableCell>
                      </TableRow>
                    ) : smsBroadcasts.map((b: any) => {
                      const sc = SMS_STATUS_CONFIG[b.status] || SMS_STATUS_CONFIG.DRAFT
                      return (
                        <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSmsDetail(b); setSmsDetailOpen(true) }}>
                          <TableCell className="max-w-[200px] truncate">{b.message}</TableCell>
                          <TableCell>{b.recipientCount}</TableCell>
                          <TableCell><Badge className={sc.class}>{sc.label}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {b.sentAt ? new Date(b.sentAt).toLocaleDateString() : b.scheduledAt ? new Date(b.scheduledAt).toLocaleDateString() : '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* SMS Chart */}
          {smsStatusData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">SMS Delivery Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ count: { label: 'Broadcasts', color: '#059669' } }} className="h-[250px] w-full">
                  <BarChart data={smsStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
                      {smsStatusData.map((_, idx) => (
                        <Cell key={idx} fill={['#10b981', '#3b82f6', '#9ca3af', '#ef4444'][idx]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* IVR Create Dialog */}
      <Dialog open={ivrDialogOpen} onOpenChange={setIvrDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create IVR Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input value={ivrFormName} onChange={e => setIvrFormName(e.target.value)} placeholder="e.g., Weather Alert July" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={ivrFormDesc} onChange={e => setIvrFormDesc(e.target.value)} placeholder="Brief description..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Target Group</Label>
                <Select value={ivrFormTarget} onValueChange={setIvrFormTarget}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Farmers</SelectItem>
                    <SelectItem value="coffee">Coffee Farmers</SelectItem>
                    <SelectItem value="maize">Maize Farmers</SelectItem>
                    <SelectItem value="vsla">VSLA Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={ivrFormLang} onValueChange={setIvrFormLang}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="lg">Luganda</SelectItem>
                    <SelectItem value="ach">Acholi</SelectItem>
                    <SelectItem value="sw">Swahili</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Schedule</Label>
              <Input type="datetime-local" value={ivrFormSchedule} onChange={e => setIvrFormSchedule(e.target.value)} />
            </div>
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Campaign Flow Steps</Label>
                <Button variant="outline" size="sm" onClick={() => setIvrSteps(prev => [...prev, { message: '', lang: ivrFormLang }])} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Step
                </Button>
              </div>
              {ivrSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder={`Step ${idx + 1} message / audio script...`}
                      value={step.message}
                      onChange={e => {
                        const updated = [...ivrSteps]
                        updated[idx] = { ...updated[idx], message: e.target.value }
                        setIvrSteps(updated)
                      }}
                      rows={2}
                    />
                    <Select value={step.lang} onValueChange={v => {
                      const updated = [...ivrSteps]
                      updated[idx] = { ...updated[idx], lang: v }
                      setIvrSteps(updated)
                    }}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="lg">Luganda</SelectItem>
                        <SelectItem value="ach">Acholi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {ivrSteps.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setIvrSteps(prev => prev.filter((_, i) => i !== idx))}>
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreateIvr} disabled={ivrSubmitting} className="gap-2">
              {ivrSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {ivrSubmitting ? 'Creating...' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IVR Detail Dialog */}
      <Dialog open={ivrDetailOpen} onOpenChange={setIvrDetailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ivrDetail?.name}</DialogTitle></DialogHeader>
          {ivrDetail && (
            <div className="space-y-3">
              {ivrDetail.description && <p className="text-sm text-muted-foreground">{ivrDetail.description}</p>}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <Badge className={IVR_STATUS_CONFIG[ivrDetail.status]?.class}>{IVR_STATUS_CONFIG[ivrDetail.status]?.label}</Badge></div>
                <div><span className="text-muted-foreground">Target:</span> {ivrDetail.targetGroup || 'All'}</div>
                <div><span className="text-muted-foreground">Total Calls:</span> {ivrDetail.totalCalls}</div>
                <div><span className="text-muted-foreground">Completed:</span> {ivrDetail.completedCalls}</div>
              </div>
            </div>
          )}
          <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS Detail Dialog */}
      <Dialog open={smsDetailOpen} onOpenChange={setSmsDetailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>SMS Broadcast Detail</DialogTitle></DialogHeader>
          {smsDetail && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/30 border">
                <p className="text-sm font-medium mb-1">Message:</p>
                <p className="text-sm">{smsDetail.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Recipients:</span> {smsDetail.recipientCount}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={SMS_STATUS_CONFIG[smsDetail.status]?.class}>{SMS_STATUS_CONFIG[smsDetail.status]?.label}</Badge></div>
              </div>
            </div>
          )}
          <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}