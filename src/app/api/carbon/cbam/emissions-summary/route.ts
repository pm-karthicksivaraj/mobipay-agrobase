import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { CbamEngine } from '@/lib/cbam'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')

    if (!yearParam) {
      return NextResponse.json(
        { error: 'year query parameter is required (e.g. 2026)' },
        { status: 400 },
      )
    }

    const year = parseInt(yearParam, 10)
    if (isNaN(year)) {
      return NextResponse.json(
        { error: 'year must be a valid number' },
        { status: 400 },
      )
    }

    const summary = await CbamEngine.getEmissionsSummary(ctx.tenantId, year)

    return NextResponse.json(summary)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch emissions summary'
    console.error('CBAM emissions summary error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
