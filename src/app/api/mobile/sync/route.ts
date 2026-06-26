import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { mobileSyncEngine } from '@/lib/mobile/sync'

/**
 * GET /api/mobile/sync?token=<base64-token>&entities=farmers,groups
 *
 * Delta sync endpoint for mobile apps.
 * - token: Opaque base64-encoded sync cursor (from previous response's serverToken)
 * - entities: Comma-separated list of entities to sync (default: all)
 *
 * Returns: { serverToken, changes: { farmers: [...], ... }, deletions: { ... } }
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx.tenantId) return NextResponse.json({ error: 'Tenant context required' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token') || undefined
    const entitiesParam = searchParams.get('entities')
    const entities = entitiesParam ? entitiesParam.split(',') : undefined

    const result = await mobileSyncEngine.pullSync(ctx.tenantId, ctx.userId, token, entities)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[MobileSync] Pull error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/mobile/sync
 *
 * Push local changes from mobile device to server.
 * Body: { changes: [{ _entity, _op, _clientTimestamp, data }], deviceInfo: {...} }
 *
 * Returns: { applied, conflicts: [...], serverToken }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx.tenantId) return NextResponse.json({ error: 'Tenant context required' }, { status: 401 })

    const body = await req.json()
    const result = await mobileSyncEngine.pushSync(ctx.tenantId, ctx.userId, body)

    // 200 if all applied, 409 if there are conflicts
    const status = result.conflicts.length > 0 ? 409 : 200
    return NextResponse.json(result, { status })
  } catch (error) {
    console.error('[MobileSync] Push error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}