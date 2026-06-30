import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const users = await db.user.findMany({
    select: { email: true, role: true, isActive: true, passwordHash: true, tenantId: true },
    orderBy: { role: 'asc' },
  })

  console.log(`Total users: ${users.length}\n`)
  console.log('Verifying password123 against each user hash:')
  console.log('─'.repeat(80))

  let ok = 0, bad = 0
  for (const u of users) {
    let valid = false
    if (u.passwordHash?.startsWith('$2')) {
      valid = await bcrypt.compare('password123', u.passwordHash)
    } else if (u.passwordHash === 'password123') {
      valid = true
    }
    const status = valid ? '✅' : '❌'
    if (valid) ok++; else bad++
    console.log(`${status} ${u.role.padEnd(22)} ${u.email.padEnd(35)} active=${u.isActive} tenant=${u.tenantId || 'NULL'}`)
  }

  console.log('─'.repeat(80))
  console.log(`✅ ${ok} valid | ❌ ${bad} invalid`)

  // Also test the exact auth flow used by /api/auth/[...nextauth]
  console.log('\nSimulating authorize() for ug.eo1@agrobase.co + password123:')
  const testUser = await db.user.findFirst({
    where: { OR: [{ email: 'ug.eo1@agrobase.co' }, { phone: 'ug.eo1@agrobase.co' }], isActive: true },
  })
  if (!testUser) {
    console.log('❌ User not found with isActive=true')
  } else {
    console.log(`Found: ${testUser.email} (role=${testUser.role}, isActive=${testUser.isActive})`)
    const valid = testUser.passwordHash?.startsWith('$2')
      ? await bcrypt.compare('password123', testUser.passwordHash)
      : testUser.passwordHash === 'password123'
    console.log(`Password verify: ${valid ? '✅' : '❌'}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
