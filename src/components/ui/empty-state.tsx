/**
 * Reusable Empty State component
 * Shows an icon, message, and optional CTA button when a list/view has no data.
 */
import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12 text-muted-foreground', className)}>
      <Icon className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4 gap-2">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

/**
 * Reusable Loading Skeleton for table-based views
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-6 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
      ))}
    </div>
  )
}

/**
 * Reusable Loading Skeleton for card-grid views
 */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-40 bg-muted/50 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

/**
 * Export data to CSV file (client-side)
 */
export function exportToCSV(data: Record<string, any>[], filename: string, columns?: string[]) {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Determine columns: use provided list, or derive from first row
  const cols = columns || Object.keys(data[0])

  // Build CSV string
  const header = cols.map(c => `"${c}"`).join(',')
  const rows = data.map(row =>
    cols.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return '""'
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  )

  const csv = [header, ...rows].join('\n')

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
