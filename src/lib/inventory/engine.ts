import { db } from '@/lib/db'
import type { StockLevel, StockSummary } from './types'

interface ReceiveStockData {
  commodity: string
  variety: string
  grade: string
  batchCode?: string
  quantity: number
  unit?: string
  unitPrice?: number
  minLevel?: number
  maxLevel?: number
  location?: string
  expiryDate?: Date
  referenceId?: string
  performedBy?: string
  notes?: string
}

interface TransferStockData {
  stockItemId: string
  quantity: number
  referenceId?: string
  performedBy?: string
  notes?: string
}

interface AdjustStockData {
  quantity: number
  unitPrice?: number
  referenceId?: string
  performedBy?: string
  notes?: string
}

class InventoryEngine {
  async createWarehouse(tenantId: string, data: {
    name: string
    address?: string
    country?: string
    region?: string
    district?: string
    capacity?: number
    managerId?: string
  }) {
    try {
      const count = await db.warehouse.count({ where: { tenantId } })
      const code = `WH-${(data.country?.slice(0, 2).toUpperCase() || 'XX')}-${String(count + 1).padStart(4, '0')}`

      return await db.warehouse.create({
        data: {
          tenantId,
          name: data.name,
          code,
          address: data.address || '',
          country: data.country || '',
          region: data.region || '',
          district: data.district || '',
          capacity: data.capacity || 0,
          managerId: data.managerId,
          isActive: true,
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create warehouse: ${msg}`)
    }
  }

  async listWarehouses(tenantId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit
      const [items, total] = await Promise.all([
        db.warehouse.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.warehouse.count({ where: { tenantId } }),
      ])

      return {
        items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to list warehouses: ${msg}`)
    }
  }

  async receiveStock(warehouseId: string, tenantId: string, data: ReceiveStockData) {
    try {
      const existing = await db.stockItem.findFirst({
        where: {
          warehouseId,
          commodity: data.commodity,
          variety: data.variety,
          grade: data.grade,
        },
      })

      let stockItemId: string

      if (existing) {
        await db.stockItem.update({
          where: { id: existing.id },
          data: { quantity: { increment: data.quantity } },
        })
        stockItemId = existing.id
      } else {
        const item = await db.stockItem.create({
          data: {
            tenantId,
            warehouseId,
            commodity: data.commodity,
            variety: data.variety,
            grade: data.grade,
            batchCode: data.batchCode || '',
            quantity: data.quantity,
            unit: data.unit || 'KG',
            unitPrice: data.unitPrice || 0,
            minLevel: data.minLevel || 0,
            maxLevel: data.maxLevel || 0,
            location: data.location || '',
            expiryDate: data.expiryDate,
            status: 'AVAILABLE',
          },
        })
        stockItemId = item.id
      }

      await db.stockMovement.create({
        data: {
          tenantId,
          warehouseId,
          stockItemId,
          type: 'IN',
          quantity: data.quantity,
          unitPrice: data.unitPrice || 0,
          referenceId: data.referenceId || '',
          referenceType: 'INTAKE',
          notes: data.notes || '',
          performedBy: data.performedBy || '',
        },
      })

      return stockItemId
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to receive stock: ${msg}`)
    }
  }

  async dispatchStock(warehouseId: string, tenantId: string, data: {
    stockItemId: string
    quantity: number
    referenceId?: string
    performedBy?: string
    notes?: string
  }) {
    try {
      const item = await db.stockItem.findFirst({
        where: { id: data.stockItemId, warehouseId, tenantId },
      })

      if (!item) {
        throw new Error('Stock item not found')
      }

      if (item.quantity < data.quantity) {
        throw new Error(`Insufficient stock. Available: ${item.quantity}, Requested: ${data.quantity}`)
      }

      await db.stockItem.update({
        where: { id: item.id },
        data: { quantity: { decrement: data.quantity } },
      })

      await db.stockMovement.create({
        data: {
          tenantId,
          warehouseId,
          stockItemId: item.id,
          type: 'OUT',
          quantity: data.quantity,
          unitPrice: item.unitPrice,
          referenceId: data.referenceId || '',
          referenceType: 'DISPATCH',
          notes: data.notes || '',
          performedBy: data.performedBy || '',
        },
      })

      return item.id
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to dispatch stock: ${msg}`)
    }
  }

  async transferStock(fromId: string, toId: string, tenantId: string, data: TransferStockData) {
    try {
      const fromItem = await db.stockItem.findFirst({
        where: { id: data.stockItemId, warehouseId: fromId, tenantId },
      })

      if (!fromItem) {
        throw new Error('Source stock item not found')
      }

      if (fromItem.quantity < data.quantity) {
        throw new Error(`Insufficient stock for transfer. Available: ${fromItem.quantity}`)
      }

      await db.stockMovement.create({
        data: {
          tenantId,
          warehouseId: fromId,
          stockItemId: fromItem.id,
          type: 'TRANSFER_OUT',
          quantity: data.quantity,
          unitPrice: fromItem.unitPrice,
          toWarehouseId: toId,
          referenceId: data.referenceId || '',
          referenceType: 'TRANSFER',
          notes: data.notes || '',
          performedBy: data.performedBy || '',
        },
      })

      await db.stockItem.update({
        where: { id: fromItem.id },
        data: { quantity: { decrement: data.quantity } },
      })

      const toItem = await db.stockItem.findFirst({
        where: {
          warehouseId: toId,
          commodity: fromItem.commodity,
          variety: fromItem.variety,
          grade: fromItem.grade,
        },
      })

      if (toItem) {
        await db.stockItem.update({
          where: { id: toItem.id },
          data: { quantity: { increment: data.quantity } },
        })
        await db.stockMovement.create({
          data: {
            tenantId,
            warehouseId: toId,
            stockItemId: toItem.id,
            type: 'TRANSFER_IN',
            quantity: data.quantity,
            unitPrice: fromItem.unitPrice,
            fromWarehouseId: fromId,
            referenceId: data.referenceId || '',
            referenceType: 'TRANSFER',
            notes: data.notes || '',
            performedBy: data.performedBy || '',
          },
        })
      } else {
        const newItem = await db.stockItem.create({
          data: {
            tenantId,
            warehouseId: toId,
            commodity: fromItem.commodity,
            variety: fromItem.variety,
            grade: fromItem.grade,
            batchCode: fromItem.batchCode,
            quantity: data.quantity,
            unit: fromItem.unit,
            unitPrice: fromItem.unitPrice,
            minLevel: fromItem.minLevel,
            maxLevel: fromItem.maxLevel,
            location: fromItem.location,
            expiryDate: fromItem.expiryDate,
            status: 'AVAILABLE',
          },
        })
        await db.stockMovement.create({
          data: {
            tenantId,
            warehouseId: toId,
            stockItemId: newItem.id,
            type: 'TRANSFER_IN',
            quantity: data.quantity,
            unitPrice: fromItem.unitPrice,
            fromWarehouseId: fromId,
            referenceId: data.referenceId || '',
            referenceType: 'TRANSFER',
            notes: data.notes || '',
            performedBy: data.performedBy || '',
          },
        })
      }

      return fromItem.id
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to transfer stock: ${msg}`)
    }
  }

  async adjustStock(stockItemId: string, tenantId: string, data: AdjustStockData) {
    try {
      const item = await db.stockItem.findFirst({
        where: { id: stockItemId, tenantId },
      })

      if (!item) {
        throw new Error('Stock item not found')
      }

      const newQty = item.quantity + data.quantity

      if (newQty < 0) {
        throw new Error('Adjustment would result in negative stock')
      }

      await db.stockItem.update({
        where: { id: stockItemId },
        data: { quantity: newQty, unitPrice: data.unitPrice ?? item.unitPrice },
      })

      await db.stockMovement.create({
        data: {
          tenantId,
          warehouseId: item.warehouseId,
          stockItemId,
          type: 'ADJUSTMENT',
          quantity: Math.abs(data.quantity),
          unitPrice: data.unitPrice ?? item.unitPrice,
          referenceId: data.referenceId || '',
          referenceType: 'ADJUSTMENT',
          notes: data.notes || '',
          performedBy: data.performedBy || '',
        },
      })

      return stockItemId
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to adjust stock: ${msg}`)
    }
  }

  async getStockLevels(warehouseId: string, tenantId: string): Promise<StockLevel[]> {
    try {
      const items = await db.stockItem.findMany({
        where: { warehouseId, tenantId },
      })

      return items.map((item) => ({
        stockItemId: item.id,
        commodity: item.commodity,
        currentQuantity: item.quantity,
        minLevel: item.minLevel,
        reorderNeeded: item.quantity <= item.minLevel,
      }))
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to get stock levels: ${msg}`)
    }
  }

  async getLowStock(warehouseId: string, tenantId: string): Promise<StockLevel[]> {
    try {
      const items = await db.stockItem.findMany({
        where: {
          warehouseId,
          tenantId,
          quantity: { lte: 10 },
        },
      })

      return items
        .filter((item) => item.quantity <= item.minLevel)
        .map((item) => ({
          stockItemId: item.id,
          commodity: item.commodity,
          currentQuantity: item.quantity,
          minLevel: item.minLevel,
          reorderNeeded: true,
        }))
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to get low stock: ${msg}`)
    }
  }

  async getMovements(warehouseId: string, tenantId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit
      const [items, total] = await Promise.all([
        db.stockMovement.findMany({
          where: { warehouseId, tenantId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: { stockItem: true },
        }),
        db.stockMovement.count({ where: { warehouseId, tenantId } }),
      ])

      return {
        items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to get stock movements: ${msg}`)
    }
  }
}

export const inventoryEngine = new InventoryEngine()