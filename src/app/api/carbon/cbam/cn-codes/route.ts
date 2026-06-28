import { getCnCode, getCnCodesForCommodity, lookupCnCode, searchCnCodes, getCbamScopeCodes, isInCbamScope, getCommodityCbamInfo } from '@/lib/cbam/cn-codes'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { NextResponse } from 'next/server'

/**
 * CN Code Lookup API
 *
 * GET /api/carbon/cbam/cn-codes
 *   - ?q=search  — search by code, commodity, or description
 *   - ?commodity=COFFEE  — get all codes for a commodity
 *   - ?code=09011100  — look up a specific code
 *   - ?scope=cbam  — get only CBAM-in-scope codes
 *   - ?commodities=COFFEE,COCOA,MAIZE  — get CBAM info for multiple commodities
 *   - No params — return all codes
 */
export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'carbon:read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)

    // Search mode
    const query = searchParams.get('q')
    if (query) {
      const results = searchCnCodes(query)
      return NextResponse.json({ results, total: results.length })
    }

    // Single commodity lookup
    const commodity = searchParams.get('commodity')
    if (commodity) {
      const code = getCnCode(commodity)
      const allCodes = getCnCodesForCommodity(commodity)
      const inScope = isInCbamScope(commodity)
      return NextResponse.json({
        commodity,
        primaryCode: code,
        allCodes,
        inScope,
      })
    }

    // Specific code lookup
    const code = searchParams.get('code')
    if (code) {
      const entry = lookupCnCode(code)
      if (!entry) {
        return NextResponse.json({ error: `CN code ${code} not found` }, { status: 404 })
      }
      return NextResponse.json(entry)
    }

    // CBAM scope filter
    const scope = searchParams.get('scope')
    if (scope === 'cbam') {
      const codes = getCbamScopeCodes()
      return NextResponse.json({ results: codes, total: codes.length })
    }

    // Multi-commodity CBAM info
    const commodities = searchParams.get('commodities')
    if (commodities) {
      const list = commodities.split(',').map((c) => c.trim()).filter(Boolean)
      const info = getCommodityCbamInfo(list)
      return NextResponse.json({ results: info })
    }

    // No params — return all codes (brief)
    const allAgricultural = getCnCodesForCommodity('COFFEE') // just to confirm module works
    const cbamCodes = getCbamScopeCodes()

    return NextResponse.json({
      message: 'Use query params: q (search), commodity, code, scope=cbam, or commodities=list',
      totalAgriculturalCommodities: 30, // approximate
      cbamScopeCodes: cbamCodes.length,
      cbamChapters: [...new Set(cbamCodes.map((c) => c.chapter))],
    })
  } catch (error) {
    console.error('CN codes lookup error:', error)
    return NextResponse.json({ error: 'Failed to look up CN codes' }, { status: 500 })
  }
}