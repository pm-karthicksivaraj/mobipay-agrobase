import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { autoAdvanceDreamPipeline } from '@/lib/farm5x/dream-engine'
import { getVariantForCrop } from '@/lib/farm5x/definitions'

/**
 * GET /api/crop-stages?cultivationId=xxx
 *   List all stage events for a cultivation (the crop timeline)
 *
 * POST /api/crop-stages
 *   Create a new stage event. Auto-sets:
 *   - DREAM phase D (data collected) = true
 *   - cropVertical from the cultivation's crop type
 *   - farm5xVariant + farm5xPractice if the event matches a Farm5x practice
 *   - carbonKgCO2e from IPCC emission factors (simplified inline calc)
 */
export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const cultivationId = searchParams.get('cultivationId')
    const cropVertical = searchParams.get('cropVertical')

    if (!cultivationId) {
      return NextResponse.json({ error: 'cultivationId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = {
      cultivationId,
      ...buildTenantFilter(ctx, 'tenantId'),
    }
    if (cropVertical) where.cropVertical = cropVertical

    const events = await db.cropStageEvent.findMany({
      where,
      orderBy: { stageNumber: 'asc' },
      include: {
        cultivation: {
          select: {
            id: true, cropName: true,
            farm: { select: { name: true, farmer: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    })

    return NextResponse.json({
      events: events.map(e => ({
        ...e,
        eventData: e.eventData ? JSON.parse(e.eventData) : {},
        photoUrls: e.photoUrls ? JSON.parse(e.photoUrls) : [],
      })),
    })
  } catch (error) {
    console.error('Crop stages list error:', error)
    return NextResponse.json({ error: 'Failed to fetch stage events' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const {
      cultivationId, stageNumber, stageName, eventType,
      eventData, photoUrls, latitude, longitude, eventDate,
    } = body as Record<string, any>

    if (!cultivationId || !stageName || !eventType) {
      return NextResponse.json({ error: 'cultivationId, stageName, and eventType are required' }, { status: 400 })
    }

    // Fetch the cultivation to get crop type
    const cultivation = await db.cultivation.findFirst({
      where: { id: cultivationId, farm: { farmer: { ...buildTenantFilter(ctx, 'tenantId') } } },
      select: { id: true, cropName: true, cultivationAreaHa: true },
    })
    if (!cultivation) {
      return NextResponse.json({ error: 'Cultivation not found or access denied' }, { status: 404 })
    }

    // Determine crop vertical from crop name
    const variant = getVariantForCrop(cultivation.cropName)
    const cropVertical = variant?.variant?.replace('1M5', '') + 'CORE' || 'CROPCORE'
    // Map: 1M5R→RICECORE, 1M5C→COFFEECORE, 1M5M→CROPCORE, etc.
    const verticalMap: Record<string, string> = {
      '1M5R': 'RICECORE', '1M5C': 'COFFEECORE', '1M5M': 'CROPCORE',
      '1M5K': 'COCOACORE', '1M5T': 'TEACORE', '1M5D': 'LIVECORE',
      '1M5V': 'VEGCORE', '1M5O': 'ORCHARDCORE', '1M5A': 'AQUACORE', '1M5F': 'FORESTCORE',
    }
    const cropVerticalCode = variant ? (verticalMap[variant.variant] || 'CROPCORE') : 'CROPCORE'

    // Check if this event is a Farm5x practice adoption
    let farm5xPractice: string | null = null
    let farm5xVariant: string | null = null
    if (variant && body.farm5xPractice) {
      farm5xPractice = body.farm5xPractice
      farm5xVariant = variant.variant
    }

    // Simplified carbon calc (inline — the full engine is in carbon/calculator.ts)
    const ed = eventData || {}
    let carbonKgCO2e = 0
    // N2O from fertilizer: N_input × EF1 × 44/28
    if (ed.fertilizerKgN) carbonKgCO2e += (ed.fertilizerKgN * 0.01 * 44 / 28) * 1000
    // CO2 from fuel: liters × 2.68
    if (ed.fuelLiters) carbonKgCO2e += ed.fuelLiters * 2.68
    // CO2 from pesticide: kg × 5.1
    if (ed.pesticideKg) carbonKgCO2e += ed.pesticideKg * 5.1
    // CO2 from machinery: hours × 2.8
    if (ed.machineryHours) carbonKgCO2e += ed.machineryHours * 2.8

    // Sum input costs
    let inputCostTotal = 0
    let laborCost = ed.laborCost || 0
    let materialCost = 0
    if (ed.seedCost) materialCost += ed.seedCost
    if (ed.fertilizerCost) materialCost += ed.fertilizerCost
    if (ed.pesticideCost) materialCost += ed.pesticideCost
    if (ed.fuelCost) materialCost += ed.fuelCost
    inputCostTotal = laborCost + materialCost

    // Create the stage event
    const event = await db.cropStageEvent.create({
      data: {
        tenantId: ctx.tenantId,
        cultivationId,
        cropVertical: cropVerticalCode,
        stageNumber: stageNumber || 1,
        stageName,
        eventType,
        eventData: JSON.stringify(ed),
        photoUrls: photoUrls ? JSON.stringify(photoUrls) : null,
        latitude: latitude || null,
        longitude: longitude || null,
        eventDate: eventDate ? new Date(eventDate) : new Date(),
        inputCostTotal,
        laborCost,
        materialCost,
        carbonKgCO2e: Math.round(carbonKgCO2e * 100) / 100,
        dreamData: true,  // D phase auto-set
        farm5xPractice,
        farm5xVariant,
        createdBy: ctx.userId,
        createdByName: ctx.userId,
      },
    })

    // If this is a Farm5x practice, also create a PracticeAdoption record
    if (farm5xPractice && farm5xVariant) {
      const farmerId = await db.cultivation.findUnique({
        where: { id: cultivationId },
        select: { farm: { select: { farmerId: true } } },
      })
      if (farmerId?.farm?.farmerId) {
        const existingPractice = await db.practiceAdoption.findFirst({
          where: { farmerId: farmerId.farm.farmerId, practiceCode: farm5xPractice },
        })
        if (!existingPractice) {
          await db.practiceAdoption.create({
            data: {
              tenantId: ctx.tenantId,
              farmerId: farmerId.farm.farmerId,
              practiceCode: farm5xPractice,
              cropType: variant?.cropType || 'COFFEE',
              frameworkVariant: farm5xVariant,
              isMandatory: farm5xPractice.includes('_MUST'),
              verificationStatus: 'PENDING',
              notes: `Auto-logged from crop stage event: ${stageName}`,
            },
          }).catch(() => { /* non-critical */ })
        }
      }
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error('Crop stage create error:', error)
    return NextResponse.json(
      { error: 'Failed to create stage event', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
