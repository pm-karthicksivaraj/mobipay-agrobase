import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { NotificationEngine } from '@/lib/notifications'

/**
 * PATCH /api/notifications/templates/[id] — Update template
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'notifications:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, subject, body: templateBody, channel, variables, isActive } = body as {
      name?: string
      subject?: string
      body?: string
      channel?: string
      variables?: string
      isActive?: boolean
    }

    const template = await NotificationEngine.updateTemplate(id, {
      name,
      subject,
      body: templateBody,
      channel,
      variables,
      isActive,
    })

    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('[/api/notifications/templates/[id]] PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/notifications/templates/[id] — Delete template
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'notifications:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    await NotificationEngine.deleteTemplate(id)
    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('[/api/notifications/templates/[id]] DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}