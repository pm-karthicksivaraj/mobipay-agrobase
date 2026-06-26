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

    const { searchParams } = new URL(request.url)
    const partnerType = searchParams.get('partnerType') || undefined
    const isActive = searchParams.get('isActive')

    const partners = await MfiEngine.listPartners(ctx.tenantId, {
      partnerType,
      isActive: isActive !== null ? isActive === 'true' : undefined,
    })

    return NextResponse.json({ data: partners })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(ctx.role, 'mfi:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const partner = await MfiEngine.createPartner(ctx.tenantId, body)
    return NextResponse.json({ data: partner }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}