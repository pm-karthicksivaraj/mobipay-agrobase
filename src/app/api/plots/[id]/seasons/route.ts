import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { PlotEngine } from '@/lib/plots/engine'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    const { id } = await params
    const body = await request.json()

    if (!body.season || !body.cropType) {
      return NextResponse.json({ error: 'season and cropType are required' }, { status: 400 })
    }

    const season = await PlotEngine.addSeason(ctx.tenantId, id, body)
    if (!season) return NextResponse.json({ error: 'Failed to create season (duplicate?)' }, { status: 409 })
    return NextResponse.json(season, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const body = await request.json()

    if (!body.seasonId) {
      return NextResponse.json({ error: 'seasonId is required for updates' }, { status: 400 })
    }

    const season = await PlotEngine.updateSeason(ctx.tenantId, body.seasonId, body)
    if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    return NextResponse.json(season)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}