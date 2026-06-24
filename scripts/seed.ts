import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const NAMES = [
  ['Mukasa','John'],['Nakamya','Grace'],['Okello','Samuel'],['Achieng','Mary'],['Tumusiime','Sarah'],
  ['Mugisha','Robert'],['Namazzi','Prossy'],['Kiyimba','James'],['Apio','Dorothy'],['Wasike','Peter'],
  ['Nabatanzi','Annet'],['Ssegawa','David'],['Akech','Susan'],['Twesigye','Emmanuel'],['Among','Jackline'],
  ['Mawanda','Joseph'],['Nalubega','Florence'],['Ochieng','Patrick'],['Kebirungi','Allen'],['Lubega','Mark'],
  ['Akello','Brenda'],['Ssewanyana','Ronald'],['Arua','Catherine'],['Babu','George'],['Nakigudde','Vivian'],
  ['Opedun','Francis'],['Tebande','Lydia'],['Kagga','Richard'],['Amodoi','Ruth'],['Ssempijja','Gerald'],
  ['Okumu','Daniel'],['Nabukenya','Constance'],['Odongo','Michael'],['Nalubwama','Jane'],['Waiswa','Diana'],
  ['Tumwebaze','Harrison'],['Aanyu','Margaret'],['Ochan','Charles'],['Nabasirye','Mercy'],['Aol','Phoebe'],
  ['Kintu','Edward'],['Nakamya','Agnes'],['Lakwena','Rebecca'],['Otim','Christopher'],['Nakamya','Janet'],
  ['Okot','Martin'],['Nalugo','Harriet'],['Omony','Tom'],['Nabwere','Agatha'],['Ssekiziyivu','Paul'],
]

const FEMALE = new Set(['Grace','Mary','Sarah','Prossy','Dorothy','Annet','Susan','Jackline','Florence','Brenda','Catherine','Vivian','Lydia','Ruth','Allen','Constance','Jane','Diana','Janet','Harriet','Agnes','Margaret','Rebecca','Mercy','Phoebe','Adongo','Apolot','Akumu','Nalubega','Namazzi','Nakamya','Achieng','Nabatanzi','Akech','Among','Kebirungi','Aanyu','Nabukenya','Nalubwama','Nabasirye','Nakamya','Lakwena'])
const CROPS = ['Maize','Coffee','Rice','Beans','Sorghum','Cocoa','Tea','Sunflower','Cassava','Barley','Shea nuts']
const DISTRICTS = ['Kampala','Wakiso','Mukono','Jinja','Gulu','Lira','Mbale','Arua','Fort Portal','Mbarara']
const GROUP_NAMES = ['Kabonera Cooperative','Buwenge Farmers','Masindi Seeds Group','Nile Breweries Outgrowers','Equator Farmers']
const VSLA_NAMES = ['Kabonera VSLA','Buwenge Savings','Masindi VSLA','Kampala Central VSLA','Jinja Market Women VSLA']

async function main() {
  console.log('Seeding Agrobase V3 database...')

  // Wipe all data
  const modelNames = ['AuditLog','Feedback','Delivery','Sale','Commodity','SurveyResponse','SurveyQuestion','Survey','Message','ApiKey','Subscription','ModuleEntitlement','CreditScore','TrainingAttendance','Training','Payment','PaymentAccount','LoanApplication','LoanProduct','InputRequest','InputProduct','InputDealer','MarketMatch','MarketProduct','Consignment','Purchase','WelfarePayment','VslaTransaction','VslaAttendance','VslaMeeting','VslaLoanRepayment','VslaLoan','VslaMember','VslaSaving','VslaGroup','ChildProfile','Cultivation','FarmLand','FarmerProfile','AgentAssignment','User','Company','FarmerGroup','Village','Parish','SubCounty','Constituency','District','SubRegion','Region','Tenant']
  for (const t of modelNames) {
    try { await db.$executeRawUnsafe(`DELETE FROM "${t}"`) } catch(e) { /* skip */ }
  }

  // Tenants
  const hq = await db.tenant.create({ data: { name: 'MobiPay HQ', type: 'SUPER_ADMIN', country: 'Uganda' }})
  const ug = await db.tenant.create({ data: { name: 'Uganda', type: 'COUNTRY', country: 'Uganda', parentId: hq.id }})
  const gh = await db.tenant.create({ data: { name: 'Ghana', type: 'COUNTRY', country: 'Ghana', parentId: hq.id }})
  const ke = await db.tenant.create({ data: { name: 'Kenya', type: 'COUNTRY', country: 'Kenya', parentId: hq.id }})
  const ngo1 = await db.tenant.create({ data: { name: 'R4iCSA', type: 'NGO', country: 'Uganda', parentId: ug.id }})
  const ngo2 = await db.tenant.create({ data: { name: 'Uthabiti', type: 'NGO', country: 'Uganda', parentId: ug.id }})
  const coop = await db.tenant.create({ data: { name: 'Kabonera Cooperative', type: 'COOPERATIVE', country: 'Uganda', parentId: ug.id }})
  const exporter = await db.tenant.create({ data: { name: 'Uganda Coffee Exports Ltd', type: 'EXPORTER', country: 'Uganda', parentId: ug.id }})
  const mfi = await db.tenant.create({ data: { name: 'Good Grade MFI', type: 'MFI', country: 'Uganda', parentId: ug.id }})
  console.log('  Tenants: 9 created')

  // Users
  await db.user.create({ data: { tenantId: hq.id, role: 'SUPER_ADMIN', email: 'admin@mobipayagrosys.com', phone: '+256779355393', firstName: 'Eric', lastName: 'MobiPay' }})
  await db.user.create({ data: { tenantId: ug.id, role: 'COUNTRY_ADMIN', email: 'ugadmin@agrobase.com', phone: '+256772000001', firstName: 'Alice', lastName: 'Okello' }})
  await db.user.create({ data: { tenantId: coop.id, role: 'TENANT_ADMIN', email: 'coop@agrobase.com', phone: '+256772000002', firstName: 'Robert', lastName: 'Mugisha' }})
  await db.user.create({ data: { tenantId: mfi.id, role: 'TENANT_ADMIN', email: 'mfi@agrobase.com', phone: '+256772000003', firstName: 'Grace', lastName: 'Nakamya' }})
  console.log('  Users: 4 created')

  // Geographic Hierarchy
  const central = await db.region.create({ data: { name: 'Central Region', country: 'Uganda' }})
  const northern = await db.region.create({ data: { name: 'Northern Region', country: 'Uganda' }})
  const eastern = await db.region.create({ data: { name: 'Eastern Region', country: 'Uganda' }})
  const western = await db.region.create({ data: { name: 'Western Region', country: 'Uganda' }})
  const buganda = await db.subRegion.create({ data: { name: 'Buganda', regionId: central.id }})
  const lango = await db.subRegion.create({ data: { name: 'Lango', regionId: northern.id }})
  const busoga = await db.subRegion.create({ data: { name: 'Busoga', regionId: eastern.id }})
  const teso = await db.subRegion.create({ data: { name: 'Teso', regionId: eastern.id }})
  const ankole = await db.subRegion.create({ data: { name: 'Ankole', regionId: western.id }})
  const kampala_d = await db.district.create({ data: { name: 'Kampala', subRegionId: buganda.id }})
  const wakiso_d = await db.district.create({ data: { name: 'Wakiso', subRegionId: buganda.id }})
  const mukono_d = await db.district.create({ data: { name: 'Mukono', subRegionId: buganda.id }})
  const jinja_d = await db.district.create({ data: { name: 'Jinja', subRegionId: busoga.id }})
  const gulu_d = await db.district.create({ data: { name: 'Gulu', subRegionId: lango.id }})
  const lira_d = await db.district.create({ data: { name: 'Lira', subRegionId: lango.id }})
  const mbale_d = await db.district.create({ data: { name: 'Mbale', subRegionId: teso.id }})
  const mbarara_d = await db.district.create({ data: { name: 'Mbarara', subRegionId: ankole.id }})
  const kampala_c = await db.constituency.create({ data: { name: 'Kampala Central', districtId: kampala_d.id }})
  const kawempe_c = await db.constituency.create({ data: { name: 'Kawempe', districtId: kampala_d.id }})
  const wakiso_c = await db.constituency.create({ data: { name: 'Wakiso', districtId: wakiso_d.id }})
  const kawempe_sc = await db.subCounty.create({ data: { name: 'Kawempe Division', constituencyId: kawempe_c.id }})
  const nakawa_sc = await db.subCounty.create({ data: { name: 'Nakawa Division', constituencyId: kampala_c.id }})
  const kawempe_p = await db.parish.create({ data: { name: 'Kawempe Parish', subCountyId: kawempe_sc.id }})
  const nakawa_p = await db.parish.create({ data: { name: 'Nakawa Parish', subCountyId: nakawa_sc.id }})
  const village1 = await db.village.create({ data: { name: 'Bwaise', parishId: kawempe_p.id }})
  const village2 = await db.village.create({ data: { name: 'Kalerwe', parishId: kawempe_p.id }})
  const village3 = await db.village.create({ data: { name: 'Bukoto', parishId: nakawa_p.id }})
  const village4 = await db.village.create({ data: { name: 'Ntinda', parishId: nakawa_p.id }})
  console.log('  Geo hierarchy created')

  // Company & Groups
  const company = await db.company.create({ data: { tenantId: coop.id, name: 'Kabonera Farmers Cooperative', type: 'Cooperative', contactPerson: 'Robert Mugisha', phone: '+256772123456' }})
  const groups: any[] = []
  for (let i = 0; i < GROUP_NAMES.length; i++) {
    groups.push(await db.farmerGroup.create({
      data: {
        tenantId: i < 3 ? coop.id : (i < 4 ? ngo1.id : ngo2.id),
        companyId: i < 3 ? company.id : null,
        name: GROUP_NAMES[i],
        isVsla: true,
        vslaSettings: JSON.stringify({ shareValue: 1000, loanRate: 10, maxLoanAmount: 500000, fines: 500, welfareAmount: 2000 })
      }
    }))
  }
  console.log('  Farmer groups: 5 created')

  // Farmers (50)
  const farmers: any[] = []
  const villages = [village1, village2, village3, village4]
  for (let i = 0; i < 50; i++) {
    const [ln, fn] = NAMES[i]
    farmers.push(await db.farmerProfile.create({
      data: {
        tenantId: i < 30 ? ug.id : (i < 40 ? coop.id : ngo1.id),
        groupId: groups[i % groups.length].id,
        firstName: fn, lastName: ln,
        phone: `+25677${1000000 + i * 13793}`,
        gender: FEMALE.has(fn) ? 'Female' : 'Male',
        dateOfBirth: new Date(1980 + (i % 25), (i % 12), 1 + (i % 28)),
        education: ['Primary','Secondary','UG','PG','Other'][i % 5],
        maritalStatus: ['Married','Un-Married','Widow','Widower','Divorced'][i % 5],
        villageId: villages[i % 4].id,
        gpsLatitude: -0.3 + i * 0.05,
        gpsLongitude: 32.5 + i * 0.1,
        familyMembers: 3 + i % 6,
        childrenUnder18: 1 + i % 4,
        schoolGoingChildren: i % 3,
        spouseName: i % 3 === 0 ? '' : NAMES[(i + 7) % NAMES.length][1] + ' ' + NAMES[(i + 7) % NAMES.length][0],
        bankName: i % 4 === 0 ? 'Stanbic Bank' : (i % 4 === 1 ? 'Centenary Bank' : (i % 4 === 2 ? 'Equity Bank' : 'Good Grade MFI')),
        farmSize: 0.5 + (i % 8) * 0.5,
        farmOwnership: ['Owned','Rent','Lease'][i % 3],
        mainCrops: JSON.stringify([CROPS[i % CROPS.length], CROPS[(i + 3) % CROPS.length]]),
        livestockTypes: i % 3 === 0 ? JSON.stringify(['Goats', 'Chicken']) : null,
        memberType: i % 10 === 0 ? 'Commercial' : 'General',
        status: i < 47 ? 'ACTIVE' : 'INACTIVE'
      }
    }))
  }
  console.log('  Farmers: 50 created')

  // FarmLand & Cultivation
  for (let i = 0; i < 50; i++) {
    const farm = await db.farmLand.create({
      data: {
        farmerId: farmers[i].id,
        name: `Farm ${i + 1}`,
        sizeHectares: 0.3 + (i % 8) * 0.4,
        latitude: -0.3 + i * 0.05,
        longitude: 32.5 + i * 0.1,
        landOwnership: ['Owned','Rent','Lease'][i % 3],
        waterSource: ['Rain-fed','River','Well','Borehole'][i % 4],
        soilFertility: ['High','Medium','Low'][i % 3]
      }
    })
    const numCrops = 1 + (i % 2)
    for (let j = 0; j < numCrops; j++) {
      await db.cultivation.create({
        data: {
          farmId: farm.id,
          cropName: CROPS[(i + j) % CROPS.length],
          variety: ['Local','Improved','Hybrid'][j % 3],
          season: ['Season A 2026','Season B 2025'][j % 2],
          sowingDate: new Date(2026, 2 + j, 1),
          estimatedYield: 500 + (i % 10) * 200,
          actualYield: i % 5 === 0 ? null : 400 + (i % 10) * 180,
          status: ['ACTIVE','HARVESTED','ACTIVE'][i % 3]
        }
      })
    }
  }
  console.log('  Farms + cultivations created')

  // VSLA Groups (5)
  const vslaGroups: any[] = []
  for (let i = 0; i < 5; i++) {
    const vg = await db.vslaGroup.create({
      data: {
        tenantId: ug.id, groupId: groups[i].id,
        name: VSLA_NAMES[i],
        shareValue: 1000, loanRate: 10, maxLoanAmount: 500000,
        fines: 500, welfareAmount: 2000,
        meetingFrequency: 'Weekly', isActive: true
      }
    })
    vslaGroups.push(vg)
    for (let j = 0; j < 10; j++) {
      await db.vslaMember.create({
        data: {
          vslaGroupId: vg.id,
          farmerId: farmers[(i * 8 + j) % farmers.length].id,
          memberId: `VSLA-${i + 1}-${String(j + 1).padStart(3, '0')}`,
          isAdmin: j === 0, isKeyholder: j < 3,
          sharesOwned: 2 + j
        }
      })
    }
    for (let j = 0; j < 15; j++) {
      await db.vslaSaving.create({
        data: {
          vslaGroupId: vg.id,
          farmerId: farmers[(i * 8 + j) % farmers.length].id,
          amount: 1000 * (1 + j % 4),
          sharesBought: 1 + j % 3,
          transactionRef: `TXN-${Date.now()}-${i}${j}`,
          status: 'COMPLETED'
        }
      })
    }
    for (let j = 0; j < 4; j++) {
      const amt = 50000 + j * 75000
      await db.vslaLoan.create({
        data: {
          vslaGroupId: vg.id,
          farmerId: farmers[(i * 8 + j + 3) % farmers.length].id,
          amount: amt, interestRate: 10,
          totalRepayable: amt * 1.1,
          amountRepaid: j === 3 ? amt * 1.1 : (j === 2 ? amt * 0.7 : amt * 0.2),
          status: j === 3 ? 'REPAID' : (j === 2 ? 'APPROVED' : 'DISBURSED'),
          requestedAt: new Date(2026, 3 + j, 1),
          dueDate: new Date(2026, 6 + j, 1)
        }
      })
    }
    for (let j = 0; j < 4; j++) {
      const meeting = await db.vslaMeeting.create({
        data: {
          vslaGroupId: vg.id,
          agenda: ['Weekly Savings Collection','Loan Approvals','Welfare Contributions','Share-out Planning'][j],
          meetingDate: new Date(2026, 5, 1 + j * 7),
          startTime: '14:00', endTime: '16:00',
          status: j < 3 ? 'CONCLUDED' : 'SCHEDULED'
        }
      })
      const numAttendees = 7 + (j % 4)
      for (let k = 0; k < numAttendees; k++) {
        await db.vslaAttendance.create({
          data: {
            meetingId: meeting.id,
            farmerId: farmers[(i * 8 + k) % farmers.length].id,
            present: k < 6 || j < 2
          }
        })
      }
    }
    for (let j = 0; j < 2; j++) {
      await db.welfarePayment.create({
        data: {
          vslaGroupId: vg.id,
          farmerId: farmers[(i * 8 + j + 5) % farmers.length].id,
          amount: 20000 + j * 10000,
          reason: j === 0 ? 'Bereavement support' : 'Medical emergency'
        }
      })
    }
  }
  console.log('  VSLA: 5 groups with full data created')

  // Market Products (20)
  for (let i = 0; i < 20; i++) {
    const f = farmers[i % farmers.length]
    await db.marketProduct.create({
      data: {
        sellerId: f.id, sellerName: `${f.firstName} ${f.lastName}`,
        commodity: CROPS[i % CROPS.length], variety: ['Local','Improved','Hybrid'][i % 3],
        quantity: `${(i + 1) * 100} Kg`, unitPrice: 500 + (i % 10) * 200,
        location: DISTRICTS[i % DISTRICTS.length],
        status: i < 15 ? 'AVAILABLE' : (i < 18 ? 'MATCHED' : 'SOLD')
      }
    })
  }
  for (let i = 0; i < 5; i++) {
    await db.marketMatch.create({
      data: {
        buyerName: `Buyer ${i + 1}`, buyerPhone: `+25678${1000000 + i * 99999}`,
        quantity: `${(i + 1) * 50} Kg`, pricePerUnit: 600 + i * 100,
        totalValue: (600 + i * 100) * (i + 1) * 50,
        status: ['PENDING','CONFIRMED','DELIVERED','PAID','CANCELLED'][i]
      }
    })
  }
  console.log('  Marketplace: 20 products, 5 matches')

  // Input Dealers & Products
  const dealers: any[] = []
  const dealerNames = ['Kabonera Cooperative Shop','Buwenge Farmers Supply','Masindi Seeds Ltd','Equator Seeds Ltd','Pearl Seeds Ltd','NASECO (1996) Ltd']
  for (let i = 0; i < 6; i++) {
    dealers.push(await db.inputDealer.create({ data: { name: dealerNames[i], phone: `+256773${100000 + i}`, location: DISTRICTS[i % DISTRICTS.length] } }))
  }
  const inputProducts = ['Maize Seed (Hybrid)','Beans NABE 16','DAP Fertilizer','Urea','Coffee Seedlings','Sorghum Seed','Sunflower Seed','Rice Seed (Nerica)','Cassava Cuttings','Cocoa Seedlings','Tea Cuttings','Pesticide (Diazinon)']
  for (let i = 0; i < inputProducts.length; i++) {
    await db.inputProduct.create({
      data: {
        dealerId: dealers[i % 6].id, name: inputProducts[i],
        category: ['Seeds','Seeds','Fertilizer','Fertilizer','Seedlings','Seeds','Seeds','Seeds','Seedlings','Seedlings','Seedlings','Pesticide'][i],
        unit: ['Kg','Kg','Kg','Kg','Bags','Kg','Kg','Kg','Bundle','Bags','Bundle','Litres'][i],
        unitPrice: 2000 + i * 500
      }
    })
  }
  for (let i = 0; i < 10; i++) {
    await db.inputRequest.create({
      data: {
        dealerId: dealers[i % 6].id,
        farmerName: `${farmers[i].firstName} ${farmers[i].lastName}`,
        farmerPhone: farmers[i].phone,
        product: inputProducts[i % inputProducts.length],
        quantity: `${(i + 1) * 5} Kg`,
        unitPrice: 2000 + (i % 6) * 500,
        totalPrice: ((i + 1) * 5) * (2000 + (i % 6) * 500),
        status: ['PENDING','CONFIRMED','DELIVERED','CANCELLED'][i % 4]
      }
    })
  }
  console.log('  Inputs: 6 dealers, 12 products, 10 requests')

  // Payment Account & Payments
  const payAcct = await db.paymentAccount.create({ data: { tenantId: ug.id, accountName: 'MobiPay AgroSys Uganda', accountType: 'MERCHANT', email: 'finance@mobipayagrosys.com' }})
  for (let i = 0; i < 30; i++) {
    const f = farmers[i % farmers.length]
    await db.payment.create({
      data: {
        paymentAccountId: payAcct.id,
        type: ['CASUAL','BULK_PURCHASE','BULK_DISBURSEMENT','VSLA','MARKETPLACE'][i % 5],
        recipientName: `${f.firstName} ${f.lastName}`, recipientPhone: f.phone,
        amount: 10000 + i * 5000,
        description: ['Farm purchase','Bulk procurement','Salary disbursement','VSLA savings contribution','Market payment settlement'][i % 5],
        transactionRef: `PAY-${Date.now()}-${i}`,
        status: i < 25 ? 'COMPLETED' : (i < 28 ? 'PENDING' : 'FAILED')
      }
    })
  }
  console.log('  Payments: 30 created')

  // Trainings (8)
  const trainings: any[] = []
  const trainingTopics = ['Good Agricultural Practices','Coffee Pruning Techniques','Post-Harvest Handling','VSLA Management & Records','Financial Literacy','Soil Conservation','Pest Management','Market Access & Value Addition']
  for (let i = 0; i < 8; i++) {
    const t = await db.training.create({
      data: {
        topic: trainingTopics[i],
        description: `Comprehensive training on ${trainingTopics[i].toLowerCase()} for farmer groups.`,
        date: new Date(2026, 3 + i % 6, 1 + i * 3),
        location: DISTRICTS[i % DISTRICTS.length],
        trainerName: `Dr. ${NAMES[i + 5][1]} ${NAMES[i + 5][0]}`
      }
    })
    trainings.push(t)
    const numAttendees = 8 + (i % 8)
    for (let j = 0; j < numAttendees; j++) {
      await db.trainingAttendance.create({
        data: { trainingId: t.id, farmerId: farmers[(i * 6 + j) % farmers.length].id, attended: j < numAttendees - 2 }
      })
    }
  }
  console.log('  Trainings: 8 created')

  // Credit Scores (25)
  for (let i = 0; i < 25; i++) {
    const d = 40 + Math.random() * 50
    const a = 40 + Math.random() * 50
    const c = 40 + Math.random() * 50
    const f = 40 + Math.random() * 50
    await db.creditScore.create({
      data: {
        farmerId: farmers[i].id,
        demographicsScore: Math.round(d), assetScore: Math.round(a),
        cropScore: Math.round(c), financialScore: Math.round(f),
        totalScore: Math.round(d * 0.15 + a * 0.25 + c * 0.25 + f * 0.35)
      }
    })
  }
  console.log('  Credit scores: 25 created')

  // Loan Products & Applications
  const lp1 = await db.loanProduct.create({ data: { tenantId: mfi.id, name: 'Agri-Input Loan', interestRate: 12, maxAmount: 2000000, minAmount: 100000, maxDuration: 12, gracePeriod: 3 }})
  const lp2 = await db.loanProduct.create({ data: { tenantId: mfi.id, name: 'Seasonal Crop Loan', interestRate: 15, maxAmount: 5000000, minAmount: 500000, maxDuration: 18, gracePeriod: 6 }})
  const lp3 = await db.loanProduct.create({ data: { tenantId: mfi.id, name: 'Emergency Welfare Loan', interestRate: 10, maxAmount: 500000, minAmount: 50000, maxDuration: 6, gracePeriod: 1 }})
  for (let i = 0; i < 12; i++) {
    const f = farmers[i % farmers.length]
    const product = [lp1, lp2, lp3][i % 3]
    await db.loanApplication.create({
      data: {
        loanProductId: product.id, farmerId: f.id,
        applicantName: `${f.firstName} ${f.lastName}`, applicantPhone: f.phone,
        amount: product.minAmount + (i % 5) * 200000,
        purpose: ['Purchase inputs','School fees','Medical expenses','Farm expansion','Livestock purchase'][i % 5],
        status: ['PENDING','LEVEL1_APPROVED','APPROVED','DISBURSED','REJECTED','COMPLETED'][i % 6],
        disbursedAt: i % 6 === 3 ? new Date(2026, 4, 1) : null,
      }
    })
  }
  console.log('  Loans: 3 products, 12 applications')

  // Surveys (3)
  for (let i = 0; i < 3; i++) {
    const survey = await db.survey.create({
      data: {
        title: ['Farm Assessment Survey','VSLA Impact Survey','Market Access Survey'][i],
        description: `Annual ${['farm assessment','VSLA impact','market access'][i]} survey for M&E.`,
        status: 'ACTIVE'
      }
    })
    for (let j = 0; j < 5; j++) {
      await db.surveyQuestion.create({
        data: {
          surveyId: survey.id,
          question: [`How many hectares do you farm?`,`Has VSLA improved your savings?`,`Do you access market prices via mobile?`][i] + ` (Q${j+1})`,
          type: ['TEXT','RADIO','CHECKBOX','NUMBER','TEXT'][j],
          options: j === 1 ? JSON.stringify(['Yes','No','Partially']) : (j === 2 ? JSON.stringify(['SMS','USSD','App','Agent']) : null),
          sortOrder: j
        }
      })
    }
    for (let j = 0; j < 8; j++) {
      await db.surveyResponse.create({
        data: { surveyId: survey.id, respondentId: farmers[j].id, answers: JSON.stringify({ q1: '2.5 hectares', q2: 'Yes', q3: 'SMS' }) }
      })
    }
  }
  console.log('  Surveys: 3 created')

  // Messages (15)
  for (let i = 0; i < 15; i++) {
    await db.message.create({
      data: {
        type: ['SMS','SMS','EMAIL','IVR'][i % 4],
        recipient: farmers[i % farmers.length].phone,
        content: ['Meeting reminder: VSLA savings tomorrow at 2pm','Your loan of UGX 150,000 has been disbursed','Training on GAP scheduled for next week','Please complete your farmer profile update'][i % 4],
        status: ['SENT','DELIVERED','PENDING','FAILED'][i % 4],
        sentAt: new Date(2026, 5, 1 + i)
      }
    })
  }
  console.log('  Messages: 15 created')

  // Purchases (10)
  for (let i = 0; i < 10; i++) {
    const f = farmers[i % farmers.length]
    await db.purchase.create({
      data: {
        groupId: groups[i % 5].id, farmerId: f.id,
        commodity: CROPS[i % CROPS.length], variety: ['Local','Improved','Hybrid'][i % 3],
        quantity: `${(i + 1) * 50} Kg`, unitPrice: 400 + i * 100,
        totalAmount: ((i + 1) * 50) * (400 + i * 100),
        status: ['PENDING','REVIEWED','APPROVED','PAID'][i % 4],
        initiatedBy: 'Agent', reviewedBy: i % 4 >= 1 ? 'Robert Mugisha' : null,
        approvedBy: i % 4 >= 2 ? 'Eric MobiPay' : null,
      }
    })
  }

  // Sales (8)
  for (let i = 0; i < 8; i++) {
    const f = farmers[i % farmers.length]
    await db.sale.create({
      data: {
        farmerId: f.id, customerName: `Customer ${i + 1}`,
        product: CROPS[i % CROPS.length], quantity: `${(i + 2) * 25} Kg`,
        unitPrice: 600 + i * 150, totalAmount: ((i + 2) * 25) * (600 + i * 150),
        status: i < 7 ? 'COMPLETED' : 'PENDING'
      }
    })
  }

  // Consignments (6)
  for (let i = 0; i < 6; i++) {
    await db.consignment.create({
      data: {
        product: CROPS[i % CROPS.length], quantity: `${(i + 1) * 200} Kg`,
        source: DISTRICTS[i % DISTRICTS.length],
        destination: i % 2 === 0 ? 'Kampala Warehouse' : 'Jinja Processing Plant',
        status: ['DRAFT','DISPATCHED','CHECKED_IN','RECEIVED','APPROVED','PAID'][i],
        totalValue: ((i + 1) * 200) * (500 + i * 100),
      }
    })
  }
  console.log('  Purchases: 10, Sales: 8, Consignments: 6')

  // Feedback (8)
  for (let i = 0; i < 8; i++) {
    await db.feedback.create({
      data: {
        farmerId: farmers[i % farmers.length].id,
        category: ['Bug Report','Feature Request','Complaint','General Feedback'][i % 4],
        message: ['The USSD menu is not responding','Need dark mode on mobile app','Payment delayed for 3 days','Great improvement in VSLA tracking','App crashes when uploading photos','Request for Swahili language support','Training calendar would be helpful','Loan calculator is very useful'][i],
        status: ['NEW','REVIEWED','RESOLVED','NEW','REVIEWED','NEW','RESOLVED','NEW'][i]
      }
    })
  }

  // Deliveries (5)
  for (let i = 0; i < 5; i++) {
    await db.delivery.create({
      data: {
        relatedType: ['PURCHASE','CONSIGNMENT','INPUT_REQUEST'][i % 3],
        status: ['PENDING','IN_TRANSIT','DELIVERED','IN_TRANSIT','PENDING'][i],
        driverName: `Driver ${i + 1}`, vehicleReg: `UAB ${300 + i}A`,
        dispatchedAt: i < 4 ? new Date(2026, 5, 1 + i) : null,
        deliveredAt: i === 2 ? new Date(2026, 5, 4) : null,
      }
    })
  }

  // Subscriptions & Entitlements
  for (const tenant of [coop, mfi, exporter, ngo1, ngo2]) {
    await db.subscription.create({
      data: { tenantId: tenant.id, plan: 'ENTERPRISE', amount: 500000, billingCycle: 'MONTHLY', status: 'ACTIVE', startDate: new Date(2026, 0, 1), endDate: new Date(2026, 11, 31) }
    })
    const modules = ['FARMER_PROFILING','VSLA','MARKETPLACE','PAYMENTS','LOANS','TRAINING','REPORTS','COMMUNICATION']
    for (const mod of modules) {
      await db.moduleEntitlement.create({ data: { tenantId: tenant.id, moduleCode: mod, isEnabled: true } })
    }
  }

  // API Keys
  await db.apiKey.create({ data: { tenantId: mfi.id, key: 'ggmfi_live_sk_a1b2c3d4e5f6', username: 'gg-mfi-integration', purpose: 'Credit Score API integration with Good Grade MFI', isActive: true }})
  await db.apiKey.create({ data: { tenantId: exporter.id, key: 'uce_live_sk_x1y2z3w4v5u6', username: 'uce-marketplace', purpose: 'Marketplace buyer-seller matching API', isActive: true }})

  console.log('')
  console.log('===========================================')
  console.log('  Agrobase V3 Seeded Successfully!')
  console.log('===========================================')
  console.log('  Tenants:         9')
  console.log('  Users:           4')
  console.log('  Farmers:         50')
  console.log('  VSLA Groups:     5 (50 members)')
  console.log('  VSLA Savings:    75')
  console.log('  VSLA Loans:      20')
  console.log('  VSLA Meetings:   20 (with attendance)')
  console.log('  Market Products: 20')
  console.log('  Payments:        30')
  console.log('  Trainings:       8')
  console.log('  Credit Scores:   25')
  console.log('  Loan Products:   3')
  console.log('  Loan Apps:       12')
  console.log('  Surveys:         3')
  console.log('  Purchases:       10')
  console.log('  Sales:           8')
  console.log('  Consignments:    6')
  console.log('  Feedback:        8')
  console.log('===========================================')
}

main().catch(e => { console.error('Seed failed:', e); process.exit(1) }).finally(() => db.$disconnect())