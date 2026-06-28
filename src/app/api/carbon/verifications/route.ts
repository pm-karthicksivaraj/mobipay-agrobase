import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { CarbonCreditsEngine } from '@/lib/carbon/credits/engine'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { projectId, type, vvbName } = body

    if (!projectId || !type || !vvbName) {
      return NextResponse.json(
        { error: 'projectId, type, and vvbName are required' },
        { status: 400 },
      )
    }

    if (!['VALIDATION', 'VERIFICATION', 'POST_VALIDATION'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be VALIDATION, VERIFICATION, or POST_VALIDATION' },
        { status: 400 },
      )
    }

    const verification = await CarbonCreditsEngine.scheduleVerification(ctx.tenantId, {
      projectId,
      type,
      vvbName,
      vvbAccreditation: body.vvbAccreditation,
      startDate: body.startDate,
      performedById: ctx.userId,
    })

    return NextResponse.json(verification, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to schedule verification'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('must be')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('Verification schedule error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}