'use client'

import React, { useState } from 'react'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { Loader2, Leaf, Eye, EyeOff, Sprout, Globe, Coins, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useLanguage, LANGUAGES } from '@/lib/i18n'
import { useCurrency } from '@/lib/currency'

const DEMO_ACCOUNTS = [
  // Super Admin
  { group: 'Super Admin', email: 'admin@agrobase.co', role: 'Super Admin', country: 'All', currency: 'UGX' },
  // Uganda
  { group: 'Uganda', email: 'ug.admin@agrobase.co', role: 'Country Admin', country: 'UG', currency: 'UGX' },
  { group: 'Uganda', email: 'ug.tenant@agrobase.co', role: 'Tenant Admin', country: 'UG', currency: 'UGX' },
  { group: 'Uganda', email: 'ug.eo1@agrobase.co', role: 'Extension Officer', country: 'UG', currency: 'UGX' },
  { group: 'Uganda', email: 'ug.eo2@agrobase.co', role: 'Extension Officer', country: 'UG', currency: 'UGX' },
  { group: 'Uganda', email: 'ug.agent1@agrobase.co', role: 'Agent', country: 'UG', currency: 'UGX' },
  { group: 'Uganda', email: 'ug.cbt@agrobase.co', role: 'CBT', country: 'UG', currency: 'UGX' },
  { group: 'Uganda', email: 'ug.farmer1@agrobase.co', role: 'Farmer', country: 'UG', currency: 'UGX' },
  { group: 'Uganda', email: 'ug.farmer2@agrobase.co', role: 'Farmer', country: 'UG', currency: 'UGX' },
  // Ghana
  { group: 'Ghana', email: 'gh.admin@agrobase.co', role: 'Country Admin', country: 'GH', currency: 'GHS' },
  { group: 'Ghana', email: 'gh.eo1@agrobase.co', role: 'Extension Officer', country: 'GH', currency: 'GHS' },
  { group: 'Ghana', email: 'gh.agent1@agrobase.co', role: 'Agent', country: 'GH', currency: 'GHS' },
  { group: 'Ghana', email: 'gh.farmer1@agrobase.co', role: 'Farmer', country: 'GH', currency: 'GHS' },
  // Kenya
  { group: 'Kenya', email: 'ke.admin@agrobase.co', role: 'Country Admin', country: 'KE', currency: 'KES' },
  { group: 'Kenya', email: 'ke.eo1@agrobase.co', role: 'Extension Officer', country: 'KE', currency: 'KES' },
  { group: 'Kenya', email: 'ke.agent1@agrobase.co', role: 'Agent', country: 'KE', currency: 'KES' },
  { group: 'Kenya', email: 'ke.farmer1@agrobase.co', role: 'Farmer', country: 'KE', currency: 'KES' },
  // Exporter & MFI
  { group: 'Partners', email: 'exporter@ekibbo.co', role: 'EKIBBO Exporter', country: 'UG', currency: 'UGX' },
  { group: 'Partners', email: 'mfi@hopefinance.co', role: 'Hope MFI', country: 'UG', currency: 'UGX' },
]

// Display metadata for the currency dropdown. The actual user preference is
// persisted to localStorage via the `useCurrency` hook (see `@/lib/currency`).
const CURRENCIES = [
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', flag: '🇬🇭' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
]

// Language list is imported from `@/lib/i18n` so the order and metadata stay
// in sync with the rest of the app.

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  // Language and currency are persisted to localStorage by the hooks so the
  // rest of the app can read them after sign-in. State is initialised to the
  // defaults on the server (hydration-safe) and synced from localStorage in
  // an effect after mount.
  const { language, setLanguage } = useLanguage()
  const { currency, setCurrency } = useCurrency()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Invalid email/phone or password')
      } else if (result?.ok) {
        toast.success('Welcome back!')
      }
    } catch {
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = (demoEmail?: string) => {
    setEmail(demoEmail || 'admin@agrobase.co')
    setPassword('password123')
  }

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault()
    toast.success('Password reset link sent to your email')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-60 h-60 rounded-full bg-primary/3 blur-2xl" />
      </div>

      {/* Top-right: Multi-currency + Multi-language selectors */}
      <div className="fixed top-4 right-4 z-10 flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background/80 backdrop-blur-sm">
              <Coins className="w-3.5 h-3.5" />
              <span className="font-mono text-xs">{CURRENCIES.find(c => c.code === currency)?.symbol}</span>
              <span className="text-xs">{currency}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">Multi-currency</DropdownMenuLabel>
            {CURRENCIES.map(c => (
              <DropdownMenuItem key={c.code} onClick={() => setCurrency(c.code)} className="gap-2">
                <span>{c.flag}</span>
                <span className="text-sm font-medium">{c.code}</span>
                <span className="text-xs text-muted-foreground ml-auto">{c.name} ({c.symbol})</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background/80 backdrop-blur-sm">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-xs">{LANGUAGES.find(l => l.code === language)?.name}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">Multi-language</DropdownMenuLabel>
            {LANGUAGES.map(l => (
              <DropdownMenuItem key={l.code} onClick={() => setLanguage(l.code)} className="gap-2">
                <span>{l.flag}</span>
                <span className="text-sm font-medium">{l.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">{l.code.toUpperCase()}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 mb-4">
            <Leaf className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Agrobase V3</h1>
          <p className="text-sm text-muted-foreground mt-1">
            MobiPay AgroSys — Agricultural Management Platform
          </p>
        </div>

        <Card className="border-border/50 shadow-xl shadow-primary/5 backdrop-blur-sm">
          <CardHeader className="pb-2 pt-6 px-6">
            <div className="flex items-center gap-2 mb-1">
              <Sprout className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-semibold">Sign in to your account</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter your email or phone number and password
            </p>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email / Phone field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email or Phone</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="admin@agrobase.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  className="h-10"
                />
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  disabled={loading}
                />
                <Label
                  htmlFor="remember"
                  className="text-sm font-normal text-muted-foreground cursor-pointer"
                >
                  Remember me for 30 days
                </Label>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-md shadow-primary/20 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              {/* Demo login dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 border-primary/20 hover:bg-primary/5 hover:border-primary/40 text-primary transition-all justify-between"
                    disabled={loading}
                  >
                    <span className="flex items-center gap-2">
                      <Sprout className="w-4 h-4" />
                      Demo Accounts (UG · GH · KE)
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto" align="center">
                  {Object.entries(
                    DEMO_ACCOUNTS.reduce((acc, a) => {
                      if (!acc[a.group]) acc[a.group] = []
                      acc[a.group].push(a)
                      return acc
                    }, {} as Record<string, typeof DEMO_ACCOUNTS>)
                  ).map(([group, accounts]) => (
                    <React.Fragment key={group}>
                      <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        {group} · password: <span className="font-mono text-foreground">password123</span>
                      </DropdownMenuLabel>
                      {accounts.map(a => (
                        <DropdownMenuItem
                          key={a.email}
                          onClick={() => handleDemoLogin(a.email)}
                          className="flex items-center justify-between gap-2 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{a.role}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate">{a.email}</p>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">{a.currency}</span>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-border/50 text-center">
              <p className="text-xs text-muted-foreground">
                By signing in, you agree to the{' '}
                <span className="text-primary cursor-pointer hover:underline">Terms of Service</span>
                {' '}and{' '}
                <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                &copy; {new Date().getFullYear()} MobiPay AgroSys Limited
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Version tag */}
        <p className="text-center text-xs text-muted-foreground/60 mt-4">
          Agrobase V3.0 — Built for African Agriculture
        </p>
      </div>
    </div>
  )
}