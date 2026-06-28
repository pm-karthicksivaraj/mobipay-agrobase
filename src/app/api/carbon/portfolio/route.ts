import { getTenantContext } from '@/lib/tenant'
import { CarbonCreditsEngine } from '@/lib/carbon/credits/engine'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const ctx = await getTenantContext()
    const summary = await CarbonCreditsEngine.getPortfolioSummary(ctx.tenantId)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Carbon portfolio summary error:', error)
    return NextResponse.json({ error: 'Failed to fetch portfolio summary' }, { status: 500 })
  }
}