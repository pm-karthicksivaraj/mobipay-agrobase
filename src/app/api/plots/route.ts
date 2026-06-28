import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { PlotEngine } from '@/lib/plots/engine'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const { searchParams } = new URL(request.url)

    const result = await PlotEngine.list(ctx.tenantId, {
      farmerId: searchParams.get('farmerId') || undefined,
      verificationStatus: (searchParams.get('verificationStatus') as any) || undefined,
      eudrRiskLevel: (searchParams.get('eudrRiskLevel') as any) || undefined,
      plotType: searchParams.get('plotType') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: 'Plot name is required' }, { status: 400 })
    }

    const plot = await PlotEngine.create(ctx.tenantId, ctx.userId, body)
    return NextResponse.json(plot, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}