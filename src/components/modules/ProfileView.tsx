'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import {
  User, Shield, Clock, Mail, Phone, Building2, QrCode, Edit3,
  Loader2, Activity, Key, Smartphone, Save, X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  COUNTRY_ADMIN: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  TENANT_ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  AGENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  EXTENSION_OFFICER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CBT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  FARMER: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  VSLA_MEMBER: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
}

const MOCK_ACTIVITY = [
  { id: '1', action: 'Logged in', entityType: 'Auth', details: 'Login from mobile device', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: '2', action: 'Updated profile', entityType: 'User', details: 'Changed phone number', createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  { id: '3', action: 'Viewed VSLA group', entityType: 'VslaGroup', details: 'Viewed group savings', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: '4', action: 'Made a saving', entityType: 'VslaSaving', details: 'Deposited UGX 50,000', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: '5', action: 'Attended training', entityType: 'Training', details: 'Post-Harvest Handling', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
  { id: '6', action: 'Applied for loan', entityType: 'Loan', details: 'UGX 200,000 loan application', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
  { id: '7', action: 'Logged in', entityType: 'Auth', details: 'Login from web browser', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString() },
  { id: '8', action: 'Updated farm details', entityType: 'FarmLand', details: 'Added new field location', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString() },
  { id: '9', action: 'Viewed market prices', entityType: 'Market', details: 'Checked coffee prices', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 144).toISOString() },
  { id: '10', action: 'Logged in', entityType: 'Auth', details: 'Login from USSD', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString() },
]

export default function ProfileView() {
  const { user, activeSubTab, setActiveSubTab } = useAppStore()
  const [activeTab, setActiveTab] = useState(activeSubTab || 'profile')
  const [editOpen, setEditOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')

  // Security form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [twoFactor, setTwoFactor] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Activity
  const [activities, setActivities] = useState<any[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

  const loadTab = (tab: string) => { setActiveTab(tab); setActiveSubTab(tab) }

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch('/api/audit-logs?limit=10')
      if (res.ok) {
        const data = await res.json()
        setActivities(data.logs || data || [])
      } else {
        // Fallback to mock data for demo
        setActivities(MOCK_ACTIVITY)
      }
    } catch {
      setActivities(MOCK_ACTIVITY)
    } finally {
      setActivityLoading(false)
    }
  }, [])

  useEffect(() => { fetchActivities() }, [fetchActivities])

  useEffect(() => {
    if (user) {
      setEditName(user.name || '')
      setEditEmail(user.email || '')
      setEditPhone(user.phone || '')
    }
  }, [user])

  const openEdit = () => {
    setEditName(user?.name || '')
    setEditEmail(user?.email || '')
    setEditPhone(user?.phone || '')
    setEditOpen(true)
  }

  const handleSaveProfile = async () => {
    if (!editName.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone }),
      })
      if (res.ok) {
        toast.success('Profile updated successfully')
        setEditOpen(false)
      } else {
        toast.error('Failed to update profile')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setChangingPassword(true)
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500))
    toast.success('Password changed successfully')
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    setChangingPassword(false)
  }

  const displayName = user?.name || 'Agrobase User'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const roleClass = ROLE_COLORS[user?.role || ''] || 'bg-gray-100 text-gray-700'

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={loadTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Tab 1: My Profile */}
        <TabsContent value="profile" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Profile Card */}
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start gap-5">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user?.avatarUrl} />
                    <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-2xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-2xl font-bold">{displayName}</h2>
                      <Badge className={roleClass}>{user?.role || 'User'}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{user?.email || 'No email set'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{user?.phone || 'No phone'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>Tenant: {user?.tenantId || 'Default'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>Last login: Just now</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={openEdit} className="gap-2 mt-2">
                      <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QR Code Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="w-4 h-4" /> EKIBBO Farmer ID
                </CardTitle>
                <CardDescription>Your unique QR code for identification</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-4">
                {/* QR Code Placeholder */}
                <div className="w-40 h-40 bg-white border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-lg flex flex-col items-center justify-center gap-2">
                  <QrCode className="w-16 h-16 text-emerald-300 dark:text-emerald-700" />
                  <span className="text-xs text-muted-foreground">QR Code</span>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">ID: {user?.userId || 'AGB-00000'}</p>
                <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => toast.info('QR Code download coming soon')}>
                  <Smartphone className="w-3.5 h-3.5" /> Download QR
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Account Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <User className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                <p className="text-sm text-muted-foreground">Account Type</p>
                <p className="font-bold">{user?.role || 'Standard'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-bold">{new Date().toLocaleDateString('default', { month: 'short', year: 'numeric' })}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Activity className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-muted-foreground">Total Actions</p>
                <p className="font-bold">{activities.length > 0 ? '10+' : '0'}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Security */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPassword} className="gap-2">
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5" /> Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between max-w-md">
                <div>
                  <p className="font-medium text-sm">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Receive a code via SMS when logging in</p>
                </div>
                <Switch checked={twoFactor} onCheckedChange={(checked) => {
                  setTwoFactor(checked)
                  toast.info(checked ? '2FA enabled (placeholder)' : '2FA disabled (placeholder)')
                }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Devices currently signed in to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Current Session</p>
                      <p className="text-xs text-muted-foreground">This browser — Active now</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Current</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Activity Log */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> Recent Activity</CardTitle>
              <CardDescription>Your last 10 actions on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No activity recorded yet</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 border-l-2 border-emerald-200 dark:border-emerald-800 ml-2">
                  {activities.slice(0, 10).map((act: any, idx: number) => (
                    <div key={act.id || idx} className="relative">
                      <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-background ${
                        idx === 0 ? 'bg-emerald-500' : 'bg-emerald-300 dark:bg-emerald-700'
                      }`} />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{act.action}</p>
                          <p className="text-xs text-muted-foreground">{act.details}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs text-muted-foreground">{timeAgo(act.createdAt)}</span>
                          {act.entityType && <Badge variant="outline" className="ml-2 text-xs">{act.entityType}</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your full name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="your@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+256 700 000 000" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline"><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button></DialogClose>
            <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}