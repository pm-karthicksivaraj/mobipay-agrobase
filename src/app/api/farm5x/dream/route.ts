import { NextResponse } from 'next/server'
import { getDreamPipelineStatus } from '@/lib/farm5x/dream-engine'
import { getTenantContext } from '@/lib/tenant'
import { db } from '@/lib/db'

/**
 * GET /api/farm5x/dream?cultivationId=xxx
 *   Returns the DREAM MRV pipeline status for a cultivation.
 *   Shows all 5 phases (D-R-E-A-M) with verification status + progress %.
 */
export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const cultivationId = searchParams.get('cultivationId')

    if (!cultivationId) {
      return NextResponse.json({ error: 'cultivationId is required' }, { status: 400 })
    }

    const status = await getDreamPipelineStatus(cultivationId)
    if (!status) {
      return NextResponse.json({ error: 'Cultivation not found' }, { status: 404 })
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('DREAM pipeline error:', error)
    return NextResponse.json({ error: 'Failed to fetch DREAM status' }, { status: 500 })
  }
}
