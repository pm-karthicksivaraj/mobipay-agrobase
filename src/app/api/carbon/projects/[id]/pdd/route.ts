import { getTenantContext } from '@/lib/tenant'
import { CarbonCreditsEngine } from '@/lib/carbon/credits/engine'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    const { id } = await params

    const sections = await CarbonCreditsEngine.generatePDD(id, ctx.tenantId)
    return NextResponse.json({ sections })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate PDD'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    console.error('PDD generation error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}