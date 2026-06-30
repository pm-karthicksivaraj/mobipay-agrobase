import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const { searchParams } = new URL(request.url)

    // Use tenant scope (includes all child tenants for super admins)
    const tenantFilter = buildTenantFilter(ctx, 'tenantId')
    const where: Record<string, unknown> = {
      ...tenantFilter,
      boundaryGeoJson: { not: null },
    }

    const verificationStatus = searchParams.get('verificationStatus')
    if (verificationStatus) where.verificationStatus = verificationStatus

    const eudrRiskLevel = searchParams.get('eudrRiskLevel')
    if (eudrRiskLevel) where.eudrRiskLevel = eudrRiskLevel

    const farmerId = searchParams.get('farmerId')
    if (farmerId) where.farmerId = farmerId

    const plots = await db.plot.findMany({
      where,
      select: {
        id: true, plotCode: true, name: true, boundaryGeoJson: true,
        verificationStatus: true, eudrRiskLevel: true, areaHectares: true,
        farmer: { select: { firstName: true, lastName: true } },
      },
    })

    const features = plots.map(p => {
      let geometry: any = null
      try {
        const geo = JSON.parse(p.boundaryGeoJson!)
        geometry = geo.geometry || geo
      } catch {
        geometry = null
      }
      return {
        type: 'Feature',
        geometry,
        properties: {
          id: p.id,
          plotCode: p.plotCode,
          name: p.name,
          verificationStatus: p.verificationStatus,
          eudrRiskLevel: p.eudrRiskLevel,
          areaHectares: p.areaHectares,
          farmerName: p.farmer ? `${p.farmer.firstName} ${p.farmer.lastName}` : 'Unassigned',
        },
      }
    }).filter(f => f.geometry !== null)

    return NextResponse.json({ type: 'FeatureCollection', features })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
