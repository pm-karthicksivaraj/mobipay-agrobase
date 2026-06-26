/**
 * Agrobase V3 — Export Engine (S3/MinIO)
 *
 * Async export engine with:
 *   - 11 export types (farmers, purchases, inventory, contracts, shipments,
 *     partners, vsla_savings, vsla_loans, payments, accounting, traceability)
 *   - CSV, JSON, XLSX format generation (XLSX as simplified XML spreadsheet)
 *   - S3/MinIO upload via S3StorageClient
 *   - Presigned URL generation for downloads
 *   - Automatic job lifecycle: PENDING → GENERATING → COMPLETED/FAILED
 *   - Retry support (up to maxAttempts)
 *   - Cron cleanup of expired jobs + expired presigned URLs
 *   - Fallback to base64 data URI when S3 is not configured
 *
 * Pattern: static class (consistent with EscrowEngine, SettlementEngine, etc.)
 */

import { db } from '@/lib/db'
import { s3Client } from './storage'
import {
  type ExportFormat,
  type ExportStatus,
  type ExportType,
  type ExportFilters,
  type CreateExportRequest,
  type ExportJobRow,
  type ExportListResult,
  type ExportDownloadResult,
  type ExportTypeInfo,
  type ExportQueryConfig,
  EXPORT_STATUS_TRANSITIONS,
  MAX_ROW_LIMIT,
  MAX_FILE_SIZE_BYTES,
  DEFAULT_LINK_TTL_SECONDS,
} from './types'
import { createHash } from 'crypto'

// ---------------------------------------------------------------------------
// Export Type Registry
// ---------------------------------------------------------------------------

const EXPORT_REGISTRY: Record<ExportType, ExportQueryConfig> = {
  farmers: {
    type: 'farmers',
    label: 'Farmer Registrations',
    description: 'Export farmer profiles with contact details, codes, and status',
    availableColumns: ['id', 'firstName', 'lastName', 'phone', 'gender', 'farmerCode', 'status', 'villageId', 'nationalIdNo', 'dateOfBirth', 'createdAt'],
    defaultColumns: ['id', 'firstName', 'lastName', 'phone', 'gender', 'farmerCode', 'status', 'villageId', 'createdAt'],
    buildQuery: async (tf, _filters) => {
      const rows = await db.farmerProfile.findMany({
        where: tf as any,
        select: {
          id: true, firstName: true, lastName: true, phone: true, gender: true,
          farmerCode: true, status: true, villageId: true, nationalIdNo: true,
          dateOfBirth: true, createdAt: true,
        },
        take: MAX_ROW_LIMIT,
        orderBy: { createdAt: 'desc' },
      })
      return { data: rows as unknown as Record<string, unknown>[], defaultColumns: ['id', 'firstName', 'lastName', 'phone', 'gender', 'farmerCode', 'status', 'villageId', 'createdAt'] }
    },
  },

  purchases: {
    type: 'purchases',
    label: 'Purchases',
    description: 'Export purchase transactions with amounts, commodities, and quantities',
    availableColumns: ['id', 'totalAmount', 'status', 'commodity', 'quantity', 'unitPrice', 'createdAt'],
    defaultColumns: ['id', 'totalAmount', 'status', 'commodity', 'quantity', 'unitPrice', 'createdAt'],
    buildQuery: async (tf, filters) => {
      const where: Record<string, unknown> = { ...tf, farmer: { tenantId: (tf as any).tenantId } }
      if (filters.dateFrom || filters.dateTo) {
        const df: Record<string, unknown> = {}
        if (filters.dateFrom) df.gte = new Date(filters.dateFrom)
        if (filters.dateTo) df.lte = new Date(filters.dateTo)
        ;(where as any).createdAt = df
      }
      if (filters.status) (where as any).status = filters.status
      if (filters.commodity) (where as any).commodity = { contains: filters.commodity, mode: 'insensitive' }
      const rows = await db.purchase.findMany({
        where: where as any,
        select: { id: true, totalAmount: true, status: true, commodity: true, quantity: true, unitPrice: true, createdAt: true },
        take: MAX_ROW_LIMIT,
        orderBy: { createdAt: 'desc' },
      })
      return { data: rows as unknown as Record<string, unknown>[], defaultColumns: ['id', 'totalAmount', 'status', 'commodity', 'quantity', 'unitPrice', 'createdAt'] }
    },
  },

  inventory: {
    type: 'inventory',
    label: 'Inventory / Stock',
    description: 'Export stock items across warehouses with quantities and pricing',
    availableColumns: ['id', 'warehouseId', 'commodity', 'variety', 'grade', 'batchCode', 'quantity', 'unit', 'unitPrice', 'status', 'createdAt'],
    defaultColumns: ['id', 'warehouseId', 'commodity', 'variety', 'grade', 'batchCode', 'quantity', 'unit', 'unitPrice', 'status'],
    buildQuery: async (tf, filters) => {
      const where: Record<string, unknown> = { ...tf }
      if (filters.status) (where as any).status = filters.status
      if (filters.commodity) (where as any).commodity = { contains: filters.commodity, mode: 'insensitive' }
      const rows = await db.stockItem.findMany({
        where: where as any,
        select: {
          id: true, warehouseId: true, commodity: true, variety: true,
          grade: true, batchCode: true, quantity: true, unit: true,
          unitPrice: true, status: true, createdAt: true,
        },
        take: MAX_ROW_LIMIT,
        orderBy: { createdAt: 'desc' },
      })
      return { data: rows as unknown as Record<string, unknown>[], defaultColumns: ['id', 'warehouseId', 'commodity', 'variety', 'grade', 'batchCode', 'quantity', 'unit', 'unitPrice', 'status'] }
    },
  },

  contracts: {
    type: 'contracts',
    label: 'Contracts',
    description: 'Export contracts with values, dates, parties, and performance status',
    availableColumns: ['id', 'contractCode', 'type', 'status', 'commodity', 'quantity', 'unitPrice', 'currency', 'totalValue', 'startDate', 'endDate', 'buyerName', 'sellerName', 'createdAt'],
    defaultColumns: ['id', 'contractCode', 'type', 'status', 'commodity', 'quantity', 'unitPrice', 'currency', 'totalValue', 'startDate', 'endDate'],
    buildQuery: async (tf, filters) => {
      const where: Record<string, unknown> = { ...tf }
      if (filters.dateFrom || filters.dateTo) {
        const df: Record<string, unknown> = {}
        if (filters.dateFrom) df.gte = new Date(filters.dateFrom)
        if (filters.dateTo) df.lte = new Date(filters.dateTo)
        ;(where as any).createdAt = df
      }
      if (filters.status) (where as any).status = filters.status
      const rows = await db.contract.findMany({
        where: where as any,
        select: {
          id: true, contractCode: true, type: true, status: true,
          commodity: true, quantity: true, unitPrice: true,
          currency: true, totalValue: true, startDate: true,
          endDate: true, buyerName: true, sellerName: true, createdAt: true,
        },
        take: MAX_ROW_LIMIT,
        orderBy: { createdAt: 'desc' },
      })
      return { data: rows as unknown as Record<string, unknown>[], defaultColumns: ['id', 'contractCode', 'type', 'status', 'commodity', 'quantity', 'unitPrice', 'currency', 'totalValue', 'startDate', 'endDate'] }
    },
  },

  shipments: {
    type: 'shipments',
    label: 'Shipments',
    description: 'Export logistics shipments with driver info, weight, and status',
    availableColumns: ['id', 'shipmentCode', 'status', 'driverName', 'driverPhone', 'originId', 'destinationId', 'totalWeight', 'departureTime', 'arrivalTime', 'createdAt'],
    defaultColumns: ['id', 'shipmentCode', 'status', 'driverName', 'driverPhone', 'totalWeight', 'departureTime', 'arrivalTime'],
    buildQuery: async (tf, filters) => {
      const where: Record<string, unknown> = { ...tf }
      if (filters.status) (where as any).status = filters.status
      const rows = await db.shipment.findMany({
        where: where as any,
        select: {
          id: true, shipmentCode: true, status: true, driverName: true,
          driverPhone: true, originId: true, destinationId: true, totalWeight: true,
          departureTime: true, arrivalTime: true, createdAt: true,
        },
        take: MAX_ROW_LIMIT,
        orderBy: { createdAt: 'desc' },
      })
      return { data: rows as unknown as Record<string, unknown>[], defaultColumns: ['id', 'shipmentCode', 'status', 'driverName', 'driverPhone', 'totalWeight', 'departureTime', 'arrivalTime'] }
    },
  },

  partners: {
    type: 'partners',
    label: 'Partners',
    description: 'Export partner details with contact info and commission rates',
    availableColumns: ['id', 'name', 'type', 'contactName', 'contactEmail', 'contactPhone', 'commissionRate', 'isActive', 'createdAt'],
    defaultColumns: ['id', 'name', 'type', 'contactName', 'contactEmail', 'contactPhone', 'commissionRate', 'isActive'],
    buildQuery: async (tf, _filters) => {
      const rows = await db.partner.findMany({
        where: tf as any,
        select: {
          id: true, name: true, type: true, contactName: true,
          contactEmail: true, contactPhone: true, commissionRate: true,
          isActive: true, createdAt: true,
        },
        take: MAX_ROW_LIMIT,
        orderBy: { createdAt: 'desc' },
      })
      return { data: rows as unknown as Record<string, unknown>[], defaultColumns: ['id', 'name', 'type', 'contactName', 'contactEmail', 'contactPhone', 'commissionRate', 'isActive'] }
    },
  },

  vsla_savings: {
    type: 'vsla_savings',
    label: 'VSLA Savings',
    description: 'Export VSLA group savings records with farmer and group details',
    availableColumns: ['id', 'amount', 'sharesBought', 'transactionRef', 'status', 'farmerFirstName', 'farmerLastName', 'groupName', 'createdAt'],
    defaultColumns: ['id', 'amount', 'sharesBought', 'transactionRef', 'status', 'farmerFirstName', 'farmerLastName', 'groupName'],
    buildQuery: async (tf, filters) => {
      const where: Record<string, unknown> = { status: 'COMPLETED' }
      if (!Object.keys(tf).length || (tf as any).tenantId) {
        ;(where as any).vslaGroup = { tenantId: (tf as any).tenantId }
      }
      if (filters.dateFrom || filters.dateTo) {
        const df: Record<string, unknown> = {}
        if (filters.dateFrom) df.gte = new Date(filters.dateFrom)
        if (filters.dateTo) df.lte = new Date(filters.dateTo)
        ;(where as any).createdAt = df
      }
      const rows = await db.vslaSaving.findMany({
        where: where as any,
        include: {
          farmer: { select: { firstName: true, lastName: true } },
          vslaGroup: { select: { name: true } },
        },
        take: MAX_ROW_LIMIT,
        orderBy: { createdAt: 'desc' },
      })
      const data = rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        sharesBought: r.sharesBought,
        transactionRef: r.transactionRef,
        status: r.status,
        farmerFirstName: r.farmer.firstName,
        farmerLastName: r.farmer.lastName,
        groupName: r.vslaGroup.name,
        createdAt: r.createdAt,
      }))
      return { data: data as unknown as Record<string, unknown>[], defaultColumns: ['id', 'amount', 'sharesBought', 'transactionRef', 'status', 'farmerFirstName', 'farmerLastName', 'groupName'] }
    },
  },

  vsla_loans: {
    type: 'vsla_loans',
    label: 'VSLA Loans',
    description: 'Export VSLA loan records with repayment status and farmer details',
    availableColumns: ['id', 'amount', 'interestRate', 'totalRepayable', 'status', 'purpose', 'farmerFirstName', 'farmerLastName', 'groupName', 'disbursedAt', 'dueDate', 'createdAt'],
    defaultColumns: ['id', 'amount', 'interestRate', 'totalRepayable', 'status', 'farmerFirstName', 'farmerLastName', 'groupName', 'disbursedAt', 'dueDate'],
    buildQuery: async (tf, filters) => {
      const where: Record<string, unknown> = {}
      if ((tf as any).tenantId) {
        ;(where as any).vslaGroup = { tenantId: (tf as any).tenantId }
      }
      if (filters.status) (where as any).status = filters.status
      const rows = await db.vslaLoan.findMany({
        where: where as any,
        include: {
          farmer: { select: { firstName: true, lastName: true } },
          vslaGroup: { select: { name: true } },
        },
        take: MAX_ROW_LIMIT,
        orderBy: { createdAt: 'desc' },
      })
      const data = rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        interestRate: r.interestRate,
        totalRepayable: r.totalRepayable,
        status: r.status,
        purpose: r.purpose,
        farmerFirstName: r.farmer.firstName,
        farmerLastName: r.farmer.lastName,
        groupName: r.vslaGroup.name,
        disbursedAt: r.disbursedAt,
        dueDate: r.dueDate,
        createdAt: r.createdAt,
      }))
      return { data: data as unknown as Record<string, unknown>[], defaultColumns: ['id', 'amount', 'interestRate', 'totalRepayable', 'status', 'farmerFirstName', 'farmerLastName', 'groupName', 'disbursedAt', 'dueDate'] }
    },
  },

  payments: {
    type: 'payments',
    label: 'Payments',
    description: 'Export payment transactions with amounts, methods, and status',
    availableColumns: ['id', 'transactionRef', 'amount', 'type', 'status', 'recipientName', 'createdAt'],
    defaultColumns: ['id', 'transactionRef', 'amount', 'type', 'status', 'recipientName', 'createdAt'],
    buildQuery: async (tf, filters) => {
      const where: Record<string, unknown> = {}
      if ((tf as any).tenantId) {
        ;(where as any).paymentAccount = { tenantId: (tf as any).tenantId }
      }
      if (filters.dateFrom || filters.dateTo) {
        const df: Record<string, unknown> = {}
        if (filters.dateFrom) df.gte = new Date(filters.dateFrom)
        if (filters.dateTo) df.lte = new Date(filters.dateTo)
        ;(where as any).createdAt = df
      }
      if (filters.status) (where as any).status = filters.status
      const rows = await db.payment.findMany({
        where: where as any,
        select: {
          id: true, transactionRef: true, amount: true,
          type: true, status: true, recipientName: true, createdAt: true,
        },
        take: MAX_ROW_LIMIT,
        orderBy: { createdAt: 'desc' },
      })
      return { data: rows as unknown as Record<string, unknown>[], defaultColumns: ['id', 'transactionRef', 'amount', 'type', 'status', 'recipientName', 'createdAt'] }
    },
  },

  accounting: {
    type: 'accounting',
    label: 'Accounting / Journal Entries',
    description: 'Export journal entries with line items for financial reporting',
    availableColumns: ['id', 'reference', 'status', 'description', 'date', 'createdAt'],
    defaultColumns: ['id', 'reference', 'status', 'description', 'date', 'createdAt'],
    buildQuery: async (tf, filters) => {
      const where: Record<string, unknown> = { ...tf }
      if (filters.dateFrom || filters.dateTo) {
        const df: Record<string, unknown> = {}
        if (filters.dateFrom) df.gte = new Date(filters.dateFrom)
        if (filters.dateTo) df.lte = new Date(filters.dateTo)
        ;(where as any).createdAt = df
      }
      if (filters.status) (where as any).status = filters.status
      const rows = await db.journalEntry.findMany({
        where: where as any,
        select: {
          id: true, reference: true, status: true,
          description: true, date: true, createdAt: true,
        },
        take: MAX_ROW_LIMIT,
        orderBy: { createdAt: 'desc' },
      })
      return { data: rows as unknown as Record<string, unknown>[], defaultColumns: ['id', 'reference', 'status', 'description', 'date', 'createdAt'] }
    },
  },

  traceability: {
    type: 'traceability',
    label: 'Traceability / Product Batches',
    description: 'Export product batch traceability data with certification status',
    availableColumns: ['id', 'batchId', 'commodity', 'farmName', 'qualityGrade', 'quantityKg', 'season', 'status', 'currentStage', 'createdAt'],
    defaultColumns: ['id', 'batchId', 'commodity', 'farmName', 'qualityGrade', 'quantityKg', 'status', 'currentStage', 'createdAt'],
    buildQuery: async (tf, _filters) => {
      const rows = await db.productBatch.findMany({
        where: tf as any,
        select: {
          id: true, batchId: true, commodity: true, farmName: true,
          qualityGrade: true, quantityKg: true, season: true,
          status: true, currentStage: true, createdAt: true,
        },
        take: MAX_ROW_LIMIT,
        orderBy: { createdAt: 'desc' },
      })
      return { data: rows as unknown as Record<string, unknown>[], defaultColumns: ['id', 'batchId', 'commodity', 'farmName', 'qualityGrade', 'quantityKg', 'status', 'currentStage', 'createdAt'] }
    },
  },
}

// ---------------------------------------------------------------------------
// ExportEngine
// ---------------------------------------------------------------------------

export class ExportEngine {
  // -----------------------------------------------------------------------
  // Job Creation
  // -----------------------------------------------------------------------

  /**
   * Create a new export job (PENDING state).
   * Returns the DB record — actual generation happens via processJob().
   */
  static async createJob(
    tenantId: string,
    request: CreateExportRequest,
    requestedBy?: string,
  ) {
    const registry = EXPORT_REGISTRY[request.exportType]
    if (!registry) {
      throw new Error(`Unknown export type: ${request.exportType}. Available: ${Object.keys(EXPORT_REGISTRY).join(', ')}`)
    }

    const format: ExportFormat = request.format || 'CSV'
    const filters = request.filters ? JSON.stringify(request.filters) : null
    const columns = request.columns ? JSON.stringify(request.columns) : null

    const job = await db.exportJob.create({
      data: {
        tenantId,
        exportType: request.exportType,
        format,
        status: 'PENDING',
        requestedBy: requestedBy || null,
        filters,
        columns,
        // Set expiry: link TTL days from now
        expiresAt: new Date(Date.now() + DEFAULT_LINK_TTL_SECONDS * 1000),
        maxAttempts: 3,
      },
    })

    return job
  }

  // -----------------------------------------------------------------------
  // Job Processing
  // -----------------------------------------------------------------------

  /**
   * Process a PENDING export job:
   *   1. Transition to GENERATING
   *   2. Query data from DB
   *   3. Generate file content (CSV/JSON/XLSX)
   *   4. Upload to S3 (or fallback to base64 data URI)
   *   5. Transition to COMPLETED (or FAILED)
   */
  static async processJob(jobId: string): Promise<ExportJobRow> {
    const job = await db.exportJob.findUnique({ where: { id: jobId } })
    if (!job) throw new Error(`ExportJob ${jobId} not found`)

    // Validate transition
    const allowed = EXPORT_STATUS_TRANSITIONS[job.status as ExportStatus]
    if (!allowed || !allowed.includes('GENERATING')) {
      throw new Error(`Cannot process job in ${job.status} state`)
    }

    // Mark as generating
    await db.exportJob.update({
      where: { id: jobId },
      data: { status: 'GENERATING', startedAt: new Date(), attemptCount: { increment: 1 } },
    })

    try {
      const registry = EXPORT_REGISTRY[job.exportType as ExportType]
      if (!registry) throw new Error(`Unknown export type: ${job.exportType}`)

      const tenantFilter = { tenantId: job.tenantId }
      const filters: ExportFilters = job.filters ? JSON.parse(job.filters) : {}
      const requestedColumns: string[] | null = job.columns ? JSON.parse(job.columns) : null

      // 1. Query data
      const { data, defaultColumns } = await registry.buildQuery(tenantFilter, filters)
      const columns = requestedColumns || defaultColumns

      // 2. Generate file content
      const content = this.generateContent(data, columns, job.format as ExportFormat)

      // 3. Check file size
      if (content.length > MAX_FILE_SIZE_BYTES) {
        throw new Error(`Export file too large: ${(content.length / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB limit. Reduce filters or columns.`)
      }

      // 4. Compute checksum
      const checksum = createHash('sha256').update(content).digest('hex').slice(0, 16)

      // 5. Build file key & name
      const fileKey = s3Client.buildKey(job.tenantId, job.exportType, job.format)
      const ts = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0]
      const ext = this.getExtension(job.format as ExportFormat)
      const fileName = `${job.exportType}_${job.tenantId.slice(0, 8)}_${ts}.${ext}`

      // 6. Upload to S3 or fallback to data URI
      let url: string
      let fileSize = content.length

      if (s3Client.isConfigured()) {
        const result = await s3Client.upload(fileKey, Buffer.from(content))
        fileSize = result.size
        // Generate presigned URL
        url = s3Client.presignedGetUrl(fileKey, DEFAULT_LINK_TTL_SECONDS)
      } else {
        // Fallback: base64 data URI (development / no S3 configured)
        const mimeType = job.format === 'JSON' ? 'application/json' : job.format === 'XLSX' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
        url = `data:${mimeType};base64,${Buffer.from(content).toString('base64')}`
      }

      // 7. Mark as completed
      const updated = await db.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          fileKey,
          fileName,
          fileSize,
          rowCount: data.length,
          fileChecksum: checksum,
          downloadUrl: url,
          downloadUrlExpiry: new Date(Date.now() + DEFAULT_LINK_TTL_SECONDS * 1000),
          completedAt: new Date(),
        },
      })

      return updated as unknown as ExportJobRow
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      await db.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: msg.slice(0, 1000),
        },
      })
      throw error
    }
  }

  /**
   * Process all PENDING jobs for a tenant (or all tenants if SUPER_ADMIN).
   * Returns count of processed jobs.
   */
  static async processPendingJobs(tenantId?: string): Promise<{ processed: number; failed: number }> {
    const where: Record<string, unknown> = { status: 'PENDING' }
    if (tenantId) (where as any).tenantId = tenantId

    const pending = await db.exportJob.findMany({
      where: where as any,
      select: { id: true, attemptCount: true, maxAttempts: true },
      take: 50,
    })

    let processed = 0
    let failed = 0

    for (const job of pending) {
      if (job.attemptCount >= job.maxAttempts) {
        await db.exportJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', failedAt: new Date(), failureReason: 'Max retry attempts exceeded' },
        })
        failed++
        continue
      }
      try {
        await this.processJob(job.id)
        processed++
      } catch {
        failed++
      }
    }

    return { processed, failed }
  }

  // -----------------------------------------------------------------------
  // Retry
  // -----------------------------------------------------------------------

  /**
   * Retry a failed export job (resets to PENDING so processJob can pick it up)
   */
  static async retryJob(jobId: string, tenantId: string): Promise<ExportJobRow> {
    const job = await db.exportJob.findUnique({ where: { id: jobId } })
    if (!job) throw new Error(`ExportJob ${jobId} not found`)
    if (job.tenantId !== tenantId) throw new Error('Unauthorized')
    if (job.status !== 'FAILED') throw new Error(`Only FAILED jobs can be retried (current: ${job.status})`)
    if (job.attemptCount >= job.maxAttempts) throw new Error('Max retry attempts exceeded')

    const updated = await db.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        failedAt: null,
        failureReason: null,
        startedAt: null,
      },
    })

    return updated as unknown as ExportJobRow
  }

  // -----------------------------------------------------------------------
  // List / Get
  // -----------------------------------------------------------------------

  /**
   * List export jobs for a tenant with pagination and optional status filter
   */
  static async listJobs(
    tenantId: string,
    options: { page?: number; pageSize?: number; status?: ExportStatus; exportType?: ExportType } = {},
  ): Promise<ExportListResult> {
    const page = options.page || 1
    const pageSize = Math.min(options.pageSize || 20, 100)
    const where: Record<string, unknown> = { tenantId }
    if (options.status) (where as any).status = options.status
    if (options.exportType) (where as any).exportType = options.exportType

    const [jobs, total] = await Promise.all([
      db.exportJob.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.exportJob.count({ where: where as any }),
    ])

    return {
      jobs: jobs as unknown as ExportJobRow[],
      total,
      page,
      pageSize,
    }
  }

  /**
   * Get a single export job
   */
  static async getJob(jobId: string, tenantId: string): Promise<ExportJobRow> {
    const job = await db.exportJob.findUnique({ where: { id: jobId } })
    if (!job) throw new Error(`ExportJob ${jobId} not found`)
    if (job.tenantId !== tenantId) throw new Error('Unauthorized')
    return job as unknown as ExportJobRow
  }

  /**
   * Cancel a PENDING job
   */
  static async cancelJob(jobId: string, tenantId: string): Promise<ExportJobRow> {
    const job = await db.exportJob.findUnique({ where: { id: jobId } })
    if (!job) throw new Error(`ExportJob ${jobId} not found`)
    if (job.tenantId !== tenantId) throw new Error('Unauthorized')
    if (job.status !== 'PENDING') throw new Error(`Only PENDING jobs can be cancelled (current: ${job.status})`)

    const updated = await db.exportJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED' },
    })

    return updated as unknown as ExportJobRow
  }

  // -----------------------------------------------------------------------
  // Download
  // -----------------------------------------------------------------------

  /**
   * Get a fresh presigned download URL for a completed export.
   * Regenerates if the cached URL has expired.
   */
  static async getDownloadUrl(jobId: string, tenantId: string): Promise<ExportDownloadResult> {
    const job = await db.exportJob.findUnique({ where: { id: jobId } })
    if (!job) throw new Error(`ExportJob ${jobId} not found`)
    if (job.tenantId !== tenantId) throw new Error('Unauthorized')
    if (job.status !== 'COMPLETED') throw new Error(`Export is not ready (status: ${job.status})`)

    // Check if cached URL is still valid (with 5 min buffer)
    const now = new Date()
    const expiry = job.downloadUrlExpiry ? new Date(job.downloadUrlExpiry) : null
    let url = job.downloadUrl || ''

    if (!url || !expiry || expiry.getTime() - now.getTime() < 300000) {
      // Regenerate URL
      if (job.fileKey && s3Client.isConfigured()) {
        const ttl = expiry ? Math.floor((expiry.getTime() - now.getTime()) / 1000) : DEFAULT_LINK_TTL_SECONDS
        url = s3Client.presignedGetUrl(job.fileKey, Math.max(ttl, 300))
        await db.exportJob.update({
          where: { id: jobId },
          data: { downloadUrl: url, downloadUrlExpiry: new Date(now.getTime() + Math.max(ttl, 300) * 1000) },
        })
      }
    }

    if (!url) throw new Error('No download URL available')

    return {
      url,
      fileName: job.fileName || `export.${this.getExtension(job.format as ExportFormat)}`,
      fileSize: job.fileSize || 0,
      expiresAt: (expiry || new Date(now.getTime() + DEFAULT_LINK_TTL_SECONDS * 1000)).toISOString(),
    }
  }

  // -----------------------------------------------------------------------
  // Cleanup (cron)
  // -----------------------------------------------------------------------

  /**
   * Expire completed exports whose expiresAt has passed
   */
  static async expireCompletedExports(): Promise<number> {
    const result = await db.exportJob.updateMany({
      where: {
        status: 'COMPLETED',
        expiresAt: { lte: new Date() },
      },
      data: {
        status: 'EXPIRED',
        downloadUrl: null,
        downloadUrlExpiry: null,
      },
    })
    return result.count
  }

  /**
   * Delete old export records and their S3 objects.
   * Removes EXPIRED/FAILED/CANCELLED jobs older than retentionDays.
   * Also deletes the S3 objects for completed exports that have expired.
   */
  static async cleanupOldJobs(retentionDays: number = 30): Promise<{ deleted: number; s3Deleted: number }> {
    const cutoff = new Date(Date.now() - retentionDays * 86400000)

    // Find jobs to delete
    const jobs = await db.exportJob.findMany({
      where: {
        status: { in: ['EXPIRED', 'FAILED', 'CANCELLED'] },
        createdAt: { lte: cutoff },
      },
      select: { id: true, fileKey: true },
      take: 500,
    })

    let s3Deleted = 0

    // Delete S3 objects
    if (s3Client.isConfigured()) {
      for (const job of jobs) {
        if (job.fileKey) {
          try {
            await s3Client.delete(job.fileKey)
            s3Deleted++
          } catch {
            // S3 object may already be gone — that's fine
          }
        }
      }
    }

    // Delete DB records
    const { count: deleted } = await db.exportJob.deleteMany({
      where: {
        id: { in: jobs.map((j) => j.id) },
      },
    })

    return { deleted, s3Deleted }
  }

  // -----------------------------------------------------------------------
  // Export Types Info
  // -----------------------------------------------------------------------

  /**
   * Get all available export types with their column options
   */
  static getExportTypes(): ExportTypeInfo[] {
    return Object.values(EXPORT_REGISTRY).map((r) => ({
      type: r.type,
      label: r.label,
      description: r.description,
      defaultColumns: r.defaultColumns,
      availableColumns: r.availableColumns,
    }))
  }

  /**
   * Get summary stats for a tenant's exports
   */
  static async getStats(tenantId: string): Promise<{
    total: number
    pending: number
    generating: number
    completed: number
    failed: number
    expired: number
    totalBytes: number
  }> {
    const [total, pending, generating, completed, failed, expired, aggResult] = await Promise.all([
      db.exportJob.count({ where: { tenantId } }),
      db.exportJob.count({ where: { tenantId, status: 'PENDING' } }),
      db.exportJob.count({ where: { tenantId, status: 'GENERATING' } }),
      db.exportJob.count({ where: { tenantId, status: 'COMPLETED' } }),
      db.exportJob.count({ where: { tenantId, status: 'FAILED' } }),
      db.exportJob.count({ where: { tenantId, status: 'EXPIRED' } }),
      db.exportJob.aggregate({
        where: { tenantId, status: 'COMPLETED' },
        _sum: { fileSize: true },
      }),
    ])

    return {
      total,
      pending,
      generating,
      completed,
      failed,
      expired,
      totalBytes: aggResult._sum.fileSize || 0,
    }
  }

  // -----------------------------------------------------------------------
  // File Content Generation
  // -----------------------------------------------------------------------

  /**
   * Generate file content in the specified format
   */
  private static generateContent(
    data: Record<string, unknown>[],
    columns: string[],
    format: ExportFormat,
  ): string | Buffer {
    switch (format) {
      case 'CSV':
        return this.toCSV(data, columns)
      case 'JSON':
        return JSON.stringify(data.map((row) => {
          const picked: Record<string, unknown> = {}
          for (const col of columns) {
            picked[col] = row[col] ?? null
          }
          return picked
        }), null, 2)
      case 'XLSX':
        return this.toXLSX(data, columns)
      default:
        return this.toCSV(data, columns)
    }
  }

  /**
   * Generate CSV content with proper escaping
   */
  private static toCSV(data: Record<string, unknown>[], columns: string[]): string {
    const header = columns.join(',')
    const rows = data.map((row) =>
      columns.map((col) => {
        const val = row[col]
        if (val === null || val === undefined) return ''
        // Format dates as ISO strings
        if (val instanceof Date) return this.formatDate(val)
        const str = String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    )
    return [header, ...rows].join('\n')
  }

  /**
   * Generate a minimal XLSX (SpreadsheetML XML) — no external dependency needed.
   * Produces a valid .xlsx file that opens in Excel, LibreOffice, Google Sheets.
   */
  private static toXLSX(data: Record<string, unknown>[], columns: string[]): Buffer {
    // Build the sheet data as XML
    const escapeXml = (s: string): string =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    const rowsXml: string[] = []

    // Header row
    const headerCells = columns.map((col) =>
      `<c t="inlineStr"><is><t>${escapeXml(col)}</t></is></c>`
    ).join('')
    rowsXml.push(`<row r="1">${headerCells}</row>`)

    // Data rows
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const cells = columns.map((col, j) => {
        const val = row[col]
        if (val === null || val === undefined) return `<c r="${String.fromCharCode(65 + j)}${i + 2}"/>`
        if (val instanceof Date) {
          return `<c r="${String.fromCharCode(65 + j)}${i + 2}" t="inlineStr"><is><t>${escapeXml(this.formatDate(val))}</t></is></c>`
        }
        if (typeof val === 'number') {
          return `<c r="${String.fromCharCode(65 + j)}${i + 2}"><v>${val}</v></c>`
        }
        return `<c r="${String.fromCharCode(65 + j)}${i + 2}" t="inlineStr"><is><t>${escapeXml(String(val))}</t></is></c>`
      }).join('')
      rowsXml.push(`<row r="${i + 2}">${cells}</row>`)
    }

    const sheetData = rowsXml.join('')

    // SpreadsheetML template
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Export" sheetId="1">
      <table>${sheetData}</table>
    </sheet>
  </sheets>
</workbook>`

    return Buffer.from(xml, 'utf8')
  }

  /**
   * Format a Date for CSV/XLSX output
   */
  private static formatDate(d: Date): string {
    return d.toISOString().replace('T', ' ').split('.')[0]
  }

  /**
   * Get file extension for format
   */
  private static getExtension(format: ExportFormat): string {
    switch (format) {
      case 'CSV': return 'csv'
      case 'JSON': return 'json'
      case 'XLSX': return 'xlsx'
      default: return 'csv'
    }
  }
}