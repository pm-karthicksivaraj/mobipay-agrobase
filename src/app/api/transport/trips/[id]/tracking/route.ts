import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { TransportEngine } from '@/lib/transport/engine'

/**
 * POST /api/transport/trips/[id]/tracking
 * Record a GPS tracking event for a trip.
 * Phase 2 will also push via WebSocket.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(ctx.role, 'transport:update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const event = await TransportEngine.recordTrackingEvent(ctx.tenantId, {
      tripId: id,
      latitude: body.latitude,
      longitude: body.longitude,
      speedKmh: body.speedKmh,
      heading: body.heading,
      accuracyMeters: body.accuracyMeters,
      eventType: body.eventType,
      address: body.address,
      district: body.district,
      batteryLevel: body.batteryLevel,
      odometerKm: body.odometerKm,
    })
    return NextResponse.json({ data: event })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const status = msg.includes('not found') ? 404 : msg.includes('Cannot record') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

/**
 * GET /api/transport/trips/[id]/tracking
 * Get all tracking events for a trip (ordered chronologically).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(ctx.role, 'transport:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const events = await TransportEngine.getTrackingEvents(id, ctx.tenantId)
    return NextResponse.json({ data: events })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}