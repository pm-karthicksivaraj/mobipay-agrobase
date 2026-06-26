import type { CropCalendar, CropCalendarStage, AdvisoryAlert } from './types'

// ============================================================
// Crop Calendar Database
// Comprehensive agronomic calendars for Uganda, Ghana, Kenya
// Stages defined by day-of-year (1-365) — crops with multiple
// planting windows use the FIRST window as the reference baseline.
// ============================================================

const UGANDA_CALENDARS: CropCalendar[] = [
  // ─── Coffee Arabica (Uganda) ───
  {
    crop: 'Coffee',
    country: 'UG',
    variety: 'Arabica',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 3, endMonth: 4 }, { startMonth: 9, endMonth: 10 }],
    stages: [
      {
        name: 'Flowering',
        startDay: 60,  // early March
        endDay: 120,
        expectedNDVI: { min: 0.55, max: 0.75 },
        expectedRainfall: { minMm: 80, maxMm: 150 },
        risks: ['Drought stress during flowering reduces berry set', 'Excessive rain causes flower drop'],
      },
      {
        name: 'Berry Development',
        startDay: 121,
        endDay: 210,
        expectedNDVI: { min: 0.6, max: 0.8 },
        expectedRainfall: { minMm: 100, maxMm: 180 },
        risks: ['Coffee berry disease in humid conditions', 'Inadequate moisture causes berry abortion'],
      },
      {
        name: 'Ripening',
        startDay: 211,
        endDay: 300,
        expectedNDVI: { min: 0.5, max: 0.72 },
        expectedRainfall: { minMm: 60, maxMm: 120 },
        risks: ['Premature ripening from water stress', 'Coffee leaf rust in warm humid periods'],
      },
      {
        name: 'Harvesting',
        startDay: 270,
        endDay: 365,
        expectedNDVI: { min: 0.45, max: 0.7 },
        expectedRainfall: { minMm: 50, maxMm: 100 },
        risks: ['Rain during harvest complicates drying', 'Post-harvest fungal infections'],
      },
      {
        name: 'Vegetative Rest',
        startDay: 1,
        endDay: 59,
        expectedNDVI: { min: 0.4, max: 0.6 },
        expectedRainfall: { minMm: 30, maxMm: 70 },
        risks: ['Pruning should occur in dry period', 'Nutrient replenishment needed'],
      },
    ],
  },

  // ─── Coffee Robusta (Uganda) ───
  {
    crop: 'Coffee',
    country: 'UG',
    variety: 'Robusta',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 3, endMonth: 5 }, { startMonth: 9, endMonth: 11 }],
    stages: [
      {
        name: 'Flowering',
        startDay: 70,
        endDay: 130,
        expectedNDVI: { min: 0.5, max: 0.7 },
        expectedRainfall: { minMm: 90, maxMm: 160 },
        risks: ['Drought during flowering', 'Wind damage to flowers'],
      },
      {
        name: 'Berry Development',
        startDay: 131,
        endDay: 240,
        expectedNDVI: { min: 0.55, max: 0.78 },
        expectedRainfall: { minMm: 100, maxMm: 200 },
        risks: ['Coffee Berry Borer infestation', 'CBD in high humidity'],
      },
      {
        name: 'Ripening & Harvesting',
        startDay: 241,
        endDay: 340,
        expectedNDVI: { min: 0.45, max: 0.68 },
        expectedRainfall: { minMm: 60, maxMm: 130 },
        risks: ['Uneven ripening', 'Pest damage to ripe cherries'],
      },
      {
        name: 'Post-Harvest Maintenance',
        startDay: 341,
        endDay: 365,
        expectedNDVI: { min: 0.4, max: 0.6 },
        expectedRainfall: { minMm: 20, maxMm: 60 },
        risks: ['Weed infestation', 'Soil erosion on slopes'],
      },
      {
        name: 'Vegetative Rest / Pruning',
        startDay: 1,
        endDay: 69,
        expectedNDVI: { min: 0.38, max: 0.55 },
        expectedRainfall: { minMm: 20, maxMm: 50 },
        risks: ['Dieback if severely pruned', 'Need shade management'],
      },
    ],
  },

  // ─── Maize (Uganda) — two seasons ───
  {
    crop: 'Maize',
    country: 'UG',
    totalDurationDays: 150,
    plantingWindows: [{ startMonth: 3, endMonth: 4 }, { startMonth: 8, endMonth: 9 }],
    stages: [
      {
        name: 'Land Preparation',
        startDay: 1,
        endDay: 14,
        expectedNDVI: { min: 0.1, max: 0.25 },
        expectedRainfall: { minMm: 20, maxMm: 60 },
        risks: ['Delayed rains delay planting', 'Soil compaction if ploughed wet'],
      },
      {
        name: 'Planting & Emergence',
        startDay: 15,
        endDay: 35,
        expectedNDVI: { min: 0.15, max: 0.3 },
        expectedRainfall: { minMm: 30, maxMm: 80 },
        risks: ['Poor germination if soil too dry', 'Seed rot in waterlogged soils', 'Cutworm attack on seedlings'],
      },
      {
        name: 'Vegetative Growth',
        startDay: 36,
        endDay: 75,
        expectedNDVI: { min: 0.3, max: 0.65 },
        expectedRainfall: { minMm: 60, maxMm: 150 },
        risks: ['Fall armyworm invasion', 'Nitrogen deficiency (yellowing)', 'Striga weed parasitism'],
      },
      {
        name: 'Flowering & Tasseling',
        startDay: 76,
        endDay: 100,
        expectedNDVI: { min: 0.55, max: 0.8 },
        expectedRainfall: { minMm: 60, maxMm: 120 },
        risks: ['Drought stress causes poor pollination', 'Grey leaf spot disease'],
      },
      {
        name: 'Grain Filling',
        startDay: 101,
        endDay: 130,
        expectedNDVI: { min: 0.5, max: 0.75 },
        expectedRainfall: { minMm: 40, maxMm: 100 },
        risks: ['Premature drying reduces yield', 'Ear rot in humid conditions'],
      },
      {
        name: 'Maturity & Harvesting',
        startDay: 131,
        endDay: 150,
        expectedNDVI: { min: 0.2, max: 0.45 },
        expectedRainfall: { minMm: 20, maxMm: 60 },
        risks: ['Rain delays drying', 'Storage pest (weevils) if not dried properly'],
      },
    ],
  },

  // ─── Rice (Uganda) ───
  {
    crop: 'Rice',
    country: 'UG',
    totalDurationDays: 150,
    plantingWindows: [{ startMonth: 3, endMonth: 5 }, { startMonth: 8, endMonth: 10 }],
    stages: [
      {
        name: 'Nursery & Land Preparation',
        startDay: 1,
        endDay: 25,
        expectedNDVI: { min: 0.05, max: 0.2 },
        expectedRainfall: { minMm: 30, maxMm: 80 },
        risks: ['Inadequate water for nursery', 'Bird damage to seedlings'],
      },
      {
        name: 'Transplanting & Establishment',
        startDay: 26,
        endDay: 50,
        expectedNDVI: { min: 0.15, max: 0.35 },
        expectedRainfall: { minMm: 50, maxMm: 120 },
        risks: ['Transplant shock', 'Rice blast in nursery'],
      },
      {
        name: 'Vegetative (Tillering)',
        startDay: 51,
        endDay: 85,
        expectedNDVI: { min: 0.35, max: 0.65 },
        expectedRainfall: { minMm: 80, maxMm: 180 },
        risks: ['Weed competition', 'Golden apple snail damage', 'Nitrogen deficiency'],
      },
      {
        name: 'Reproductive (Flowering)',
        startDay: 86,
        endDay: 115,
        expectedNDVI: { min: 0.55, max: 0.8 },
        expectedRainfall: { minMm: 80, maxMm: 160 },
        risks: ['Cold stress affects pollination', 'Rice blast epidemic', 'Stem borer'],
      },
      {
        name: 'Ripening & Harvest',
        startDay: 116,
        endDay: 150,
        expectedNDVI: { min: 0.3, max: 0.55 },
        expectedRainfall: { minMm: 40, maxMm: 100 },
        risks: ['Bird damage to grain', 'Lodging from wind/rain', 'Delayed harvesting causes shattering'],
      },
    ],
  },

  // ─── Tea (Uganda) ───
  {
    crop: 'Tea',
    country: 'UG',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 3, endMonth: 5 }],
    stages: [
      {
        name: 'First Flush',
        startDay: 60,
        endDay: 120,
        expectedNDVI: { min: 0.55, max: 0.78 },
        expectedRainfall: { minMm: 100, maxMm: 200 },
        risks: ['Hail damage to young leaves', 'Pesticide residue if sprayed too close to plucking'],
      },
      {
        name: 'Main Plucking Period',
        startDay: 121,
        endDay: 240,
        expectedNDVI: { min: 0.6, max: 0.82 },
        expectedRainfall: { minMm: 120, maxMm: 220 },
        risks: ['Red spider mite in dry spell', 'Tea mosquito bug', 'Over-plucking weakens bush'],
      },
      {
        name: 'Second Flush',
        startDay: 241,
        endDay: 330,
        expectedNDVI: { min: 0.5, max: 0.75 },
        expectedRainfall: { minMm: 80, maxMm: 180 },
        risks: ['Declining quality in drought', 'Soil erosion on steep slopes'],
      },
      {
        name: 'Dormant / Pruning Period',
        startDay: 331,
        endDay: 365,
        expectedNDVI: { min: 0.35, max: 0.55 },
        expectedRainfall: { minMm: 30, maxMm: 80 },
        risks: ['Pruning disease entry points', 'Frost in high-altitude areas'],
      },
      {
        name: 'Pre-First Flush Recovery',
        startDay: 1,
        endDay: 59,
        expectedNDVI: { min: 0.38, max: 0.55 },
        expectedRainfall: { minMm: 30, maxMm: 90 },
        risks: ['Slow recovery after dry season', 'Nutrient deficiency'],
      },
    ],
  },

  // ─── Vanilla (Uganda) ───
  {
    crop: 'Vanilla',
    country: 'UG',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 3, endMonth: 5 }],
    stages: [
      {
        name: 'Vegetative Growth',
        startDay: 60,
        endDay: 180,
        expectedNDVI: { min: 0.4, max: 0.7 },
        expectedRainfall: { minMm: 80, maxMm: 180 },
        risks: ['Fusarium wilt disease', 'Inadequate shade kills vines', 'Vine borer'],
      },
      {
        name: 'Flowering Induction',
        startDay: 181,
        endDay: 240,
        expectedNDVI: { min: 0.45, max: 0.72 },
        expectedRainfall: { minMm: 60, maxMm: 140 },
        risks: ['Irregular flowering if water stress', 'Poor pollination (hand-pollination needed)'],
      },
      {
        name: 'Bean Development',
        startDay: 241,
        endDay: 330,
        expectedNDVI: { min: 0.42, max: 0.68 },
        expectedRainfall: { minMm: 60, maxMm: 140 },
        risks: ['Bean splitting from excess rain', 'Theft (high-value crop)'],
      },
      {
        name: 'Harvesting & Curing',
        startDay: 331,
        endDay: 365,
        expectedNDVI: { min: 0.38, max: 0.6 },
        expectedRainfall: { minMm: 40, maxMm: 100 },
        risks: ['Premature harvest reduces vanillin', 'Improper curing destroys quality'],
      },
      {
        name: 'Rest Period',
        startDay: 1,
        endDay: 59,
        expectedNDVI: { min: 0.32, max: 0.52 },
        expectedRainfall: { minMm: 20, maxMm: 70 },
        risks: ['Support tree management', 'Mulching needed'],
      },
    ],
  },

  // ─── Cocoa (Uganda) ───
  {
    crop: 'Cocoa',
    country: 'UG',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 3, endMonth: 5 }],
    stages: [
      {
        name: 'Flowering (Main Season)',
        startDay: 60,
        endDay: 120,
        expectedNDVI: { min: 0.5, max: 0.75 },
        expectedRainfall: { minMm: 80, maxMm: 160 },
        risks: ['Black pod disease in wet conditions', 'Mirid bug damage'],
      },
      {
        name: 'Pod Development (Main)',
        startDay: 121,
        endDay: 210,
        expectedNDVI: { min: 0.52, max: 0.78 },
        expectedRainfall: { minMm: 100, maxMm: 200 },
        risks: ['CSSV (Cocoa Swollen Shoot Virus)', 'Midges (pollinators) decline'],
      },
      {
        name: 'Main Harvest',
        startDay: 211,
        endDay: 300,
        expectedNDVI: { min: 0.48, max: 0.72 },
        expectedRainfall: { minMm: 60, maxMm: 140 },
        risks: ['Witches broom disease', 'Pod borer infestation'],
      },
      {
        name: 'Minor Flowering & Harvest',
        startDay: 301,
        endDay: 365,
        expectedNDVI: { min: 0.45, max: 0.68 },
        expectedRainfall: { minMm: 40, maxMm: 100 },
        risks: ['Second flush lower quality', 'Nutrient depletion'],
      },
      {
        name: 'Maintenance Period',
        startDay: 1,
        endDay: 59,
        expectedNDVI: { min: 0.4, max: 0.6 },
        expectedRainfall: { minMm: 20, maxMm: 60 },
        risks: ['Shade tree management critical', 'Soil fertility amendments'],
      },
    ],
  },

  // ─── Beans (Uganda) ───
  {
    crop: 'Beans',
    country: 'UG',
    totalDurationDays: 100,
    plantingWindows: [{ startMonth: 3, endMonth: 4 }, { startMonth: 9, endMonth: 10 }],
    stages: [
      {
        name: 'Planting & Emergence',
        startDay: 1,
        endDay: 15,
        expectedNDVI: { min: 0.1, max: 0.25 },
        expectedRainfall: { minMm: 20, maxMm: 60 },
        risks: ['Seed rot in waterlogged soil', 'Bean fly attack on seedlings'],
      },
      {
        name: 'Vegetative Growth',
        startDay: 16,
        endDay: 45,
        expectedNDVI: { min: 0.25, max: 0.55 },
        expectedRainfall: { minMm: 40, maxMm: 100 },
        risks: ['Aphid infestation', 'Anthracnose', 'Rust disease'],
      },
      {
        name: 'Flowering & Pod Set',
        startDay: 46,
        endDay: 70,
        expectedNDVI: { min: 0.45, max: 0.72 },
        expectedRainfall: { minMm: 40, maxMm: 100 },
        risks: ['Flower drop from drought', 'Bean flower thrips'],
      },
      {
        name: 'Pod Filling & Maturation',
        startDay: 71,
        endDay: 100,
        expectedNDVI: { min: 0.3, max: 0.55 },
        expectedRainfall: { minMm: 20, maxMm: 70 },
        risks: ['Pod borer damage', 'Harvest beans before shattering'],
      },
    ],
  },

  // ─── Bananas / Matooke (Uganda) ───
  {
    crop: 'Bananas',
    country: 'UG',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 1, endMonth: 3 }, { startMonth: 9, endMonth: 11 }],
    stages: [
      {
        name: 'Establishment & Vegetative Growth',
        startDay: 1,
        endDay: 120,
        expectedNDVI: { min: 0.5, max: 0.78 },
        expectedRainfall: { minMm: 80, maxMm: 180 },
        risks: ['Banana bacterial wilt (BBW)', 'Weevil damage to corm', 'Nematode infestation'],
      },
      {
        name: 'Flowering (Shooting)',
        startDay: 121,
        endDay: 200,
        expectedNDVI: { min: 0.55, max: 0.82 },
        expectedRainfall: { minMm: 100, maxMm: 200 },
        risks: ['BBW spreads rapidly in wet season', 'Sigatoka leaf spot'],
      },
      {
        name: 'Fruit Development',
        startDay: 201,
        endDay: 300,
        expectedNDVI: { min: 0.52, max: 0.8 },
        expectedRainfall: { minMm: 80, maxMm: 180 },
        risks: ['Thrips damage to fruit', 'Bunchy top virus'],
      },
      {
        name: 'Harvesting',
        startDay: 270,
        endDay: 365,
        expectedNDVI: { min: 0.48, max: 0.76 },
        expectedRainfall: { minMm: 60, maxMm: 150 },
        risks: ['Premature ripening', 'Post-harvest losses'],
      },
      {
        name: 'Sucker Management',
        startDay: 1,
        endDay: 365,
        expectedNDVI: { min: 0.45, max: 0.75 },
        expectedRainfall: { minMm: 60, maxMm: 150 },
        risks: ['Overcrowding from too many suckers', 'Soil nutrient depletion'],
      },
    ],
  },
]

const GHANA_CALENDARS: CropCalendar[] = [
  // ─── Cocoa (Ghana) ───
  {
    crop: 'Cocoa',
    country: 'GH',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 5, endMonth: 7 }, { startMonth: 10, endMonth: 12 }],
    stages: [
      {
        name: 'Flowering (Light Crop)',
        startDay: 1,
        endDay: 60,
        expectedNDVI: { min: 0.48, max: 0.72 },
        expectedRainfall: { minMm: 40, maxMm: 100 },
        risks: ['Harmattan dry winds reduce flower set', 'Mirid bug peak season'],
      },
      {
        name: 'Light Crop Harvest',
        startDay: 61,
        endDay: 150,
        expectedNDVI: { min: 0.5, max: 0.74 },
        expectedRainfall: { minMm: 60, maxMm: 160 },
        risks: ['Black pod disease onset with rains', 'Lower quality beans in minor season'],
      },
      {
        name: 'Main Flowering',
        startDay: 151,
        endDay: 240,
        expectedNDVI: { min: 0.52, max: 0.78 },
        expectedRainfall: { minMm: 120, maxMm: 250 },
        risks: ['Heavy rains spread black pod rapidly', 'CSSV in infected areas', 'Nutrient leaching'],
      },
      {
        name: 'Main Crop Pod Development',
        startDay: 241,
        endDay: 310,
        expectedNDVI: { min: 0.5, max: 0.76 },
        expectedRainfall: { minMm: 100, maxMm: 220 },
        risks: ['Pod borer and capsid damage', 'Fungal pod rot'],
      },
      {
        name: 'Main Harvest',
        startDay: 280,
        endDay: 365,
        expectedNDVI: { min: 0.46, max: 0.7 },
        expectedRainfall: { minMm: 50, maxMm: 150 },
        risks: ['Fermentation quality if harvested wet', 'Smuggling risk for high-value main crop'],
      },
    ],
  },

  // ─── Coffee (Ghana) ───
  {
    crop: 'Coffee',
    country: 'GH',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 5, endMonth: 7 }],
    stages: [
      {
        name: 'Flowering',
        startDay: 60,
        endDay: 130,
        expectedNDVI: { min: 0.5, max: 0.72 },
        expectedRainfall: { minMm: 80, maxMm: 180 },
        risks: ['Drought stress in transition zone', 'Berry disease'],
      },
      {
        name: 'Berry Development',
        startDay: 131,
        endDay: 250,
        expectedNDVI: { min: 0.52, max: 0.76 },
        expectedRainfall: { minMm: 100, maxMm: 200 },
        risks: ['Coffee berry borer', 'Leaf rust in humid conditions'],
      },
      {
        name: 'Ripening & Harvest',
        startDay: 251,
        endDay: 340,
        expectedNDVI: { min: 0.45, max: 0.68 },
        expectedRainfall: { minMm: 50, maxMm: 130 },
        risks: ['Delayed harvest leads to over-ripening', 'Drying problems in humid weather'],
      },
      {
        name: 'Post-Harvest & Pruning',
        startDay: 341,
        endDay: 365,
        expectedNDVI: { min: 0.4, max: 0.58 },
        expectedRainfall: { minMm: 20, maxMm: 60 },
        risks: ['Improper pruning reduces next season yield', 'Shade tree management'],
      },
      {
        name: 'Vegetative Rest',
        startDay: 1,
        endDay: 59,
        expectedNDVI: { min: 0.38, max: 0.55 },
        expectedRainfall: { minMm: 20, maxMm: 70 },
        risks: ['Harmattan desiccation', 'Fire risk in dry season'],
      },
    ],
  },

  // ─── Maize (Ghana) ───
  {
    crop: 'Maize',
    country: 'GH',
    totalDurationDays: 120,
    plantingWindows: [{ startMonth: 3, endMonth: 5 }, { startMonth: 8, endMonth: 9 }],
    stages: [
      {
        name: 'Land Preparation & Planting',
        startDay: 1,
        endDay: 20,
        expectedNDVI: { min: 0.08, max: 0.22 },
        expectedRainfall: { minMm: 20, maxMm: 60 },
        risks: ['Delayed onset of rains', 'Striga infestation on depleted soils'],
      },
      {
        name: 'Vegetative Growth',
        startDay: 21,
        endDay: 55,
        expectedNDVI: { min: 0.22, max: 0.6 },
        expectedRainfall: { minMm: 50, maxMm: 140 },
        risks: ['Fall armyworm', 'Stem borer', 'Nitrogen deficiency'],
      },
      {
        name: 'Flowering & Pollination',
        startDay: 56,
        endDay: 80,
        expectedNDVI: { min: 0.5, max: 0.78 },
        expectedRainfall: { minMm: 50, maxMm: 120 },
        risks: ['Drought causes poor kernel set', 'Grey leaf spot', 'Maize streak virus'],
      },
      {
        name: 'Grain Filling',
        startDay: 81,
        endDay: 105,
        expectedNDVI: { min: 0.45, max: 0.72 },
        expectedRainfall: { minMm: 40, maxMm: 100 },
        risks: ['Premature senescence', 'Ear rot in wet conditions'],
      },
      {
        name: 'Maturity & Harvest',
        startDay: 106,
        endDay: 120,
        expectedNDVI: { min: 0.2, max: 0.4 },
        expectedRainfall: { minMm: 20, maxMm: 60 },
        risks: ['Aflatoxin contamination in humid storage', 'Field pests'],
      },
    ],
  },

  // ─── Rice (Ghana) ───
  {
    crop: 'Rice',
    country: 'GH',
    totalDurationDays: 140,
    plantingWindows: [{ startMonth: 5, endMonth: 7 }, { startMonth: 10, endMonth: 12 }],
    stages: [
      {
        name: 'Nursery & Establishment',
        startDay: 1,
        endDay: 25,
        expectedNDVI: { min: 0.05, max: 0.2 },
        expectedRainfall: { minMm: 30, maxMm: 80 },
        risks: ['Inadequate water in rainfed systems', 'Bird damage'],
      },
      {
        name: 'Tillering & Vegetative',
        startDay: 26,
        endDay: 60,
        expectedNDVI: { min: 0.3, max: 0.62 },
        expectedRainfall: { minMm: 80, maxMm: 180 },
        risks: ['Weed competition critical phase', 'Rice blast in nursery transition'],
      },
      {
        name: 'Flowering',
        startDay: 61,
        endDay: 95,
        expectedNDVI: { min: 0.55, max: 0.8 },
        expectedRainfall: { minMm: 80, maxMm: 180 },
        risks: ['Cold stress in northern Ghana', 'Rice blast epidemic', 'Stem borer peak'],
      },
      {
        name: 'Grain Filling & Maturity',
        startDay: 96,
        endDay: 140,
        expectedNDVI: { min: 0.28, max: 0.55 },
        expectedRainfall: { minMm: 40, maxMm: 120 },
        risks: ['Bird swarms', 'Lodging from heavy rain', 'Shattering if harvest delayed'],
      },
    ],
  },

  // ─── Cassava (Ghana) ───
  {
    crop: 'Cassava',
    country: 'GH',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 4, endMonth: 6 }, { startMonth: 10, endMonth: 12 }],
    stages: [
      {
        name: 'Establishment',
        startDay: 1,
        endDay: 60,
        expectedNDVI: { min: 0.15, max: 0.35 },
        expectedRainfall: { minMm: 40, maxMm: 120 },
        risks: ['Poor sprouting from low-quality cuttings', 'Termite damage to stems'],
      },
      {
        name: 'Vegetative Growth',
        startDay: 61,
        endDay: 180,
        expectedNDVI: { min: 0.35, max: 0.65 },
        expectedRainfall: { minMm: 80, maxMm: 200 },
        risks: ['Cassava mosaic disease (CMD)', 'Mealybug', 'Weed competition'],
      },
      {
        name: 'Root Bulking',
        startDay: 181,
        endDay: 300,
        expectedNDVI: { min: 0.4, max: 0.68 },
        expectedRainfall: { minMm: 60, maxMm: 180 },
        risks: ['Cassava brown streak disease (CBSD)', 'Cyanogenic glucosides increase in drought'],
      },
      {
        name: 'Maturity',
        startDay: 301,
        endDay: 365,
        expectedNDVI: { min: 0.32, max: 0.58 },
        expectedRainfall: { minMm: 30, maxMm: 100 },
        risks: ['Root rot in waterlogged soils', 'Harvest before 18 months for food quality'],
      },
      {
        name: 'Dormancy / Leaf Shedding',
        startDay: 1,
        endDay: 60,
        expectedNDVI: { min: 0.2, max: 0.38 },
        expectedRainfall: { minMm: 20, maxMm: 60 },
        risks: ['Can remain in ground up to 24 months', 'Post-harvest physiological deterioration'],
      },
    ],
  },

  // ─── Oil Palm (Ghana) ───
  {
    crop: 'Oil Palm',
    country: 'GH',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 5, endMonth: 8 }],
    stages: [
      {
        name: 'Vegetative Growth',
        startDay: 1,
        endDay: 120,
        expectedNDVI: { min: 0.55, max: 0.8 },
        expectedRainfall: { minMm: 100, maxMm: 220 },
        risks: ['Blast disease in nursery', 'Nutrient deficiency (Mg, K)'],
      },
      {
        name: 'Flowering & Bunch Formation',
        startDay: 121,
        endDay: 240,
        expectedNDVI: { min: 0.58, max: 0.82 },
        expectedRainfall: { minMm: 120, maxMm: 250 },
        risks: ['Sex ratio affected by drought (more male flowers)', 'Rhinoceros beetle'],
      },
      {
        name: 'Fruit Ripening & Harvest',
        startDay: 241,
        endDay: 330,
        expectedNDVI: { min: 0.52, max: 0.78 },
        expectedRainfall: { minMm: 80, maxMm: 200 },
        risks: ['Poor FFA (free fatty acid) if harvest delayed', 'Oil extraction rate declines'],
      },
      {
        name: 'Maintenance & Pruning',
        startDay: 331,
        endDay: 365,
        expectedNDVI: { min: 0.48, max: 0.72 },
        expectedRainfall: { minMm: 50, maxMm: 120 },
        risks: ['Frond removal timing', 'Anthurium rot'],
      },
      {
        name: 'Pre-Rainy Recovery',
        startDay: 1,
        endDay: 60,
        expectedNDVI: { min: 0.5, max: 0.74 },
        expectedRainfall: { minMm: 40, maxMm: 100 },
        risks: ['Dry season stress reduces yield', 'Fire risk from slash burning'],
      },
    ],
  },

  // ─── Shea (Ghana) ───
  {
    crop: 'Shea',
    country: 'GH',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 6, endMonth: 8 }],
    stages: [
      {
        name: 'Leaf Flush & Flowering',
        startDay: 60,
        endDay: 150,
        expectedNDVI: { min: 0.35, max: 0.65 },
        expectedRainfall: { minMm: 80, maxMm: 200 },
        risks: ['Fires in savanna zone', 'Late bush burning destroys flowers'],
      },
      {
        name: 'Fruit Development',
        startDay: 151,
        endDay: 250,
        expectedNDVI: { min: 0.38, max: 0.68 },
        expectedRainfall: { minMm: 100, maxMm: 250 },
        risks: ['Fruit drop from heavy wind', 'Pests (squirrels, bats)'],
      },
      {
        name: 'Fruit Maturity & Harvest',
        startDay: 251,
        endDay: 330,
        expectedNDVI: { min: 0.3, max: 0.58 },
        expectedRainfall: { minMm: 40, maxMm: 120 },
        risks: 'Premature fruit fall from windstorms; seed viability declines rapidly after harvest'.split(';').map(s => s.trim()),
      },
      {
        name: 'Leaf Shedding & Dormancy',
        startDay: 331,
        endDay: 365,
        expectedNDVI: { min: 0.18, max: 0.35 },
        expectedRainfall: { minMm: 10, maxMm: 40 },
        risks: ['Fire risk peaks', 'Tree lopping for firewood damages productivity'],
      },
      {
        name: 'Dry Season Dormancy',
        startDay: 1,
        endDay: 59,
        expectedNDVI: { min: 0.15, max: 0.3 },
        expectedRainfall: { minMm: 5, maxMm: 30 },
        risks: ['Harmattan desiccation', 'Over-exploitation of parklands'],
      },
    ],
  },
]

const KENYA_CALENDARS: CropCalendar[] = [
  // ─── Coffee (Kenya) ───
  {
    crop: 'Coffee',
    country: 'KE',
    variety: 'Arabica (SL28, Ruiru 11)',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 4, endMonth: 6 }, { startMonth: 10, endMonth: 12 }],
    stages: [
      {
        name: 'Flowering',
        startDay: 80,
        endDay: 140,
        expectedNDVI: { min: 0.55, max: 0.78 },
        expectedRainfall: { minMm: 80, maxMm: 180 },
        risks: ['Coffee berry disease (CBD) onset', 'Drought causes flower abortion', 'Frost at high altitude'],
      },
      {
        name: 'Berry Development',
        startDay: 141,
        endDay: 250,
        expectedNDVI: { min: 0.58, max: 0.82 },
        expectedRainfall: { minMm: 100, maxMm: 220 },
        risks: ['Coffee berry borer (CBB)', 'Leaf rust', 'Antestia bug'],
      },
      {
        name: 'Ripening',
        startDay: 251,
        endDay: 320,
        expectedNDVI: { min: 0.5, max: 0.74 },
        expectedRainfall: { minMm: 60, maxMm: 140 },
        risks: ['Early ripening from stress', 'Quality decline if picked under-ripe'],
      },
      {
        name: 'Main Harvest',
        startDay: 290,
        endDay: 365,
        expectedNDVI: { min: 0.46, max: 0.7 },
        expectedRainfall: { minMm: 50, maxMm: 120 },
        risks: ['Rain during picking complicates processing', 'Delayed pulping reduces quality'],
      },
      {
        name: 'Pruning & Maintenance',
        startDay: 1,
        endDay: 79,
        expectedNDVI: { min: 0.4, max: 0.58 },
        expectedRainfall: { minMm: 30, maxMm: 80 },
        risks: ['Coffee wilt disease on pruned trees', 'Nutrient management (NPK)'],
      },
    ],
  },

  // ─── Tea (Kenya) ───
  {
    crop: 'Tea',
    country: 'KE',
    variety: 'Clone (TRFK 6/8, 31/8)',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 4, endMonth: 6 }],
    stages: [
      {
        name: 'First Flush',
        startDay: 70,
        endDay: 130,
        expectedNDVI: { min: 0.55, max: 0.8 },
        expectedRainfall: { minMm: 120, maxMm: 250 },
        risks: ['Hail damage in highlands', 'Pesticide residue management'],
      },
      {
        name: 'Main Plucking Period',
        startDay: 131,
        endDay: 260,
        expectedNDVI: { min: 0.58, max: 0.84 },
        expectedRainfall: { minMm: 150, maxMm: 300 },
        risks: ['Red spider mite in dry spells', 'Tea mosquito bug', 'Purple blotch'],
      },
      {
        name: 'Second Flush',
        startDay: 261,
        endDay: 340,
        expectedNDVI: { min: 0.52, max: 0.76 },
        expectedRainfall: { minMm: 80, maxMm: 200 },
        risks: ['Declining quality in dry periods', 'Soil erosion on steep terrain'],
      },
      {
        name: 'Dormant / Pruning',
        startDay: 341,
        endDay: 365,
        expectedNDVI: { min: 0.35, max: 0.55 },
        expectedRainfall: { minMm: 30, maxMm: 80 },
        risks: ['Pruning wound infections', 'Frost at >2200m altitude'],
      },
      {
        name: 'Pre-Flush Recovery',
        startDay: 1,
        endDay: 69,
        expectedNDVI: { min: 0.38, max: 0.58 },
        expectedRainfall: { minMm: 40, maxMm: 100 },
        risks: ['Slow bud break after cold/dry period', 'Fertilizer application timing'],
      },
    ],
  },

  // ─── Maize (Kenya) ───
  {
    crop: 'Maize',
    country: 'KE',
    totalDurationDays: 140,
    plantingWindows: [{ startMonth: 3, endMonth: 5 }, { startMonth: 10, endMonth: 11 }],
    stages: [
      {
        name: 'Land Preparation & Planting',
        startDay: 1,
        endDay: 18,
        expectedNDVI: { min: 0.08, max: 0.22 },
        expectedRainfall: { minMm: 20, maxMm: 60 },
        risks: ['Unreliable long rains onset', 'Striga weed on exhausted soils'],
      },
      {
        name: 'Vegetative Growth',
        startDay: 19,
        endDay: 55,
        expectedNDVI: { min: 0.22, max: 0.62 },
        expectedRainfall: { minMm: 50, maxMm: 150 },
        risks: ['Fall armyworm', 'Maize lethal necrosis (MLN)', 'Stem borer'],
      },
      {
        name: 'Flowering & Tasseling',
        startDay: 56,
        endDay: 85,
        expectedNDVI: { min: 0.5, max: 0.8 },
        expectedRainfall: { minMm: 50, maxMm: 130 },
        risks: ['Drought stress at silking critical', 'Grey leaf spot', 'Turcicum leaf blight'],
      },
      {
        name: 'Grain Filling',
        startDay: 86,
        endDay: 118,
        expectedNDVI: { min: 0.45, max: 0.72 },
        expectedRainfall: { minMm: 40, maxMm: 110 },
        risks: ['Premature leaf senescence', 'Ear rot (Aspergillus)'],
      },
      {
        name: 'Maturity & Harvest',
        startDay: 119,
        endDay: 140,
        expectedNDVI: { min: 0.18, max: 0.4 },
        expectedRainfall: { minMm: 20, maxMm: 60 },
        risks: ['Aflatoxin risk in humid storage', 'Post-harvest losses from weevils'],
      },
    ],
  },

  // ─── Rice (Kenya) ───
  {
    crop: 'Rice',
    country: 'KE',
    totalDurationDays: 145,
    plantingWindows: [{ startMonth: 8, endMonth: 10 }],
    stages: [
      {
        name: 'Nursery & Transplanting',
        startDay: 1,
        endDay: 30,
        expectedNDVI: { min: 0.05, max: 0.22 },
        expectedRainfall: { minMm: 30, maxMm: 80 },
        risks: ['Water shortage in Mwea irrigation', 'Blast in nursery'],
      },
      {
        name: 'Tillering',
        startDay: 31,
        endDay: 65,
        expectedNDVI: { min: 0.3, max: 0.62 },
        expectedRainfall: { minMm: 60, maxMm: 160 },
        risks: ['Weed competition (Echinochloa)', 'Rice water weevil'],
      },
      {
        name: 'Flowering',
        startDay: 66,
        endDay: 100,
        expectedNDVI: { min: 0.55, max: 0.82 },
        expectedRainfall: { minMm: 70, maxMm: 180 },
        risks: ['Rice blast at heading', 'Cold stress reduces seed set'],
      },
      {
        name: 'Ripening & Harvest',
        startDay: 101,
        endDay: 145,
        expectedNDVI: { min: 0.25, max: 0.52 },
        expectedRainfall: { minMm: 30, maxMm: 100 },
        risks: ['Bird damage', 'Lodging', 'Shattering if harvest late'],
      },
    ],
  },

  // ─── Avocado (Kenya) ───
  {
    crop: 'Avocado',
    country: 'KE',
    variety: 'Hass, Fuerte',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 4, endMonth: 6 }],
    stages: [
      {
        name: 'Vegetative Flush',
        startDay: 60,
        endDay: 150,
        expectedNDVI: { min: 0.5, max: 0.78 },
        expectedRainfall: { minMm: 80, maxMm: 200 },
        risks: ['Anthracnose on new growth', 'Phytophthora root rot in waterlogged soils'],
      },
      {
        name: 'Flowering',
        startDay: 151,
        endDay: 220,
        expectedNDVI: { min: 0.52, max: 0.76 },
        expectedRainfall: { minMm: 60, maxMm: 160 },
        risks: ['Poor fruit set in cold/wet conditions', 'Thrips on flowers'],
      },
      {
        name: 'Fruit Development',
        startDay: 221,
        endDay: 330,
        expectedNDVI: { min: 0.48, max: 0.74 },
        expectedRainfall: { minMm: 50, maxMm: 140 },
        risks: ['Fruit drop from water stress', 'Avocado lace bug', 'Cercospora spot'],
      },
      {
        name: 'Harvesting',
        startDay: 280,
        endDay: 365,
        expectedNDVI: { min: 0.44, max: 0.7 },
        expectedRainfall: { minMm: 30, maxMm: 100 },
        risks: ['Post-harvest cold damage', 'Body rot in transit', 'Size grade compliance for export'],
      },
      {
        name: 'Rest Period',
        startDay: 1,
        endDay: 59,
        expectedNDVI: { min: 0.38, max: 0.58 },
        expectedRainfall: { minMm: 20, maxMm: 60 },
        risks: ['Nutrient application timing', 'Irrigation scheduling'],
      },
    ],
  },

  // ─── Macadamia (Kenya) ───
  {
    crop: 'Macadamia',
    country: 'KE',
    totalDurationDays: 365,
    plantingWindows: [{ startMonth: 4, endMonth: 6 }],
    stages: [
      {
        name: 'Vegetative Growth',
        startDay: 60,
        endDay: 160,
        expectedNDVI: { min: 0.52, max: 0.8 },
        expectedRainfall: { minMm: 80, maxMm: 200 },
        risks: ['Nutrient deficiency (B, Zn)', 'Rats and squirrels on young trees'],
      },
      {
        name: 'Flowering',
        startDay: 161,
        endDay: 220,
        expectedNDVI: { min: 0.55, max: 0.78 },
        expectedRainfall: { minMm: 60, maxMm: 160 },
        risks: ['Wind damages racemes', 'Poor pollination in cold/wet'],
      },
      {
        name: 'Nut Development & Maturation',
        startDay: 221,
        endDay: 340,
        expectedNDVI: { min: 0.5, max: 0.76 },
        expectedRainfall: { minMm: 50, maxMm: 150 },
        risks: ['Husk rot in wet conditions', 'Nut borer', 'Premature nut drop'],
      },
      {
        name: 'Harvesting',
        startDay: 300,
        endDay: 365,
        expectedNDVI: { min: 0.46, max: 0.72 },
        expectedRainfall: { minMm: 30, maxMm: 100 },
        risks: ['Delayed harvest → rancidity', 'Theft (high-value crop)', 'De-husking delays'],
      },
      {
        name: 'Dormancy & Maintenance',
        startDay: 1,
        endDay: 59,
        expectedNDVI: { min: 0.4, max: 0.6 },
        expectedRainfall: { minMm: 20, maxMm: 60 },
        risks: ['Tree spacing management', 'Intercrop competition'],
      },
    ],
  },

  // ─── Beans (Kenya) ───
  {
    crop: 'Beans',
    country: 'KE',
    totalDurationDays: 95,
    plantingWindows: [{ startMonth: 3, endMonth: 5 }, { startMonth: 10, endMonth: 11 }],
    stages: [
      {
        name: 'Planting & Emergence',
        startDay: 1,
        endDay: 14,
        expectedNDVI: { min: 0.1, max: 0.24 },
        expectedRainfall: { minMm: 20, maxMm: 50 },
        risks: ['Bean fly on emergence', 'Poor germination in dry soil'],
      },
      {
        name: 'Vegetative Growth',
        startDay: 15,
        endDay: 42,
        expectedNDVI: { min: 0.24, max: 0.55 },
        expectedRainfall: { minMm: 40, maxMm: 100 },
        risks: ['Angular leaf spot', 'Rust disease', 'Aphid vectors (BYMV)'],
      },
      {
        name: 'Flowering & Pod Set',
        startDay: 43,
        endDay: 65,
        expectedNDVI: { min: 0.45, max: 0.72 },
        expectedRainfall: { minMm: 40, maxMm: 100 },
        risks: ['Flower abortion from drought', 'Bean flower thrips'],
      },
      {
        name: 'Pod Filling & Maturity',
        startDay: 66,
        endDay: 95,
        expectedNDVI: { min: 0.28, max: 0.52 },
        expectedRainfall: { minMm: 20, maxMm: 60 },
        risks: ['Pod borer', 'Harvest at right moisture to avoid storage losses'],
      },
    ],
  },

  // ─── Sorghum (Kenya) ───
  {
    crop: 'Sorghum',
    country: 'KE',
    totalDurationDays: 130,
    plantingWindows: [{ startMonth: 3, endMonth: 5 }, { startMonth: 10, endMonth: 11 }],
    stages: [
      {
        name: 'Establishment',
        startDay: 1,
        endDay: 20,
        expectedNDVI: { min: 0.08, max: 0.2 },
        expectedRainfall: { minMm: 15, maxMm: 50 },
        risks: ['Bird damage to seed', 'Poor stand in crusted soils'],
      },
      {
        name: 'Vegetative Growth',
        startDay: 21,
        endDay: 60,
        expectedNDVI: { min: 0.2, max: 0.55 },
        expectedRainfall: { minMm: 40, maxMm: 120 },
        risks: ['Striga parasitism', 'Shoot fly', 'Leaf blight'],
      },
      {
        name: 'Flowering',
        startDay: 61,
        endDay: 90,
        expectedNDVI: { min: 0.45, max: 0.72 },
        expectedRainfall: { minMm: 40, maxMm: 100 },
        risks: ['Drought at flowering devastating', 'Sorghum midge', 'Smuts'],
      },
      {
        name: 'Grain Filling & Maturity',
        startDay: 91,
        endDay: 130,
        expectedNDVI: { min: 0.25, max: 0.5 },
        expectedRainfall: { minMm: 20, maxMm: 70 },
        risks: ['Bird attack on ripening grain', 'Mold in humid conditions', 'Head smug'],
      },
    ],
  },
]

// ============================================================
// Master calendar database — all countries merged
// ============================================================

export const CROP_CALENDARS: CropCalendar[] = [
  ...UGANDA_CALENDARS,
  ...GHANA_CALENDARS,
  ...KENYA_CALENDARS,
]

// ============================================================
// Query helpers
// ============================================================

/**
 * Find a crop calendar for a specific crop and country.
 * If multiple varieties exist, returns the first match.
 */
export function getCropCalendar(
  crop: string,
  country: string,
): CropCalendar | undefined {
  return CROP_CALENDARS.find(
    (c) => c.crop.toLowerCase() === crop.toLowerCase() && c.country === country.toUpperCase(),
  )
}

/**
 * Find all calendars for a country.
 */
export function getCropCalendarsForCountry(country: string): CropCalendar[] {
  return CROP_CALENDARS.filter(
    (c) => c.country === country.toUpperCase(),
  )
}

/**
 * Find all calendars for a specific crop across all countries.
 */
export function getCropCalendarsForCrop(crop: string): CropCalendar[] {
  return CROP_CALENDARS.filter(
    (c) => c.crop.toLowerCase() === crop.toLowerCase(),
  )
}

/**
 * Determine the current growth stage for a crop calendar at a given date.
 * Uses day-of-year comparison against stage boundaries.
 */
export function getCurrentStage(
  calendar: CropCalendar,
  date: Date = new Date(),
): CropCalendarStage | undefined {
  const startOfYear = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))

  for (const stage of calendar.stages) {
    // Handle wrap-around stages (e.g., day 330-365 + day 1-60)
    if (stage.endDay >= stage.startDay) {
      // Normal range within same year
      if (dayOfYear >= stage.startDay && dayOfYear <= stage.endDay) {
        return stage
      }
    } else {
      // Wraps around year end
      if (dayOfYear >= stage.startDay || dayOfYear <= stage.endDay) {
        return stage
      }
    }
  }

  return calendar.stages[calendar.stages.length - 1] // fallback to last stage
}

// ============================================================
// Advisory Generation
// AI-based growing advice by comparing actual satellite
// measurements against expected crop calendar benchmarks.
// ============================================================

/**
 * Generate agronomic advisories by comparing real NDVI and rainfall
 * against the expected values for the current crop growth stage.
 *
 * Returns an array of alerts sorted by severity (CRITICAL first).
 */
export function getAdvisory(
  calendar: CropCalendar,
  currentStage: CropCalendarStage | undefined,
  currentNDVI: number,
  currentRainfall: number | null,
): AdvisoryAlert[] {
  if (!currentStage) {
    return []
  }

  const alerts: AdvisoryAlert[] = []
  const now = new Date()

  // ─── NDVI comparison ───
  const { min: ndviMin, max: ndviMax } = currentStage.expectedNDVI

  if (currentNDVI < ndviMin * 0.7) {
    // Severely below expected — potential crop failure
    alerts.push({
      severity: 'CRITICAL',
      category: 'VEGETATION',
      message: `NDVI (${currentNDVI.toFixed(2)}) is critically below expected range (${ndviMin.toFixed(2)}–${ndviMax.toFixed(2)}) for "${currentStage.name}" stage of ${calendar.crop}`,
      recommendation: 'Immediate field verification required. Check for pest/disease damage, severe water stress, or nutrient deficiency. Consider emergency irrigation or input application.',
      confidence: 0.85,
      detectedAt: now,
    })
  } else if (currentNDVI < ndviMin) {
    // Below expected
    alerts.push({
      severity: 'WARNING',
      category: 'VEGETATION',
      message: `NDVI (${currentNDVI.toFixed(2)}) is below expected minimum (${ndviMin.toFixed(2)}) for "${currentStage.name}" stage`,
      recommendation: 'Investigate possible causes: water stress, nutrient deficiency, pest damage, or weed competition. Apply targeted intervention within 7–14 days.',
      confidence: 0.7,
      detectedAt: now,
    })
  } else if (currentNDVI > ndviMax * 1.15) {
    // Abnormally high — possible weed infestation or agroforestry canopy
    alerts.push({
      severity: 'INFO',
      category: 'VEGETATION',
      message: `NDVI (${currentNDVI.toFixed(2)}) exceeds expected maximum (${ndviMax.toFixed(2)}) for "${currentStage.name}" stage`,
      recommendation: 'High NDVI may indicate heavy weed growth, intercropping canopy, or agroforestry shading. Verify crop-to-weed ratio in the field.',
      confidence: 0.6,
      detectedAt: now,
    })
  }

  // ─── Rainfall comparison ───
  if (currentRainfall !== null) {
    const { minMm: rainMin, maxMm: rainMax } = currentStage.expectedRainfall

    if (currentRainfall < rainMin * 0.4) {
      alerts.push({
        severity: 'CRITICAL',
        category: 'RAINFALL',
        message: `Rainfall (${currentRainfall.toFixed(0)}mm/month) is critically low for "${currentStage.name}" — expected ${rainMin}–${rainMax}mm`,
        recommendation: 'Severe moisture deficit detected. Implement emergency irrigation. If rainfed, advise farmer of potential yield loss and consider drought-tolerant varieties for next season.',
        confidence: 0.8,
        detectedAt: now,
      })
    } else if (currentRainfall < rainMin) {
      alerts.push({
        severity: 'WARNING',
        category: 'RAINFALL',
        message: `Rainfall (${currentRainfall.toFixed(0)}mm/month) is below expected minimum (${rainMin}mm) for "${currentStage.name}"`,
        recommendation: 'Below-average rainfall. Monitor soil moisture. Consider mulching, conservation agriculture, or supplemental irrigation if available.',
        confidence: 0.7,
        detectedAt: now,
      })
    } else if (currentRainfall > rainMax * 1.5) {
      alerts.push({
        severity: 'WARNING',
        category: 'RAINFALL',
        message: `Rainfall (${currentRainfall.toFixed(0)}mm/month) is excessively high — expected ${rainMin}–${rainMax}mm`,
        recommendation: 'Excessive rainfall may cause waterlogging, leaching, and increased disease pressure. Improve drainage channels. Watch for fungal disease outbreaks.',
        confidence: 0.75,
        detectedAt: now,
      })
    }
  }

  // ─── Stage-specific risk reminders ───
  // Include top risks from the calendar for the current stage
  const stageRisks = currentStage.risks.slice(0, 3)
  if (stageRisks.length > 0) {
    alerts.push({
      severity: 'INFO',
      category: 'GENERAL',
      message: `Key risks for ${calendar.crop} "${currentStage.name}" stage in ${calendar.country}`,
      recommendation: stageRisks.map((r, i) => `${i + 1}. ${r}`).join('\n'),
      confidence: 0.5,
      detectedAt: now,
    })
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return alerts
}

/**
 * Get the total count of unique crop-country combinations in the database.
 */
export function getCalendarStats(): { totalCalendars: number; countries: string[]; crops: string[] } {
  const countries = [...new Set(CROP_CALENDARS.map((c) => c.country))]
  const crops = [...new Set(CROP_CALENDARS.map((c) => `${c.crop}${c.variety ? ` (${c.variety})` : ''}`))]
  return { totalCalendars: CROP_CALENDARS.length, countries, crops }
}