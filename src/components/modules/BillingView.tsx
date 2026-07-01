'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DollarSign, CreditCard, Users, Sprout, Receipt, TrendingUp,
  AlertTriangle, Download, Calendar, RefreshCw, CheckCircle2, Clock, XCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { exportToCSV } from '@/components/ui/empty-state'
import { printInvoice } from '@/lib/billing/invoice-pdf'

// ---------------------------------------------------------------------------
// Types (mirror the API response shapes)
// ---------------------------------------------------------------------------

interface SubscriptionData {
  id: string
  tenantId: string
  tenantName?: string
  plan: string
  amount: number
  billingCycle: string
  status: string
  startDate: string
  endDate: string | null
  trialStartsAt?: string | null
  trialEndsAt?: string | null
  trialConvertedAt?: string | null
}

interface PlanLimits {
  maxFarmers: number
  maxUsers: number
  price: number
  modules: string[] | 'all'
}

interface UsageResponse {
  period: string
  usage: {
    farmerCount: number
    userCount: number
    vslaGroupCount: number
    trainingCount: number
    transactionCount: number
    apiCallCount: number
  }
  plan: {
    plan: string
    billingCycle: string | null
    status: string | null
    limits: PlanLimits
  }
  percentages: {
    farmers: number | null
    users: number | null
  }
  warnings: string[]
}

interface Invoice {
  id: string
  invoiceNumber: string
  tenantId: string
  subscriptionId: string | null
  plan: string
  billingCycle: string
  items: string
  subtotal: number
  tax: number
  taxRate: number
  total: number
  currency: string
  status: string
  dueDate: string
  paidAt: string | null
  paidAmount: number
  createdAt: string
}

interface InvoicesResponse {
  data: Invoice[]
  total: number
  page: number
  totalPages: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMoney(amount: number, currency: string): string {
  const symbol =
    currency === 'UGX' ? 'USh'
      : currency === 'GHS' ? 'GH₵'
        : currency === 'KES' ? 'KSh'
          : currency === 'USD' ? '$'
            : currency
  const decimals = currency === 'UGX' ? 0 : 2
  return `${symbol} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const diff = d.getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

function effectiveInvoiceStatus(inv: Invoice): string {
  // PENDING invoices past their due date render as OVERDUE.
  if (inv.status === 'PENDING') {
    const due = daysUntil(inv.dueDate)
    if (due !== null && due < 0) return 'OVERDUE'
  }
  return inv.status
}

function statusBadge(status: string) {
  switch (status) {
    case 'PAID':
      return (
        <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100">
          <CheckCircle2 className="w-3 h-3" /> PAID
        </Badge>
      )
    case 'PENDING':
      return (
        <Badge className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-100">
          <Clock className="w-3 h-3" /> PENDING
        </Badge>
      )
    case 'OVERDUE':
      return (
        <Badge className="gap-1 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 hover:bg-rose-100">
          <XCircle className="w-3 h-3" /> OVERDUE
        </Badge>
      )
    case 'PARTIALLY_PAID':
      return (
        <Badge className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-100">
          <Clock className="w-3 h-3" /> PARTIAL
        </Badge>
      )
    case 'CANCELLED':
      return <Badge variant="secondary">CANCELLED</Badge>
    case 'DRAFT':
      return <Badge variant="outline">DRAFT</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function planPriceLabel(plan: string, limits: PlanLimits): string {
  if (limits.price === 0) return 'Free'
  return `$${limits.price}/mo`
}

function modulesLabel(modules: string[] | 'all'): string {
  if (modules === 'all') return 'All modules included'
  return `${modules.length} module${modules.length === 1 ? '' : 's'} included`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BillingView() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [paying, setPaying] = useState(false)

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [subRes, usageRes, invRes] = await Promise.all([
        fetch('/api/billing/subscription'),
        fetch('/api/billing/usage'),
        fetch('/api/billing/invoices?limit=20'),
      ])
      const [subJson, usageJson, invJson] = await Promise.all([
        subRes.json(),
        usageRes.json(),
        invRes.json(),
      ])
      setSubscription(subJson?.data ?? null)
      setUsage(usageJson ?? null)
      setInvoices(Array.isArray(invJson?.data) ? invJson.data : [])
    } catch (err) {
      console.error('BillingView fetch error:', err)
      if (!silent) toast.error('Failed to load billing data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleExport = () => {
    if (invoices.length === 0) {
      toast.info('No invoices to export')
      return
    }
    const rows = invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      plan: inv.plan,
      billingCycle: inv.billingCycle,
      subtotal: inv.subtotal,
      tax: inv.tax,
      total: inv.total,
      currency: inv.currency,
      status: effectiveInvoiceStatus(inv),
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
      paidAt: inv.paidAt ? new Date(inv.paidAt).toISOString().split('T')[0] : '',
      paidAmount: inv.paidAmount,
      createdAt: new Date(inv.createdAt).toISOString().split('T')[0],
    }))
    exportToCSV(rows, 'invoices')
    toast.success(`Exported ${rows.length} invoice${rows.length === 1 ? '' : 's'}`)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  const plan = usage?.plan?.plan ?? subscription?.plan ?? 'BASIC'
  const limits = usage?.plan?.limits ?? null
  const isTrial = subscription?.status === 'TRIAL'
  const trialDaysLeft = isTrial && subscription?.trialEndsAt
    ? Math.max(0, daysUntil(subscription.trialEndsAt) ?? 0)
    : null

  const farmerPct = usage?.percentages?.farmers ?? null
  const userPct = usage?.percentages?.users ?? null
  const warnings = usage?.warnings ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Billing &amp; Usage
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your subscription, usage meters, and invoices — all in one place.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fetchAll(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overage / warning banner */}
      {warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  Usage warning{warnings.length > 1 ? 's' : ''}
                </p>
                <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-0.5">
                  {warnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top row: Current Plan + Payment Method + Usage summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Current Plan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-bold">{plan}</div>
                <div className="text-xs text-muted-foreground">
                  {limits ? planPriceLabel(plan, limits) : '—'}
                </div>
              </div>
              {subscription?.status && (
                <Badge
                  className={
                    subscription.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100'
                      : subscription.status === 'TRIAL'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-100'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }
                >
                  {subscription.status}
                </Badge>
              )}
            </div>
            <div className="text-sm space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>Billing cycle</span>
                <span className="font-medium text-foreground">
                  {subscription?.billingCycle ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Amount</span>
                <span className="font-medium text-foreground">
                  {subscription ? formatMoney(subscription.amount, 'USD') : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Period start</span>
                <span className="font-medium text-foreground">
                  {formatDate(subscription?.startDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Period end</span>
                <span className="font-medium text-foreground">
                  {formatDate(subscription?.endDate)}
                </span>
              </div>
              {limits && (
                <div className="flex justify-between">
                  <span>Modules</span>
                  <span className="font-medium text-foreground text-right">
                    {modulesLabel(limits.modules)}
                  </span>
                </div>
              )}
            </div>
            {isTrial && (
              <div className="mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Trial — {trialDaysLeft ?? 0} day{(trialDaysLeft ?? 0) === 1 ? '' : 's'} left
                  </span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Trial ends {formatDate(subscription?.trialEndsAt)}. Upgrade before then to avoid suspension.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Meters */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Usage Meters
            </CardTitle>
            <CardDescription className="text-xs">
              Period: {usage?.period ?? '—'} · Compared to your {plan} plan limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Farmers meter (progress bar) */}
            <UsageMeter
              icon={Sprout}
              label="Farmers"
              count={usage?.usage?.farmerCount ?? 0}
              limit={limits?.maxFarmers}
              pct={farmerPct}
            />
            {/* Users meter (progress bar) */}
            <UsageMeter
              icon={Users}
              label="Users"
              count={usage?.usage?.userCount ?? 0}
              limit={limits?.maxUsers}
              pct={userPct}
            />
            {/* Smaller stat tiles for non-metered usage */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <StatTile
                icon={Receipt}
                label="Transactions"
                value={usage?.usage?.transactionCount ?? 0}
                hint="Sales + Purchases"
              />
              <StatTile
                icon={Users}
                label="VSLA Groups"
                value={usage?.usage?.vslaGroupCount ?? 0}
              />
              <StatTile
                icon={Calendar}
                label="Trainings"
                value={usage?.usage?.trainingCount ?? 0}
              />
              <StatTile
                icon={TrendingUp}
                label="API Calls"
                value={usage?.usage?.apiCallCount ?? 0}
                hint="This month"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment method + Flutterwave payment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            Payment & Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Pay via Flutterwave</p>
                <p className="text-xs text-muted-foreground">
                  Mobile Money (UGX/GHS/KES), Card, Bank Transfer, USSD
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-2"
              disabled={paying}
              onClick={async () => {
                setPaying(true)
                try {
                  const res = await fetch('/api/billing/flutterwave/initiate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      plan: subscription?.plan || 'PROFESSIONAL',
                      billingCycle: subscription?.billingCycle || 'MONTHLY',
                    }),
                  })
                  const data = await res.json()
                  if (data.success && data.paymentLink) {
                    toast.success('Redirecting to Flutterwave...')
                    window.location.href = data.paymentLink
                  } else {
                    toast.error(data.error || 'Payment not configured yet')
                  }
                } catch {
                  toast.error('Failed to initiate payment')
                } finally {
                  setPaying(false)
                }
              }}
            >
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Pay Now
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 To activate Flutterwave: add <code className="bg-muted px-1 rounded">FLW_SECRET_KEY</code> and
            <code className="bg-muted px-1 rounded">FLW_PUBLIC_KEY</code> to your environment variables.
            Get keys at <a href="https://flutterwave.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">flutterwave.com</a>.
          </p>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-muted-foreground" />
                Invoices
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {invoices.length} invoice{invoices.length === 1 ? '' : 's'} on file
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExport}
              disabled={invoices.length === 0}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No invoices yet</p>
              <p className="text-sm mt-1">
                Invoices are generated automatically at the start of each billing cycle.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const eff = effectiveInvoiceStatus(inv)
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                      <TableCell>
                        <span className="font-medium">{inv.plan}</span>
                        <span className="text-xs text-muted-foreground ml-2">{inv.billingCycle}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(inv.total, inv.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(inv.dueDate)}</div>
                        {eff === 'OVERDUE' && (
                          <div className="text-xs text-rose-600 dark:text-rose-400">
                            {Math.abs(daysUntil(inv.dueDate) ?? 0)}d overdue
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(eff)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(inv.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs h-7"
                          onClick={() => {
                            const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || [])
                            printInvoice({
                              invoiceNumber: inv.invoiceNumber,
                              tenantName: subscription?.tenantName || '—',
                              tenantCountry: '',
                              plan: inv.plan,
                              billingCycle: inv.billingCycle,
                              items: Array.isArray(items) ? items : [{ description: `${inv.plan} Plan`, amount: inv.subtotal, quantity: 1, total: inv.subtotal }],
                              subtotal: inv.subtotal,
                              tax: inv.tax,
                              total: inv.total,
                              currency: inv.currency,
                              status: eff,
                              dueDate: inv.dueDate,
                              paidAt: inv.paidAt || undefined,
                              createdAt: inv.createdAt,
                            })
                          }}
                        >
                          <Download className="w-3 h-3" /> PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UsageMeter({
  icon: Icon,
  label,
  count,
  limit,
  pct,
}: {
  icon: React.ElementType
  label: string
  count: number
  limit: number | undefined
  pct: number | null
}) {
  const unlimited = limit === undefined || limit === Infinity
  const displayLimit = unlimited ? '∞' : (limit ?? 0)
  const displayPct = pct ?? 0
  const over = !unlimited && typeof limit === 'number' && count > limit
  const near = !unlimited && pct !== null && pct >= 90 && !over

  // Color the Progress indicator via a descendant selector override. The
  // shadcn Progress component hard-codes `bg-primary` on its indicator, so
  // we use the Tailwind arbitrary variant `[&_ [...]]` to recolour the
  // inner indicator per state.
  const indicatorClass = over
    ? '[&_[data-slot=progress-indicator]]:bg-rose-500'
    : near
      ? '[&_[data-slot=progress-indicator]]:bg-amber-500'
      : '[&_[data-slot=progress-indicator]]:bg-emerald-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 text-sm">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{label}</span>
        </div>
        <div className="text-sm tabular-nums">
          <span className={`font-semibold ${over ? 'text-rose-600 dark:text-rose-400' : ''}`}>
            {count.toLocaleString()}
          </span>
          <span className="text-muted-foreground"> / {displayLimit}</span>
          {!unlimited && pct !== null && (
            <span className="text-xs text-muted-foreground ml-2">({pct}%)</span>
          )}
        </div>
      </div>
      {unlimited ? (
        <div className="h-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40" />
      ) : (
        <Progress
          value={Math.min(100, displayPct)}
          className={indicatorClass}
        />
      )}
      {over && (
        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
          Over plan limit by {(count - (limit ?? 0)).toLocaleString()}
        </p>
      )}
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType
  label: string
  value: number
  hint?: string
}) {
  return (
    <div className="p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold tabular-nums">{value.toLocaleString()}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  )
}
