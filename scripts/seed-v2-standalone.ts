/**
 * Run seed-extended-v2.ts standalone — fetches needed IDs from the
 * already-seeded database and passes them to seedExtendedV2().
 */
import { PrismaClient } from '@prisma/client'
import { seedExtendedV2 } from './seed-extended-v2'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Running seed-extended-v2 standalone...')

  // Fetch the context IDs from the already-seeded database
  const ugTenant = await db.tenant.findFirst({ where: { name: 'Agrobase Uganda' } })
  const ekibbo = await db.tenant.findFirst({ where: { name: 'EKIBBO Coffee Exporters' } })
  const hopeMfi = await db.tenant.findFirst({ where: { name: 'Hope Microfinance' } })

  if (!ugTenant || !ekibbo || !hopeMfi) {
    console.error('❌ Could not find required tenants. Run the main seed first.')
    process.exit(1)
  }

  const users = await db.user.findMany({ select: { id: true, role: true } })
  const farmers = await db.farmerProfile.findMany({
    select: { id: true, firstName: true, lastName: true, phone: true },
    take: 20,
  })
  const vslaGroups = await db.vslaGroup.findMany({ select: { id: true }, take: 5 })
  const groups = await db.farmerGroup.findMany({ select: { id: true, name: true }, take: 5 })
  const plots = await db.plot.findMany({ select: { id: true, plotCode: true }, take: 10 })
  const carbonProjects = await db.carbonProject.findMany({ select: { id: true }, take: 5 })
  const trainings = await db.training.findMany({ select: { id: true }, take: 5 })
  const contracts = await db.contract.findMany({ select: { id: true }, take: 5 })
  const batches = await db.productBatch.findMany({ select: { id: true, batchId: true }, take: 10 })
  const warehouses = await db.warehouse.findMany({ select: { id: true }, take: 5 })
  const marketProducts = await db.marketProduct.findMany({ select: { id: true }, take: 10 })
  const notifications = await db.notification.findMany({ select: { id: true }, take: 10 })
  const transportTrips = await db.transportTrip.findMany({ select: { id: true }, take: 5 })
  const vslaMeetings = await db.vslaMeeting.findMany({ select: { id: true }, take: 5 })
  const vslaLoans = await db.vslaLoan.findMany({ select: { id: true }, take: 5 })
  const mfiLoanSchedules = await db.mfiLoanSchedule.findMany({ select: { id: true, loanId: true, totalDue: true, totalPaid: true, status: true }, take: 10 })
  const mfiLoansList = await db.mfiLoan.findMany({ select: { id: true, status: true }, take: 10 })
  const eudrCompliances = await db.eudrCompliance.findMany({ select: { id: true, farmerId: true }, take: 10 })
  const reportTemplates = await db.reportTemplate.findMany({ select: { id: true }, take: 5 })
  const settlements = await db.settlement.findMany({ select: { id: true }, take: 5 })
  const loanProducts = await db.loanProduct.findMany({ select: { id: true }, take: 5 })

  console.log(`  Context: ${users.length} users, ${farmers.length} farmers, ${plots.length} plots, ${batches.length} batches`)

  await seedExtendedV2({
    ugTenant: { id: ugTenant.id },
    ekibbo: { id: ekibbo.id },
    mfiTenant: { id: hopeMfi.id },
    users: users.map(u => ({ id: u.id, role: u.role })),
    farmers: farmers.map(f => ({ id: f.id, firstName: f.firstName, lastName: f.lastName, phone: f.phone })),
    vslaGroups: vslaGroups.map(g => ({ id: g.id })),
    groups: groups.map(g => ({ id: g.id, name: g.name })),
    plots: plots.map(p => ({ id: p.id, plotCode: p.plotCode })),
    carbonProjects: carbonProjects.map(p => ({ id: p.id })),
    trainings,
    contracts,
    batches: batches.map(b => ({ id: b.id, batchId: b.batchId })),
    warehouses: warehouses.map(w => ({ id: w.id })),
    marketProducts: marketProducts.map(m => ({ id: m.id })),
    notifications,
    transportTrips,
    vslaMeetings,
    vslaLoans,
    mfiLoanSchedules,
    mfiLoansList,
    eudrCompliances: eudrCompliances.map(e => ({ id: e.id, farmerId: e.farmerId })),
    reportTemplates,
    settlements,
    loans: loanProducts.map(l => ({ id: l.id })),
  })

  console.log('✅ seed-extended-v2 completed!')
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1) })
  .finally(() => db.$disconnect())
