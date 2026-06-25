/**
 * Agrobase V3 — Data Export Engine
 * Generates CSV/JSON exports for various data types.
 */

import { db } from '@/lib/db'
import type { ExportRequest, ExportResult, ExportFormat } from './types'

export class ExportEngine {
  /**
   * Generate an export file and return a result.
   * In production, this would upload to S3 and return a presigned URL.
   */
  async generateExport(tenantId: string, request: ExportRequest): Promise<ExportResult> {
    try {
      const tf = { tenantId }
      let data: unknown[] = []
      let defaultColumns: string[] = []

      switch (request.type) {
        case 'farmers': {
          const rows = await db.farmerProfile.findMany({
            where: tf,
            select: {
              id: true, firstName: true, lastName: true, phone: true, gender: true,
              farmerCode: true, status: true, villageId: true, createdAt: true,
            },
            take: 10000,
          })
          data = rows as unknown[]
          defaultColumns = ['id', 'firstName', 'lastName', 'phone', 'gender', 'farmerCode', 'status', 'villageId', 'createdAt']
          break
        }
        case 'purchases': {
          const rows = await db.purchase.findMany({
            where: { farmer: { tenantId } },
            select: {
              id: true, totalAmount: true, status: true, commodity: true,
              quantity: true, unitPrice: true, createdAt: true,
            },
            take: 10000,
            orderBy: { createdAt: 'desc' },
          })
          data = rows as unknown[]
          defaultColumns = ['id', 'totalAmount', 'status', 'commodity', 'quantity', 'unitPrice', 'createdAt']
          break
        }
        case 'inventory': {
          const rows = await db.stockItem.findMany({
            where: tf,
            select: {
              id: true, warehouseId: true, commodity: true, variety: true,
              grade: true, batchCode: true, quantity: true, unit: true,
              unitPrice: true, status: true, createdAt: true,
            },
            take: 10000,
          })
          data = rows as unknown[]
          defaultColumns = ['id', 'warehouseId', 'commodity', 'variety', 'grade', 'batchCode', 'quantity', 'unit', 'unitPrice', 'status']
          break
        }
        case 'contracts': {
          const rows = await db.contract.findMany({
            where: tf,
            select: {
              id: true, contractCode: true, type: true, status: true,
              commodity: true, quantity: true, unitPrice: true,
              currency: true, totalValue: true, startDate: true,
              endDate: true, buyerName: true, sellerName: true,
              createdAt: true,
            },
            take: 10000,
            orderBy: { createdAt: 'desc' },
          })
          data = rows as unknown[]
          defaultColumns = ['id', 'contractCode', 'type', 'status', 'commodity', 'quantity', 'unitPrice', 'currency', 'totalValue', 'startDate', 'endDate']
          break
        }
        case 'shipments': {
          const rows = await db.shipment.findMany({
            where: tf,
            select: {
              id: true, shipmentCode: true, status: true, driverName: true,
              driverPhone: true, totalWeight: true, departureTime: true,
              arrivalTime: true, createdAt: true,
            },
            take: 10000,
            orderBy: { createdAt: 'desc' },
          })
          data = rows as unknown[]
          defaultColumns = ['id', 'shipmentCode', 'status', 'driverName', 'driverPhone', 'totalWeight', 'departureTime', 'arrivalTime']
          break
        }
        case 'partners': {
          const rows = await db.partner.findMany({
            where: tf,
            select: {
              id: true, name: true, type: true, contactName: true,
              contactEmail: true, contactPhone: true, commissionRate: true,
              isActive: true, createdAt: true,
            },
            take: 10000,
          })
          data = rows as unknown[]
          defaultColumns = ['id', 'name', 'type', 'contactName', 'contactEmail', 'contactPhone', 'commissionRate', 'isActive']
          break
        }
        default:
          throw new Error(`Unknown export type: ${request.type}`)
      }

      const columns = request.columns || defaultColumns
      const fileName = `${request.type}_${tenantId.slice(0, 8)}_${Date.now()}.${this.getExtension(request.format)}`

      let content: string
      if (request.format === 'JSON') {
        content = JSON.stringify(data, null, 2)
      } else {
        content = this.toCSV(data as Record<string, unknown>[], columns)
      }

      // In production, upload to S3/GCS. For now return as base64 data URI.
      const base64 = Buffer.from(content).toString('base64')
      const mimeType = request.format === 'JSON' ? 'application/json' : 'text/csv'
      const url = `data:${mimeType};base64,${base64}`

      return {
        url,
        fileName,
        rowCount: data.length,
        generatedAt: new Date().toISOString(),
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Export failed: ${msg}`)
    }
  }

  /**
   * Get available export types and their column options.
   */
  getExportTypes(): Array<{ type: string; label: string; defaultColumns: string[] }> {
    return [
      { type: 'farmers', label: 'Farmer Registrations', defaultColumns: ['id', 'firstName', 'lastName', 'phone', 'gender', 'farmerCode', 'status'] },
      { type: 'purchases', label: 'Purchases', defaultColumns: ['id', 'totalAmount', 'status', 'commodity', 'quantity', 'unitPrice'] },
      { type: 'inventory', label: 'Inventory / Stock', defaultColumns: ['id', 'warehouseId', 'commodity', 'variety', 'quantity', 'unit', 'status'] },
      { type: 'contracts', label: 'Contracts', defaultColumns: ['id', 'contractCode', 'type', 'status', 'commodity', 'totalValue'] },
      { type: 'shipments', label: 'Shipments', defaultColumns: ['id', 'shipmentCode', 'status', 'driverName', 'totalWeight'] },
      { type: 'partners', label: 'Partners', defaultColumns: ['id', 'name', 'type', 'contactName', 'commissionRate'] },
    ]
  }

  // --- Helpers ---

  private toCSV(data: Record<string, unknown>[], columns: string[]): string {
    const header = columns.join(',')
    const rows = data.map((row) =>
      columns.map((col) => {
        const val = row[col]
        if (val === null || val === undefined) return ''
        const str = String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    )
    return [header, ...rows].join('\n')
  }

  private getExtension(format: ExportFormat): string {
    switch (format) {
      case 'CSV': return 'csv'
      case 'JSON': return 'json'
      case 'XLSX': return 'xlsx'
      default: return 'csv'
    }
  }
}

export const exportEngine = new ExportEngine()