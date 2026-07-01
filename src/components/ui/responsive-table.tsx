'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * Mobile-responsive table wrapper.
 * On desktop: renders a normal table.
 * On mobile (< 768px): renders each row as a card with label-value pairs.
 * 
 * Usage:
 * <ResponsiveTable
 *   headers={['Name', 'Phone', 'Status']}
 *   rows={[
 *     { Name: 'John', Phone: '+256...', Status: 'Active' },
 *   ]}
 *   onRowClick={(row, index) => ...}
 * />
 */

interface ResponsiveTableProps {
  headers: string[]
  rows: Record<string, React.ReactNode>[]
  onRowClick?: (row: Record<string, React.ReactNode>, index: number) => void
  emptyMessage?: string
}

export function ResponsiveTable({ headers, rows, onRowClick, emptyMessage = 'No data' }: ResponsiveTableProps) {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">{emptyMessage}</div>
    )
  }

  return (
    <>
      {/* Desktop table (md and up) */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map(h => <TableHead key={h}>{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                key={i}
                className={cn(onRowClick && 'cursor-pointer hover:bg-muted/50')}
                onClick={() => onRowClick?.(row, i)}
              >
                {headers.map(h => (
                  <TableCell key={h}>{row[h]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards (below md) */}
      <div className="md:hidden space-y-2">
        {rows.map((row, i) => (
          <Card
            key={i}
            className={cn(onRowClick && 'cursor-pointer hover:shadow-md transition-shadow')}
            onClick={() => onRowClick?.(row, i)}
          >
            <CardContent className="p-3">
              {headers.map(h => (
                <div key={h} className="flex items-center justify-between py-1 border-b last:border-0">
                  <span className="text-xs text-muted-foreground">{h}</span>
                  <span className="text-sm font-medium text-right">{row[h]}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
