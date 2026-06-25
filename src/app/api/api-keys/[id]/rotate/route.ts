import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { apiKeyEngine } from '@/lib/api-keys/engine'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const result = await apiKeyEngine.rotateKey(id, ctx.tenantId)
    return NextResponse.json({ data: result, message: 'Save this new key — the old key is now invalid' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}