/**
 * Agrobase V3 — Bulk Operations Engine
 *
 * Handles bulk imports (CSV + Excel), exports, and mass update operations.
 * Processors are wired to BulkImportEngine for real data processing.
 *
 * Static class pattern (consistent with EscrowEngine, ExportEngine, etc.)
 */

import { db } from '@/lib/db'
import * as XLSX from 'xlsx'
import { BulkImportEngine, parseCsvString, parseFileBuffer, detectFileFormat } from './import'
import type { BulkOperationType, BulkOperationStatus, BulkOperationResult } from './types'

type BulkProcessor = (tenantId: string, operationId: string, config?: string) => Promise<BulkOperationResult>

export class BulkEngine {
  private processors: Map<string, BulkProcessor> = new Map()

  constructor() {
    this.processors.set('IMPORT_FARMERS', this.processImportFarmers.bind(this))
    this.processors.set('IMPORT_PURCHASES', this.processImportPurchases.bind(this))
    this.processors.set('MASS_UPDATE', this.processMassUpdate.bind(this))
  }

  // -----------------------------------------------------------------------
  // Operation Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Create a new bulk operation record.
   */
  static async createOperation(
    tenantId: string,
    type: BulkOperationType,
    fileName: string,
    options?: { fileSize?: number; totalRows?: number; configFile?: string; performedBy?: string },
  ) {
    return db.bulkOperation.create({
      data: {
        tenantId,
        type,
        status: 'PENDING',
        fileName,
        fileSize: options?.fileSize ?? null,
        totalRows: options?.totalRows ?? 0,
        processedRows: 0,
        successRows: 0,
        failedRows: 0,
        configFile: options?.configFile || null,
        performedBy: options?.performedBy || null,
      },
    })
  }

  /**
   * Execute a bulk operation by ID.
   */
  async executeOperation(operationId: string, tenantId: string): Promise<BulkOperationResult> {
    const operation = await db.bulkOperation.findFirst({ where: { id: operationId, tenantId } })
    if (!operation) throw new Error('Operation not found')
    if (operation.status !== 'PENDING') throw new Error(`Operation is ${operation.status}, cannot execute`)

    await db.bulkOperation.update({
      where: { id: operationId },
      data: { status: 'RUNNING', startedAt: new Date() },
    })

    const processor = this.processors.get(operation.type)
    if (!processor) {
      await db.bulkOperation.update({
        where: { id: operationId },
        data: { status: 'FAILED', completedAt: new Date(), errorSummary: `No processor for type: ${operation.type}` },
      })
      throw new Error(`Unsupported operation type: ${operation.type}`)
    }

    try {
      const result = await processor(tenantId, operationId, operation.configFile ?? undefined)

      await db.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: result.status,
          processedRows: result.processedRows,
          successRows: result.successRows,
          failedRows: result.failedRows,
          errorSummary: result.errorSummary || null,
          resultFileUrl: result.resultFileUrl || null,
          completedAt: new Date(),
        },
      })

      return result
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      await db.bulkOperation.update({
        where: { id: operationId },
        data: { status: 'FAILED', completedAt: new Date(), errorSummary: msg },
      })
      throw new Error(`Bulk operation failed: ${msg}`)
    }
  }

  /**
   * Get the status and progress of a bulk operation.
   */
  static async getStatus(operationId: string, tenantId: string) {
    const operation = await db.bulkOperation.findFirst({ where: { id: operationId, tenantId } })
    if (!operation) throw new Error('Operation not found')

    const progress = operation.totalRows > 0
      ? Math.round((operation.processedRows / operation.totalRows) * 100)
      : 0

    return {
      ...operation,
      progress,
      isComplete: ['COMPLETED', 'FAILED', 'PARTIAL', 'CANCELLED'].includes(operation.status),
    }
  }

  /**
   * Get detailed error information for a completed/failed operation.
   */
  static async getErrorDetails(operationId: string, tenantId: string) {
    const operation = await db.bulkOperation.findFirst({
      where: { id: operationId, tenantId },
      select: { id: true, status: true, errorSummary: true, errorDetails: true, processedRows: true, successRows: true, failedRows: true },
    })
    if (!operation) throw new Error('Operation not found')

    let errors: { row: number; message: string; field?: string }[] = []
    if (operation.errorDetails) {
      try {
        errors = JSON.parse(operation.errorDetails)
      } catch {
        errors = [{ row: 0, message: operation.errorDetails }]
      }
    }

    return {
      operationId: operation.id,
      status: operation.status,
      summary: {
        processed: operation.processedRows,
        succeeded: operation.successRows,
        failed: operation.failedRows,
      },
      errors,
    }
  }

  /**
   * List bulk operations for a tenant.
   */
  static async listOperations(
    tenantId: string,
    options: { page?: number; pageSize?: number; type?: string; status?: string } = {},
  ) {
    const page = options.page || 1
    const pageSize = Math.min(options.pageSize || 20, 100)
    const where: Record<string, unknown> = { tenantId }
    if (options.type) (where as any).type = options.type
    if (options.status) (where as any).status = options.status

    const [data, total] = await Promise.all([
      db.bulkOperation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.bulkOperation.count({ where }),
    ])

    return { data, total, page, pageSize }
  }

  /**
   * Cancel a PENDING operation.
   */
  static async cancelOperation(operationId: string, tenantId: string) {
    const operation = await db.bulkOperation.findFirst({ where: { id: operationId, tenantId } })
    if (!operation) throw new Error('Operation not found')
    if (operation.status !== 'PENDING') throw new Error(`Only PENDING operations can be cancelled (current: ${operation.status})`)

    return db.bulkOperation.update({
      where: { id: operationId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    })
  }

  // -----------------------------------------------------------------------
  // Processors
  // -----------------------------------------------------------------------

  /**
   * Parse the configFile payload which may have a flags prefix:
   *   "flags:skipDup=true,upsert=false|<actual data>"
   */
  private parseConfigPayload(raw: string): { flags: Map<string, string>; data: string } {
    const flags = new Map<string, string>()
    let data = raw

    if (raw.startsWith('flags:')) {
      const pipeIdx = raw.indexOf('|')
      if (pipeIdx > 0) {
        const flagStr = raw.substring(6, pipeIdx)
        for (const pair of flagStr.split(',')) {
          const eqIdx = pair.indexOf('=')
          if (eqIdx > 0) {
            flags.set(pair.substring(0, eqIdx).trim(), pair.substring(eqIdx + 1).trim())
          }
        }
        data = raw.substring(pipeIdx + 1)
      }
    }

    return { flags, data }
  }

  /**
   * Resolve raw data (possibly base64-encoded Excel) into parsed rows.
   */
  private resolveRows(data: string, fileName: string): { [key: string]: string }[] {
    // If the data contains newlines and looks like CSV, parse as CSV
    const firstLine = data.split(/\r?\n/)[0] || ''
    if (firstLine.includes(',') && firstLine.length < 500) {
      const parsed = parseCsvString(data)
      return parsed.rows
    }

    // Otherwise try base64 decode (Excel binary)
    try {
      const buffer = Buffer.from(data, 'base64')
      if (buffer.length > 16) {
        const format = detectFileFormat(fileName, buffer.buffer as ArrayBuffer)
        const parsed = parseFileBuffer(buffer.buffer as ArrayBuffer, format)
        return parsed.rows
      }
    } catch { /* fall through */ }

    // Final fallback: CSV
    const parsed = parseCsvString(data)
    return parsed.rows
  }

  /**
   * Import farmers — reads CSV/Excel data stored in BulkOperation.configFile,
   * auto-detects format, parses, and processes via BulkImportEngine.
   */
  private async processImportFarmers(tenantId: string, operationId: string, rawData?: string): Promise<BulkOperationResult> {
    if (!rawData) {
      return { operationId, status: 'FAILED', processedRows: 0, successRows: 0, failedRows: 0, errorSummary: 'No data provided' }
    }

    const { flags, data } = this.parseConfigPayload(rawData)
    const skipDuplicates = flags.get('skipDup') !== 'false'
    const upsert = flags.get('upsert') === 'true'

    let rows: { [key: string]: string }[]
    try {
      rows = this.resolveRows(data, 'import.csv')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Parse error'
      return { operationId, status: 'FAILED', processedRows: 0, successRows: 0, failedRows: 0, errorSummary: `Failed to parse file: ${msg}` }
    }

    const engine = new BulkImportEngine()
    const result = await engine.importFarmers(tenantId, rows, { skipDuplicates, upsert })

    const status: BulkOperationStatus = result.errors.length === 0
      ? 'COMPLETED'
      : result.created > 0
        ? 'PARTIAL'
        : 'FAILED'

    const errorDetails = result.errors.length > 0 ? JSON.stringify(result.errors.slice(0, 500)) : undefined
    const errorSummary = result.errors.length > 0
      ? `${result.errors.length} error(s). First: Row ${result.errors[0].row} — ${result.errors[0].message}`
      : undefined

    await db.bulkOperation.update({
      where: { id: operationId },
      data: {
        status,
        processedRows: result.total,
        successRows: result.created,
        failedRows: result.skipped + result.errors.length,
        errorSummary,
        errorDetails,
      },
    })

    return {
      operationId,
      status,
      processedRows: result.total,
      successRows: result.created,
      failedRows: result.skipped + result.errors.length,
      errorSummary: errorSummary || undefined,
    }
  }

  /**
   * Import purchases — reads CSV/Excel data, processes via BulkImportEngine.
   */
  private async processImportPurchases(tenantId: string, operationId: string, rawData?: string): Promise<BulkOperationResult> {
    if (!rawData) {
      return { operationId, status: 'FAILED', processedRows: 0, successRows: 0, failedRows: 0, errorSummary: 'No data provided' }
    }

    const { data } = this.parseConfigPayload(rawData)

    let rows: { [key: string]: string }[]
    try {
      rows = this.resolveRows(data, 'import.csv')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Parse error'
      return { operationId, status: 'FAILED', processedRows: 0, successRows: 0, failedRows: 0, errorSummary: `Failed to parse file: ${msg}` }
    }

    const engine = new BulkImportEngine()
    const result = await engine.importPurchases(tenantId, rows)

    const status: BulkOperationStatus = result.errors.length === 0
      ? 'COMPLETED'
      : result.created > 0
        ? 'PARTIAL'
        : 'FAILED'

    const errorDetails = result.errors.length > 0 ? JSON.stringify(result.errors.slice(0, 500)) : null
    const errorSummary = result.errors.length > 0
      ? `${result.errors.length} error(s). First: Row ${result.errors[0].row} — ${result.errors[0].message}`
      : null

    await db.bulkOperation.update({
      where: { id: operationId },
      data: {
        status,
        processedRows: result.total,
        successRows: result.created,
        failedRows: result.skipped + result.errors.length,
        errorSummary,
        errorDetails,
      },
    })

    return {
      operationId,
      status,
      processedRows: result.total,
      successRows: result.created,
      failedRows: result.skipped + result.errors.length,
      errorSummary: errorSummary || undefined,
    }
  }

  /**
   * Mass update — JSON config-based update on allowlisted models.
   */
  private async processMassUpdate(_tenantId: string, operationId: string, config?: string): Promise<BulkOperationResult> {
    if (!config) {
      return { operationId, status: 'FAILED', processedRows: 0, successRows: 0, failedRows: 0, errorSummary: 'No config provided for mass update' }
    }

    try {
      const parsed = JSON.parse(config)
      const { model, updates, where: filter } = parsed
      if (!model || !updates) {
        return { operationId, status: 'FAILED', processedRows: 0, successRows: 0, failedRows: 0, errorSummary: 'Config must include model and updates' }
      }

      const allowedModels = ['FarmerProfile', 'VslaGroup', 'Training', 'StockItem', 'Partner', 'Purchase']
      if (!allowedModels.includes(model)) {
        return { operationId, status: 'FAILED', processedRows: 0, successRows: 0, failedRows: 0, errorSummary: `Model ${model} not allowed for bulk update` }
      }

      const modelClient = (db as any)[model.charAt(0).toLowerCase() + model.slice(1)]
      if (!modelClient) {
        return { operationId, status: 'FAILED', processedRows: 0, successRows: 0, failedRows: 0, errorSummary: `Model ${model} not found in database` }
      }

      const updatedCount = await modelClient.updateMany({
        where: filter || {},
        data: updates,
      })

      return {
        operationId,
        status: 'COMPLETED',
        processedRows: updatedCount.count || 0,
        successRows: updatedCount.count || 0,
        failedRows: 0,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Parse error'
      return { operationId, status: 'FAILED', processedRows: 0, successRows: 0, failedRows: 0, errorSummary: msg }
    }
  }

  // -----------------------------------------------------------------------
  // Templates
  // -----------------------------------------------------------------------

  /**
   * Get CSV template headers for a given import type.
   */
  static getTemplate(type: string): { headers: string[]; example: Record<string, string>; description: string } {
    switch (type) {
      case 'IMPORT_FARMERS':
        return {
          description: 'Import farmer profiles. Phone is used for deduplication. Village and group names are auto-resolved.',
          headers: ['first_name', 'last_name', 'phone', 'gender', 'member_type', 'village', 'district', 'farm_size_hectares', 'main_crops', 'group_name', 'education', 'national_id_no', 'bank_name', 'bank_account_no', 'date_of_birth'],
          example: {
            first_name: 'John',
            last_name: 'Okello',
            phone: '+256700000001',
            gender: 'Male',
            member_type: 'General',
            village: 'Budo',
            district: 'Wakiso',
            farm_size_hectares: '2.5',
            main_crops: 'Coffee;Maize',
            group_name: 'Budo Farmers Group',
            education: 'Secondary',
            national_id_no: '',
            bank_name: '',
            bank_account_no: '',
            date_of_birth: '1990-05-15',
          },
        }
      case 'IMPORT_PURCHASES':
        return {
          description: 'Import purchase records. farmer_phone must match an existing farmer. group_name is optional.',
          headers: ['farmer_phone', 'commodity', 'variety', 'quantity', 'unit_price', 'total_amount', 'group_name', 'purchase_date', 'status'],
          example: {
            farmer_phone: '+256700000001',
            commodity: 'Coffee',
            variety: 'Robusta',
            quantity: '50',
            unit_price: '3000',
            total_amount: '150000',
            group_name: '',
            purchase_date: '2025-01-15',
            status: 'PENDING',
          },
        }
      default:
        throw new Error(`No template available for type: ${type}`)
    }
  }

  /**
   * Generate an Excel (.xlsx) template as a Buffer.
   */
  static generateExcelTemplate(type: string): Buffer {
    const template = this.getTemplate(type)

    // Build worksheet data
    const wsData: unknown[][] = [
      template.headers,
      template.headers.map((h) => template.example[h] || ''),
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Set column widths
    ws['!cols'] = template.headers.map((h) => ({
      wch: Math.max(h.length + 4, 15),
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Import Template')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return Buffer.from(buf)
  }
}

// Singleton
export const bulkEngine = new BulkEngine()