'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { safeFetch, extractArray } from '@/lib/safe-fetch'
import {
  Search, Plus, X, Loader2, DollarSign, ShoppingCart, TrendingUp, Award,
  Eye, ChevronLeft, ChevronRight, BarChart3, Calendar, Pencil, Trash2, Download
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { EmptyState, exportToCSV } from '@/components/ui/empty-state'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'

interface Sale {
  id: string
  farmerName: string
  farmerCode: string
  product: string
  category: 'Produce' | 'Inputs'
  quantity: number
  unit: string
  unitPrice: number
  total: number
  totalAmount: number
  charges?: number
  taxAmount?: number
  date: string
  createdAt: string
}

const produceItems = ['Hulled Coffee', 'Cocoa', 'Cassava', 'Avocado', 'Vanilla', 'Jackfruit']
const inputItems = ['Fertilizers', 'Tarpaulins', 'Seedlings', 'Pruning Saws']

const mockSales: Sale[] = [
  { id: 'sl1', farmerName: 'James Okello', farmerCode: 'FRM-001', product: 'Hulled Coffee', category: 'Produce', quantity: 120, unit: 'kg', unitPrice: 12000, total: 1440000, totalAmount: 1440000, date: '2024-11-20', createdAt: '2024-11-20' },
  { id: 'sl2', farmerName: 'Grace Achieng', farmerCode: 'FRM-012', product: 'Cocoa', category: 'Produce', quantity: 85, unit: 'kg', unitPrice: 15000, total: 1275000, totalAmount: 1275000, date: '2024-11-19', createdAt: '2024-11-19' },
  { id: 'sl3', farmerName: 'Sarah Nakamya', farmerCode: 'FRM-023', product: 'Vanilla', category: 'Produce', quantity: 8, unit: 'kg', unitPrice: 95000, total: 760000, totalAmount: 760000, date: '2024-11-18', createdAt: '2024-11-18' },
  { id: 'sl4', farmerName: 'Peter Ochieng', farmerCode: 'FRM-031', product: 'Fertilizers', category: 'Inputs', quantity: 5, unit: 'bags', unitPrice: 85000, total: 425000, totalAmount: 425000, date: '2024-11-17', createdAt: '2024-11-17' },
  { id: 'sl5', farmerName: 'Wangari Muthoni', farmerCode: 'FRM-045', product: 'Avocado', category: 'Produce', quantity: 300, unit: 'kg', unitPrice: 4000, total: 1200000, totalAmount: 1200000, date: '2024-11-16', createdAt: '2024-11-16' },
  { id: 'sl6', farmerName: 'Kwame Asante', farmerCode: 'FRM-078', product: 'Tarpaulins', category: 'Inputs', quantity: 3, unit: 'pcs', unitPrice: 120000, total: 360000, totalAmount: 360000, date: '2024-11-15', createdAt: '2024-11-15' },
  { id: 'sl7', farmerName: 'James Okello', farmerCode: 'FRM-001', product: 'Hulled Coffee', category: 'Produce', quantity: 200, unit: 'kg', unitPrice: 11500, total: 2300000, totalAmount: 2300000, date: '2024-11-14', createdAt: '2024-11-14' },
  { id: 'sl8', farmerName: 'Grace Achieng', farmerCode: 'FRM-012', product: 'Seedlings', category: 'Inputs', quantity: 500, unit: 'pcs', unitPrice: 500, total: 250000, totalAmount: 250000, date: '2024-11-13', createdAt: '2024-11-13' },
  { id: 'sl9', farmerName: 'Sarah Nakamya', farmerCode: 'FRM-023', product: 'Cassava', category: 'Produce', quantity: 800, unit: 'kg', unitPrice: 900, total: 720000, totalAmount: 720000, date: '2024-11-12', createdAt: '2024-11-12' },
  { id: 'sl10', farmerName: 'Peter Ochieng', farmerCode: 'FRM-031', product: 'Jackfruit', category: 'Produce', quantity: 150, unit: 'kg', unitPrice: 2500, total: 375000, totalAmount: 375000, date: '2024-11-11', createdAt: '2024-11-11' },
  { id: 'sl11', farmerName: 'Wangari Muthoni', farmerCode: 'FRM-045', product: 'Hulled Coffee', category: 'Produce', quantity: 90, unit: 'kg', unitPrice: 12500, total: 1125000, totalAmount: 1125000, date: '2024-11-10', createdAt: '2024-11-10' },
  { id: 'sl12', farmerName: 'Kwame Asante', farmerCode: 'FRM-078', product: 'Pruning Saws', category: 'Inputs', quantity: 2, unit: 'pcs', unitPrice: 45000, total: 90000, totalAmount: 90000, date: '2024-11-09', createdAt: '2024-11-09' },
  { id: 'sl13', farmerName: 'James Okello', farmerCode: 'FRM-001', product: 'Hulled Coffee', category: 'Produce', quantity: 175, unit: 'kg', unitPrice: 11800, total: 2065000, totalAmount: 2065000, date: '2024-10-28', createdAt: '2024-10-28' },
  { id: 'sl14', farmerName: 'Grace Achieng', farmerCode: 'FRM-012', product: 'Cocoa', category: 'Produce', quantity: 60, unit: 'kg', unitPrice: 14500, total: 870000, totalAmount: 870000, date: '2024-10-25', createdAt: '2024-10-25' },
  { id: 'sl15', farmerName: 'Sarah Nakamya', farmerCode: 'FRM-023', product: 'Avocado', category: 'Produce', quantity: 250, unit: 'kg', unitPrice: 3800, total: 950000, totalAmount: 950000, date: '2024-10-20', createdAt: '2024-10-20' },
]

export default function SalesView() {
  const { } = useAppStore()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [page, setPage] = useState(1)
  const limit = 10

  const fetchSales = useCallback(async () => {
    setLoading(true)
    try {
      const data = await safeFetch('/api/sales')
      if (data) {
        const raw = extractArray(data, 'data', 'sales')
        // Normalize raw Prisma Sale rows to the Sale interface
        const normalized: Sale[] = raw.map((s: any) => ({
          id: s.id,
          farmerName: s.farmer ? `${s.farmer.firstName ?? ''} ${s.farmer.lastName ?? ''}`.trim() : (s.customerName || 'Unknown'),
          farmerCode: s.farmer?.farmerCode || '',
          product: s.product || '',
          category: s.category === 'INPUT' || s.category === 'Inputs' ? 'Inputs' : 'Produce',
          quantity: Number(s.quantity) || 0,
          unit: s.unit || '',
          unitPrice: s.unitPrice ?? 0,
          total: s.totalAmount ?? 0,
          totalAmount: s.totalAmount ?? 0,
          charges: s.charges ?? 0,
          taxAmount: s.taxAmount ?? 0,
          date: s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '',
          createdAt: s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '',
        }))
        setSales(normalized.length > 0 ? normalized : mockSales)
      } else {
        setSales(mockSales)
      }
    } catch {
      setSales(mockSales)
    } finally {
      setLoading(false)
    }
  }, [])

  const openEdit = (s: Sale) => {
    setEditingSale(s)
    setShowAdd(false)
  }

  const openAdd = () => {
    setEditingSale(null)
    setShowAdd(true)
  }

  const closeFormDialog = () => {
    setShowAdd(false)
    setEditingSale(null)
    fetchSales()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) return
    try {
      const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Sale deleted')
        fetchSales()
      } else {
        toast.error('Failed to delete sale')
      }
    } catch { toast.error('Network error') }
  }

  useEffect(() => { fetchSales() }, [fetchSales])

  const filtered = sales.filter(s => {
    const matchSearch = !search || s.farmerName.toLowerCase().includes(search.toLowerCase()) || s.product.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !categoryFilter || (s.category || "Produce") === categoryFilter
    return matchSearch && matchCategory
  })

  const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
  const thisMonth = sales.filter(s => (s.createdAt || '').startsWith('2024-11')).reduce((sum, s) => sum + (s.totalAmount || 0), 0)
  const avgTransaction = sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0

  const productTotals = Object.entries(
    sales.reduce((acc, s) => { acc[s.product] = (acc[s.product] || 0) + (s.totalAmount || 0); return acc }, {} as Record<string, number>)
  )
  const topProduct = productTotals.length > 0 ? productTotals.reduce((a, b) => a[1] > b[1] ? a : b)[0] : '—'

  const categoryBarData = productTotals.map(([name, value]) => ({ name, value }))

  const monthlyRevenue = [
    { month: 'Jul', revenue: 1800000 },
    { month: 'Aug', revenue: 2400000 },
    { month: 'Sep', revenue: 3200000 },
    { month: 'Oct', revenue: 3885000 },
    { month: 'Nov', revenue: 10785000 },
  ]

  const pieData = [
    { name: 'Produce', value: sales.filter(s => s.category === 'Produce').reduce((sum, s) => sum + (s.totalAmount || 0), 0), color: '#10b981' },
    { name: 'Inputs', value: sales.filter(s => s.category === 'Inputs').reduce((sum, s) => sum + (s.totalAmount || 0), 0), color: '#f59e0b' },
  ]

  const paged = filtered.slice((page - 1) * limit, page * limit)
  const totalPages = Math.ceil(filtered.length / limit)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Sales Management</h3>
          <p className="text-sm text-muted-foreground">Track farmer sales — produce and inputs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(sales, 'sales')} disabled={sales.length === 0} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" /> New Sale</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Total Sales</p><p className="text-xl font-bold">{sales.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">This Month</p><p className="text-lg font-bold">UGX {(thisMonth / 1000000).toFixed(1)}M</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center"><DollarSign className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">Avg Transaction</p><p className="text-lg font-bold">UGX {avgTransaction.toLocaleString()}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center"><Award className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-muted-foreground">Top Product</p><p className="text-sm font-bold mt-0.5 truncate max-w-[100px]">{topProduct}</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        {/* Tab 1: Sales Table */}
        <TabsContent value="sales" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by farmer or product..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Produce">Produce</SelectItem>
                <SelectItem value="Inputs">Inputs</SelectItem>
              </SelectContent>
            </Select>
            {(search || categoryFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategoryFilter(''); setPage(1) }} className="gap-1"><X className="w-3.5 h-3.5" /> Clear</Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title="No sales found"
                />
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer</TableHead>
                        <TableHead className="hidden sm:table-cell">Product</TableHead>
                        <TableHead className="hidden md:table-cell">Category</TableHead>
                        <TableHead className="hidden md:table-cell">Qty</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                        <TableHead className="w-[120px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.map(s => (
                        <TableRow key={s.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{s.farmerName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{s.farmerCode}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{s.product}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge className={cn('text-[10px]', s.category || "Produce" === 'Produce' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300')}>
                              {s.category || "Produce"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{s.quantity} {s.unit}</TableCell>
                          <TableCell className="text-sm">UGX {s.unitPrice.toLocaleString()}</TableCell>
                          <TableCell className="text-sm font-medium text-emerald-700 dark:text-emerald-400">UGX {(s.totalAmount || 0).toLocaleString()}</TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{s.createdAt}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(s)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40" title="Delete" onClick={() => handleDelete(s.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            {!loading && filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, filtered.length)} of {filtered.length}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /> Prev</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab 2: By Category */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Sales by Product</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryBarData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={v => `UGX ${Number(v).toLocaleString()}`} />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Produce vs Inputs</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={v => `UGX ${Number(v).toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Produce Sales</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {productTotals.filter(([name]) => !inputItems.includes(name)).map(([name, value]) => (
                      <TableRow key={name}><TableCell className="text-sm">{name}</TableCell><TableCell className="text-sm text-right font-medium">UGX {value.toLocaleString()}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /> Input Sales</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {productTotals.filter(([name]) => inputItems.includes(name)).map(([name, value]) => (
                      <TableRow key={name}><TableCell className="text-sm">{name}</TableCell><TableCell className="text-sm text-right font-medium">UGX {value.toLocaleString()}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Revenue Trend */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={v => `UGX ${Number(v).toLocaleString()}`} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">UGX {(totalRevenue / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-emerald-600 mt-1">↑ All time</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">November 2024</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">UGX {(thisMonth / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-emerald-600 mt-1">↑ This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Growth (Oct → Nov)</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  {monthlyRevenue.length >= 2 ? `+${(((monthlyRevenue[monthlyRevenue.length - 1].revenue - monthlyRevenue[monthlyRevenue.length - 2].revenue) / monthlyRevenue[monthlyRevenue.length - 2].revenue) * 100).toFixed(0)}%` : '—'}
                </p>
                <p className="text-xs text-emerald-600 mt-1">Month over month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Sale Dialog */}
      <Dialog open={showAdd || !!editingSale} onOpenChange={open => { if (!open) closeFormDialog() }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingSale ? 'Edit Sale' : 'Record New Sale'}</DialogTitle></DialogHeader>
          <AddSaleForm onClose={closeFormDialog} initial={editingSale} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddSaleForm({ onClose, initial }: { onClose: () => void; initial?: Sale | null }) {
  const [saving, setSaving] = useState(false)
  const isEdit = !!initial
  const [category, setCategory] = useState<'Produce' | 'Inputs'>(initial?.category === 'Inputs' ? 'Inputs' : 'Produce')
  const [form, setForm] = useState({
    farmerName: initial?.farmerName || '',
    farmerCode: initial?.farmerCode || '',
    product: initial?.product || '',
    quantity: initial?.quantity?.toString() || '',
    unitPrice: initial?.unitPrice?.toString() || '',
    unit: initial?.unit || 'kg',
    charges: initial?.charges?.toString() || '',
    tax: initial?.taxAmount?.toString() || '',
  })
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const productOptions = category === 'Produce' ? produceItems : inputItems

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.product || !form.quantity || !form.unitPrice) {
      toast.error('Product, quantity, and unit price are required')
      return
    }
    setSaving(true)
    try {
      const qty = Number(form.quantity)
      const price = Number(form.unitPrice)
      const charges = Number(form.charges) || 0
      const tax = Number(form.tax) || 0
      const totalAmount = qty * price
      const netAmount = totalAmount - charges - tax
      if (isEdit) {
        // PUT — only send fields on the Prisma Sale model.
        // Sale has: product, category, quantity (String), unitPrice, totalAmount,
        // charges, taxAmount, netAmount, status (and tenant/farmer relations).
        // farmerName / farmerCode / unit / total / date are NOT columns and would break PUT.
        const payload = {
          product: form.product,
          category,
          quantity: String(qty),
          unitPrice: price,
          totalAmount,
          charges,
          taxAmount: tax,
          netAmount,
        }
        const res = await fetch(`/api/sales/${initial!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error || 'Request failed')
        }
        toast.success('Sale updated successfully')
      } else {
        // POST — the API cherry-picks: farmerId, customerId, customerName, product,
        // quantity, unitPrice, totalAmount, status. Other fields are ignored.
        const payload = {
          farmerName: form.farmerName,
          farmerCode: form.farmerCode,
          product: form.product,
          quantity: String(qty),
          unitPrice: price,
          unit: form.unit,
          total: totalAmount,
          totalAmount,
          category,
          charges,
          taxAmount: tax,
          date: new Date().toISOString().split('T')[0],
          status: 'COMPLETED',
        }
        const res = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error || 'Request failed')
        }
        toast.success('Sale recorded successfully')
      }
      onClose()
    } catch (err: any) {
      toast.error(err?.message || (isEdit ? 'Failed to update sale' : 'Failed to record sale'))
    }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isEdit ? (
        <div className="space-y-1.5">
          <Label>Farmer</Label>
          <Input value={form.farmerName} disabled className="bg-muted/50" />
          <p className="text-[10px] text-muted-foreground">Farmer cannot be reassigned from this form.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Farmer Name *</Label><Input value={form.farmerName} onChange={e => update('farmerName', e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>Farmer Code</Label><Input value={form.farmerCode} onChange={e => update('farmerCode', e.target.value)} placeholder="FRM-XXX" /></div>
        </div>
      )}
      <div className="space-y-1.5"><Label>Category *</Label>
        <Select value={category} onValueChange={v => { setCategory(v as 'Produce' | 'Inputs'); update('product', '') }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Produce">Produce</SelectItem>
            <SelectItem value="Inputs">Inputs</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Commodity / Product *</Label>
        <Select value={form.product} onValueChange={v => update('product', v)}>
          <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
          <SelectContent>
            {productOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5"><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => update('quantity', e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Unit</Label>
          <Select value={form.unit} onValueChange={v => update('unit', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {category === 'Produce' ? (
                <><SelectItem value="kg">Kilograms</SelectItem><SelectItem value="bags">Bags</SelectItem></>
              ) : (
                <><SelectItem value="pcs">Pieces</SelectItem><SelectItem value="bags">Bags</SelectItem></>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Unit Price (UGX) *</Label><Input type="number" value={form.unitPrice} onChange={e => update('unitPrice', e.target.value)} required /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Charges (UGX)</Label><Input type="number" value={form.charges} onChange={e => update('charges', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Tax (UGX)</Label><Input type="number" value={form.tax} onChange={e => update('tax', e.target.value)} /></div>
      </div>
      {form.quantity && form.unitPrice && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg space-y-1">
          <p className="text-sm text-muted-foreground">Gross: <span className="font-bold text-emerald-700 dark:text-emerald-400">UGX {(Number(form.quantity) * Number(form.unitPrice)).toLocaleString()}</span></p>
          {(form.charges || form.tax) && (
            <p className="text-sm text-muted-foreground">Net: <span className="font-bold text-emerald-700 dark:text-emerald-400">UGX {(Number(form.quantity) * Number(form.unitPrice) - (Number(form.charges) || 0) - (Number(form.tax) || 0)).toLocaleString()}</span></p>
          )}
        </div>
      )}
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} {isEdit ? 'Update Sale' : 'Record Sale'}</Button>
      </DialogFooter>
    </form>
  )
}