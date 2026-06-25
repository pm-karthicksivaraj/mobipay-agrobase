import { NextRequest, NextResponse } from 'next/server'
import { integrationRegistry } from '@/lib/integrations/registry'
import { getTenantContext } from '@/lib/tenant'

export async function GET() {
  try {
    const adapters = integrationRegistry.listAdapters()
    return NextResponse.json({ data: adapters })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const { provider, credentials, settings } = body

    if (!provider || !credentials) {
      return NextResponse.json({ error: 'provider and credentials required' }, { status: 400 })
    }

    const config = { tenantId: ctx.tenantId, provider, credentials, settings: settings || {} }
    const result = await integrationRegistry.testConnection(config)
    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}