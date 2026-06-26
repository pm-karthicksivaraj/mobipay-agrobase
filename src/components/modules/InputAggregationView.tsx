'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Search, Plus, Store, Package, ShoppingBag, X, Loader2, Phone, MapPin,
  DollarSign, Sprout, Leaf, Wrench, Shield, Filter, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface Dealer {
  id: string
  name: string
  phone: string
  location: string
  active: boolean
  productsCount: number
  createdAt: string
}

interface InputProduct {
  id: string
  name: string
  category: 'Seeds' | 'Fertilizer' | 'Pesticide' | 'Equipment'
  dealerName: string
  dealerId: string
  price: number
  unit: string
  inStock: boolean
  stockQuantity: number
}

interface InputRequest {
  id: string
  farmerName: string
  farmerCode: string
  productName: string
  productId: string
  quantity: number
  unit: string
  status: 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED'
  requestedAt: string
  totalCost: number
}

const requestStatusColor: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  DELIVERED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const categoryIcons: Record<string, React.ReactNode> = {
  Seeds: <Sprout className="w-5 h-5" />,
  Fertilizer: <Leaf className="w-5 h-5" />,
  Pesticide: <Shield className="w-5 h-5" />,
  Equipment: <Wrench className="w-5 h-5" />,
}

const categoryColors: Record<string, string> = {
  Seeds: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Fertilizer: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Pesticide: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  Equipment: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
}

const mockDealers: Dealer[] = [
  { id: 'd1', name: 'Uganda Seed Co.', phone: '+256 700 123456', location: 'Kampala', active: true, productsCount: 12, createdAt: '2024-01-15' },
  { id: 'd2', name: 'Agro-Inputs Ltd', phone: '+256 772 345678', location: 'Jinja', active: true, productsCount: 8, createdAt: '2024-03-20' },
  { id: 'd3', name: 'Greenfield Supplies', phone: '+254 712 456789', location: 'Nairobi', active: true, productsCount: 15, createdAt: '2024-02-10' },
  { id: 'd4', name: 'Farmers Choice GH', phone: '+233 24 567890', location: 'Kumasi', active: false, productsCount: 5, createdAt: '2024-05-01' },
  { id: 'd5', name: 'Tropical Agro Ltd', phone: '+256 783 234567', location: 'Mbale', active: true, productsCount: 10, createdAt: '2024-04-12' },
]

const mockProducts: InputProduct[] = [
  { id: 'p1', name: 'Coffee Seedlings (Arabica)', category: 'Seeds', dealerName: 'Uganda Seed Co.', dealerId: 'd1', price: 500, unit: 'bag (100pcs)', inStock: true, stockQuantity: 500 },
  { id: 'p2', name: 'NPK Fertilizer 17-17-17', category: 'Fertilizer', dealerName: 'Agro-Inputs Ltd', dealerId: 'd2', price: 85000, unit: '50kg bag', inStock: true, stockQuantity: 200 },
  { id: 'p3', name: 'DAP Fertilizer', category: 'Fertilizer', dealerName: 'Greenfield Supplies', dealerId: 'd3', price: 92000, unit: '50kg bag', inStock: true, stockQuantity: 150 },
  { id: 'p4', name: 'Cypermethrin 10% EC', category: 'Pesticide', dealerName: 'Agro-Inputs Ltd', dealerId: 'd2', price: 35000, unit: '1L bottle', inStock: true, stockQuantity: 300 },
  { id: 'p5', name: 'Pruning Saw (Professional)', category: 'Equipment', dealerName: 'Tropical Agro Ltd', dealerId: 'd5', price: 45000, unit: 'piece', inStock: true, stockQuantity: 45 },
  { id: 'p6', name: 'Tarpaulin 4m x 6m', category: 'Equipment', dealerName: 'Uganda Seed Co.', dealerId: 'd1', price: 120000, unit: 'piece', inStock: false, stockQuantity: 0 },
  { id: 'p7', name: 'UREA 46% Nitrogen', category: 'Fertilizer', dealerName: 'Greenfield Supplies', dealerId: 'd3', price: 78000, unit: '50kg bag', inStock: true, stockQuantity: 100 },
  { id: 'p8', name: 'Cocoa Seedlings (Hybrid)', category: 'Seeds', dealerName: 'Farmers Choice GH', dealerId: 'd4', price: 300, unit: 'seedling', inStock: true, stockQuantity: 2000 },
  { id: 'p9', name: 'Mancozeb Fungicide', category: 'Pesticide', dealerName: 'Agro-Inputs Ltd', dealerId: 'd2', price: 28000, unit: '1kg pack', inStock: true, stockQuantity: 180 },
  { id: 'p10', name: 'Cassava Cuttings (Improved)', category: 'Seeds', dealerName: 'Uganda Seed Co.', dealerId: 'd1', price: 100, unit: 'bundle (50)', inStock: true, stockQuantity: 800 },
]

const mockRequests: InputRequest[] = [
  { id: 'ir1', farmerName: 'James Okello', farmerCode: 'FRM-001', productName: 'NPK Fertilizer 17-17-17', productId: 'p2', quantity: 3, unit: '50kg bag', status: 'CONFIRMED', requestedAt: '2024-11-15', totalCost: 255000 },
  { id: 'ir2', farmerName: 'Grace Achieng', farmerCode: 'FRM-012', productName: 'Coffee Seedlings (Arabica)', productId: 'p1', quantity: 5, unit: 'bag (100pcs)', status: 'PENDING', requestedAt: '2024-11-18', totalCost: 2500 },
  { id: 'ir3', farmerName: 'Sarah Nakamya', farmerCode: 'FRM-023', productName: 'Pruning Saw (Professional)', productId: 'p5', quantity: 1, unit: 'piece', status: 'DELIVERED', requestedAt: '2024-11-10', totalCost: 45000 },
  { id: 'ir4', farmerName: 'Peter Ochieng', farmerCode: 'FRM-031', productName: 'Tarpaulin 4m x 6m', productId: 'p6', quantity: 2, unit: 'piece', status: 'PENDING', requestedAt: '2024-11-20', totalCost: 240000 },
  { id: 'ir5', farmerName: 'Wangari Muthoni', farmerCode: 'FRM-045', productName: 'UREA 46% Nitrogen', productId: 'p7', quantity: 2, unit: '50kg bag', status: 'CANCELLED', requestedAt: '2024-11-08', totalCost: 156000 },
  { id: 'ir6', farmerName: 'Kwame Asante', farmerCode: 'FRM-078', productName: 'Cocoa Seedlings (Hybrid)', productId: 'p8', quantity: 200, unit: 'seedling', status: 'DELIVERED', requestedAt: '2024-11-05', totalCost: 60000 },
  { id: 'ir7', farmerName: 'James Okello', farmerCode: 'FRM-001', productName: 'Cypermethrin 10% EC', productId: 'p4', quantity: 2, unit: '1L bottle', status: 'CONFIRMED', requestedAt: '2024-11-22', totalCost: 70000 },
]

export default function InputAggregationView() {
  const { } = useAppStore()
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [products, setProducts] = useState<InputProduct[]>([])
  const [requests, setRequests] = useState<InputRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddDealer, setShowAddDealer] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddRequest, setShowAddRequest] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/input-aggregation')
      if (res.ok) {
        const data = await res.json()
        setDealers(data.dealers || [])
        setProducts(data.products || [])
        setRequests(data.requests || [])
      } else {
        setDealers(mockDealers)
        setProducts(mockProducts)
        setRequests(mockRequests)
      }
    } catch {
      setDealers(mockDealers)
      setProducts(mockProducts)
      setRequests(mockRequests)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stockQuantity), 0)
  const activeProducts = products.filter(p => p.inStock).length
  const pendingRequests = requests.filter(r => r.status === 'PENDING').length

  const categoryData = Object.entries(
    products.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc }, {} as Record<string, number>)
  ).map(([name, count]) => ({ name, count }))

  const pieData = [
    { name: 'In Stock', value: products.filter(p => p.inStock).length, color: '#10b981' },
    { name: 'Out of Stock', value: products.filter(p => !p.inStock).length, color: '#ef4444' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Input Aggregation</h3>
          <p className="text-sm text-muted-foreground">Manage input dealers, products, and farmer requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddDealer(true)} className="gap-2"><Plus className="w-4 h-4" /> Dealer</Button>
          <Button variant="outline" onClick={() => setShowAddProduct(true)} className="gap-2"><Plus className="w-4 h-4" /> Product</Button>
          <Button onClick={() => setShowAddRequest(true)} className="gap-2"><Plus className="w-4 h-4" /> Request</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><Store className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Total Dealers</p><p className="text-xl font-bold">{dealers.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center"><Package className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">Active Products</p><p className="text-xl font-bold">{activeProducts}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-muted-foreground">Pending Requests</p><p className="text-xl font-bold">{pendingRequests}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Total Stock Value</p><p className="text-xl font-bold">UGX {(totalValue / 1000000).toFixed(1)}M</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="dealers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dealers">Dealers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        {/* Tab 1: Dealers */}
        <TabsContent value="dealers" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search dealers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded" />)}</div>
              ) : dealers.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.location.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Store className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="font-medium">No dealers found</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dealer</TableHead>
                      <TableHead className="hidden sm:table-cell">Phone</TableHead>
                      <TableHead className="hidden md:table-cell">Location</TableHead>
                      <TableHead className="hidden lg:table-cell">Products</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dealers.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.location.toLowerCase().includes(search.toLowerCase())).map(d => (
                      <TableRow key={d.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><Store className="w-4 h-4 text-emerald-600" /></div>
                            <p className="font-medium text-sm">{d.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{d.phone}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{d.location}</TableCell>
                        <TableCell className="hidden lg:table-cell"><Badge variant="outline" className="text-xs">{d.productsCount} products</Badge></TableCell>
                        <TableCell>
                          <Badge className={d.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[10px]'}>
                            {d.active ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Products */}
        <TabsContent value="products" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded" />)}</div>
          ) : (
            <>
              {['Seeds', 'Fertilizer', 'Pesticide', 'Equipment'].map(category => {
                const categoryProducts = products.filter(p => p.category === category && (!search || p.name.toLowerCase().includes(search.toLowerCase())))
                if (categoryProducts.length === 0) return null
                return (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', categoryColors[category])}>
                        {categoryIcons[category]}
                      </div>
                      <h4 className="font-medium text-sm">{category}</h4>
                      <Badge variant="outline" className="text-[10px]">{categoryProducts.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoryProducts.map(product => (
                        <Card key={product.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{product.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{product.dealerName}</p>
                              </div>
                              <Badge className={product.inStock ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-[10px]'}>
                                {product.inStock ? 'In Stock' : 'Out of Stock'}
                              </Badge>
                            </div>
                            <Separator className="my-3" />
                            <div className="flex items-end justify-between">
                              <div>
                                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">UGX {product.price.toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground">per {product.unit}</p>
                              </div>
                              {product.inStock && (
                                <p className="text-xs text-muted-foreground">{product.stockQuantity} in stock</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Products by Category</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={categoryData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Stock Availability</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Tab 3: Requests */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search requests..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value="" onValueChange={v => setSearch(v === '_all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Filter Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
              ) : requests.filter(r => !search || r.farmerName.toLowerCase().includes(search.toLowerCase()) || r.productName.toLowerCase().includes(search.toLowerCase()) || r.status.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="font-medium">No requests found</p></div>
              ) : (
                <div className="max-h-[450px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer</TableHead>
                        <TableHead className="hidden sm:table-cell">Product</TableHead>
                        <TableHead className="hidden md:table-cell">Qty</TableHead>
                        <TableHead className="hidden lg:table-cell">Total Cost</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.filter(r => !search || r.farmerName.toLowerCase().includes(search.toLowerCase()) || r.productName.toLowerCase().includes(search.toLowerCase()) || r.status.toLowerCase().includes(search.toLowerCase())).map(r => (
                        <TableRow key={r.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{r.farmerName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{r.farmerCode}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{r.productName}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{r.quantity} {r.unit}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm font-medium">UGX {r.totalCost.toLocaleString()}</TableCell>
                          <TableCell><Badge className={cn('text-[10px]', requestStatusColor[r.status] || '')}>{r.status}</Badge></TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{r.requestedAt}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Dealer Dialog */}
      <Dialog open={showAddDealer} onOpenChange={setShowAddDealer}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Dealer</DialogTitle></DialogHeader>
          <DealerForm onClose={() => { setShowAddDealer(false); fetchData() }} />
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
          <ProductForm dealers={dealers} onClose={() => { setShowAddProduct(false); fetchData() }} />
        </DialogContent>
      </Dialog>

      {/* Add Request Dialog */}
      <Dialog open={showAddRequest} onOpenChange={setShowAddRequest}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Input Request</DialogTitle></DialogHeader>
          <RequestForm products={products} onClose={() => { setShowAddRequest(false); fetchData() }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DealerForm({ onClose }: { onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', location: '', active: true })
  const update = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone) { toast.error('Name and phone are required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/input-aggregation/dealers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      toast.success('Dealer added successfully')
      onClose()
    } catch { toast.error('Failed to add dealer') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => update('name', e.target.value)} required /></div>
      <div className="space-y-1.5"><Label>Phone *</Label><Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+256..." required /></div>
      <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={e => update('location', e.target.value)} /></div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Add Dealer</Button>
      </DialogFooter>
    </form>
  )
}

function ProductForm({ dealers, onClose }: { dealers: Dealer[]; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'Seeds' as string, dealerId: '', price: '', unit: '', stockQuantity: '' })
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.dealerId) { toast.error('Name and dealer are required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/input-aggregation/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, price: Number(form.price), stockQuantity: Number(form.stockQuantity) }) })
      if (!res.ok) throw new Error()
      toast.success('Product added successfully')
      onClose()
    } catch { toast.error('Failed to add product') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5"><Label>Product Name *</Label><Input value={form.name} onChange={e => update('name', e.target.value)} required /></div>
      <div className="space-y-1.5"><Label>Category</Label>
        <Select value={form.category} onValueChange={v => update('category', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Seeds">Seeds / Seedlings</SelectItem>
            <SelectItem value="Fertilizer">Fertilizer</SelectItem>
            <SelectItem value="Pesticide">Pesticide</SelectItem>
            <SelectItem value="Equipment">Equipment</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Dealer *</Label>
        <Select value={form.dealerId} onValueChange={v => update('dealerId', v)}>
          <SelectTrigger><SelectValue placeholder="Select dealer" /></SelectTrigger>
          <SelectContent>{dealers.filter(d => d.active).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Price (UGX)</Label><Input type="number" value={form.price} onChange={e => update('price', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Unit</Label><Input value={form.unit} onChange={e => update('unit', e.target.value)} placeholder="e.g., 50kg bag" /></div>
      </div>
      <div className="space-y-1.5"><Label>Stock Quantity</Label><Input type="number" value={form.stockQuantity} onChange={e => update('stockQuantity', e.target.value)} /></div>
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Add Product</Button>
      </DialogFooter>
    </form>
  )
}

function RequestForm({ products, onClose }: { products: InputProduct[]; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ productId: '', quantity: '', farmerName: '', farmerCode: '' })
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const selectedProduct = products.find(p => p.id === form.productId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.productId || !form.farmerName || !form.quantity) { toast.error('All fields are required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/input-aggregation/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, quantity: Number(form.quantity), totalCost: (selectedProduct?.price || 0) * Number(form.quantity) }) })
      if (!res.ok) throw new Error()
      toast.success('Request submitted successfully')
      onClose()
    } catch { toast.error('Failed to submit request') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5"><Label>Farmer Name *</Label><Input value={form.farmerName} onChange={e => update('farmerName', e.target.value)} required /></div>
      <div className="space-y-1.5"><Label>Farmer Code</Label><Input value={form.farmerCode} onChange={e => update('farmerCode', e.target.value)} placeholder="FRM-XXX" /></div>
      <div className="space-y-1.5"><Label>Product *</Label>
        <Select value={form.productId} onValueChange={v => update('productId', v)}>
          <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
          <SelectContent>{products.filter(p => p.inStock).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => update('quantity', e.target.value)} required /></div>
      {selectedProduct && form.quantity && (
        <p className="text-sm text-muted-foreground">Estimated cost: <span className="font-bold text-emerald-700">UGX {(selectedProduct.price * Number(form.quantity)).toLocaleString()}</span></p>
      )}
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={saving} className="gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Submit Request</Button>
      </DialogFooter>
    </form>
  )
}