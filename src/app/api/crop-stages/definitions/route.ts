import { NextResponse } from 'next/server'
import { COFFEECORE_STAGES, getTotalFieldCount } from '@/lib/crop-stages/coffeecore-stages'
import { LIVECORE_STAGES, getLiveStageCount, getLiveTotalFieldCount } from '@/lib/crop-stages/livecore-stages'
import { ALL_REMAINING_VERTICALS } from '@/lib/crop-stages/remaining-stages'

/**
 * GET /api/crop-stages/definitions
 *   Returns stage definitions for any crop vertical.
 *   Used by the Flutter app + web admin to render stage forms dynamically.
 *
 * Query params:
 *   vertical=coffeecore|livecore|cropcore|orchardcore|vegcore|floracore|aquacore|forestcore|timbercore|mangrovecore
 *
 * No param → returns summary of all 10 verticals
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const vertical = (searchParams.get('vertical') || '').toLowerCase()

  // CoffeeCore
  if (vertical === 'coffeecore') {
    return NextResponse.json({
      vertical: 'COFFEECORE',
      cropTypes: ['Coffee', 'Cocoa'],
      totalStages: COFFEECORE_STAGES.length,
      totalFields: getTotalFieldCount(),
      stages: COFFEECORE_STAGES.map(s => ({ stageNumber: s.stageNumber, stageName: s.stageName, eventType: s.eventType, description: s.description, farm5xLink: s.farm5xLink || null, dreamPhase: s.dreamPhase || null, sectionCount: s.sections.length, fieldCount: s.sections.reduce((sum, sec) => sum + sec.fields.length, 0), sections: s.sections })),
    })
  }

  // LiveCore
  if (vertical === 'livecore') {
    return NextResponse.json({
      vertical: 'LIVECORE',
      cropTypes: ['Dairy', 'Beef', 'Poultry', 'Pig', 'Sheep', 'Goat'],
      totalStages: getLiveStageCount(),
      totalFields: getLiveTotalFieldCount(),
      stages: LIVECORE_STAGES.map(s => ({ stageNumber: s.stageNumber, stageName: s.stageName, eventType: s.eventType, description: s.description, farm5xLink: s.farm5xLink || null, dreamPhase: s.dreamPhase || null, sectionCount: s.sections.length, fieldCount: s.sections.reduce((sum, sec) => sum + sec.fields.length, 0), sections: s.sections })),
    })
  }

  // Remaining 8 verticals
  if (vertical && vertical in ALL_REMAINING_VERTICALS) {
    const def = ALL_REMAINING_VERTICALS[vertical as keyof typeof ALL_REMAINING_VERTICALS]
    return NextResponse.json({
      vertical: vertical.toUpperCase(),
      cropTypes: def.cropTypes,
      farm5xVariant: def.farm5xVariant,
      totalStages: def.stages.length,
      totalFields: def.stages.reduce((sum, s) => sum + s.sections.reduce((sum2, sec) => sum2 + sec.fields.length, 0), 0),
      stages: def.stages.map(s => ({ stageNumber: s.stageNumber, stageName: s.stageName, eventType: s.eventType, description: s.description, farm5xLink: s.farm5xLink || null, dreamPhase: s.dreamPhase || null, sectionCount: s.sections.length, fieldCount: s.sections.reduce((sum, sec) => sum + sec.fields.length, 0), sections: s.sections })),
    })
  }

  // Summary of all 10 verticals
  const allVerticals = [
    { vertical: 'coffeecore', cropTypes: ['Coffee', 'Cocoa'], totalStages: COFFEECORE_STAGES.length, totalFields: getTotalFieldCount(), farm5xVariant: '1M5C / 1M5K' },
    { vertical: 'livecore', cropTypes: ['Dairy', 'Beef', 'Poultry', 'Pig', 'Sheep', 'Goat'], totalStages: getLiveStageCount(), totalFields: getLiveTotalFieldCount(), farm5xVariant: '1M5D' },
    ...Object.entries(ALL_REMAINING_VERTICALS).map(([key, def]) => ({
      vertical: key,
      cropTypes: def.cropTypes,
      totalStages: def.stages.length,
      totalFields: def.stages.reduce((sum, s) => sum + s.sections.reduce((sum2, sec) => sum2 + sec.fields.length, 0), 0),
      farm5xVariant: def.farm5xVariant,
    })),
  ]

  const totalStages = allVerticals.reduce((sum, v) => sum + v.totalStages, 0)
  const totalFields = allVerticals.reduce((sum, v) => sum + v.totalFields, 0)

  return NextResponse.json({
    totalVerticals: allVerticals.length,
    totalStagesAcrossAll: totalStages,
    totalFieldsAcrossAll: totalFields,
    available: allVerticals,
  })
}
