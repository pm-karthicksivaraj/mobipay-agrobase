import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

/**
 * GET /api/credit-scores
 *   List credit scores for the tenant scope.
 *   Returns { data: CreditScore[] } with farmer included.
 */
export async function GET() {
  try {
    const ctx = await getTenantContext()
    const tf = buildTenantFilter(ctx, 'tenantId')

    const scores = await db.creditScore.findMany({
      where: { farmer: { ...tf } },
      include: {
        farmer: {
          select: {
            id: true, firstName: true, lastName: true, phone: true,
            farmerCode: true, mainCrops: true,
          },
        },
      },
      orderBy: { scoreDate: 'desc' },
      take: 200,
    })

    return NextResponse.json({ data: scores })
  } catch (error) {
    console.error('Credit score list error:', error)
    return NextResponse.json({ error: 'Failed to fetch credit scores' }, { status: 500 })
  }
}
