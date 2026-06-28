import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { CarbonCreditsEngine } from '@/lib/carbon/credits/engine'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)

    const result = await CarbonCreditsEngine.listProjects(ctx.tenantId, {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      status: searchParams.get('status') || undefined,
      standard: searchParams.get('standard') || undefined,
    })

    return NextResponse.json({
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: Math.ceil(result.total / result.pageSize),
    })
  } catch (error) {
    console.error('Carbon projects list error:', error)
    return NextResponse.json({ error: 'Failed to fetch carbon projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, standard, methodologyCode, projectType } = body

    if (!name || !standard || !methodologyCode || !projectType) {
      return NextResponse.json(
        { error: 'name, standard, methodologyCode, and projectType are required' },
        { status: 400 },
      )
    }

    const project = await CarbonCreditsEngine.createProject(ctx.tenantId, {
      ...body,
      createdById: ctx.userId,
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create carbon project'
    console.error('Carbon project create error:', error)
    if (message.includes('not found') || message.includes('not supported') || message.includes('Minimum')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}