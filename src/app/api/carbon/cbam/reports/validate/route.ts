import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { CbamEngine } from '@/lib/cbam'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { period } = body

    if (!period) {
      return NextResponse.json(
        { error: 'period is required (e.g. "2026-Q1")' },
        { status: 400 },
      )
    }

    const validationResult = await CbamEngine.validateReport(ctx.tenantId, period)

    return NextResponse.json(validationResult)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to validate CBAM report'
    if (message.includes('not found') || message.includes('Invalid period')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('CBAM report validation error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
