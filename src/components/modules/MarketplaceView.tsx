'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { safeFetch, extractArray } from '@/lib/safe-fetch'
import {
  Store, Search, Plus, Filter, X, Eye, ShoppingCart, Truck,
  Package, ArrowRight, Tag, MapPin, Phone, Loader2, Pencil, Trash2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'

const statusColor: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  MATCHED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  SOLD: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  DELIVERED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function MarketplaceView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [products, setProducts] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [dealers, setDealers] = useState<any[]>([])
  const [inputRequests, setInputRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(activeSubTab || 'products')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    sellerName: '', commodity: '', variety: '', quantity: '',
    unit: '', unitPrice: '', location: '', description: '',
  })

  const loadData = useCallback(async () => {
    // safeFetch returns null on any per-request error, so one failing endpoint
    // no longer breaks the whole view. extractArray(null, ...) yields [].
    const [pData, mData, dData, iData] = await Promise.all([
      safeFetch('/api/market/products'),
      safeFetch('/api/market/matches'),
      safeFetch('/api/inputs/dealers'),
      safeFetch('/api/inputs/requests'),
    ])
    setProducts(extractArray(pData, 'products', 'data'))
    setMatches(extractArray(mData, 'matches', 'data'))
    setDealers(extractArray(dData, 'dealers', 'data'))
    setInputRequests(extractArray(iData, 'requests', 'data'))
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleTabChange = (t: string) => { setActiveTab(t); setActiveSubTab(t) }

  const updateField = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const openAdd = () => {
    setEditingProduct(null)
    setForm({ sellerName: '', commodity: '', variety: '', quantity: '', unit: '', unitPrice: '', location: '', description: '' })
    setDialogOpen(true)
  }

  const openEdit = (p: any) => {
    setEditingProduct(p)
    setForm({
      sellerName: p.sellerName || '',
      commodity: p.commodity || '',
      variety: p.variety || '',
      quantity: p.quantity || '',
      unit: p.unit || '',
      unitPrice: p.unitPrice != null ? String(p.unitPrice) : '',
      location: p.location || '',
      description: p.description || '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.sellerName || !form.commodity) {
      toast.error('Product name and commodity are required')
      return
    }
    setSubmitting(true)
    try {
      // Schema-sanitised payload — only MarketProduct columns are transmitted.
      // `unit` and `description` are kept in the form for UX but not persisted
      // (the Prisma model has no such fields).
      const payload: Record<string, unknown> = {
        sellerName: form.sellerName,
        commodity: form.commodity,
        variety: form.variety || null,
        quantity: form.quantity,
        unitPrice: form.unitPrice ? Number(form.unitPrice) : null,
        location: form.location || null,
      }
      const isEdit = !!editingProduct
      const url = isEdit ? `/api/market/products/${editingProduct.id}` : '/api/market/products'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success(isEdit ? 'Product updated' : 'Product listed')
        setDialogOpen(false)
        setEditingProduct(null)
        loadData()
      } else {
        toast.error('Failed to save product')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product listing?')) return
    try {
      const res = await fetch(`/api/market/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Product deleted')
        loadData()
      } else {
        toast.error('Failed to delete product')
      }
    } catch {
      toast.error('Network error')
    }
  }

  if (loading) return <MarketplaceSkeleton />

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"><Store className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Listings</p><p className="text-xl font-bold">{products.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center"><ArrowRight className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Matches</p><p className="text-xl font-bold">{matches.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center"><Package className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Input Dealers</p><p className="text-xl font-bold">{dealers.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-purple-600" /></div>
          <div><p className="text-xs text-muted-foreground">Input Requests</p><p className="text-xl font-bold">{inputRequests.length}</p></div>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products">Market Products</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="inputs">Input Aggregation</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button onClick={openAdd} className="gap-2">
              <Plus className="w-4 h-4" /> List Product
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.length === 0 ? (
              <Card className="md:col-span-2 xl:col-span-3">
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Store className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No product listings yet — click “List Product” to add one.
                </CardContent>
              </Card>
            ) : products.map((p: any) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-sm">{p.commodity}</h4>
                      {p.variety && <p className="text-xs text-muted-foreground">{p.variety}</p>}
                    </div>
                    <Badge className={cn('text-[10px]', statusColor[p.status] || '')}>{p.status}</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Seller</span><span className="font-medium">{p.sellerName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Quantity</span><span>{p.quantity}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-semibold text-primary">
                      {p.unitPrice ? `UGX ${p.unitPrice.toLocaleString()}` : 'Negotiable'}
                    </span></div>
                    {p.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{p.location}</div>
                    )}
                  </div>
                  <div className="flex justify-end gap-1 pt-3 mt-3 border-t">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)} aria-label="Edit product">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => handleDelete(p.id)}
                      aria-label="Delete product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matches" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No market matches yet</TableCell></TableRow>
                  ) : (
                    matches.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium text-sm">{m.buyerName}</TableCell>
                        <TableCell className="text-sm">{m.product?.commodity || '—'}</TableCell>
                        <TableCell className="text-sm">{m.quantity}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{m.totalValue ? `UGX ${m.totalValue.toLocaleString()}` : '—'}</TableCell>
                        <TableCell><Badge className={cn('text-[10px]', statusColor[m.status] || '')}>{m.status}</Badge></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inputs" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Dealers */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Input Dealers</CardTitle></CardHeader>
              <CardContent>
                {dealers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No dealers registered</p>
                ) : (
                  <div className="space-y-3">
                    {dealers.map((d: any) => (
                      <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="w-4 h-4 text-primary" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{d.name}</p>
                          <p className="text-xs text-muted-foreground">{d.location || 'No location'} &middot; {d._count?.products || 0} products</p>
                        </div>
                        <Badge className={cn('text-[10px]', d.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600')}>{d.isActive ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Input Requests */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Input Requests</CardTitle></CardHeader>
              <CardContent>
                {inputRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No input requests</p>
                ) : (
                  <div className="space-y-3">
                    {inputRequests.map((r: any) => (
                      <div key={r.id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{r.product}</p>
                            <p className="text-xs text-muted-foreground">{r.farmerName} &middot; {r.quantity}</p>
                          </div>
                          <Badge className={cn('text-[10px]', statusColor[r.status] || '')}>{r.status}</Badge>
                        </div>
                        {r.totalPrice && <p className="text-sm font-medium mt-1">UGX {r.totalPrice.toLocaleString()}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* List / Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingProduct(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'List Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name (Seller)</Label>
              <Input
                value={form.sellerName}
                onChange={e => updateField('sellerName', e.target.value)}
                placeholder="e.g. Jane’s Maize Stall"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Commodity</Label>
                <Input
                  value={form.commodity}
                  onChange={e => updateField('commodity', e.target.value)}
                  placeholder="Maize, Coffee..."
                />
              </div>
              <div className="space-y-2">
                <Label>Variety</Label>
                <Input
                  value={form.variety}
                  onChange={e => updateField('variety', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  value={form.quantity}
                  onChange={e => updateField('quantity', e.target.value)}
                  placeholder="e.g. 100"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={form.unit}
                  onChange={e => updateField('unit', e.target.value)}
                  placeholder="kg, bags..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit Price (UGX)</Label>
                <Input
                  type="number"
                  value={form.unitPrice}
                  onChange={e => updateField('unitPrice', e.target.value)}
                  placeholder="e.g. 1500"
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={e => updateField('location', e.target.value)}
                  placeholder="District / town"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="Optional notes about quality, harvest date, etc."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editingProduct ? 'Update Product' : 'List Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MarketplaceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full rounded" /></CardContent></Card>)}
      </div>
      <Skeleton className="h-10 w-full rounded" />
      <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}</div>
    </div>
  )
}