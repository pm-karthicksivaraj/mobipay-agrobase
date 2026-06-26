import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { CarbonCreditsEngine } from '@/lib/carbon/credits/engine'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    const { id } = await params

    // Verify project belongs to tenant
    const project = await db.carbonProject.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })
    if (!project) {
      return NextResponse.json({ error: 'Carbon project not found' }, { status: 404 })
    }

    const parameters = await db.carbonProjectMethodology.findMany({
      where: { projectId: id },
      orderBy: { parameterName: 'asc' },
    })

    return NextResponse.json({ data: parameters })
  } catch (error) {
    console.error('Methodology parameters list error:', error)
    return NextResponse.json({ error: 'Failed to fetch methodology parameters' }, { status: 500 })
  }
}

export async function PUT(
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

    if (!body.parameters || !Array.isArray(body.parameters) || body.parameters.length === 0) {
      return NextResponse.json({ error: 'parameters array is required' }, { status: 400 })
    }

    const results = await CarbonCreditsEngine.updateProjectParameters(id, ctx.tenantId, body.parameters)
    return NextResponse.json({ data: results })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update methodology parameters'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    console.error('Methodology parameters update error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}