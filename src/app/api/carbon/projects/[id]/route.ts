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

    const project = await CarbonCreditsEngine.getProject(id, ctx.tenantId)
    return NextResponse.json(project)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch carbon project'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    console.error('Carbon project get error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
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

    const project = await CarbonCreditsEngine.updateProject(id, ctx.tenantId, body)
    return NextResponse.json(project)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update carbon project'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    console.error('Carbon project update error:', error)
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

    if (!body.status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const project = await CarbonCreditsEngine.updateProjectStatus(id, ctx.tenantId, body.status)
    return NextResponse.json(project)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update project status'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('Cannot transition')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('Carbon project status update error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params

    await CarbonCreditsEngine.deleteProject(id, ctx.tenantId)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete carbon project'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    console.error('Carbon project delete error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}