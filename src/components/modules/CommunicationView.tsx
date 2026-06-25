'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  MessageSquare, Send, Inbox, Radio, Mail, Phone, Smartphone,
  Plus, Search, Users, Megaphone, FileText, Loader2, Clock, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'

const msgStatusColor: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  DELIVERED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const msgTypeColor: Record<string, string> = {
  SMS: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  EMAIL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  IVR: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}

// Mock messages for now
const MOCK_MESSAGES = [
  { id: '1', type: 'SMS', recipient: '+256781234567', content: 'Your VSLA meeting is scheduled for tomorrow at 10:00 AM', status: 'DELIVERED', sentAt: '2026-06-24T10:30:00Z' },
  { id: '2', type: 'SMS', recipient: '+256782345678', content: 'Payment of UGX 50,000 has been processed successfully', status: 'DELIVERED', sentAt: '2026-06-24T09:15:00Z' },
  { id: '3', type: 'SMS', recipient: '+256783456789', content: 'Reminder: Training on Good Agricultural Practices this Friday', status: 'SENT', sentAt: '2026-06-23T14:00:00Z' },
  { id: '4', type: 'SMS', recipient: '+256784567890', content: 'Your loan application has been approved. Amount: UGX 500,000', status: 'DELIVERED', sentAt: '2026-06-23T11:20:00Z' },
  { id: '5', type: 'EMAIL', recipient: 'farmer@example.com', content: 'Monthly VSLA savings report for June 2026', status: 'SENT', sentAt: '2026-06-22T16:00:00Z' },
  { id: '6', type: 'SMS', recipient: '+256785678901', content: 'Market match found: 500kg Maize at UGX 1,200/kg', status: 'FAILED', sentAt: '2026-06-22T10:00:00Z' },
  { id: '7', type: 'IVR', recipient: '+256786789012', content: 'Survey call: Crop yield assessment', status: 'PENDING', sentAt: '2026-06-25T08:00:00Z' },
  { id: '8', type: 'SMS', recipient: '+256787890123', content: 'Welcome to Agrobase V3! Your account is now active.', status: 'DELIVERED', sentAt: '2026-06-21T09:00:00Z' },
]

export default function CommunicationView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [activeTab, setActiveTab] = useState(activeSubTab || 'compose')
  const [showCompose, setShowCompose] = useState(true)
  const [sending, setSending] = useState(false)

  const handleTabChange = (t: string) => { setActiveTab(t); setActiveSubTab(t) }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    await new Promise(r => setTimeout(r, 1000))
    toast.success('Message sent successfully')
    setSending(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"><Send className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Sent</p><p className="text-xl font-bold">{MOCK_MESSAGES.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center"><Inbox className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-muted-foreground">Delivered</p><p className="text-xl font-bold">{MOCK_MESSAGES.filter(m => m.status === 'DELIVERED').length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold">{MOCK_MESSAGES.filter(m => m.status === 'PENDING').length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-xs text-muted-foreground">Failed</p><p className="text-xl font-bold">{MOCK_MESSAGES.filter(m => m.status === 'FAILED').length}</p></div>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compose" className="gap-1.5"><Send className="w-3.5 h-3.5" /> Compose</TabsTrigger>
          <TabsTrigger value="outbox" className="gap-1.5"><Inbox className="w-3.5 h-3.5" /> Outbox</TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Broadcast</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Compose Message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Channel</Label>
                    <Select defaultValue="SMS">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="IVR">IVR Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Recipient</Label>
                    <Input placeholder="Phone number or email..." />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <Textarea rows={4} placeholder="Type your message here..." />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={sending} className="gap-2">
                    {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Send className="w-4 h-4" /> Send Message
                  </Button>
                  <Button type="button" variant="outline" onClick={() => toast.info('Template selector — Coming soon')}>
                    <FileText className="w-4 h-4 mr-1" /> Use Template
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outbox" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead className="hidden md:table-cell">Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_MESSAGES.map(m => (
                    <TableRow key={m.id}>
                      <TableCell><Badge className={cn('text-[10px]', msgTypeColor[m.type] || '')}>{m.type}</Badge></TableCell>
                      <TableCell className="font-medium text-sm">{m.recipient}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[250px] truncate">{m.content}</TableCell>
                      <TableCell><Badge className={cn('text-[10px]', msgStatusColor[m.status] || '')}>{m.status}</Badge></TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{new Date(m.sentAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Broadcast Messaging</p>
              <p className="text-sm mt-1">Send bulk SMS/email to farmer groups, VSLA members, or all tenants</p>
              <Button className="mt-4" variant="outline" onClick={() => toast.info('Broadcast — Coming soon')}>Create Broadcast</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

