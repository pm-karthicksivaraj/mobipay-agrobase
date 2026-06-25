/**
 * Agrobase V3 — Data Export Types
 */

export type ExportFormat = 'CSV' | 'JSON' | 'XLSX'
export type ExportStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED'

export interface ExportRequest {
  type: string
  format: ExportFormat
  filters?: Record<string, unknown>
  columns?: string[]
}

export interface ExportResult {
  url: string
  fileName: string
  rowCount: number
  generatedAt: string
}