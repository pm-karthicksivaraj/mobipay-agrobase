import { NextResponse } from 'next/server'
import { COFFEECORE_STAGES, getTotalFieldCount } from '@/lib/crop-stages/coffeecore-stages'
import { LIVECORE_STAGES, getLiveStageCount, getLiveTotalFieldCount } from '@/lib/crop-stages/livecore-stages'

/**
 * GET /api/crop-stages/definitions
 *   Returns stage definitions for crop verticals.
 *   Used by the Flutter app + web admin to render stage forms dynamically.
 *
 * Query params:
 *   vertical=coffeecore | livecore (default: returns list of available verticals)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const vertical = (searchParams.get('vertical') || '').toLowerCase()

  if (vertical === 'coffeecore') {
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

  if (vertical === 'livecore') {
    return NextResponse.json({
      vertical: 'LIVECORE',
      cropTypes: ['Dairy', 'Beef', 'Poultry', 'Pig', 'Sheep', 'Goat'],
      totalStages: getLiveStageCount(),
      totalFields: getLiveTotalFieldCount(),
      stages: LIVECORE_STAGES.map(s => ({
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

  // No vertical specified — return summary of all available
  return NextResponse.json({
    available: [
      {
        vertical: 'coffeecore',
        cropTypes: ['Coffee', 'Cocoa'],
        totalStages: COFFEECORE_STAGES.length,
        totalFields: getTotalFieldCount(),
        farm5xVariant: '1M5C / 1M5K',
        ipccModel: 'Tier 2 N2O + biomass carbon',
      },
      {
        vertical: 'livecore',
        cropTypes: ['Dairy', 'Beef', 'Poultry', 'Pig', 'Sheep', 'Goat'],
        totalStages: getLiveStageCount(),
        totalFields: getLiveTotalFieldCount(),
        farm5xVariant: '1M5D',
        ipccModel: 'Tier 2 enteric CH4 (GE × Ym × 55.65) + manure (VS × Bo × 0.67 × MCF)',
      },
    ],
    totalVerticals: 2,
    totalStagesAcrossAll: COFFEECORE_STAGES.length + LIVECORE_STAGES.length,
    totalFieldsAcrossAll: getTotalFieldCount() + getLiveTotalFieldCount(),
  })
}
