'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Store, Search, Plus, Filter, X, Eye, ShoppingCart, Truck,
  Package, ArrowRight, Tag, MapPin, Phone, Loader2
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

  const loadData = useCallback(async () => {
    try {
      const [pRes, mRes, dRes, iRes] = await Promise.all([
        fetch('/api/market/products').then(r => r.json()),
        fetch('/api/market/matches').then(r => r.json()),
        fetch('/api/inputs/dealers').then(r => r.json()),
        fetch('/api/inputs/requests').then(r => r.json()),
      ])
      setProducts(pRes.products || pRes || [])
      setMatches(mRes.matches || mRes || [])
      setDealers(dRes.dealers || dRes || [])
      setInputRequests(iRes.requests || iRes || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleTabChange = (t: string) => { setActiveTab(t); setActiveSubTab(t) }

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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((p: any) => (
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