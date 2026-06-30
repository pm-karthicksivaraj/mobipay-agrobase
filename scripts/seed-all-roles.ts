/**
 * COMPREHENSIVE seed for ALL roles in UG/GH/KE + EKIBBO + MFI tenants.
 * Adds AGENT role (new) and ensures every documented email exists with password123.
 *
 * Usage:  npx tsx scripts/seed-all-roles.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12)

  const tenants = await db.tenant.findMany()
  const findT = (name: string) => tenants.find(t => t.name === name)

  const ug = findT('Agrobase Uganda')
  const gh = findT('Agrobase Ghana')
  const ke = findT('Agrobase Kenya')
  const ekibbo = findT('EKIBBO Coffee Exporters')
  const hope = findT('Hope Microfinance')
  const mobipay = findT('MobiPay AgroSys')

  if (!ug || !gh || !ke) {
    console.error('Country tenants missing. Run main seed first.')
    process.exit(1)
  }

  const users = [
    // Super Admin
    ...(mobipay ? [{ tenantId: mobipay.id, role: 'SUPER_ADMIN', firstName: 'Super', lastName: 'Admin', email: 'admin@agrobase.co', phone: '+256700000001', country: 'Uganda' }] : []),

    // ─── Uganda ───
    { tenantId: ug.id, role: 'COUNTRY_ADMIN', firstName: 'Samuel', lastName: 'Kato', email: 'ug.admin@agrobase.co', phone: '+256700000002', country: 'Uganda' },
    { tenantId: ug.id, role: 'TENANT_ADMIN', firstName: 'Grace', lastName: 'Nakamya', email: 'ug.tenant@agrobase.co', phone: '+256700000003', country: 'Uganda' },
    { tenantId: ug.id, role: 'EXTENSION_OFFICER', firstName: 'John', lastName: 'Okello', email: 'ug.eo1@agrobase.co', phone: '+256700000010', country: 'Uganda' },
    { tenantId: ug.id, role: 'EXTENSION_OFFICER', firstName: 'Mary', lastName: 'Akello', email: 'ug.eo2@agrobase.co', phone: '+256700000011', country: 'Uganda' },
    { tenantId: ug.id, role: 'AGENT', firstName: 'Peter', lastName: 'Ssali', email: 'ug.agent1@agrobase.co', phone: '+256700000015', country: 'Uganda' },
    { tenantId: ug.id, role: 'AGENT', firstName: 'Joyce', lastName: 'Nabirye', email: 'ug.agent2@agrobase.co', phone: '+256700000016', country: 'Uganda' },
    { tenantId: ug.id, role: 'CBT', firstName: 'Peter', lastName: 'Mukasa', email: 'ug.cbt@agrobase.co', phone: '+256700000012', country: 'Uganda' },
    { tenantId: ug.id, role: 'FARMER', firstName: 'James', lastName: 'Mugisha', email: 'ug.farmer1@agrobase.co', phone: '+256700000020', country: 'Uganda' },
    { tenantId: ug.id, role: 'FARMER', firstName: 'Sarah', lastName: 'Achieng', email: 'ug.farmer2@agrobase.co', phone: '+256700000021', country: 'Uganda' },
    { tenantId: ug.id, role: 'VSLA_MEMBER', firstName: 'David', lastName: 'Okello', email: 'ug.vsla@agrobase.co', phone: '+256700000030', country: 'Uganda' },

    // ─── Ghana ───
    { tenantId: gh.id, role: 'COUNTRY_ADMIN', firstName: 'Kwame', lastName: 'Mensah', email: 'gh.admin@agrobase.co', phone: '+233200000002', country: 'Ghana' },
    { tenantId: gh.id, role: 'TENANT_ADMIN', firstName: 'Ama', lastName: 'Owusu', email: 'gh.tenant@agrobase.co', phone: '+233200000003', country: 'Ghana' },
    { tenantId: gh.id, role: 'EXTENSION_OFFICER', firstName: 'Kofi', lastName: 'Asante', email: 'gh.eo1@agrobase.co', phone: '+233200000010', country: 'Ghana' },
    { tenantId: gh.id, role: 'EXTENSION_OFFICER', firstName: 'Ama', lastName: 'Serwaa', email: 'gh.eo2@agrobase.co', phone: '+233200000011', country: 'Ghana' },
    { tenantId: gh.id, role: 'AGENT', firstName: 'Yaw', lastName: 'Adjei', email: 'gh.agent1@agrobase.co', phone: '+233200000015', country: 'Ghana' },
    { tenantId: gh.id, role: 'CBT', firstName: 'Akosua', lastName: 'Frimpong', email: 'gh.cbt@agrobase.co', phone: '+233200000012', country: 'Ghana' },
    { tenantId: gh.id, role: 'FARMER', firstName: 'Yaw', lastName: 'Boateng', email: 'gh.farmer1@agrobase.co', phone: '+233200000020', country: 'Ghana' },
    { tenantId: gh.id, role: 'FARMER', firstName: 'Efua', lastName: 'Darko', email: 'gh.farmer2@agrobase.co', phone: '+233200000021', country: 'Ghana' },
    { tenantId: gh.id, role: 'VSLA_MEMBER', firstName: 'Kwesi', lastName: 'Appiah', email: 'gh.vsla@agrobase.co', phone: '+233200000030', country: 'Ghana' },

    // ─── Kenya ───
    { tenantId: ke.id, role: 'COUNTRY_ADMIN', firstName: 'James', lastName: 'Mwangi', email: 'ke.admin@agrobase.co', phone: '+254700000002', country: 'Kenya' },
    { tenantId: ke.id, role: 'TENANT_ADMIN', firstName: 'Wanjiru', lastName: 'Kamau', email: 'ke.tenant@agrobase.co', phone: '+254700000003', country: 'Kenya' },
    { tenantId: ke.id, role: 'EXTENSION_OFFICER', firstName: 'David', lastName: 'Ochieng', email: 'ke.eo1@agrobase.co', phone: '+254700000010', country: 'Kenya' },
    { tenantId: ke.id, role: 'EXTENSION_OFFICER', firstName: 'Faith', lastName: 'Wanjiku', email: 'ke.eo2@agrobase.co', phone: '+254700000011', country: 'Kenya' },
    { tenantId: ke.id, role: 'AGENT', firstName: 'Brian', lastName: 'Kiprop', email: 'ke.agent1@agrobase.co', phone: '+254700000015', country: 'Kenya' },
    { tenantId: ke.id, role: 'CBT', firstName: 'Fatuma', lastName: 'Hassan', email: 'ke.cbt@agrobase.co', phone: '+254700000012', country: 'Kenya' },
    { tenantId: ke.id, role: 'FARMER', firstName: 'Peter', lastName: 'Kibet', email: 'ke.farmer1@agrobase.co', phone: '+254700000020', country: 'Kenya' },
    { tenantId: ke.id, role: 'FARMER', firstName: 'Jane', lastName: 'Chebet', email: 'ke.farmer2@agrobase.co', phone: '+254700000021', country: 'Kenya' },
    { tenantId: ke.id, role: 'VSLA_MEMBER', firstName: 'Mercy', lastName: 'Njoroge', email: 'ke.vsla@agrobase.co', phone: '+254700000030', country: 'Kenya' },

    // ─── Exporter (EKIBBO) ───
    ...(ekibbo ? [
      { tenantId: ekibbo.id, role: 'TENANT_ADMIN', firstName: 'Eric', lastName: 'MobiPay', email: 'exporter@ekibbo.co', phone: '+256700000040', country: 'Uganda' },
      { tenantId: ekibbo.id, role: 'AGENT', firstName: 'Betty', lastName: 'Nabukenya', email: 'exporter.agent@ekibbo.co', phone: '+256700000041', country: 'Uganda' },
    ] : []),

    // ─── MFI (Hope) ───
    ...(hope ? [
      { tenantId: hope.id, role: 'TENANT_ADMIN', firstName: 'Robert', lastName: 'Banker', email: 'mfi@hopefinance.co', phone: '+256700000050', country: 'Uganda' },
      { tenantId: hope.id, role: 'AGENT', firstName: 'Linda', lastName: 'Atim', email: 'mfi.agent@hopefinance.co', phone: '+256700000051', country: 'Uganda' },
    ] : []),
  ] as Array<{ tenantId: string; role: string; firstName: string; lastName: string; email: string; phone: string; country?: string }>

  let created = 0, skipped = 0
  for (const u of users) {
    const existing = await db.user.findFirst({
      where: { OR: [{ email: u.email }, { phone: u.phone }] },
    })
    if (existing) {
      // Update password + role to ensure consistent state
      const { country, ...userData } = u
      await db.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          role: userData.role,
          isActive: true,
          firstName: userData.firstName,
          lastName: userData.lastName,
          tenantId: userData.tenantId,
        },
      })
      console.log(`↻ Updated: ${u.role.padEnd(22)} | ${u.email.padEnd(35)} | ${u.phone}`)
      skipped++
    } else {
      const { country, ...userData } = u
      await db.user.create({
        data: {
          ...userData,
          passwordHash,
          isActive: true,
        },
      })
      console.log(`✅ Created: ${u.role.padEnd(22)} | ${u.email.padEnd(35)} | ${u.phone}`)
      created++
    }
  }

  console.log(`\n✅ Done. ${created} created, ${skipped} updated. Total: ${users.length}`)
  console.log('\n📋 LOGIN CREDENTIALENTS:')
  console.log('   Password for all: password123')
  console.log('   ───────────────────────────────────────────────')
  console.log('   SUPER_ADMIN          admin@agrobase.co')
  console.log('   ─── Uganda (UGX / English) ───')
  console.log('   COUNTRY_ADMIN        ug.admin@agrobase.co')
  console.log('   TENANT_ADMIN         ug.tenant@agrobase.co')
  console.log('   EXTENSION_OFFICER    ug.eo1@agrobase.co / ug.eo2@agrobase.co')
  console.log('   AGENT                ug.agent1@agrobase.co / ug.agent2@agrobase.co')
  console.log('   CBT                  ug.cbt@agrobase.co')
  console.log('   FARMER               ug.farmer1@agrobase.co / ug.farmer2@agrobase.co')
  console.log('   VSLA_MEMBER          ug.vsla@agrobase.co')
  console.log('   ─── Ghana (GHS / English) ───')
  console.log('   COUNTRY_ADMIN        gh.admin@agrobase.co')
  console.log('   EXTENSION_OFFICER    gh.eo1@agrobase.co / gh.eo2@agrobase.co')
  console.log('   AGENT                gh.agent1@agrobase.co')
  console.log('   FARMER               gh.farmer1@agrobase.co / gh.farmer2@agrobase.co')
  console.log('   ─── Kenya (KES / Swahili) ───')
  console.log('   COUNTRY_ADMIN        ke.admin@agrobase.co')
  console.log('   EXTENSION_OFFICER    ke.eo1@agrobase.co / ke.eo2@agrobase.co')
  console.log('   AGENT                ke.agent1@agrobase.co')
  console.log('   FARMER               ke.farmer1@agrobase.co / ke.farmer2@agrobase.co')
  console.log('   ─── Exporter (EKIBBO) ───')
  console.log('   TENANT_ADMIN         exporter@ekibbo.co')
  console.log('   AGENT                exporter.agent@ekibbo.co')
  console.log('   ─── MFI (Hope) ───')
  console.log('   TENANT_ADMIN         mfi@hopefinance.co')
  console.log('   AGENT                mfi.agent@hopefinance.co')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
