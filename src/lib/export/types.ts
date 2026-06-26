/**
 * Agrobase V3 — Export Engine Types
 *
 * Full type definitions for async export jobs with S3/MinIO storage.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type ExportFormat = 'CSV' | 'JSON' | 'XLSX'

export type ExportType =
  | 'farmers'
  | 'purchases'
  | 'inventory'
  | 'contracts'
  | 'shipments'
  | 'partners'
  | 'vsla_savings'
  | 'vsla_loans'
  | 'payments'
  | 'accounting'
  | 'traceability'

export type ExportStatus =
  | 'PENDING'
  | 'GENERATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'

// ---------------------------------------------------------------------------
// Request / Response
// ---------------------------------------------------------------------------

export interface ExportFilters {
  dateFrom?: string
  dateTo?: string
  status?: string | string[]
  commodity?: string
  regionId?: string
  [key: string]: unknown
}

export interface CreateExportRequest {
  exportType: ExportType
  format?: ExportFormat
  filters?: ExportFilters
  columns?: string[]
}

export interface ExportJobRow {
  id: string
  tenantId: string
  exportType: string
  format: string
  status: ExportStatus
  requestedBy: string | null
  filters: string | null
  columns: string | null
  fileKey: string | null
  fileName: string | null
  fileSize: number | null
  rowCount: number | null
  fileChecksum: string | null
  downloadUrl: string | null
  downloadUrlExpiry: Date | string | null
  startedAt: Date | null
  completedAt: Date | null
  failedAt: Date | null
  failureReason: string | null
  expiresAt: Date | string | null
  attemptCount: number
  maxAttempts: number
  metadata: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ExportListResult {
  jobs: ExportJobRow[]
  total: number
  page: number
  pageSize: number
}

export interface ExportDownloadResult {
  url: string
  fileName: string
  fileSize: number
  expiresAt: string
}

export interface ExportTypeInfo {
  type: ExportType
  label: string
  description: string
  defaultColumns: string[]
  availableColumns: string[]
}

// ---------------------------------------------------------------------------
// Internal engine types
// ---------------------------------------------------------------------------

export interface ExportQueryConfig {
  type: ExportType
  label: string
  description: string
  availableColumns: string[]
  defaultColumns: string[]
  /** Build the Prisma query given a tenant filter and optional user-supplied filters */
  buildQuery: (tenantFilter: Record<string, unknown>, filters: ExportFilters) => Promise<{ data: Record<string, unknown>[]; defaultColumns: string[] }>
}

export const EXPORT_STATUS_TRANSITIONS: Record<ExportStatus, ExportStatus[]> = {
  PENDING:     ['GENERATING', 'CANCELLED'],
  GENERATING:  ['COMPLETED', 'FAILED'],
  COMPLETED:   ['EXPIRED'],
  FAILED:      ['PENDING', 'CANCELLED'],  // PENDING allows retry
  EXPIRED:     [],
  CANCELLED:   [],
}

/** Max rows for a single export — configurable via env */
export const MAX_ROW_LIMIT = parseInt(process.env.EXPORT_MAX_ROW_LIMIT || '50000', 10)

/** Max file size in bytes — configurable via env */
export const MAX_FILE_SIZE_BYTES = (parseInt(process.env.EXPORT_MAX_FILE_SIZE_MB || '50', 10)) * 1024 * 1024

/** Default link TTL in seconds (7 days) */
export const DEFAULT_LINK_TTL_SECONDS = (parseInt(process.env.EXPORT_LINK_TTL_DAYS || '7', 10)) * 86400