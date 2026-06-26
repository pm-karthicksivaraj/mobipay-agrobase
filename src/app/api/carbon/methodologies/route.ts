import { getTenantContext } from '@/lib/tenant'
import { CarbonCreditsEngine, METHODOLOGIES } from '@/lib/carbon/credits/engine'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    await getTenantContext() // verify auth
    const { searchParams } = new URL(request.url)

    const standard = searchParams.get('standard') || undefined
    const projectType = searchParams.get('projectType') || undefined

    // Return all methodologies if code filter provided
    const code = searchParams.get('code')
    if (code) {
      const methodology = CarbonCreditsEngine.getMethodology(code)
      if (!methodology) {
        return NextResponse.json({ error: `Methodology ${code} not found` }, { status: 404 })
      }
      return NextResponse.json({ data: methodology })
    }

    const methodologies = CarbonCreditsEngine.getMethodologies({ standard, projectType })
    return NextResponse.json({
      data: methodologies,
      total: methodologies.length,
      standards: [...new Set(METHODOLOGIES.map(m => m.standard))],
      projectTypes: [...new Set(METHODOLOGIES.flatMap(m => m.projectTypes))],
    })
  } catch (error) {
    console.error('Methodologies list error:', error)
    return NextResponse.json({ error: 'Failed to fetch methodologies' }, { status: 500 })
  }
}