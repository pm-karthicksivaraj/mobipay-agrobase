/**
 * Agrobase V3 — Logistics Types
 */

export interface VehicleInput {
  plateNumber: string
  type: string
  capacity: number
  driverName?: string
  driverPhone?: string
}

export interface ShipmentInput {
  vehicleId?: string
  contractId?: string
  originId?: string
  destinationId?: string
  driverName?: string
  driverPhone?: string
  totalWeight?: number
  route?: string
  notes?: string
  items?: ShipmentItemInput[]
}

export interface ShipmentItemInput {
  commodity: string
  grade?: string
  quantity: number
  batchCode?: string
}

export type ShipmentStatus = 'PLANNED' | 'LOADING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'