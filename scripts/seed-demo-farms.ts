/**
 * Seed demo farm lands with GPS polygons + cultivations.
 * Makes the map view, farm land registry, and cultivations non-empty.
 *
 * Usage:  npx tsx scripts/seed-demo-farms.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Polygon coordinates around Kampala area (real-ish GPS points)
const SAMPLE_POLYGONS: Array<{ lat: number; lng: number }> = [
  { lat: 0.3476, lng: 32.5825 }, // Kampala center
  { lat: 0.3500, lng: 32.5900 },
  { lat: 0.3420, lng: 32.5950 },
  { lat: 0.3380, lng: 32.5800 },
]

const SAMPLE_FARMS = [
  { farmerIdx: 0, name: 'Kibale Plot 1', cropName: 'Coffee Arabica', variety: 'SL28', season: 'Wet 2026', area: 1.5 },
  { farmerIdx: 1, name: 'Wakiso Maize Field', cropName: 'Maize', variety: 'Longe 5', season: 'Spring 2026', area: 2.0 },
  { farmerIdx: 0, name: 'Mukono Vegetable Garden', cropName: 'Tomato', variety: 'Hybrid', season: 'Summer 2026', area: 0.5 },
  { farmerIdx: 1, name: 'Jinja Coffee Block B', cropName: 'Coffee Robusta', variety: 'Nemaya', season: 'Wet 2026', area: 3.2 },
]

async function main() {
  const farmers = await db.farmerProfile.findMany({ take: 5 })
  if (farmers.length === 0) {
    console.log('No farmers found. Run main seed first.')
    process.exit(0)
  }
  console.log(`Found ${farmers.length} farmers. Seeding demo farm lands + cultivations...`)

  let farmCount = 0
  for (let i = 0; i < SAMPLE_FARMS.length; i++) {
    const s = SAMPLE_FARMS[i]
    const farmer = farmers[s.farmerIdx % farmers.length]

    // Check if farm already exists
    const existing = await db.farmLand.findFirst({ where: { name: s.name, farmerId: farmer.id } })
    if (existing) {
      console.log(`↻ ${s.name} already exists, skipping`)
      continue
    }

    // Slightly offset polygon per farm
    const offsetLat = i * 0.005
    const offsetLng = i * 0.005
    const polygonPoints = SAMPLE_POLYGONS.map((p, idx) => ({
      latitude: p.lat + offsetLat,
      longitude: p.lng + offsetLng,
      altitude: null,
      pointOrder: idx,
    }))

    const farm = await db.farmLand.create({
      data: {
        farmerId: farmer.id,
        name: s.name,
        sizeHectares: s.area,
        latitude: SAMPLE_POLYGONS[0].lat + offsetLat,
        longitude: SAMPLE_POLYGONS[0].lng + offsetLng,
        landOwnership: ['Owned', 'Rent', 'Lease'][i % 3],
        waterSource: ['Well', 'Rainfed', 'River'][i % 3],
        soilFertility: ['Good', 'Normal', 'Poor'][i % 3],
        landTopology: ['Plains', 'Valley', 'Plateaus'][i % 3],
        powerSource: ['Solar', 'Electricity', 'Manual'][i % 3],
        irrigationType: ['Drip', 'Rainfed', 'Canal'][i % 3],
        fullTimeWorkers: 2,
        partTimeWorkers: 3,
        seasonalWorkers: 5,
        familyWorkers: 1,
      },
    })

    // Save polygon points
    await db.farmPolygon.createMany({
      data: polygonPoints.map(p => ({ ...p, farmId: farm.id })),
    })

    // Create cultivation on the farm
    const seedQty = 5 + i
    const seedPrice = 5000 + i * 500
    const seedCost = seedQty * seedPrice
    const sowingCharges = 50000 + i * 5000
    const sowingCost = s.area * sowingCharges

    await db.cultivation.create({
      data: {
        farmId: farm.id,
        cropName: s.cropName,
        variety: s.variety,
        season: s.season,
        sowingDate: new Date(),
        estimatedYield: 500 * s.area,
        cropCategory: 'Main Crop',
        cultivationAreaHa: s.area,
        seedSource: 'Seed Company',
        isSeedTreated: i % 2 === 0,
        seedType: 'Certified 1',
        seedQuantity: seedQty,
        seedPrice,
        seedCost,
        sowingType: 'Row sowing',
        sowingChargesBy: 'hectare',
        sowingCharges,
        sowingCost,
        status: 'ACTIVE',
      },
    })

    console.log(`✅ Created: ${s.name} (${s.cropName}) for ${farmer.firstName} ${farmer.lastName} — ${s.area} ha, polygon ${polygonPoints.length} pts`)
    farmCount++
  }

  // Also create a Plot record (for the Plot-Level Trace module) for the first farm
  const firstFarm = await db.farmLand.findFirst({ include: { polygonPoints: { orderBy: { pointOrder: 'asc' } }, farmer: true } })
  if (firstFarm && firstFarm.polygonPoints.length >= 3) {
    const existingPlot = await db.plot.findFirst({ where: { farmLandId: firstFarm.id } })
    if (!existingPlot) {
      const coords = [firstFarm.polygonPoints.map(p => [p.longitude, p.latitude])]
      const geoJson = JSON.stringify({ type: 'Polygon', coordinates: coords })
      const plot = await db.plot.create({
        data: {
          tenantId: firstFarm.farmer.tenantId,
          farmerId: firstFarm.farmerId,
          farmLandId: firstFarm.id,
          plotCode: `PLOT-${firstFarm.name.replace(/\s/g, '-').toUpperCase()}`.substring(0, 30),
          name: firstFarm.name,
          boundaryGeoJson: geoJson,
          areaHectares: firstFarm.sizeHectares,
          plotType: 'CULTIVATION',
          verificationStatus: 'GPS_VERIFIED',
          eudrRiskLevel: 'LOW',
          verificationScore: 0.85,
          landOwnership: firstFarm.landOwnership,
          isActive: true,
          deforestationFree: true,
        },
      })
      console.log(`✅ Created Plot: ${plot.plotCode} for farm ${firstFarm.name}`)
    }
  }

  console.log(`\n✅ Done. Created ${farmCount} new farm lands + cultivations.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
