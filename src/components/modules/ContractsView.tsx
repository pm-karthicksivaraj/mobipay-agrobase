'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  FileText, Plus, Eye, X, Loader2, Search, ChevronLeft, ChevronRight,
  CheckCircle, Clock, XCircle, AlertCircle, Building2
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
import { toast } from 'sonner'

interface Contract {
  id: string
  contractCode: string
  type: string
  status: string
  commodity: string
  quantity: number
  unitPrice: number
  currency: string
  totalValue: number
  buyerName: string | null
  sellerName: string | null
  startDate: string
  endDate: string
  signedAt: string | null
  items: ContractItem[]
}

interface ContractItem {
  id: string
  commodity: string
  variety: string | null
  grade: string | null
  quantity: number
  unitPrice: number
  delivered: number
}

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function ContractsView() {
  const { activeSubTab, setActiveSubTab } = useAppStore()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<Contract | null>(null)

  const fetchContracts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/contracts?${params}`)
      const json = await res.json()
      setContracts(json.data || [])
      setTotal(json.pagination?.total || 0)
    } catch (e) {
      console.error(e)
    }
  }, [page, search])

  useEffect(() => {
    fetchContracts().finally(() => setLoading(false))
  }, [fetchContracts])

  const totalValue = contracts.reduce((s, c) => s + (c.totalValue || 0), 0)
  const activeCount = contracts.filter((c) => c.status === 'ACTIVE').length

  if (loading) return <ContractsSkeleton />

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Contracts</p>
              <p className="text-xl font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-lg font-bold">UGX {totalValue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Commodities</p>
              <p className="text-xl font-bold">{new Set(contracts.map((c) => c.commodity)).size}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Contracts</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search contracts..."
                  className="pl-9 h-9 text-sm"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No contracts found</TableCell></TableRow>
              ) : (
                contracts.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => { setSelected(c); setDetailOpen(true) }}>
                    <TableCell className="font-mono text-xs font-medium">{c.contractCode}</TableCell>
                    <TableCell className="text-sm">{c.commodity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.buyerName || '—'}</TableCell>
                    <TableCell className="text-right text-sm font-medium">UGX {(c.totalValue || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge className={cn('text-[10px]', statusColor[c.status] || '')}>{c.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}</TableCell>
                    <TableCell><Eye className="w-4 h-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">{total} contracts total</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium">{page}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={contracts.length < 20} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {selected.contractCode}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Commodity</p><p className="font-medium">{selected.commodity}</p></div>
                  <div><p className="text-muted-foreground">Status</p><Badge className={cn('text-[10px]', statusColor[selected.status] || '')}>{selected.status}</Badge></div>
                  <div><p className="text-muted-foreground">Buyer</p><p className="font-medium">{selected.buyerName || '—'}</p></div>
                  <div><p className="text-muted-foreground">Seller</p><p className="font-medium">{selected.sellerName || '—'}</p></div>
                  <div><p className="text-muted-foreground">Quantity</p><p className="font-medium">{selected.quantity}</p></div>
                  <div><p className="text-muted-foreground">Total Value</p><p className="font-medium">UGX {selected.totalValue?.toLocaleString()}</p></div>
                  <div><p className="text-muted-foreground">Start Date</p><p className="font-medium">{selected.startDate ? new Date(selected.startDate).toLocaleDateString() : '—'}</p></div>
                  <div><p className="text-muted-foreground">End Date</p><p className="font-medium">{selected.endDate ? new Date(selected.endDate).toLocaleDateString() : '—'}</p></div>
                </div>

                {selected.items?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Contract Items</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Commodity</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Delivered</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">{item.commodity} {item.variety && `(${item.variety})`}</TableCell>
                            <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right text-sm">UGX {item.unitPrice?.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-sm">{item.delivered}/{item.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ContractsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full rounded" /></CardContent></Card>
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded" />
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  )
}