/**
 * Agrobase V3 — Extended Seed Data
 * 
 * Covers models not in the base seed.ts:
 * - Plot GeoJSON (diverse real polygons per plot)
 * - VSLA (transactions, meetings, attendance, loans, repayments, welfare)
 * - Transport (transporters, vehicles, requests, trips, tracking, charges)
 * - Satellite (images, NDVI time series, rainfall, deforestation alerts)
 * - Notifications (templates, notifications, preferences)
 * - Contracts, Invoices, Settlements, Bulk Operations
 * - Warehouses, Stock, Quality, Grades, Partners, Audit Logs
 * - Exchange Rates, Dashboard Widgets, Report Templates, Export Jobs
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// ─── HELPERS ──────────────────────────────────────────────────

function makePolygon(centerLat: number, centerLng: number, radiusDeg: number, points: number = 6): string {
  const coords: number[][] = []
  for (let i = 0; i < points; i++) {
    const angle = (2 * Math.PI * i) / points + (Math.random() * 0.3 - 0.15)
    const r = radiusDeg * (0.8 + Math.random() * 0.4)
    coords.push([
      +(centerLng + r * Math.cos(angle)).toFixed(6),
      +(centerLat + r * Math.sin(angle)).toFixed(6),
    ])
  }
  coords.push(coords[0].slice()) // close ring
  return JSON.stringify({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  })
}

function dateStr(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86400000).toISOString()
}

export async function seedExtended(
  ctx: {
    ugTenant: { id: string }; ekibbo: { id: string }
    users: { id: string }[]; farmers: { id: string; firstName: string; lastName: string; phone: string }[]
    vslaGroups: { id: string }[]
  }
) {
  const { ugTenant, ekibbo, users, farmers, vslaGroups } = ctx
  const u0 = users[0]?.id; const u2 = users[2]?.id; const u3 = users[3]?.id

  // Plot boundaries are now set deterministically in seed.ts — no random updates needed
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. VSLA — transactions, meetings, attendance, loans, repayments
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding VSLA data...')

  // VSLA Savings (20 savings records)
  await db.vslaSaving.createMany({
    data: Array.from({ length: 20 }, (_, i) => ({
      vslaGroupId: vslaGroups[i % 3].id,
      farmerId: farmers[i % 50].id,
      amount: 5000 + Math.floor(Math.random() * 15000),
      sharesBought: 1 + Math.floor(Math.random() * 3),
      status: 'COMPLETED',
    })),
  })

  // VSLA Loans (8 loans)
  const vslaLoans = await db.vslaLoan.createMany({
    data: Array.from({ length: 8 }, (_, i) => ({
      tenantId: ugTenant.id,
      vslaGroupId: vslaGroups[i % 3].id,
      farmerId: farmers[i + 10].id,
      amount: 20000 + Math.floor(Math.random() * 100000),
      interestRate: 10,
      totalRepayable: 22000 + Math.floor(Math.random() * 110000),
      amountRepaid: i < 4 ? (22000 + Math.floor(Math.random() * 110000)) * 0.6 : 0,
      purpose: i % 2 === 0 ? 'School fees' : 'Farm inputs',
      status: ['PENDING', 'APPROVED', 'DISBURSED', 'DISBURSED', 'DISBURSED', 'OVERDUE', 'REPAID', 'REJECTED'][i],
      loanDate: new Date(Date.now() - (30 + i * 14) * 86400000),
      dueDate: new Date(Date.now() + (90 - i * 14) * 86400000),
    })),
  })

  // VSLA Meetings (6 meetings)
  const vslaMeetings = await db.vslaMeeting.createMany({
    data: Array.from({ length: 6 }, (_, i) => ({
      tenantId: ugTenant.id,
      vslaGroupId: vslaGroups[i % 3].id,
      agenda: i % 2 === 0 ? 'Savings collection and loan approvals' : 'Loan repayment collection',
      meetingDate: new Date(Date.now() - (i * 7) * 86400000),
      meetingType: 'REGULAR',
      startTime: `${10 + (i % 3)}:00`,
      endTime: `${12 + (i % 2)}:00`,
      notes: 'Weekly VSLA group meeting',
      status: i < 5 ? 'CONCLUDED' : 'SCHEDULED',
      createdById: u2,
    })),
  })

  // VSLA Transactions (15 transactions)
  await db.vslaTransaction.createMany({
    data: [
      { vslaGroupId: vslaGroups[0].id, type: 'SAVING', amount: 5000, description: 'Weekly savings', status: 'COMPLETED' },
      { vslaGroupId: vslaGroups[0].id, type: 'SAVING', amount: 10000, description: 'Extra savings', status: 'COMPLETED' },
      { vslaGroupId: vslaGroups[0].id, type: 'LOAN_DISBURSEMENT', amount: 50000, description: 'Loan to James M.', status: 'COMPLETED' },
      { vslaGroupId: vslaGroups[0].id, type: 'LOAN_REPAYMENT', amount: 15000, description: 'Repayment from James M.', status: 'COMPLETED' },
      { vslaGroupId: vslaGroups[0].id, type: 'WELFARE', amount: 20000, description: 'Bereavement support', status: 'COMPLETED' },
      { vslaGroupId: vslaGroups[1].id, type: 'SAVING', amount: 3000, description: 'Weekly savings', status: 'COMPLETED' },
      { vslaGroupId: vslaGroups[1].id, type: 'LOAN_DISBURSEMENT', amount: 80000, description: 'Farm input loan', status: 'COMPLETED' },
      { vslaGroupId: vslaGroups[1].id, type: 'FINE', amount: 2000, description: 'Late arrival fine', status: 'COMPLETED' },
      { vslaGroupId: vslaGroups[2].id, type: 'SAVING', amount: 4000, description: 'Weekly savings', status: 'COMPLETED' },
      { vslaGroupId: vslaGroups[2].id, type: 'SAVING', amount: 4000, description: 'Weekly savings', status: 'COMPLETED' },
      { vslaGroupId: vslaGroups[2].id, type: 'LOAN_DISBURSEMENT', amount: 35000, description: 'Emergency loan', status: 'COMPLETED' },
      { vslaGroupId: vslaGroups[2].id, type: 'LOAN_REPAYMENT', amount: 10000, description: 'Partial repayment', status: 'COMPLETED' },
      { vslaGroupId: vslaGroups[0].id, type: 'SHARE_REDEEM', amount: 5000, description: 'Share redemption', status: 'COMPLETED' },
      { vslaGroupId: vslaGroups[1].id, type: 'LOAN_REPAYMENT', amount: 25000, description: 'Monthly repayment', status: 'COMPLETED' },
      { vslaGroupId: vslaGroups[2].id, type: 'WELFARE', amount: 15000, description: 'Medical support', status: 'COMPLETED' },
    ],
  })

  // Welfare Payments (3)
  await db.welfarePayment.createMany({
    data: [
      { vslaGroupId: vslaGroups[0].id, farmerId: farmers[5].id, amount: 20000, reason: 'Bereavement support for family' },
      { vslaGroupId: vslaGroups[2].id, farmerId: farmers[15].id, amount: 15000, reason: 'Medical emergency' },
      { vslaGroupId: vslaGroups[1].id, farmerId: farmers[25].id, amount: 10000, reason: 'Child school fees support' },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. TRANSPORT — transporters, vehicles, requests, trips
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Transport data...')

  const transporters = await Promise.all([
    db.transporter.create({
      data: {
        tenantId: ugTenant.id, transporterCode: 'TRP-000001', name: 'Robert Kiwanuka',
        type: 'INDIVIDUAL', phone: '+256772000001', nationalIdNo: 'CM12345678',
        operatingRegions: JSON.stringify(['Kampala', 'Jinja', 'Mukono']),
        commodityTypes: JSON.stringify(['COFFEE', 'MAIZE', 'GENERAL']),
        status: 'ACTIVE', verifiedBy: u2, verifiedAt: new Date(),
        isAvailable: true, rating: 4.5, totalTrips: 145, totalEarnings: 8500000,
      },
    }),
    db.transporter.create({
      data: {
        tenantId: ugTenant.id, transporterCode: 'TRP-000002', name: 'Green Haulers Ltd',
        type: 'COMPANY', phone: '+256772000002', email: 'info@greenhaulers.ug',
        contactName: 'Samuel Ochieng',
        operatingRegions: JSON.stringify(['Kampala', 'Gulu', 'Lira', 'Mbale']),
        commodityTypes: JSON.stringify(['COFFEE', 'GENERAL_GOODS']),
        status: 'ACTIVE', verifiedBy: u2, verifiedAt: new Date(),
        isAvailable: true, rating: 4.2, totalTrips: 320, totalEarnings: 28000000,
        commissionRate: 5,
      },
    }),
    db.transporter.create({
      data: {
        tenantId: ugTenant.id, transporterCode: 'TRP-000003', name: 'Grace Akello',
        type: 'INDIVIDUAL', phone: '+256772000003',
        operatingRegions: JSON.stringify(['Gulu', 'Kitgum', 'Lira']),
        commodityTypes: JSON.stringify(['MAIZE', 'BEANS', 'GENERAL']),
        status: 'VERIFIED', isAvailable: true, rating: 4.8, totalTrips: 67, totalEarnings: 3200000,
      },
    }),
  ])

  const vehicles = await Promise.all([
    db.transportVehicle.create({
      data: {
        tenantId: ugTenant.id, transporterId: transporters[0].id, plateNumber: 'UAX 321A',
        vehicleType: 'PICKUP', make: 'Toyota', model: 'Hilux', year: 2020, color: 'White',
        capacityKg: 1500, driverName: 'Robert Kiwanuka', driverPhone: '+256772000001',
        isActive: true, isAvailable: true,
      },
    }),
    db.transportVehicle.create({
      data: {
        tenantId: ugTenant.id, transporterId: transporters[1].id, plateNumber: 'UAX 456B',
        vehicleType: 'LORRY', make: 'Isuzu', model: 'NQR', year: 2019, color: 'Blue',
        capacityKg: 8000, driverName: 'Peter Ochan', driverPhone: '+256773000001',
        isActive: true, isAvailable: true,
      },
    }),
    db.transportVehicle.create({
      data: {
        tenantId: ugTenant.id, transporterId: transporters[1].id, plateNumber: 'UAX 789C',
        vehicleType: 'TRAILER', make: 'Mercedes', model: 'Actros', year: 2021, color: 'White',
        capacityKg: 28000, driverName: 'David Okello', driverPhone: '+256773000002',
        isActive: true, isAvailable: false, currentTripId: 'in-transit',
      },
    }),
    db.transportVehicle.create({
      data: {
        tenantId: ugTenant.id, transporterId: transporters[2].id, plateNumber: 'UAX 654D',
        vehicleType: 'MINI_TRUCK', make: 'Toyota', model: 'Dyna', year: 2022, color: 'Silver',
        capacityKg: 3000, driverName: 'Grace Akello', driverPhone: '+256772000003',
        isActive: true, isAvailable: true,
      },
    }),
  ])

  // Transport Requests (8)
  const treqs = await db.transportRequest.createMany({
    data: [
      { tenantId: ugTenant.id, requestCode: 'TREQ-000001', requestedBy: u2, requesterName: 'John Okello', requesterPhone: '+256700000010', requesterType: 'COOPERATIVE', pickupAddress: 'Kibale District, Kibale Town', pickupLatitude: 0.95, pickupLongitude: 30.25, pickupDistrict: 'Kibale', dropoffAddress: 'Kampala Warehouse, Namanve', dropoffLatitude: 0.347, dropoffLongitude: 32.65, dropoffDistrict: 'Kampala', commodityType: 'COFFEE', commodityCategory: 'AGRICULTURAL', weightKg: 5000, quantityBags: 100, status: 'DELIVERED', matchedTransporterId: transporters[1].id, matchedVehicleId: vehicles[1].id, estimatedCost: 850000, finalCost: 800000, requestedPickupTime: new Date(Date.now() - 5 * 86400000), acceptedAt: new Date(Date.now() - 4 * 86400000), pickupAt: new Date(Date.now() - 4 * 86400000), deliveredAt: new Date(Date.now() - 2 * 86400000) },
      { tenantId: ugTenant.id, requestCode: 'TREQ-000002', requestedBy: u2, requesterName: 'Grace Achieng', requesterPhone: '+256700000011', requesterType: 'AGENT', pickupAddress: 'Mbale Town Market', pickupLatitude: 1.07, pickupLongitude: 34.18, pickupDistrict: 'Mbale', dropoffAddress: 'Jinja Coffee Factory', dropoffLatitude: 0.43, dropoffLongitude: 33.21, dropoffDistrict: 'Jinja', commodityType: 'COFFEE', commodityCategory: 'AGRICULTURAL', weightKg: 2000, quantityBags: 40, status: 'IN_TRANSIT', matchedTransporterId: transporters[0].id, matchedVehicleId: vehicles[0].id, estimatedCost: 350000, finalCost: 320000, requestedPickupTime: new Date(Date.now() - 1 * 86400000), acceptedAt: new Date(Date.now() - 1 * 86400000), pickupAt: new Date(Date.now() - 0.5 * 86400000) },
      { tenantId: ugTenant.id, requestCode: 'TREQ-000003', requestedBy: u2, requesterName: 'John Okello', requesterPhone: '+256700000010', requesterType: 'COOPERATIVE', pickupAddress: 'Gulu Town', pickupLatitude: 2.77, pickupLongitude: 32.30, pickupDistrict: 'Gulu', dropoffAddress: 'Kampala', dropoffLatitude: 0.31, dropoffLongitude: 32.58, dropoffDistrict: 'Kampala', commodityType: 'MAIZE', commodityCategory: 'AGRICULTURAL', weightKg: 10000, quantityBags: 200, status: 'MATCHED', matchedTransporterId: transporters[2].id, matchedVehicleId: vehicles[3].id, estimatedCost: 1200000, finalCost: 1100000, acceptedAt: new Date(Date.now() - 0.5 * 86400000) },
      { tenantId: ugTenant.id, requestCode: 'TREQ-000004', requestedBy: u2, requesterName: 'John Okello', requesterPhone: '+256700000010', requesterType: 'COOPERATIVE', pickupAddress: 'Kibale', pickupLatitude: 0.95, pickupLongitude: 30.25, pickupDistrict: 'Kibale', dropoffAddress: 'Mombasa Port', dropoffLatitude: -4.05, dropoffLongitude: 39.67, dropoffDistrict: 'Mombasa', commodityType: 'COFFEE', commodityCategory: 'AGRICULTURAL', weightKg: 25000, quantityBags: 500, status: 'OPEN', estimatedCost: 3500000, isUrgent: false },
      { tenantId: ugTenant.id, requestCode: 'TREQ-000005', requestedBy: u2, requesterName: 'Grace Achieng', requesterPhone: '+256700000011', requesterType: 'AGENT', pickupAddress: 'Mt. Elgon', pickupLatitude: 1.10, pickupLongitude: 34.35, pickupDistrict: 'Mbale', dropoffAddress: 'Kampala', dropoffLatitude: 0.31, dropoffLongitude: 32.58, dropoffDistrict: 'Kampala', commodityType: 'COFFEE', commodityCategory: 'AGRICULTURAL', weightKg: 3000, quantityBags: 60, status: 'DELIVERED', matchedTransporterId: transporters[0].id, matchedVehicleId: vehicles[0].id, estimatedCost: 500000, finalCost: 480000, deliveredAt: new Date(Date.now() - 10 * 86400000) },
      { tenantId: ugTenant.id, requestCode: 'TREQ-000006', requestedBy: u2, requesterName: 'John Okello', requesterPhone: '+256700000010', requesterType: 'COOPERATIVE', pickupAddress: 'Jinja', pickupLatitude: 0.43, pickupLongitude: 33.21, pickupDistrict: 'Jinja', dropoffAddress: 'Gulu', dropoffLatitude: 2.77, dropoffLongitude: 32.30, dropoffDistrict: 'Gulu', commodityType: 'MAIZE', commodityCategory: 'AGRICULTURAL', weightKg: 5000, quantityBags: 100, status: 'CANCELLED', cancellationReason: 'Truck breakdown', estimatedCost: 600000 },
      { tenantId: ugTenant.id, requestCode: 'TREQ-000007', requestedBy: u2, requesterName: 'John Okello', requesterPhone: '+256700000010', requesterType: 'COOPERATIVE', pickupAddress: 'Lira Town', pickupLatitude: 2.25, pickupLongitude: 32.90, pickupDistrict: 'Lira', dropoffAddress: 'Kampala', dropoffDistrict: 'Kampala', commodityType: 'GENERAL_GOODS', commodityCategory: 'NON_AGRICULTURAL', weightKg: 8000, status: 'OPEN', estimatedCost: 900000 },
      { tenantId: ugTenant.id, requestCode: 'TREQ-000008', requestedBy: u2, requesterName: 'Grace Achieng', requesterPhone: '+256700000011', requesterType: 'AGENT', pickupAddress: 'Kibale', pickupDistrict: 'Kibale', dropoffAddress: 'Kampala', dropoffDistrict: 'Kampala', commodityType: 'COFFEE', commodityCategory: 'AGRICULTURAL', weightKg: 15000, quantityBags: 300, status: 'OPEN', estimatedCost: 1800000, isUrgent: true },
    ],
  })

  // Transport Trips (3 completed/in-progress)
  const trips = await db.transportTrip.createMany({
    data: [
      { tenantId: ugTenant.id, tripCode: 'TRP-TRIP-000001', requestId: 'TREQ-000001', transporterId: transporters[1].id, vehicleId: vehicles[1].id, driverName: 'Peter Ochan', driverPhone: '+256773000001', originAddress: 'Kibale District', originLatitude: 0.95, originLongitude: 30.25, destinationAddress: 'Kampala Warehouse', destinationLatitude: 0.347, destinationLongitude: 32.65, estimatedDistanceKm: 320, actualDistanceKm: 315, estimatedDurationMin: 360, actualDurationMin: 345, commodityType: 'COFFEE', commodityCategory: 'AGRICULTURAL', weightKg: 5000, agreedCost: 800000, platformCommission: 40000, transporterEarnings: 760000, paymentStatus: 'PAID', paidAt: new Date(Date.now() - 2 * 86400000), status: 'DELIVERED', assignedAt: new Date(Date.now() - 4 * 86400000), pickedUpAt: new Date(Date.now() - 4 * 86400000), departedAt: new Date(Date.now() - 3.5 * 86400000), arrivedAt: new Date(Date.now() - 2.5 * 86400000), deliveredAt: new Date(Date.now() - 2 * 86400000) },
      { tenantId: ugTenant.id, tripCode: 'TRP-TRIP-000002', requestId: 'TREQ-000002', transporterId: transporters[0].id, vehicleId: vehicles[0].id, driverName: 'Robert Kiwanuka', driverPhone: '+256772000001', originAddress: 'Mbale Town', originLatitude: 1.07, originLongitude: 34.18, destinationAddress: 'Jinja Factory', destinationLatitude: 0.43, destinationLongitude: 33.21, estimatedDistanceKm: 180, commodityType: 'COFFEE', commodityCategory: 'AGRICULTURAL', weightKg: 2000, agreedCost: 320000, platformCommission: 16000, transporterEarnings: 304000, paymentStatus: 'UNPAID', status: 'IN_TRANSIT', assignedAt: new Date(Date.now() - 1 * 86400000), pickedUpAt: new Date(Date.now() - 0.5 * 86400000), departedAt: new Date(Date.now() - 0.5 * 86400000) },
      { tenantId: ugTenant.id, tripCode: 'TRP-TRIP-000003', requestId: 'TREQ-000005', transporterId: transporters[0].id, vehicleId: vehicles[0].id, driverName: 'Robert Kiwanuka', driverPhone: '+256772000001', originAddress: 'Mt. Elgon', originLatitude: 1.10, originLongitude: 34.35, destinationAddress: 'Kampala', destinationLatitude: 0.31, destinationLongitude: 32.58, estimatedDistanceKm: 280, actualDistanceKm: 275, commodityType: 'COFFEE', commodityCategory: 'AGRICULTURAL', weightKg: 3000, agreedCost: 480000, platformCommission: 24000, transporterEarnings: 456000, paymentStatus: 'PAID', paidAt: new Date(Date.now() - 9 * 86400000), status: 'DELIVERED', assignedAt: new Date(Date.now() - 12 * 86400000), pickedUpAt: new Date(Date.now() - 11 * 86400000), departedAt: new Date(Date.now() - 11 * 86400000), arrivedAt: new Date(Date.now() - 10.5 * 86400000), deliveredAt: new Date(Date.now() - 10 * 86400000) },
    ],
  })

  // Transport Charges (6)
  await db.transportCharge.createMany({
    data: [
      { tenantId: ugTenant.id, tripId: 'TRP-TRIP-000001', transporterId: transporters[1].id, chargeType: 'TRIP_FEE', description: 'Kibale to Kampala coffee haul', amount: 800000, direction: 'CREDIT', paymentStatus: 'PAID', paymentMethod: 'MOBILE_MONEY', paidAt: new Date(Date.now() - 2 * 86400000) },
      { tenantId: ugTenant.id, tripId: 'TRP-TRIP-000001', transporterId: transporters[1].id, chargeType: 'COMMISSION', description: 'Platform commission 5%', amount: 40000, direction: 'DEBIT', paymentStatus: 'PAID', paidAt: new Date(Date.now() - 2 * 86400000) },
      { tenantId: ugTenant.id, tripId: 'TRP-TRIP-000002', transporterId: transporters[0].id, chargeType: 'TRIP_FEE', description: 'Mbale to Jinja coffee', amount: 320000, direction: 'CREDIT', paymentStatus: 'PENDING' },
      { tenantId: ugTenant.id, tripId: 'TRP-TRIP-000003', transporterId: transporters[0].id, chargeType: 'TRIP_FEE', description: 'Mt. Elgon to Kampala', amount: 480000, direction: 'CREDIT', paymentStatus: 'PAID', paymentMethod: 'BANK', paidAt: new Date(Date.now() - 9 * 86400000) },
      { tenantId: ugTenant.id, tripId: 'TRP-TRIP-000003', transporterId: transporters[0].id, chargeType: 'COMMISSION', description: 'Platform commission', amount: 24000, direction: 'DEBIT', paymentStatus: 'PAID', paidAt: new Date(Date.now() - 9 * 86400000) },
      { tenantId: ugTenant.id, transporterId: transporters[1].id, chargeType: 'PARKING', description: 'Kampala staging area parking', amount: 10000, direction: 'DEBIT', paymentStatus: 'WAIVED' },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. SATELLITE — images, NDVI, rainfall, deforestation alerts
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Satellite data...')

  // Satellite Images (6)
  await db.satelliteImage.createMany({
    data: [
      { tenantId: ugTenant.id, source: 'SENTINEL2', acquisitionDate: new Date('2025-06-01'), bbox: JSON.stringify([30.24, 0.94, 30.26, 0.96]), resolution: 10, cloudCover: 5.2 },
      { tenantId: ugTenant.id, source: 'SENTINEL2', acquisitionDate: new Date('2025-09-01'), bbox: JSON.stringify([30.24, 0.94, 30.26, 0.96]), resolution: 10, cloudCover: 8.1 },
      { tenantId: ugTenant.id, source: 'SENTINEL2', acquisitionDate: new Date('2025-12-01'), bbox: JSON.stringify([30.24, 0.94, 30.26, 0.96]), resolution: 10, cloudCover: 3.5 },
      { tenantId: ugTenant.id, source: 'SENTINEL2', acquisitionDate: new Date('2026-03-01'), bbox: JSON.stringify([30.24, 0.94, 30.26, 0.96]), resolution: 10, cloudCover: 12.0 },
      { tenantId: ugTenant.id, source: 'LANDSAT8', acquisitionDate: new Date('2025-07-15'), bbox: JSON.stringify([32.28, 2.76, 32.32, 2.79]), resolution: 30, cloudCover: 15.3 },
      { tenantId: ugTenant.id, source: 'SENTINEL2', acquisitionDate: new Date('2026-06-01'), bbox: JSON.stringify([34.16, 1.05, 34.19, 1.08]), resolution: 10, cloudCover: 6.7 },
    ],
  })

  // NDVI Time Series (24 data points — monthly for 2 farms over 12 months)
  const ndviData: { tenantId: string; farmId: string; plotId?: string; date: string; ndviValue: number; source: string }[] = []
  const farms = await db.farmLand.findMany({ take: 3, select: { id: true } })
  for (const farm of farms) {
    for (let m = 0; m < 12; m++) {
      const month = new Date(2025, m, 15)
      const seasonFactor = Math.sin(((m - 2) / 12) * 2 * Math.PI) * 0.2 // peak in March (growing)
      ndviData.push({
        tenantId: ugTenant.id,
        farmId: farm.id,
        date: month.toISOString().split('T')[0],
        ndviValue: Math.max(0.15, Math.min(0.85, 0.55 + seasonFactor + (Math.random() - 0.5) * 0.1)),
        source: 'SENTINEL2',
      })
    }
  }
  if (ndviData.length > 0) await db.ndvTimeSeries.createMany({ data: ndviData })

  // Rainfall Records (20)
  const rainfallData: { tenantId: string; latitude: number; longitude: number; date: string; rainfallMm: number }[] = []
  const locations = [
    { lat: 0.95, lng: 30.25 }, // Kibale
    { lat: 2.77, lng: 32.30 }, // Gulu
    { lat: 1.07, lng: 34.18 }, // Mbale
    { lat: 0.31, lng: 32.58 }, // Kampala
  ]
  for (const loc of locations) {
    for (let d = 0; d < 5; d++) {
      rainfallData.push({
        tenantId: ugTenant.id,
        latitude: loc.lat,
        longitude: loc.lng,
        date: new Date(Date.now() - d * 7 * 86400000).toISOString().split('T')[0],
        rainfallMm: Math.max(0, 15 + Math.random() * 60 - d * 5),
      })
    }
  }
  if (rainfallData.length > 0) await db.rainfallRecord.createMany({ data: rainfallData })

  // Deforestation Alerts (3)
  await db.deforestationAlert.createMany({
    data: [
      { tenantId: ugTenant.id, severity: 'LOW', areaAffectedHa: 0.2, detectionDate: new Date('2025-11-15'), confidence: 0.72, status: 'DISMISSED', resolvedAt: new Date('2025-12-01'), resolvedBy: u2 },
      { tenantId: ugTenant.id, severity: 'MEDIUM', areaAffectedHa: 0.8, detectionDate: new Date('2026-01-20'), confidence: 0.85, status: 'ACTIVE' },
      { tenantId: ugTenant.id, severity: 'HIGH', areaAffectedHa: 2.5, detectionDate: new Date('2026-03-10'), confidence: 0.92, status: 'CONFIRMED', resolvedBy: u3 },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. NOTIFICATIONS — templates, records, preferences
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Notification data...')

  await db.notificationTemplate.createMany({
    data: [
      { tenantId: ugTenant.id, name: 'Loan Approval', code: 'LOAN_APPROVED', channel: 'SMS', body: 'Your loan of {{amount}} has been approved. Visit your group for disbursement.', variables: '["amount"]' },
      { tenantId: ugTenant.id, name: 'Payment Received', code: 'PAYMENT_RECEIVED', channel: 'SMS', body: 'Payment of {{amount}} UGX received for {{commodity}}. Ref: {{reference}}.', variables: '["amount", "commodity", "reference"]' },
      { tenantId: ugTenant.id, name: 'Training Reminder', code: 'TRAINING_REMINDER', channel: 'SMS', body: 'Reminder: Training on {{topic}} tomorrow at {{time}} at {{location}}.', variables: '["topic", "time", "location"]' },
      { tenantId: ugTenant.id, name: 'Compliance Alert', code: 'COMPLIANCE_ALERT', channel: 'IN_APP', subject: 'EUDR Compliance Alert', body: 'Plot {{plotCode}} has been flagged for deforestation risk level: {{riskLevel}}.', variables: '["plotCode", "riskLevel"]' },
      { tenantId: ugTenant.id, name: 'Welcome', code: 'WELCOME', channel: 'EMAIL', subject: 'Welcome to Agrobase V3', body: 'Hello {{name}}, your account has been created. Login at {{url}}.', variables: '["name", "url"]' },
      { tenantId: ugTenant.id, name: 'VSLA Meeting', code: 'VSLA_MEETING', channel: 'SMS', body: 'VSLA meeting {{date}} at {{location}}. Please attend with your savings.', variables: '["date", "location"]' },
    ],
  })

  await db.notification.createMany({
    data: [
      { tenantId: ugTenant.id, userId: users[4]?.id, channel: 'SMS', category: 'LOAN', body: 'Your crop input loan of UGX 500,000 has been approved.', status: 'DELIVERED', sentAt: new Date(Date.now() - 2 * 86400000), deliveredAt: new Date(Date.now() - 2 * 86400000) },
      { tenantId: ugTenant.id, userId: users[4]?.id, channel: 'SMS', category: 'PAYMENT', body: 'Payment of UGX 150,000 received for Hulled Coffee. Ref: PAY-2026-001.', status: 'DELIVERED', sentAt: new Date(Date.now() - 5 * 86400000), deliveredAt: new Date(Date.now() - 5 * 86400000) },
      { tenantId: ugTenant.id, userId: u2, channel: 'IN_APP', category: 'COMPLIANCE', subject: 'EUDR Alert', body: 'Plot PLT-UG-000005 (Mbale Cocoa Block) flagged as MEDIUM risk.', status: 'READ', sentAt: new Date(Date.now() - 1 * 86400000), deliveredAt: new Date(Date.now() - 1 * 86400000) },
      { tenantId: ugTenant.id, userId: u3, channel: 'IN_APP', category: 'TRAINING', subject: 'Training Tomorrow', body: 'Soil Management training tomorrow 10:00 AM at Kibale Center.', status: 'DELIVERED', sentAt: new Date(Date.now() - 0.5 * 86400000), deliveredAt: new Date(Date.now() - 0.5 * 86400000) },
      { tenantId: ugTenant.id, userId: u2, channel: 'SMS', category: 'TRANSPORT', body: 'Transport request TREQ-000001 delivered to Kampala Warehouse.', status: 'DELIVERED', sentAt: new Date(Date.now() - 2 * 86400000), deliveredAt: new Date(Date.now() - 2 * 86400000) },
      { tenantId: ugTenant.id, userId: u2, channel: 'IN_APP', category: 'SYSTEM', body: 'New carbon credit verification completed for Kibale Agroforestry Project.', status: 'DELIVERED', sentAt: new Date(Date.now() - 3 * 86400000), deliveredAt: new Date(Date.now() - 3 * 86400000) },
      { tenantId: ugTenant.id, recipientPhone: '+256700000020', channel: 'SMS', category: 'VSLA', body: 'VSLA savings of UGX 5,000 recorded. Total shares: 3.', status: 'SENT', sentAt: new Date(Date.now() - 1 * 86400000) },
      { tenantId: ugTenant.id, recipientPhone: '+256700000021', channel: 'SMS', category: 'MARKET', body: 'Market price update: Coffee UGX 8,500/kg, Maize UGX 2,200/kg.', status: 'DELIVERED', sentAt: new Date(Date.now() - 1 * 86400000), deliveredAt: new Date(Date.now() - 1 * 86400000) },
    ],
  })

  await db.notificationPreference.createMany({
    data: [
      { tenantId: ugTenant.id, userId: users[0]?.id, channel: 'IN_APP', enabled: true },
      { tenantId: ugTenant.id, userId: users[2]?.id, channel: 'SMS', enabled: true },
      { tenantId: ugTenant.id, userId: users[2]?.id, channel: 'IN_APP', enabled: true },
      { tenantId: ugTenant.id, userId: users[2]?.id, channel: 'EMAIL', enabled: false },
      { tenantId: ugTenant.id, userId: users[3]?.id, channel: 'SMS', enabled: true },
      { tenantId: ugTenant.id, userId: users[3]?.id, channel: 'IN_APP', enabled: true },
      { tenantId: ugTenant.id, userId: users[4]?.id, channel: 'SMS', enabled: true },
      { tenantId: ugTenant.id, userId: users[4]?.id, channel: 'IN_APP', enabled: true },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. CONTRACTS, INVOICES, SETTLEMENTS, BULK OPS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Contracts, Invoices, Settlements...')

  await db.contract.createMany({
    data: [
      { tenantId: ekibbo.id, contractCode: 'CTR-2026-001', type: 'OFFTAKE', status: 'ACTIVE', buyerName: 'EKIBBO Coffee Exporters', sellerName: 'Kibale Coffee Farmers Group', commodity: 'Coffee', variety: 'ARABICA', grade: 'GRADE_A', quantity: 20000, unitPrice: 8500, totalValue: 170000000, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), deliveryTerms: 'FOB Mombasa', paymentTerms: 'Net 30 days after delivery', signedAt: new Date('2026-01-10'), signedBy: u0 },
      { tenantId: ekibbo.id, contractCode: 'CTR-2026-002', type: 'OFFTAKE', status: 'ACTIVE', buyerName: 'EKIBBO Coffee Exporters', sellerName: 'Mt. Elgon Coffee Group', commodity: 'Coffee', variety: 'ROBUSTA', grade: 'GRADE_B', quantity: 15000, unitPrice: 7200, totalValue: 108000000, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), deliveryTerms: 'EXW Kampala', paymentTerms: 'Net 15 days', signedAt: new Date('2026-01-15'), signedBy: u0 },
      { tenantId: ugTenant.id, contractCode: 'CTR-2026-003', type: 'SUPPLY', status: 'DRAFT', buyerName: 'Tropical Agribusiness Ltd', sellerName: 'Agrobase Uganda', commodity: 'Maize', quantity: 50000, unitPrice: 2200, totalValue: 110000000, startDate: new Date('2026-03-01'), endDate: new Date('2026-08-31') },
    ],
  })

  await db.invoice.createMany({
    data: [
      { tenantId: ugTenant.id, invoiceNumber: 'INV-2026-001', plan: 'STANDARD', billingCycle: 'QUARTERLY', items: JSON.stringify([{ description: 'Agrobase Standard Plan - Q2 2026', amount: 1500000, quantity: 1, total: 1500000 }]), subtotal: 1500000, tax: 180000, taxRate: 18, total: 1680000, currency: 'UGX', status: 'PAID', dueDate: new Date('2026-04-15'), paidAt: new Date('2026-04-10'), paidAmount: 1680000 },
      { tenantId: ugTenant.id, invoiceNumber: 'INV-2026-002', plan: 'STANDARD', billingCycle: 'QUARTERLY', items: JSON.stringify([{ description: 'Agrobase Standard Plan - Q3 2026', amount: 1500000, quantity: 1, total: 1500000 }]), subtotal: 1500000, tax: 180000, taxRate: 18, total: 1680000, currency: 'UGX', status: 'PENDING', dueDate: new Date('2026-07-15') },
      { tenantId: ekibbo.id, invoiceNumber: 'INV-2026-003', plan: 'ENTERPRISE', billingCycle: 'MONTHLY', items: JSON.stringify([{ description: 'Agrobase Enterprise Plan - June 2026', amount: 5000000, quantity: 1, total: 5000000 }]), subtotal: 5000000, tax: 600000, taxRate: 18, total: 5600000, currency: 'UGX', status: 'PAID', dueDate: new Date('2026-06-30'), paidAt: new Date('2026-06-28'), paidAmount: 5600000 },
    ],
  })

  await db.settlement.createMany({
    data: [
      { tenantId: ugTenant.id, sourceType: 'COOPERATIVE_PAYMENT', reference: 'SET-2026-001', beneficiaryName: 'Kibale Coffee Farmers Group', beneficiaryPhone: '+256700000020', grossAmount: 5000000, deductions: 200000, netAmount: 4800000, currency: 'UGX', status: 'COMPLETED', paymentMethod: 'MOBILE_MONEY', initiatedAt: new Date(Date.now() - 5 * 86400000), completedAt: new Date(Date.now() - 4 * 86400000), initiatedBy: u2, approvedBy: u0 },
      { tenantId: ugTenant.id, sourceType: 'COMMISSION', reference: 'SET-2026-002', beneficiaryName: 'James Mugisha', beneficiaryPhone: '+256771000000', grossAmount: 250000, deductions: 0, netAmount: 250000, currency: 'UGX', status: 'COMPLETED', paymentMethod: 'MOBILE_MONEY', initiatedAt: new Date(Date.now() - 3 * 86400000), completedAt: new Date(Date.now() - 3 * 86400000), initiatedBy: u2 },
      { tenantId: ugTenant.id, sourceType: 'MARKETPLACE_PAYOUT', reference: 'SET-2026-003', beneficiaryName: 'Sarah Achieng', beneficiaryPhone: '+256771000001', grossAmount: 180000, deductions: 5000, netAmount: 175000, currency: 'UGX', status: 'PROCESSING', initiatedAt: new Date(Date.now() - 1 * 86400000), initiatedBy: u2 },
      { tenantId: ugTenant.id, sourceType: 'ESCROW', reference: 'SET-2026-004', beneficiaryName: 'Robert Ssentongo', beneficiaryPhone: '+256771000002', grossAmount: 3200000, deductions: 100000, netAmount: 3100000, currency: 'UGX', status: 'PENDING', initiatedAt: new Date(Date.now() - 0.5 * 86400000), initiatedBy: u3 },
    ],
  })

  await db.bulkOperation.createMany({
    data: [
      { tenantId: ugTenant.id, type: 'FARMER_IMPORT', status: 'COMPLETED', fileName: 'farmers_import_2026.csv', fileSize: 45000, totalRows: 50, processedRows: 50, successRows: 48, failedRows: 2, errorSummary: '2 rows failed: duplicate phone numbers', performedBy: u2, startedAt: new Date(Date.now() - 30 * 86400000), completedAt: new Date(Date.now() - 30 * 86400000) },
      { tenantId: ugTenant.id, type: 'PAYMENT_BULK', status: 'COMPLETED', fileName: 'payment_batch_june.csv', fileSize: 12000, totalRows: 25, processedRows: 25, successRows: 25, failedRows: 0, performedBy: u2, startedAt: new Date(Date.now() - 7 * 86400000), completedAt: new Date(Date.now() - 7 * 86400000) },
      { tenantId: ugTenant.id, type: 'FARMER_IMPORT', status: 'FAILED', fileName: 'bad_import.csv', fileSize: 8000, totalRows: 10, processedRows: 3, successRows: 1, failedRows: 2, errorSummary: 'File format error: missing required columns', errorDetails: '{"errors":[{"row":2,"message":"Missing firstName"},{"row":5,"message":"Invalid phone format"}]}', performedBy: u3, startedAt: new Date(Date.now() - 2 * 86400000), completedAt: new Date(Date.now() - 2 * 86400000) },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. WAREHOUSES, STOCK, QUALITY, GRADES, PARTNERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Warehouses, Stock, Quality, Partners...')

  const warehouses = await db.warehouse.createMany({
    data: [
      { tenantId: ugTenant.id, name: 'Kampala Central Warehouse', code: 'WH-KLA-001', address: 'Namanve Industrial Area', country: 'Uganda', region: 'Central', district: 'Kampala', capacity: 100000, isActive: true },
      { tenantId: ugTenant.id, name: 'Gulu Regional Warehouse', code: 'WH-GUL-001', address: 'Gulu Town', country: 'Uganda', region: 'Northern', district: 'Gulu', capacity: 50000, isActive: true },
      { tenantId: ugTenant.id, name: 'Mbale Collection Center', code: 'WH-MBL-001', address: 'Mbale Town', country: 'Uganda', region: 'Eastern', district: 'Mbale', capacity: 25000, isActive: true },
    ],
  })

  // We need to create stock items individually to get their IDs for movements
  const whKla = await db.warehouse.findFirst({ where: { code: 'WH-KLA-001' } })
  const whGul = await db.warehouse.findFirst({ where: { code: 'WH-GUL-001' } })
  const whMbl = await db.warehouse.findFirst({ where: { code: 'WH-MBL-001' } })

  const stock1 = await db.stockItem.create({ data: { tenantId: ugTenant.id, warehouseId: whKla!.id, commodity: 'ARABICA_COFFEE', variety: 'SL14', grade: 'GRADE_A', batchCode: 'BAT-000001', quantity: 1800, unit: 'KG', unitPrice: 8500, minLevel: 500, location: 'Zone A, Bay 1' } })
  const stock2 = await db.stockItem.create({ data: { tenantId: ugTenant.id, warehouseId: whKla!.id, commodity: 'ROBUSTA_COFFEE', variety: 'KR3', grade: 'GRADE_B', batchCode: 'BAT-000003', quantity: 3200, unit: 'KG', unitPrice: 7200, minLevel: 1000, location: 'Zone A, Bay 2' } })
  const stock3 = await db.stockItem.create({ data: { tenantId: ugTenant.id, warehouseId: whGul!.id, commodity: 'MAIZE', grade: 'GRADE_B', batchCode: 'BAT-000002', quantity: 5000, unit: 'KG', unitPrice: 2200, minLevel: 2000, location: 'Zone B' } })
  const stock4 = await db.stockItem.create({ data: { tenantId: ugTenant.id, warehouseId: whMbl!.id, commodity: 'COCOA', grade: 'GRADE_A', batchCode: 'BULK-COCOA-001', quantity: 800, unit: 'KG', unitPrice: 15000, minLevel: 200, location: 'Zone A' } })

  await db.stockMovement.createMany({
    data: [
      { tenantId: ugTenant.id, warehouseId: whKla!.id, stockItemId: stock1.id, type: 'RECEIVE', quantity: 1800, unitPrice: 8500, notes: 'Received from Kibale farmers' },
      { tenantId: ugTenant.id, warehouseId: whKla!.id, stockItemId: stock1.id, type: 'DISPATCH', quantity: 500, notes: 'Export shipment to Mombasa' },
      { tenantId: ugTenant.id, warehouseId: whGul!.id, stockItemId: stock3.id, type: 'RECEIVE', quantity: 12000, unitPrice: 2200, notes: 'Gulu maize harvest intake' },
      { tenantId: ugTenant.id, warehouseId: whMbl!.id, stockItemId: stock4.id, type: 'RECEIVE', quantity: 800, unitPrice: 15000, notes: 'Mbale cocoa collection' },
    ],
  })

  await db.gradeDefinition.createMany({
    data: [
      { tenantId: ugTenant.id, commodity: 'Coffee', grade: 'GRADE_A', description: 'Premium quality - no defects, consistent size, moisture < 12%', criteria: JSON.stringify({ moistureMax: 12, defectMax: 2, screenSize: '15+ screen' }), pricePremium: 15 },
      { tenantId: ugTenant.id, commodity: 'Coffee', grade: 'GRADE_B', description: 'Standard quality - minor defects allowed, moisture < 13%', criteria: JSON.stringify({ moistureMax: 13, defectMax: 5, screenSize: '14+ screen' }), pricePremium: 0 },
      { tenantId: ugTenant.id, commodity: 'Coffee', grade: 'GRADE_C', description: 'Below standard - visible defects, moisture < 14%', criteria: JSON.stringify({ moistureMax: 14, defectMax: 10 }), pricePremium: -10 },
      { tenantId: ugTenant.id, commodity: 'Maize', grade: 'GRADE_A', description: 'Clean, dry, well-formed kernels', criteria: JSON.stringify({ moistureMax: 13, foreignMatterMax: 1 }), pricePremium: 10 },
      { tenantId: ugTenant.id, commodity: 'Maize', grade: 'GRADE_B', description: 'Standard maize', criteria: JSON.stringify({ moistureMax: 14, foreignMatterMax: 3 }), pricePremium: 0 },
    ],
  })

  await db.qualityInspection.createMany({
    data: [
      { tenantId: ugTenant.id, batchCode: 'BAT-000001', commodity: 'ARABICA_COFFEE', sampleWeight: 0.5, parameters: JSON.stringify({ moisture: 11.2, defects: '1%', foreignMatter: '0%', screenSize: '15+', aroma: 'Good', taste: 'Fruity' }), overallScore: 92, grade: 'GRADE_A', passed: true, inspectorId: u2, status: 'APPROVED', notes: 'Excellent quality batch. Ready for export.' },
      { tenantId: ugTenant.id, batchCode: 'BAT-000002', commodity: 'MAIZE', sampleWeight: 1.0, parameters: JSON.stringify({ moisture: 12.8, foreignMatter: '1.5%', testWeight: '72 kg/hl', aflatoxin: 'Below limit' }), overallScore: 78, grade: 'GRADE_B', passed: true, inspectorId: u3, status: 'APPROVED' },
      { tenantId: ugTenant.id, batchCode: 'BULK-COCOA-001', commodity: 'COCOA', sampleWeight: 0.3, parameters: JSON.stringify({ moisture: 7.5, mold: '0%', slate: '0%', cutTest: '85% purple' }), overallScore: 88, grade: 'GRADE_A', passed: true, inspectorId: u2, status: 'APPROVED' },
    ],
  })

  const partner1 = await db.partner.create({ data: { tenantId: ugTenant.id, name: 'Uganda Coffee Development Authority', type: 'REGULATORY', contactName: 'Commissioner Coffee', contactEmail: 'info@ucda.go.ug', contactPhone: '+256414000001', commissionRate: 0 } })
  const partner2 = await db.partner.create({ data: { tenantId: ugTenant.id, name: 'Specialty Coffee Associates', type: 'BUYER', contactName: 'Michael Johnson', contactEmail: 'michael@sca.com', contactPhone: '+120255500001', country: 'USA', commissionRate: 3 } })
  const partner3 = await db.partner.create({ data: { tenantId: ugTenant.id, name: 'East African Commodities Ltd', type: 'BUYER', contactName: 'Hans Mueller', contactEmail: 'hans@eac.de', contactPhone: '+491700000001', country: 'Germany', commissionRate: 2.5 } })

  await db.commissionRule.createMany({
    data: [
      { tenantId: ugTenant.id, partnerId: partner1.id, name: 'Coffee Export Commission', type: 'VOLUME', basis: 'PER_KG', rate: 50, minAmount: 0, maxAmount: 500000, isActive: true },
      { tenantId: ugTenant.id, partnerId: partner2.id, name: 'Specialty Premium Commission', type: 'PERCENTAGE', basis: 'TOTAL_VALUE', rate: 3, minAmount: 100000, isActive: true },
    ],
  })

  await db.commissionSettlement.createMany({
    data: [
      { tenantId: ugTenant.id, partnerId: partner1.id, period: '2026-Q2', amount: 125000, currency: 'UGX', status: 'COMPLETED', paidAt: new Date(Date.now() - 10 * 86400000), paidVia: 'BANK' },
      { tenantId: ugTenant.id, partnerId: partner2.id, period: '2026-Q2', amount: 5400000, currency: 'UGX', status: 'PROCESSING' },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. AUDIT LOGS, EXCHANGE RATES, WIDGETS, REPORTS, EXPORTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Audit, Exchange Rates, Widgets, Reports...')

  await db.auditLog.createMany({
    data: [
      { userId: users[0]?.id, action: 'LOGIN', entityType: 'User', details: 'Super Admin logged in' },
      { userId: u2, action: 'FARMER_CREATE', entityType: 'FarmerProfile', details: 'Created farmer James Mugisha' },
      { userId: u2, action: 'PLOT_VERIFY', entityType: 'Plot', details: 'GPS verification for PLT-UG-000001' },
      { userId: u3, action: 'PAYMENT_INITIATE', entityType: 'Payment', details: 'Bulk payment to 25 farmers' },
      { userId: u2, action: 'LOAN_APPROVE', entityType: 'LoanApplication', details: 'Approved crop input loan' },
      { userId: u0, action: 'TENANT_CONFIGURE', entityType: 'Tenant', details: 'Updated tenant settings' },
    ],
  })

  await db.exchangeRate.createMany({
    data: [
      { fromCurrency: 'UGX', toCurrency: 'USD', rate: 3750, source: 'manual', isBase: true },
      { fromCurrency: 'UGX', toCurrency: 'EUR', rate: 4050, source: 'manual' },
      { fromCurrency: 'UGX', toCurrency: 'KES', rate: 30.5, source: 'manual' },
      { fromCurrency: 'GHS', toCurrency: 'USD', rate: 15.2, source: 'manual' },
      { fromCurrency: 'KES', toCurrency: 'USD', rate: 130, source: 'manual' },
    ],
  })

  await db.dashboardWidget.createMany({
    data: [
      { tenantId: ugTenant.id, name: 'Farmer Overview', type: 'STAT_CARD', dataSource: '/api/farmers', config: '{"stat":"total","label":"Total Farmers","icon":"people"}', position: 0, size: 'SMALL', isDefault: true },
      { tenantId: ugTenant.id, name: 'Loan Portfolio', type: 'PIE_CHART', dataSource: '/api/loans', config: '{"groupBy":"status"}', position: 1, size: 'MEDIUM', isDefault: true },
      { tenantId: ugTenant.id, name: 'Plot Map', type: 'MAP', dataSource: '/api/plots/geojson', config: '{"colorMode":"verification"}', position: 2, size: 'LARGE', isDefault: true },
      { tenantId: ugTenant.id, name: 'EUDR Compliance', type: 'BAR_CHART', dataSource: '/api/compliance/eudr', config: '{"groupBy":"riskLevel"}', position: 3, size: 'MEDIUM', isDefault: true },
    ],
  })

  await db.reportTemplate.createMany({
    data: [
      { tenantId: ugTenant.id, name: 'Farmer Registration Report', code: 'FARMER_REG', description: 'List of all registered farmers with contact details', type: 'TABULAR', format: 'PDF', sections: JSON.stringify([{ title: 'Farmer Details', columns: ['farmerCode', 'firstName', 'lastName', 'phone', 'gender', 'status'] }]), parameters: JSON.stringify([{ name: 'district', type: 'string' }, { name: 'dateFrom', type: 'date' }]) },
      { tenantId: ugTenant.id, name: 'Loan Portfolio Summary', code: 'LOAN_PORTFOLIO', description: 'Summary of all loans by status and product', type: 'SUMMARY', format: 'PDF', sections: JSON.stringify([{ title: 'Loan Summary', metrics: ['totalAmount', 'disbursed', 'outstanding', 'overdue'] }]) },
      { tenantId: ugTenant.id, name: 'EUDR Compliance Report', code: 'EUDR_COMPLIANCE', description: 'EUDR compliance status for all plots', type: 'TABULAR', format: 'PDF', sections: JSON.stringify([{ title: 'Plot Compliance', columns: ['plotCode', 'farmerName', 'riskLevel', 'verificationStatus', 'deforestationFree'] }]) },
      { tenantId: ugTenant.id, name: 'Carbon Credits Portfolio', code: 'CARBON_PORTFOLIO', description: 'Carbon project and credit summary', type: 'SUMMARY', format: 'XLSX', sections: JSON.stringify([{ title: 'Credits', metrics: ['totalIssued', 'totalRetired', 'totalPending'] }]) },
    ],
  })

  await db.exportJob.createMany({
    data: [
      { tenantId: ugTenant.id, exportType: 'farmers', format: 'XLSX', status: 'COMPLETED', requestedBy: u2, filters: '{}', fileName: 'farmers_export_2026.xlsx', fileSize: 125000, rowCount: 50, downloadUrl: '/exports/farmers_2026.xlsx', startedAt: new Date(Date.now() - 5 * 86400000), completedAt: new Date(Date.now() - 5 * 86400000), expiresAt: new Date(Date.now() + 2 * 86400000) },
      { tenantId: ugTenant.id, exportType: 'payments', format: 'CSV', status: 'COMPLETED', requestedBy: u2, filters: '{"dateFrom":"2026-01-01"}', fileName: 'payments_june_2026.csv', fileSize: 35000, rowCount: 25, startedAt: new Date(Date.now() - 2 * 86400000), completedAt: new Date(Date.now() - 2 * 86400000), expiresAt: new Date(Date.now() + 5 * 86400000) },
      { tenantId: ugTenant.id, exportType: 'traceability', format: 'PDF', status: 'PENDING', requestedBy: u3 },
    ],
  })

  // Usage Records
  await db.usageRecord.createMany({
    data: [
      { tenantId: ugTenant.id, eventType: 'FARMER_CREATED', count: 50, period: '2026-01' },
      { tenantId: ugTenant.id, eventType: 'FARMER_CREATED', count: 12, period: '2026-06' },
      { tenantId: ugTenant.id, eventType: 'API_CALL', count: 5000, period: '2026-06' },
      { tenantId: ugTenant.id, eventType: 'SMS_SENT', count: 2500, period: '2026-06' },
      { tenantId: ugTenant.id, eventType: 'USER_CREATED', count: 3, period: '2026-01' },
      { tenantId: ekibbo.id, eventType: 'API_CALL', count: 12000, period: '2026-06' },
      { tenantId: ekibbo.id, eventType: 'SMS_SENT', count: 8000, period: '2026-06' },
    ],
  })

  console.log('  ✅ Extended seed completed!')
}