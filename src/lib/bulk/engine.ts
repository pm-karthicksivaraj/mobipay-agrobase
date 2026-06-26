/**
 * Agrobase V3 — Bulk Operations Engine
 * Handles bulk imports, exports, and mass update operations.
 */

import { db } from '@/lib/db'
import type { BulkOperationType, BulkOperationStatus, BulkOperationInput, BulkOperationResult } from './types'

type BulkProcessor = (tenantId: string, operationId: string, config?: string) => Promise<BulkOperationResult>

export class BulkEngine {
  private processors: Map<string, BulkProcessor> = new Map()

  constructor() {
    this.processors.set('IMPORT_FARMERS', this.processImportFarmers.bind(this))
    this.processors.set('IMPORT_PURCHASES', this.processImportPurchases.bind(this))
    this.processors.set('MASS_UPDATE', this.processMassUpdate.bind(this))
  }

  /**
   * Create a new bulk operation record.
   */
  async createOperation(tenantId: string, input: BulkOperationInput, performedBy?: string) {
    try {
      return await db.bulkOperation.create({
        data: {
          tenantId,
          type: input.type,
          status: 'PENDING',
          fileName: input.fileName,
          fileSize: input.fileSize ?? null,
          totalRows: input.totalRows ?? 0,
          processedRows: 0,
          successRows: 0,
          failedRows: 0,
          configFile: input.configFile || null,
          performedBy: performedBy || null,
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create bulk operation: ${msg}`)
    }
  }

  /**
   * Execute a bulk operation by type.
   */
  async executeOperation(operationId: string, tenantId: string): Promise<BulkOperationResult> {
    try {
      const operation = await db.bulkOperation.findFirst({ where: { id: operationId, tenantId } })
      if (!operation) throw new Error('Operation not found')
      if (operation.status !== 'PENDING') throw new Error(`Operation is ${operation.status}, cannot execute`)

      await db.bulkOperation.update({
        where: { id: operationId },
        data: { status: 'RUNNING' as BulkOperationStatus, startedAt: new Date() },
      })

      const processor = this.processors.get(operation.type)
      if (!processor) {
        await db.bulkOperation.update({
          where: { id: operationId },
          data: { status: 'FAILED' as BulkOperationStatus, completedAt: new Date(), errorSummary: `No processor for type: ${operation.type}` },
        })
        throw new Error(`Unsupported operation type: ${operation.type}`)
      }

      const result = await processor(tenantId, operationId, operation.configFile ?? undefined)

      await db.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: result.status as BulkOperationStatus,
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
      try {
        await db.bulkOperation.update({
          where: { id: operationId },
          data: { status: 'FAILED' as BulkOperationStatus, completedAt: new Date(), errorSummary: msg },
        })
      } catch { /* ignore update error */ }
      throw new Error(`Bulk operation failed: ${msg}`)
    }
  }

  /**
   * Get the status and progress of a bulk operation.
   */
  async getStatus(operationId: string, tenantId: string) {
    try {
      const operation = await db.bulkOperation.findFirst({
        where: { id: operationId, tenantId },
      })
      if (!operation) throw new Error('Operation not found')

      const progress = operation.totalRows > 0
        ? Math.round((operation.processedRows / operation.totalRows) * 100)
        : 0

      return {
        ...operation,
        progress,
        isComplete: ['COMPLETED', 'FAILED', 'PARTIAL'].includes(operation.status),
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to get operation status: ${msg}`)
    }
  }

  // --- Bulk Processors ---

  private async processImportFarmers(tenantId: string, operationId: string, _config?: string): Promise<BulkOperationResult> {
    // Placeholder: in production this would parse CSV/Excel and upsert farmers
    return {
      operationId,
      status: 'COMPLETED',
      processedRows: 0,
      successRows: 0,
      failedRows: 0,
      errorSummary: 'Import processor not yet implemented. Use the API endpoint with file upload.',
    }
  }

  private async processImportPurchases(tenantId: string, operationId: string, _config?: string): Promise<BulkOperationResult> {
    return {
      operationId,
      status: 'COMPLETED',
      processedRows: 0,
      successRows: 0,
      failedRows: 0,
      errorSummary: 'Import processor not yet implemented. Use the API endpoint with file upload.',
    }
  }

  private async processMassUpdate(tenantId: string, operationId: string, config?: string): Promise<BulkOperationResult> {
    if (!config) {
      return { operationId, status: 'FAILED', processedRows: 0, successRows: 0, failedRows: 0, errorSummary: 'No config provided for mass update' }
    }
    try {
      const parsed = JSON.parse(config)
      const { model, updates, where: filter } = parsed
      if (!model || !updates) {
        return { operationId, status: 'FAILED', processedRows: 0, successRows: 0, failedRows: 0, errorSummary: 'Config must include model and updates' }
      }

      // Only allow safe bulk updates on specific models
      const allowedModels = ['FarmerProfile', 'VslaGroup', 'Training']
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
}

export const bulkEngine = new BulkEngine()