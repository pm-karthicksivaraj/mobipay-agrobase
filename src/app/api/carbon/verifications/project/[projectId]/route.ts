import { getTenantContext } from '@/lib/tenant'
import { CarbonCreditsEngine } from '@/lib/carbon/credits/engine'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const ctx = await getTenantContext()
    const { projectId } = await params

    const verifications = await CarbonCreditsEngine.listVerifications(projectId, ctx.tenantId)
    return NextResponse.json({ data: verifications })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch verifications'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    console.error('Verifications list error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}