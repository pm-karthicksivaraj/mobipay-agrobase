import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { PlotEngine } from '@/lib/plots/engine'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const { searchParams } = new URL(request.url)

    const collection = await PlotEngine.getGeoJsonCollection(ctx.tenantId, {
      verificationStatus: (searchParams.get('verificationStatus') as any) || undefined,
      eudrRiskLevel: (searchParams.get('eudrRiskLevel') as any) || undefined,
      farmerId: searchParams.get('farmerId') || undefined,
    })

    return NextResponse.json(collection)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}