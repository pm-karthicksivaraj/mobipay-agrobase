import { NextResponse } from 'next/server'
import { FARM5X_VARIANTS, getPracticesForVariant, getVariantForCrop, computeEmissionReduction } from '@/lib/farm5x/definitions'

/**
 * GET /api/farm5x/definitions
 *   Returns all Farm5x variant definitions (10 variants).
 *   Each variant has: 1 Must + 5 Reduces + DREAM data sources + IPCC model.
 *
 * Query params:
 *   variant=1M5C — get specific variant
 *   crop=Coffee — get variant for a crop type
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const variantParam = searchParams.get('variant')
  const cropParam = searchParams.get('crop')

  if (variantParam) {
    const variant = FARM5X_VARIANTS.find(v => v.variant === variantParam)
    if (!variant) return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    return NextResponse.json({ variant, practices: getPracticesForVariant(variant.variant) })
  }

  if (cropParam) {
    const variant = getVariantForCrop(cropParam)
    if (!variant) return NextResponse.json({ error: 'No variant found for crop: ' + cropParam }, { status: 404 })
    return NextResponse.json({ variant, practices: getPracticesForVariant(variant.variant) })
  }

  return NextResponse.json({
    variants: FARM5X_VARIANTS,
    totalCount: FARM5X_VARIANTS.length,
    summary: FARM5X_VARIANTS.map(v => ({
      variant: v.variant,
      cropLabel: v.cropLabel,
      icon: v.icon,
      targetReduction: v.targetReduction,
      sustainabilityStandard: v.sustainabilityStandard,
      mandatoryPractice: v.mandatoryPractice.label,
      reducePractices: v.reducePractices.map(p => p.label),
    })),
  })
}
