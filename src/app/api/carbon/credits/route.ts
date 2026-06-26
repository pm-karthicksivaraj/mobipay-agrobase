import { getTenantContext } from '@/lib/tenant'
import { CarbonCreditsEngine } from '@/lib/carbon/credits/engine'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)

    const result = await CarbonCreditsEngine.listCredits(ctx.tenantId, {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      projectId: searchParams.get('projectId') || undefined,
      status: searchParams.get('status') || undefined,
      vintageYear: searchParams.get('vintageYear') ? parseInt(searchParams.get('vintageYear')!) : undefined,
    })

    return NextResponse.json({
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: Math.ceil(result.total / result.pageSize),
    })
  } catch (error) {
    console.error('Carbon credits list error:', error)
    return NextResponse.json({ error: 'Failed to fetch carbon credits' }, { status: 500 })
  }
}