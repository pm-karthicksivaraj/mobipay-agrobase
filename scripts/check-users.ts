import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const users = await db.user.findMany({ select: { email: true, role: true, isActive: true, phone: true, passwordHash: true, tenant: { select: { name: true } } }, orderBy: { role: 'asc' }, take: 100 })
  console.log(`Total users: ${users.length}`)
  for (const u of users) {
    console.log(`${u.role.padEnd(22)} | ${u.email.padEnd(35)} | ${u.phone?.padEnd(15) || 'N/A'.padEnd(15)} | active=${u.isActive} | tenant=${u.tenant?.name || 'N/A'} | hashPrefix=${u.passwordHash?.substring(0, 4) || 'NULL'}`)
  }
  // Also check plots, farmers, farmLands, cultivations
  const plotCount = await db.plot.count()
  const farmerCount = await db.farmerProfile.count()
  const farmLandCount = await db.farmLand.count()
  const cultivationCount = await db.cultivation.count()
  const plotWithGeo = await db.plot.count({ where: { NOT: { boundaryGeoJson: null } } })
  console.log(`\nData: farmers=${farmerCount} | farmLands=${farmLandCount} | cultivations=${cultivationCount} | plots=${plotCount} | plotsWithGeoJson=${plotWithGeo}`)
  const tenants = await db.tenant.findMany({ select: { name: true, country: true, _count: { select: { users: true, farmerProfiles: true } } } })
  console.log('\nTenants:')
  for (const t of tenants) console.log(`  ${t.name} (${t.country}) — users: ${t._count.users}, farmers: ${t._count.farmerProfiles}`)
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
