/**
 * Agrobase V3 — Transport Engine
 * "Mini Uber for Transporters"
 *
 * Business logic for transporter onboarding, ride-request matching,
 * trip lifecycle management, cost estimation, and charges/commission.
 *
 * Phase 2 (real-time GPS tracking) will use TripTrackingEvent model
 * and add WebSocket push. This engine stores events and calculates
 * distance from them.
 */

import { db } from '@/lib/db'
import type {
  CreateTransporterInput,
  UpdateTransporterInput,
  CreateTransportVehicleInput,
  UpdateTransportVehicleInput,
  CreateTransportRequestInput,
  CostEstimateInput,
  CostEstimateResult,
  MatchTransporterInput,
  TripStatusUpdate,
  CreateTrackingEventInput,
  TransportSummary,
  TransportListOptions,
  PaginatedResult,
  VehicleType,
  RequestStatus,
  TripStatus,
} from './types'

// ─── Cost Configuration ───────────────────────────────────────────────────
// Rates per km by vehicle type (UGX) — configurable per-tenant later
const RATES_PER_KM: Record<string, number> = {
  MOTORBIKE: 1500,
  MINI_TRUCK: 3000,
  PICKUP: 3500,
  LORRY: 5000,
  TRAILER: 7000,
  VAN: 2500,
}

// Speed assumptions km/h for duration estimation
const AVG_SPEED_KMH: Record<string, number> = {
  MOTORBIKE: 35,
  MINI_TRUCK: 40,
  PICKUP: 50,
  LORRY: 45,
  TRAILER: 40,
  VAN: 55,
}

// Base flat fee per vehicle type
const BASE_FEE: Record<string, number> = {
  MOTORBIKE: 5000,
  MINI_TRUCK: 15000,
  PICKUP: 20000,
  LORRY: 50000,
  TRAILER: 80000,
  VAN: 12000,
}

// Weight surcharge per 100kg above 500kg
const WEIGHT_SURCHARGE_PER_100KG = 2000
const WEIGHT_SURCHARGE_THRESHOLD_KG = 500

// Urgency multiplier
const URGENCY_MULTIPLIER = 1.3

// Default platform commission rate (%)
const DEFAULT_COMMISSION_RATE = 10

// ─── Status Machines ──────────────────────────────────────────────────────

const REQUEST_TRANSITIONS: Record<string, RequestStatus[]> = {
  OPEN: ['MATCHING', 'CANCELLED'],
  MATCHING: ['MATCHED', 'CANCELLED'],
  MATCHED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

const TRIP_TRANSITIONS: Record<string, TripStatus[]> = {
  ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

// ─── Code Generation ──────────────────────────────────────────────────────

async function generateCode(prefix: string, countField: { where: Record<string, unknown> }): Promise<string> {
  const existingCount = await db.transportRequest.count({ where: { requestCode: { startsWith: prefix } } })
  return `${prefix}${String(existingCount + 1).padStart(6, '0')}`
}

// ─── Distance Calculation (Haversine) ─────────────────────────────────────

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSPORT ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class TransportEngine {

  // ──────────────────────────────────────────────────────────────────────
  // TRANSPORTER MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Register a new transporter (individual or company).
   */
  static async createTransporter(tenantId: string, input: CreateTransporterInput) {
    try {
      const existingCount = await db.transporter.count({
        where: { tenantId, transporterCode: { startsWith: 'TRP-' } },
      })
      const transporterCode = `TRP-${String(existingCount + 1).padStart(6, '0')}`

      return await db.transporter.create({
        data: {
          tenantId,
          transporterCode,
          name: input.name,
          type: input.type,
          phone: input.phone,
          email: input.email || null,
          contactName: input.contactName || null,
          nationalIdNo: input.nationalIdNo || null,
          photoUrl: input.photoUrl || null,
          operatingRegions: input.operatingRegions ? JSON.stringify(input.operatingRegions) : null,
          commodityTypes: input.commodityTypes ? JSON.stringify(input.commodityTypes) : null,
          bankName: input.bankName || null,
          bankAccountNo: input.bankAccountNo || null,
          bankBranch: input.bankBranch || null,
          commissionRate: input.commissionRate ?? null,
          status: 'PENDING',
          isAvailable: true,
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create transporter: ${msg}`)
    }
  }

  /**
   * List transporters with pagination and filters.
   */
  static async listTransporters(tenantId: string, options?: TransportListOptions): Promise<PaginatedResult<any>> {
    const page = options?.page || 1
    const pageSize = options?.pageSize || 20
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = { tenantId }
    if (options?.status) where.status = options.status
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search } },
        { transporterCode: { contains: options.search, mode: 'insensitive' } },
      ]
    }

    const orderBy: Record<string, string> = {}
    if (options?.sortBy) {
      orderBy[options.sortBy] = options.sortOrder || 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    const [items, total] = await Promise.all([
      db.transporter.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          _count: { select: { vehicles: true, trips: true } },
        },
      }),
      db.transporter.count({ where }),
    ])

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * Get a single transporter with their vehicles.
   */
  static async getTransporter(id: string, tenantId: string) {
    const transporter = await db.transporter.findFirst({
      where: { id, tenantId },
      include: {
        vehicles: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
        _count: { select: { trips: true, charges: true } },
      },
    })
    if (!transporter) throw new Error('Transporter not found')
    return transporter
  }

  /**
   * Update transporter details.
   */
  static async updateTransporter(id: string, tenantId: string, data: UpdateTransporterInput) {
    const existing = await db.transporter.findFirst({ where: { id, tenantId } })
    if (!existing) throw new Error('Transporter not found')

    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.email !== undefined) updateData.email = data.email || null
    if (data.contactName !== undefined) updateData.contactName = data.contactName || null
    if (data.nationalIdNo !== undefined) updateData.nationalIdNo = data.nationalIdNo || null
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl || null
    if (data.operatingRegions !== undefined) updateData.operatingRegions = JSON.stringify(data.operatingRegions)
    if (data.commodityTypes !== undefined) updateData.commodityTypes = JSON.stringify(data.commodityTypes)
    if (data.bankName !== undefined) updateData.bankName = data.bankName || null
    if (data.bankAccountNo !== undefined) updateData.bankAccountNo = data.bankAccountNo || null
    if (data.bankBranch !== undefined) updateData.bankBranch = data.bankBranch || null
    if (data.commissionRate !== undefined) updateData.commissionRate = data.commissionRate
    if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable

    return await db.transporter.update({ where: { id }, data: updateData })
  }

  /**
   * Verify a transporter (change status PENDING → VERIFIED or ACTIVE).
   */
  static async verifyTransporter(id: string, tenantId: string, userId: string, activate = false) {
    const existing = await db.transporter.findFirst({ where: { id, tenantId } })
    if (!existing) throw new Error('Transporter not found')
    if (existing.status !== 'PENDING' && existing.status !== 'VERIFIED') {
      throw new Error(`Cannot verify transporter in ${existing.status} status`)
    }

    return await db.transporter.update({
      where: { id },
      data: {
        status: activate ? 'ACTIVE' : 'VERIFIED',
        verifiedBy: userId,
        verifiedAt: new Date(),
      },
    })
  }

  /**
   * Suspend or reactivate a transporter.
   */
  static async setTransporterStatus(id: string, tenantId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const existing = await db.transporter.findFirst({ where: { id, tenantId } })
    if (!existing) throw new Error('Transporter not found')

    // When suspending, mark all vehicles unavailable
    if (status === 'SUSPENDED') {
      await db.transportVehicle.updateMany({
        where: { transporterId: id, isActive: true },
        data: { isAvailable: false },
      })
    }

    return await db.transporter.update({
      where: { id },
      data: { status, isAvailable: status === 'ACTIVE' },
    })
  }

  // ──────────────────────────────────────────────────────────────────────
  // VEHICLE MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Register a vehicle for a transporter.
   */
  static async createVehicle(tenantId: string, input: CreateTransportVehicleInput) {
    try {
      // Verify transporter exists and is active/verified
      const transporter = await db.transporter.findFirst({
        where: { id: input.transporterId, tenantId },
      })
      if (!transporter) throw new Error('Transporter not found')
      if (transporter.status === 'SUSPENDED') throw new Error('Transporter is suspended')

      return await db.transportVehicle.create({
        data: {
          tenantId,
          transporterId: input.transporterId,
          plateNumber: input.plateNumber,
          vehicleType: input.vehicleType,
          make: input.make || null,
          model: input.model || null,
          year: input.year || null,
          color: input.color || null,
          capacityKg: input.capacityKg || null,
          capacityVolume: input.capacityVolume || null,
          palletSpaces: input.palletSpaces || null,
          driverName: input.driverName,
          driverPhone: input.driverPhone,
          driverLicenseNo: input.driverLicenseNo || null,
          insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : null,
          inspectionExpiry: input.inspectionExpiry ? new Date(input.inspectionExpiry) : null,
          roadLicenseExpiry: input.roadLicenseExpiry ? new Date(input.roadLicenseExpiry) : null,
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      if (msg.includes('Unique constraint')) {
        throw new Error('Vehicle with this plate number already exists for this tenant')
      }
      throw new Error(`Failed to create vehicle: ${msg}`)
    }
  }

  /**
   * List vehicles with filters.
   */
  static async listVehicles(tenantId: string, options?: TransportListOptions): Promise<PaginatedResult<any>> {
    const page = options?.page || 1
    const pageSize = options?.pageSize || 20
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = { tenantId, isActive: true }
    if (options?.vehicleType) where.vehicleType = options.vehicleType
    if (options?.status === 'available') where.isAvailable = true
    if (options?.transporterId) where.transporterId = options.transporterId
    if (options?.search) {
      where.OR = [
        { plateNumber: { contains: options.search, mode: 'insensitive' } },
        { driverName: { contains: options.search, mode: 'insensitive' } },
        { driverPhone: { contains: options.search } },
      ]
    }

    const [items, total] = await Promise.all([
      db.transportVehicle.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { transporter: { select: { id: true, name: true, transporterCode: true, status: true } } },
      }),
      db.transportVehicle.count({ where }),
    ])

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  /**
   * Get a single vehicle.
   */
  static async getVehicle(id: string, tenantId: string) {
    const vehicle = await db.transportVehicle.findFirst({
      where: { id, tenantId },
      include: {
        transporter: { select: { id: true, name: true, transporterCode: true } },
        _count: { select: { trips: true } },
      },
    })
    if (!vehicle) throw new Error('Vehicle not found')
    return vehicle
  }

  /**
   * Update vehicle details.
   */
  static async updateVehicle(id: string, tenantId: string, data: UpdateTransportVehicleInput) {
    const existing = await db.transportVehicle.findFirst({ where: { id, tenantId } })
    if (!existing) throw new Error('Vehicle not found')

    const updateData: Record<string, unknown> = {}
    if (data.plateNumber !== undefined) updateData.plateNumber = data.plateNumber
    if (data.vehicleType !== undefined) updateData.vehicleType = data.vehicleType
    if (data.make !== undefined) updateData.make = data.make || null
    if (data.model !== undefined) updateData.model = data.model || null
    if (data.year !== undefined) updateData.year = data.year || null
    if (data.color !== undefined) updateData.color = data.color || null
    if (data.capacityKg !== undefined) updateData.capacityKg = data.capacityKg || null
    if (data.capacityVolume !== undefined) updateData.capacityVolume = data.capacityVolume || null
    if (data.palletSpaces !== undefined) updateData.palletSpaces = data.palletSpaces || null
    if (data.driverName !== undefined) updateData.driverName = data.driverName
    if (data.driverPhone !== undefined) updateData.driverPhone = data.driverPhone
    if (data.driverLicenseNo !== undefined) updateData.driverLicenseNo = data.driverLicenseNo || null
    if (data.insuranceExpiry !== undefined) updateData.insuranceExpiry = data.insuranceExpiry ? new Date(data.insuranceExpiry) : null
    if (data.inspectionExpiry !== undefined) updateData.inspectionExpiry = data.inspectionExpiry ? new Date(data.inspectionExpiry) : null
    if (data.roadLicenseExpiry !== undefined) updateData.roadLicenseExpiry = data.roadLicenseExpiry ? new Date(data.roadLicenseExpiry) : null
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable

    return await db.transportVehicle.update({ where: { id }, data: updateData })
  }

  // ──────────────────────────────────────────────────────────────────────
  // COST ESTIMATION
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Estimate transport cost based on distance, vehicle type, weight, urgency.
   * Uses Haversine formula if GPS coordinates provided, else requires distanceKm.
   */
  static estimateCost(input: CostEstimateInput, tenantCurrency = 'UGX'): CostEstimateResult {
    // Calculate distance
    let distanceKm = input.distanceKm || 0
    if (!distanceKm && input.pickupLatitude && input.pickupLongitude &&
        input.dropoffLatitude && input.dropoffLongitude) {
      distanceKm = haversineDistanceKm(
        input.pickupLatitude, input.pickupLongitude,
        input.dropoffLatitude, input.dropoffLongitude,
      )
      // Add 30% buffer for actual road distance (roads aren't straight)
      distanceKm = distanceKm * 1.3
    }
    if (distanceKm <= 0) {
      distanceKm = 10 // minimum 10km if no data
    }

    const vehicleType = input.vehicleType || 'LORRY'
    const ratePerKm = RATES_PER_KM[vehicleType] || RATES_PER_KM.LORRY
    const baseFee = BASE_FEE[vehicleType] || BASE_FEE.LORRY
    const avgSpeed = AVG_SPEED_KMH[vehicleType] || AVG_SPEED_KMH.LORRY

    // Base cost = flat fee + (distance * rate)
    const baseCost = baseFee + (distanceKm * ratePerKm)

    // Weight surcharge (only for loads > threshold)
    let weightSurcharge = 0
    if (input.weightKg && input.weightKg > WEIGHT_SURCHARGE_THRESHOLD_KG) {
      const excess100kg = Math.ceil((input.weightKg - WEIGHT_SURCHARGE_THRESHOLD_KG) / 100)
      weightSurcharge = excess100kg * WEIGHT_SURCHARGE_PER_100KG
    }

    // Urgency surcharge
    const urgencyMultiplier = input.isUrgent ? URGENCY_MULTIPLIER : 1.0
    const urgencySurcharge = (baseCost + weightSurcharge) * (urgencyMultiplier - 1.0)

    // Vehicle type surcharge (non-agricultural may have higher rate)
    const vehicleSurcharge = input.commodityCategory === 'NON_AGRICULTURAL'
      ? (baseCost + weightSurcharge) * 0.1 // 10% surcharge for non-agricultural
      : 0

    const totalCost = baseCost + weightSurcharge + urgencySurcharge + vehicleSurcharge

    // Duration estimation
    const estimatedDurationMin = (distanceKm / avgSpeed) * 60 // minutes

    return {
      estimatedDistanceKm: Math.round(distanceKm * 10) / 10,
      estimatedDurationMin: Math.round(estimatedDurationMin),
      baseCost: Math.round(baseCost),
      weightSurcharge: Math.round(weightSurcharge),
      urgencySurcharge: Math.round(urgencySurcharge),
      vehicleSurcharge: Math.round(vehicleSurcharge),
      totalCost: Math.round(totalCost),
      currency: tenantCurrency,
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // TRANSPORT REQUESTS (Shipper side)
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Create a new transport request (shipper requests a ride).
   */
  static async createRequest(tenantId: string, input: CreateTransportRequestInput) {
    try {
      // Auto-estimate cost
      const estimate = this.estimateCost({
        pickupLatitude: input.pickupLatitude,
        pickupLongitude: input.pickupLongitude,
        dropoffLatitude: input.dropoffLatitude,
        dropoffLongitude: input.dropoffLongitude,
        vehicleType: input.preferredVehicleType as VehicleType | undefined,
        weightKg: input.weightKg,
        isUrgent: input.isUrgent,
        commodityCategory: input.commodityCategory,
      })

      const existingCount = await db.transportRequest.count({
        where: { tenantId, requestCode: { startsWith: 'TREQ-' } },
      })
      const requestCode = `TREQ-${String(existingCount + 1).padStart(6, '0')}`

      const record = await db.transportRequest.create({
        data: {
          tenantId,
          requestCode,
          requestedBy: input.requestedBy,
          requesterName: input.requesterName,
          requesterPhone: input.requesterPhone,
          requesterType: input.requesterType,
          pickupAddress: input.pickupAddress,
          pickupLatitude: input.pickupLatitude,
          pickupLongitude: input.pickupLongitude,
          pickupDistrict: input.pickupDistrict,
          dropoffAddress: input.dropoffAddress,
          dropoffLatitude: input.dropoffLatitude,
          dropoffLongitude: input.dropoffLongitude,
          dropoffDistrict: input.dropoffDistrict,
          commodityType: input.commodityType,
          commodityCategory: input.commodityCategory,
          weightKg: input.weightKg,
          volumeM3: input.volumeM3,
          quantityBags: input.quantityBags,
          requiresRefrigeration: input.requiresRefrigeration || false,
          preferredVehicleType: input.preferredVehicleType || null,
          vehicleTypeRequired: input.vehicleTypeRequired ? 'STRICT' : null,
          requestedPickupTime: input.requestedPickupTime ? new Date(input.requestedPickupTime) : null,
          isUrgent: input.isUrgent || false,
          proposedBudget: input.proposedBudget,
          estimatedCost: estimate.totalCost,
          relatedId: input.relatedId,
          relatedType: input.relatedType,
          eudrBatchId: input.eudrBatchId,
          status: 'OPEN',
        },
      })

      return { ...record, costEstimate: estimate }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create transport request: ${msg}`)
    }
  }

  /**
   * List transport requests with filters.
   */
  static async listRequests(tenantId: string, options?: TransportListOptions): Promise<PaginatedResult<any>> {
    const page = options?.page || 1
    const pageSize = options?.pageSize || 20
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = { tenantId }
    if (options?.status) where.status = options.status
    if (options?.requesterType) where.requesterType = options.requesterType
    if (options?.commodityCategory) where.commodityCategory = options.commodityCategory
    if (options?.dateFrom || options?.dateTo) {
      const createdAt: Record<string, unknown> = {}
      if (options.dateFrom) createdAt.gte = new Date(options.dateFrom)
      if (options.dateTo) createdAt.lte = new Date(options.dateTo)
      where.createdAt = createdAt
    }
    if (options?.search) {
      where.OR = [
        { requestCode: { contains: options.search, mode: 'insensitive' } },
        { requesterName: { contains: options.search, mode: 'insensitive' } },
        { commodityType: { contains: options.search, mode: 'insensitive' } },
        { pickupAddress: { contains: options.search, mode: 'insensitive' } },
        { dropoffAddress: { contains: options.search, mode: 'insensitive' } },
      ]
    }

    const orderBy: Record<string, string> = {}
    if (options?.sortBy) {
      orderBy[options.sortBy] = options.sortOrder || 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    const [items, total] = await Promise.all([
      db.transportRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          trip: { select: { id: true, tripCode: true, status: true, driverName: true, driverPhone: true, vehicleId: true } },
        },
      }),
      db.transportRequest.count({ where }),
    ])

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  /**
   * Get a single transport request with trip details.
   */
  static async getRequest(id: string, tenantId: string) {
    const request = await db.transportRequest.findFirst({
      where: { id, tenantId },
      include: {
        trip: {
          include: {
            transporter: { select: { id: true, name: true, transporterCode: true, phone: true } },
            vehicle: { select: { id: true, plateNumber: true, vehicleType: true } },
          },
        },
      },
    })
    if (!request) throw new Error('Transport request not found')
    return request
  }

  /**
   * Cancel a transport request.
   */
  static async cancelRequest(id: string, tenantId: string, userId: string, reason: string) {
    const request = await db.transportRequest.findFirst({ where: { id, tenantId } })
    if (!request) throw new Error('Transport request not found')

    const allowed = REQUEST_TRANSITIONS[request.status] || []
    if (!allowed.includes('CANCELLED')) {
      throw new Error(`Cannot cancel request in ${request.status} status`)
    }

    return await db.transportRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledBy: userId,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    })
  }

  // ──────────────────────────────────────────────────────────────────────
  // MATCHING: Assign transporter + vehicle to a request
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Match a transporter/vehicle to an open request.
   * Creates the TransportTrip and advances request to MATCHED.
   */
  static async matchTransporter(tenantId: string, input: MatchTransporterInput) {
    try {
      const request = await db.transportRequest.findFirst({
        where: { id: input.requestId, tenantId },
      })
      if (!request) throw new Error('Transport request not found')
      if (!['OPEN', 'MATCHING', 'MATCHED'].includes(request.status)) {
        throw new Error(`Cannot match request in ${request.status} status`)
      }

      // Validate transporter
      const transporter = await db.transporter.findFirst({
        where: { id: input.transporterId, tenantId, status: { in: ['ACTIVE', 'VERIFIED'] } },
      })
      if (!transporter) throw new Error('Transporter not found or not active')

      // Validate vehicle
      const vehicle = await db.transportVehicle.findFirst({
        where: { id: input.vehicleId, tenantId, transporterId: input.transporterId, isActive: true },
      })
      if (!vehicle) throw new Error('Vehicle not found or not active')
      if (!vehicle.isAvailable) throw new Error('Vehicle is currently on a trip')

      // Calculate commission
      const commissionRate = transporter.commissionRate || DEFAULT_COMMISSION_RATE
      const platformCommission = (input.agreedCost * commissionRate) / 100
      const transporterEarnings = input.agreedCost - platformCommission

      // Generate trip code
      const tripCount = await db.transportTrip.count({
        where: { tenantId, tripCode: { startsWith: 'TRP-TRIP-' } },
      })
      const tripCode = `TRP-TRIP-${String(tripCount + 1).padStart(6, '0')}`

      // Estimate distance for the trip
      let estimatedDistanceKm: number | null = null
      let estimatedDurationMin: number | null = null
      if (request.pickupLatitude && request.pickupLongitude &&
          request.dropoffLatitude && request.dropoffLongitude) {
        estimatedDistanceKm = haversineDistanceKm(
          request.pickupLatitude, request.pickupLongitude,
          request.dropoffLatitude, request.dropoffLongitude,
        ) * 1.3
        const avgSpeed = AVG_SPEED_KMH[vehicle.vehicleType] || AVG_SPEED_KMH.LORRY
        estimatedDurationMin = (estimatedDistanceKm / avgSpeed) * 60
      }

      // Create trip and update request in a transaction
      const result = await db.$transaction(async (tx) => {
        const trip = await tx.transportTrip.create({
          data: {
            tenantId,
            tripCode,
            requestId: request.id,
            transporterId: transporter.id,
            vehicleId: vehicle.id,
            driverName: vehicle.driverName,
            driverPhone: vehicle.driverPhone,
            originAddress: request.pickupAddress,
            originLatitude: request.pickupLatitude,
            originLongitude: request.pickupLongitude,
            destinationAddress: request.dropoffAddress,
            destinationLatitude: request.dropoffLatitude,
            destinationLongitude: request.dropoffLongitude,
            estimatedDistanceKm: estimatedDistanceKm ? Math.round(estimatedDistanceKm * 10) / 10 : null,
            estimatedDurationMin: estimatedDurationMin ? Math.round(estimatedDurationMin) : null,
            commodityType: request.commodityType,
            commodityCategory: request.commodityCategory,
            weightKg: request.weightKg,
            agreedCost: input.agreedCost,
            platformCommission: Math.round(platformCommission),
            transporterEarnings: Math.round(transporterEarnings),
            status: 'ASSIGNED',
            assignedAt: new Date(),
            eudrComplianceId: request.eudrBatchId || null,
          },
        })

        // Update request
        await tx.transportRequest.update({
          where: { id: request.id },
          data: {
            status: 'MATCHED',
            matchedTransporterId: transporter.id,
            matchedVehicleId: vehicle.id,
            finalCost: input.agreedCost,
          },
        })

        // Mark vehicle as unavailable (on a trip)
        await tx.transportVehicle.update({
          where: { id: vehicle.id },
          data: { isAvailable: false, currentTripId: trip.id },
        })

        // Create commission charge record
        await tx.transportCharge.create({
          data: {
            tenantId,
            tripId: trip.id,
            transporterId: transporter.id,
            chargeType: 'COMMISSION',
            description: `Platform commission (${commissionRate}%) for trip ${tripCode}`,
            amount: Math.round(platformCommission),
            direction: 'DEBIT',
            paymentStatus: 'PENDING',
          },
        })

        return trip
      })

      return result
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to match transporter: ${msg}`)
    }
  }

  /**
   * Accept a matched request (transporter confirms).
   */
  static async acceptMatch(tripId: string, tenantId: string) {
    const trip = await db.transportTrip.findFirst({ where: { id: tripId, tenantId } })
    if (!trip) throw new Error('Trip not found')
    if (trip.status !== 'ASSIGNED') throw new Error(`Cannot accept trip in ${trip.status} status`)

    await db.transportRequest.update({
      where: { id: trip.requestId },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    })

    return await db.transportTrip.update({
      where: { id: tripId },
      data: { status: 'PICKED_UP', pickedUpAt: new Date() },
    })
  }

  // ──────────────────────────────────────────────────────────────────────
  // TRIP LIFECYCLE
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Update trip status through the lifecycle.
   */
  static async updateTripStatus(tripId: string, tenantId: string, update: TripStatusUpdate) {
    try {
      const trip = await db.transportTrip.findFirst({
        where: { id: tripId, tenantId },
        include: { request: true, vehicle: true, transporter: true },
      })
      if (!trip) throw new Error('Trip not found')

      // Validate transition
      const allowed = TRIP_TRANSITIONS[trip.status] || []
      if (!allowed.includes(update.status)) {
        throw new Error(`Cannot transition trip from ${trip.status} to ${update.status}`)
      }

      const updateData: Record<string, unknown> = { status: update.status }

      // Handle each status transition
      switch (update.status) {
        case 'PICKED_UP':
          updateData.pickedUpAt = new Date()
          await db.transportRequest.update({
            where: { id: trip.requestId },
            data: { status: 'PICKED_UP', pickupAt: new Date() },
          })
          break

        case 'IN_TRANSIT':
          updateData.departedAt = new Date()
          await db.transportRequest.update({
            where: { id: trip.requestId },
            data: { status: 'IN_TRANSIT' },
          })
          break

        case 'ARRIVED':
          updateData.arrivedAt = new Date()
          break

        case 'DELIVERED': {
          updateData.deliveredAt = new Date()
          if (update.actualDistanceKm) updateData.actualDistanceKm = update.actualDistanceKm
          if (update.actualDurationMin) updateData.actualDurationMin = update.actualDurationMin

          // Calculate actual duration if not provided
          if (!update.actualDurationMin && trip.pickedUpAt) {
            const ms = new Date().getTime() - trip.pickedUpAt.getTime()
            updateData.actualDurationMin = Math.round(ms / 60000)
          }

          // Update request as delivered
          await db.transportRequest.update({
            where: { id: trip.requestId },
            data: {
              status: 'DELIVERED',
              deliveredAt: new Date(),
              deliveryNote: update.deliveryNote || null,
              podPhotoUrl: update.podPhotoUrl || null,
              podSignedBy: update.podSignedBy || null,
            },
          })

          // Release vehicle
          await db.transportVehicle.update({
            where: { id: trip.vehicleId },
            data: { isAvailable: true, currentTripId: null },
          })

          // Update transporter stats
          await db.transporter.update({
            where: { id: trip.transporterId },
            data: {
              totalTrips: { increment: 1 },
              totalEarnings: { increment: trip.transporterEarnings },
            },
          })

          // Create trip fee charge (CREDIT to transporter)
          await db.transportCharge.create({
            data: {
              tenantId,
              tripId: trip.id,
              transporterId: trip.transporterId,
              chargeType: 'TRIP_FEE',
              description: `Earnings for trip ${trip.tripCode}`,
              amount: trip.transporterEarnings,
              direction: 'CREDIT',
              paymentStatus: 'PENDING',
            },
          })

          break
        }

        case 'CANCELLED':
          updateData.cancelledAt = new Date()
          updateData.cancelReason = update.cancelReason || null

          // Release vehicle
          await db.transportVehicle.update({
            where: { id: trip.vehicleId },
            data: { isAvailable: true, currentTripId: null },
          })

          // Update request
          await db.transportRequest.update({
            where: { id: trip.requestId },
            data: { status: 'CANCELLED' },
          })

          break
      }

      return await db.transportTrip.update({
        where: { id: tripId },
        data: updateData as any,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to update trip status: ${msg}`)
    }
  }

  /**
   * List trips with filters.
   */
  static async listTrips(tenantId: string, options?: TransportListOptions): Promise<PaginatedResult<any>> {
    const page = options?.page || 1
    const pageSize = options?.pageSize || 20
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = { tenantId }
    if (options?.status) where.status = options.status
    if (options?.transporterId) where.transporterId = options.transporterId
    if (options?.dateFrom || options?.dateTo) {
      const assignedAt: Record<string, unknown> = {}
      if (options.dateFrom) assignedAt.gte = new Date(options.dateFrom)
      if (options.dateTo) assignedAt.lte = new Date(options.dateTo)
      where.assignedAt = assignedAt
    }
    if (options?.search) {
      where.OR = [
        { tripCode: { contains: options.search, mode: 'insensitive' } },
        { driverName: { contains: options.search, mode: 'insensitive' } },
        { driverPhone: { contains: options.search } },
        { originAddress: { contains: options.search, mode: 'insensitive' } },
        { destinationAddress: { contains: options.search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      db.transportTrip.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: options?.sortBy
          ? { [options.sortBy]: options.sortOrder || 'desc' }
          : { assignedAt: 'desc' },
        include: {
          transporter: { select: { id: true, name: true, transporterCode: true, phone: true } },
          vehicle: { select: { id: true, plateNumber: true, vehicleType: true } },
          request: { select: { requestCode: true, requesterName: true, requesterPhone: true, commodityType: true } },
        },
      }),
      db.transportTrip.count({ where }),
    ])

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  /**
   * Get a single trip with tracking events.
   */
  static async getTrip(id: string, tenantId: string) {
    const trip = await db.transportTrip.findFirst({
      where: { id, tenantId },
      include: {
        transporter: { select: { id: true, name: true, transporterCode: true, phone: true, type: true, rating: true } },
        vehicle: { select: { id: true, plateNumber: true, vehicleType: true, make: true, model: true } },
        request: true,
        trackingEvents: { orderBy: { recordedAt: 'desc' } },
        charges: true,
      },
    })
    if (!trip) throw new Error('Trip not found')
    return trip
  }

  // ──────────────────────────────────────────────────────────────────────
  // TRACKING EVENTS (Phase 2 will add WebSocket; for now, REST API)
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Record a tracking event (GPS ping).
   * Phase 2 will also push this via WebSocket to connected clients.
   */
  static async recordTrackingEvent(tenantId: string, input: CreateTrackingEventInput) {
    try {
      const trip = await db.transportTrip.findFirst({ where: { id: input.tripId, tenantId } })
      if (!trip) throw new Error('Trip not found')
      if (!['PICKED_UP', 'IN_TRANSIT'].includes(trip.status)) {
        throw new Error(`Cannot record tracking for trip in ${trip.status} status`)
      }

      const event = await db.tripTrackingEvent.create({
        data: {
          tripId: input.tripId,
          latitude: input.latitude,
          longitude: input.longitude,
          speedKmh: input.speedKmh,
          heading: input.heading,
          accuracyMeters: input.accuracyMeters,
          eventType: input.eventType || 'LOCATION_UPDATE',
          address: input.address || null,
          district: input.district || null,
          batteryLevel: input.batteryLevel,
          odometerKm: input.odometerKm,
          recordedAt: new Date(),
        },
      })

      // Update vehicle's last known location
      await db.transportVehicle.update({
        where: { id: trip.vehicleId },
        data: {
          lastLatitude: input.latitude,
          lastLongitude: input.longitude,
          lastLocationAt: new Date(),
        },
      })

      return event
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to record tracking event: ${msg}`)
    }
  }

  /**
   * Get tracking events for a trip.
   */
  static async getTrackingEvents(tripId: string, tenantId: string) {
    const trip = await db.transportTrip.findFirst({ where: { id: tripId, tenantId } })
    if (!trip) throw new Error('Trip not found')

    return db.tripTrackingEvent.findMany({
      where: { tripId },
      orderBy: { recordedAt: 'asc' },
    })
  }

  /**
   * Get latest position for a trip (most recent tracking event).
   */
  static async getLatestPosition(tripId: string, tenantId: string) {
    const trip = await db.transportTrip.findFirst({ where: { id: tripId, tenantId } })
    if (!trip) throw new Error('Trip not found')

    const events = await db.tripTrackingEvent.findMany({
      where: { tripId },
      orderBy: { recordedAt: 'desc' },
      take: 1,
    })

    if (events.length === 0) return null
    return events[0]
  }

  // ──────────────────────────────────────────────────────────────────────
  // CHARGES & COMMISSION
  // ──────────────────────────────────────────────────────────────────────

  /**
   * List charges with filters.
   */
  static async listCharges(tenantId: string, options?: TransportListOptions): Promise<PaginatedResult<any>> {
    const page = options?.page || 1
    const pageSize = options?.pageSize || 20
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = { tenantId }
    if (options?.transporterId) where.transporterId = options.transporterId
    if (options?.status) where.paymentStatus = options.status
    if (options?.dateFrom || options?.dateTo) {
      const createdAt: Record<string, unknown> = {}
      if (options.dateFrom) createdAt.gte = new Date(options.dateFrom)
      if (options.dateTo) createdAt.lte = new Date(options.dateTo)
      where.createdAt = createdAt
    }

    const [items, total] = await Promise.all([
      db.transportCharge.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          trip: { select: { id: true, tripCode: true, status: true } },
          transporter: { select: { id: true, name: true, transporterCode: true } },
        },
      }),
      db.transportCharge.count({ where }),
    ])

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  /**
   * Record a manual charge (penalty, bonus, toll, etc.).
   */
  static async createCharge(tenantId: string, data: {
    tripId?: string
    transporterId?: string
    chargeType: string
    description?: string
    amount: number
    direction: string
    currency?: string
  }) {
    return await db.transportCharge.create({
      data: {
        tenantId,
        tripId: data.tripId || null,
        transporterId: data.transporterId || null,
        chargeType: data.chargeType,
        description: data.description || null,
        amount: data.amount,
        currency: data.currency || 'UGX',
        direction: data.direction,
        paymentStatus: 'PENDING',
      },
    })
  }

  /**
   * Get charges summary for a transporter.
   */
  static async getTransporterEarnings(transporterId: string, tenantId: string) {
    const charges = await db.transportCharge.findMany({
      where: { transporterId, tenantId },
    })

    let totalEarnings = 0
    let totalDeductions = 0
    let pendingPayout = 0
    let paidOut = 0

    for (const charge of charges) {
      if (charge.direction === 'CREDIT') {
        totalEarnings += charge.amount
        if (charge.paymentStatus === 'PENDING') pendingPayout += charge.amount
        if (charge.paymentStatus === 'PAID') paidOut += charge.amount
      } else {
        totalDeductions += charge.amount
      }
    }

    return {
      totalEarnings: Math.round(totalEarnings),
      totalDeductions: Math.round(totalDeductions),
      netEarnings: Math.round(totalEarnings - totalDeductions),
      pendingPayout: Math.round(pendingPayout),
      paidOut: Math.round(paidOut),
      chargeCount: charges.length,
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // ANALYTICS / SUMMARY
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Get transport module summary for dashboard.
   */
  static async getSummary(tenantId: string): Promise<TransportSummary> {
    const [
      totalTransporters,
      activeTransporters,
      totalVehicles,
      availableVehicles,
      totalRequests,
      requestByStatus,
      totalTrips,
      tripByStatus,
      vehicleByType,
      revenueAgg,
    ] = await Promise.all([
      db.transporter.count({ where: { tenantId } }),
      db.transporter.count({ where: { tenantId, status: 'ACTIVE' } }),
      db.transportVehicle.count({ where: { tenantId, isActive: true } }),
      db.transportVehicle.count({ where: { tenantId, isActive: true, isAvailable: true } }),
      db.transportRequest.count({ where: { tenantId } }),
      db.transportRequest.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
      db.transportTrip.count({ where: { tenantId } }),
      db.transportTrip.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
      db.transportVehicle.groupBy({ by: ['vehicleType'], where: { tenantId, isActive: true }, _count: true }),
      db.transportTrip.aggregate({
        where: { tenantId, status: 'DELIVERED' },
        _sum: { agreedCost: true, platformCommission: true, transporterEarnings: true },
      }),
    ])

    const requestStatusBreakdown: Record<string, number> = {}
    for (const row of requestByStatus) requestStatusBreakdown[row.status] = row._count

    const tripStatusBreakdown: Record<string, number> = {}
    for (const row of tripByStatus) tripStatusBreakdown[row.status] = row._count

    const vehicleTypeBreakdown: Record<string, number> = {}
    for (const row of vehicleByType) vehicleTypeBreakdown[row.vehicleType] = row._count

    // Get average rating
    const ratingResult = await db.transporter.aggregate({
      where: { tenantId, status: 'ACTIVE', rating: { not: null } },
      _avg: { rating: true },
    })

    // Get top routes
    const topRoutes = await db.transportTrip.groupBy({
      by: ['originAddress', 'destinationAddress'],
      where: { tenantId, status: 'DELIVERED' },
      _count: true,
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    })

    return {
      totalTransporters,
      activeTransporters,
      totalVehicles,
      availableVehicles,
      totalRequests,
      openRequests: requestStatusBreakdown['OPEN'] || 0,
      inProgressRequests: (requestStatusBreakdown['MATCHING'] || 0) +
                          (requestStatusBreakdown['MATCHED'] || 0) +
                          (requestStatusBreakdown['ACCEPTED'] || 0) +
                          (requestStatusBreakdown['PICKED_UP'] || 0) +
                          (requestStatusBreakdown['IN_TRANSIT'] || 0),
      completedRequests: requestStatusBreakdown['DELIVERED'] || 0,
      totalTrips,
      activeTrips: (tripStatusBreakdown['ASSIGNED'] || 0) +
                   (tripStatusBreakdown['PICKED_UP'] || 0) +
                   (tripStatusBreakdown['IN_TRANSIT'] || 0),
      completedTrips: tripStatusBreakdown['DELIVERED'] || 0,
      totalRevenue: revenueAgg._sum.agreedCost || 0,
      totalCommission: revenueAgg._sum.platformCommission || 0,
      transporterEarnings: revenueAgg._sum.transporterEarnings || 0,
      averageRating: ratingResult._avg.rating || 0,
      requestStatusBreakdown,
      tripStatusBreakdown,
      vehicleTypeBreakdown,
      topRoutes: topRoutes.map((r) => ({
        origin: r.originAddress,
        destination: r.destinationAddress,
        count: r._count,
      })),
    }
  }
}