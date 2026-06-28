/**
 * Agrobase V3 — Missing Seed Data (Phase 2)
 *
 * Covers ~41 models not in seed.ts or seed-extended.ts:
 * - Geographic hierarchy (Region → Village)
 * - VSLA Members, TrainingAttendance, SurveyResponse
 * - AgentAssignment, ChildProfile
 * - InputRequest, MarketMatch
 * - PaymentAccount, PaymentTransaction
 * - ModuleEntitlement, Subscription, ApiKey, ApiKeyUsageLog
 * - Permission, RolePermission, Commodity
 * - Accounting (Account, JournalEntry, JournalLine)
 * - ProduceIntake, CooperativePayment
 * - WebhookEndpoint, WebhookDelivery
 * - ContractItem, ContractMilestone
 * - Vehicle, Shipment, ShipmentItem
 * - CarbonFootprint, CbamCalculation
 * - TraceEvent, FarmPassport, CostOfCultivation
 * - EudrDocument, EudrAuditLog
 * - NotificationDelivery, Translation, BrandingConfig
 * - Escrow, TripTrackingEvent
 * - CarbonProjectMethodology, MfiRepayment
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

function dateStr(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86400000).toISOString()
}

export async function seedMissing(
  ctx: {
    ugTenant: { id: string }; ekibbo: { id: string }
    users: { id: string }[]; farmers: { id: string; firstName: string; lastName: string; phone: string }[]
    vslaGroups: { id: string }[]
  }
) {
  const { ugTenant, ekibbo, users, farmers, vslaGroups } = ctx
  const u0 = users[0]?.id; const u2 = users[2]?.id; const u3 = users[3]?.id

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. GEOGRAPHIC HIERARCHY (Region → SubRegion → District → Constituency → SubCounty → Parish → Village)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Geographic hierarchy...')

  const region1 = await db.region.create({ data: { name: 'Central Region', country: 'Uganda' } })
  const region2 = await db.region.create({ data: { name: 'Eastern Region', country: 'Uganda' } })
  const region3 = await db.region.create({ data: { name: 'Northern Region', country: 'Uganda' } })

  const subRegion1 = await db.subRegion.create({ data: { name: 'Buganda', regionId: region1.id } })
  const subRegion2 = await db.subRegion.create({ data: { name: 'Busoga', regionId: region1.id } })
  const subRegion3 = await db.subRegion.create({ data: { name: 'Bugisu', regionId: region2.id } })
  const subRegion4 = await db.subRegion.create({ data: { name: 'Acholi', regionId: region3.id } })

  const dist1 = await db.district.create({ data: { name: 'Kampala District', subRegionId: subRegion1.id } })
  const dist2 = await db.district.create({ data: { name: 'Mbale District', subRegionId: subRegion3.id } })
  const dist3 = await db.district.create({ data: { name: 'Gulu District', subRegionId: subRegion4.id } })
  const dist4 = await db.district.create({ data: { name: 'Jinja District', subRegionId: subRegion2.id } })
  const dist5 = await db.district.create({ data: { name: 'Kibale District', subRegionId: subRegion1.id } })

  const const1 = await db.constituency.create({ data: { name: 'Kampala Central', districtId: dist1.id } })
  const const2 = await db.constituency.create({ data: { name: 'Mbale Municipality', districtId: dist2.id } })
  const const3 = await db.constituency.create({ data: { name: 'Gulu Municipality', districtId: dist3.id } })

  const subCo1 = await db.subCounty.create({ data: { name: 'Kawempe', constituencyId: const1.id } })
  const subCo2 = await db.subCounty.create({ data: { name: 'Bungokho', constituencyId: const2.id } })
  const subCo3 = await db.subCounty.create({ data: { name: 'Laroo', constituencyId: const3.id } })

  const parish1 = await db.parish.create({ data: { name: 'Kawempe I', subCountyId: subCo1.id } })
  const parish2 = await db.parish.create({ data: { name: 'Bumayoka', subCountyId: subCo2.id } })
  const parish3 = await db.parish.create({ data: { name: 'Laroo Division', subCountyId: subCo3.id } })

  await db.village.createMany({
    data: [
      { name: 'Kawempe Village', parishId: parish1.id },
      { name: 'Bwaise', parishId: parish1.id },
      { name: 'Bumayoka Village', parishId: parish2.id },
      { name: 'Namabya', parishId: parish2.id },
      { name: 'Laroo Village', parishId: parish3.id },
      { name: 'Pece Village', parishId: parish3.id },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. VSLA MEMBERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding VSLA Members...')

  await db.vslaMember.createMany({
    data: Array.from({ length: 15 }, (_, i) => ({
      vslaGroupId: vslaGroups[i % 3].id,
      farmerId: farmers[i].id,
      memberId: `VSLA-MEM-${String(i + 1).padStart(4, '0')}`,
      isAdmin: i % 7 === 0,
      isKeyholder: i % 5 === 0,
      sharesOwned: 1 + Math.floor(Math.random() * 5),
    })),
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. TRAINING ATTENDANCE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Training Attendance...')

  const trainings = await db.training.findMany({ where: { tenantId: ugTenant.id }, select: { id: true }, take: 8 })
  const attendanceRows: { trainingId: string; farmerId: string; attended: boolean }[] = []
  for (const t of trainings) {
    for (let f = 0; f < 8; f++) {
      attendanceRows.push({
        trainingId: t.id,
        farmerId: farmers[f + Math.floor(Math.random() * 10)].id,
        attended: Math.random() > 0.15,
      })
    }
  }
  await db.trainingAttendance.createMany({ data: attendanceRows })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. SURVEY RESPONSES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Survey Responses...')

  const survey = await db.survey.findFirst({ where: { tenantId: ugTenant.id }, select: { id: true } })
  if (survey) {
    await db.surveyResponse.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        surveyId: survey.id,
        respondentId: farmers[i + 5].id,
        answers: JSON.stringify({
          q1: ['Yes, significantly', 'Yes, slightly'][i % 2],
          q2: `${10 + i * 3}%`,
          q3: '["Soil Management", "Pest Control"]',
          q4: ['Excellent', 'Good', 'Fair'][i % 3],
          q5: 'Need more training sessions in local language',
        }),
      })),
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. AGENT ASSIGNMENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Agent Assignments...')

  const groups = await db.farmerGroup.findMany({ where: { tenantId: ugTenant.id }, select: { id: true } })
  if (groups.length > 0) {
    await db.agentAssignment.createMany({
      data: [
        { agentId: u2, groupId: groups[0]?.id, groupType: 'FARMER_GROUP' },
        { agentId: u3, groupId: groups[1]?.id, groupType: 'FARMER_GROUP' },
        { agentId: u2, groupId: groups[2]?.id, groupType: 'FARMER_GROUP' },
      ],
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. CHILD PROFILES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Child Profiles...')

  const childNames = [
    ['Brian', 'Mugisha'], ['Sharon', 'Achieng'], ['Ivan', 'Ochan'], ['Mercy', 'Nakamya'],
    ['David', 'Ssentongo'], ['Grace', 'Akello'], ['Jordan', 'Mwesigwa'], ['Favour', 'Natukunda'],
    ['Ethan', 'Okello'], ['Hope', 'Nabwire'], ['Aaron', 'Kato'], ['Blessing', 'Aanyu'],
  ]
  await db.childProfile.createMany({
    data: childNames.map(([f, l], i) => ({
      farmerId: farmers[i].id,
      firstName: f,
      lastName: l,
      gender: i % 3 === 0 ? 'Female' : 'Male',
      dateOfBirth: new Date(Date.now() - (5 + (i % 12)) * 365 * 86400000),
      schoolName: i < 8 ? `${['Kibale', 'Mbale', 'Gulu', 'Kampala'][i % 4]} Primary School` : null,
    })),
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. INPUT REQUESTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Input Requests...')

  const dealers = await db.inputDealer.findMany({ where: { tenantId: ugTenant.id }, select: { id: true }, take: 3 })
  const inputProds = ['NPK Fertilizer 50kg', 'Coffee Seedlings', 'UREA 50kg', 'Pesticide Dursban']
  await db.inputRequest.createMany({
    data: Array.from({ length: 8 }, (_, i) => ({
      tenantId: ugTenant.id,
      dealerId: dealers[i % dealers.length]?.id,
      farmerId: farmers[i + 20].id,
      farmerName: `${farmers[i + 20].firstName} ${farmers[i + 20].lastName}`,
      farmerPhone: farmers[i + 20].phone,
      product: inputProds[i % inputProds.length],
      quantity: `${2 + i} Bags`,
      unitPrice: 50000 + i * 10000,
      totalPrice: (2 + i) * (50000 + i * 10000),
      status: ['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'][i % 4],
    })),
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. MARKET MATCHES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Market Matches...')

  const marketProducts = await db.marketProduct.findMany({
    where: { tenantId: ugTenant.id, status: 'AVAILABLE' },
    select: { id: true },
    take: 5,
  })
  await db.marketMatch.createMany({
    data: [
      { tenantId: ugTenant.id, productId: marketProducts[0]?.id, buyerName: 'Jinja Coffee Traders', buyerPhone: '+256773100001', quantity: '200 Kg', pricePerUnit: 8500, totalValue: 1700000, status: 'PAID' },
      { tenantId: ugTenant.id, productId: marketProducts[1]?.id, buyerName: 'Kampala Commodities', buyerPhone: '+256773100002', quantity: '500 Kg', pricePerUnit: 2300, totalValue: 1150000, status: 'DELIVERED' },
      { tenantId: ugTenant.id, productId: marketProducts[2]?.id, buyerName: 'Mbale buyers cooperative', quantity: '100 Kg', pricePerUnit: 9000, totalValue: 900000, status: 'CONFIRMED' },
      { tenantId: ugTenant.id, buyerName: 'Gulu Maize Millers', buyerPhone: '+256473100003', quantity: '2000 Kg', pricePerUnit: 2200, totalValue: 4400000, status: 'PENDING' },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 9. PAYMENT ACCOUNTS & PAYMENT TRANSACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Payment Accounts & Transactions...')

  const payAccounts = await Promise.all([
    db.paymentAccount.create({ data: { tenantId: ugTenant.id, accountName: 'Agrobase Uganda Float', accountType: 'MERCHANT', email: 'finance@agrobase.co.ug', address: 'Kampala, Uganda' } }),
    db.paymentAccount.create({ data: { tenantId: ekibbo.id, accountName: 'EKIBBO Operations', accountType: 'MERCHANT', email: 'accounts@ekibbo.co.ug' } }),
  ])

  // Get some payment IDs for linking
  const payments = await db.payment.findMany({ where: { tenantId: ugTenant.id }, select: { id: true }, take: 5 })
  await db.paymentTransaction.createMany({
    data: [
      { tenantId: ugTenant.id, paymentId: payments[0]?.id, provider: 'MTN_MOMO', providerTxnRef: 'MTN-2026-001', type: 'DISBURSEMENT', amount: 150000, currency: 'UGX', recipientPhone: farmers[0].phone, recipientName: `${farmers[0].firstName} ${farmers[0].lastName}`, status: 'COMPLETED', initiatedBy: u2, completedAt: new Date(Date.now() - 3 * 86400000) },
      { tenantId: ugTenant.id, paymentId: payments[1]?.id, provider: 'AINTEL', providerTxnRef: 'AIR-2026-002', type: 'COLLECTION', amount: 85000, currency: 'UGX', recipientPhone: farmers[1].phone, recipientName: `${farmers[1].firstName} ${farmers[1].lastName}`, status: 'COMPLETED', initiatedBy: u2, completedAt: new Date(Date.now() - 5 * 86400000) },
      { tenantId: ugTenant.id, paymentId: payments[2]?.id, provider: 'MPAY', providerTxnRef: 'MPAY-2026-003', type: 'DISBURSEMENT', amount: 320000, currency: 'UGX', recipientPhone: farmers[2].phone, recipientName: `${farmers[2].firstName} ${farmers[2].lastName}`, status: 'COMPLETED', initiatedBy: u3, completedAt: new Date(Date.now() - 7 * 86400000) },
      { tenantId: ugTenant.id, paymentId: payments[3]?.id, provider: 'MTN_MOMO', type: 'DISBURSEMENT', amount: 500000, currency: 'UGX', recipientPhone: farmers[3].phone, recipientName: `${farmers[3].firstName} ${farmers[3].lastName}`, status: 'FAILED', failureReason: 'Insufficient float balance', initiatedBy: u2 },
      { tenantId: ugTenant.id, paymentId: payments[4]?.id, provider: 'BANK_TRANSFER', providerTxnRef: 'BANK-2026-005', type: 'DISBURSEMENT', amount: 2500000, currency: 'UGX', recipientPhone: farmers[4].phone, recipientName: `${farmers[4].firstName} ${farmers[4].lastName}`, status: 'PROCESSING', initiatedBy: u0 },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 10. MODULE ENTITLEMENTS & SUBSCRIPTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Module Entitlements & Subscriptions...')

  await db.moduleEntitlement.createMany({
    data: [
      { tenantId: ugTenant.id, moduleCode: 'VSLA', isEnabled: true, config: '{"shareValueRange":[1000,10000],"loanRateRange":[5,15]}' },
      { tenantId: ugTenant.id, moduleCode: 'MARKETPLACE', isEnabled: true, config: '{"maxListingsPerFarmer":20}' },
      { tenantId: ugTenant.id, moduleCode: 'TRAINING', isEnabled: true },
      { tenantId: ugTenant.id, moduleCode: 'TRACE', isEnabled: true, config: '{"autoGeneratePassport":true}' },
      { tenantId: ugTenant.id, moduleCode: 'COMPLIANCE', isEnabled: true, config: '{"eudrEnabled":true,"cbamEnabled":true}' },
      { tenantId: ugTenant.id, moduleCode: 'MFI', isEnabled: true },
      { tenantId: ugTenant.id, moduleCode: 'CARBON', isEnabled: true },
      { tenantId: ugTenant.id, moduleCode: 'TRANSPORT', isEnabled: true },
      { tenantId: ugTenant.id, moduleCode: 'ACCOUNTING', isEnabled: true },
      { tenantId: ugTenant.id, moduleCode: 'INVENTORY', isEnabled: true },
      { tenantId: ekibbo.id, moduleCode: 'TRACE', isEnabled: true, config: '{"autoGeneratePassport":true}' },
      { tenantId: ekibbo.id, moduleCode: 'COMPLIANCE', isEnabled: true, config: '{"eudrEnabled":true}' },
      { tenantId: ekibbo.id, moduleCode: 'CARBON', isEnabled: true },
    ],
  })

  await db.subscription.createMany({
    data: [
      { tenantId: ugTenant.id, plan: 'STANDARD', amount: 1500000, billingCycle: 'QUARTERLY', status: 'ACTIVE', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
      { tenantId: ekibbo.id, plan: 'ENTERPRISE', amount: 5000000, billingCycle: 'MONTHLY', status: 'ACTIVE', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 11. API KEYS & USAGE LOGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding API Keys...')

  const apiKey = await db.apiKey.create({
    data: {
      tenantId: ugTenant.id, name: 'EKIBBO Integration Key', key: 'abr_live_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
      keyPrefix: 'abr_live_sk', userId: u0,
      scopes: '["farmers:read","purchases:read","purchases:write","payments:read","payments:write","trace:read"]',
      rateLimitRpm: 120, rateLimitRpd: 50000, isActive: true, lastUsedAt: new Date(), totalRequests: 12500,
    },
  })

  await db.apiKeyUsageLog.createMany({
    data: [
      { apiKeyId: apiKey.id, method: 'GET', path: '/api/farmers', statusCode: 200, responseMs: 45, ipAddress: '196.43.10.5', userAgent: 'EKIBBO-Integration/1.0' },
      { apiKeyId: apiKey.id, method: 'POST', path: '/api/purchases', statusCode: 201, responseMs: 120, ipAddress: '196.43.10.5', userAgent: 'EKIBBO-Integration/1.0' },
      { apiKeyId: apiKey.id, method: 'GET', path: '/api/purchases/PUR-001', statusCode: 200, responseMs: 32, ipAddress: '196.43.10.5', userAgent: 'EKIBBO-Integration/1.0' },
      { apiKeyId: apiKey.id, method: 'POST', path: '/api/payments/disburse', statusCode: 200, responseMs: 850, ipAddress: '196.43.10.5', userAgent: 'EKIBBO-Integration/1.0' },
      { apiKeyId: apiKey.id, method: 'GET', path: '/api/traceability/batches', statusCode: 200, responseMs: 67, ipAddress: '196.43.10.5', userAgent: 'EKIBBO-Integration/1.0' },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 12. RBAC — PERMISSIONS & ROLE PERMISSIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding RBAC...')

  const perms = await Promise.all([
    db.permission.create({ data: { name: 'farmers:read', module: 'farmers', action: 'read', description: 'View farmer profiles' } }),
    db.permission.create({ data: { name: 'farmers:create', module: 'farmers', action: 'create', description: 'Create new farmers' } }),
    db.permission.create({ data: { name: 'farmers:update', module: 'farmers', action: 'update', description: 'Edit farmer details' } }),
    db.permission.create({ data: { name: 'farmers:delete', module: 'farmers', action: 'delete', description: 'Delete farmer records' } }),
    db.permission.create({ data: { name: 'vsla:read', module: 'vsla', action: 'read', description: 'View VSLA groups and data' } }),
    db.permission.create({ data: { name: 'vsla:manage', module: 'vsla', action: 'manage', description: 'Manage VSLA operations' } }),
    db.permission.create({ data: { name: 'vsla:approve_loans', module: 'vsla', action: 'approve', description: 'Approve VSLA loans' } }),
    db.permission.create({ data: { name: 'compliance:read', module: 'compliance', action: 'read', description: 'View compliance data' } }),
    db.permission.create({ data: { name: 'compliance:manage', module: 'compliance', action: 'manage', description: 'Manage compliance records' } }),
    db.permission.create({ data: { name: 'payments:read', module: 'payments', action: 'read', description: 'View payment records' } }),
    db.permission.create({ data: { name: 'payments:write', module: 'payments', action: 'create', description: 'Initiate payments' } }),
    db.permission.create({ data: { name: 'reports:read', module: 'reports', action: 'read', description: 'View reports' } }),
  ])

  await db.rolePermission.createMany({
    data: [
      { role: 'SUPER_ADMIN', permissionId: perms[0].id },
      { role: 'SUPER_ADMIN', permissionId: perms[1].id },
      { role: 'SUPER_ADMIN', permissionId: perms[2].id },
      { role: 'SUPER_ADMIN', permissionId: perms[3].id },
      { role: 'SUPER_ADMIN', permissionId: perms[4].id },
      { role: 'SUPER_ADMIN', permissionId: perms[5].id },
      { role: 'SUPER_ADMIN', permissionId: perms[6].id },
      { role: 'SUPER_ADMIN', permissionId: perms[7].id },
      { role: 'SUPER_ADMIN', permissionId: perms[8].id },
      { role: 'SUPER_ADMIN', permissionId: perms[9].id },
      { role: 'SUPER_ADMIN', permissionId: perms[10].id },
      { role: 'COUNTRY_ADMIN', permissionId: perms[0].id },
      { role: 'COUNTRY_ADMIN', permissionId: perms[1].id },
      { role: 'COUNTRY_ADMIN', permissionId: perms[2].id },
      { role: 'COUNTRY_ADMIN', permissionId: perms[4].id },
      { role: 'COUNTRY_ADMIN', permissionId: perms[7].id },
      { role: 'COUNTRY_ADMIN', permissionId: perms[9].id },
      { role: 'EXTENSION_OFFICER', permissionId: perms[0].id },
      { role: 'EXTENSION_OFFICER', permissionId: perms[1].id },
      { role: 'EXTENSION_OFFICER', permissionId: perms[4].id },
      { role: 'EXTENSION_OFFICER', permissionId: perms[7].id },
      { role: 'FARMER', permissionId: perms[0].id },
      { role: 'FARMER', permissionId: perms[4].id },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 13. COMMODITIES (master data)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Commodities...')

  await db.commodity.createMany({
    data: [
      { name: 'Coffee', category: 'Crop', unit: 'Kg', isActive: true },
      { name: 'Maize', category: 'Crop', unit: 'Kg', isActive: true },
      { name: 'Cocoa', category: 'Crop', unit: 'Kg', isActive: true },
      { name: 'Cassava', category: 'Crop', unit: 'Kg', isActive: true },
      { name: 'Avocado', category: 'Crop', unit: 'Kg', isActive: true },
      { name: 'Vanilla', category: 'Crop', unit: 'Kg', isActive: true },
      { name: 'Beans', category: 'Crop', unit: 'Kg', isActive: true },
      { name: 'Soybean', category: 'Crop', unit: 'Kg', isActive: true },
      { name: 'Jackfruit', category: 'Crop', unit: 'Pcs', isActive: true },
      { name: 'Cattle', category: 'Livestock', unit: 'Head', isActive: true },
      { name: 'Goats', category: 'Livestock', unit: 'Head', isActive: true },
      { name: 'Poultry', category: 'Livestock', unit: 'Bird', isActive: true },
      { name: 'Pine', category: 'Forestry', unit: 'Seedling', isActive: true },
      { name: 'Eucalyptus', category: 'Forestry', unit: 'Seedling', isActive: true },
      { name: 'Tilapia', category: 'Fishery', unit: 'Kg', isActive: true },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 14. ACCOUNTING — Chart of Accounts, Journal Entries
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Accounting data...')

  const cashAcc = await db.account.create({ data: { tenantId: ugTenant.id, code: '1001', name: 'Cash', type: 'ASSET', normalBalance: 'DEBIT' } })
  const bankAcc = await db.account.create({ data: { tenantId: ugTenant.id, code: '1002', name: 'Bank (Stanbic)', type: 'ASSET', normalBalance: 'DEBIT' } })
  const mmAcc = await db.account.create({ data: { tenantId: ugTenant.id, code: '1003', name: 'Mobile Money Float', type: 'ASSET', normalBalance: 'DEBIT' } })
  const arAcc = await db.account.create({ data: { tenantId: ugTenant.id, code: '1100', name: 'Accounts Receivable', type: 'ASSET', normalBalance: 'DEBIT' } })
  const inventoryAcc = await db.account.create({ data: { tenantId: ugTenant.id, code: '1200', name: 'Inventory', type: 'ASSET', normalBalance: 'DEBIT' } })
  const apAcc = await db.account.create({ data: { tenantId: ugTenant.id, code: '2001', name: 'Accounts Payable', type: 'LIABILITY', normalBalance: 'CREDIT' } })
  const loanPayable = await db.account.create({ data: { tenantId: ugTenant.id, code: '2002', name: 'Loan Payable', type: 'LIABILITY', normalBalance: 'CREDIT' } })
  const equityAcc = await db.account.create({ data: { tenantId: ugTenant.id, code: '3001', name: 'Retained Earnings', type: 'EQUITY', normalBalance: 'CREDIT' } })
  const salesAcc = await db.account.create({ data: { tenantId: ugTenant.id, code: '4001', name: 'Sales Revenue', type: 'REVENUE', normalBalance: 'CREDIT' } })
  const commissionAcc = await db.account.create({ data: { tenantId: ugTenant.id, code: '4002', name: 'Commission Income', type: 'REVENUE', normalBalance: 'CREDIT' } })
  const transportAcc = await db.account.create({ data: { tenantId: ugTenant.id, code: '5001', name: 'Transport Costs', type: 'EXPENSE', normalBalance: 'DEBIT' } })
  const salaryAcc = await db.account.create({ data: { tenantId: ugTenant.id, code: '5002', name: 'Salaries & Wages', type: 'EXPENSE', normalBalance: 'DEBIT' } })

  // Journal Entry 1: Coffee purchase from farmers
  const je1 = await db.journalEntry.create({
    data: { tenantId: ugTenant.id, date: new Date(Date.now() - 10 * 86400000), description: 'Coffee purchase from Kibale farmers', reference: 'INTAKE-2026-001', status: 'POSTED', createdBy: u2, postedBy: u0, postedAt: new Date(Date.now() - 10 * 86400000) },
  })
  await db.journalLine.createMany({
    data: [
      { journalEntryId: je1.id, accountId: inventoryAcc.id, entryType: 'DEBIT', amount: 15000000, description: 'Coffee inventory - 1800kg @ UGX 8,333' },
      { journalEntryId: je1.id, accountId: cashAcc.id, entryType: 'CREDIT', amount: 15000000, description: 'Cash paid to farmers' },
    ],
  })

  // Journal Entry 2: Transport payment
  const je2 = await db.journalEntry.create({
    data: { tenantId: ugTenant.id, date: new Date(Date.now() - 2 * 86400000), description: 'Transport fee - Kibale to Kampala', reference: 'TRP-TRIP-000001', status: 'POSTED', createdBy: u2, postedBy: u2, postedAt: new Date(Date.now() - 2 * 86400000) },
  })
  await db.journalLine.createMany({
    data: [
      { journalEntryId: je2.id, accountId: transportAcc.id, entryType: 'DEBIT', amount: 800000, description: 'Transport cost Kibale-Kampala' },
      { journalEntryId: je2.id, accountId: bankAcc.id, entryType: 'CREDIT', amount: 800000, description: 'Paid via bank transfer' },
    ],
  })

  // Journal Entry 3: Commission earned
  const je3 = await db.journalEntry.create({
    data: { tenantId: ugTenant.id, date: new Date(Date.now() - 1 * 86400000), description: 'Platform commission earned on transport trips', reference: 'COMM-2026-Q2', status: 'POSTED', createdBy: u0, postedBy: u0, postedAt: new Date(Date.now() - 1 * 86400000) },
  })
  await db.journalLine.createMany({
    data: [
      { journalEntryId: je3.id, accountId: arAcc.id, entryType: 'DEBIT', amount: 80000, description: 'Commission receivable' },
      { journalEntryId: je3.id, accountId: commissionAcc.id, entryType: 'CREDIT', amount: 80000, description: 'Commission income earned' },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 15. PRODUCE INTAKE & COOPERATIVE PAYMENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Produce Intake & Cooperative Payments...')

  const intakes = await Promise.all([
    db.produceIntake.create({
      data: { tenantId: ugTenant.id, farmerId: farmers[0].id, commodity: 'Coffee', variety: 'SL14 Arabica', quantityKg: 1800, moistureContent: 11.2, grade: 'A', pricePerKg: 8500, totalAmount: 15300000, intakeDate: new Date(Date.now() - 15 * 86400000), status: 'STORED', receivedBy: u2, warehouse: 'WH-KLA-001', qualityNotes: 'Premium quality, ready for export' },
    }),
    db.produceIntake.create({
      data: { tenantId: ugTenant.id, farmerId: farmers[1].id, commodity: 'Coffee', variety: 'KR3 Robusta', quantityKg: 1200, moistureContent: 12.5, grade: 'B', pricePerKg: 7200, totalAmount: 8640000, intakeDate: new Date(Date.now() - 12 * 86400000), status: 'ACCEPTED', receivedBy: u3, warehouse: 'WH-KLA-001', qualityNotes: 'Standard quality' },
    }),
    db.produceIntake.create({
      data: { tenantId: ugTenant.id, farmerId: farmers[14].id, commodity: 'Maize', quantityKg: 5000, moistureContent: 13.0, grade: 'B', pricePerKg: 2200, totalAmount: 11000000, intakeDate: new Date(Date.now() - 8 * 86400000), status: 'GRADED', receivedBy: u2, warehouse: 'WH-GUL-001' },
    }),
  ])

  await db.cooperativePayment.createMany({
    data: [
      { tenantId: ugTenant.id, intakeId: intakes[0].id, farmerId: farmers[0].id, phase: 'FIRST', grossAmount: 7650000, deductions: JSON.stringify([{ type: 'Processing fee', amount: 150000 }, { type: 'Transport deduction', amount: 50000 }]), netAmount: 7450000, paymentMethod: 'MOBILE_MONEY', status: 'PAID', paidAt: new Date(Date.now() - 14 * 86400000), paidBy: u2, transactionRef: 'MM-CP-001' },
      { tenantId: ugTenant.id, intakeId: intakes[0].id, farmerId: farmers[0].id, phase: 'FINAL', grossAmount: 7650000, deductions: JSON.stringify([{ type: 'Loan repayment', amount: 200000 }]), netAmount: 7450000, paymentMethod: 'BANK', status: 'PAID', paidAt: new Date(Date.now() - 7 * 86400000), paidBy: u2, transactionRef: 'BANK-CP-002' },
      { tenantId: ugTenant.id, intakeId: intakes[1].id, farmerId: farmers[1].id, phase: 'FIRST', grossAmount: 4320000, deductions: JSON.stringify([{ type: 'Processing fee', amount: 85000 }]), netAmount: 4235000, paymentMethod: 'MOBILE_MONEY', status: 'PROCESSING' },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 16. WEBHOOKS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Webhooks...')

  const webhook = await db.webhookEndpoint.create({
    data: { tenantId: ugTenant.id, name: 'EKIBBO Purchase Webhook', url: 'https://api.ekibbo.co.ug/webhooks/agrobase', secret: 'whsec_a1b2c3d4e5f6', events: '["purchase.created","purchase.approved","payment.completed"]', isActive: true, lastPingAt: new Date(Date.now() - 1 * 86400000) },
  })

  await db.webhookDelivery.createMany({
    data: [
      { endpointId: webhook.id, event: 'purchase.created', payload: '{"purchaseId":"xxx","commodity":"Coffee","quantity":"500 Kg"}', signature: 'sha256=abc123', status: 'COMPLETED', statusCode: 200, responseBody: '{"ok":true}', attempt: 1, sentAt: new Date(Date.now() - 2 * 86400000), completedAt: new Date(Date.now() - 2 * 86400000) },
      { endpointId: webhook.id, event: 'payment.completed', payload: '{"paymentId":"yyy","amount":1500000}', signature: 'sha256=def456', status: 'FAILED', statusCode: 503, attempt: 2, nextRetryAt: new Date(Date.now() + 1 * 86400000), sentAt: new Date(Date.now() - 0.5 * 86400000) },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 17. CONTRACT ITEMS & MILESTONES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Contract Items & Milestones...')

  const ctr1 = await db.contract.findFirst({ where: { contractCode: 'CTR-2026-001' }, select: { id: true } })
  const ctr2 = await db.contract.findFirst({ where: { contractCode: 'CTR-2026-002' }, select: { id: true } })

  if (ctr1) {
    await db.contractItem.createMany({
      data: [
        { contractId: ctr1.id, commodity: 'Coffee', variety: 'SL14', grade: 'GRADE_A', quantity: 12000, unitPrice: 8500, delivered: 8000 },
        { contractId: ctr1.id, commodity: 'Coffee', variety: 'SL28', grade: 'GRADE_A', quantity: 8000, unitPrice: 8200, delivered: 3000 },
      ],
    })
    await db.contractMilestone.createMany({
      data: [
        { contractId: ctr1.id, name: 'Q1 Delivery', dueDate: new Date('2026-03-31'), quantity: 5000, amount: 42500000, status: 'COMPLETED', completedAt: new Date('2026-03-28'), notes: 'Delivered on time' },
        { contractId: ctr1.id, name: 'Q2 Delivery', dueDate: new Date('2026-06-30'), quantity: 5000, amount: 42500000, status: 'COMPLETED', completedAt: new Date('2026-06-25') },
        { contractId: ctr1.id, name: 'Q3 Delivery', dueDate: new Date('2026-09-30'), quantity: 5000, amount: 42500000, status: 'PENDING' },
        { contractId: ctr1.id, name: 'Q4 Delivery', dueDate: new Date('2026-12-15'), quantity: 5000, amount: 42500000, status: 'PENDING' },
      ],
    })
  }
  if (ctr2) {
    await db.contractItem.create({ data: { contractId: ctr2.id, commodity: 'Coffee', variety: 'KR3', grade: 'GRADE_B', quantity: 15000, unitPrice: 7200, delivered: 2000 } })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 18. VEHICLES, SHIPMENTS & SHIPMENT ITEMS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Vehicles, Shipments...')

  const veh1 = await db.vehicle.create({ data: { tenantId: ugTenant.id, plateNumber: 'UAX 200A', type: 'LORRY', capacity: 10000, driverName: 'David Opio', driverPhone: '+256774000001', isActive: true } })
  const veh2 = await db.vehicle.create({ data: { tenantId: ugTenant.id, plateNumber: 'UAX 350B', type: 'PICKUP', capacity: 2000, driverName: 'Samuel Ochieng', driverPhone: '+256774000002', isActive: true } })

  const ship1 = await db.shipment.create({
    data: { tenantId: ugTenant.id, shipmentCode: 'SHP-2026-001', vehicleId: veh1.id, contractId: ctr1?.id, status: 'IN_TRANSIT', departureTime: new Date(Date.now() - 1 * 86400000), driverName: 'David Opio', driverPhone: '+256774000001', totalWeight: 5000, route: 'Kampala → Jinja → Mombasa Port', notes: 'Export shipment for EKIBBO' },
  })
  await db.shipmentItem.createMany({
    data: [
      { shipmentId: ship1.id, commodity: 'Coffee', grade: 'GRADE_A', quantity: 3000, batchCode: 'BAT-000001' },
      { shipmentId: ship1.id, commodity: 'Coffee', grade: 'GRADE_A', quantity: 2000, batchCode: 'BAT-000004' },
    ],
  })

  await db.shipment.create({
    data: { tenantId: ugTenant.id, shipmentCode: 'SHP-2026-002', vehicleId: veh2.id, status: 'PLANNED', driverName: 'Samuel Ochieng', driverPhone: '+256774000002', totalWeight: 1500, route: 'Mbale → Kampala Warehouse', notes: 'Scheduled for next week' },
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 19. CARBON FOOTPRINT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Carbon Footprint...')

  const cultivations = await db.cultivation.findMany({ select: { id: true, cropName: true }, take: 5 })
  if (cultivations.length > 0) {
    await db.carbonFootprint.createMany({
      data: cultivations.map((c, i) => ({
        tenantId: ugTenant.id,
        cultivationId: c.id,
        commodity: c.cropName,
        totalEmissionsKgCO2e: 500 + Math.random() * 2000,
        emissionsPerKg: 0.3 + Math.random() * 0.8,
        emissionsPerHectare: 200 + Math.random() * 500,
        breakdown: JSON.stringify({ FERTILIZER: 30 + Math.random() * 20, FUEL: 10 + Math.random() * 15, PESTICIDE: 5 + Math.random() * 10, LAND_PREP: 15 + Math.random() * 10, PROCESSING: 10 + Math.random() * 15 }),
        stages: JSON.stringify([{ stage: 'Land Preparation', emissions: 50 }, { stage: 'Growing', emissions: 200 }, { stage: 'Harvesting', emissions: 80 }, { stage: 'Post-Harvest', emissions: 120 }]),
        calculationMethod: 'IPCC_TIER2',
        verificationStatus: i < 3 ? 'VERIFIED' : 'DRAFT',
        verifiedBy: i < 3 ? u2 : null,
        verifiedAt: i < 3 ? new Date() : null,
      })),
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 20. CBAM CALCULATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding CBAM Calculations...')

  const cbamReports = await db.cbamReport.findMany({ where: { tenantId: ugTenant.id }, select: { id: true, reportingPeriod: true } })
  if (cbamReports.length > 0) {
    await db.cbamCalculation.createMany({
      data: cbamReports.map((r) => ({
        tenantId: ugTenant.id,
        cbamReportId: r.id,
        commodity: 'Coffee',
        originCountry: 'Uganda',
        quantityTonnes: 1.5 + Math.random() * 3,
        embeddedEmissionsPerTonne: 0.8 + Math.random() * 1.5,
        totalEmbeddedEmissions: 2 + Math.random() * 4,
        euCarbonPrice: 75 + Math.random() * 20,
        cbamCertificateCost: 150 + Math.random() * 300,
        carbonCreditsApplied: Math.random() * 0.5,
        netCost: 100 + Math.random() * 400,
        reportingPeriod: String(r.reportingPeriod),
        status: 'DRAFT',
      })),
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 21. TRACE EVENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Trace Events...')

  const batches = await db.productBatch.findMany({ where: { tenantId: ugTenant.id }, select: { id: true }, take: 4 })
  const traceEvents: { tenantId: string; productBatchId: string; eventType: string; stage: string; timestamp: Date; locationName: string; actorId?: string; actorName?: string; actorType?: string; details?: string }[] = []
  for (const batch of batches) {
    traceEvents.push(
      { tenantId: ugTenant.id, productBatchId: batch.id, eventType: 'HARVEST', stage: 'FARM', timestamp: new Date(Date.now() - 30 * 86400000), locationName: 'Kibale District', actorId: farmers[0].id, actorName: 'James Mugisha', actorType: 'FARMER', details: '{"quantityKg":1800,"moisture":11.2}' },
      { tenantId: ugTenant.id, productBatchId: batch.id, eventType: 'INTAKE', stage: 'WAREHOUSE', timestamp: new Date(Date.now() - 28 * 86400000), locationName: 'Kampala Central Warehouse', actorId: u2, actorName: 'John Okello', actorType: 'STAFF', details: '{"grade":"GRADE_A","qualityScore":92}' },
      { tenantId: ugTenant.id, productBatchId: batch.id, eventType: 'PROCESSING', stage: 'FACTORY', timestamp: new Date(Date.now() - 20 * 86400000), locationName: 'Jinja Coffee Factory', actorName: 'Factory Operator', actorType: 'SYSTEM', details: '{"process":"Hulling","outputKg":1500}' },
      { tenantId: ugTenant.id, productBatchId: batch.id, eventType: 'CERTIFICATION', stage: 'QUALITY', timestamp: new Date(Date.now() - 15 * 86400000), locationName: 'Kampala QC Lab', actorId: u2, actorName: 'John Okello', actorType: 'STAFF', details: '{"certificate":"EUDR_DD_001"}' },
    )
  }
  if (traceEvents.length > 0) await db.traceEvent.createMany({ data: traceEvents })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 22. FARM PASSPORT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Farm Passports...')

  await db.farmPassport.create({
    data: {
      tenantId: ugTenant.id,
      passportId: 'AGRO-UG-2026-JMUGISHA',
      farmerId: farmers[0].id,
      passportData: JSON.stringify({
        farmerCode: 'AGR-0001', name: 'James Mugisha', phone: farmers[0].phone,
        group: 'Kibale Coffee Farmers', plots: 1, crops: ['Coffee'],
        certifications: ['RFA'], eudrStatus: 'VERIFIED',
        totalAreaHectares: 2.5, lastHarvest: '2025-12-01', nextHarvest: '2026-10-01',
      }),
      qrCodeUrl: '/passports/qr/AGRO-UG-2026-JMUGISHA.png',
      verificationUrl: 'https://verify.agrobase.co/p/AGRO-UG-2026-JMUGISHA',
      isActive: true,
    },
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 23. COST OF CULTIVATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Cost of Cultivation...')

  await db.costOfCultivation.createMany({
    data: [
      {
        tenantId: ugTenant.id, farmerId: farmers[0].id, commodity: 'Coffee', country: 'Uganda',
        areaHectares: 2.5, season: '2025B',
        costBreakdown: JSON.stringify({ landPrep: 200000, seeds: 150000, fertilizer: 350000, pesticide: 120000, labor: 800000, harvest: 400000, transport: 150000, certification: 100000 }),
        totalCost: 2270000, expectedYield: 1800, expectedRevenue: 15300000, actualYield: 1800, actualRevenue: 15300000, profitLoss: 13030000, roi: 574, status: 'ACTUAL',
      },
      {
        tenantId: ugTenant.id, farmerId: farmers[3].id, commodity: 'Maize', country: 'Uganda',
        areaHectares: 5.0, season: '2025B',
        costBreakdown: JSON.stringify({ landPrep: 500000, seeds: 300000, fertilizer: 800000, pesticide: 200000, labor: 1500000, harvest: 600000, transport: 400000 }),
        totalCost: 4300000, expectedYield: 15000, expectedRevenue: 33000000, actualYield: 12000, actualRevenue: 26400000, profitLoss: 22100000, roi: 514, status: 'ACTUAL',
      },
      {
        tenantId: ugTenant.id, farmerId: farmers[4].id, commodity: 'Cocoa', country: 'Uganda',
        areaHectares: 1.2, season: '2026A',
        costBreakdown: JSON.stringify({ landPrep: 100000, seeds: 180000, fertilizer: 200000, pesticide: 80000, labor: 400000, harvest: 150000 }),
        totalCost: 1110000, expectedYield: 600, expectedRevenue: 9000000, status: 'ESTIMATED',
      },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 24. EUDR DOCUMENTS & AUDIT LOGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding EUDR Documents & Audit Logs...')

  const eudrRecords = await db.eudrCompliance.findMany({ where: {}, select: { id: true }, take: 5 })
  if (eudrRecords.length > 0) {
    await db.eudrDocument.createMany({
      data: [
        { eudrComplianceId: eudrRecords[0].id, documentType: 'LAND_TITLE', fileName: 'land_title_mugisha.pdf', fileUrl: '/docs/eudr/land_title_mugisha.pdf', fileSize: 350000, verified: true, verifiedBy: u2, verifiedAt: new Date() },
        { eudrComplianceId: eudrRecords[0].id, documentType: 'SURVEY_MAP', fileName: 'survey_map_plot1.png', fileUrl: '/docs/eudr/survey_map_plot1.png', fileSize: 520000, verified: true, verifiedBy: u2, verifiedAt: new Date() },
        { eudrComplianceId: eudrRecords[1].id, documentType: 'USE_RIGHTS', fileName: 'use_rights_agnes.pdf', fileSize: 180000, verified: false },
      ],
    })

    await db.eudrAuditLog.createMany({
      data: [
        { eudrComplianceId: eudrRecords[0].id, action: 'CREATED', performedBy: u2, details: 'Initial EUDR compliance record created from GPS survey' },
        { eudrComplianceId: eudrRecords[0].id, action: 'VERIFIED', performedBy: u0, details: 'All documents verified, deforestation check passed' },
        { eudrComplianceId: eudrRecords[1].id, action: 'CREATED', performedBy: u3, details: 'EUDR record created for Bugisu Coffee Plot 3' },
        { eudrComplianceId: eudrRecords[1].id, action: 'SUBMITTED', performedBy: u3, details: 'Submitted for verification' },
        { eudrComplianceId: eudrRecords[1].id, action: 'VERIFIED', performedBy: u2, details: 'Satellite verification passed' },
      ],
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 25. NOTIFICATION DELIVERIES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Notification Deliveries...')

  const notifications = await db.notification.findMany({ where: { tenantId: ugTenant.id }, select: { id: true }, take: 5 })
  if (notifications.length > 0) {
    await db.notificationDelivery.createMany({
      data: [
        { notificationId: notifications[0].id, channel: 'SMS', provider: 'MTN_MOMO', attempt: 1, status: 'COMPLETED', responseCode: '1000', sentAt: new Date(Date.now() - 2 * 86400000), deliveredAt: new Date(Date.now() - 2 * 86400000) },
        { notificationId: notifications[1].id, channel: 'SMS', provider: 'AINTEL', attempt: 1, status: 'COMPLETED', responseCode: '1000', sentAt: new Date(Date.now() - 5 * 86400000), deliveredAt: new Date(Date.now() - 5 * 86400000) },
        { notificationId: notifications[2].id, channel: 'IN_APP', provider: 'PUSH', attempt: 1, status: 'COMPLETED', sentAt: new Date(Date.now() - 1 * 86400000), deliveredAt: new Date(Date.now() - 1 * 86400000) },
        { notificationId: notifications[3].id, channel: 'IN_APP', provider: 'PUSH', attempt: 1, status: 'PENDING' },
      ],
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 26. TRANSLATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Translations...')

  await db.translation.createMany({
    data: [
      // English (system)
      { locale: 'en', namespace: 'common', key: 'welcome.title', value: 'Welcome to Agrobase', isSystem: true },
      { locale: 'en', namespace: 'common', key: 'nav.dashboard', value: 'Dashboard', isSystem: true },
      { locale: 'en', namespace: 'common', key: 'nav.farmers', value: 'Farmers', isSystem: true },
      { locale: 'en', namespace: 'common', key: 'nav.payments', value: 'Payments', isSystem: true },
      { locale: 'en', namespace: 'common', key: 'error.not_found', value: 'The requested resource was not found', isSystem: true },
      // Luganda
      { locale: 'lg', namespace: 'common', key: 'welcome.title', value: 'Mukwano ogi Agrobase', isSystem: true },
      { locale: 'lg', namespace: 'common', key: 'nav.dashboard', value: 'Olukalala', isSystem: true },
      { locale: 'lg', namespace: 'common', key: 'nav.farmers', value: 'Abalimi', isSystem: true },
      // Swahili
      { locale: 'sw', namespace: 'common', key: 'welcome.title', value: 'Karibu Agrobase', isSystem: true },
      { locale: 'sw', namespace: 'common', key: 'nav.dashboard', value: 'Dashibodi', isSystem: true },
      { locale: 'sw', namespace: 'common', key: 'nav.farmers', value: 'Wakulima', isSystem: true },
      // Acholi
      { locale: 'ach', namespace: 'common', key: 'welcome.title', value: 'Wino laco Agrobase', isSystem: true },
      { locale: 'ach', namespace: 'common', key: 'nav.farmers', value: 'Lakwena medo', isSystem: true },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 27. BRANDING CONFIG
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Branding Configs...')

  await db.brandingConfig.createMany({
    data: [
      { tenantId: ugTenant.id, primaryColor: '#16a34a', secondaryColor: '#facc15', accentColor: '#0ea5e9', appName: 'Agrobase Uganda', tagline: 'Empowering Ugandan Farmers', locale: 'en', timezone: 'Africa/Kampala' },
      { tenantId: ekibbo.id, primaryColor: '#7c3aed', secondaryColor: '#f59e0b', accentColor: '#06b6d4', appName: 'EKIBBO Platform', tagline: 'Premium Coffee Export Management', locale: 'en', timezone: 'Africa/Kampala', dateFormat: 'DD/MM/YYYY', currencyFormat: 'symbol' },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 28. ESCROW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Escrow...')

  await db.escrow.createMany({
    data: [
      { tenantId: ugTenant.id, sourceType: 'SALE', sourceId: 'SALE-001', reference: 'ESC-2026-001', payerName: 'EKIBBO Coffee Exporters', payeeName: 'James Mugisha', amount: 15300000, currency: 'UGX', feeAmount: 382500, feeRate: 2.5, status: 'RELEASED', heldAt: new Date(Date.now() - 15 * 86400000), heldBy: u2, releasedAt: new Date(Date.now() - 10 * 86400000), releasedBy: u0, releasedAmount: 15300000, autoReleaseAt: new Date(Date.now() + 30 * 86400000) },
      { tenantId: ugTenant.id, sourceType: 'PURCHASE', sourceId: 'PUR-001', reference: 'ESC-2026-002', payerName: 'Agrobase Uganda', payeeName: 'Sarah Achieng', amount: 8640000, currency: 'UGX', feeAmount: 0, feeRate: 0, status: 'HELD', heldAt: new Date(Date.now() - 5 * 86400000), heldBy: u2, releaseConditions: '{"type":"quality_check","inspectionId":"QI-001"}', autoReleaseAt: new Date(Date.now() + 14 * 86400000) },
      { tenantId: ugTenant.id, sourceType: 'CONSIGNMENT', sourceId: 'CON-001', reference: 'ESC-2026-003', payerName: 'Gulu Farmer Cooperative', payeeName: 'Peter Ochan', amount: 3200000, currency: 'UGX', feeAmount: 80000, feeRate: 2.5, status: 'PENDING', autoReleaseAt: new Date(Date.now() + 21 * 86400000) },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 29. TRIP TRACKING EVENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Trip Tracking Events...')

  const deliveredTrip = await db.transportTrip.findFirst({ where: { tripCode: 'TRP-TRIP-000001' }, select: { id: true } })
  if (deliveredTrip) {
    await db.tripTrackingEvent.createMany({
      data: [
        { tripId: deliveredTrip.id, latitude: 0.95, longitude: 30.25, speedKmh: 0, eventType: 'PICKUP', address: 'Kibale District', district: 'Kibale', batteryLevel: 85, recordedAt: new Date(Date.now() - 4 * 86400000) },
        { tripId: deliveredTrip.id, latitude: 0.80, longitude: 30.80, speedKmh: 55, eventType: 'WAYPOINT', district: 'Mubende', batteryLevel: 78, recordedAt: new Date(Date.now() - 3.5 * 86400000) },
        { tripId: deliveredTrip.id, latitude: 0.50, longitude: 31.50, speedKmh: 60, eventType: 'LOCATION_UPDATE', district: 'Mityana', batteryLevel: 72, recordedAt: new Date(Date.now() - 3 * 86400000) },
        { tripId: deliveredTrip.id, latitude: 0.347, longitude: 32.65, speedKmh: 0, eventType: 'ARRIVAL', address: 'Kampala Warehouse, Namanve', district: 'Kampala', batteryLevel: 65, recordedAt: new Date(Date.now() - 2.5 * 86400000) },
        { tripId: deliveredTrip.id, latitude: 0.347, longitude: 32.65, speedKmh: 0, eventType: 'DELIVERY', address: 'Kampala Warehouse, Namanve', district: 'Kampala', batteryLevel: 60, recordedAt: new Date(Date.now() - 2 * 86400000) },
      ],
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 30. CARBON PROJECT METHODOLOGY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Carbon Project Methodology...')

  const carbonProjects = await db.carbonProject.findMany({ where: { tenantId: ugTenant.id }, select: { id: true }, take: 2 })
  if (carbonProjects.length >= 1) {
    await db.carbonProjectMethodology.createMany({
      data: [
        { tenantId: ugTenant.id, projectId: carbonProjects[0].id, methodologyCode: 'AR-ACM0003', parameterName: 'Baseline Carbon Stock', parameterValue: 85.5, parameterUnit: 'tC/ha', source: 'IPCC Guidelines', confidence: 'HIGH', notes: 'Forest land baseline' },
        { tenantId: ugTenant.id, projectId: carbonProjects[0].id, methodologyCode: 'AR-ACM0003', parameterName: 'Annual Growth Rate', parameterValue: 4.2, parameterUnit: 'tCO2/ha/yr', source: 'Field measurement', confidence: 'MEDIUM', notes: 'Measured across 50 sample plots' },
        { tenantId: ugTenant.id, projectId: carbonProjects[0].id, methodologyCode: 'AR-ACM0003', parameterName: 'Leakage Factor', parameterValue: 0.05, parameterUnit: 'fraction', source: 'Default', confidence: 'LOW' },
        { tenantId: ugTenant.id, projectId: carbonProjects[0].id, methodologyCode: 'AR-ACM0003', parameterName: 'Non-CO2 Benefits', parameterValue: 12.0, parameterUnit: 'tCO2e/ha/yr', source: 'Literature review', confidence: 'MEDIUM', notes: 'N2O and CH4 reductions' },
      ],
    })
  }
  if (carbonProjects.length >= 2) {
    await db.carbonProjectMethodology.createMany({
      data: [
        { tenantId: ugTenant.id, projectId: carbonProjects[1].id, methodologyCode: 'GS-SOC-001', parameterName: 'Baseline SOC', parameterValue: 35.2, parameterUnit: 'tC/ha', source: 'Soil survey', confidence: 'HIGH' },
        { tenantId: ugTenant.id, projectId: carbonProjects[1].id, methodologyCode: 'GS-SOC-001', parameterName: 'SOC Change Rate', parameterValue: 0.45, parameterUnit: 'tC/ha/yr', source: 'Field measurement', confidence: 'MEDIUM', notes: 'Conservation agriculture practice' },
        { tenantId: ugTenant.id, projectId: carbonProjects[1].id, methodologyCode: 'GS-SOC-001', parameterName: 'Bulk Density', parameterValue: 1.35, parameterUnit: 'g/cm3', source: 'Lab analysis', confidence: 'HIGH' },
      ],
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 31. MFI REPAYMENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding MFI Repayments...')

  const paidSchedules = await db.mfiLoanSchedule.findMany({
    where: { status: 'PAID' },
    select: { id: true, loanId: true, principalDue: true, interestDue: true, totalDue: true, paidAt: true },
    take: 8,
  })
  if (paidSchedules.length > 0) {
    await db.mfiRepayment.createMany({
      data: paidSchedules.map((s) => ({
        tenantId: ugTenant.id,
        loanId: s.loanId,
        scheduleId: s.id,
        amount: Number(s.totalDue),
        principalAmount: Number(s.principalDue),
        interestAmount: Number(s.interestDue),
        penaltyAmount: 0,
        paymentMethod: 'MOBILE_MONEY',
        referenceNumber: `MFI-RP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        receivedBy: u2,
        notes: 'Regular installment payment',
      })),
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 32. VSLA LOAN REPAYMENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding VSLA Loan Repayments...')

  const activeVslaLoans = await db.vslaLoan.findMany({
    where: { status: { in: ['DISBURSED', 'REPAID', 'OVERDUE'] }, tenantId: ugTenant.id },
    select: { id: true },
    take: 5,
  })
  if (activeVslaLoans.length > 0) {
    await db.vslaLoanRepayment.createMany({
      data: activeVslaLoans.map((vl) => ({
        tenantId: ugTenant.id,
        loanId: vl.id,
        amount: 10000 + Math.floor(Math.random() * 30000),
        transactionRef: `VSLA-RP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })),
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 33. SCHEDULED REPORTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding Scheduled Reports...')

  const reportTemplates = await db.reportTemplate.findMany({ where: { tenantId: ugTenant.id }, select: { id: true }, take: 2 })
  if (reportTemplates.length > 0) {
    await db.scheduledReport.createMany({
      data: [
        { tenantId: ugTenant.id, templateId: reportTemplates[0].id, name: 'Weekly Farmer Registration', schedule: 'WEEKLY', cronExpression: '0 9 * * 1', recipients: JSON.stringify([users[0]?.id, u2]), parameters: '{}', lastRunAt: new Date(Date.now() - 3 * 86400000), nextRunAt: new Date(Date.now() + 4 * 86400000), isActive: true },
        { tenantId: ugTenant.id, templateId: reportTemplates[1].id, name: 'Monthly Loan Portfolio', schedule: 'MONTHLY', cronExpression: '0 8 1 * *', recipients: JSON.stringify([users[0]?.id, u2, u3]), parameters: '{}', lastRunAt: new Date(Date.now() - 15 * 86400000), nextRunAt: new Date(Date.now() + 15 * 86400000), isActive: true },
      ],
    })
  }

  console.log('  ✅ Missing seed data completed!')
}