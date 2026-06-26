import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const users = await db.user.findMany({ select: { email: true, phone: true, role: true, passwordHash: true, isActive: true } })
  console.log(JSON.stringify(users, null, 2))
  await db.$disconnect()
}
main()
