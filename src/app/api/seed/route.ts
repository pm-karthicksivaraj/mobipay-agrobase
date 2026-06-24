import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const NAMES = [
  ['Mukasa','John'],['Nakamya','Grace'],['Okello','Samuel'],['Achieng','Mary'],['Tumusiime','Sarah'],
  ['Mugisha','Robert'],['Namazzi','Prossy'],['Kiyimba','James'],['Apio','Dorothy'],['Wasike','Peter'],
  ['Nabatanzi','Annet'],['Ssegawa','David'],['Akech','Susan'],['Twesigye','Emmanuel'],['Among','Jackline'],
  ['Mawanda','Joseph'],['Nalubega','Florence'],['Ochieng','Patrick'],['Kebirungi','Allen'],['Lubega','Mark'],
  ['Akello','Brenda'],['Ssewanyana','Ronald'],['Arua','Catherine'],['Babu','George'],['Nakigudde','Vivian'],
  ['Opedun','Francis'],['Tebande','Lydia'],['Kagga','Richard'],['Amodoi','Ruth'],['Ssempijja','Gerald'],
]
const FEMALE = new Set(['Grace','Mary','Sarah','Prossy','Dorothy','Annet','Susan','Jackline','Florence','Brenda','Catherine','Vivian','Lydia','Ruth','Allen','Constance','Jane','Diana','Janet','Harriet','Agnes','Margaret','Rebecca','Mercy','Phoebe','Adongo','Apolot','Akumu','Nalubega','Namazzi','Nakamya','Achieng','Nabatanzi','Akech','Among','Nalubega','Kebirungi','Ar ua'])
const CROPS = ['Maize','Coffee','Rice','Beans','Sorghum','Cocoa','Tea','Sunflower','Cassava','Barley','Shea nuts']
const DISTRICTS = ['Kampala','Wakiso','Mukono','Jinja','Gulu','Lira','Mbale','Arua','Fort Portal','Mbarara']
const GROUP_NAMES = ['Kabonera Cooperative','Buwenge Farmers','Masindi Seeds Group','Nile Breweries Outgrowers','Equator Farmers']
const VSLA_NAMES = ['Kabonera VSLA','Buwenge Savings','Masindi VSLA','Kampala Central VSLA','Jinja Market Women VSLA']

export async function POST() {
  try {
    // Wipe all data safely
    const modelNames = ['AuditLog','Feedback','Delivery','Sale','Commodity','SurveyResponse','SurveyQuestion','Survey','Message','ApiKey','Subscription','ModuleEntitlement','CreditScore','TrainingAttendance','Training','Payment','PaymentAccount','LoanApplication','LoanProduct','InputRequest','InputProduct','InputDealer','MarketMatch','MarketProduct','Consignment','Purchase','WelfarePayment','VslaTransaction','VslaAttendance','VslaMeeting','VslaLoanRepayment','VslaLoan','VslaMember','VslaSaving','VslaGroup','ChildProfile','Cultivation','FarmLand','FarmerProfile','AgentAssignment','User','Company','FarmerGroup','Village','Parish','SubCounty','Constituency','District','SubRegion','Region','Tenant']
    for (const t of modelNames) { try { await db.$executeRawUnsafe(`DELETE FROM "${t}"`) } catch(e: any) { /* skip */ } }

    // Tenants
    const hq = await db.tenant.create({ data: { name: 'MobiPay HQ', type: 'SUPER_ADMIN', country: 'Uganda' }})
    const ug = await db.tenant.create({ data: { name: 'Uganda', type: 'COUNTRY', country: 'Uganda', parentId: hq.id }})
    await db.tenant.create({ data: { name: 'Ghana', type: 'COUNTRY', country: 'Ghana', parentId: hq.id }})
    await db.tenant.create({ data: { name: 'Kenya', type: 'COUNTRY', country: 'Kenya', parentId: hq.id }})
    const ngo1 = await db.tenant.create({ data: { name: 'R4iCSA', type: 'NGO', country: 'Uganda', parentId: ug.id }})
    const coop = await db.tenant.create({ data: { name: 'Kabonera Cooperative', type: 'COOPERATIVE', country: 'Uganda', parentId: ug.id }})
    await db.tenant.create({ data: { name: 'Good Grade MFI', type: 'MFI', country: 'Uganda', parentId: ug.id }})

    // Admin user
    await db.user.create({ data: { tenantId: hq.id, role: 'SUPER_ADMIN', email: 'admin@mobipayagrosys.com', phone: '+256779355393', firstName: 'Eric', lastName: 'MobiPay' }})

    // Company & Groups
    const company = await db.company.create({ data: { tenantId: coop.id, name: 'Kabonera Farmers Cooperative', type: 'Cooperative', contactPerson: 'Robert Mugisha', phone: '+256772123456' }})
    const groups: any[] = []
    for (let i = 0; i < GROUP_NAMES.length; i++) {
      groups.push(await db.farmerGroup.create({
        data: { tenantId: i < 3 ? coop.id : ngo1.id, companyId: i < 3 ? company.id : null, name: GROUP_NAMES[i], isVsla: i < 5,
          vslaSettings: i < 5 ? JSON.stringify({ shareValue: 1000, loanRate: 10, maxLoanAmount: 500000 }) : null }
      }))
    }

    // Farmers (30)
    const farmers: any[] = []
    for (let i = 0; i < 30; i++) {
      const [ln, fn] = NAMES[i]
      farmers.push(await db.farmerProfile.create({
        data: {
          tenantId: ug.id, groupId: groups[i % groups.length].id,
          firstName: fn, lastName: ln, phone: `+25677${1000000 + i * 13793}`,
          gender: FEMALE.has(fn) ? 'Female' : 'Male',
          education: ['Primary','Secondary','UG'][i % 3],
          maritalStatus: ['Married','Un-Married','Widow'][i % 3],
          gpsLatitude: -0.3 + i * 0.05, gpsLongitude: 32.5 + i * 0.1,
          familyMembers: 3 + i % 6, farmSize: 0.5 + (i % 5) * 0.5,
          farmOwnership: ['Owned','Rent','Lease'][i % 3],
          mainCrops: JSON.stringify([CROPS[i % CROPS.length], CROPS[(i+3) % CROPS.length]]),
          memberType: i % 10 === 0 ? 'Commercial' : 'General',
          status: 'ACTIVE'
        }
      }))
    }

    // VSLA Groups (5)
    const vslaGroups: any[] = []
    for (let i = 0; i < 5; i++) {
      const vg = await db.vslaGroup.create({
        data: { tenantId: ug.id, groupId: groups[i].id, name: VSLA_NAMES[i],
          shareValue: 1000, loanRate: 10, maxLoanAmount: 500000, fines: 500, welfareAmount: 2000,
          meetingFrequency: 'Weekly', isActive: true }
      })
      vslaGroups.push(vg)
      // Members (8 each)
      for (let j = 0; j < 8; j++) {
        await db.vslaMember.create({
          data: { vslaGroupId: vg.id, farmerId: farmers[(i*6+j) % farmers.length].id,
            memberId: `VSLA-${i+1}-${String(j+1).padStart(3,'0')}`,
            isAdmin: j === 0, isKeyholder: j < 3, sharesOwned: 2 + j }
        })
      }
      // Savings
      for (let j = 0; j < 8; j++) {
        await db.vslaSaving.create({
          data: { vslaGroupId: vg.id, farmerId: farmers[(i*6+j) % farmers.length].id,
            amount: 1000 * (1 + j % 3), sharesBought: 1 + j % 3,
            transactionRef: `TXN-${Date.now()}-${i}${j}`, status: 'COMPLETED' }
        })
      }
      // Loans
      for (let j = 0; j < 3; j++) {
        const amt = 50000 + j * 50000
        await db.vslaLoan.create({
          data: { vslaGroupId: vg.id, farmerId: farmers[(i*6+j+2) % farmers.length].id,
            amount: amt, interestRate: 10, totalRepayable: amt * 1.1,
            amountRepaid: j === 2 ? amt * 1.1 : amt * 0.3,
            status: j === 2 ? 'REPAID' : 'DISBURSED',
            requestedAt: new Date(2026, 4, 1+j), dueDate: new Date(2026, 7, 1+j) }
        })
      }
      // Meetings (3 each)
      for (let j = 0; j < 3; j++) {
        await db.vslaMeeting.create({
          data: { vslaGroupId: vg.id, agenda: ['Weekly Savings','Loan Approvals','Share-out Planning'][j],
            meetingDate: new Date(2026, 5, 1+j*7), startTime: '14:00', endTime: '15:30',
            status: j < 2 ? 'CONCLUDED' : 'SCHEDULED' }
        })
      }
    }

    // Market products (15)
    for (let i = 0; i < 15; i++) {
      const f = farmers[i % farmers.length]
      await db.marketProduct.create({
        data: { sellerId: f.id, sellerName: `${f.firstName} ${f.lastName}`,
          commodity: CROPS[i % CROPS.length], variety: ['Local','Improved','Hybrid'][i%3],
          quantity: `${(i+1)*100} Kg`, unitPrice: 500 + (i%10)*200,
          location: DISTRICTS[i % DISTRICTS.length], status: i < 12 ? 'AVAILABLE' : 'MATCHED' }
      })
    }

    // Payments (20)
    for (let i = 0; i < 20; i++) {
      const f = farmers[i % farmers.length]
      await db.payment.create({
        data: { type: ['CASUAL','BULK_PURCHASE','BULK_DISBURSEMENT','VSLA','MARKETPLACE'][i%5],
          recipientName: `${f.firstName} ${f.lastName}`, recipientPhone: f.phone,
          amount: 10000 + i * 5000, description: ['Farm purchase','Bulk procurement','Salary disbursement','VSLA savings','Market payment'][i%5],
          transactionRef: `PAY-${Date.now()}-${i}`, status: i < 16 ? 'COMPLETED' : 'PENDING' }
      })
    }

    // Trainings (5)
    for (let i = 0; i < 5; i++) {
      await db.training.create({
        data: { topic: ['Good Agricultural Practices','Coffee Pruning','Post-Harvest Handling','VSLA Management','Financial Literacy'][i],
          date: new Date(2026, 4, 5+i*5), location: DISTRICTS[i % DISTRICTS.length], trainerName: `Trainer ${i+1}` }
      })
    }

    // Credit scores (15)
    for (let i = 0; i < 15; i++) {
      const d=40+Math.random()*50, a=40+Math.random()*50, c=40+Math.random()*50, f=40+Math.random()*50
      await db.creditScore.create({
        data: { farmerId: farmers[i].id, demographicsScore: d, assetScore: a, cropScore: c, financialScore: f,
          totalScore: d*0.15+a*0.25+c*0.25+f*0.35 }
      })
    }

    return NextResponse.json({ success: true, stats: { tenants: 7, farmers: 30, vslaGroups: 5, payments: 20, marketProducts: 15, trainings: 5 }})
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message?.slice(0, 500) }, { status: 500 })
  }
}