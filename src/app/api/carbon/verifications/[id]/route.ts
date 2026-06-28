import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { CarbonCreditsEngine } from '@/lib/carbon/credits/engine'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    const { id } = await params

    const verification = await CarbonCreditsEngine.getVerification(id, ctx.tenantId)
    return NextResponse.json(verification)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch verification'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    console.error('Verification get error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    if (!body.status || !['IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CORRECTIVE_ACTION'].includes(body.status)) {
      return NextResponse.json(
        { error: 'status must be IN_PROGRESS, COMPLETED, REJECTED, or CORRECTIVE_ACTION' },
        { status: 400 },
      )
    }

    const verification = await CarbonCreditsEngine.updateVerificationStatus(id, ctx.tenantId, body.status)
    return NextResponse.json(verification)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update verification status'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('Cannot transition')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('Verification status update error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    if (!body.conclusion || !['POSITIVE', 'POSITIVE_WITH_CONDITIONS', 'NEGATIVE'].includes(body.conclusion)) {
      return NextResponse.json(
        { error: 'conclusion must be POSITIVE, POSITIVE_WITH_CONDITIONS, or NEGATIVE' },
        { status: 400 },
      )
    }

    if (!body.recommendation || !['ISSUE', 'HOLD', 'REJECT'].includes(body.recommendation)) {
      return NextResponse.json(
        { error: 'recommendation must be ISSUE, HOLD, or REJECT' },
        { status: 400 },
      )
    }

    const verification = await CarbonCreditsEngine.completeVerification(id, ctx.tenantId, body)
    return NextResponse.json(verification)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to complete verification'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    console.error('Verification complete error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}