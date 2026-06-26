/**
 * Agrobase V3 — Bulk Operations Types
 */

export type BulkOperationType = 'IMPORT_FARMERS' | 'IMPORT_VSLA' | 'IMPORT_PURCHASES' | 'EXPORT_DATA' | 'MASS_UPDATE' | 'RECALCULATE'
export type BulkOperationStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL' | 'CANCELLED'
export type SupportedFileFormat = 'csv' | 'xlsx' | 'xls'

export interface BulkOperationInput {
  type: BulkOperationType
  fileName: string
  fileSize?: number
  totalRows?: number
  configFile?: string
}

export interface BulkOperationResult {
  operationId: string
  status: BulkOperationStatus
  processedRows: number
  successRows: number
  failedRows: number
  errorSummary?: string
  resultFileUrl?: string
}