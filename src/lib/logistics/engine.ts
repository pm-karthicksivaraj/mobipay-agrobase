/**
 * Agrobase V3 — Logistics Engine
 * Handles vehicle management, shipment lifecycle, and tracking.
 */

import { db } from '@/lib/db'
import type { VehicleInput, ShipmentInput, ShipmentStatus } from './types'

export class LogisticsEngine {
  /**
   * Register a new vehicle.
   */
  async createVehicle(tenantId: string, input: VehicleInput) {
    try {
      return await db.vehicle.create({
        data: {
          tenantId,
          plateNumber: input.plateNumber,
          type: input.type,
          capacity: input.capacity,
          driverName: input.driverName || null,
          driverPhone: input.driverPhone || null,
          isActive: true,
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create vehicle: ${msg}`)
    }
  }

  /**
   * Create a new shipment with optional items.
   */
  async createShipment(tenantId: string, input: ShipmentInput) {
    try {
      // Generate unique shipment code
      const prefix = 'SHP-'
      const existingCount = await db.shipment.count({ where: { shipmentCode: { startsWith: prefix } } })
      const shipmentCode = `${prefix}${String(existingCount + 1).padStart(6, '0')}`

      const record = await db.shipment.create({
        data: {
          tenantId,
          shipmentCode,
          vehicleId: input.vehicleId || null,
          contractId: input.contractId || null,
          originId: input.originId || null,
          destinationId: input.destinationId || null,
          status: 'PLANNED',
          driverName: input.driverName || null,
          driverPhone: input.driverPhone || null,
          totalWeight: input.totalWeight ?? null,
          route: input.route || null,
          notes: input.notes || null,
          items: input.items ? {
            create: input.items.map((item) => ({
              commodity: item.commodity,
              grade: item.grade || null,
              quantity: item.quantity,
              batchCode: item.batchCode || null,
            })),
          } : undefined,
        },
        include: { items: true, vehicle: true },
      })
      return record
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create shipment: ${msg}`)
    }
  }

  /**
   * Update shipment status through the lifecycle.
   */
  async updateShipmentStatus(shipmentId: string, tenantId: string, newStatus: ShipmentStatus) {
    try {
      const existing = await db.shipment.findFirst({ where: { id: shipmentId, tenantId } })
      if (!existing) throw new Error('Shipment not found')

      const validTransitions: Record<string, ShipmentStatus[]> = {
        'PLANNED': ['LOADING', 'CANCELLED'],
        'LOADING': ['IN_TRANSIT', 'CANCELLED'],
        'IN_TRANSIT': ['DELIVERED'],
        'DELIVERED': [],
        'CANCELLED': [],
      }

      const allowed = validTransitions[existing.status] || []
      if (!allowed.includes(newStatus)) {
        throw new Error(`Cannot transition from ${existing.status} to ${newStatus}`)
      }

      const updateData: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'IN_TRANSIT') updateData.departureTime = new Date()
      if (newStatus === 'DELIVERED') updateData.arrivalTime = new Date()

      return await db.shipment.update({
        where: { id: shipmentId },
        data: updateData as any,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to update shipment status: ${msg}`)
    }
  }

  /**
   * Get logistics summary for a tenant.
   */
  async getSummary(tenantId: string) {
    try {
      const [totalVehicles, activeVehicles, totalShipments, byStatus] = await Promise.all([
        db.vehicle.count({ where: { tenantId } }),
        db.vehicle.count({ where: { tenantId, isActive: true } }),
        db.shipment.count({ where: { tenantId } }),
        db.shipment.groupBy({
          by: ['status'],
          where: { tenantId },
          _count: true,
        }),
      ])

      const statusCounts: Record<string, number> = {}
      for (const row of byStatus) {
        statusCounts[row.status] = row._count
      }

      return {
        totalVehicles,
        activeVehicles,
        totalShipments,
        inTransit: statusCounts['IN_TRANSIT'] || 0,
        delivered: statusCounts['DELIVERED'] || 0,
        planned: statusCounts['PLANNED'] || 0,
        statusBreakdown: statusCounts,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to get logistics summary: ${msg}`)
    }
  }
}

export const logisticsEngine = new LogisticsEngine()