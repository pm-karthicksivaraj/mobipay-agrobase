/**
 * Agrobase V3 — Extended Seed V2
 *
 * Seeds 55 additional Prisma models across all domains:
 * - Geographic Hierarchy (7): Region, SubRegion, District, Constituency, SubCounty, Parish, Village
 * - Org Hierarchy (2): Company, AgentAssignment
 * - RBAC (3): Permission, RolePermission, ModuleEntitlement
 * - Finance (7): Account, JournalEntry, JournalLine, PaymentAccount, PaymentTransaction, Escrow, ProduceIntake
 * - Carbon (2): CarbonFootprint, CarbonProjectMethodology
 * - Compliance (2): EudrDocument, EudrAuditLog
 * - CBAM (1): CbamCalculation
 * - Farm & Traceability (4): FarmPassport, TraceEvent, Commodity, CostOfCultivation
 * - Logistics (4): Vehicle, Shipment, ShipmentItem, ChildProfile
 * - Marketplace (2): MarketMatch, InputRequest
 * - Training & Surveys (2): TrainingAttendance, SurveyResponse
 * - VSLA (3): VslaMember, VslaAttendance, VslaLoanRepayment
 * - MFI (1): MfiRepayment
 * - Platform (13): ApiKey, ApiKeyUsageLog, BrandingConfig, Commodity, CooperativePayment,
 *                 IdMapping, MigrationLog, Subscription, ScheduledReport, Translation,
 *                 WebhookEndpoint, WebhookDelivery, TripTrackingEvent
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// ─── CONTEXT INTERFACE ──────────────────────────────────────────

interface SeedContext {
  ugTenant: { id: string }
  ekibbo: { id: string }
  mfiTenant: { id: string }
  users: { id: string; role: string }[]
  farmers: { id: string; firstName: string; lastName: string; phone: string }[]
  vslaGroups: { id: string }[]
  groups: { id: string; name: string }[]
  plots: { id: string; plotCode: string }[]
  carbonProjects: { id: string }[]
  trainings: { id: string }[]
  contracts: { id: string }[]
  batches: { id: string; batchId: string }[]
  warehouses: { id: string }[]
  marketProducts: { id: string }[]
  notifications: { id: string }[]
  transportTrips: { id: string }[]
  vslaMeetings: { id: string }[]
  vslaLoans: { id: string }[]
  mfiLoanSchedules: { id: string; loanId: string; totalDue: any; totalPaid: any; status: string }[]
  mfiLoansList: { id: string; status: string }[]
  eudrCompliances: { id: string; farmerId: string | null }[]
  reportTemplates: { id: string }[]
  settlements: { id: string }[]
  loans: { id: string }[]
}

export async function seedExtendedV2(ctx: SeedContext) {
  const {
    ugTenant, ekibbo, mfiTenant, users, farmers, vslaGroups,
    groups, plots, carbonProjects, trainings, contracts, batches,
    warehouses, marketProducts, notifications, transportTrips,
    vslaMeetings, vslaLoans, mfiLoanSchedules, mfiLoansList,
    eudrCompliances, reportTemplates, settlements, loans,
  } = ctx

  const u0 = users[0]?.id
  const u2 = users[2]?.id
  const u3 = users[3]?.id

  // ════════════════════════════════════════════════════════════
  // 1. GEOGRAPHIC HIERARCHY (7 models)
  // ════════════════════════════════════════════════════════════

  // ── Region ──────────────────────────────────────────────────
  console.log('  ↳ Seeding Regions...')
  const regions = await db.region.createMany({
    data: [
      { name: 'Central', country: 'Uganda' },
      { name: 'Eastern', country: 'Uganda' },
      { name: 'Northern', country: 'Uganda' },
    ],
  })

  // Fetch created regions for foreign keys
  const regionRows = await db.region.findMany({ where: { country: 'Uganda' }, orderBy: { name: 'asc' } })

  // ── SubRegion ───────────────────────────────────────────────
  console.log('  ↳ Seeding SubRegions...')
  await db.subRegion.createMany({
    data: [
      { name: 'Buganda', regionId: regionRows[0]?.id ?? '' },
      { name: 'Busoga', regionId: regionRows[0]?.id ?? '' },
      { name: 'Bugisu', regionId: regionRows[1]?.id ?? '' },
      { name: 'Teso', regionId: regionRows[1]?.id ?? '' },
      { name: 'Acholi', regionId: regionRows[2]?.id ?? '' },
      { name: 'Lango', regionId: regionRows[2]?.id ?? '' },
    ],
  })

  const subRegionRows = await db.subRegion.findMany({ orderBy: { name: 'asc' } })

  // ── District ────────────────────────────────────────────────
  console.log('  ↳ Seeding Districts...')
  await db.district.createMany({
    data: [
      { name: 'Kampala', subRegionId: subRegionRows[0]?.id ?? '' },
      { name: 'Wakiso', subRegionId: subRegionRows[0]?.id ?? '' },
      { name: 'Mukono', subRegionId: subRegionRows[1]?.id ?? '' },
      { name: 'Mbale', subRegionId: subRegionRows[2]?.id ?? '' },
      { name: 'Soroti', subRegionId: subRegionRows[3]?.id ?? '' },
    ],
  })

  const districtRows = await db.district.findMany({ orderBy: { name: 'asc' } })

  // ── Constituency ────────────────────────────────────────────
  console.log('  ↳ Seeding Constituencies...')
  await db.constituency.createMany({
    data: [
      { name: 'Kawempe', districtId: districtRows[0]?.id ?? '' },
      { name: 'Makindye', districtId: districtRows[0]?.id ?? '' },
      { name: 'Nansana', districtId: districtRows[1]?.id ?? '' },
      { name: 'Mbale Municipality', districtId: districtRows[3]?.id ?? '' },
    ],
  })

  const constituencyRows = await db.constituency.findMany({ orderBy: { name: 'asc' } })

  // ── SubCounty ───────────────────────────────────────────────
  console.log('  ↳ Seeding SubCounties...')
  await db.subCounty.createMany({
    data: [
      { name: 'Kawempe', constituencyId: constituencyRows[0]?.id ?? '' },
      { name: 'Makindye Division', constituencyId: constituencyRows[1]?.id ?? '' },
      { name: 'Nansana Municipality', constituencyId: constituencyRows[2]?.id ?? '' },
      { name: 'Bungokho', constituencyId: constituencyRows[3]?.id ?? '' },
    ],
  })

  const subCountyRows = await db.subCounty.findMany({ orderBy: { name: 'asc' } })

  // ── Parish ──────────────────────────────────────────────────
  console.log('  ↳ Seeding Parishes...')
  await db.parish.createMany({
    data: [
      { name: 'Kawempe I', subCountyId: subCountyRows[0]?.id ?? '' },
      { name: 'Kawempe II', subCountyId: subCountyRows[0]?.id ?? '' },
      { name: 'Kibuye', subCountyId: subCountyRows[1]?.id ?? '' },
      { name: 'Bungokho Central', subCountyId: subCountyRows[3]?.id ?? '' },
    ],
  })

  const parishRows = await db.parish.findMany({ orderBy: { name: 'asc' } })

  // ── Village ─────────────────────────────────────────────────
  console.log('  ↳ Seeding Villages...')
  await db.village.createMany({
    data: [
      { name: 'Bwaise', parishId: parishRows[0]?.id ?? '' },
      { name: 'Kikoni', parishId: parishRows[1]?.id ?? '' },
      { name: 'Lubaga', parishId: parishRows[2]?.id ?? '' },
      { name: 'Bumasoba', parishId: parishRows[3]?.id ?? '' },
      { name: 'Bukhalu', parishId: parishRows[3]?.id ?? '' },
    ],
  })

  // ════════════════════════════════════════════════════════════
  // 2. ORG HIERARCHY (2 models)
  // ════════════════════════════════════════════════════════════

  // ── Company ─────────────────────────────────────────────────
  console.log('  ↳ Seeding Companies...')
  await db.company.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        name: 'Uganda Coffee Cooperatives Union',
        type: 'Cooperative',
        contactPerson: 'Samuel Kato',
        phone: '+256414123456',
        email: 'info@uccu.co.ug',
        address: 'Plot 22, Jinja Road, Kampala',
      },
      {
        tenantId: ekibbo.id,
        name: 'Mountain Harvest Ltd',
        type: 'Agribusiness',
        contactPerson: 'David Tumwesigye',
        phone: '+256414234567',
        email: 'contact@mountainharvest.co.ug',
        address: 'Industrial Area, Mbale',
      },
    ],
  })

  // ── AgentAssignment ─────────────────────────────────────────
  console.log('  ↳ Seeding AgentAssignments...')
  await db.agentAssignment.createMany({
    data: [
      {
        agentId: u2 ?? '',
        groupId: groups[0]?.id ?? '',
        groupType: 'FARMER_GROUP',
      },
      {
        agentId: u3 ?? '',
        groupId: groups[1]?.id ?? '',
        groupType: 'FARMER_GROUP',
      },
    ],
  })

  // ════════════════════════════════════════════════════════════
  // 3. RBAC (3 models)
  // ════════════════════════════════════════════════════════════

  // ── Permission ──────────────────────────────────────────────
  console.log('  ↳ Seeding Permissions...')
  const permissions = [
    { name: 'farmers:read', module: 'farmers', action: 'read', description: 'View farmer profiles and details' },
    { name: 'farmers:create', module: 'farmers', action: 'create', description: 'Register new farmers' },
    { name: 'farmers:update', module: 'farmers', action: 'update', description: 'Edit farmer profiles' },
    { name: 'vsla:read', module: 'vsla', action: 'read', description: 'View VSLA group data' },
    { name: 'vsla:manage', module: 'vsla', action: 'manage', description: 'Manage VSLA groups, loans, savings' },
    { name: 'marketplace:read', module: 'marketplace', action: 'read', description: 'View marketplace listings' },
    { name: 'marketplace:write', module: 'marketplace', action: 'write', description: 'Create and manage marketplace listings' },
    { name: 'compliance:read', module: 'compliance', action: 'read', description: 'View compliance records' },
    { name: 'reports:read', module: 'reports', action: 'read', description: 'View reports and dashboards' },
    { name: 'traceability:read', module: 'traceability', action: 'read', description: 'View traceability data' },
  ]

  const createdPermissions = await db.permission.createMany({ data: permissions })
  const permissionRows = await db.permission.findMany({ orderBy: { name: 'asc' } })

  // ── RolePermission ──────────────────────────────────────────
  console.log('  ↳ Seeding RolePermissions...')
  const eoPermissions = permissionRows.filter(p =>
    ['farmers:read', 'farmers:create', 'farmers:update', 'vsla:read', 'traceability:read'].includes(p.name)
  )
  await db.rolePermission.createMany({
    data: eoPermissions.map(p => ({
      role: 'EXTENSION_OFFICER',
      permissionId: p.id,
    })),
  })

  const caPermissions = permissionRows.filter(p =>
    ['farmers:read', 'vsla:manage', 'marketplace:read', 'marketplace:write', 'compliance:read', 'reports:read'].includes(p.name)
  )
  await db.rolePermission.createMany({
    data: caPermissions.map(p => ({
      role: 'COUNTRY_ADMIN',
      permissionId: p.id,
    })),
  })

  // ── ModuleEntitlement ───────────────────────────────────────
  console.log('  ↳ Seeding ModuleEntitlements...')
  await db.moduleEntitlement.createMany({
    data: [
      { tenantId: ugTenant.id, moduleCode: 'VSLA', isEnabled: true, config: '{"maxGroups": 50, "defaultInterestRate": 10}' },
      { tenantId: ugTenant.id, moduleCode: 'MARKETPLACE', isEnabled: true, config: '{"commissionRate": 2.5}' },
      { tenantId: ugTenant.id, moduleCode: 'TRACE', isEnabled: true, config: '{"enableQR": true, "enableBlockchain": false}' },
      { tenantId: ekibbo.id, moduleCode: 'VSLA', isEnabled: false, config: null },
      { tenantId: ekibbo.id, moduleCode: 'TRACE', isEnabled: true, config: '{"enableQR": true}' },
    ],
  })

  // ════════════════════════════════════════════════════════════
  // 4. FINANCE (7 models)
  // ════════════════════════════════════════════════════════════

  // ── Account (Chart of Accounts) ─────────────────────────────
  console.log('  ↳ Seeding Accounts...')
  const accounts = [
    { code: '1001', name: 'Cash', type: 'ASSET', normalBalance: 'DEBIT' },
    { code: '1002', name: 'Bank - Stanbic', type: 'ASSET', normalBalance: 'DEBIT' },
    { code: '1003', name: 'Mobile Money', type: 'ASSET', normalBalance: 'DEBIT' },
    { code: '1004', name: 'Accounts Receivable', type: 'ASSET', normalBalance: 'DEBIT' },
    { code: '2001', name: 'Accounts Payable', type: 'LIABILITY', normalBalance: 'CREDIT' },
    { code: '2002', name: 'Farmer Payable', type: 'LIABILITY', normalBalance: 'CREDIT' },
    { code: '3001', name: 'Member Equity', type: 'EQUITY', normalBalance: 'CREDIT' },
    { code: '4001', name: 'Produce Sales', type: 'REVENUE', normalBalance: 'CREDIT' },
    { code: '5001', name: 'Operating Expenses', type: 'EXPENSE', normalBalance: 'DEBIT' },
    { code: '5002', name: 'Transport Costs', type: 'EXPENSE', normalBalance: 'DEBIT' },
  ]

  const createdAccounts = await db.account.createMany({
    data: accounts.map(a => ({ tenantId: ugTenant.id, ...a })),
  })
  const accountRows = await db.account.findMany({ where: { tenantId: ugTenant.id }, orderBy: { code: 'asc' } })

  // ── JournalEntry ────────────────────────────────────────────
  console.log('  ↳ Seeding JournalEntries...')
  const journalEntry = await db.journalEntry.create({
    data: {
      tenantId: ugTenant.id,
      date: new Date('2026-01-15'),
      description: 'Produce intake payment - Coffee batch from Kibale farmers',
      reference: 'INTAKE-2026-001',
      status: 'POSTED',
      createdBy: u2,
      postedBy: u0,
      postedAt: new Date('2026-01-15T14:30:00Z'),
    },
  })

  // ── JournalLine ─────────────────────────────────────────────
  console.log('  ↳ Seeding JournalLines...')
  await db.journalLine.createMany({
    data: [
      {
        journalEntryId: journalEntry.id,
        accountId: accountRows[0]?.id ?? '',   // Cash
        entryType: 'DEBIT',
        amount: 4500000,
        description: 'Cash payment for coffee intake',
      },
      {
        journalEntryId: journalEntry.id,
        accountId: accountRows[5]?.id ?? '',   // Farmer Payable
        entryType: 'CREDIT',
        amount: 4500000,
        description: 'Payable to Kibale coffee farmers',
      },
    ],
  })

  // ── PaymentAccount ──────────────────────────────────────────
  console.log('  ↳ Seeding PaymentAccounts...')
  await db.paymentAccount.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        accountName: 'Agrobase Uganda MTN MoMo',
        accountType: 'MERCHANT',
        email: 'finance@agrobase.co.ug',
        address: 'Kampala, Uganda',
      },
      {
        tenantId: ekibbo.id,
        accountName: 'EKIBBO Airtel Money',
        accountType: 'MERCHANT',
        email: 'payments@ekibbo.co.ug',
      },
    ],
  })

  // ── PaymentTransaction ──────────────────────────────────────
  console.log('  ↳ Seeding PaymentTransactions...')
  await db.paymentTransaction.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        provider: 'MTN_MOMO',
        type: 'DISBURSEMENT',
        amount: 350000,
        currency: 'UGX',
        recipientPhone: farmers[0]?.phone ?? '+256770000001',
        recipientName: `${farmers[0]?.firstName ?? 'James'} ${farmers[0]?.lastName ?? 'Mugisha'}`,
        status: 'COMPLETED',
        initiatedBy: u2,
        providerTxnRef: 'MTN-2026-001-ABC',
        completedAt: new Date('2026-01-20T10:15:00Z'),
      },
      {
        tenantId: ugTenant.id,
        provider: 'AINTEL',
        type: 'COLLECTION',
        amount: 120000,
        currency: 'UGX',
        recipientPhone: farmers[5]?.phone ?? '+256770000006',
        recipientName: `${farmers[5]?.firstName ?? 'Mary'} ${farmers[5]?.lastName ?? 'Akello'}`,
        status: 'COMPLETED',
        initiatedBy: u2,
        providerTxnRef: 'AIR-2026-002-DEF',
        completedAt: new Date('2026-01-22T11:45:00Z'),
      },
      {
        tenantId: ugTenant.id,
        provider: 'MTN_MOMO',
        type: 'DISBURSEMENT',
        amount: 500000,
        currency: 'UGX',
        recipientPhone: farmers[10]?.phone ?? '+256770000011',
        recipientName: `${farmers[10]?.firstName ?? 'Samuel'} ${farmers[10]?.lastName ?? 'Kato'}`,
        status: 'PENDING',
        initiatedBy: u3,
      },
    ],
  })

  // ── Escrow ──────────────────────────────────────────────────
  console.log('  ↳ Seeding Escrows...')
  await db.escrow.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        sourceType: 'PURCHASE',
        sourceId: 'PUR-2026-001',
        reference: 'ESC-2026-001',
        payerName: 'Kibale Coffee Farmers Group',
        payeeName: 'James Mugisha',
        amount: 1800000,
        currency: 'UGX',
        feeRate: 2.5,
        feeAmount: 45000,
        status: 'HELD',
        heldAt: new Date('2026-01-18T09:00:00Z'),
        heldBy: u0,
        autoReleaseAt: new Date('2026-02-18T09:00:00Z'),
      },
      {
        tenantId: ugTenant.id,
        sourceType: 'MARKETPLACE_ORDER',
        sourceId: 'MO-2026-005',
        reference: 'ESC-2026-002',
        payerName: 'Tropical Exports Ltd',
        payeeName: 'Sarah Achieng',
        amount: 2500000,
        currency: 'UGX',
        feeRate: 2.5,
        feeAmount: 62500,
        status: 'RELEASED',
        heldAt: new Date('2026-01-10T08:00:00Z'),
        heldBy: u0,
        releasedAt: new Date('2026-01-25T16:00:00Z'),
        releasedBy: u0,
        releasedAmount: 2437500,
      },
    ],
  })

  // ── ProduceIntake ───────────────────────────────────────────
  console.log('  ↳ Seeding ProduceIntakes...')
  await db.produceIntake.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        farmerId: farmers[0]?.id,
        commodity: 'Coffee',
        variety: 'Arabica SL28',
        quantityKg: 450,
        moistureContent: 12.5,
        grade: 'A',
        pricePerKg: 10000,
        totalAmount: 4500000,
        status: 'STORED',
        receivedBy: u2,
        warehouse: 'Warehouse A - Kampala',
        qualityNotes: 'Good quality, well-dried cherries',
      },
      {
        tenantId: ugTenant.id,
        farmerId: farmers[3]?.id,
        commodity: 'Coffee',
        variety: 'Robusta',
        quantityKg: 800,
        moistureContent: 13.2,
        grade: 'B',
        pricePerKg: 5500,
        totalAmount: 4400000,
        status: 'ACCEPTED',
        receivedBy: u3,
        warehouse: 'Warehouse B - Jinja',
        qualityNotes: 'Slight moisture issue, re-drying recommended',
      },
      {
        tenantId: ugTenant.id,
        farmerId: farmers[8]?.id,
        commodity: 'Maize',
        variety: 'Longe 10H',
        quantityKg: 2000,
        moistureContent: 14.0,
        grade: 'Standard',
        pricePerKg: 1200,
        totalAmount: 2400000,
        status: 'WEIGHED',
        receivedBy: u2,
      },
    ],
  })

  // ════════════════════════════════════════════════════════════
  // 5. CARBON (2 models)
  // ════════════════════════════════════════════════════════════

  // ── CarbonFootprint ─────────────────────────────────────────
  console.log('  ↳ Seeding CarbonFootprints...')
  const cultivation = await db.cultivation.findFirst({ select: { id: true } })
  const cultivationId = cultivation?.id ?? plots[0]?.id ?? ''

  await db.carbonFootprint.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        cultivationId,
        commodity: 'Coffee',
        totalEmissionsKgCO2e: 1250.5,
        emissionsPerKg: 0.42,
        emissionsPerHectare: 3150.0,
        breakdown: JSON.stringify({ FERTILIZER: 420.5, FUEL: 310.0, PROCESSING: 350.0, TRANSPORT: 170.0 }),
        stages: JSON.stringify([
          { stage: 'NURSERY', emissions: 50.0 },
          { stage: 'PLANTING', emissions: 200.5 },
          { stage: 'GROWTH', emissions: 600.0 },
          { stage: 'HARVESTING', emissions: 250.0 },
          { stage: 'PROCESSING', emissions: 150.0 },
        ]),
        calculationMethod: 'IPCC_TIER2',
        verificationStatus: 'VERIFIED',
        verifiedBy: u0,
        verifiedAt: new Date('2026-02-01T10:00:00Z'),
      },
      {
        tenantId: ugTenant.id,
        cultivationId,
        commodity: 'Maize',
        totalEmissionsKgCO2e: 890.0,
        emissionsPerKg: 0.15,
        emissionsPerHectare: 1780.0,
        breakdown: JSON.stringify({ FERTILIZER: 350.0, FUEL: 240.0, PROCESSING: 180.0, TRANSPORT: 120.0 }),
        stages: JSON.stringify([
          { stage: 'LAND_PREP', emissions: 150.0 },
          { stage: 'PLANTING', emissions: 90.0 },
          { stage: 'GROWTH', emissions: 400.0 },
          { stage: 'HARVESTING', emissions: 250.0 },
        ]),
        calculationMethod: 'IPCC_TIER1',
        verificationStatus: 'DRAFT',
      },
    ],
  })

  // ── CarbonProjectMethodology ────────────────────────────────
  console.log('  ↳ Seeding CarbonProjectMethodologies...')
  await db.carbonProjectMethodology.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        projectId: carbonProjects[0]?.id ?? '',
        methodologyCode: 'AR-ACM0003',
        parameterName: 'Baseline Carbon Stock',
        parameterValue: 120.5,
        parameterUnit: 'tCO2e/ha',
        source: 'IPCC 2019 Refinement',
        confidence: 'HIGH',
        notes: 'Afforestation and reforestation methodology',
      },
      {
        tenantId: ugTenant.id,
        projectId: carbonProjects[0]?.id ?? '',
        methodologyCode: 'AR-ACM0003',
        parameterName: 'Annual Emission Reduction',
        parameterValue: 8.75,
        parameterUnit: 'tCO2e/ha/yr',
        source: 'Verra VCS',
        confidence: 'MEDIUM',
      },
      {
        tenantId: ugTenant.id,
        projectId: carbonProjects[0]?.id ?? '',
        methodologyCode: 'VM0042',
        parameterName: 'Tree Survival Rate',
        parameterValue: 85.0,
        parameterUnit: '%',
        source: 'Field Survey 2025',
        confidence: 'HIGH',
      },
    ],
  })

  // ════════════════════════════════════════════════════════════
  // 6. COMPLIANCE (2 models)
  // ════════════════════════════════════════════════════════════

  // ── EudrDocument ────────────────────────────────────────────
  console.log('  ↳ Seeding EudrDocuments...')
  await db.eudrDocument.createMany({
    data: [
      {
        eudrComplianceId: eudrCompliances[0]?.id ?? '',
        documentType: 'LAND_TITLE',
        fileName: 'land_title_kibale_plot1.pdf',
        fileUrl: '/uploads/eudr/land_title_kibale_plot1.pdf',
        fileSize: 2048576,
        verified: true,
        verifiedBy: u2,
        verifiedAt: new Date('2026-01-10T09:00:00Z'),
      },
      {
        eudrComplianceId: eudrCompliances[0]?.id ?? '',
        documentType: 'USE_RIGHTS',
        fileName: 'use_rights_kibale_2026.pdf',
        fileUrl: '/uploads/eudr/use_rights_kibale_2026.pdf',
        fileSize: 1536000,
        verified: true,
        verifiedBy: u2,
        verifiedAt: new Date('2026-01-12T14:30:00Z'),
      },
      {
        eudrComplianceId: eudrCompliances[1]?.id ?? '',
        documentType: 'ENVIRONMENTAL_PERMIT',
        fileName: 'env_permit_mt_elgon.pdf',
        fileUrl: '/uploads/eudr/env_permit_mt_elgon.pdf',
        fileSize: 3072000,
        verified: false,
      },
      {
        eudrComplianceId: eudrCompliances[2]?.id ?? '',
        documentType: 'SURVEY_MAP',
        fileName: 'survey_map_gulu.pdf',
        fileUrl: '/uploads/eudr/survey_map_gulu.pdf',
        fileSize: 5120000,
        verified: true,
        verifiedBy: u3,
        verifiedAt: new Date('2026-01-15T11:00:00Z'),
      },
    ],
  })

  // ── EudrAuditLog ────────────────────────────────────────────
  console.log('  ↳ Seeding EudrAuditLogs...')
  await db.eudrAuditLog.createMany({
    data: [
      {
        eudrComplianceId: eudrCompliances[0]?.id ?? '',
        action: 'SUBMITTED',
        performedBy: u2,
        details: 'Initial EUDR compliance submission with land title and use rights documents',
      },
      {
        eudrComplianceId: eudrCompliances[0]?.id ?? '',
        action: 'VERIFIED',
        performedBy: u0,
        details: 'All documents verified and compliance confirmed',
      },
      {
        eudrComplianceId: eudrCompliances[1]?.id ?? '',
        action: 'CREATED',
        performedBy: u3,
        details: 'EUDR compliance record created for Mt. Elgon farm group',
      },
      {
        eudrComplianceId: eudrCompliances[2]?.id ?? '',
        action: 'SUBMITTED',
        performedBy: u2,
        details: 'Gulu farm group compliance submission - pending verification',
      },
    ],
  })

  // ════════════════════════════════════════════════════════════
  // 7. CBAM (1 model)
  // ════════════════════════════════════════════════════════════

  // ── CbamCalculation ─────────────────────────────────────────
  console.log('  ↳ Seeding CbamCalculations...')
  await db.cbamCalculation.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        commodity: 'Coffee',
        originCountry: 'Uganda',
        quantityTonnes: 50.0,
        embeddedEmissionsPerTonne: 2.85,
        totalEmbeddedEmissions: 142.5,
        euCarbonPrice: 75.0,
        cbamCertificateCost: 10687.5,
        carbonCreditsApplied: 15.0,
        netCost: 9562.5,
        reportingPeriod: '2026-Q1',
        status: 'SUBMITTED',
      },
      {
        tenantId: ugTenant.id,
        commodity: 'Cocoa',
        originCountry: 'Uganda',
        quantityTonnes: 20.0,
        embeddedEmissionsPerTonne: 3.42,
        totalEmbeddedEmissions: 68.4,
        euCarbonPrice: 75.0,
        cbamCertificateCost: 5130.0,
        carbonCreditsApplied: 0,
        netCost: 5130.0,
        reportingPeriod: '2026-Q1',
        status: 'DRAFT',
      },
    ],
  })

  // ════════════════════════════════════════════════════════════
  // 8. FARM & TRACEABILITY (4 models)
  // ════════════════════════════════════════════════════════════

  // ── FarmPassport ────────────────────────────────────────────
  console.log('  ↳ Seeding FarmPassports...')
  await db.farmPassport.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        passportId: 'AGRO-UG-2026-ABCDEF',
        farmerId: farmers[0]?.id ?? '',
        passportData: JSON.stringify({
          farmerName: 'James Mugisha',
          farmerCode: 'AGR-0001',
          group: 'Kibale Coffee Farmers',
          district: 'Kampala',
          crops: ['Coffee - Arabica SL28'],
          certifications: ['RFA'],
          membershipSince: '2024-01-15',
          totalAreaHa: 2.5,
        }),
        qrCodeUrl: '/qr/AGRO-UG-2026-ABCDEF.png',
        verificationUrl: 'https://verify.agrobase.co/passport/AGRO-UG-2026-ABCDEF',
        isActive: true,
      },
      {
        tenantId: ugTenant.id,
        passportId: 'AGRO-UG-2026-GHIJKL',
        farmerId: farmers[1]?.id ?? '',
        passportData: JSON.stringify({
          farmerName: 'Sarah Achieng',
          farmerCode: 'AGR-0002',
          group: 'Kibale Coffee Farmers',
          district: 'Kampala',
          crops: ['Coffee - Robusta'],
          certifications: ['Organic'],
          membershipSince: '2024-03-10',
          totalAreaHa: 1.8,
        }),
        qrCodeUrl: '/qr/AGRO-UG-2026-GHIJKL.png',
        verificationUrl: 'https://verify.agrobase.co/passport/AGRO-UG-2026-GHIJKL',
        isActive: true,
      },
    ],
  })

  // ── TraceEvent ──────────────────────────────────────────────
  console.log('  ↳ Seeding TraceEvents...')
  await db.traceEvent.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        productBatchId: batches[0]?.id ?? '',
        eventType: 'HARVEST',
        stage: 'FIELD',
        locationName: 'Kibale Coffee Farm - Plot 1',
        latitude: 0.95,
        longitude: 30.25,
        actorId: farmers[0]?.id,
        actorName: 'James Mugisha',
        actorType: 'FARMER',
        details: JSON.stringify({ quantityKg: 1800, moistureContent: 11.5, variety: 'Arabica SL28' }),
      },
      {
        tenantId: ugTenant.id,
        productBatchId: batches[0]?.id ?? '',
        eventType: 'PROCESSING',
        stage: 'WET_MILL',
        locationName: 'Kibale Washing Station',
        latitude: 0.96,
        longitude: 30.26,
        actorId: u2,
        actorName: 'John Okello',
        actorType: 'EXTENSION_OFFICER',
        details: JSON.stringify({ process: 'Washing', durationHours: 48, waterSource: 'River Kibale' }),
      },
      {
        tenantId: ugTenant.id,
        productBatchId: batches[1]?.id ?? '',
        eventType: 'HARVEST',
        stage: 'FIELD',
        locationName: 'Gulu Maize Farm - Plot A',
        latitude: 2.774,
        longitude: 32.299,
        actorId: farmers[15]?.id,
        actorName: 'Emmanuel Tumusiime',
        actorType: 'FARMER',
        details: JSON.stringify({ quantityKg: 12000, variety: 'Longe 10H', moistureContent: 13.0 }),
      },
    ],
  })

  // ── Commodity ───────────────────────────────────────────────
  console.log('  ↳ Seeding Commodities...')
  await db.commodity.createMany({
    data: [
      { name: 'Coffee', category: 'Crop', unit: 'Kg' },
      { name: 'Maize', category: 'Crop', unit: 'Kg' },
      { name: 'Cocoa', category: 'Crop', unit: 'Kg' },
      { name: 'Cassava', category: 'Crop', unit: 'Kg' },
      { name: 'Vanilla', category: 'Crop', unit: 'Kg' },
      { name: 'Beans', category: 'Crop', unit: 'Kg' },
      { name: 'Avocado', category: 'Crop', unit: 'Kg' },
      { name: 'Rice', category: 'Crop', unit: 'Kg' },
      { name: 'Sorghum', category: 'Crop', unit: 'Kg' },
      { name: 'Groundnuts', category: 'Crop', unit: 'Kg' },
      { name: 'Banana', category: 'Crop', unit: 'Bunches' },
      { name: 'Milk', category: 'Livestock', unit: 'Litres' },
      { name: 'Eggs', category: 'Livestock', unit: 'Tray' },
      { name: 'Poultry', category: 'Livestock', unit: 'Kg' },
      { name: 'Pine Timber', category: 'Forestry', unit: 'Cubic Metres' },
      { name: 'Tilapia', category: 'Fishery', unit: 'Kg' },
    ],
  })

  // ── CostOfCultivation ───────────────────────────────────────
  console.log('  ↳ Seeding CostOfCultivations...')
  await db.costOfCultivation.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        farmerId: farmers[0]?.id,
        commodity: 'Coffee',
        country: 'Uganda',
        areaHectares: 2.5,
        season: '2025A',
        costBreakdown: JSON.stringify({
          landPreparation: 300000,
          seeds: 150000,
          fertilizer: 450000,
          pesticide: 200000,
          labor: 800000,
          harvesting: 350000,
          transport: 150000,
          processing: 400000,
        }),
        totalCost: 2800000,
        expectedYield: 2800,
        expectedRevenue: 14000000,
        actualYield: 2450,
        actualRevenue: 12250000,
        profitLoss: 9450000,
        roi: 337.5,
        status: 'ACTUAL',
      },
      {
        tenantId: ugTenant.id,
        farmerId: farmers[3]?.id,
        commodity: 'Maize',
        country: 'Uganda',
        areaHectares: 4.0,
        season: '2025B',
        costBreakdown: JSON.stringify({
          landPreparation: 400000,
          seeds: 200000,
          fertilizer: 600000,
          pesticide: 150000,
          labor: 1000000,
          harvesting: 300000,
          transport: 200000,
        }),
        totalCost: 2850000,
        expectedYield: 12000,
        expectedRevenue: 14400000,
        actualYield: 10500,
        actualRevenue: 12600000,
        profitLoss: 9750000,
        roi: 342.1,
        status: 'ACTUAL',
      },
    ],
  })

  // ════════════════════════════════════════════════════════════
  // 9. LOGISTICS (4 models)
  // ════════════════════════════════════════════════════════════

  // ── Vehicle ─────────────────────────────────────────────────
  console.log('  ↳ Seeding Vehicles...')
  await db.vehicle.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        plateNumber: 'UAB 234K',
        type: 'LORRY',
        capacity: 10000,
        driverName: 'Robert Ssentongo',
        driverPhone: '+256782123456',
      },
      {
        tenantId: ugTenant.id,
        plateNumber: 'UAC 567M',
        type: 'TRUCK',
        capacity: 20000,
        driverName: 'Peter Ochan',
        driverPhone: '+256783234567',
      },
      {
        tenantId: ugTenant.id,
        plateNumber: 'UAD 890N',
        type: 'PICKUP',
        capacity: 3000,
        driverName: 'Francis Opio',
        driverPhone: '+256784345678',
      },
    ],
  })

  // ── Shipment ────────────────────────────────────────────────
  console.log('  ↳ Seeding Shipments...')
  const shipment1 = await db.shipment.create({
    data: {
      tenantId: ugTenant.id,
      shipmentCode: 'SHP-UG-2026-0001',
      status: 'IN_TRANSIT',
      driverName: 'Robert Ssentongo',
      driverPhone: '+256782123456',
      totalWeight: 5000,
      route: 'Kampala → Mbale → Kenyan Border',
      departureTime: new Date('2026-02-01T06:00:00Z'),
      notes: 'Coffee shipment for export via Mombasa port',
    },
  })

  await db.shipment.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        shipmentCode: 'SHP-UG-2026-0002',
        status: 'DELIVERED',
        driverName: 'Peter Ochan',
        driverPhone: '+256783234567',
        totalWeight: 12000,
        route: 'Gulu → Kampala',
        departureTime: new Date('2026-01-28T05:30:00Z'),
        arrivalTime: new Date('2026-01-28T18:45:00Z'),
        notes: 'Maize delivery to Kampala warehouse',
      },
      {
        tenantId: ugTenant.id,
        shipmentCode: 'SHP-UG-2026-0003',
        status: 'PLANNED',
        driverName: 'Francis Opio',
        driverPhone: '+256784345678',
        totalWeight: 2500,
        route: 'Kibale → Kampala',
        notes: 'Coffee cherry collection run',
      },
    ],
  })

  // ── ShipmentItem ────────────────────────────────────────────
  console.log('  ↳ Seeding ShipmentItems...')
  await db.shipmentItem.createMany({
    data: [
      {
        shipmentId: shipment1.id,
        commodity: 'Arabica Coffee',
        grade: 'A',
        quantity: 3000,
        batchCode: batches[0]?.batchId ?? 'BAT-000001',
      },
      {
        shipmentId: shipment1.id,
        commodity: 'Robusta Coffee',
        grade: 'Premium',
        quantity: 2000,
        batchCode: batches[2]?.batchId ?? 'BAT-000003',
      },
    ],
  })

  // ── ChildProfile ────────────────────────────────────────────
  console.log('  ↳ Seeding ChildProfiles...')
  await db.childProfile.createMany({
    data: [
      {
        farmerId: farmers[0]?.id ?? '',
        firstName: 'Brian',
        lastName: 'Mugisha',
        gender: 'Male',
        dateOfBirth: new Date('2012-05-15'),
        schoolName: 'Kibale Primary School',
      },
      {
        farmerId: farmers[0]?.id ?? '',
        firstName: 'Grace',
        lastName: 'Mugisha',
        gender: 'Female',
        dateOfBirth: new Date('2015-09-22'),
        schoolName: 'Kibale Primary School',
      },
      {
        farmerId: farmers[3]?.id ?? '',
        firstName: 'Owen',
        lastName: 'Nakamya',
        gender: 'Male',
        dateOfBirth: new Date('2014-01-08'),
        schoolName: 'Kampala Parents School',
      },
    ],
  })

  // ════════════════════════════════════════════════════════════
  // 10. MARKETPLACE (2 models)
  // ════════════════════════════════════════════════════════════

  // ── MarketMatch ─────────────────────────────────────────────
  console.log('  ↳ Seeding MarketMatches...')
  await db.marketMatch.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        productId: marketProducts[0]?.id,
        buyerName: 'Good African Coffee Ltd',
        buyerPhone: '+256414567890',
        quantity: '500',
        pricePerUnit: 11000,
        totalValue: 5500000,
        status: 'CONFIRMED',
      },
      {
        tenantId: ugTenant.id,
        productId: marketProducts[1]?.id,
        buyerName: 'Uganda Grain Traders',
        buyerPhone: '+256414678901',
        quantity: '2000',
        pricePerUnit: 1300,
        totalValue: 2600000,
        status: 'PAID',
      },
      {
        tenantId: ugTenant.id,
        productId: marketProducts[2]?.id,
        buyerName: 'Kyagalatemi Farm Products',
        buyerPhone: '+256414789012',
        quantity: '300',
        pricePerUnit: 10500,
        totalValue: 3150000,
        status: 'PENDING',
      },
    ],
  })

  // ── InputRequest ────────────────────────────────────────────
  console.log('  ↳ Seeding InputRequests...')
  await db.inputRequest.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        farmerName: `${farmers[0]?.firstName ?? 'James'} ${farmers[0]?.lastName ?? 'Mugisha'}`,
        farmerPhone: farmers[0]?.phone ?? '+256770000001',
        product: 'NPK Fertilizer 50kg',
        quantity: '5',
        unitPrice: 120000,
        totalPrice: 600000,
        status: 'DELIVERED',
      },
      {
        tenantId: ugTenant.id,
        farmerName: `${farmers[3]?.firstName ?? 'Grace'} ${farmers[3]?.lastName ?? 'Nakamya'}`,
        farmerPhone: farmers[3]?.phone ?? '+256770000004',
        product: 'Hybrid Maize Seeds - Longe 10H (25kg)',
        quantity: '4',
        unitPrice: 85000,
        totalPrice: 340000,
        status: 'CONFIRMED',
      },
      {
        tenantId: ugTenant.id,
        farmerName: `${farmers[8]?.firstName ?? 'David'} ${farmers[8]?.lastName ?? 'Okello'}`,
        farmerPhone: farmers[8]?.phone ?? '+256770000009',
        product: 'DAP Fertilizer 50kg',
        quantity: '10',
        unitPrice: 135000,
        totalPrice: 1350000,
        status: 'PENDING',
      },
    ],
  })

  // ════════════════════════════════════════════════════════════
  // 11. TRAINING & SURVEYS (2 models)
  // ════════════════════════════════════════════════════════════

  // ── TrainingAttendance ──────────────────────────────────────
  console.log('  ↳ Seeding TrainingAttendances...')
  const trainingAttendanceData: { trainingId: string; farmerId: string; attended: boolean }[] = []
  if (trainings[0]?.id) {
    for (let i = 0; i < 10; i++) {
      trainingAttendanceData.push({
        trainingId: trainings[0].id,
        farmerId: farmers[i]?.id ?? '',
        attended: i < 8,
      })
    }
  }
  if (trainings[1]?.id) {
    for (let i = 10; i < 18; i++) {
      trainingAttendanceData.push({
        trainingId: trainings[1].id,
        farmerId: farmers[i]?.id ?? '',
        attended: i < 16,
      })
    }
  }
  if (trainingAttendanceData.length > 0) {
    await db.trainingAttendance.createMany({ data: trainingAttendanceData })
  }

  // ── SurveyResponse ──────────────────────────────────────────
  console.log('  ↳ Seeding SurveyResponses...')
  const survey = await db.survey.findFirst({ select: { id: true } })
  if (survey) {
    await db.surveyResponse.createMany({
      data: [
        {
          surveyId: survey.id,
          respondentId: farmers[0]?.id,
          answers: JSON.stringify({
            '1': 'Coffee',
            '2': 'Yes, I use organic compost',
            '3': '7',
            '4': 'Better access to markets',
          }),
        },
        {
          surveyId: survey.id,
          respondentId: farmers[5]?.id,
          answers: JSON.stringify({
            '1': 'Maize and Beans',
            '2': 'Yes, I use DAP and NPK',
            '3': '5',
            '4': 'Access to affordable credit',
          }),
        },
        {
          surveyId: survey.id,
          respondentId: farmers[12]?.id,
          answers: JSON.stringify({
            '1': 'Coffee and Vanilla',
            '2': 'No, I use traditional methods',
            '3': '3',
            '4': 'Training on post-harvest handling',
          }),
        },
      ],
    })
  }

  // ════════════════════════════════════════════════════════════
  // 12. VSLA (3 models)
  // ════════════════════════════════════════════════════════════

  // ── VslaMember ──────────────────────────────────────────────
  console.log('  ↳ Seeding VslaMembers...')
  await db.vslaMember.createMany({
    data: [
      {
        vslaGroupId: vslaGroups[0]?.id ?? '',
        farmerId: farmers[0]?.id ?? '',
        memberId: 'VSL-001',
        isAdmin: true,
        isKeyholder: true,
        sharesOwned: 10,
      },
      {
        vslaGroupId: vslaGroups[0]?.id ?? '',
        farmerId: farmers[1]?.id ?? '',
        memberId: 'VSL-002',
        isAdmin: false,
        isKeyholder: false,
        sharesOwned: 8,
      },
      {
        vslaGroupId: vslaGroups[0]?.id ?? '',
        farmerId: farmers[2]?.id ?? '',
        memberId: 'VSL-003',
        isAdmin: false,
        isKeyholder: false,
        sharesOwned: 5,
      },
      {
        vslaGroupId: vslaGroups[1]?.id ?? '',
        farmerId: farmers[5]?.id ?? '',
        memberId: 'VSL-004',
        isAdmin: true,
        isKeyholder: true,
        sharesOwned: 12,
      },
      {
        vslaGroupId: vslaGroups[1]?.id ?? '',
        farmerId: farmers[6]?.id ?? '',
        memberId: 'VSL-005',
        isAdmin: false,
        isKeyholder: false,
        sharesOwned: 6,
      },
      {
        vslaGroupId: vslaGroups[2]?.id ?? '',
        farmerId: farmers[10]?.id ?? '',
        memberId: 'VSL-006',
        isAdmin: true,
        isKeyholder: true,
        sharesOwned: 15,
      },
    ],
  })

  // ── VslaAttendance ──────────────────────────────────────────
  console.log('  ↳ Seeding VslaAttendances...')
  // Only ONE record per (meetingId, farmerId) due to @@unique constraint
  if (vslaMeetings[0]?.id && farmers[0]?.id) {
    await db.vslaAttendance.createMany({
      data: [
        { tenantId: ugTenant.id, meetingId: vslaMeetings[0].id, farmerId: farmers[0].id, present: true, markedBy: u2 },
      ],
    })
  }
  if (vslaMeetings[1]?.id && farmers[5]?.id) {
    await db.vslaAttendance.createMany({
      data: [
        { tenantId: ugTenant.id, meetingId: vslaMeetings[1].id, farmerId: farmers[5].id, present: true, markedBy: u2 },
      ],
    })
  }
  if (vslaMeetings[2]?.id && farmers[10]?.id) {
    await db.vslaAttendance.createMany({
      data: [
        { tenantId: ugTenant.id, meetingId: vslaMeetings[2].id, farmerId: farmers[10].id, present: false, markedBy: u3 },
      ],
    })
  }

  // ── VslaLoanRepayment ───────────────────────────────────────
  console.log('  ↳ Seeding VslaLoanRepayments...')
  await db.vslaLoanRepayment.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        loanId: vslaLoans[0]?.id ?? '',
        amount: 50000,
        repaidOnBehalfOf: null,
        transactionRef: 'VSL-REP-2026-001',
      },
      {
        tenantId: ugTenant.id,
        loanId: vslaLoans[1]?.id ?? '',
        amount: 35000,
        repaidOnBehalfOf: null,
        transactionRef: 'VSL-REP-2026-002',
      },
      {
        tenantId: ugTenant.id,
        loanId: vslaLoans[2]?.id ?? '',
        amount: 75000,
        repaidOnBehalfOf: 'Mary Akello',
        transactionRef: 'VSL-REP-2026-003',
      },
    ],
  })

  // ════════════════════════════════════════════════════════════
  // 13. MFI (1 model)
  // ════════════════════════════════════════════════════════════

  // ── MfiRepayment ────────────────────────────────────────────
  console.log('  ↳ Seeding MfiRepayments...')
  if (mfiLoansList[0]?.id && mfiLoanSchedules[0]?.id) {
    await db.mfiRepayment.createMany({
      data: [
        {
          tenantId: mfiTenant.id,
          loanId: mfiLoansList[0].id,
          scheduleId: mfiLoanSchedules[0].id,
          amount: '50000.00',
          principalAmount: '40000.00',
          interestAmount: '8000.00',
          penaltyAmount: '2000.00',
          paymentMethod: 'MOBILE_MONEY',
          referenceNumber: 'MFI-REP-2026-001',
          receivedBy: u2,
          notes: 'Regular monthly repayment via MTN MoMo',
        },
        {
          tenantId: mfiTenant.id,
          loanId: mfiLoansList[1]?.id ?? mfiLoansList[0].id,
          scheduleId: mfiLoanSchedules[1]?.id ?? mfiLoanSchedules[0].id,
          amount: '75000.00',
          principalAmount: '60000.00',
          interestAmount: '12000.00',
          penaltyAmount: '3000.00',
          paymentMethod: 'BANK_TRANSFER',
          referenceNumber: 'MFI-REP-2026-002',
          receivedBy: u3,
          notes: 'Bank transfer repayment',
        },
        {
          tenantId: mfiTenant.id,
          loanId: mfiLoansList[2]?.id ?? mfiLoansList[0].id,
          scheduleId: mfiLoanSchedules[2]?.id ?? mfiLoanSchedules[0].id,
          amount: '45000.00',
          principalAmount: '38000.00',
          interestAmount: '5000.00',
          penaltyAmount: '2000.00',
          paymentMethod: 'MOBILE_MONEY',
          referenceNumber: 'MFI-REP-2026-003',
          receivedBy: u2,
        },
      ],
    })
  }

  // ════════════════════════════════════════════════════════════
  // 14. PLATFORM (13 models)
  // ════════════════════════════════════════════════════════════

  // ── ApiKey (use create to get ID) ───────────────────────────
  console.log('  ↳ Seeding ApiKey...')
  const apiKey = await db.apiKey.create({
    data: {
      tenantId: ugTenant.id,
      name: 'Export API Key',
      key: 'abk_live_k8x2mP9qR3nT7vW1yZ5aBcD4eF6gH0jK',
      keyPrefix: 'abk_live_k',
      userId: u2,
      scopes: '["read","write"]',
      rateLimitRpm: 120,
      rateLimitRpd: 25000,
      isActive: true,
    },
  })

  // ── ApiKeyUsageLog ──────────────────────────────────────────
  console.log('  ↳ Seeding ApiKeyUsageLogs...')
  await db.apiKeyUsageLog.createMany({
    data: [
      {
        apiKeyId: apiKey.id,
        method: 'GET',
        path: '/api/farmers',
        statusCode: 200,
        responseMs: 45,
        ipAddress: '196.43.128.1',
        userAgent: 'Agrobase-Export-Client/1.0',
      },
      {
        apiKeyId: apiKey.id,
        method: 'POST',
        path: '/api/produce-intake',
        statusCode: 201,
        responseMs: 230,
        ipAddress: '196.43.128.1',
        userAgent: 'Agrobase-Export-Client/1.0',
      },
      {
        apiKeyId: apiKey.id,
        method: 'GET',
        path: '/api/vsla/groups',
        statusCode: 200,
        responseMs: 67,
        ipAddress: '196.43.128.2',
        userAgent: 'Agrobase-Export-Client/1.0',
      },
    ],
  })

  // ── BrandingConfig ──────────────────────────────────────────
  console.log('  ↳ Seeding BrandingConfig...')
  await db.brandingConfig.create({
    data: {
      tenantId: ugTenant.id,
      primaryColor: '#16a34a',
      secondaryColor: '#facc15',
      accentColor: '#0ea5e9',
      logoUrl: '/branding/agrobase-uganda-logo.png',
      faviconUrl: '/branding/agrobase-uganda-favicon.ico',
      appName: 'Agrobase Uganda',
      tagline: 'Empowering Ugandan Farmers',
      locale: 'en',
      dateFormat: 'DD/MM/YYYY',
      currencyFormat: 'symbol',
      timezone: 'Africa/Kampala',
      isActive: true,
    },
  })

  // ── CooperativePayment ──────────────────────────────────────
  console.log('  ↳ Seeding CooperativePayments...')
  await db.cooperativePayment.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        farmerId: farmers[0]?.id,
        phase: 'FIRST',
        grossAmount: 2250000,
        deductions: JSON.stringify([
          { type: 'Transport', amount: 50000, description: 'Transport to Kampala' },
          { type: 'Processing', amount: 100000, description: 'Wet mill processing fee' },
        ]),
        netAmount: 2100000,
        paymentMethod: 'MOBILE_MONEY',
        status: 'PAID',
        paidAt: new Date('2026-01-20T14:00:00Z'),
        transactionRef: 'COOP-PAY-2026-001',
        paidBy: u2,
      },
      {
        tenantId: ugTenant.id,
        farmerId: farmers[3]?.id,
        phase: 'FIRST',
        grossAmount: 2200000,
        deductions: JSON.stringify([
          { type: 'Quality Penalty', amount: 110000, description: 'Moisture content above grade A' },
          { type: 'Transport', amount: 45000, description: 'Transport to Jinja warehouse' },
        ]),
        netAmount: 2045000,
        paymentMethod: 'BANK',
        status: 'PENDING',
      },
    ],
  })

  // ── IdMapping ───────────────────────────────────────────────
  console.log('  ↳ Seeding IdMappings...')
  await db.idMapping.createMany({
    data: [
      { tableName: 'farmers', v1Id: 'F001', v3Id: farmers[0]?.id ?? '' },
      { tableName: 'farmers', v1Id: 'F002', v3Id: farmers[1]?.id ?? '' },
      { tableName: 'farmers', v1Id: 'F003', v3Id: farmers[2]?.id ?? '' },
      { tableName: 'farmer_groups', v1Id: 'G001', v3Id: groups[0]?.id ?? '' },
      { tableName: 'farmer_groups', v1Id: 'G002', v3Id: groups[1]?.id ?? '' },
    ],
  })

  // ── MigrationLog ────────────────────────────────────────────
  console.log('  ↳ Seeding MigrationLogs...')
  await db.migrationLog.createMany({
    data: [
      {
        tableName: 'farmers',
        totalRecords: 100,
        migratedRecords: 95,
        failedRecords: 3,
        skippedRecords: 2,
        status: 'COMPLETED',
        startedAt: new Date('2025-12-01T08:00:00Z'),
        completedAt: new Date('2025-12-01T08:45:00Z'),
        errorLog: JSON.stringify([
          { row: 15, error: 'Invalid phone format' },
          { row: 42, error: 'Duplicate farmer code' },
          { row: 78, error: 'Missing required field: groupId' },
        ]),
        executedBy: u0,
      },
      {
        tableName: 'vsla_groups',
        totalRecords: 25,
        migratedRecords: 24,
        failedRecords: 0,
        skippedRecords: 1,
        status: 'COMPLETED',
        startedAt: new Date('2025-12-01T09:00:00Z'),
        completedAt: new Date('2025-12-01T09:10:00Z'),
        executedBy: u0,
      },
      {
        tableName: 'loan_applications',
        totalRecords: 200,
        migratedRecords: 180,
        failedRecords: 12,
        skippedRecords: 8,
        status: 'PARTIAL',
        startedAt: new Date('2025-12-02T08:00:00Z'),
        completedAt: new Date('2025-12-02T09:30:00Z'),
        errorLog: JSON.stringify([
          { row: 5, error: 'Foreign key constraint: farmerId not found' },
          { row: 23, error: 'Invalid amount: negative value' },
        ]),
        executedBy: u0,
      },
    ],
  })

  // ── Subscription ────────────────────────────────────────────
  console.log('  ↳ Seeding Subscriptions...')
  await db.subscription.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        plan: 'ENTERPRISE',
        amount: 2000000,
        billingCycle: 'MONTHLY',
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-01-01'),
      },
      {
        tenantId: ekibbo.id,
        plan: 'STANDARD',
        amount: 500000,
        billingCycle: 'MONTHLY',
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-07-01'),
      },
    ],
  })

  // ── ScheduledReport ─────────────────────────────────────────
  console.log('  ↳ Seeding ScheduledReports...')
  await db.scheduledReport.createMany({
    data: [
      {
        tenantId: ugTenant.id,
        templateId: reportTemplates[0]?.id ?? '',
        name: 'Monthly Farmer Report',
        schedule: 'MONTHLY',
        cronExpression: '0 9 1 * *',
        recipients: '["admin@agrobase.co","ugadmin@agrobase.co"]',
        parameters: JSON.stringify({ format: 'PDF', includeCharts: true }),
        isActive: true,
        lastRunAt: new Date('2026-02-01T09:00:00Z'),
        nextRunAt: new Date('2026-03-01T09:00:00Z'),
      },
      {
        tenantId: ugTenant.id,
        templateId: reportTemplates[1]?.id ?? reportTemplates[0]?.id ?? '',
        name: 'Weekly VSLA Savings Summary',
        schedule: 'WEEKLY',
        cronExpression: '0 8 * * 1',
        recipients: '["admin@agrobase.co"]',
        isActive: true,
        lastRunAt: new Date('2026-02-03T08:00:00Z'),
        nextRunAt: new Date('2026-02-10T08:00:00Z'),
      },
    ],
  })

  // ── Translation ─────────────────────────────────────────────
  console.log('  ↳ Seeding Translations...')
  await db.translation.createMany({
    data: [
      { tenantId: ugTenant.id, locale: 'lg', namespace: 'common', key: 'welcome.title', value: 'Omulamwa' },
      { tenantId: ugTenant.id, locale: 'lg', namespace: 'common', key: 'welcome.subtitle', value: 'Tukwata abalimi ba Uganda' },
      { tenantId: ugTenant.id, locale: 'lg', namespace: 'farmers', key: 'profile.title', value: 'Endabika ya Omulimi' },
      { tenantId: ugTenant.id, locale: 'ach', namespace: 'common', key: 'welcome.title', value: 'Maleng Weliku' },
      { tenantId: ugTenant.id, locale: 'ach', namespace: 'common', key: 'welcome.subtitle', value: 'Wa gigwoko lacam ma Uganda' },
      { tenantId: ugTenant.id, locale: 'lg', namespace: 'vsla', key: 'savings.title', value: 'Enkweka' },
      { tenantId: ugTenant.id, locale: 'lg', namespace: 'vsla', key: 'loans.title', value: 'Ekaawulo' },
      { tenantId: ugTenant.id, locale: 'lg', namespace: 'marketplace', key: 'listing.title', value: 'Entegekero ya Sente' },
      { tenantId: ugTenant.id, locale: 'lg', namespace: 'reports', key: 'dashboard.title', value: 'Lagiro Emain' },
      { tenantId: ugTenant.id, locale: 'sw', namespace: 'common', key: 'welcome.title', value: 'Karibu' },
    ],
  })

  // ── WebhookEndpoint (use create to get ID) ──────────────────
  console.log('  ↳ Seeding WebhookEndpoints...')
  const webhookEndpoint = await db.webhookEndpoint.create({
    data: {
      tenantId: ugTenant.id,
      name: 'ERP Integration',
      url: 'https://erp.example.com/webhook',
      secret: 'whsec_a1b2c3d4e5f6g7h8i9j0',
      events: '["loan.approved","loan.disbursed","payment.completed"]',
      isActive: true,
      lastPingAt: new Date('2026-02-05T12:00:00Z'),
    },
  })

  const webhookEndpoint2 = await db.webhookEndpoint.create({
    data: {
      tenantId: ugTenant.id,
      name: 'Compliance Alert Webhook',
      url: 'https://compliance.example.com/hooks/agrobase',
      secret: 'whsec_z9y8x7w6v5u4t3s2r1q0',
      events: '["eudr.submitted","eudr.verified","eudr.rejected"]',
      isActive: true,
    },
  })

  // ── WebhookDelivery ─────────────────────────────────────────
  console.log('  ↳ Seeding WebhookDeliveries...')
  await db.webhookDelivery.createMany({
    data: [
      {
        endpointId: webhookEndpoint.id,
        event: 'loan.approved',
        payload: JSON.stringify({ loanId: mfiLoansList[0]?.id, amount: 500000, status: 'APPROVED' }),
        signature: 'sha256=abc123def456',
        status: 'DELIVERED',
        statusCode: 200,
        responseBody: '{"received":true}',
        sentAt: new Date('2026-02-01T10:00:00Z'),
        completedAt: new Date('2026-02-01T10:00:02Z'),
      },
      {
        endpointId: webhookEndpoint.id,
        event: 'loan.disbursed',
        payload: JSON.stringify({ loanId: mfiLoansList[0]?.id, amount: 500000, disbursedAt: '2026-02-02' }),
        signature: 'sha256=789ghi012jkl',
        status: 'DELIVERED',
        statusCode: 200,
        responseBody: '{"received":true}',
        sentAt: new Date('2026-02-02T09:00:00Z'),
        completedAt: new Date('2026-02-02T09:00:01Z'),
      },
      {
        endpointId: webhookEndpoint2.id,
        event: 'eudr.submitted',
        payload: JSON.stringify({ complianceId: eudrCompliances[0]?.id, farmerId: eudrCompliances[0]?.farmerId }),
        signature: 'sha256=mno345pqr678',
        status: 'DELIVERED',
        statusCode: 200,
        responseBody: '{"status":"accepted"}',
        sentAt: new Date('2026-01-15T14:00:00Z'),
        completedAt: new Date('2026-01-15T14:00:03Z'),
      },
    ],
  })

  // ── TripTrackingEvent ───────────────────────────────────────
  console.log('  ↳ Seeding TripTrackingEvents...')
  await db.tripTrackingEvent.createMany({
    data: [
      {
        tripId: transportTrips[0]?.id ?? '',
        latitude: 0.3131,
        longitude: 32.5811,
        speedKmh: 45.0,
        heading: 90.0,
        accuracyMeters: 5.0,
        eventType: 'DEPARTURE',
        address: 'Kampala Industrial Area, Jinja Road',
        district: 'Kampala',
        batteryLevel: 85,
        odometerKm: 45230.0,
      },
      {
        tripId: transportTrips[0]?.id ?? '',
        latitude: 0.5800,
        longitude: 33.2100,
        speedKmh: 60.0,
        heading: 45.0,
        accuracyMeters: 8.0,
        eventType: 'LOCATION_UPDATE',
        address: 'Jinja Road, Mukono',
        district: 'Mukono',
        batteryLevel: 78,
        odometerKm: 45315.0,
      },
      {
        tripId: transportTrips[0]?.id ?? '',
        latitude: 1.0800,
        longitude: 34.1700,
        speedKmh: 0.0,
        heading: 0.0,
        accuracyMeters: 3.0,
        eventType: 'WAYPOINT',
        address: 'Mbale Town Centre',
        district: 'Mbale',
        batteryLevel: 65,
        odometerKm: 45580.0,
      },
      {
        tripId: transportTrips[1]?.id ?? '',
        latitude: 2.7740,
        longitude: 32.2990,
        speedKmh: 0.0,
        heading: 0.0,
        accuracyMeters: 4.0,
        eventType: 'ARRIVAL',
        address: 'Gulu Main Market',
        district: 'Gulu',
        batteryLevel: 55,
        odometerKm: 67890.0,
      },
    ],
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 27B. CONTRACT ITEMS & MILESTONES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding ContractItems, ContractMilestones...')

  if (contracts.length > 0) {
    await db.contractItem.createMany({
      data: [
        { contractId: contracts[0]?.id ?? '', commodity: 'Arabica Coffee', variety: 'SL14', grade: 'A', quantity: 5000, unitPrice: 8500, delivered: 3000 },
        { contractId: contracts[0]?.id ?? '', commodity: 'Robusta Coffee', variety: 'KR3', grade: 'B', quantity: 3000, unitPrice: 6000, delivered: 1500 },
        { contractId: contracts[1]?.id ?? '', commodity: 'Maize', variety: 'LONGE 6H', quantity: 10000, unitPrice: 2200, delivered: 10000 },
      ]
    })

    await db.contractMilestone.createMany({
      data: [
        { contractId: contracts[0]?.id ?? '', name: 'First Delivery', dueDate: new Date(Date.now() + 30 * 86400000), quantity: 2500, amount: 21250000, status: 'COMPLETED', completedAt: new Date(), notes: 'First batch of Arabica coffee delivered' },
        { contractId: contracts[0]?.id ?? '', name: 'Final Delivery', dueDate: new Date(Date.now() + 90 * 86400000), quantity: 5500, amount: 42500000, status: 'PENDING' },
        { contractId: contracts[1]?.id ?? '', name: 'Full Shipment', dueDate: new Date(Date.now() + 60 * 86400000), quantity: 10000, amount: 22000000, status: 'IN_PROGRESS' },
      ]
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 27C. NOTIFICATION DELIVERIES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('  ↳ Seeding NotificationDeliveries...')

  if (notifications.length > 0) {
    await db.notificationDelivery.createMany({
      data: [
        { notificationId: notifications[0]?.id ?? '', channel: 'SMS', provider: 'MTN_MOMO', attempt: 1, status: 'DELIVERED', sentAt: new Date(Date.now() - 86400000), deliveredAt: new Date(Date.now() - 86300000), responseCode: '200', responseMessage: 'Message delivered' },
        { notificationId: notifications[0]?.id ?? '', channel: 'IN_APP', provider: 'INTERNAL', attempt: 1, status: 'DELIVERED', sentAt: new Date(Date.now() - 86400000), deliveredAt: new Date(Date.now() - 86300000) },
        { notificationId: notifications[1]?.id ?? '', channel: 'SMS', provider: 'AIRTEL', attempt: 1, status: 'FAILED', sentAt: new Date(Date.now() - 43200000), responseCode: '503', responseMessage: 'Service unavailable' },
        { notificationId: notifications[1]?.id ?? '', channel: 'SMS', provider: 'AIRTEL', attempt: 2, status: 'DELIVERED', sentAt: new Date(Date.now() - 43000000), deliveredAt: new Date(Date.now() - 42900000), responseCode: '200', responseMessage: 'Message delivered' },
      ]
    })
  }

  console.log('✅ Extended seed V2 completed — 55 models seeded successfully!')
}