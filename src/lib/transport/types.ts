/**
 * Agrobase V3 — Transport Types
 * "Mini Uber for Transporters" type definitions
 */

// ─── Enums as union types ─────────────────────────────────────────────────

export type VehicleType = 'MOTORBIKE' | 'MINI_TRUCK' | 'PICKUP' | 'LORRY' | 'TRAILER' | 'VAN'
export type TransporterType = 'INDIVIDUAL' | 'COMPANY'
export type TransporterStatus = 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'SUSPENDED'
export type RequesterType = 'EXPORTER' | 'COOPERATIVE' | 'AGENT' | 'FARMER' | 'COMPANY'
export type CommodityCategory = 'AGRICULTURAL' | 'NON_AGRICULTURAL'
export type RequestStatus = 'OPEN' | 'MATCHING' | 'MATCHED' | 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'
export type TripStatus = 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'UNPAID' | 'PAID' | 'PROCESSING'
export type ChargePaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'WAIVED'
export type ChargeType = 'TRIP_FEE' | 'COMMISSION' | 'INSURANCE' | 'PARKING' | 'TOLL' | 'PENALTY' | 'BONUS' | 'ADJUSTMENT'
export type ChargeDirection = 'DEBIT' | 'CREDIT'
export type TrackingEventType = 'LOCATION_UPDATE' | 'PICKUP' | 'DEPARTURE' | 'WAYPOINT' | 'ARRIVAL' | 'DELIVERY' | 'STOP' | 'IDLE'

// ─── Transporter ──────────────────────────────────────────────────────────

export interface CreateTransporterInput {
  name: string
  type: TransporterType
  phone: string
  email?: string
  contactName?: string
  nationalIdNo?: string
  photoUrl?: string
  operatingRegions?: string[]
  commodityTypes?: string[]
  bankName?: string
  bankAccountNo?: string
  bankBranch?: string
  commissionRate?: number
}

export interface UpdateTransporterInput {
  name?: string
  phone?: string
  email?: string
  contactName?: string
  nationalIdNo?: string
  photoUrl?: string
  operatingRegions?: string[]
  commodityTypes?: string[]
  bankName?: string
  bankAccountNo?: string
  bankBranch?: string
  commissionRate?: number
  isAvailable?: boolean
}

// ─── Transport Vehicle ────────────────────────────────────────────────────

export interface CreateTransportVehicleInput {
  transporterId: string
  plateNumber: string
  vehicleType: VehicleType
  make?: string
  model?: string
  year?: number
  color?: string
  capacityKg?: number
  capacityVolume?: number
  palletSpaces?: number
  driverName: string
  driverPhone: string
  driverLicenseNo?: string
  insuranceExpiry?: string
  inspectionExpiry?: string
  roadLicenseExpiry?: string
}

export interface UpdateTransportVehicleInput {
  plateNumber?: string
  vehicleType?: VehicleType
  make?: string
  model?: string
  year?: number
  color?: string
  capacityKg?: number
  capacityVolume?: number
  palletSpaces?: number
  driverName?: string
  driverPhone?: string
  driverLicenseNo?: string
  insuranceExpiry?: string
  inspectionExpiry?: string
  roadLicenseExpiry?: string
  isActive?: boolean
  isAvailable?: boolean
}

// ─── Transport Request ────────────────────────────────────────────────────

export interface CreateTransportRequestInput {
  requestedBy: string
  requesterName: string
  requesterPhone: string
  requesterType: RequesterType
  pickupAddress: string
  pickupLatitude?: number
  pickupLongitude?: number
  pickupDistrict?: string
  dropoffAddress: string
  dropoffLatitude?: number
  dropoffLongitude?: number
  dropoffDistrict?: string
  commodityType: string
  commodityCategory: CommodityCategory
  weightKg?: number
  volumeM3?: number
  quantityBags?: number
  requiresRefrigeration?: boolean
  preferredVehicleType?: VehicleType
  vehicleTypeRequired?: boolean
  requestedPickupTime?: string
  isUrgent?: boolean
  proposedBudget?: number
  relatedId?: string
  relatedType?: string
  eudrBatchId?: string
}

// ─── Cost Estimation ──────────────────────────────────────────────────────

export interface CostEstimateInput {
  pickupLatitude?: number
  pickupLongitude?: number
  dropoffLatitude?: number
  dropoffLongitude?: number
  vehicleType?: VehicleType
  weightKg?: number
  distanceKm?: number
  isUrgent?: boolean
  commodityCategory?: CommodityCategory
}

export interface CostEstimateResult {
  estimatedDistanceKm: number
  estimatedDurationMin: number
  baseCost: number
  weightSurcharge: number
  urgencySurcharge: number
  vehicleSurcharge: number
  totalCost: number
  currency: string
}

// ─── Matching ─────────────────────────────────────────────────────────────

export interface MatchTransporterInput {
  requestId: string
  transporterId: string
  vehicleId: string
  agreedCost: number
}

// ─── Trip Lifecycle ───────────────────────────────────────────────────────

export interface TripStatusUpdate {
  status: TripStatus
  actualDistanceKm?: number
  actualDurationMin?: number
  deliveryNote?: string
  podPhotoUrl?: string
  podSignedBy?: string
  cancelReason?: string
}

// ─── Tracking Event ───────────────────────────────────────────────────────

export interface CreateTrackingEventInput {
  tripId: string
  latitude: number
  longitude: number
  speedKmh?: number
  heading?: number
  accuracyMeters?: number
  eventType?: TrackingEventType
  address?: string
  district?: string
  batteryLevel?: number
  odometerKm?: number
}

// ─── Summary / Analytics ──────────────────────────────────────────────────

export interface TransportSummary {
  totalTransporters: number
  activeTransporters: number
  totalVehicles: number
  availableVehicles: number
  totalRequests: number
  openRequests: number
  inProgressRequests: number
  completedRequests: number
  totalTrips: number
  activeTrips: number
  completedTrips: number
  totalRevenue: number
  totalCommission: number
  transporterEarnings: number
  averageRating: number
  requestStatusBreakdown: Record<string, number>
  tripStatusBreakdown: Record<string, number>
  vehicleTypeBreakdown: Record<string, number>
  topRoutes: { origin: string; destination: string; count: number }[]
}

// ─── Pagination ───────────────────────────────────────────────────────────

export interface TransportListOptions {
  page?: number
  pageSize?: number
  status?: string
  vehicleType?: string
  requesterType?: string
  commodityCategory?: string
  transporterId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}