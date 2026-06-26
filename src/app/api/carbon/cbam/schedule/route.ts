import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { CbamEngine } from '@/lib/cbam'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const schedules = CbamEngine.getSchedules()

    return NextResponse.json(schedules)
  } catch (error) {
    console.error('CBAM schedules list error:', error)
    return NextResponse.json({ error: 'Failed to fetch CBAM schedules' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { frequency } = body

    if (!frequency || !['QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY'].includes(frequency)) {
      return NextResponse.json(
        { error: 'frequency is required and must be QUARTERLY, SEMI_ANNUALLY, or ANNUALLY' },
        { status: 400 },
      )
    }

    CbamEngine.scheduleAutoGeneration(ctx.tenantId, frequency as 'QUARTERLY' | 'SEMI_ANNUALLY' | 'ANNUALLY')

    return NextResponse.json({ success: true, tenantId: ctx.tenantId, frequency }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to schedule CBAM auto-generation'
    console.error('CBAM schedule create error:', error)
    if (message.includes('already exists')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
