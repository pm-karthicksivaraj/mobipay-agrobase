import { NextResponse } from 'next/server'
import { COFFEECORE_STAGES, getTotalFieldCount } from '@/lib/crop-stages/coffeecore-stages'

/**
 * GET /api/crop-stages/definitions
 *   Returns CoffeeCore stage definitions (12 stages, all fields).
 *   Used by the Flutter app + web admin to render stage forms dynamically.
 *
 * Query params:
 *   vertical=coffeecore — (default, only CoffeeCore is defined so far)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const vertical = searchParams.get('vertical') || 'coffeecore'

  if (vertical.toLowerCase() !== 'coffeecore') {
    return NextResponse.json({
      error: `Vertical '${vertical}' not yet defined. Available: coffeecore`,
      available: ['coffeecore'],
    }, { status: 404 })
  }

  return NextResponse.json({
    vertical: 'COFFEECORE',
    cropTypes: ['Coffee', 'Cocoa'],
    totalStages: COFFEECORE_STAGES.length,
    totalFields: getTotalFieldCount(),
    stages: COFFEECORE_STAGES.map(s => ({
      stageNumber: s.stageNumber,
      stageName: s.stageName,
      eventType: s.eventType,
      description: s.description,
      farm5xLink: s.farm5xLink || null,
      dreamPhase: s.dreamPhase || null,
      sectionCount: s.sections.length,
      fieldCount: s.sections.reduce((sum, sec) => sum + sec.fields.length, 0),
      sections: s.sections,
    })),
  })
}
