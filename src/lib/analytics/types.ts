/**
 * Agrobase V3 — Analytics Types
 */

export interface KPIConfig {
  id: string
  name: string
  description: string
  module: string
  metric: string
  aggregation: 'count' | 'sum' | 'avg'
  field?: string
  filters?: Record<string, unknown>
}

export interface DashboardConfig {
  widgets: Array<{
    name: string
    type: string
    dataSource: string
    config: string
    position: number
    size: string
  }>
}

export interface TrendDataPoint {
  period: string
  value: number
  label?: string
}

export interface TrendRequest {
  metric: string
  months?: number
  groupBy?: 'day' | 'week' | 'month'
}