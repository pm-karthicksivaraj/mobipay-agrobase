/**
 * Seed crop calendars for Coffee and Cocoa across Uganda, Ghana, Kenya.
 * Run: npx tsx scripts/seed-crop-calendars.ts
 */
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding crop calendars...')

  // Fetch the Uganda tenant
  const ugTenant = await db.tenant.findFirst({ where: { name: 'Agrobase Uganda' } })
  const ghTenant = await db.tenant.findFirst({ where: { name: 'Agrobase Ghana' } })
  const keTenant = await db.tenant.findFirst({ where: { name: 'Agrobase Kenya' } })
  if (!ugTenant || !ghTenant || !keTenant) {
    console.error('❌ Tenants not found. Run main seed first.')
    process.exit(1)
  }

  const calendars = [
    // ─── Coffee — Uganda (Arabica, Mt. Elgon) ───
    {
      tenantId: ugTenant.id,
      cropName: 'Coffee',
      country: 'Uganda',
      variety: 'Arabica SL28',
      totalDurationDays: 270,
      plantingWindows: JSON.stringify([{ startMonth: 2, endMonth: 4 }, { startMonth: 9, endMonth: 11 }]),
      farm5xVariant: '1M5C',
      stages: JSON.stringify([
        { stageName: 'Nursery', startDay: 0, endDay: 60, expectedNDVI: { min: 0.2, max: 0.4 }, expectedRainfall: { minMm: 100, maxMm: 200 }, risks: ['Drought', 'Pest attack'] },
        { stageName: 'Land Prep & Planting', startDay: 60, endDay: 90, expectedNDVI: { min: 0.3, max: 0.5 }, expectedRainfall: { minMm: 150, maxMm: 250 }, risks: ['Soil erosion'] },
        { stageName: 'Vegetative Growth', startDay: 90, endDay: 180, expectedNDVI: { min: 0.5, max: 0.75 }, expectedRainfall: { minMm: 200, maxMm: 400 }, risks: ['Leaf rust', 'Stem borer'] },
        { stageName: 'Flowering', startDay: 180, endDay: 210, expectedNDVI: { min: 0.6, max: 0.8 }, expectedRainfall: { minMm: 150, maxMm: 250 }, risks: ['Berry disease', 'Frost'] },
        { stageName: 'Cherry Development', startDay: 210, endDay: 250, expectedNDVI: { min: 0.65, max: 0.85 }, expectedRainfall: { minMm: 100, maxMm: 200 }, risks: ['Berry borer', 'Sun scorch'] },
        { stageName: 'Harvest', startDay: 250, endDay: 270, expectedNDVI: { min: 0.6, max: 0.8 }, expectedRainfall: { minMm: 50, maxMm: 150 }, risks: ['Post-harvest loss'] },
      ]),
    },
    // ─── Coffee — Uganda (Robusta) ───
    {
      tenantId: ugTenant.id,
      cropName: 'Coffee',
      country: 'Uganda',
      variety: 'Robusta',
      totalDurationDays: 300,
      plantingWindows: JSON.stringify([{ startMonth: 3, endMonth: 5 }, { startMonth: 9, endMonth: 10 }]),
      farm5xVariant: '1M5C',
      stages: JSON.stringify([
        { stageName: 'Nursery', startDay: 0, endDay: 60, expectedNDVI: { min: 0.2, max: 0.4 }, expectedRainfall: { minMm: 120, maxMm: 200 }, risks: ['Drought'] },
        { stageName: 'Land Prep & Planting', startDay: 60, endDay: 90, expectedNDVI: { min: 0.3, max: 0.5 }, expectedRainfall: { minMm: 150, maxMm: 300 }, risks: ['Erosion'] },
        { stageName: 'Vegetative Growth', startDay: 90, endDay: 200, expectedNDVI: { min: 0.55, max: 0.8 }, expectedRainfall: { minMm: 200, maxMm: 500 }, risks: ['CWD', 'Leaf miner'] },
        { stageName: 'Flowering', startDay: 200, endDay: 230, expectedNDVI: { min: 0.65, max: 0.85 }, expectedRainfall: { minMm: 100, maxMm: 200 }, risks: ['Excess rain'] },
        { stageName: 'Cherry Development', startDay: 230, endDay: 280, expectedNDVI: { min: 0.7, max: 0.9 }, expectedRainfall: { minMm: 80, maxMm: 150 }, risks: ['Berry borer'] },
        { stageName: 'Harvest', startDay: 280, endDay: 300, expectedNDVI: { min: 0.65, max: 0.85 }, expectedRainfall: { minMm: 50, maxMm: 100 }, risks: ['Post-harvest loss'] },
      ]),
    },
    // ─── Cocoa — Ghana ───
    {
      tenantId: ghTenant.id,
      cropName: 'Cocoa',
      country: 'Ghana',
      variety: 'Hybrid Amazon',
      totalDurationDays: 365,
      plantingWindows: JSON.stringify([{ startMonth: 4, endMonth: 6 }, { startMonth: 9, endMonth: 10 }]),
      farm5xVariant: '1M5K',
      stages: JSON.stringify([
        { stageName: 'Nursery', startDay: 0, endDay: 90, expectedNDVI: { min: 0.3, max: 0.5 }, expectedRainfall: { minMm: 200, maxMm: 400 }, risks: ['Drought', 'Black pod'] },
        { stageName: 'Land Prep & Planting', startDay: 90, endDay: 120, expectedNDVI: { min: 0.3, max: 0.5 }, expectedRainfall: { minMm: 200, maxMm: 300 }, risks: ['Deforestation risk'] },
        { stageName: 'Establishment', startDay: 120, endDay: 240, expectedNDVI: { min: 0.4, max: 0.65 }, expectedRainfall: { minMm: 300, maxMm: 500 }, risks: ['Pest', 'Drought'] },
        { stageName: 'Vegetative Growth', startDay: 240, endDay: 300, expectedNDVI: { min: 0.55, max: 0.8 }, expectedRainfall: { minMm: 250, maxMm: 400 }, risks: ['Black pod', 'Capsid'] },
        { stageName: 'Pod Development', startDay: 300, endDay: 340, expectedNDVI: { min: 0.6, max: 0.85 }, expectedRainfall: { minMm: 150, maxMm: 300 }, risks: ['Black pod', 'Squirrels'] },
        { stageName: 'Harvest', startDay: 340, endDay: 365, expectedNDVI: { min: 0.6, max: 0.85 }, expectedRainfall: { minMm: 100, maxMm: 200 }, risks: ['Post-harvest loss'] },
      ]),
    },
    // ─── Coffee — Kenya ───
    {
      tenantId: keTenant.id,
      cropName: 'Coffee',
      country: 'Kenya',
      variety: 'Arabica SL34',
      totalDurationDays: 280,
      plantingWindows: JSON.stringify([{ startMonth: 3, endMonth: 5 }, { startMonth: 10, endMonth: 11 }]),
      farm5xVariant: '1M5C',
      stages: JSON.stringify([
        { stageName: 'Nursery', startDay: 0, endDay: 60, expectedNDVI: { min: 0.2, max: 0.4 }, expectedRainfall: { minMm: 100, maxMm: 200 }, risks: ['Drought', 'Frost'] },
        { stageName: 'Land Prep & Planting', startDay: 60, endDay: 90, expectedNDVI: { min: 0.3, max: 0.5 }, expectedRainfall: { minMm: 150, maxMm: 250 }, risks: ['Erosion'] },
        { stageName: 'Vegetative Growth', startDay: 90, endDay: 190, expectedNDVI: { min: 0.5, max: 0.75 }, expectedRainfall: { minMm: 200, maxMm: 400 }, risks: ['Leaf rust', 'CBD'] },
        { stageName: 'Flowering', startDay: 190, endDay: 220, expectedNDVI: { min: 0.6, max: 0.8 }, expectedRainfall: { minMm: 100, maxMm: 200 }, risks: ['Frost', 'Hail'] },
        { stageName: 'Cherry Development', startDay: 220, endDay: 260, expectedNDVI: { min: 0.65, max: 0.85 }, expectedRainfall: { minMm: 80, maxMm: 150 }, risks: ['Berry borer'] },
        { stageName: 'Harvest', startDay: 260, endDay: 280, expectedNDVI: { min: 0.6, max: 0.8 }, expectedRainfall: { minMm: 50, maxMm: 100 }, risks: ['Post-harvest loss'] },
      ]),
    },
  ]

  for (const cal of calendars) {
    const existing = await db.cropCalendar.findFirst({
      where: { cropName: cal.cropName, country: cal.country, variety: cal.variety },
    })
    if (!existing) {
      await db.cropCalendar.create({ data: cal })
      console.log(`✅ ${cal.cropName} ${cal.variety} — ${cal.country}`)
    } else {
      console.log(`⏭️  Already exists: ${cal.cropName} ${cal.variety} — ${cal.country}`)
    }
  }

  console.log(`\n✅ Done! ${calendars.length} crop calendars processed.`)
  console.log('   Each calendar has 6 seasonal stages with expected NDVI, rainfall, and risks.')
  console.log('   Calendars are linked to Farm5x variants (1M5C for Coffee, 1M5K for Cocoa).')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
