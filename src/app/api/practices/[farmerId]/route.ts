import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

/**
 * GET /api/practices/[farmerId]
 *   List all practice adoptions for a specific farmer, grouped by Farm5x variant.
 *   Used by the Flutter "Practice Logger" screen to show what the farmer has adopted.
 *
 * Query params:
 *   cropType (optional filter)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ farmerId: string }> },
) {
  try {
    const ctx = await getTenantContext()
    const { farmerId } = await params
    const { searchParams } = new URL(request.url)
    const cropType = searchParams.get('cropType')

    // Verify tenant access
    const farmer = await db.farmerProfile.findFirst({
      where: { id: farmerId, ...buildTenantFilter(ctx, 'tenantId') },
      select: { id: true, firstName: true, lastName: true, farmerCode: true, phone: true },
    })
    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
    }

    const where: Record<string, unknown> = { farmerId }
    if (cropType) where.cropType = cropType

    const practices = await db.practiceAdoption.findMany({
      where,
      orderBy: { adoptedAt: 'desc' },
    })

    // Group by framework variant (1M5C, 1M5M, 1M5K, 1M5T, 1M5D)
    const byVariant: Record<string, typeof practices> = {}
    for (const p of practices) {
      if (!byVariant[p.frameworkVariant]) byVariant[p.frameworkVariant] = []
      byVariant[p.frameworkVariant].push(p)
    }

    // Summary stats
    const summary = {
      total: practices.length,
      verified: practices.filter(p => p.verificationStatus === 'VERIFIED').length,
      pending: practices.filter(p => p.verificationStatus === 'PENDING').length,
      rejected: practices.filter(p => p.verificationStatus === 'REJECTED').length,
      mandatory: practices.filter(p => p.isMandatory).length,
      byCrop: practices.reduce((acc, p) => {
        acc[p.cropType] = (acc[p.cropType] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    }

    return NextResponse.json({
      farmer,
      practices,
      byVariant,
      summary,
    })
  } catch (error) {
    console.error('Practice list by farmer error:', error)
    return NextResponse.json({ error: 'Failed to fetch practices' }, { status: 500 })
  }
}
