/**
 * Farm5x Framework — Practice Definitions for All Crop Verticals
 *
 * The "5x" means: 1 Must (mandatory practice) + 5 Reduces (emission-reducing
 * interventions). When all 6 are adopted, the farmer qualifies for carbon
 * credits under Verra VM0042 / Gold Standard.
 *
 * Variants:
 *   1M5R — Rice (Alternate Wetting & Drying as Must)
 *   1M5C — Coffee (Shade tree integration as Must)
 *   1M5M — Maize/Field Crops (Conservation agriculture as Must)
 *   1M5K — Cocoa (Agroforestry shade system as Must)
 *   1M5T — Tea (Soil conservation + contour planting as Must)
 *   1M5D — Dairy/Livestock (Improved forage as Must)
 *   1M5V — Vegetables (Crop rotation as Must)
 *   1M5O — Orchard/Fruit (Cover cropping as Must)
 *   1M5A — Aquaculture (Mangrove buffer integration as Must)
 *   1M5F — Forestry/Agroforestry (Reduced-impact logging as Must)
 *
 * Each practice has:
 *   - code: unique identifier (e.g. "1M5C_MUST", "1M5C_R1")
 *   - label: human-readable name
 *   - description: what the practice is
 *   - isMandatory: true for the "Must", false for the 5 Reduces
 *   - emissionReductionPct: expected % reduction from this practice alone
 *   - verificationMethod: how to verify adoption (SATELLITE, FIELD_OFFICER, PHOTO, IoT)
 *   - carbonCreditEligible: whether this practice counts toward Verra credits
 *   - sdgGoals: which UN SDGs this practice contributes to
 */

export type Farm5xVariant =
  | '1M5R' | '1M5C' | '1M5M' | '1M5K' | '1M5T'
  | '1M5D' | '1M5V' | '1M5O' | '1M5A' | '1M5F'

export interface Farm5xPractice {
  code: string
  label: string
  description: string
  isMandatory: boolean
  emissionReductionPct: number
  verificationMethod: 'SATELLITE' | 'FIELD_OFFICER' | 'PHOTO' | 'IoT' | 'COOPERATIVE_LOG'
  carbonCreditEligible: boolean
  sdgGoals: number[]
}

export interface Farm5xVariantDefinition {
  variant: Farm5xVariant
  cropType: string
  cropLabel: string
  icon: string
  targetReduction: string
  mandatoryPractice: Farm5xPractice
  reducePractices: Farm5xPractice[]
  sustainabilityStandard: string
  ipccEmissionModel: string
  // DREAM-specific data sources per phase
  dreamDataSources: {
    D: string  // Data collection source
    R: string  // Remote sensing source
    E: string  // Event detection method
    A: string  // Analytics (IPCC equation)
    M: string  // Monitoring metric
  }
}

// ════════════════════════════════════════════════════════════
// ALL FARM5x VARIANTS
// ════════════════════════════════════════════════════════════

export const FARM5X_VARIANTS: Farm5xVariantDefinition[] = [
  // ─── 1M5R — Rice ───
  {
    variant: '1M5R',
    cropType: 'RICE',
    cropLabel: 'Rice',
    icon: '🌾',
    targetReduction: '30-50% CH4 + 10-20% N2O',
    sustainabilityStandard: 'SRP (Sustainable Rice Platform) — 41 indicators',
    ipccEmissionModel: 'IPCC Tier 2 CH4: CH4 = Season × EF × SFw × SFp × SFo × SFs × SFr × SFa',
    mandatoryPractice: {
      code: '1M5R_MUST',
      label: 'Alternate Wetting and Drying (AWD)',
      description: 'Drain floodwater at specific growth stages to interrupt anaerobic CH4 production. AWD pipes/tubes monitor water level.',
      isMandatory: true,
      emissionReductionPct: 30,
      verificationMethod: 'SATELLITE',
      carbonCreditEligible: true,
      sdgGoals: [13, 2, 6],
    },
    reducePractices: [
      { code: '1M5R_R1', label: 'Organic amendments (compost, biochar)', description: 'Apply compost or biochar instead of synthetic fertilizer', isMandatory: false, emissionReductionPct: 5, verificationMethod: 'FIELD_OFFICER', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5R_R2', label: 'Site-specific nutrient management (SSNM)', description: 'Apply fertilizer based on leaf color chart / soil test', isMandatory: false, emissionReductionPct: 8, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5R_R3', label: 'Improved water management (mid-season drainage)', description: 'Drain field mid-season to reduce CH4', isMandatory: false, emissionReductionPct: 10, verificationMethod: 'SATELLITE', carbonCreditEligible: true, sdgGoals: [13, 6] },
      { code: '1M5R_R4', label: 'Low-emission rice variety (IRRI)', description: 'Plant varieties bred for lower CH4 emissions', isMandatory: false, emissionReductionPct: 7, verificationMethod: 'FIELD_OFFICER', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5R_R5', label: 'Integrated pest management (IPM)', description: 'Use biological controls instead of chemical pesticides', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 3] },
    ],
    dreamDataSources: {
      D: 'IoT water level sensors + USSD input for fertilizer rate',
      R: 'Sentinel-1 SAR for flood detection + Sentinel-2 NDVI for growth stages',
      E: 'AWD drainage events via IoT + satellite time-series disturbance detection',
      A: 'IPCC Tier 2 CH4 with 7 scaling factors (SFw, SFp, SFo, SFs, SFr, SFa)',
      M: 'Season-long water management score + yield at harvest',
    },
  },

  // ─── 1M5C — Coffee ───
  {
    variant: '1M5C',
    cropType: 'COFFEE',
    cropLabel: 'Coffee',
    icon: '☕',
    targetReduction: '25-40% N2O + 15% CO2',
    sustainabilityStandard: 'Rainforest Alliance + 4C Certification',
    ipccEmissionModel: 'IPCC Tier 2 N2O: N2O = (N_syn + N_org + N_res) × EF1 + volatilization + leaching',
    mandatoryPractice: {
      code: '1M5C_MUST',
      label: 'Shade tree integration (30% canopy cover)',
      description: 'Plant banana, albizzia, or other shade trees for 30% canopy cover. Sequesters carbon + reduces heat stress.',
      isMandatory: true,
      emissionReductionPct: 15,
      verificationMethod: 'SATELLITE',
      carbonCreditEligible: true,
      sdgGoals: [13, 15, 2],
    },
    reducePractices: [
      { code: '1M5C_R1', label: 'Organic mulch with coffee pulp compost', description: 'Apply coffee pulp compost as mulch', isMandatory: false, emissionReductionPct: 5, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5C_R2', label: 'Precision pruning (4-stem system)', description: 'Prune to 4 main stems for optimal yield + reduced input need', isMandatory: false, emissionReductionPct: 4, verificationMethod: 'FIELD_OFFICER', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5C_R3', label: 'Integrated pest management (IPM)', description: 'Biological controls for coffee berry borer + leaf rust', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 3] },
      { code: '1M5C_R4', label: 'Water harvesting trenches', description: 'Dig trenches along contours to capture rainfall', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'FIELD_OFFICER', carbonCreditEligible: true, sdgGoals: [13, 6] },
      { code: '1M5C_R5', label: 'Annual soil testing + liming', description: 'Test soil pH + nutrients, apply lime to correct acidity', isMandatory: false, emissionReductionPct: 4, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 2] },
    ],
    dreamDataSources: {
      D: 'Flutter app for input logging + cooperative ERP for produce intake',
      R: 'Sentinel-2 NDVI for canopy cover + shade tree detection',
      E: 'Shade tree planting detected via canopy cover change in satellite time-series',
      A: 'IPCC Tier 2 N2O: direct + indirect from N-input + CO2 from fuel',
      M: 'Season-long NUE + yield at harvest + quality grade at intake',
    },
  },

  // ─── 1M5M — Maize/Field Crops ───
  {
    variant: '1M5M',
    cropType: 'MAIZE',
    cropLabel: 'Maize / Field Crops',
    icon: '🌽',
    targetReduction: '20-40% N2O + 10-15% CO2',
    sustainabilityStandard: 'CSA (Climate Smart Agriculture) + GlobalG.A.P.',
    ipccEmissionModel: 'IPCC Tier 1/2 N2O: N2O_direct = N_input × EF1; + volatilization + leaching',
    mandatoryPractice: {
      code: '1M5M_MUST',
      label: 'Conservation agriculture: no-till or minimum tillage',
      description: 'No-till or minimum tillage to preserve soil carbon and reduce fuel emissions',
      isMandatory: true,
      emissionReductionPct: 15,
      verificationMethod: 'SATELLITE',
      carbonCreditEligible: true,
      sdgGoals: [13, 15, 2],
    },
    reducePractices: [
      { code: '1M5M_R1', label: 'Precision fertilisation (4R nutrient stewardship)', description: 'Right source, right rate, right time, right place', isMandatory: false, emissionReductionPct: 8, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5M_R2', label: 'Cover crops (mucuna, lablab)', description: 'Plant cover crops between maize seasons', isMandatory: false, emissionReductionPct: 5, verificationMethod: 'SATELLITE', carbonCreditEligible: true, sdgGoals: [13, 15] },
      { code: '1M5M_R3', label: 'Crop rotation with legumes', description: 'Rotate maize with beans/groundnuts for natural N-fixation', isMandatory: false, emissionReductionPct: 5, verificationMethod: 'FIELD_OFFICER', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5M_R4', label: 'Drought-tolerant varieties (Longe 10H)', description: 'Plant drought-tolerant improved varieties', isMandatory: false, emissionReductionPct: 4, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5M_R5', label: 'Post-harvest hermetic storage', description: 'Use hermetic bags to reduce post-harvest losses + pesticide use', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 2] },
    ],
    dreamDataSources: {
      D: 'Flutter app for tillage depth + fertilizer rate + USSD for cover crop reporting',
      R: 'Sentinel-2 NDVI for cover crop detection + Sentinel-1 SAR for tillage identification',
      E: 'No-till confirmed by lack of vegetation disturbance in satellite time-series',
      A: 'IPCC Tier 2 N2O: direct + indirect + SOC delta for no-till',
      M: 'Season-long NUE + soil carbon delta + yield at harvest',
    },
  },

  // ─── 1M5K — Cocoa ───
  {
    variant: '1M5K',
    cropType: 'COCOA',
    cropLabel: 'Cocoa',
    icon: '🍫',
    targetReduction: '20-35% N2O + carbon stock gain',
    sustainabilityStandard: 'Rainforest Alliance + Fairtrade',
    ipccEmissionModel: 'IPCC Tier 2 N2O + above-ground biomass carbon stock change',
    mandatoryPractice: {
      code: '1M5K_MUST',
      label: 'Agroforestry shade system (forest cocoa model)',
      description: 'Maintain agroforestry shade system with timber + fruit trees for carbon sequestration',
      isMandatory: true,
      emissionReductionPct: 20,
      verificationMethod: 'SATELLITE',
      carbonCreditEligible: true,
      sdgGoals: [13, 15, 2],
    },
    reducePractices: [
      { code: '1M5K_R1', label: 'Organic pod-borer composting', description: 'Compost cocoa pod husks instead of burning', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5K_R2', label: 'Phosphorus-efficient fertilisation', description: 'Apply P based on soil test, not blanket rate', isMandatory: false, emissionReductionPct: 4, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5K_R3', label: 'Black pod disease management', description: 'Phytosanitary pruning + resistant varieties', isMandatory: false, emissionReductionPct: 2, verificationMethod: 'FIELD_OFFICER', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5K_R4', label: 'Pruning for aeration', description: 'Prune for airflow to reduce humidity-dependent diseases', isMandatory: false, emissionReductionPct: 2, verificationMethod: 'FIELD_OFFICER', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5K_R5', label: 'Youth participation in replanting', description: 'Engage youth in cocoa replanting programmes', isMandatory: false, emissionReductionPct: 1, verificationMethod: 'COOPERATIVE_LOG', carbonCreditEligible: false, sdgGoals: [8, 2] },
    ],
    dreamDataSources: {
      D: 'Flutter app for shade tree count + pruning records',
      R: 'Sentinel-2 NDVI for canopy density + agroforestry classification',
      E: 'Shade system maintenance detected via canopy cover stability',
      A: 'N2O from N-input + biomass carbon stock change (agroforestry vs monoculture)',
      M: 'Cocoa yield + quality grade + carbon stock monitoring',
    },
  },

  // ─── 1M5T — Tea ───
  {
    variant: '1M5T',
    cropType: 'TEA',
    cropLabel: 'Tea',
    icon: '🍵',
    targetReduction: '20-30% N2O + 10% CH4',
    sustainabilityStandard: 'Rainforest Alliance + Trustea',
    ipccEmissionModel: 'IPCC Tier 2 N2O: high-N crop (200 kg N/ha/yr)',
    mandatoryPractice: {
      code: '1M5T_MUST',
      label: 'Soil conservation with contour planting + mulching',
      description: 'Plant along contours + apply mulch to prevent erosion and retain moisture',
      isMandatory: true,
      emissionReductionPct: 10,
      verificationMethod: 'SATELLITE',
      carbonCreditEligible: true,
      sdgGoals: [13, 15, 2],
    },
    reducePractices: [
      { code: '1M5T_R1', label: 'Precision nitrogen (urea split-dose)', description: 'Split urea into 4-5 applications instead of 1-2', isMandatory: false, emissionReductionPct: 8, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5T_R2', label: 'Integrated pest mgmt (red spider mite)', description: 'Biological controls for tea pests', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 3] },
      { code: '1M5T_R3', label: 'Drought-resistant clones (TRFK 303/577)', description: 'Plant drought-resistant TRFK clones', isMandatory: false, emissionReductionPct: 4, verificationMethod: 'FIELD_OFFICER', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5T_R4', label: 'Pruning cycle optimisation', description: 'Optimise pruning cycle to maintain productivity + reduce emissions', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'FIELD_OFFICER', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5T_R5', label: 'Worker welfare programs', description: 'Fair wages + housing + PPE for tea workers', isMandatory: false, emissionReductionPct: 0, verificationMethod: 'COOPERATIVE_LOG', carbonCreditEligible: false, sdgGoals: [8, 1, 10] },
    ],
    dreamDataSources: {
      D: 'Flutter app for fertilizer rate + pruning schedule',
      R: 'Sentinel-2 NDVI for tea health + Drone thermal for stress detection',
      E: 'Contour planting verified by satellite + mulch cover by NDVI',
      A: 'IPCC Tier 2 N2O from high-N fertilizer (200 kg N/ha/yr)',
      M: 'Made tea yield + quality grade + NUE per season',
    },
  },

  // ─── 1M5D — Dairy/Livestock ───
  {
    variant: '1M5D',
    cropType: 'DAIRY',
    cropLabel: 'Dairy / Livestock',
    icon: '🐄',
    targetReduction: '15-30% enteric CH4 + 40-60% manure CH4',
    sustainabilityStandard: 'GRS (Global Roundtable for Sustainable Beef) + dairy equivalents',
    ipccEmissionModel: 'IPCC Tier 2: CH4_enteric = GE × (Ym/100) × 55.65; CH4_manure = VS × Bo × 0.67 × MCF',
    mandatoryPractice: {
      code: '1M5D_MUST',
      label: 'Improved forage: brachiaria + desmodium intercrop',
      description: 'Plant improved forage (brachiaria + desmodium) to increase feed quality and reduce enteric CH4',
      isMandatory: true,
      emissionReductionPct: 15,
      verificationMethod: 'FIELD_OFFICER',
      carbonCreditEligible: true,
      sdgGoals: [13, 2, 15],
    },
    reducePractices: [
      { code: '1M5D_R1', label: 'Feed additive (3-NOP or tannin)', description: 'Add 3-NOP or tannin feed additive to reduce enteric CH4 by 30%', isMandatory: false, emissionReductionPct: 30, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5D_R2', label: 'Rotational grazing (8-paddock system)', description: 'Rotate cattle through 8 paddocks to prevent overgrazing', isMandatory: false, emissionReductionPct: 5, verificationMethod: 'SATELLITE', carbonCreditEligible: true, sdgGoals: [13, 15] },
      { code: '1M5D_R3', label: 'Animal health + vaccination', description: 'Regular vaccination + deworming to maintain herd health', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'COOPERATIVE_LOG', carbonCreditEligible: true, sdgGoals: [13, 3] },
      { code: '1M5D_R4', label: 'Breed improvement (Friesian crosses)', description: 'Crossbreed with Friesian for better feed conversion ratio', isMandatory: false, emissionReductionPct: 5, verificationMethod: 'FIELD_OFFICER', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5D_R5', label: 'Biogas capture from manure', description: 'Install biogas digester to capture manure CH4 for energy', isMandatory: false, emissionReductionPct: 40, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 7] },
    ],
    dreamDataSources: {
      D: 'Flutter app for feed intake + animal weight + herd size',
      R: 'Sentinel-2 NDVI for pasture health + Planet imagery for herd counting',
      E: 'Feed change events logged + grazing rotation confirmed by GPS/satellite',
      A: 'IPCC Tier 2: GE × Ym × 55.65 for enteric + VS × Bo × 0.67 × MCF for manure',
      M: 'Methane intensity per kg product + FCR trend + weight gain curve',
    },
  },

  // ─── 1M5V — Vegetables ───
  {
    variant: '1M5V',
    cropType: 'VEGETABLES',
    cropLabel: 'Vegetables',
    icon: '🥬',
    targetReduction: '15-25% N2O + 10% CO2',
    sustainabilityStandard: 'GlobalG.A.P. + organic certification',
    ipccEmissionModel: 'IPCC Tier 1 N2O from N-input',
    mandatoryPractice: {
      code: '1M5V_MUST',
      label: 'Crop rotation with legumes',
      description: 'Rotate vegetables with legumes (beans, peas) for natural N-fixation',
      isMandatory: true,
      emissionReductionPct: 10,
      verificationMethod: 'FIELD_OFFICER',
      carbonCreditEligible: true,
      sdgGoals: [13, 2, 15],
    },
    reducePractices: [
      { code: '1M5V_R1', label: 'Drip irrigation', description: 'Install drip irrigation to reduce water use + N leaching', isMandatory: false, emissionReductionPct: 5, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 6] },
      { code: '1M5V_R2', label: 'Organic compost', description: 'Apply compost instead of synthetic fertilizer', isMandatory: false, emissionReductionPct: 4, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5V_R3', label: 'Integrated pest management', description: 'Use biological controls + companion planting', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 3] },
      { code: '1M5V_R4', label: 'Mulching with organic material', description: 'Apply straw/grass mulch to retain moisture + suppress weeds', isMandatory: false, emissionReductionPct: 2, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 15] },
      { code: '1M5V_R5', label: 'Post-harvest cold storage', description: 'Use solar-powered cold storage to reduce post-harvest losses', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 2, 7] },
    ],
    dreamDataSources: {
      D: 'Flutter app for crop rotation logs + fertilizer rate',
      R: 'Sentinel-2 NDVI for crop health + land cover classification',
      E: 'Crop rotation detected via multi-temporal satellite classification',
      A: 'IPCC Tier 1 N2O from N-input + CO2 from irrigation energy',
      M: 'Yield per variety + post-harvest loss rate + quality grade',
    },
  },

  // ─── 1M5O — Orchard/Fruit ───
  {
    variant: '1M5O',
    cropType: 'ORCHARD',
    cropLabel: 'Orchard / Fruit',
    icon: '🍎',
    targetReduction: '15-25% N2O + carbon stock gain',
    sustainabilityStandard: 'GlobalG.A.P. + organic certification',
    ipccEmissionModel: 'IPCC Tier 2 N2O + biomass carbon stock',
    mandatoryPractice: {
      code: '1M5O_MUST',
      label: 'Cover cropping between tree rows',
      description: 'Plant cover crops (clover, vetch) between orchard rows for soil carbon + N-fixation',
      isMandatory: true,
      emissionReductionPct: 10,
      verificationMethod: 'SATELLITE',
      carbonCreditEligible: true,
      sdgGoals: [13, 15, 2],
    },
    reducePractices: [
      { code: '1M5O_R1', label: 'Precision fertigation', description: 'Apply fertilizer through drip irrigation at optimal rates', isMandatory: false, emissionReductionPct: 5, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5O_R2', label: 'Pruning waste composting', description: 'Compost pruning waste instead of burning', isMandatory: false, emissionReductionPct: 4, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 15] },
      { code: '1M5O_R3', label: 'Integrated pest management', description: 'Pheromone traps + biological controls', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 3] },
      { code: '1M5O_R4', label: 'Drought-tolerant rootstocks', description: 'Use drought-tolerant rootstocks for water efficiency', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'FIELD_OFFICER', carbonCreditEligible: true, sdgGoals: [13, 6] },
      { code: '1M5O_R5', label: 'Solar-powered cold storage', description: 'Use solar cold storage to reduce post-harvest losses + energy emissions', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 7] },
    ],
    dreamDataSources: {
      D: 'Flutter app for pruning + fertilizer + harvest logs',
      R: 'Sentinel-2 NDVI for canopy health + Drone for tree counting',
      E: 'Cover crop detected via inter-row NDVI satellite time-series',
      A: 'IPCC Tier 2 N2O + biomass carbon stock change',
      M: 'Yield per tree + fruit quality grade + carbon stock',
    },
  },

  // ─── 1M5A — Aquaculture ───
  {
    variant: '1M5A',
    cropType: 'AQUACULTURE',
    cropLabel: 'Aquaculture',
    icon: '🐟',
    targetReduction: '15-30% pond CH4 + 20-35% feed N2O',
    sustainabilityStandard: 'ASC (Aquaculture Stewardship Council) + BAP',
    ipccEmissionModel: 'Pond CH4 + feed N2O + energy CO2 + mangrove C stock',
    mandatoryPractice: {
      code: '1M5A_MUST',
      label: 'Mangrove buffer integration',
      description: 'Maintain mangrove buffers around ponds for carbon sequestration + water filtration',
      isMandatory: true,
      emissionReductionPct: 15,
      verificationMethod: 'SATELLITE',
      carbonCreditEligible: true,
      sdgGoals: [13, 14, 15],
    },
    reducePractices: [
      { code: '1M5A_R1', label: 'Reduced-protein feed with alternative sources', description: 'Use lower-protein feed with insect meal or plant protein', isMandatory: false, emissionReductionPct: 10, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5A_R2', label: 'Optimized water exchange management', description: 'Reduce water exchange frequency to minimize sediment disturbance', isMandatory: false, emissionReductionPct: 5, verificationMethod: 'IoT', carbonCreditEligible: true, sdgGoals: [13, 14] },
      { code: '1M5A_R3', label: 'Polyculture integration (fish + shrimp)', description: 'Stock multiple species to reduce feed waste + improve water quality', isMandatory: false, emissionReductionPct: 5, verificationMethod: 'FIELD_OFFICER', carbonCreditEligible: true, sdgGoals: [13, 2] },
      { code: '1M5A_R4', label: 'Sediment management + probiotics', description: 'Apply probiotics to reduce anaerobic decomposition in pond sediment', isMandatory: false, emissionReductionPct: 5, verificationMethod: 'PHOTO', carbonCreditEligible: true, sdgGoals: [13, 14] },
      { code: '1M5A_R5', label: 'Biosecurity + disease prevention', description: 'Implement biosecurity protocols to reduce mortality + waste', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'COOPERATIVE_LOG', carbonCreditEligible: true, sdgGoals: [13, 3] },
    ],
    dreamDataSources: {
      D: 'IoT dissolved O2/pH/salinity sensors + Flutter app for feed input',
      R: 'Sentinel-1 SAR for pond area + Sentinel-2 for turbidity + Planet for mangrove',
      E: 'Water exchange events logged + mangrove buffer confirmed by satellite',
      A: 'Pond CH4 + feed N2O + energy CO2 + mangrove C stock (IPCC Wetlands Supplement)',
      M: 'FCR trend + survival rate + water quality indices',
    },
  },

  // ─── 1M5F — Forestry/Agroforestry ───
  {
    variant: '1M5F',
    cropType: 'FORESTRY',
    cropLabel: 'Forestry / Agroforestry',
    icon: '🌲',
    targetReduction: 'Carbon stock increase + avoided deforestation',
    sustainabilityStandard: 'FSC + Verra VCS (VM0047)',
    ipccEmissionModel: 'IPCC LULUCF: biomass carbon stock change + soil carbon',
    mandatoryPractice: {
      code: '1M5F_MUST',
      label: 'Reduced-impact logging (RIL)',
      description: 'Use reduced-impact logging techniques to minimize damage to residual trees + soil',
      isMandatory: true,
      emissionReductionPct: 20,
      verificationMethod: 'SATELLITE',
      carbonCreditEligible: true,
      sdgGoals: [13, 15, 8],
    },
    reducePractices: [
      { code: '1M5F_R1', label: 'Replanting with native species', description: 'Replant logged areas with native tree species', isMandatory: false, emissionReductionPct: 10, verificationMethod: 'SATELLITE', carbonCreditEligible: true, sdgGoals: [13, 15] },
      { code: '1M5F_R2', label: 'Fire management plan', description: 'Implement controlled burning + firebreaks', isMandatory: false, emissionReductionPct: 5, verificationMethod: 'SATELLITE', carbonCreditEligible: true, sdgGoals: [13, 15] },
      { code: '1M5F_R3', label: 'Community forest management', description: 'Engage local communities in forest management + monitoring', isMandatory: false, emissionReductionPct: 3, verificationMethod: 'COOPERATIVE_LOG', carbonCreditEligible: true, sdgGoals: [13, 15, 1] },
      { code: '1M5F_R4', label: 'Agroforestry intercropping', description: 'Intercrop food crops between timber trees', isMandatory: false, emissionReductionPct: 5, verificationMethod: 'SATELLITE', carbonCreditEligible: true, sdgGoals: [13, 2, 15] },
      { code: '1M5F_R5', label: 'Chain-of-custody certification', description: 'Maintain FSC chain-of-custody for timber tracking', isMandatory: false, emissionReductionPct: 0, verificationMethod: 'COOPERATIVE_LOG', carbonCreditEligible: false, sdgGoals: [15, 8, 12] },
    ],
    dreamDataSources: {
      D: 'Flutter app for logging records + GPS tree mapping',
      R: 'Sentinel-1 + Sentinel-2 for deforestation detection + biomass estimation',
      E: 'Reduced-impact logging verified by satellite disturbance pattern analysis',
      A: 'IPCC LULUCF: biomass C stock change + soil C + avoided emissions',
      M: 'Annual biomass increment + harvest volume + regeneration rate',
    },
  },
]

// ─── Helper: get all practices for a variant ────────────────
export function getPracticesForVariant(variant: Farm5xVariant): Farm5xPractice[] {
  const def = FARM5X_VARIANTS.find(v => v.variant === variant)
  if (!def) return []
  return [def.mandatoryPractice, ...def.reducePractices]
}

// ─── Helper: get variant for a crop type ────────────────────
export function getVariantForCrop(cropType: string): Farm5xVariantDefinition | undefined {
  return FARM5X_VARIANTS.find(v =>
    v.cropType === cropType.toUpperCase() ||
    v.cropLabel.toLowerCase().includes(cropType.toLowerCase())
  )
}

// ─── Helper: get all practice codes ─────────────────────────
export function getAllPracticeCodes(): string[] {
  return FARM5X_VARIANTS.flatMap(v =>
    [v.mandatoryPractice.code, ...v.reducePractices.map(p => p.code)]
  )
}

// ─── Helper: compute total emission reduction for adopted practices ─
export function computeEmissionReduction(adoptedPracticeCodes: string[]): {
  totalPct: number
  mandatoryAdopted: boolean
  reducesAdopted: number
  eligibleForCredits: boolean
} {
  let totalPct = 0
  let mandatoryAdopted = false
  let reducesAdopted = 0

  for (const variant of FARM5X_VARIANTS) {
    if (adoptedPracticeCodes.includes(variant.mandatoryPractice.code)) {
      mandatoryAdopted = true
      totalPct += variant.mandatoryPractice.emissionReductionPct
    }
    for (const reduce of variant.reducePractices) {
      if (adoptedPracticeCodes.includes(reduce.code)) {
        reducesAdopted++
        totalPct += reduce.emissionReductionPct
      }
    }
  }

  // Eligible for carbon credits if mandatory + at least 3 reduces adopted
  const eligibleForCredits = mandatoryAdopted && reducesAdopted >= 3

  return { totalPct, mandatoryAdopted, reducesAdopted, eligibleForCredits }
}
