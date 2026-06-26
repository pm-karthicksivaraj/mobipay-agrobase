'use client'

import React, { useState } from 'react'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { Loader2, Leaf, Eye, EyeOff, Sprout } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

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

  const handleDemoLogin = () => {
    setEmail('admin@agrobase.co')
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

              {/* Demo login button */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 border-primary/20 hover:bg-primary/5 hover:border-primary/40 text-primary transition-all"
                onClick={handleDemoLogin}
                disabled={loading}
              >
                <Sprout className="w-4 h-4 mr-2" />
                Demo Login (Auto-fill Credentials)
              </Button>
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