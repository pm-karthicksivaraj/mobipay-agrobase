import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { appendImpactEvent } from '@/lib/impact/hash-chain'

/**
 * POST /api/practices/adopt
 *   Log a Farm5x practice adoption event.
 *
 * Body:
 *   farmerId (required)
 *   practiceCode (required) — e.g. "1M5C_MUST", "1M5C_R1"
 *   cropType (required) — COFFEE | MAIZE | COCOA | TEA | DAIRY
 *   frameworkVariant (required) — 1M5C | 1M5M | 1M5K | 1M5T | 1M5D
 *   isMandatory (default false)
 *   plotId (optional)
 *   evidenceUrl (optional — photo or satellite image)
 *   notes (optional)
 *
 * Side effects:
 *   - Appends a PRACTICE_ADOPTED event to the impact ledger
 *   - Triggers climate resilience score recomputation (next cron cycle)
 */

const VALID_VARIANTS = ['1M5C', '1M5M', '1M5K', '1M5T', '1M5D']
const VALID_CROPS = ['COFFEE', 'MAIZE', 'COCOA', 'TEA', 'DAIRY']

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const {
      farmerId, practiceCode, cropType, frameworkVariant, isMandatory,
      plotId, evidenceUrl, notes,
    } = body as Record<string, unknown>

    if (!farmerId || !practiceCode || !cropType || !frameworkVariant) {
      return NextResponse.json(
        { error: 'farmerId, practiceCode, cropType, and frameworkVariant are required' },
        { status: 400 },
      )
    }

    if (!VALID_VARIANTS.includes(frameworkVariant as string)) {
      return NextResponse.json(
        { error: `Invalid frameworkVariant. Must be one of: ${VALID_VARIANTS.join(', ')}` },
        { status: 400 },
      )
    }
    if (!VALID_CROPS.includes(cropType as string)) {
      return NextResponse.json(
        { error: `Invalid cropType. Must be one of: ${VALID_CROPS.join(', ')}` },
        { status: 400 },
      )
    }

    // Verify tenant access
    const farmer = await db.farmerProfile.findFirst({
      where: { id: farmerId as string, ...buildTenantFilter(ctx, 'tenantId') },
      select: { id: true, firstName: true, lastName: true },
    })
    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
    }

    // Create the practice adoption record
    const practice = await db.practiceAdoption.create({
      data: {
        tenantId: ctx.tenantId,
        farmerId: farmerId as string,
        practiceCode: practiceCode as string,
        cropType: cropType as string,
        frameworkVariant: frameworkVariant as string,
        isMandatory: Boolean(isMandatory),
        plotId: plotId as string | null,
        adoptedBy: ctx.userId,
        evidenceUrl: evidenceUrl as string | null,
        notes: notes as string | null,
      },
    })

    // Append to the impact ledger
    await appendImpactEvent({
      tenantId: ctx.tenantId,
      farmerId: farmerId as string,
      eventType: 'PRACTICE_ADOPTED',
      eventData: {
        practiceCode,
        cropType,
        frameworkVariant,
        isMandatory: Boolean(isMandatory),
        practiceAdoptionId: practice.id,
      },
      relatedId: practice.id,
      relatedType: 'PRACTICE',
      actorId: ctx.userId,
      actorName: ctx.userId,
      actorType: ctx.userId === farmerId ? 'FARMER' : 'EXTENSION_OFFICER',
    })

    return NextResponse.json({ practice }, { status: 201 })
  } catch (error) {
    console.error('Practice adoption error:', error)
    return NextResponse.json(
      { error: 'Failed to log practice', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

/**
 * GET /api/practices?farmerId=xxx
 *   List all practice adoptions for a farmer.
 */
export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const farmerId = searchParams.get('farmerId')
    const cropType = searchParams.get('cropType')
    const verificationStatus = searchParams.get('verificationStatus')

    if (!farmerId) {
      // Tenant-wide list (for cooperative intelligence layer)
      const where: Record<string, unknown> = { ...buildTenantFilter(ctx, 'tenantId') }
      if (cropType) where.cropType = cropType
      if (verificationStatus) where.verificationStatus = verificationStatus
      const practices = await db.practiceAdoption.findMany({
        where,
        orderBy: { adoptedAt: 'desc' },
        take: 200,
        include: {
          farmer: { select: { firstName: true, lastName: true, farmerCode: true } },
        },
      })
      return NextResponse.json({ practices })
    }

    // Per-farmer list
    const farmer = await db.farmerProfile.findFirst({
      where: { id: farmerId, ...buildTenantFilter(ctx, 'tenantId') },
      select: { id: true },
    })
    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
    }

    const where: Record<string, unknown> = { farmerId }
    if (cropType) where.cropType = cropType
    if (verificationStatus) where.verificationStatus = verificationStatus

    const practices = await db.practiceAdoption.findMany({
      where,
      orderBy: { adoptedAt: 'desc' },
    })

    // Summary by variant
    const byVariant: Record<string, number> = {}
    for (const p of practices) {
      byVariant[p.frameworkVariant] = (byVariant[p.frameworkVariant] || 0) + 1
    }

    return NextResponse.json({
      practices,
      summary: {
        total: practices.length,
        verified: practices.filter(p => p.verificationStatus === 'VERIFIED').length,
        pending: practices.filter(p => p.verificationStatus === 'PENDING').length,
        byVariant,
      },
    })
  } catch (error) {
    console.error('Practice list error:', error)
    return NextResponse.json({ error: 'Failed to fetch practices' }, { status: 500 })
  }
}
