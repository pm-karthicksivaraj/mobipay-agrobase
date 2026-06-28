// ============================================
// AGROBASE V3 — EU CN Code Mapping for CBAM
//
// Maps agricultural commodities to EU Combined
// Nomenclature (CN) codes used in CBAM declarations.
//
// Current CBAM scope (EU Reg. 2023/956):
//   Cement, Iron/Steel, Aluminum, Fertilizers,
//   Electricity, Hydrogen
//
// Agricultural commodities are pre-mapped for
// future CBAM scope expansion (expected 2026-2030).
// ============================================

// ─────────────────────────────────────────────
// CN Code Database
// ─────────────────────────────────────────────

export interface CnCodeEntry {
  code: string          // Full 8 or 10-digit CN code
  chapter: string       // 2-digit chapter
  description: string   // Full EU description
  commodity: string     // Agrobase commodity key
  inCbamScope: boolean  // Currently in CBAM scope
  unit: string          // Statistical unit (tonnes, kg, etc.)
  notes?: string
}

// ─────────────────────────────────────────────
// Agricultural commodity → CN codes
// ─────────────────────────────────────────────

const AGRICULTURAL_CN_CODES: CnCodeEntry[] = [
  // ── Chapter 09: Coffee, tea, mate and spices ──
  {
    code: '09011100',
    chapter: '09',
    description: 'Coffee, not roasted, not decaffeinated',
    commodity: 'COFFEE',
    inCbamScope: false,
    unit: 'tonnes',
    notes: 'Green coffee (cherries or parchment)',
  },
  {
    code: '09011200',
    chapter: '09',
    description: 'Coffee, not roasted, decaffeinated',
    commodity: 'COFFEE',
    inCbamScope: false,
    unit: 'tonnes',
    notes: 'Decaffeinated green coffee',
  },
  {
    code: '09012100',
    chapter: '09',
    description: 'Coffee, roasted, not decaffeinated',
    commodity: 'COFFEE_ROASTED',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '09012200',
    chapter: '09',
    description: 'Coffee, roasted, decaffeinated',
    commodity: 'COFFEE_ROASTED',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '09021000',
    chapter: '09',
    description: 'Tea, green (unfermented), in immediate packings <= 3kg',
    commodity: 'TEA',
    inCbamScope: false,
    unit: 'kg',
  },
  {
    code: '09022000',
    chapter: '09',
    description: 'Tea, green (unfermented), in packings > 3kg',
    commodity: 'TEA',
    inCbamScope: false,
    unit: 'kg',
  },
  {
    code: '09023000',
    chapter: '09',
    description: 'Tea, black (fermented) and partly fermented, in packings <= 3kg',
    commodity: 'TEA_BLACK',
    inCbamScope: false,
    unit: 'kg',
  },
  {
    code: '09024000',
    chapter: '09',
    description: 'Tea, black (fermented) and partly fermented, in packings > 3kg',
    commodity: 'TEA_BLACK',
    inCbamScope: false,
    unit: 'kg',
  },

  // ── Chapter 10: Cereals ──
  {
    code: '10051000',
    chapter: '10',
    description: 'Maize (corn), seed',
    commodity: 'MAIZE',
    inCbamScope: false,
    unit: 'tonnes',
    notes: 'Seed maize for sowing',
  },
  {
    code: '10059000',
    chapter: '10',
    description: 'Maize (corn), other than seed',
    commodity: 'MAIZE',
    inCbamScope: false,
    unit: 'tonnes',
    notes: 'Includes field corn, sweet corn (unshelled)',
  },
  {
    code: '10061000',
    chapter: '10',
    description: 'Rice, husked (brown rice)',
    commodity: 'RICE',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '10062000',
    chapter: '10',
    description: 'Rice, milled, whether or not polished or glazed',
    commodity: 'RICE',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '10063000',
    chapter: '10',
    description: 'Rice, semi-milled or wholly milled, whether or not polished or glazed',
    commodity: 'RICE',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '10064000',
    chapter: '10',
    description: 'Rice, broken',
    commodity: 'RICE',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '10011000',
    chapter: '10',
    description: 'Wheat and meslin, seed',
    commodity: 'WHEAT',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '10019900',
    chapter: '10',
    description: 'Wheat and meslin, other than seed',
    commodity: 'WHEAT',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '10020000',
    chapter: '10',
    description: 'Rye',
    commodity: 'RYE',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '10030000',
    chapter: '10',
    description: 'Barley',
    commodity: 'BARLEY',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '10040000',
    chapter: '10',
    description: 'Oats',
    commodity: 'OATS',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '10070000',
    chapter: '10',
    description: 'Grain sorghum',
    commodity: 'SORGHUM',
    inCbamScope: false,
    unit: 'tonnes',
  },

  // ── Chapter 07: Edible vegetables, roots, tubers ──
  {
    code: '07131000',
    chapter: '07',
    description: 'Dried leguminous vegetables, shelled: chickpeas (garbanzos)',
    commodity: 'CHICKPEAS',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '07133100',
    chapter: '07',
    description: 'Dried leguminous vegetables, shelled: beans (Vigna spp.)',
    commodity: 'BEANS',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '07133200',
    chapter: '07',
    description: 'Dried leguminous vegetables, shelled: beans (Phaseolus spp.)',
    commodity: 'BEANS',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '07133900',
    chapter: '07',
    description: 'Dried leguminous vegetables, shelled: beans, other',
    commodity: 'BEANS',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '07142000',
    chapter: '07',
    description: 'Dried leguminous vegetables, shelled: lentils',
    commodity: 'LENTILS',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '07139000',
    chapter: '07',
    description: 'Dried leguminous vegetables, shelled: other',
    commodity: 'BEANS',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '07141000',
    chapter: '07',
    description: 'Cassava (manioc), fresh or chilled',
    commodity: 'CASSAVA',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '07142000',
    chapter: '07',
    description: 'Sweet potatoes, fresh or chilled',
    commodity: 'SWEET_POTATO',
    inCbamScope: false,
    unit: 'tonnes',
  },

  // ── Chapter 12: Oil seeds, nuts, kernels ──
  {
    code: '12010000',
    chapter: '12',
    description: 'Soya beans, whether or not broken',
    commodity: 'SOYBEANS',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '12021000',
    chapter: '12',
    description: 'Ground-nuts, not roasted or otherwise cooked, shelled',
    commodity: 'GROUNDNUT',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '12022000',
    chapter: '12',
    description: 'Ground-nuts, not roasted or otherwise cooked, in shell',
    commodity: 'GROUNDNUT',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '12071000',
    chapter: '12',
    description: 'Palm nuts and kernels',
    commodity: 'OIL_PALM',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '12074000',
    chapter: '12',
    description: 'Sesame seeds',
    commodity: 'SESAME',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '12075000',
    chapter: '12',
    description: 'Safflower seeds',
    commodity: 'SAFFLOWER',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '12076000',
    chapter: '12',
    description: 'Sunflower seeds',
    commodity: 'SUNFLOWER',
    inCbamScope: false,
    unit: 'tonnes',
  },

  // ── Chapter 15: Animal/vegetable fats and oils ──
  {
    code: '15111000',
    chapter: '15',
    description: 'Palm oil, crude',
    commodity: 'PALM_OIL_CRUDE',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '15119000',
    chapter: '15',
    description: 'Palm oil and its fractions, other than crude',
    commodity: 'PALM_OIL',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '15131100',
    chapter: '15',
    description: 'Coconut (copra) oil, crude',
    commodity: 'COCONUT_OIL',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '15141100',
    chapter: '15',
    description: 'Rape, colza or mustard oil, crude',
    commodity: 'RAPESEED_OIL',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '15121100',
    chapter: '15',
    description: 'Sunflower-seed or safflower oil, crude',
    commodity: 'SUNFLOWER_OIL',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '15071000',
    chapter: '15',
    description: 'Soya-bean oil, crude',
    commodity: 'SOYBEAN_OIL',
    inCbamScope: false,
    unit: 'tonnes',
  },

  // ── Chapter 17: Sugars and sugar confectionery ──
  {
    code: '17011100',
    chapter: '17',
    description: 'Raw cane sugar',
    commodity: 'SUGARCANE',
    inCbamScope: false,
    unit: 'tonnes',
    notes: 'Raw sugar from sugarcane, not refined',
  },
  {
    code: '17011200',
    chapter: '17',
    description: 'Raw beet sugar',
    commodity: 'SUGARBEET',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '17019900',
    chapter: '17',
    description: 'Cane sugar, other than raw',
    commodity: 'SUGARCANE',
    inCbamScope: false,
    unit: 'tonnes',
  },

  // ── Chapter 18: Cocoa and cocoa preparations ──
  {
    code: '18010000',
    chapter: '18',
    description: 'Cocoa beans, whole or broken, raw or roasted',
    commodity: 'COCOA',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '18020000',
    chapter: '18',
    description: 'Cocoa shells, husks, skins and other cocoa waste',
    commodity: 'COCOA',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '18031000',
    chapter: '18',
    description: 'Cocoa paste, not defatted',
    commodity: 'COCOA_PASTE',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '18040000',
    chapter: '18',
    description: 'Cocoa butter, fat and oil',
    commodity: 'COCOA_BUTTER',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '18050000',
    chapter: '18',
    description: 'Cocoa powder, not containing added sugar',
    commodity: 'COCOA_POWDER',
    inCbamScope: false,
    unit: 'tonnes',
  },

  // ── Chapter 44: Wood and articles of wood (EUDR-relevant) ──
  {
    code: '44011000',
    chapter: '44',
    description: 'Wood fuel, in logs, in billets, in twigs, in faggots or similar forms',
    commodity: 'TIMBER_FUEL',
    inCbamScope: false,
    unit: 'm3',
  },
  {
    code: '44031100',
    chapter: '44',
    description: 'Tropical wood, sawn or chipped lengthwise, of teak',
    commodity: 'TIMBER_TEAK',
    inCbamScope: false,
    unit: 'm3',
  },
  {
    code: '44039900',
    chapter: '44',
    description: 'Wood sawn or chipped lengthwise, tropical wood, other',
    commodity: 'TIMBER',
    inCbamScope: false,
    unit: 'm3',
  },

  // ── Other EUDR/CBAM-relevant commodities ──
  {
    code: '08013100',
    chapter: '08',
    description: 'Cashew nuts, in shell, fresh or dried',
    commodity: 'CASHEW',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '08013200',
    chapter: '08',
    description: 'Cashew nuts, shelled, fresh or dried',
    commodity: 'CASHEW',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '08025000',
    chapter: '08',
    description: 'Avocados, fresh or dried',
    commodity: 'AVOCADO',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '08022100',
    chapter: '08',
    description: 'Brazil nuts, in shell, fresh or dried',
    commodity: 'BRAZIL_NUT',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '08023100',
    chapter: '08',
    description: 'Macadamia nuts, in shell, fresh or dried',
    commodity: 'MACADAMIA',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '15162000',
    chapter: '15',
    description: 'Shea oil and fractions',
    commodity: 'SHEA',
    inCbamScope: false,
    unit: 'tonnes',
    notes: 'Important for Ghana/West Africa EUDR compliance',
  },
  {
    code: '52010000',
    chapter: '52',
    description: 'Cotton, not carded or combed',
    commodity: 'COTTON',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '24011000',
    chapter: '24',
    description: 'Tobacco, not stripped/stemmed',
    commodity: 'TOBACCO',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '53011000',
    chapter: '53',
    description: 'Jute and other textile bast fibers, raw or retted',
    commodity: 'JUTE',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '53021000',
    chapter: '53',
    description: 'Sisal, raw',
    commodity: 'SISAL',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '14041000',
    chapter: '14',
    description: 'Raw vegetable materials, of a kind used primarily in brooms or brushes',
    commodity: 'SORGHUM_BROOM',
    inCbamScope: false,
    unit: 'tonnes',
  },
  {
    code: '12119000',
    chapter: '12',
    description: 'Other plants and parts, of a kind used in perfumery, pharmacy, or insecticidal',
    commodity: 'PYRETHRUM',
    inCbamScope: false,
    unit: 'tonnes',
    notes: 'Pyrethrum is a key East African export crop',
  },
  {
    code: '06031000',
    chapter: '06',
    description: 'Roses, cut',
    commodity: 'FLOWERS_ROSES',
    inCbamScope: false,
    unit: 'thousand_stems',
    notes: 'Kenya is a major rose exporter',
  },
  {
    code: '06031100',
    chapter: '06',
    description: 'Carnations, cut',
    commodity: 'FLOWERS_CARNATIONS',
    inCbamScope: false,
    unit: 'thousand_stems',
  },
  {
    code: '09041100',
    chapter: '09',
    description: 'Pepper, neither crushed nor ground',
    commodity: 'PEPPER',
    inCbamScope: false,
    unit: 'kg',
  },
  {
    code: '09050000',
    chapter: '09',
    description: 'Vanilla',
    commodity: 'VANILLA',
    inCbamScope: false,
    unit: 'kg',
  },
  {
    code: '09070000',
    chapter: '09',
    description: 'Cloves (whole fruit, stems, powder)',
    commodity: 'CLOVES',
    inCbamScope: false,
    unit: 'kg',
  },
  {
    code: '09109100',
    chapter: '09',
    description: 'Ginger, neither crushed nor ground',
    commodity: 'GINGER',
    inCbamScope: false,
    unit: 'kg',
  },
  {
    code: '55121000',
    chapter: '55',
    description: 'Sewn articles of woven fabric, cotton, used for agricultural purposes',
    commodity: 'COTTON_BAGS',
    inCbamScope: false,
    unit: 'tonnes',
  },
]

// ─────────────────────────────────────────────
// CBAM-scoped goods (currently in scope)
// ─────────────────────────────────────────────

const CBAM_CURRENT_SCOPE: CnCodeEntry[] = [
  // ── Chapter 25: Cement ──
  {
    code: '25231000',
    chapter: '25',
    description: 'Portland cement (clinker)',
    commodity: 'CEMENT_CLINKER',
    inCbamScope: true,
    unit: 'tonnes',
    notes: 'CBAM in scope since Oct 2023 (transitional)',
  },
  {
    code: '25232100',
    chapter: '25',
    description: 'White cement, whether or not artificially coloured',
    commodity: 'CEMENT_WHITE',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '25232900',
    chapter: '25',
    description: 'Other Portland cement',
    commodity: 'CEMENT_PORTLAND',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '25233000',
    chapter: '25',
    description: 'Aluminous cement',
    commodity: 'CEMENT_ALUMINOUS',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '25239000',
    chapter: '25',
    description: 'Other hydraulic cements',
    commodity: 'CEMENT_HYDRAULIC',
    inCbamScope: true,
    unit: 'tonnes',
  },

  // ── Chapter 72: Iron and steel ──
  {
    code: '72071100',
    chapter: '72',
    description: 'Semi-finished products of iron or non-alloy steel, containing < 0.25% C',
    commodity: 'STEEL_SEMI_FINISHED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72071200',
    chapter: '72',
    description: 'Semi-finished products of iron or non-alloy steel, containing 0.25%+ C',
    commodity: 'STEEL_SEMI_FINISHED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72081000',
    chapter: '72',
    description: 'Hot-rolled products of iron/non-alloy steel, in coils',
    commodity: 'STEEL_HOT_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72082500',
    chapter: '72',
    description: 'Hot-rolled products of iron/non-alloy steel, coils, 4.75mm+ thickness',
    commodity: 'STEEL_HOT_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72082600',
    chapter: '72',
    description: 'Hot-rolled products of iron/non-alloy steel, coils, 3mm < thickness < 4.75mm',
    commodity: 'STEEL_HOT_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72082700',
    chapter: '72',
    description: 'Hot-rolled products of iron/non-alloy steel, coils, 1.5mm < thickness < 3mm',
    commodity: 'STEEL_HOT_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72083600',
    chapter: '72',
    description: 'Hot-rolled products of iron/non-alloy steel, not in coils, 10mm+ thickness',
    commodity: 'STEEL_HOT_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72083700',
    chapter: '72',
    description: 'Hot-rolled products of iron/non-alloy steel, not in coils, 4.75mm < thickness < 10mm',
    commodity: 'STEEL_HOT_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72083800',
    chapter: '72',
    description: 'Hot-rolled products of iron/non-alloy steel, not in coils, 3mm < thickness < 4.75mm',
    commodity: 'STEEL_HOT_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72083900',
    chapter: '72',
    description: 'Hot-rolled products of iron/non-alloy steel, not in coils, < 1.5mm thickness',
    commodity: 'STEEL_HOT_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72091500',
    chapter: '72',
    description: 'Cold-rolled products of iron/non-alloy steel, 600mm+ width, 3mm+ thickness',
    commodity: 'STEEL_COLD_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72091600',
    chapter: '72',
    description: 'Cold-rolled products of iron/non-alloy steel, 600mm+ width, 1mm < thickness < 3mm',
    commodity: 'STEEL_COLD_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72091700',
    chapter: '72',
    description: 'Cold-rolled products of iron/non-alloy steel, 600mm+ width, 0.5mm < thickness < 1mm',
    commodity: 'STEEL_COLD_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72091800',
    chapter: '72',
    description: 'Cold-rolled products of iron/non-alloy steel, 600mm+ width, < 0.5mm thickness',
    commodity: 'STEEL_COLD_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72092500',
    chapter: '72',
    description: 'Cold-rolled products of iron/non-alloy steel, 600mm+ width, 3mm+ thickness',
    commodity: 'STEEL_COLD_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72092600',
    chapter: '72',
    description: 'Cold-rolled products of iron/non-alloy steel, < 600mm width, 1mm < thickness < 3mm',
    commodity: 'STEEL_COLD_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72092700',
    chapter: '72',
    description: 'Cold-rolled products of iron/non-alloy steel, < 600mm width, 0.5mm < thickness < 1mm',
    commodity: 'STEEL_COLD_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72092800',
    chapter: '72',
    description: 'Cold-rolled products of iron/non-alloy steel, < 600mm width, < 0.5mm thickness',
    commodity: 'STEEL_COLD_ROLLED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72111300',
    chapter: '72',
    description: 'Hot-rolled bars/rods of stainless steel',
    commodity: 'STEEL_STAINLESS_BARS',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72111400',
    chapter: '72',
    description: 'Hot-rolled bars/rods of stainless steel, < 600mm width',
    commodity: 'STEEL_STAINLESS_BARS',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72191100',
    chapter: '72',
    description: 'Stainless steel flat-rolled products, 600mm+ width, 10mm+ thickness',
    commodity: 'STEEL_STAINLESS_FLAT',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72191200',
    chapter: '72',
    description: 'Stainless steel flat-rolled products, 600mm+ width, 4.75mm < thickness < 10mm',
    commodity: 'STEEL_STAINLESS_FLAT',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72191300',
    chapter: '72',
    description: 'Stainless steel flat-rolled products, 600mm+ width, 3mm < thickness < 4.75mm',
    commodity: 'STEEL_STAINLESS_FLAT',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72191400',
    chapter: '72',
    description: 'Stainless steel flat-rolled products, 600mm+ width, 1mm < thickness < 3mm',
    commodity: 'STEEL_STAINLESS_FLAT',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72192100',
    chapter: '72',
    description: 'Stainless steel flat-rolled products, < 600mm width, 10mm+ thickness',
    commodity: 'STEEL_STAINLESS_FLAT',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72192200',
    chapter: '72',
    description: 'Stainless steel flat-rolled products, < 600mm width, 4.75mm < thickness < 10mm',
    commodity: 'STEEL_STAINLESS_FLAT',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72192300',
    chapter: '72',
    description: 'Stainless steel flat-rolled products, < 600mm width, 3mm < thickness < 4.75mm',
    commodity: 'STEEL_STAINLESS_FLAT',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72192400',
    chapter: '72',
    description: 'Stainless steel flat-rolled products, < 600mm width, 1mm < thickness < 3mm',
    commodity: 'STEEL_STAINLESS_FLAT',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72251100',
    chapter: '72',
    description: 'Other alloy steel flat-rolled products, 600mm+ width, 4.75mm+ thickness',
    commodity: 'STEEL_ALLOY_FLAT',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '72251900',
    chapter: '72',
    description: 'Other alloy steel flat-rolled products, 600mm+ width, < 4.75mm thickness',
    commodity: 'STEEL_ALLOY_FLAT',
    inCbamScope: true,
    unit: 'tonnes',
  },

  // ── Chapter 76: Aluminum ──
  {
    code: '76011000',
    chapter: '76',
    description: 'Unwrought aluminium, not alloyed',
    commodity: 'ALUMINUM_UNWROUGHT',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '76012000',
    chapter: '76',
    description: 'Unwrought aluminium, alloyed',
    commodity: 'ALUMINUM_ALLOYED',
    inCbamScope: true,
    unit: 'tonnes',
  },

  // ── Chapter 31: Fertilizers ──
  {
    code: '31021000',
    chapter: '31',
    description: 'Urea, whether or not in aqueous solution',
    commodity: 'FERTILIZER_UREA',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31022100',
    chapter: '31',
    description: 'Ammonium sulphate',
    commodity: 'FERTILIZER_AMMONIUM_SULPHATE',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31022900',
    chapter: '31',
    description: 'Other ammonium sulphates',
    commodity: 'FERTILIZER_AMMONIUM_SULPHATE',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31023000',
    chapter: '31',
    description: 'Ammonium nitrate, whether or not in aqueous solution',
    commodity: 'FERTILIZER_AMMONIUM_NITRATE',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31024000',
    chapter: '31',
    description: 'Mixtures of ammonium nitrate with ammonium sulphate',
    commodity: 'FERTILIZER_MIXED',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31025000',
    chapter: '31',
    description: 'Sodium nitrate',
    commodity: 'FERTILIZER_SODIUM_NITRATE',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31026000',
    chapter: '31',
    description: 'Calcium ammonium nitrate',
    commodity: 'FERTILIZER_CAN',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31028000',
    chapter: '31',
    description: 'Other nitrogenous fertilizers, mixtures',
    commodity: 'FERTILIZER_NITROGENOUS',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31031000',
    chapter: '31',
    description: 'Superphosphates',
    commodity: 'FERTILIZER_SUPERPHOSPHATE',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31032000',
    chapter: '31',
    description: 'Ammonium dihydrogenorthophosphate',
    commodity: 'FERTILIZER_DAP',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31033000',
    chapter: '31',
    description: 'Diammonium hydrogenorthophosphate (DAP)',
    commodity: 'FERTILIZER_DAP',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31051000',
    chapter: '31',
    description: 'Mineral or chemical fertilizers containing nitrogen, phosphorus, potassium (NPK)',
    commodity: 'FERTILIZER_NPK',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31052000',
    chapter: '31',
    description: 'Mineral or chemical fertilizers containing phosphorus and potassium',
    commodity: 'FERTILIZER_PK',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31053000',
    chapter: '31',
    description: 'Mineral or chemical fertilizers containing nitrogen',
    commodity: 'FERTILIZER_NITROGENOUS',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31054000',
    chapter: '31',
    description: 'Mineral or chemical fertilizers containing potassium',
    commodity: 'FERTILIZER_POTASSIC',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31055100',
    chapter: '31',
    description: 'Fertilizers, containing nitrates of phosphorus and potassium',
    commodity: 'FERTILIZER_NPK',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31055900',
    chapter: '31',
    description: 'Other compound fertilizers',
    commodity: 'FERTILIZER_COMPOUND',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31056000',
    chapter: '31',
    description: 'Fertilizers in tablets or similar forms, in packages <= 10kg',
    commodity: 'FERTILIZER_TABLETS',
    inCbamScope: true,
    unit: 'tonnes',
  },
  {
    code: '31059000',
    chapter: '31',
    description: 'Other mineral or chemical fertilizers',
    commodity: 'FERTILIZER_OTHER',
    inCbamScope: true,
    unit: 'tonnes',
  },

  // ── Chapter 27: Electricity ──
  {
    code: '27160000',
    chapter: '27',
    description: 'Electrical energy (electricity)',
    commodity: 'ELECTRICITY',
    inCbamScope: true,
    unit: 'MWh',
    notes: 'CBAM in scope since Jan 2025',
  },

  // ── Chapter 27: Hydrogen ──
  {
    code: '28041000',
    chapter: '28',
    description: 'Hydrogen',
    commodity: 'HYDROGEN',
    inCbamScope: true,
    unit: 'tonnes',
    notes: 'CBAM in scope since Jan 2025',
  },
]

// ─────────────────────────────────────────────
// Build lookup indexes
// ─────────────────────────────────────────────

// Commodity → primary CN code (for backward compat)
const COMMODITY_PRIMARY_CODE = new Map<string, string>()
// Commodity → all matching CN entries
const COMMODITY_ALL_CODES = new Map<string, CnCodeEntry[]>()
// Code string → full entry
const CODE_LOOKUP = new Map<string, CnCodeEntry>()

const ALL_CODES = [...AGRICULTURAL_CN_CODES, ...CBAM_CURRENT_SCOPE]

for (const entry of ALL_CODES) {
  CODE_LOOKUP.set(entry.code, entry)

  const all = COMMODITY_ALL_CODES.get(entry.commodity) ?? []
  all.push(entry)
  COMMODITY_ALL_CODES.set(entry.commodity, all)

  // Only set primary for agricultural entries (first match)
  if (!entry.inCbamScope || !COMMODITY_PRIMARY_CODE.has(entry.commodity)) {
    if (!COMMODITY_PRIMARY_CODE.has(entry.commodity)) {
      COMMODITY_PRIMARY_CODE.set(entry.commodity, entry.code)
    }
  }
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Get the primary CN code for a commodity.
 * Returns '9999' (unclassified) if not found.
 */
export function getCnCode(commodity: string): string {
  const normalized = commodity.toUpperCase().replace(/\s+/g, '_')
  return COMMODITY_PRIMARY_CODE.get(normalized) ?? '9999'
}

/**
 * Get all CN code entries for a commodity.
 */
export function getCnCodesForCommodity(commodity: string): CnCodeEntry[] {
  const normalized = commodity.toUpperCase().replace(/\s+/g, '_')
  return COMMODITY_ALL_CODES.get(normalized) ?? []
}

/**
 * Look up a specific CN code entry.
 */
export function lookupCnCode(code: string): CnCodeEntry | undefined {
  return CODE_LOOKUP.get(code)
}

/**
 * Search CN codes by text query (matches commodity key, description, or code).
 */
export function searchCnCodes(query: string): CnCodeEntry[] {
  const q = query.toLowerCase().trim()
  if (!q) return []

  return ALL_CODES.filter((entry) =>
    entry.code.includes(q) ||
    entry.commodity.toLowerCase().includes(q) ||
    entry.description.toLowerCase().includes(q),
  )
}

/**
 * Get all CN codes currently in CBAM scope.
 */
export function getCbamScopeCodes(): CnCodeEntry[] {
  return CBAM_CURRENT_SCOPE
}

/**
 * Get all agricultural CN codes (future CBAM scope).
 */
export function getAgriculturalCodes(): CnCodeEntry[] {
  return AGRICULTURAL_CN_CODES
}

/**
 * Get all CN code entries.
 */
export function getAllCnCodes(): CnCodeEntry[] {
  return ALL_CODES
}

/**
 * Get commodity categories grouped by chapter.
 */
export function getCnCodeByChapter(): Record<string, { chapter: string; entries: CnCodeEntry[] }> {
  const chapters = new Map<string, CnCodeEntry[]>()
  for (const entry of ALL_CODES) {
    const existing = chapters.get(entry.chapter) ?? []
    existing.push(entry)
    chapters.set(entry.chapter, existing)
  }

  const result: Record<string, { chapter: string; entries: CnCodeEntry[] }> = {}
  for (const [chapter, entries] of Array.from(chapters.entries())) {
    result[chapter] = { chapter, entries }
  }
  return result
}

/**
 * Check if a commodity/CN code is in the current CBAM scope.
 */
export function isInCbamScope(commodityOrCode: string): boolean {
  // Check if it's a CN code
  const codeEntry = CODE_LOOKUP.get(commodityOrCode)
  if (codeEntry) return codeEntry.inCbamScope

  // Check if it's a commodity
  const entries = COMMODITY_ALL_CODES.get(commodityOrCode.toUpperCase().replace(/\s+/g, '_'))
  if (entries) return entries.some((e) => e.inCbamScope)

  return false
}

/**
 * Get CBAM reporting-relevant commodity summary.
 * Returns primary code + scope info for a list of commodities.
 */
export function getCommodityCbamInfo(commodities: string[]): Array<{
  commodity: string
  cnCode: string
  inScope: boolean
  description: string
}> {
  return commodities.map((c) => {
    const normalized = c.toUpperCase().replace(/\s+/g, '_')
    const code = getCnCode(normalized)
    const entry = CODE_LOOKUP.get(code)
    return {
      commodity: c,
      cnCode: code,
      inScope: isInCbamScope(normalized),
      description: entry?.description ?? 'Unknown commodity',
    }
  })
}