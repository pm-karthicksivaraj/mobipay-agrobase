import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { TransportEngine } from '@/lib/transport/engine'

/**
 * POST /api/transport/match
 * Match a transporter+vehicle to a transport request.
 * Creates the TransportTrip and advances request lifecycle.
 */
export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(ctx.role, 'transport:update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { requestId, transporterId, vehicleId, agreedCost } = body

    if (!requestId || !transporterId || !vehicleId || !agreedCost) {
      return NextResponse.json(
        { error: 'requestId, transporterId, vehicleId, and agreedCost are required' },
        { status: 400 },
      )
    }

    const trip = await TransportEngine.matchTransporter(ctx.tenantId, {
      requestId,
      transporterId,
      vehicleId,
      agreedCost,
    })

    return NextResponse.json({ data: trip }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const status = msg.includes('not found') ? 404 : msg.includes('Cannot match') ? 400 : msg.includes('currently on a trip') ? 409 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}