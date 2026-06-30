import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

/**
 * GET /api/cultivations?farmId=xxx
 *   List cultivations for a farm land
 *
 * POST /api/cultivations
 *   Create a new cultivation with auto-calculated seed cost + sowing cost.
 *   Auto-calc formulas (from Excel):
 *     seedCost = seedQuantity × seedPrice
 *     sowingCost = cultivationAreaHa × sowingCharges (when chargesBy = hectare)
 *     sowingCost = hours × sowingCharges (when chargesBy = hour)
 */
export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')
    const farmerId = searchParams.get('farmerId')

    const where: Record<string, unknown> = {
      farm: { farmer: { ...buildTenantFilter(ctx, 'tenantId') } },
    }
    if (farmId) where.farmId = farmId
    if (farmerId) where.farm = { farmerId }

    const cultivations = await db.cultivation.findMany({
      where,
      include: {
        farm: {
          select: {
            id: true, name: true, sizeHectares: true,
            farmer: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ cultivations })
  } catch (error) {
    console.error('Cultivation list error:', error)
    return NextResponse.json({ error: 'Failed to fetch cultivations' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const {
      farmId, cropName, variety, season, sowingDate, estimatedYield,
      cropCategory, cultivationAreaHa, cropCalendarId, cultivationGeoJson, photoUrl,
      seedSource, isSeedTreated, seedType, seedQuantity, seedPrice,
      sowingType, sowingChargesBy, sowingCharges, sowingHours,
    } = body as Record<string, any>

    if (!farmId || !cropName) {
      return NextResponse.json({ error: 'farmId and cropName are required' }, { status: 400 })
    }

    // Verify farm belongs to tenant
    const farm = await db.farmLand.findFirst({
      where: { id: farmId, farmer: { ...buildTenantFilter(ctx, 'tenantId') } },
      select: { id: true, sizeHectares: true },
    })
    if (!farm) {
      return NextResponse.json({ error: 'Farm land not found or access denied' }, { status: 404 })
    }

    // Auto-calculate seed cost = quantity × price
    const qty = seedQuantity ? parseFloat(seedQuantity) : 0
    const price = seedPrice ? parseFloat(seedPrice) : 0
    const seedCost = qty * price

    // Auto-calculate sowing cost
    let calcSowingCost: number | null = null
    if (sowingCharges && sowingChargesBy) {
      const charges = parseFloat(sowingCharges)
      if (sowingChargesBy === 'hectare' && cultivationAreaHa) {
        calcSowingCost = parseFloat(cultivationAreaHa) * charges
      } else if (sowingChargesBy === 'hour' && sowingHours) {
        calcSowingCost = parseFloat(sowingHours) * charges
      }
    }

    const cultivation = await db.cultivation.create({
      data: {
        farmId,
        cropName,
        variety: variety || null,
        season: season || null,
        sowingDate: sowingDate ? new Date(sowingDate) : null,
        estimatedYield: estimatedYield ? parseFloat(estimatedYield) : null,
        cropCategory: cropCategory || 'Main Crop',
        cultivationAreaHa: cultivationAreaHa ? parseFloat(cultivationAreaHa) : null,
        cropCalendarId: cropCalendarId || null,
        cultivationGeoJson: cultivationGeoJson || null,
        photoUrl: photoUrl || null,
        seedSource: seedSource || null,
        isSeedTreated: isSeedTreated || false,
        seedType: seedType || null,
        seedQuantity: qty || null,
        seedPrice: price || null,
        seedCost: seedCost || null,
        sowingType: sowingType || null,
        sowingChargesBy: sowingChargesBy || null,
        sowingCharges: sowingCharges ? parseFloat(sowingCharges) : null,
        sowingCost: calcSowingCost,
      },
    })

    return NextResponse.json({ cultivation }, { status: 201 })
  } catch (error) {
    console.error('Cultivation create error:', error)
    return NextResponse.json(
      { error: 'Failed to create cultivation', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
