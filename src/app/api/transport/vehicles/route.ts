import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { TransportEngine } from '@/lib/transport/engine'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(ctx.role, 'transport:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const result = await TransportEngine.listVehicles(ctx.tenantId, {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      vehicleType: searchParams.get('vehicleType') || undefined,
      transporterId: searchParams.get('transporterId') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(ctx.role, 'transport:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const vehicle = await TransportEngine.createVehicle(ctx.tenantId, body)
    return NextResponse.json({ data: vehicle }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const status = msg.includes('not found') ? 404 : msg.includes('already') ? 409 : msg.includes('suspended') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}