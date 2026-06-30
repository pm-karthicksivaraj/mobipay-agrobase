import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { getFarmerImpactLedger, verifyImpactChain } from '@/lib/impact/hash-chain'
import { db } from '@/lib/db'

/**
 * GET /api/impact/ledger?farmerId=xxx&limit=100
 *   Returns the farmer's impact event ledger (hash-chained).
 *   Used by the Flutter "My Passport" screen.
 *
 * GET /api/impact/ledger?farmerId=xxx&verify=true
 *   Verifies the integrity of the hash chain and returns the audit result.
 */
export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const farmerId = searchParams.get('farmerId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const shouldVerify = searchParams.get('verify') === 'true'

    if (!farmerId) {
      return NextResponse.json({ error: 'farmerId is required' }, { status: 400 })
    }

    // Verify tenant access
    const farmer = await db.farmerProfile.findFirst({
      where: { id: farmerId, ...buildTenantFilter(ctx, 'tenantId') },
      select: { id: true, firstName: true, lastName: true, farmerCode: true },
    })
    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
    }

    const ledger = await getFarmerImpactLedger(farmerId, limit)

    if (shouldVerify) {
      const verification = await verifyImpactChain(farmerId)
      return NextResponse.json({
        farmer,
        ledger,
        verification,
      })
    }

    return NextResponse.json({
      farmer,
      eventCount: ledger.length,
      ledger,
    })
  } catch (error) {
    console.error('Impact ledger fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch ledger' }, { status: 500 })
  }
}
