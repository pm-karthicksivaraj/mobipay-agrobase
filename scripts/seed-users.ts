/**
 * Add comprehensive demo users for all 3 countries (Uganda, Ghana, Kenya)
 * with all roles. Run after the main seed.
 *
 * Usage: npx tsx scripts/seed-users.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12)

  // Find the 3 country tenants
  const ugTenant = await db.tenant.findFirst({ where: { name: 'Agrobase Uganda' } })
  const ghTenant = await db.tenant.findFirst({ where: { name: 'Agrobase Ghana' } })
  const keTenant = await db.tenant.findFirst({ where: { name: 'Agrobase Kenya' } })
  const ekibboTenant = await db.tenant.findFirst({ where: { name: 'EKIBBO Coffee Exporters' } })
  const hopeMfi = await db.tenant.findFirst({ where: { name: 'Hope Microfinance' } })

  if (!ugTenant || !ghTenant || !keTenant) {
    console.error('❌ Country tenants not found. Run the main seed first.')
    process.exit(1)
  }

  const users = [
    // ─── Uganda ───
    { tenantId: ugTenant.id, role: 'COUNTRY_ADMIN', firstName: 'Samuel', lastName: 'Kato', email: 'ug.admin@agrobase.co', phone: '+256700000002' },
    { tenantId: ugTenant.id, role: 'TENANT_ADMIN', firstName: 'Grace', lastName: 'Nakamya', email: 'ug.tenant@agrobase.co', phone: '+256700000003' },
    { tenantId: ugTenant.id, role: 'EXTENSION_OFFICER', firstName: 'John', lastName: 'Okello', email: 'ug.eo1@agrobase.co', phone: '+256700000010' },
    { tenantId: ugTenant.id, role: 'EXTENSION_OFFICER', firstName: 'Mary', lastName: 'Akello', email: 'ug.eo2@agrobase.co', phone: '+256700000011' },
    { tenantId: ugTenant.id, role: 'CBT', firstName: 'Peter', lastName: 'Mukasa', email: 'ug.cbt@agrobase.co', phone: '+256700000012' },
    { tenantId: ugTenant.id, role: 'FARMER', firstName: 'James', lastName: 'Mugisha', email: 'ug.farmer1@agrobase.co', phone: '+256700000020' },
    { tenantId: ugTenant.id, role: 'FARMER', firstName: 'Sarah', lastName: 'Achieng', email: 'ug.farmer2@agrobase.co', phone: '+256700000021' },
    { tenantId: ugTenant.id, role: 'VSLA_MEMBER', firstName: 'David', lastName: 'Okello', email: 'ug.vsla@agrobase.co', phone: '+256700000030' },

    // ─── Ghana ───
    { tenantId: ghTenant.id, role: 'COUNTRY_ADMIN', firstName: 'Kwame', lastName: 'Mensah', email: 'gh.admin@agrobase.co', phone: '+233200000002' },
    { tenantId: ghTenant.id, role: 'TENANT_ADMIN', firstName: 'Ama', lastName: 'Owusu', email: 'gh.tenant@agrobase.co', phone: '+233200000003' },
    { tenantId: ghTenant.id, role: 'EXTENSION_OFFICER', firstName: 'Kofi', lastName: 'Asante', email: 'gh.eo1@agrobase.co', phone: '+233200000010' },
    { tenantId: ghTenant.id, role: 'CBT', firstName: 'Akosua', lastName: 'Frimpong', email: 'gh.cbt@agrobase.co', phone: '+233200000012' },
    { tenantId: ghTenant.id, role: 'FARMER', firstName: 'Yaw', lastName: 'Boateng', email: 'gh.farmer1@agrobase.co', phone: '+233200000020' },
    { tenantId: ghTenant.id, role: 'FARMER', firstName: 'Efua', lastName: 'Darko', email: 'gh.farmer2@agrobase.co', phone: '+233200000021' },
    { tenantId: ghTenant.id, role: 'VSLA_MEMBER', firstName: 'Kwesi', lastName: 'Appiah', email: 'gh.vsla@agrobase.co', phone: '+233200000030' },

    // ─── Kenya ───
    { tenantId: keTenant.id, role: 'COUNTRY_ADMIN', firstName: 'James', lastName: 'Mwangi', email: 'ke.admin@agrobase.co', phone: '+254700000002' },
    { tenantId: keTenant.id, role: 'TENANT_ADMIN', firstName: 'Wanjiru', lastName: 'Kamau', email: 'ke.tenant@agrobase.co', phone: '+254700000003' },
    { tenantId: keTenant.id, role: 'EXTENSION_OFFICER', firstName: 'David', lastName: 'Ochieng', email: 'ke.eo1@agrobase.co', phone: '+254700000010' },
    { tenantId: keTenant.id, role: 'CBT', firstName: 'Fatuma', lastName: 'Hassan', email: 'ke.cbt@agrobase.co', phone: '+254700000012' },
    { tenantId: keTenant.id, role: 'FARMER', firstName: 'Peter', lastName: 'Kibet', email: 'ke.farmer1@agrobase.co', phone: '+254700000020' },
    { tenantId: keTenant.id, role: 'FARMER', firstName: 'Jane', lastName: 'Chebet', email: 'ke.farmer2@agrobase.co', phone: '+254700000021' },
    { tenantId: keTenant.id, role: 'VSLA_MEMBER', firstName: 'Mercy', lastName: 'Njoroge', email: 'ke.vsla@agrobase.co', phone: '+254700000030' },

    // ─── Exporter (EKIBBO) ───
    ...(ekibboTenant ? [
      { tenantId: ekibboTenant.id, role: 'TENANT_ADMIN', firstName: 'Eric', lastName: 'MobiPay', email: 'exporter@ekibbo.co', phone: '+256700000040' },
    ] : []),

    // ─── MFI ───
    ...(hopeMfi ? [
      { tenantId: hopeMfi.id, role: 'TENANT_ADMIN', firstName: 'Robert', lastName: 'Banker', email: 'mfi@hopefinance.co', phone: '+256700000050' },
    ] : []),
  ]

  for (const u of users) {
    const existing = await db.user.findFirst({ where: { OR: [{ email: u.email }, { phone: u.phone }] } })
    if (!existing) {
      await db.user.create({
        data: {
          ...u,
          passwordHash,
          isActive: true,
        },
      })
      console.log(`✅ ${u.role} | ${u.email} | ${u.phone} | ${u.firstName} ${u.lastName}`)
    } else {
      console.log(`⏭️  Already exists: ${u.email}`)
    }
  }

  console.log(`\n✅ Done! ${users.length} users processed.`)
  console.log('\n📋 Login credentials for all users:')
  console.log('   Password: password123')
  console.log('   ────────────────────────────────')
  console.log('   SUPER_ADMIN:  admin@agrobase.co')
  console.log('   ─── Uganda ───')
  console.log('   COUNTRY_ADMIN:    ug.admin@agrobase.co')
  console.log('   TENANT_ADMIN:     ug.tenant@agrobase.co')
  console.log('   EXTENSION_OFFICER: ug.eo1@agrobase.co / ug.eo2@agrobase.co')
  console.log('   CBT:              ug.cbt@agrobase.co')
  console.log('   FARMER:           ug.farmer1@agrobase.co / ug.farmer2@agrobase.co')
  console.log('   VSLA_MEMBER:      ug.vsla@agrobase.co')
  console.log('   ─── Ghana ───')
  console.log('   COUNTRY_ADMIN:    gh.admin@agrobase.co')
  console.log('   EXTENSION_OFFICER: gh.eo1@agrobase.co')
  console.log('   FARMER:           gh.farmer1@agrobase.co')
  console.log('   ─── Kenya ───')
  console.log('   COUNTRY_ADMIN:    ke.admin@agrobase.co')
  console.log('   EXTENSION_OFFICER: ke.eo1@agrobase.co')
  console.log('   FARMER:           ke.farmer1@agrobase.co')
  console.log('   ─── Exporter (EKIBBO) ───')
  console.log('   TENANT_ADMIN:     exporter@ekibbo.co')
  console.log('   ─── MFI (Hope) ───')
  console.log('   TENANT_ADMIN:     mfi@hopefinance.co')
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1) })
  .finally(() => db.$disconnect())
