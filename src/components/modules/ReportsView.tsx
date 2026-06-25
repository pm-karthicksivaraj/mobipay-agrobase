'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  FileText, BarChart3, Download, Search, Users, PiggyBank, DollarSign,
  Store, GraduationCap, CreditCard, Receipt, TrendingUp, PieChart as PieIcon,
  MapPin, Calendar, Layers, Database
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface ReportCategory {
  title: string
  icon: React.ElementType
  color: string
  bgColor: string
  reports: { key: string; label: string; description: string }[]
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    title: 'Farmer Reports', icon: Users, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    reports: [
      { key: 'farmer-registration', label: 'Farmer Registration Report', description: 'All registered farmers with demographics and status' },
      { key: 'farmer-demographics', label: 'Demographics Analysis', description: 'Gender, age, education distribution across regions' },
      { key: 'farmer-crop', label: 'Crop Distribution', description: 'Farmers by crop type, variety, and cultivation area' },
      { key: 'farmer-geo', label: 'Geographic Distribution', description: 'Farmer concentration by district, sub-county, and village' },
      { key: 'farmer-certification', label: 'Certification Report', description: 'Certified vs non-certified farmers breakdown' },
    ],
  },
  {
    title: 'VSLA Reports', icon: PiggyBank, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    reports: [
      { key: 'vsla-savings', label: 'Savings Report', description: 'Individual and group savings over time periods' },
      { key: 'vsla-loans', label: 'Loan Portfolio', description: 'Loan disbursements, repayments, and outstanding balance' },
      { key: 'vsla-meetings', label: 'Meeting Attendance', description: 'Attendance rates and meeting frequency analysis' },
      { key: 'vsla-performance', label: 'Group Performance', description: 'Comparative performance across all VSLA groups' },
      { key: 'vsla-welfare', label: 'Welfare Payments', description: 'Welfare fund utilization and disbursement tracking' },
    ],
  },
  {
    title: 'Financial Reports', icon: DollarSign, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    reports: [
      { key: 'payment-summary', label: 'Payment Summary', description: 'All payments by type, status, and time period' },
      { key: 'revenue', label: 'Revenue Report', description: 'Platform revenue from fees, subscriptions, and transactions' },
      { key: 'bulk-payments', label: 'Bulk Payment Report', description: 'Purchase and disbursement payment summaries' },
      { key: 'transaction-recon', label: 'Transaction Reconciliation', description: 'Match and reconcile all financial transactions' },
    ],
  },
  {
    title: 'Marketplace Reports', icon: Store, color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    reports: [
      { key: 'market-matches', label: 'Market Match Report', description: 'All buyer-seller matches and their status' },
      { key: 'commodity-prices', label: 'Commodity Price Trends', description: 'Price movements for key commodities' },
      { key: 'input-aggregation', label: 'Input Aggregation Report', description: 'Input dealer performance and request fulfillment' },
    ],
  },
  {
    title: 'Training & Extension', icon: GraduationCap, color: 'text-cyan-600', bgColor: 'bg-cyan-50 dark:bg-cyan-950/40',
    reports: [
      { key: 'training-attendance', label: 'Training Attendance', description: 'Farmer participation in training sessions' },
      { key: 'training-coverage', label: 'Extension Coverage', description: 'Extension officer coverage and farmer reach' },
    ],
  },
  {
    title: 'Credit & Risk', icon: CreditCard, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950/40',
    reports: [
      { key: 'credit-scores', label: 'Credit Score Distribution', description: '4-factor credit score analysis across farmers' },
      { key: 'loan-default', label: 'Default Risk Assessment', description: 'Identify high-risk loans and default patterns' },
      { key: 'portfolio-quality', label: 'Portfolio Quality', description: 'Loan portfolio health metrics and risk indicators' },
    ],
  },
  {
    title: 'System & Operations', icon: Database, color: 'text-slate-600', bgColor: 'bg-slate-50 dark:bg-slate-950/40',
    reports: [
      { key: 'audit-log', label: 'Audit Trail', description: 'Complete system audit log with user actions' },
      { key: 'usage-stats', label: 'Module Usage Statistics', description: 'Feature usage metrics and user engagement' },
      { key: 'tenant-report', label: 'Tenant Summary', description: 'Multi-tenant activity and subscription status' },
    ],
  },
]

export default function ReportsView() {
  const [search, setSearch] = useState('')

  const filteredCategories = REPORT_CATEGORIES.map(cat => ({
    ...cat,
    reports: cat.reports.filter(r =>
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.reports.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Reports & Analytics</h3>
          <p className="text-sm text-muted-foreground">{REPORT_CATEGORIES.reduce((s, c) => s + c.reports.length, 0)} report types available</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search reports..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="space-y-6">
        {filteredCategories.map(cat => {
          const Icon = cat.icon
          return (
            <div key={cat.title}>
              <div className="flex items-center gap-2 mb-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', cat.bgColor)}>
                  <Icon className={cn('w-4 h-4', cat.color)} />
                </div>
                <h4 className="font-semibold text-sm">{cat.title}</h4>
                <Badge variant="outline" className="text-[10px]">{cat.reports.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {cat.reports.map(report => (
                  <Card key={report.key} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => toast.info(`Report "${report.label}" — Coming soon`)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h5 className="font-medium text-sm group-hover:text-primary transition-colors">{report.label}</h5>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.description}</p>
                        </div>
                        <Download className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}