import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { MfiEngine } from '@/lib/mfi/engine'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(ctx.role, 'mfi:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const summary = await MfiEngine.getPortfolioSummary(ctx.tenantId)
    return NextResponse.json({ data: summary })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}