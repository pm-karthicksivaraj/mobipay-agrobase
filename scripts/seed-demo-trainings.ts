/**
 * Seed demo trainings + enrollment + attendance.
 * Makes the Training view non-empty on first load.
 *
 * Usage:  npx tsx scripts/seed-demo-trainings.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const SAMPLE_TRAININGS = [
  {
    topic: 'Coffee Pruning Best Practices',
    description: 'Hands-on training on coffee bush rejuvenation and pruning for higher yield.',
    dateOffset: 7, // 7 days from now
    location: 'Kibale Community Hall, Mukono',
    trainerName: 'John Okello (Extension Officer)',
    type: 'GROUP_TRAINING',
    status: 'SCHEDULED',
    startTime: '10:00',
    endTime: '13:00',
    expectedAttendees: 25,
    materialsUsed: 'Pruning shears, demo bushes, booklets',
    notes: 'Bring your own shears if possible.',
  },
  {
    topic: 'Farm Visit: Soil Sample Collection',
    description: 'One-on-one farm visit to demonstrate proper soil sampling technique.',
    dateOffset: -3, // 3 days ago (completed)
    location: "James Mugisha's Farm, Kibale",
    trainerName: 'Mary Akello (Extension Officer)',
    type: 'FARM_VISIT',
    status: 'COMPLETED',
    startTime: '09:00',
    endTime: '11:00',
    expectedAttendees: 1,
    materialsUsed: 'Soil auger, sample bags, GPS',
    notes: 'Sample sent to NARL Kawanda for testing.',
  },
  {
    topic: 'Maize Field Day: Improved Varieties',
    description: 'Field day showcasing Longe 5H and Longe 10 maize varieties with demo plots.',
    dateOffset: 14,
    location: 'Wakiso Demo Plot',
    trainerName: 'Peter Ssali (CBT)',
    type: 'FIELD_DAY',
    status: 'SCHEDULED',
    startTime: '10:00',
    endTime: '15:00',
    expectedAttendees: 50,
    materialsUsed: 'Demo plot, variety samples, refreshments',
    notes: 'Co-organized with seed company.',
  },
]

async function main() {
  const farmers = await db.farmerProfile.findMany({ take: 10 })
  if (farmers.length === 0) {
    console.log('No farmers found. Run main seed first.')
    process.exit(0)
  }
  console.log(`Found ${farmers.length} farmers. Seeding demo trainings...`)

  // Find a tenant to use
  const tenant = await db.tenant.findFirst({ where: { name: 'Agrobase Uganda' } })
  if (!tenant) {
    console.log('Agrobase Uganda tenant not found.')
    process.exit(1)
  }

  let trainingCount = 0
  for (const t of SAMPLE_TRAININGS) {
    const existing = await db.training.findFirst({ where: { topic: t.topic, tenantId: tenant.id } })
    if (existing) {
      console.log(`↻ ${t.topic} already exists, skipping`)
      continue
    }

    const date = new Date()
    date.setDate(date.getDate() + t.dateOffset)

    const startDate = new Date(`${date.toISOString().split('T')[0]}T${t.startTime}:00`)
    const endDate = new Date(`${date.toISOString().split('T')[0]}T${t.endTime}:00`)

    const training = await db.training.create({
      data: {
        tenantId: tenant.id,
        topic: t.topic,
        description: t.description,
        date,
        location: t.location,
        trainerName: t.trainerName,
        type: t.type,
        status: t.status,
        startTime: startDate,
        endTime: endDate,
        expectedAttendees: t.expectedAttendees,
        materialsUsed: t.materialsUsed,
        notes: t.notes,
      },
    })

    // Enroll a few farmers
    const enrollCount = Math.min(t.expectedAttendees, 4)
    for (let i = 0; i < enrollCount; i++) {
      const farmer = farmers[i % farmers.length]
      const already = await db.trainingAttendance.findFirst({
        where: { trainingId: training.id, farmerId: farmer.id },
      })
      if (already) continue

      const attended = t.status === 'COMPLETED'
      await db.trainingAttendance.create({
        data: {
          trainingId: training.id,
          farmerId: farmer.id,
          attended,
          enrolledAt: new Date(Date.now() - t.dateOffset * 86400000),
          enrollmentStatus: attended ? 'ATTENDED' : 'ENROLLED',
          ...(attended && { feedbackRating: 4 + (i % 2) }),
          ...(attended && { feedbackNotes: 'Good training, very practical.' }),
        },
      })
    }

    console.log(`✅ Created: ${t.topic} (${t.type}, ${t.status}) — ${enrollCount} farmers enrolled`)
    trainingCount++
  }

  console.log(`\n✅ Done. Created ${trainingCount} trainings with enrollment.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
