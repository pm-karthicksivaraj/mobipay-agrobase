import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function hashPw(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12)
}

async function main() {
  console.log('🌱 Seeding Agrobase V3 database...')

  // --- TENANTS ---
  const tenants = await Promise.all([
    db.tenant.create({ data: { name: 'MobiPay AgroSys', type: 'SUPER_ADMIN', country: 'Uganda', isActive: true } }),
    db.tenant.create({ data: { name: 'Agrobase Uganda', type: 'COUNTRY', country: 'Uganda', isActive: true } }),
    db.tenant.create({ data: { name: 'Agrobase Ghana', type: 'COUNTRY', country: 'Ghana', isActive: true } }),
    db.tenant.create({ data: { name: 'Agrobase Kenya', type: 'COUNTRY', country: 'Kenya', isActive: true } }),
    db.tenant.create({ data: { name: 'EKIBBO Coffee Exporters', type: 'EXPORTER', country: 'Uganda', isActive: true } }),
    db.tenant.create({ data: { name: 'Gulu Farmer Cooperative', type: 'COOPERATIVE', country: 'Uganda', isActive: true } }),
    db.tenant.create({ data: { name: 'Tropical Agribusiness Ltd', type: 'AGRIBUSINESS', country: 'Ghana' } }),
    db.tenant.create({ data: { name: 'Green Valley NGO', type: 'NGO', country: 'Kenya' } }),
    db.tenant.create({ data: { name: 'Hope Microfinance', type: 'MFI', country: 'Uganda' } }),
  ])
  await db.tenant.update({ where: { id: tenants[5].id }, data: { parentId: tenants[1].id } })

  const superTenant = tenants[0]
  const ugTenant = tenants[1]
  const ekibbo = tenants[4]

  // --- USERS ---
  const pw = await hashPw('password123')
  const users = await Promise.all([
    db.user.create({ data: { tenantId: superTenant.id, role: 'SUPER_ADMIN', email: 'admin@agrobase.co', phone: '+256700000001', passwordHash: pw, firstName: 'Super', lastName: 'Admin', isActive: true } }),
    db.user.create({ data: { tenantId: ugTenant.id, role: 'COUNTRY_ADMIN', email: 'ugadmin@agrobase.co', phone: '+256700000002', passwordHash: pw, firstName: 'Uganda', lastName: 'Admin', isActive: true } }),
    db.user.create({ data: { tenantId: ugTenant.id, role: 'EXTENSION_OFFICER', email: 'eo@agrobase.co', phone: '+256700000010', passwordHash: pw, firstName: 'John', lastName: 'Okello', isActive: true } }),
    db.user.create({ data: { tenantId: ugTenant.id, role: 'EXTENSION_OFFICER', email: 'eo2@agrobase.co', phone: '+256700000011', passwordHash: pw, firstName: 'Grace', lastName: 'Achieng', isActive: true } }),
    db.user.create({ data: { tenantId: ugTenant.id, role: 'FARMER', email: 'farmer@agrobase.co', phone: '+256700000020', passwordHash: pw, firstName: 'James', lastName: 'Mugisha', isActive: true } }),
  ])

  // --- FARMER GROUPS ---
  const groups = await Promise.all([
    db.farmerGroup.create({ data: { tenantId: ekibbo.id, name: 'Kibale Coffee Farmers', contactPerson: 'James Mugisha', location: 'Kibale District', isActive: true } }),
    db.farmerGroup.create({ data: { tenantId: ekibbo.id, name: 'Mt. Elgon Coffee Group', contactPerson: 'Sarah Cheptoris', location: 'Mbale District', isActive: true } }),
    db.farmerGroup.create({ data: { tenantId: ugTenant.id, name: 'Gulu Maize Growers', contactPerson: 'Peter Ochan', location: 'Gulu District', isActive: true } }),
  ])

  // --- FARMERS (50 Ugandan coffee farmers for EKIBBO) ---
  const ugNames = [
    ['James','Mugisha'],['Sarah','Achieng'],['Peter','Ochan'],['Grace','Nakamya'],['Robert','Ssentongo'],
    ['Mary','Akello'],['John','Mwesigwa'],['Agnes','Natukunda'],['David','Okello'],['Florence','Nabwire'],
    ['Samuel','Kato'],['Rebecca','Aanyu'],['Michael','Ochieng'],['Rose','Nalubega'],['Francis','Opio'],
    ['Dorothy','Among'],['William','Ssekiziyi'],['Harriet','Akoragot'],['Thomas','Lubega'],['Josephine','Apio'],
    ['Emmanuel','Tumusiime'],['Prossy','Nabunya'],['Christopher','Ongom'],['Lillian','Namatovu'],['Patrick','Owor'],
    ['Margaret','Aol'],['Gerald','Kakooza'],['Juliet','Adeke'],['Stephen','Mugisha'],['Catherine','Nandawula'],
    ['Moses','Okello'],['Esther','Aciro'],['Richard','Ssempijja'],['Susan','Auma'],['Geoffrey','Ochen'],
    ['Alice','Nabasa'],['Denis','Okot'],['Mercy','Amoding'],['Martin','Muyingo'],['Teopista','Akumu'],
    ['Andrew','Ssewannyana'],['Vivian','Atim'],['Henry','Mulindwa'],['Brenda','Akech'],['Charles','Ssenyondo'],
    ['Phoebe','Ayaa'],['Paul','Kiyimba'],['Annet','Aber'],['Simon','Okwir','Diana','Nakigudde'],
  ]

  const certificationTypes = ['RFA', 'Rainforest Alliance', 'Organic', 'GLOBALG.A.P.', null]
  const crops = ['Coffee', 'Cocoa', 'Cassava', 'Avocado', 'Vanilla', 'Maize', 'Beans']

  const farmers = []
  for (let i = 0; i < 50; i++) {
    const [f, l] = ugNames[i] || ['Farmer', String(i + 1)]
    const groupId = groups[i % 3].id
    const cert = i < 30 ? certificationTypes[i % 5] : null
    farmers.push(await db.farmerProfile.create({
      data: {
        tenantId: i < 35 ? ekibbo.id : ugTenant.id,
        groupId,
        farmerCode: `AGR-${String(i + 1).padStart(4, '0')}`,
        firstName: f, lastName: l,
        phone: `+25677${String(1000000 + i).slice(1)}`,
        gender: i % 3 === 0 ? 'Female' : 'Male',
        education: ['Primary', 'Secondary', 'None'][i % 3],
        memberType: i < 20 ? 'Commercial' : 'General',
        status: 'ACTIVE',
        isCertified: !!cert,
        certificationType: cert,
        farmSize: 0.5 + (i % 10) * 0.3,
        mainCrops: JSON.stringify([crops[i % crops.length]]),
        villageId: null,
        gpsLatitude: 0.5 + Math.random() * 1.5,
        gpsLongitude: 30 + Math.random() * 2,
      }
    }))
  }

  // --- FARMS & CULTIVATIONS ---
  for (const farmer of farmers.slice(0, 20)) {
    const farm = await db.farmLand.create({
      data: {
        farmerId: farmer.id,
        name: `${farmer.firstName}'s Farm`,
        sizeHectares: farmer.farmSize,
        latitude: farmer.gpsLatitude,
        longitude: farmer.gpsLongitude,
        soilFertility: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
        waterSource: ['Rain-fed', 'River', 'Well'][Math.floor(Math.random() * 3)],
      }
    })
    await db.cultivation.create({
      data: {
        farmId: farm.id,
        cropName: JSON.parse(farmer.mainCrops || '["Coffee"]')[0],
        season: '2026-A',
        estimatedYield: 500 + Math.random() * 2000,
        actualYield: 400 + Math.random() * 1800,
      }
    })
  }

  // --- FARM POLYGONS (multi-point GPS for EKIBBO) ---
  for (let fi = 0; fi < 10; fi++) {
    const farm = await db.farmLand.findFirst({ where: { farmerId: farmers[fi].id } })
    if (!farm) continue
    const baseLat = farm.latitude || 1
    const baseLng = farm.longitude || 32
    const points = 6 + Math.floor(Math.random() * 5) // 6-10 points
    for (let p = 0; p < points; p++) {
      const angle = (2 * Math.PI * p) / points
      await db.farmPolygon.create({
        data: {
          farmId: farm.id,
          pointOrder: p,
          latitude: baseLat + 0.005 * Math.cos(angle),
          longitude: baseLng + 0.005 * Math.sin(angle),
          altitude: 1200 + Math.random() * 300,
        }
      })
    }
  }

  // --- VSLA GROUPS ---
  const vslaGroups = await Promise.all([
    db.vslaGroup.create({ data: { tenantId: ugTenant.id, groupId: groups[0].id, name: 'Kibale Savings Group', shareValue: 5000, loanRate: 10, maxLoanAmount: 200000, meetingFrequency: 'Weekly' } }),
    db.vslaGroup.create({ data: { tenantId: ugTenant.id, groupId: groups[1].id, name: 'Elgon VSLA', shareValue: 3000, loanRate: 10, maxLoanAmount: 150000, meetingFrequency: 'Bi-weekly' } }),
    db.vslaGroup.create({ data: { tenantId: ugTenant.id, groupId: groups[2].id, name: 'Gulu Savings Club', shareValue: 4000, loanRate: 10, maxLoanAmount: 180000, meetingFrequency: 'Monthly' } }),
  ])

  // --- MARKET PRODUCTS ---
  const commodities = ['Hulled Coffee', 'Cocoa', 'Cassava', 'Avocado', 'Vanilla', 'Jackfruit', 'Maize', 'Beans']
  for (let i = 0; i < 20; i++) {
    await db.marketProduct.create({
      data: {
        tenantId: ugTenant.id,
        sellerId: farmers[i % 50].id,
        sellerName: `${farmers[i % 50].firstName} ${farmers[i % 50].lastName}`,
        commodity: commodities[i % commodities.length],
        quantity: `${50 + Math.floor(Math.random() * 500)} Kg`,
        unitPrice: 2000 + Math.random() * 8000,
        location: ['Kampala', 'Gulu', 'Mbale', 'Kibale', 'Jinja'][i % 5],
        status: ['AVAILABLE', 'MATCHED', 'SOLD'][i % 3],
      }
    })
  }

  // --- INPUT DEALERS ---
  const dealers = await Promise.all([
    db.inputDealer.create({ data: { tenantId: ugTenant.id, name: 'Uganda Seed Co.', phone: '+256700100001', location: 'Kampala' } }),
    db.inputDealer.create({ data: { tenantId: ugTenant.id, name: 'Green Agro Inputs', phone: '+256700100002', location: 'Gulu' } }),
    db.inputDealer.create({ data: { tenantId: ugTenant.id, name: 'Farmers Choice Ltd', phone: '+256700100003', location: 'Jinja' } }),
    db.inputDealer.create({ data: { tenantId: ugTenant.id, name: 'Agro Supply Center', phone: '+256700100004', location: 'Mbale' } }),
    db.inputDealer.create({ data: { tenantId: ugTenant.id, name: 'Coffee Inputs Uganda', phone: '+256700100005', location: 'Kibale' } }),
    db.inputDealer.create({ data: { tenantId: ugTenant.id, name: 'Tropical Fertilizers', phone: '+256700100006', location: 'Kampala' } }),
  ])

  const inputProducts = [
    { name: 'NPK Fertilizer 50kg', category: 'Fertilizer', unit: 'Bags', price: 85000 },
    { name: 'UREA 50kg', category: 'Fertilizer', unit: 'Bags', price: 75000 },
    { name: 'Coffee Seedlings', category: 'Seeds', unit: 'Seedlings', price: 500 },
    { name: 'Maize Seeds HYBRID', category: 'Seeds', unit: 'Kg', price: 8000 },
    { name: 'Tarpaulin 6x8m', category: 'Equipment', unit: 'Pcs', price: 120000 },
    { name: 'Pruning Saw', category: 'Equipment', unit: 'Pcs', price: 35000 },
    { name: 'DAP Fertilizer 50kg', category: 'Fertilizer', unit: 'Bags', price: 95000 },
    { name: 'Cocoa Seedlings', category: 'Seeds', unit: 'Seedlings', price: 700 },
    { name: 'Pesticide Dursban', category: 'Pesticide', unit: 'Litres', price: 45000 },
    { name: 'Avocado Seedlings', category: 'Seeds', unit: 'Seedlings', price: 1500 },
    { name: 'Vanilla Cuttings', category: 'Seeds', unit: 'Bundles', price: 5000 },
    { name: 'Jackfruit Seedlings', category: 'Seeds', unit: 'Seedlings', price: 3000 },
  ]
  for (let i = 0; i < inputProducts.length; i++) {
    await db.inputProduct.create({
      data: { tenantId: ugTenant.id, dealerId: dealers[i % dealers.length].id, name: inputProducts[i].name, category: inputProducts[i].category, unit: inputProducts[i].unit, unitPrice: inputProducts[i].price, isActive: true }
    })
  }

  // --- PAYMENTS ---
  const payTypes = ['CASUAL', 'BULK_PURCHASE', 'MARKETPLACE', 'VSLA']
  for (let i = 0; i < 25; i++) {
    await db.payment.create({
      data: {
        type: payTypes[i % 4],
        recipientName: `${farmers[i % 50].firstName} ${farmers[i % 50].lastName}`,
        recipientPhone: farmers[i % 50].phone,
        amount: 50000 + Math.random() * 500000,
        description: `${payTypes[i % 4]} payment`,
        status: ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING'][i % 4],
      }
    })
  }

  // --- SALES (EKIBBO categories) ---
  const produceItems = ['Hulled Coffee', 'Cocoa', 'Cassava', 'Avocado', 'Vanilla', 'Jackfruit']
  const inputItems = ['Fertilizers', 'Tarpaulins', 'Seedlings', 'Pruning Saws']
  for (let i = 0; i < 30; i++) {
    const isProduce = i < 20
    const product = isProduce
      ? produceItems[i % produceItems.length]
      : inputItems[i % inputItems.length]
    await db.sale.create({
      data: {
        farmerId: farmers[i % 50].id,
        product,
        quantity: `${10 + Math.floor(Math.random() * 200)} Kg`,
        unitPrice: 3000 + Math.random() * 15000,
        totalAmount: (10 + Math.floor(Math.random() * 200)) * (3000 + Math.random() * 15000),
        status: 'COMPLETED',
      }
    })
  }

  // --- PURCHASES ---
  for (let i = 0; i < 15; i++) {
    await db.purchase.create({
      data: {
        groupId: groups[i % 3].id,
        farmerId: farmers[i % 50].id,
        commodity: produceItems[i % produceItems.length],
        quantity: `${20 + Math.floor(Math.random() * 300)} Kg`,
        unitPrice: 2500 + Math.random() * 10000,
        totalAmount: (20 + Math.floor(Math.random() * 300)) * (2500 + Math.random() * 10000),
        status: ['PENDING', 'REVIEWED', 'APPROVED', 'PAID'][i % 4],
        initiatedBy: users[2].id,
      }
    })
  }

  // --- CONSIGNMENTS ---
  for (let i = 0; i < 8; i++) {
    await db.consignment.create({
      data: {
        tenantId: ugTenant.id,
        product: produceItems[i % produceItems.length],
        quantity: `${100 + Math.floor(Math.random() * 900)} Kg`,
        source: ['Kibale', 'Mbale', 'Gulu', 'Jinja'][i % 4],
        destination: ['Kampala Warehouse', 'Mombasa Port', 'Export Terminal'][i % 3],
        totalValue: 1000000 + Math.random() * 5000000,
        status: ['DRAFT', 'DISPATCHED', 'CHECKED_IN', 'RECEIVED', 'APPROVED', 'PAID'][i % 6],
      }
    })
  }

  // --- DELIVERIES ---
  for (let i = 0; i < 10; i++) {
    await db.delivery.create({
      data: {
        tenantId: ugTenant.id,
        relatedType: ['PURCHASE', 'CONSIGNMENT', 'INPUT_REQUEST'][i % 3],
        status: ['PENDING', 'IN_TRANSIT', 'DELIVERED'][i % 3],
        driverName: `Driver ${i + 1}`,
        vehicleReg: `UAX ${300 + i}A`,
        dispatchedAt: new Date(Date.now() - (i * 86400000)),
        deliveredAt: i % 3 === 2 ? new Date() : null,
      }
    })
  }

  // --- TRAININGS ---
  const trainingTopics = ['Soil Management', 'Pest Control', 'Harvesting Techniques', 'Post-Harvest Handling', 'Coffee Pruning']
  for (let i = 0; i < 8; i++) {
    await db.training.create({
      data: {
        tenantId: ugTenant.id,
        topic: trainingTopics[i % 5],
        description: `Training on ${trainingTopics[i % 5].toLowerCase()} for farmer groups`,
        date: new Date(Date.now() - (i * 7 * 86400000)),
        location: ['Kibale', 'Mbale', 'Gulu', 'Kampala'][i % 4],
        trainerName: users[i % 2 === 0 ? 2 : 3].firstName + ' ' + users[i % 2 === 0 ? 2 : 3].lastName,
      }
    })
  }

  // --- CREDIT SCORES ---
  for (let i = 0; i < 20; i++) {
    await db.creditScore.create({
      data: {
        farmerId: farmers[i].id,
        demographicsScore: 50 + Math.random() * 30,
        assetScore: 40 + Math.random() * 40,
        cropScore: 50 + Math.random() * 35,
        financialScore: 45 + Math.random() * 40,
        totalScore: 50 + Math.random() * 35,
      }
    })
  }

  // --- LOAN PRODUCTS ---
  const loanProducts = await Promise.all([
    db.loanProduct.create({ data: { tenantId: ugTenant.id, name: 'Crop Input Loan', interestRate: 12, maxAmount: 500000, minAmount: 50000, maxDuration: 6, gracePeriod: 3 } }),
    db.loanProduct.create({ data: { tenantId: ugTenant.id, name: 'Farm Equipment Loan', interestRate: 15, maxAmount: 2000000, minAmount: 200000, maxDuration: 12, gracePeriod: 1 } }),
    db.loanProduct.create({ data: { tenantId: ugTenant.id, name: 'Emergency Loan', interestRate: 10, maxAmount: 100000, minAmount: 10000, maxDuration: 3, gracePeriod: 0 } }),
  ])

  // --- LOAN APPLICATIONS ---
  for (let i = 0; i < 12; i++) {
    await db.loanApplication.create({
      data: {
        loanProductId: loanProducts[i % 3].id,
        farmerId: farmers[i % 50].id,
        applicantName: `${farmers[i % 50].firstName} ${farmers[i % 50].lastName}`,
        applicantPhone: farmers[i % 50].phone,
        amount: 50000 + Math.random() * 1000000,
        purpose: 'Crop inputs and farm supplies',
        status: ['PENDING', 'LEVEL1_APPROVED', 'APPROVED', 'DISBURSED', 'REJECTED'][i % 5],
      }
    })
  }

  // --- SURVEYS ---
  const survey = await db.survey.create({
    data: {
      tenantId: ugTenant.id,
      title: 'Farmer Impact Assessment 2026',
      description: 'Annual survey to measure Agrobase impact on farmer livelihoods',
      status: 'ACTIVE',
    }
  })
  const questions = [
    { question: 'Has your income increased in the past year?', type: 'RADIO', options: '["Yes, significantly","Yes, slightly","No change","Decreased"]', sortOrder: 0 },
    { question: 'What percentage increase in income?', type: 'NUMBER', sortOrder: 1 },
    { question: 'Which trainings have helped you most?', type: 'CHECKBOX', options: '["Soil Management","Pest Control","Harvesting","Post-Harvest","Financial Literacy"]', sortOrder: 2 },
    { question: 'How would you rate Agrobase services?', type: 'RADIO', options: '["Excellent","Good","Fair","Poor"]', sortOrder: 3 },
    { question: 'Any suggestions for improvement?', type: 'TEXT', sortOrder: 4 },
  ]
  for (const q of questions) {
    await db.surveyQuestion.create({ data: { surveyId: survey.id, ...q } })
  }

  // --- FARM VISITS (EKIBBO individual training) ---
  const visitTopics = ['Soil Management', 'Pest Control', 'Harvesting', 'Post-Harvest', 'Pruning', 'Fertilizer Application', 'Crop Rotation', 'Water Management']
  for (let i = 0; i < 15; i++) {
    await db.farmVisit.create({
      data: {
        farmerId: farmers[i % 50].id,
        extensionOfficerId: users[i % 2 === 0 ? 2 : 3].id,
        visitDate: new Date(Date.now() - (i * 3 * 86400000)),
        topic: visitTopics[i % 8],
        observations: `Observed ${visitTopics[i % 8].toLowerCase()} practices on farm. Farmer showed good understanding.`,
        recommendations: 'Continue current practices. Consider attending group training for advanced techniques.',
        status: i < 12 ? 'COMPLETED' : 'SCHEDULED',
      }
    })
  }

  // --- IMPACT ASSESSMENTS ---
  const categories = ['Income', 'Yield', 'QualityOfLife', 'TrainingImpact', 'MarketAccess']
  for (let i = 0; i < 10; i++) {
    await db.impactAssessment.create({
      data: {
        farmerId: farmers[i % 50].id,
        category: categories[i % 5],
        response: JSON.stringify({ q1: 'Yes', q2: '15%', q3: 'Good', q4: '7', q5: 'Significant' }),
        score: 50 + Math.random() * 40,
        notes: 'Farmer showing steady improvement across all indicators',
        conductedBy: users[2].firstName + ' ' + users[2].lastName,
      }
    })
  }

  // --- COMPLIANCE: EUDR ---
  for (let i = 0; i < 10; i++) {
    await db.eudrCompliance.create({
      data: {
        farmerId: farmers[i].id,
        plotId: `EUDR-${String(i + 1).padStart(4, '0')}`,
        plotName: `${farmers[i].firstName}'s Plot ${i + 1}`,
        geolocation: JSON.stringify({ type: 'Polygon', coordinates: [[
          [30.1 + i * 0.01, 0.5 + i * 0.01],
          [30.11 + i * 0.01, 0.5 + i * 0.01],
          [30.11 + i * 0.01, 0.51 + i * 0.01],
          [30.1 + i * 0.01, 0.51 + i * 0.01],
          [30.1 + i * 0.01, 0.5 + i * 0.01],
        ]] }),
        areaHectares: farmers[i].farmSize || 1,
        commodities: JSON.stringify(['Coffee']),
        deforestationFree: i < 8,
        deforestationDate: i < 8 ? new Date('2020-01-01') : null,
        riskAssessment: ['LOW', 'MEDIUM', 'HIGH'][i % 3],
        status: i < 6 ? 'VERIFIED' : i < 8 ? 'PENDING' : 'REJECTED',
        verifiedBy: i < 6 ? users[0].id : null,
        verifiedAt: i < 6 ? new Date() : null,
        expiryDate: new Date(Date.now() + 365 * 86400000),
      }
    })
  }

  // --- COMPLIANCE: RAINFOREST ALLIANCE ---
  for (let i = 0; i < 8; i++) {
    await db.rainforestCertification.create({
      data: {
        tenantId: ugTenant.id,
        farmerId: farmers[i].id,
        certificateNo: `RA-${2024 + (i % 3)}-${String(1000 + i)}`,
        certificationLevel: ['RA Standard', 'RA Climate', 'RA/UTZ'][i % 3],
        issueDate: new Date(Date.now() - (365 - i * 30) * 86400000),
        expiryDate: new Date(Date.now() + (i * 30) * 86400000),
        auditDate: new Date(Date.now() - (100 - i * 10) * 86400000),
        auditorName: 'Certification Body Uganda',
        auditScore: 70 + Math.random() * 25,
        criticalFindings: i === 5 ? 1 : 0,
        majorFindings: i < 2 ? 1 : 0,
        minorFindings: Math.floor(Math.random() * 3),
        status: i < 6 ? 'ACTIVE' : i === 6 ? 'SUSPENDED' : 'EXPIRED',
        nextAuditDate: new Date(Date.now() + (180 - i * 15) * 86400000),
      }
    })
  }

  // --- COMPLIANCE: GLOBALG.A.P. ---
  for (let i = 0; i < 6; i++) {
    await db.globalGapCertification.create({
      data: {
        tenantId: ugTenant.id,
        farmerId: farmers[i + 5].id,
        ggnNumber: `GGN-40-${String(500000 + i)}`,
        scope: 'Crops',
        version: 'v6.0',
        option: 'All Farm Base (AFB)',
        issueDate: new Date(Date.now() - (300 - i * 40) * 86400000),
        expiryDate: new Date(Date.now() + (65 + i * 20) * 86400000),
        auditDate: new Date(Date.now() - (90 - i * 10) * 86400000),
        auditorName: 'GlobalG.A.P. Auditor',
        compliancePercentage: 75 + Math.random() * 20,
        status: i < 4 ? 'ACTIVE' : 'PENDING',
        nextAuditDate: new Date(Date.now() + (200 - i * 20) * 86400000),
      }
    })
  }

  // --- COMPLIANCE: CBAM ---
  for (let i = 0; i < 5; i++) {
    await db.cbamReport.create({
      data: {
        tenantId: ugTenant.id,
        farmerId: farmers[i].id,
        reportingPeriod: `2026-Q${(i % 4) + 1}`,
        commodity: 'Coffee',
        quantityTonnes: 0.5 + Math.random() * 5,
        embeddedEmissions: 0.8 + Math.random() * 2,
        totalEmissions: 0,
        certificationType: farmers[i].certificationType || 'Conventional',
        status: ['DRAFT', 'SUBMITTED', 'VERIFIED'][i % 3],
      }
    })
    // Fix totalEmissions
  }

  // --- FEEDBACK ---
  for (let i = 0; i < 10; i++) {
    await db.feedback.create({
      data: {
        tenantId: ugTenant.id,
        farmerId: farmers[i % 50].id,
        category: ['App Usage', 'Training', 'Payments', 'Marketplace', 'General'][i % 5],
        message: `Farmer feedback item ${i + 1}: Need better market price information and faster payment processing.`,
        status: ['NEW', 'REVIEWED', 'RESOLVED'][i % 3],
        resolvedBy: i === 2 ? users[2].id : null,
        resolvedAt: i === 2 ? new Date() : null,
      }
    })
  }

  // --- FILE ATTACHMENTS ---
  await db.fileAttachment.createMany({
    data: [
      { tenantId: ugTenant.id, relatedType: 'PAYMENT', fileName: 'attendance_form_march.pdf', fileType: 'application/pdf', fileSize: 245000, description: 'Attendance form for March transport refund' },
      { tenantId: ugTenant.id, relatedType: 'CONSENT_FORM', fileName: 'phone_change_consent.png', fileType: 'image/png', fileSize: 180000, description: 'Consent form for phone number change' },
      { tenantId: ugTenant.id, relatedType: 'TRAINING', fileName: 'training_materials.pdf', fileType: 'application/pdf', fileSize: 1250000, description: 'Training materials for soil management' },
    ]
  })

  // --- MESSAGES ---
  await db.message.createMany({
    data: [
      { tenantId: ugTenant.id, type: 'SMS', recipient: '+256700000020', content: 'Your loan of UGX 200,000 has been approved. Visit your VSLA group for disbursement.', status: 'DELIVERED', sentAt: new Date() },
      { tenantId: ugTenant.id, type: 'SMS', recipient: '+256700000021', content: 'Reminder: VSLA meeting tomorrow at 10:00 AM at Kibale Community Center.', status: 'DELIVERED', sentAt: new Date() },
      { tenantId: ugTenant.id, type: 'SMS', recipient: '+256700000022', content: 'Market price update: Coffee - UGX 8,500/kg, Maize - UGX 2,200/kg.', status: 'SENT', sentAt: new Date() },
    ]
  })

  // --- CHANNEL SIMULATOR DATA ---
  await db.ussdSession.createMany({
    data: [
      { tenantId: ugTenant.id, sessionId: 'USSD-001', phoneNumber: '+256700000020', currentStep: 'MAIN_MENU', inputData: '{}', status: 'COMPLETED', completedAt: new Date() },
      { tenantId: ugTenant.id, sessionId: 'USSD-002', phoneNumber: '+256700000021', currentStep: 'BALANCE', inputData: '{}', status: 'ACTIVE' },
      { tenantId: ugTenant.id, sessionId: 'USSD-003', phoneNumber: '+256700000022', currentStep: 'MARKET', inputData: '{}', status: 'TIMEOUT' },
    ]
  })

  await db.ivrCampaign.createMany({
    data: [
      { tenantId: ugTenant.id, name: 'Coffee Price Alert Q2', description: 'Weekly coffee price updates to all farmers', script: '{}', status: 'COMPLETED', totalCalls: 250, completedCalls: 230 },
      { tenantId: ugTenant.id, name: 'VSLA Training Reminder', description: 'Reminder calls for upcoming VSLA training sessions', script: '{}', status: 'SCHEDULED', totalCalls: 100, completedCalls: 0 },
    ]
  })

  await db.smsBroadcast.createMany({
    data: [
      { tenantId: ugTenant.id, message: 'Agrobase V3 is here! New features include farm visits, impact assessment, and compliance tracking.', recipientCount: 500, status: 'SENT', sentAt: new Date() },
      { tenantId: ugTenant.id, message: 'Training on Post-Harvest Handling this Saturday at Kibale Center. All farmers welcome.', recipientCount: 120, status: 'DRAFT' },
    ]
  })

  // ─── PLOT-LEVEL TRACEABILITY ──────────────────────────────────
  const sampleBoundary = JSON.stringify({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0.3476, 0.5231], [0.3482, 0.5231], [0.3484, 0.5225], [0.3478, 0.5222], [0.3476, 0.5231]]]
    },
    properties: {}
  })

  const seededPlots = await db.plot.createMany({
    data: [
      { tenantId: ugTenant.id, plotCode: 'PLT-UG-000001', farmerId: farmers[0]?.id, name: 'Mt. Elgon Block A', plotType: 'PRODUCTION', boundaryGeoJson: sampleBoundary, areaHectares: 2.5, centroidLat: 0.5228, centroidLng: 0.3479, soilType: 'VOLCANIC_LOAM', elevationM: 1800, slopePercent: 15, irrigationType: 'RAINFED', landOwnership: 'CUSTOMARY', verificationStatus: 'GPS_VERIFIED', eudrRiskLevel: 'LOW', deforestationFree: true, verificationScore: 92, verifiedBy: users[2]?.id, verifiedAt: new Date() },
      { tenantId: ugTenant.id, plotCode: 'PLT-UG-000002', farmerId: farmers[1]?.id, name: 'Bugisu Coffee Plot 3', plotType: 'PRODUCTION', boundaryGeoJson: sampleBoundary, areaHectares: 1.8, centroidLat: 1.0010, centroidLng: 34.2500, soilType: 'CLAY_LOAM', elevationM: 1600, irrigationType: 'RAINFED', landOwnership: 'OWNED', verificationStatus: 'SATELLITE_VERIFIED', eudrRiskLevel: 'LOW', deforestationFree: true, verificationScore: 88 },
      { tenantId: ugTenant.id, plotCode: 'PLT-UG-000003', farmerId: farmers[2]?.id, name: 'Kibale Mixed Farm', plotType: 'PRODUCTION', boundaryGeoJson: sampleBoundary, areaHectares: 3.2, centroidLat: 0.9500, centroidLng: 30.2500, soilType: 'SANDY_LOAM', elevationM: 1200, irrigationType: 'SPRINKLER', landOwnership: 'LEASED', verificationStatus: 'UNVERIFIED', eudrRiskLevel: 'UNKNOWN' },
      { tenantId: ugTenant.id, plotCode: 'PLT-UG-000004', farmerId: farmers[3]?.id, name: 'Gulu Maize Field', plotType: 'PRODUCTION', boundaryGeoJson: sampleBoundary, areaHectares: 5.0, centroidLat: 2.7740, centroidLng: 32.2990, soilType: 'LOAM', elevationM: 1050, irrigationType: 'RAINFED', landOwnership: 'CUSTOMARY', verificationStatus: 'VERIFIED', eudrRiskLevel: 'LOW', deforestationFree: true, verificationScore: 97, verifiedBy: users[2]?.id, verifiedAt: new Date() },
      { tenantId: ugTenant.id, plotCode: 'PLT-UG-000005', farmerId: farmers[4]?.id, name: 'Mbale Cocoa Block', plotType: 'PRODUCTION', boundaryGeoJson: sampleBoundary, areaHectares: 1.2, centroidLat: 1.0670, centroidLng: 34.1750, soilType: 'CLAY', elevationM: 1400, slopePercent: 25, irrigationType: 'DRIP', landOwnership: 'OWNED', verificationStatus: 'FIELD_AUDITED', eudrRiskLevel: 'MEDIUM', deforestationFree: true, verificationScore: 75 },
      { tenantId: ekibbo.id, plotCode: 'PLT-UG-000006', farmerId: farmers[0]?.id, name: 'Ekibbo Demo Plot', plotType: 'DEMO', areaHectares: 0.5, verificationStatus: 'UNVERIFIED', eudrRiskLevel: 'UNKNOWN' },
    ]
  })

  // Plot seasons
  const plots = await db.plot.findMany({ where: { tenantId: ugTenant.id }, select: { id: true } })
  if (plots.length >= 4) {
    await db.plotSeason.createMany({
      data: [
        { tenantId: ugTenant.id, plotId: plots[0].id, season: '2026A', cropType: 'ARABICA_COFFEE', variety: 'SL14', plantingDate: new Date('2026-03-01'), expectedHarvestDate: new Date('2026-10-01'), status: 'GROWING' },
        { tenantId: ugTenant.id, plotId: plots[1].id, season: '2025B', cropType: 'ROBUSTA_COFFEE', variety: 'KR3', plantingDate: new Date('2025-09-15'), expectedHarvestDate: new Date('2026-02-28'), status: 'HARVESTED', yieldKg: 1800, qualityGrade: 'GRADE_A' },
        { tenantId: ugTenant.id, plotId: plots[2].id, season: '2026A', cropType: 'MAIZE', variety: 'LONGE 6H', status: 'PLANNED' },
        { tenantId: ugTenant.id, plotId: plots[3].id, season: '2025B', cropType: 'MAIZE', variety: 'BAYOMBE', plantingDate: new Date('2025-08-01'), actualHarvestDate: new Date('2025-12-15'), yieldKg: 12000, qualityGrade: 'GRADE_B', status: 'COMPLETED', eudrCompliant: true },
        { tenantId: ugTenant.id, plotId: plots[3].id, season: '2026A', cropType: 'SOYBEAN', variety: 'MAKSOY 3N', plantingDate: new Date('2026-04-01'), status: 'GROWING' },
        { tenantId: ugTenant.id, plotId: plots[4].id, season: '2026A', cropType: 'COCOA', variety: 'AMAZONIAN', plantingDate: new Date('2025-11-01'), expectedHarvestDate: new Date('2026-11-01'), status: 'GROWING' },
      ]
    })

    // Plot verifications
    await db.plotVerification.createMany({
      data: [
        { tenantId: ugTenant.id, plotId: plots[0].id, verificationType: 'GPS', result: 'PASSED', verifiedBy: users[2]?.id, verifiedAt: new Date(), boundaryMatchPercent: 92, accuracyMeters: 3.2, deforestCheckResult: 'CLEAR', notes: 'GPS boundary matches surveyed boundary within 3m tolerance' },
        { tenantId: ugTenant.id, plotId: plots[1].id, verificationType: 'SATELLITE', result: 'PASSED', verifiedBy: users[3]?.id, verifiedAt: new Date(), boundaryMatchPercent: 88, deforestCheckResult: 'CLEAR', notes: 'Sentinel-2 analysis: no land-use change detected since 2020' },
        { tenantId: ugTenant.id, plotId: plots[3].id, verificationType: 'GPS', result: 'PASSED', verifiedBy: users[2]?.id, verifiedAt: new Date('2025-06-10'), boundaryMatchPercent: 99, accuracyMeters: 1.1, deforestCheckResult: 'CLEAR' },
        { tenantId: ugTenant.id, plotId: plots[3].id, verificationType: 'SATELLITE', result: 'PASSED', verifiedBy: users[3]?.id, verifiedAt: new Date('2025-06-15'), deforestCheckResult: 'CLEAR', notes: 'Multi-date satellite analysis confirms no deforestation' },
        { tenantId: ugTenant.id, plotId: plots[3].id, verificationType: 'FIELD_AUDIT', result: 'PASSED', verifiedBy: users[2]?.id, verifiedAt: new Date('2025-07-01'), deforestCheckResult: 'CLEAR', notes: 'Physical verification confirms GPS and satellite data' },
        { tenantId: ugTenant.id, plotId: plots[4].id, verificationType: 'FIELD_AUDIT', result: 'PASSED', verifiedBy: users[2]?.id, verifiedAt: new Date(), boundaryMatchPercent: 75, deforestCheckResult: 'SUSPECTED', notes: 'Small vegetation change at plot edge — needs satellite follow-up' },
      ]
    })

    // Plot documents
    await db.plotDocument.createMany({
      data: [
        { tenantId: ugTenant.id, plotId: plots[0].id, docType: 'LAND_TITLE', title: 'Customary Land Certificate', issuedBy: 'Mbale District Land Office', issuedAt: new Date('2020-01-15') },
        { tenantId: ugTenant.id, plotId: plots[3].id, docType: 'EUDR_CERTIFICATE', title: 'EUDR Due Diligence Certificate', issuedBy: 'Agrobase Compliance', issuedAt: new Date('2025-07-02'), isVerified: true },
        { tenantId: ugTenant.id, plotId: plots[3].id, docType: 'SATELLITE_IMAGE', title: 'Sentinel-2 Composite 2025', issuedAt: new Date('2025-06-15') },
      ]
    })
  }

  // ─── CARBON CREDITS ────────────────────────────────────────────
  const carbonProjects = await Promise.all([
    db.carbonProject.create({
      data: {
        tenantId: ugTenant.id, createdById: users[0].id,
        name: 'Kibale Agroforestry Carbon Project',
        description: 'Agroforestry-based carbon sequestration across 500 hectares in Kibale district',
        standard: 'VERRA_VCS', methodologyCode: 'AR-ACM0003', methodologyVersion: 'v6.0',
        projectType: 'AGROFORESTRY', region: 'Western Uganda', country: 'Uganda',
        totalAreaHectares: 500, estimatedAnnualRemovals: 2500,
        projectStartDate: new Date('2024-01-01'), projectEndDate: new Date('2034-12-31'),
        creditingPeriodYears: 10, creditingPeriodStart: new Date('2024-01-01'),
        creditingPeriodEnd: new Date('2033-12-31'),
        proponentName: 'MobiPay AgroSys', proponentContact: 'carbon@agrobase.co',
        vvbName: 'SGS Verification', status: 'ACTIVE', verraProjectId: 'VCS-2024-UG-001',
      }
    }),
    db.carbonProject.create({
      data: {
        tenantId: ugTenant.id, createdById: users[0].id,
        name: 'Mt. Elgon Soil Carbon Restoration',
        description: 'Soil organic carbon restoration through conservation agriculture on smallholder farms',
        standard: 'GOLD_STANDARD', methodologyCode: 'GS-SOC-001', methodologyVersion: 'v2.1',
        projectType: 'SOIL_CARBON', region: 'Eastern Uganda', country: 'Uganda',
        totalAreaHectares: 300, estimatedAnnualRemovals: 900,
        projectStartDate: new Date('2025-01-01'), projectEndDate: new Date('2035-12-31'),
        creditingPeriodYears: 10, creditingPeriodStart: new Date('2025-01-01'),
        creditingPeriodEnd: new Date('2034-12-31'),
        proponentName: 'Green Valley NGO', vvbName: 'Bureau Veritas', status: 'VALIDATED',
      }
    }),
  ])

  // Carbon credits
  await db.carbonCredit.createMany({
    data: [
      { tenantId: ugTenant.id, projectId: carbonProjects[0].id, vintageYear: 2024, quantityTonnesCO2: 1250.5, unitPriceUsd: 12.50, status: 'ISSUED', issuanceDate: new Date('2025-01-15'), expiryDate: new Date('2024-12-31') },
      { tenantId: ugTenant.id, projectId: carbonProjects[0].id, vintageYear: 2024, quantityTonnesCO2: 800.0, unitPriceUsd: 15.00, status: 'RETIRED', issuanceDate: new Date('2025-02-01'), retirementDate: new Date('2025-03-10'), retirementReason: 'VOLUNTARY', expiryDate: new Date('2024-12-31') },
      { tenantId: ugTenant.id, projectId: carbonProjects[0].id, vintageYear: 2025, quantityTonnesCO2: 600.0, unitPriceUsd: 14.00, status: 'PENDING', expiryDate: new Date('2025-12-31') },
      { tenantId: ugTenant.id, projectId: carbonProjects[1].id, vintageYear: 2025, quantityTonnesCO2: 450.0, unitPriceUsd: 18.00, status: 'VERIFIED', expiryDate: new Date('2025-12-31') },
    ]
  })

  // Carbon verifications
  await db.carbonVerification.createMany({
    data: [
      { tenantId: ugTenant.id, projectId: carbonProjects[0].id, type: 'VERIFICATION', status: 'COMPLETED', vvbName: 'SGS Verification', startDate: new Date('2025-01-05'), endDate: new Date('2025-01-10'), conclusion: 'POSITIVE', recommendation: 'ISSUE', findings: '{"creditsVerified": 1250.5}' },
      { tenantId: ugTenant.id, projectId: carbonProjects[1].id, type: 'VERIFICATION', status: 'COMPLETED', vvbName: 'Bureau Veritas', startDate: new Date('2026-01-10'), endDate: new Date('2026-01-15'), conclusion: 'POSITIVE', recommendation: 'ISSUE', findings: '{"creditsVerified": 450.0}' },
    ]
  })

  // ─── MFI PARTNERS & LOANS ─────────────────────────────────────
  const mfiTenant = tenants[8] // Hope Microfinance
  const mfiPartners = await Promise.all([
    db.mfiPartner.create({
      data: {
        tenantId: mfiTenant.id, name: 'Pride Microfinance', partnerType: 'MFI', code: 'PRIDE',
        contactName: 'Joseph Kiyimba', contactEmail: 'joseph@pride.co.ug', contactPhone: '+256312000001',
        address: 'Kampala Road, Kampala', country: 'Uganda',
        maxExposure: 500000000, currentExposure: 125000000, interestRateSpread: 0.0350,
        isActive: true,
      }
    }),
    db.mfiPartner.create({
      data: {
        tenantId: mfiTenant.id, name: 'Uganda Coffee Cooperative Union', partnerType: 'SACCO', code: 'UCCU',
        contactName: 'Agnes Nandawula', contactEmail: 'agnes@uccu.co.ug', contactPhone: '+256312000002',
        address: 'Jinja Road, Kampala', country: 'Uganda',
        maxExposure: 200000000, currentExposure: 45000000, interestRateSpread: 0.0200,
        isActive: true,
      }
    }),
  ])

  // MFI loan products
  const mfiProducts = await Promise.all([
    db.mfiLoanProduct.create({
      data: {
        tenantId: mfiTenant.id, partnerId: mfiPartners[0].id,
        name: 'Coffee Farmer Input Loan',
        interestRate: 18, maxAmount: 5000000, minAmount: 100000,
        maxDurationMonths: 12, gracePeriodMonths: 3,
        collateralRequired: true,
        description: 'Seasonal input financing for coffee farmers via Pride MFI',
        isActive: true,
      }
    }),
    db.mfiLoanProduct.create({
      data: {
        tenantId: mfiTenant.id, partnerId: mfiPartners[1].id,
        name: 'Cooperative Farm Development Loan',
        interestRate: 14, maxAmount: 10000000, minAmount: 500000,
        maxDurationMonths: 24, gracePeriodMonths: 6,
        collateralRequired: false,
        description: 'Long-term farm development through cooperative union',
        isActive: true,
      }
    }),
  ])

  // MFI loans
  const mfiLoans = await db.mfiLoan.createMany({
    data: Array.from({ length: 8 }, (_, i) => ({
      tenantId: mfiTenant.id,
      partnerId: mfiPartners[i % 2].id,
      loanProductId: mfiProducts[i % 2].id,
      farmerId: farmers[i].id,
      applicantName: `${farmers[i].firstName} ${farmers[i].lastName}`,
      applicantPhone: farmers[i].phone,
      amount: 200000 + Math.floor(Math.random() * 3000000),
      interestRate: 14 + Math.random() * 8,
      durationMonths: 6 + (i % 3) * 6,
      gracePeriodMonths: 3,
      status: ['PENDING', 'APPROVED', 'DISBURSED', 'DISBURSED', 'DISBURSED', 'DISBURSED', 'REPAID', 'OVERDUE'][i],
      purpose: 'Coffee input financing for 2026 season',
      disbursedAt: i >= 2 && i <= 6 ? new Date(Date.now() - (i * 30 * 86400000)) : null,
    }))
  })

  // MFI Loan Schedules (for the 4 DISBURSED loans — index 2,3,4,5)
  const mfiDisbursed = await db.mfiLoan.findMany({
    where: { tenantId: mfiTenant.id, status: 'DISBURSED' },
    select: { id: true, amount: true, interestRate: true, durationMonths: true, gracePeriodMonths: true, disbursedAt: true },
    orderBy: { createdAt: 'asc' },
  })
  if (mfiDisbursed.length > 0) {
    const scheduleRows: { tenantId: string; loanId: string; installmentNumber: number; dueDate: Date; principalDue: number; interestDue: number; penaltyDue: number; totalDue: number; principalPaid: number; interestPaid: number; penaltyPaid: number; totalPaid: number; status: string; paidAt?: Date }[] = []
    for (const ml of mfiDisbursed) {
      const m = ml.durationMonths ?? 6
      const g = ml.gracePeriodMonths ?? 3
      const rate = Number(ml.interestRate) / 100 / 12
      const princ = Number(ml.amount)
      const monthlyPrinc = princ / (m - g)
      for (let inst = 1; inst <= m; inst++) {
        const dd = new Date(ml.disbursedAt!); dd.setMonth(dd.getMonth() + inst); dd.setDate(15)
        const inGrace = inst <= g
        const pDue = inGrace ? 0 : Math.round(monthlyPrinc * 100) / 100
        const rem = princ - monthlyPrinc * Math.max(0, inst - g - 1)
        const iDue = Math.round(rem * rate * 100) / 100
        const tot = pDue + iDue
        const isPast = dd < new Date()
        const isPaid = !inGrace && Math.random() > 0.4
        scheduleRows.push({ tenantId: mfiTenant.id, loanId: ml.id, installmentNumber: inst, dueDate: dd, principalDue: pDue, interestDue: iDue, penaltyDue: 0, totalDue: tot, principalPaid: isPaid ? pDue : 0, interestPaid: isPaid ? iDue : 0, penaltyPaid: 0, totalPaid: isPaid ? tot : 0, status: isPaid ? 'PAID' : isPast ? 'OVERDUE' : 'PENDING', paidAt: isPaid ? new Date() : undefined })
      }
    }
    await db.mfiLoanSchedule.createMany({ data: scheduleRows })
  }

  // ─── PRODUCT BATCHES (Traceability) ───────────────────────────
  const batchCommodities = [
    { commodity: 'ARABICA_COFFEE', season: '2025B', quantityKg: 1800, status: 'IN_WAREHOUSE' },
    { commodity: 'MAIZE', season: '2025B', quantityKg: 12000, status: 'PROCESSED' },
    { commodity: 'ROBUSTA_COFFEE', season: '2025B', quantityKg: 3200, status: 'CERTIFIED' },
    { commodity: 'COFFEE', season: '2025B', quantityKg: 5000, status: 'IN_TRANSIT' },
  ]
  if (plots.length >= 2) {
    await db.productBatch.createMany({
      data: batchCommodities.map((b, i) => ({
        tenantId: ugTenant.id,
        plotId: plots[i % plots.length].id,
        batchId: `BAT-${String(i + 1).padStart(6, '0')}`,
        commodity: b.commodity,
        season: b.season,
        quantityKg: b.quantityKg,
        status: b.status,
      }))
    })
  }

  console.log('✅ Seed completed successfully!')
  console.log(`   - ${tenants.length} tenants`)
  console.log(`   - ${users.length} users`)
  console.log(`   - ${farmers.length} farmers`)
  console.log(`   - ${groups.length} farmer groups`)
  console.log(`   - ${vslaGroups.length} VSLA groups`)
  console.log(`   - ${seededPlots.count} plots seeded (plot-level traceability)`)
  console.log(`   - ${carbonProjects.length} carbon projects + 4 credits`)
  console.log(`   - ${mfiPartners.length} MFI partners + ${mfiProducts.length} products + ${mfiLoans.count} loans + schedule data`)
  console.log(`   - ${batchCommodities.length} product batches (traceability)`)
  console.log(`   - EUDR/CBAM/Rainforest/GlobalG.A.P. compliance records seeded`)
  console.log(`   - Farm visits & impact assessments seeded`)
  console.log(`   - Channel simulator data (USSD/IVR/SMS) seeded`)

  // ─── EXTENDED SEED ───────────────────────────────────────────
  console.log('\n📦 Running extended seed (VSLA, Transport, Satellite, etc.)...')
  const { seedExtended } = await import('./seed-extended')
  // Gather extra IDs needed by extended seed
  const allPlots = await db.plot.findMany({ select: { id: true, plotCode: true } })
  const allTrainings = await db.training.findMany({ select: { id: true } })
  const allContracts = await db.contract.findMany({ select: { id: true } })
  const allBatches = await db.productBatch.findMany({ select: { id: true, batchId: true } })
  const allWarehouses = await db.warehouse.findMany({ select: { id: true } })
  const allMarketProducts = await db.marketProduct.findMany({ select: { id: true } })
  const allNotifications = await db.notification.findMany({ select: { id: true } })
  const allTransportTrips = await db.transportTrip.findMany({ select: { id: true } })
  const allVslaMeetings = await db.vslaMeeting.findMany({ select: { id: true } })
  const allVslaLoans = await db.vslaLoan.findMany({ select: { id: true } })
  const allMfiLoanSchedules = await db.mfiLoanSchedule.findMany({ select: { id: true, loanId: true, totalDue: true, totalPaid: true, status: true } })
  const allMfiLoansList = await db.mfiLoan.findMany({ select: { id: true, status: true } })
  const allEudrCompliances = await db.eudrCompliance.findMany({ select: { id: true, farmerId: true } })
  const allReportTemplates = await db.reportTemplate.findMany({ select: { id: true } })
  const allSettlements = await db.settlement.findMany({ select: { id: true } })

  await seedExtended({
    ugTenant: { id: ugTenant.id },
    ekibbo: { id: ekibbo.id },
    users: users.map(u => ({ id: u.id })),
    farmers: farmers.map(f => ({ id: f.id, firstName: f.firstName, lastName: f.lastName, phone: f.phone })),
    vslaGroups: vslaGroups.map(g => ({ id: g.id })),
  })

  console.log('\n📦 Running extended seed V2 (55 additional models)...')
  const { seedExtendedV2 } = await import('./seed-extended-v2')
  await seedExtendedV2({
    ugTenant: { id: ugTenant.id },
    ekibbo: { id: ekibbo.id },
    mfiTenant: { id: mfiTenant.id },
    users: users.map(u => ({ id: u.id, role: u.role })),
    farmers: farmers.map(f => ({ id: f.id, firstName: f.firstName, lastName: f.lastName, phone: f.phone })),
    vslaGroups: vslaGroups.map(g => ({ id: g.id })),
    groups: groups.map(g => ({ id: g.id, name: g.name })),
    plots: allPlots,
    carbonProjects: carbonProjects.map(p => ({ id: p.id })),
    trainings: allTrainings,
    contracts: allContracts,
    batches: allBatches,
    warehouses: allWarehouses,
    marketProducts: allMarketProducts,
    notifications: allNotifications,
    transportTrips: allTransportTrips,
    vslaMeetings: allVslaMeetings,
    vslaLoans: allVslaLoans,
    mfiLoanSchedules: allMfiLoanSchedules,
    mfiLoansList: allMfiLoansList,
    eudrCompliances: allEudrCompliances,
    reportTemplates: allReportTemplates,
    settlements: allSettlements,
    loans: loanProducts.map(l => ({ id: l.id })),
  })
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1) })
  .finally(() => db.$disconnect())