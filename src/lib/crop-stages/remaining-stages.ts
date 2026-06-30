/**
 * Remaining Crop Verticals — Stage Definitions
 *
 * 8 verticals covering all remaining crop types from the New Ecosystem Excel:
 *   CropCore    — Rice, Maize, Wheat (field crops)     11 stages, ~326 fields
 *   OrchardCore — Fruit trees (avocado, mango, etc.)    12 stages, ~139 fields
 *   VegCore     — Vegetables (tomato, cabbage, etc.)    10 stages, ~127 fields
 *   FloraCore   — Floriculture (cut flowers)             9 stages, ~112 fields
 *   AquaCore    — Aquaculture (shrimp, tilapia)         15 stages, ~174 fields
 *   ForestCore  — Agroforestry & Forest Mgmt            11 stages, ~88 fields
 *   TimberCore  — Timber Legality & Traceability        10 stages, ~87 fields
 *   MangroveCore — Mangrove Restoration                  9 stages, ~79 fields
 *
 * Each vertical links to its Farm5x variant:
 *   CropCore → 1M5M (Maize) or 1M5R (Rice)
 *   OrchardCore → 1M5O
 *   VegCore → 1M5V
 *   FloraCore → 1M5V (shares with veg)
 *   AquaCore → 1M5A
 *   ForestCore → 1M5F
 *   TimberCore → 1M5F (shares with forestry)
 *   MangroveCore → 1M5A (shares with aquaculture — mangrove buffer)
 *
 * All use the same CropStageEvent model — no new Prisma models needed.
 */

import type { StageField, StageSection, StageDefinition } from './coffeecore-stages'

// Helper to create fields quickly
function f(name: string, label: string, type: StageField['type'], mandatory: boolean = false, opts?: Partial<StageField>): StageField {
  return { name, label, type, mandatory, ...opts }
}

function section(name: string, fields: StageField[]): StageSection {
  return { name, fields }
}

function stage(num: number, name: string, eventType: string, desc: string, sections: StageSection[], farm5x?: string, dream?: 'D'|'R'|'E'|'A'|'M'): StageDefinition {
  return { stageNumber: num, stageName: name, eventType, description: desc, sections, farm5xLink: farm5x, dreamPhase: dream }
}

// ═══════════════════════════════════════════════════════════════
// CROPCORE — Rice, Maize, Field Crops (11 stages)
// ═══════════════════════════════════════════════════════════════
export const CROPCORE_STAGES: StageDefinition[] = [
  stage(1, 'Crop Master', 'CROP_MASTER', 'Define crop variety, growth duration, expected yield', [
    section('Crop Information', [
      f('cropName', 'Crop Name', 'text', true),
      f('variety', 'Variety', 'text', true),
      f('growthDurationDays', 'Growth Duration (days)', 'number', true, { unit: 'days' }),
      f('expectedYieldKgHa', 'Expected Yield (kg/ha)', 'number', false, { unit: 'kg/ha' }),
      f('cropPhoto', 'Photo', 'file', false),
    ]),
  ], '1M5M_MUST', 'D'),

  stage(2, 'Crop Calendar Master', 'CROP_CALENDAR', 'Define seasonal stages with NDVI, rainfall, risks', [
    section('Calendar Stages', [
      f('stageName', 'Stage Name', 'text', true),
      f('startDay', 'Start Day', 'number', true),
      f('endDay', 'End Day', 'number', true),
      f('expectedNDVImin', 'Expected NDVI (min)', 'number', false),
      f('expectedNDVImax', 'Expected NDVI (max)', 'number', false),
      f('expectedRainfallMin', 'Expected Rainfall (mm/min)', 'number', false),
      f('expectedRainfallMax', 'Expected Rainfall (mm/max)', 'number', false),
      f('risks', 'Risks', 'textarea', false),
    ]),
  ], undefined, 'D'),

  stage(3, 'Land Preparation', 'LAND_PREP', 'Clearing, plowing, leveling, compost application', [
    section('Land Preparation', [
      f('prepDate', 'Date', 'date', true),
      f('activity', 'Activity', 'dropdown', true, { options: ['Debushing', 'Plowing', 'Leveling', 'Ridging'] }),
      f('implements', 'Implements', 'dropdown', false, { options: ['Bullock', 'Tractor', 'Rotovator', 'Manual'] }),
      f('compostApplied', 'Compost Applied?', 'radio', false, { options: ['Yes', 'No'] }),
      f('compostType', 'Compost Type', 'text', false, { conditionalShow: 'compostApplied' }),
      f('fuelLiters', 'Fuel Used (L)', 'number', false, { unit: 'L', carbonField: true }),
      f('machineryHours', 'Machinery Hours', 'number', false, { unit: 'hrs', carbonField: true, costField: true }),
      f('photo', 'Photo', 'file', false),
    ]),
  ], '1M5M_MUST', 'D'),

  stage(4, 'Crop Monitoring', 'CROP_MONITORING', 'Growth stage, plant count, canopy, stress detection', [
    section('Field Visit', [
      f('visitDate', 'Visit Date', 'date', true),
      f('growthStage', 'Growth Stage', 'dropdown', true, { options: ['Germination', 'Vegetative', 'Tillering', 'Flowering', 'Grain Filling', 'Maturity'] }),
      f('plantCount', 'Plant Count (per sq m)', 'number', false),
      f('canopyCover', 'Canopy Cover (%)', 'number', false, { unit: '%' }),
      f('leafColorIndex', 'Leaf Color Index', 'dropdown', false, { options: ['Dark Green', 'Green', 'Yellow Green', 'Yellow'] }),
      f('soilMoisture', 'Soil Moisture', 'dropdown', false, { options: ['Dry', 'Adequate', 'Wet'] }),
      f('pestInfestation', 'Pest Infestation?', 'radio', false, { options: ['Yes', 'No'] }),
      f('pestType', 'Pest Type', 'multiselect', false, { conditionalShow: 'pestInfestation', options: ['Stem Borer', 'Armyworm', 'Aphids', 'Rice Bug', 'Birds'] }),
      f('alertTriggered', 'Alert Triggered?', 'radio', false, { options: ['Yes', 'No'] }),
    ]),
  ], undefined, 'M'),

  stage(5, 'Fertilizer Application', 'FERTILIZER', 'Soil test, product, dose, cost auto-calc', [
    section('Nutrient Planning', [
      f('soilTestDate', 'Soil Test Date', 'date', false),
      f('soilPH', 'pH', 'number', false),
      f('soilN', 'N (%)', 'number', false),
      f('soilP', 'P (ppm)', 'number', false),
      f('soilK', 'K (ppm)', 'number', false),
    ]),
    section('Application', [
      f('fertDate', 'Application Date', 'date', true),
      f('fertType', 'Fertilizer Type', 'dropdown', true, { options: ['Chemical', 'Organic', 'Green Manure'] }),
      f('fertProduct', 'Product', 'text', true),
      f('fertDoseKgHa', 'Dose (kg/ha)', 'number', true, { unit: 'kg/ha' }),
      f('fertAppliedQty', 'Applied Qty (kg)', 'number', true, { unit: 'kg', costField: true, carbonField: true }),
      f('fertCostPerUnit', 'Cost per Unit', 'number', true, { unit: 'currency/kg', costField: true }),
      f('fertTotalCost', 'Total Cost', 'autocalc', true, { autocalcFormula: 'fertAppliedQty × fertCostPerUnit' }),
    ]),
  ], '1M5M_R1', 'A'),

  stage(6, 'Water Management', 'WATER_MGMT', 'Irrigation source, schedule, water saving practices', [
    section('Water Management', [
      f('waterDate', 'Date', 'date', true),
      f('irrigationSource', 'Irrigation Source', 'dropdown', true, { options: ['Rainfed', 'Canal', 'Borewell', 'Pump', 'Drip'] }),
      f('waterAppliedMm', 'Water Applied (mm)', 'number', false, { unit: 'mm' }),
      f('irrigationDuration', 'Duration (hours)', 'number', false, { unit: 'hrs' }),
      f('waterSavingPractice', 'Water Saving Practice', 'dropdown', false, { options: ['AWD', 'SRI', 'Drip', 'Sprinkler', 'None'] }),
      f('photo', 'Photo', 'file', false),
    ]),
  ], undefined, 'A'),

  stage(7, 'Pesticide Application', 'PESTICIDE', 'Pest scouting, treatment, product tracking', [
    section('Scouting', [
      f('scoutDate', 'Scouting Date', 'date', true),
      f('pestIdentified', 'Pest Identified?', 'radio', false, { options: ['Yes', 'No'] }),
      f('pestType', 'Pest Type', 'multiselect', false, { conditionalShow: 'pestIdentified', options: ['Stem Borer', 'Armyworm', 'Aphids', 'Rice Bug', 'Rats'] }),
      f('diseaseIdentified', 'Disease Identified?', 'radio', false, { options: ['Yes', 'No'] }),
      f('diseaseType', 'Disease Type', 'multiselect', false, { conditionalShow: 'diseaseIdentified', options: ['Blast', 'Blight', 'Rot', 'Smut', 'Rust'] }),
      f('severity', 'Severity', 'dropdown', false, { options: ['Low', 'Medium', 'High'] }),
    ]),
    section('Treatment', [
      f('treatmentDate', 'Treatment Date', 'date', true),
      f('treatmentType', 'Treatment Type', 'dropdown', true, { options: ['Chemical', 'Bio', 'Mechanical', 'Cultural'] }),
      f('pesticideProduct', 'Product', 'text', false),
      f('pesticideDose', 'Dose', 'text', false),
      f('pesticideKg', 'Pesticicide Applied (kg)', 'number', false, { unit: 'kg', costField: true, carbonField: true }),
      f('equipment', 'Equipment', 'dropdown', false, { options: ['Knapsack', 'Power Sprayer', 'Drone'] }),
    ]),
  ], '1M5M_R1', 'A'),

  stage(8, 'Seed & Planting', 'SEED_PLANTING', 'Seed source, treatment, quantity, sowing method, cost', [
    section('Seed Information', [
      f('seedSource', 'Seed Source', 'dropdown', true, { options: ['Seed Company', 'Agent', 'Self-save'] }),
      f('seedTreated', 'Is Seed Treated?', 'radio', false, { options: ['Yes', 'No'] }),
      f('seedType', 'Seed Type', 'dropdown', false, { options: ['Certified 1', 'Certified 2', 'Self-save', 'Other'] }),
      f('seedQuantity', 'Seed Quantity (kg)', 'number', true, { unit: 'kg', costField: true }),
      f('seedPrice', 'Seed Price (per kg)', 'number', true, { unit: 'currency/kg', costField: true }),
      f('seedCost', 'Seed Cost', 'autocalc', true, { autocalcFormula: 'seedQuantity × seedPrice' }),
    ]),
    section('Sowing', [
      f('sowingDate', 'Sowing Date', 'date', true),
      f('sowingMethod', 'Sowing Method', 'dropdown', true, { options: ['Row sowing', 'Broadcast', 'Transplanting', 'Drill', 'Dibbling'] }),
      f('sowingChargesBy', 'Charges By', 'dropdown', true, { options: ['hour', 'hectare'] }),
      f('sowingCharges', 'Sowing Charges', 'number', true, { costField: true }),
      f('sowingCost', 'Sowing Cost', 'autocalc', true, { autocalcFormula: 'area × charges or hours × charges' }),
    ]),
  ], undefined, 'D'),

  stage(9, 'Weed Management', 'WEED_MGMT', 'Weed type, control method, labor cost', [
    section('Weed Management', [
      f('weedDate', 'Date', 'date', true),
      f('weedType', 'Weed Type', 'multiselect', true, { options: ['Grass', 'Sedge', 'Broadleaf', 'Aquatic'] }),
      f('weedDensity', 'Weed Density', 'dropdown', false, { options: ['Low', 'Medium', 'High'] }),
      f('controlMethod', 'Control Method', 'dropdown', true, { options: ['Manual', 'Mechanical', 'Chemical', 'Biological'] }),
      f('herbicideKg', 'Herbicide Applied (kg)', 'number', false, { unit: 'kg', carbonField: true, costField: true }),
      f('laborHours', 'Labor Hours', 'number', false, { unit: 'hrs', costField: true }),
      f('photo', 'Photo', 'file', false),
    ]),
  ], undefined, 'A'),

  stage(10, 'Harvest Management', 'HARVEST', 'Harvest planning, yield recording, post-harvest QC, traceability', [
    section('Harvest Planning', [
      f('plannedHarvestDate', 'Planned Date', 'date', true),
      f('actualHarvestDate', 'Actual Date', 'date', true),
      f('harvestMethod', 'Method', 'dropdown', true, { options: ['Manual', 'Mechanical', 'Combine'] }),
      f('fieldMoisture', 'Field Moisture (%)', 'number', false, { unit: '%' }),
    ]),
    section('Yield Recording', [
      f('sampleWeight', 'Sample Weight (kg)', 'number', true, { unit: 'kg' }),
      f('sampleArea', 'Sample Area (sq m)', 'number', true, { unit: 'sq m' }),
      f('estimatedYieldTHa', 'Est. Yield (t/ha)', 'autocalc', true, { autocalcFormula: 'sampleWeight / sampleArea × 10000 / 1000' }),
      f('totalYieldKg', 'Total Yield (kg)', 'number', true, { unit: 'kg' }),
    ]),
    section('Post-Harvest QC', [
      f('moistureContent', 'Moisture Content (%)', 'number', false, { unit: '%' }),
      f('impurityPct', 'Impurity (%)', 'number', false, { unit: '%' }),
      f('grade', 'Grade', 'dropdown', false, { options: ['A', 'B', 'C', 'Standard'] }),
    ]),
    section('Traceability', [
      f('batchId', 'Batch ID', 'text', true, { defaultValue: 'Auto Gen' }),
      f('processingStage', 'Processing Stage', 'dropdown', true, { options: ['Harvested', 'Dried', 'Threshed', 'Graded', 'Packaged'] }),
      f('location', 'Location', 'dropdown', true, { options: ['Farm', 'Warehouse', 'Processing Plant'] }),
    ]),
  ], undefined, 'M'),

  stage(11, 'Cost & Economics Tracking', 'COST_ECONOMICS', 'Aggregated costs, revenue, ROI, DREAM summary', [
    section('Cost Summary (auto-aggregated)', [
      f('totalSeedCost', 'Seed Cost', 'number', false, { costField: true }),
      f('totalFertCost', 'Fertilizer Cost', 'number', false, { costField: true }),
      f('totalPestCost', 'Pesticide Cost', 'number', false, { costField: true }),
      f('totalFuelCost', 'Fuel Cost', 'number', false, { costField: true }),
      f('totalLaborCost', 'Labor Cost', 'number', false, { costField: true }),
      f('totalInputCost', 'Total Input Cost', 'autocalc', true, { autocalcFormula: 'sum of all costs' }),
    ]),
    section('Revenue & ROI', [
      f('totalYieldKg', 'Total Yield (kg)', 'number', false, { unit: 'kg' }),
      f('avgPricePerKg', 'Avg Price/kg', 'number', false, { unit: 'currency/kg' }),
      f('totalRevenue', 'Total Revenue', 'autocalc', true, { autocalcFormula: 'yield × price' }),
      f('profitLoss', 'Profit/Loss', 'autocalc', true, { autocalcFormula: 'revenue - inputCost' }),
      f('roi', 'ROI (%)', 'autocalc', true, { autocalcFormula: '(profit / inputCost) × 100' }),
    ]),
    section('DREAM & Farm5x', [
      f('dreamD', 'D — Data', 'radio', false, { options: ['Verified', 'Pending'] }),
      f('dreamR', 'R — Remote', 'radio', false, { options: ['Verified', 'Pending'] }),
      f('dreamE', 'E — Event', 'radio', false, { options: ['Verified', 'Pending'] }),
      f('dreamA', 'A — Analytics', 'radio', false, { options: ['Verified', 'Pending'] }),
      f('dreamM', 'M — Monitor', 'radio', false, { options: ['Verified', 'Pending'] }),
      f('farm5xEligible', 'Verra Eligible', 'autocalc', false, { autocalcFormula: 'mandatory + ≥3 reduces' }),
    ]),
  ], undefined, 'M'),
]

// ═══════════════════════════════════════════════════════════════
// ORCHARDCORE — Fruit Trees (12 stages)
// ═══════════════════════════════════════════════════════════════
export const ORCHARDCORE_STAGES: StageDefinition[] = [
  stage(1, 'Land Preparation', 'LAND_PREP', 'Clearing, holing, compost for orchard establishment', [
    section('Land Prep', [f('prepDate','Date','date',true), f('clearingMethod','Clearing Method','dropdown',true,{options:['Manual','Mechanical']}), f('holingSize','Hole Size','text',true), f('compostPerHole','Compost (kg/hole)','number',false,{costField:true}), f('photo','Photo','file',false)]),
  ], '1M5O_MUST', 'D'),
  stage(2, 'Planting', 'PLANTING', 'Tree planting with spacing and variety selection', [
    section('Planting', [f('plantingDate','Date','date',true), f('variety','Variety','text',true), f('spacingM','Spacing (m)','text',true), f('treesPlanted','Trees Planted','number',true), f('seedlingSource','Seedling Source','dropdown',true,{options:['Nursery','Supplier','Self-grown']}), f('seedlingCost','Seedling Cost','number',false,{costField:true})]),
  ], undefined, 'D'),
  stage(3, 'Irrigation & Nutrient Management', 'IRRIGATION_NUTRIENT', 'Fertigation, soil test, nutrient schedule', [
    section('Irrigation', [f('irrigDate','Date','date',true), f('irrigSystem','System','dropdown',true,{options:['Drip','Sprinkler','Flood','Rainfed']}), f('waterVolumeL','Water (L)','number',false,{unit:'L'})]),
    section('Fertilizer', [f('fertDate','Date','date',true), f('fertProduct','Product','text',true), f('fertDose','Dose (kg)','number',true,{costField:true,carbonField:true}), f('fertCost','Cost','number',false,{costField:true})]),
  ], undefined, 'A'),
  stage(4, 'Crop Monitoring & Phenology', 'MONITORING', 'Growth stage, canopy, flowering status', [
    section('Monitoring', [f('visitDate','Date','date',true), f('phenologyStage','Phenology Stage','dropdown',true,{options:['Dormant','Bud Break','Flowering','Fruit Set','Veraison','Maturity']}), f('canopyCover','Canopy (%)','number',false), f('treeHeight','Tree Height (m)','number',false), f('healthStatus','Health','dropdown',false,{options:['Good','Fair','Poor']})]),
  ], undefined, 'M'),
  stage(5, 'Flowering & Fruit Development', 'FLOWERING_FRUIT', 'Pollination, fruit set, thinning', [
    section('Flowering', [f('floweringDate','Date','date',true), f('bloomIntensity','Bloom Intensity','dropdown',true,{options:['Heavy','Medium','Light']}), f('pollinationMethod','Pollination','dropdown',false,{options:['Natural','Bees','Manual']}), f('fruitSetPct','Fruit Set (%)','number',false), f('thinningDone','Thinning Done?','radio',false,{options:['Yes','No']})]),
  ], undefined, 'M'),
  stage(6, 'Pest & Disease Management', 'PEST_DISEASE', 'Scouting, identification, treatment', [
    section('Scouting', [f('scoutDate','Date','date',true), f('pestType','Pest Type','multiselect',false,{options:['Fruit Fly','Scale','Aphids','Borers','Mites']}), f('diseaseType','Disease Type','multiselect',false,{options:['Anthracnose','Scab','Rot','Canker','Rust']})]),
    section('Treatment', [f('treatmentDate','Date','date',true), f('treatmentType','Type','dropdown',true,{options:['Chemical','Bio','Cultural']}), f('product','Product','text',false), f('dose','Dose','text',false), f('pesticideKg','Amount (kg)','number',false,{carbonField:true,costField:true})]),
  ], undefined, 'A'),
  stage(7, 'Thinning & Training', 'THINNING_TRAINING', 'Fruit thinning, pruning, tree training', [
    section('Thinning & Training', [f('date','Date','date',true), f('activity','Activity','dropdown',true,{options:['Pruning','Thinning','Training','Staking']}), f('fruitsThinned','Fruits Thinned','number',false), f('pruningMethod','Pruning Method','dropdown',false,{options:['Central Leader','Open Center','Modified']}), f('laborHours','Labor (hrs)','number',false,{costField:true})]),
  ], undefined, 'D'),
  stage(8, 'Harvest & Post-Harvest Traceability', 'HARVEST', 'Harvest, yield, grading, batch', [
    section('Harvest', [f('harvestDate','Date','date',true), f('method','Method','dropdown',true,{options:['Manual','Mechanical']}), f('totalYieldKg','Yield (kg)','number',true,{unit:'kg'})]),
    section('Post-Harvest QC', [f('moisture','Moisture (%)','number',false), f('defects','Defects (%)','number',false), f('grade','Grade','dropdown',false,{options:['A','B','C']})]),
    section('Traceability', [f('batchId','Batch ID','text',true,{defaultValue:'Auto Gen'}), f('processingStage','Stage','dropdown',true,{options:['Harvested','Washed','Sorted','Packed']})]),
  ], undefined, 'M'),
  stage(9, 'Grading & Packing', 'GRADING_PACKING', 'Quality grading, packing, labeling', [
    section('Grading', [f('gradeDate','Date','date',true), f('gradeA_Kg','Grade A (kg)','number',false), f('gradeB_Kg','Grade B (kg)','number',false), f('rejectKg','Reject (kg)','number',false)]),
    section('Packing', [f('packType','Pack Type','dropdown',true,{options:['Crate','Box','Bag','Pallet']}), f('packCount','Pack Count','number',true), f('netWeightKg','Net Weight (kg)','number',true)]),
  ], undefined, 'M'),
  stage(10, 'Cold Storage Management', 'COLD_STORAGE', 'Temperature, humidity, duration tracking', [
    section('Cold Storage', [f('entryDate','Entry Date','date',true), f('storageTemp','Temperature (°C)','number',true,{unit:'°C'}), f('humidity','Humidity (%)','number',false), f('storageDurationDays','Duration (days)','number',false), f('facilityId','Facility ID','text',true)]),
  ], undefined, 'M'),
  stage(11, 'Certification & Quality Compliance', 'CERTIFICATION', 'GlobalG.A.P., organic, fair trade audits', [
    section('Certification', [f('certId','Cert ID','text',true,{defaultValue:'Auto Gen'}), f('standard','Standard','dropdown',true,{options:['GlobalG.A.P.','Organic','Fair Trade','USDA']}), f('auditDate','Audit Date','date',true), f('auditor','Auditor','text',true), f('compliance','Compliance','dropdown',true,{options:['Compliant','Non-compliant']})]),
  ], undefined, 'M'),
  stage(12, 'Inspection & Audit', 'INSPECTION', 'Field/facility inspection with corrective actions', [
    section('Inspection', [f('inspectionId','ID','text',true,{defaultValue:'Auto Gen'}), f('inspectionDate','Date','date',true), f('inspector','Inspector','text',true), f('type','Type','dropdown',true,{options:['Field','Warehouse','Processing']}), f('observations','Observations','textarea',false), f('nonConformance','Non-Conformance?','radio',true,{options:['Yes','No']}), f('correctiveActions','Corrective Actions','textarea',false,{conditionalShow:'nonConformance'})]),
  ]),
]

// ═══════════════════════════════════════════════════════════════
// VEGCORE — Vegetables (10 stages)
// ═══════════════════════════════════════════════════════════════
export const VEGCORE_STAGES: StageDefinition[] = [
  stage(1, 'Land Preparation', 'LAND_PREP', 'Beds, ridges, compost for vegetable plots', [section('Land Prep', [f('prepDate','Date','date',true), f('activity','Activity','dropdown',true,{options:['Plowing','Bed Making','Ridging','Leveling']}), f('compostApplied','Compost (kg)','number',false,{costField:true}), f('photo','Photo','file',false)])], '1M5V_MUST', 'D'),
  stage(2, 'Planting & Transplanting', 'PLANTING', 'Direct seed or transplant seedlings', [section('Planting', [f('plantingDate','Date','date',true), f('method','Method','dropdown',true,{options:['Direct Seed','Transplant']}), f('variety','Variety','text',true), f('spacing','Spacing','text',true), f('seedQty','Seed/Seedling Qty','number',true,{costField:true}), f('seedCost','Seed Cost','number',false,{costField:true})])], undefined, 'D'),
  stage(3, 'Irrigation & Nutrient Management', 'IRRIGATION_NUTRIENT', 'Water + fertilizer scheduling', [section('Irrigation', [f('irrigDate','Date','date',true), f('system','System','dropdown',true,{options:['Drip','Sprinkler','Flood','Rainfed']}), f('waterL','Water (L)','number',false)]), section('Fertilizer', [f('fertDate','Date','date',true), f('product','Product','text',true), f('doseKg','Dose (kg)','number',true,{costField:true,carbonField:true}), f('cost','Cost','number',false,{costField:true})])], undefined, 'A'),
  stage(4, 'Crop Monitoring & Phenology', 'MONITORING', 'Growth stage, health, stress', [section('Monitoring', [f('visitDate','Date','date',true), f('growthStage','Stage','dropdown',true,{options:['Seedling','Vegetative','Flowering','Fruiting','Maturity']}), f('plantHeight','Height (cm)','number',false), f('health','Health','dropdown',false,{options:['Good','Fair','Poor']})])], undefined, 'M'),
  stage(5, 'Input & Protection Management', 'INPUT_PROTECTION', 'Pest, disease, mulch, staking', [section('Protection', [f('date','Date','date',true), f('pestType','Pest','multiselect',false,{options:['Aphids','Whitefly','Caterpillar','Thrips','Nematodes']}), f('diseaseType','Disease','multiselect',false,{options:['Blight','Wilt','Mosaic','Rot','Powdery Mildew']}), f('treatment','Treatment','text',false), f('pesticideKg','Pesticide (kg)','number',false,{carbonField:true,costField:true}), f('mulchApplied','Mulch Applied?','radio',false,{options:['Yes','No']})])], '1M5V_R4', 'A'),
  stage(6, 'Flowering & Fruiting', 'FLOWERING_FRUITING', 'Pollination, fruit set for fruiting vegetables', [section('Flowering', [f('date','Date','date',true), f('bloomIntensity','Bloom','dropdown',true,{options:['Heavy','Medium','Light']}), f('fruitSetPct','Fruit Set (%)','number',false), f('pollination','Pollination','dropdown',false,{options:['Natural','Bees','Manual']})])], undefined, 'M'),
  stage(7, 'Harvest & Post-Harvest Traceability', 'HARVEST', 'Pick, grade, batch creation', [section('Harvest', [f('harvestDate','Date','date',true), f('method','Method','dropdown',true,{options:['Manual','Mechanical']}), f('yieldKg','Yield (kg)','number',true,{unit:'kg'})]), section('QC', [f('grade','Grade','dropdown',false,{options:['A','B','C']}), f('moisture','Moisture (%)','number',false)]), section('Traceability', [f('batchId','Batch ID','text',true,{defaultValue:'Auto Gen'}), f('stage','Stage','dropdown',true,{options:['Harvested','Washed','Sorted','Packed']})])], undefined, 'M'),
  stage(8, 'Grading & Packing', 'GRADING', 'Quality sorting, packing', [section('Grading', [f('gradeDate','Date','date',true), f('gradeAKg','Grade A (kg)','number',false), f('gradeBKg','Grade B (kg)','number',false), f('rejectKg','Reject (kg)','number',false)]), section('Packing', [f('packType','Pack Type','dropdown',true,{options:['Crate','Box','Bag']}), f('packCount','Count','number',true), f('netWeight','Net Weight (kg)','number',true)])], undefined, 'M'),
  stage(9, 'Cold Storage & Distribution', 'COLD_STORAGE', 'Cold chain, distribution tracking', [section('Storage', [f('entryDate','Date','date',true), f('temp','Temp (°C)','number',true), f('humidity','Humidity (%)','number',false), f('durationDays','Duration (days)','number',false)]), section('Distribution', [f('dispatchDate','Dispatch Date','date',false), f('destination','Destination','text',false), f('transportMode','Transport','dropdown',false,{options:['Truck','Van','Motorcycle']})])], undefined, 'M'),
  stage(10, 'Certification & Inspection', 'CERT_INSPECTION', 'GlobalG.A.P. + organic compliance', [section('Certification', [f('certId','Cert ID','text',true,{defaultValue:'Auto Gen'}), f('standard','Standard','dropdown',true,{options:['GlobalG.A.P.','Organic','Fair Trade']}), f('auditDate','Audit Date','date',true), f('auditor','Auditor','text',true), f('compliance','Compliance','dropdown',true,{options:['Compliant','Non-compliant']})]), section('Inspection', [f('inspectionId','Inspection ID','text',true,{defaultValue:'Auto Gen'}), f('inspectionDate','Date','date',true), f('inspector','Inspector','text',true), f('observations','Observations','textarea',false), f('nonConformance','Non-Conformance?','radio',false,{options:['Yes','No']})])], undefined, 'M'),
]

// ═══════════════════════════════════════════════════════════════
// AQUACORE — Aquaculture (15 stages)
// ═══════════════════════════════════════════════════════════════
export const AQUACORE_STAGES: StageDefinition[] = [
  stage(1, 'Pond Registration', 'POND_REG', 'Pond ID, size, location, water source', [section('Pond', [f('pondId','Pond ID','text',true,{defaultValue:'Auto Gen'}), f('pondSize','Size (ha)','number',true,{unit:'ha'}), f('location','Location','text',true), f('waterSource','Water Source','dropdown',true,{options:['River','Well','Canal','Rainwater','Spring']}), f('registrationDate','Date','date',true), f('depth','Avg Depth (m)','number',false,{unit:'m'})])], '1M5A_MUST', 'D'),
  stage(2, 'Hatchery Management', 'HATCHERY', 'Breeding stock, spawning, hatching rates', [section('Hatchery', [f('hatcheryId','Hatchery ID','text',true,{defaultValue:'Auto Gen'}), f('breedingStock','Breeding Stock Info','text',true), f('spawningDate','Spawning Date','date',true), f('hatchingRate','Hatching Rate (%)','number',false,{unit:'%'}), f('fertilizationMethod','Fertilization Method','text',false)])], undefined, 'D'),
  stage(3, 'Nursery Management', 'NURSERY', 'Fry rearing, feeding, survival tracking', [section('Nursery', [f('nurseryId','Nursery ID','text',true,{defaultValue:'Auto Gen'}), f('species','Species','text',true), f(' fryCount','Fry Count','number',true), f('survivalRate','Survival Rate (%)','number',false), f('feedType','Feed Type','text',true), f('feedingFrequency','Feeding Frequency','text',false)])], undefined, 'D'),
  stage(4, 'Feed Management', 'FEED_MGMT', 'Feed type, quantity, cost, FCR', [section('Feed', [f('feedDate','Date','date',true), f('feedType','Feed Type','dropdown',true,{options:['Pellet','Powder','Live Feed','Formulated']}), f('feedQtyKg','Quantity (kg)','number',true,{costField:true}), f('costPerKg','Cost (per kg)','number',false,{costField:true}), f('totalCost','Total Cost','autocalc',false,{autocalcFormula:'feedQtyKg × costPerKg'}), f('fcr','FCR','number',false)])], undefined, 'D'),
  stage(5, 'Stocking & Grow-Out', 'STOCKING', 'Stocking density, growth monitoring', [section('Stocking', [f('stockingDate','Date','date',true), f('species','Species','text',true), f('stockingDensity','Density (fish/m²)','number',true), f('avgWeight','Avg Weight (g)','number',false), f('growthRate','Growth Rate (g/day)','number',false)])], undefined, 'M'),
  stage(6, 'Water Quality & Real-Time Monitoring', 'WATER_QUALITY', 'DO, pH, salinity, turbidity, temperature', [section('Water Quality', [f('monitoringDate','Date','date',true), f('dissolvedO2','Dissolved O₂ (mg/L)','number',true,{unit:'mg/L'}), f('waterPH','pH','number',true), f('salinity','Salinity (ppt)','number',false,{unit:'ppt'}), f('turbidity','Turbidity (NTU)','number',false), f('temperature','Temperature (°C)','number',true,{unit:'°C'}), f('ammonia','Ammonia (mg/L)','number',false)])], undefined, 'M'),
  stage(7, 'Labor Management', 'LABOR', 'Staff, roles, schedules for aquaculture', [section('Labor', [f('staffId','Staff ID','text',true), f('name','Name','text',true), f('role','Role','dropdown',true,{options:['Manager','Feeder','Technician','Guard']}), f('schedule','Schedule','textarea',false), f('dailyWage','Daily Wage','number',false,{costField:true})])], undefined, 'D'),
  stage(8, 'Inventory & Equipment', 'INVENTORY', 'Equipment tracking, maintenance', [section('Equipment', [f('equipmentId','Equipment ID','text',true), f('equipmentName','Name','text',true), f('type','Type','dropdown',true,{options:['Aerator','Pump','Net','Feeder','Water Tester']}), f('condition','Condition','dropdown',false,{options:['Good','Needs Repair','Broken']})])], undefined, 'D'),
  stage(9, 'Procurement & Input Management', 'PROCUREMENT', 'Feed, chemical, equipment purchases', [section('Procurement', [f('purchaseDate','Date','date',true), f('item','Item','text',true), f('quantity','Quantity','number',true), f('unitPrice','Unit Price','number',true,{costField:true}), f('totalCost','Total','autocalc',true,{autocalcFormula:'quantity × unitPrice'}), f('supplier','Supplier','text',false)])], undefined, 'D'),
  stage(10, 'Product Transfer', 'PRODUCT_TRANSFER', 'Transfer from pond to processing', [section('Transfer', [f('transferDate','Date','date',true), f('fromPond','From Pond','text',true), f('toFacility','To Facility','text',true), f('quantityKg','Quantity (kg)','number',true,{unit:'kg'}), f('transferMethod','Method','dropdown',true,{options:['Truck','Boat','Pipe']})])], undefined, 'M'),
  stage(11, 'Product Reception', 'PRODUCT_RECEPTION', 'Receiving at processing facility', [section('Reception', [f('receptionDate','Date','date',true), f('batchId','Batch ID','text',true), f('quantityKg','Quantity (kg)','number',true), f('qualityGrade','Quality','dropdown',true,{options:['A','B','C']}), f('temperature','Temp (°C)','number',false)])], undefined, 'M'),
  stage(12, 'Grading & Sorting', 'GRADING', 'Size, weight, quality sorting', [section('Grading', [f('gradingDate','Date','date',true), f('gradeA_Kg','Grade A (kg)','number',false), f('gradeB_Kg','Grade B (kg)','number',false), f('gradeC_Kg','Grade C (kg)','number',false), f('rejectKg','Reject (kg)','number',false)])], undefined, 'M'),
  stage(13, 'Processing', 'PROCESSING', 'Cleaning, filleting, packaging', [section('Processing', [f('processingDate','Date','date',true), f('processingType','Type','dropdown',true,{options:['Whole Clean','Fillet','Headless','Breaded']}), f('inputKg','Input (kg)','number',true), f('outputKg','Output (kg)','number',true), f('yieldPct','Yield (%)','autocalc',false,{autocalcFormula:'outputKg / inputKg × 100'})])], undefined, 'M'),
  stage(14, 'Cold Storage Management', 'COLD_STORAGE', 'Frozen/chilled storage tracking', [section('Cold Storage', [f('entryDate','Date','date',true), f('facilityId','Facility ID','text',true), f('temp','Temperature (°C)','number',true), f('batchId','Batch ID','text',true), f('quantityKg','Quantity (kg)','number',true), f('durationDays','Duration (days)','number',false)])], undefined, 'M'),
  stage(15, 'Certification & Inspection', 'CERT_INSPECTION', 'ASC/BAP compliance + inspection', [section('Certification', [f('certId','Cert ID','text',true,{defaultValue:'Auto Gen'}), f('standard','Standard','dropdown',true,{options:['ASC','BAP','Organic','GlobalG.A.P.']}), f('auditDate','Audit Date','date',true), f('auditor','Auditor','text',true), f('compliance','Compliance','dropdown',true,{options:['Compliant','Non-compliant']})]), section('Inspection', [f('inspectionId','ID','text',true,{defaultValue:'Auto Gen'}), f('inspectionDate','Date','date',true), f('inspector','Inspector','text',true), f('observations','Observations','textarea',false), f('nonConformance','Non-Conformance?','radio',false,{options:['Yes','No']})])], undefined, 'M'),
]

// ═══════════════════════════════════════════════════════════════
// FORESTCORE — Agroforestry & Forest Management (11 stages)
// ═══════════════════════════════════════════════════════════════
export const FORESTCORE_STAGES: StageDefinition[] = [
  stage(1, 'Concession & Land Registration', 'CONCESSION_REG', 'Concession ID, holder, permit dates', [section('Concession', [f('concessionId','Concession ID','text',true,{defaultValue:'Auto Gen'}), f('concessionaire','Concessionaire','text',true), f('province','Province','dropdown',true), f('district','District','dropdown',true), f('permitIssueDate','Permit Issue Date','date',true), f('permitExpiryDate','Permit Expiry','date',true)])], '1M5F_MUST', 'D'),
  stage(2, 'Forest Inventory & Boundary Mapping', 'INVENTORY_BOUNDARY', 'Species, count, biomass, GIS boundary', [section('Inventory', [f('inventoryDate','Date','date',true), f('speciesList','Species','textarea',true), f('treeCount','Tree Count','number',true), f('avgDBH','Avg DBH (cm)','number',false), f('biomassTonnes','Biomass (t)','number',false), f('gisBoundary','GIS Boundary','file',true)])], undefined, 'D'),
  stage(3, 'Continuous Monitoring & Alerts', 'MONITORING', 'Satellite NDVI, deforestation alerts', [section('Monitoring', [f('monitoringDate','Date','date',true), f('ndvi','NDVI','number',false), f('canopyCover','Canopy Cover (%)','number',false), f('deforestationAlert','Deforestation Alert?','radio',false,{options:['Yes','No']}), f('alertDetails','Alert Details','textarea',false,{conditionalShow:'deforestationAlert'})])], undefined, 'M'),
  stage(4, 'Forest Health & Fire Risk', 'HEALTH_FIRE', 'Pest, disease, fire risk assessment', [section('Health', [f('assessmentDate','Date','date',true), f('healthStatus','Health Status','dropdown',true,{options:['Healthy','Stressed','Degraded']}), f('fireRiskLevel','Fire Risk','dropdown',true,{options:['Low','Medium','High','Critical']}), f('pestObserved','Pest Observed?','radio',false,{options:['Yes','No']})])], undefined, 'M'),
  stage(5, 'Species Classification & Biodiversity', 'SPECIES_BIODIVERSITY', 'Species count, endangered, biodiversity index', [section('Biodiversity', [f('surveyDate','Date','date',true), f('speciesCount','Species Count','number',true), f('endangeredSpecies','Endangered Species','textarea',false), f('biodiversityIndex','Biodiversity Index','number',false)])], undefined, 'D'),
  stage(6, 'Harvest Verification & Procurement', 'HARVEST_VERIFY', 'Logging records, volume, RIL compliance', [section('Harvest', [f('harvestDate','Date','date',true), f('treesHarvested','Trees Harvested','number',true), f('volumeM3','Volume (m³)','number',true), f('rilCompliance','RIL Compliant?','radio',true,{options:['Yes','No']}), f('loggingMethod','Method','dropdown',true,{options:['Reduced Impact','Conventional','Manual']})])], '1M5F_MUST', 'D'),
  stage(7, 'Carbon Stock & Biomass Estimation', 'CARBON_BIOMASS', 'Above/below ground carbon, soil carbon', [section('Carbon', [f('estimationDate','Date','date',true), f('aboveGroundC','Above Ground C (t/ha)','number',true,{carbonField:true}), f('belowGroundC','Below Ground C (t/ha)','number',false,{carbonField:true}), f('soilC','Soil C (t/ha)','number',false,{carbonField:true}), f('totalCarbonStock','Total (t/ha)','autocalc',false,{autocalcFormula:'aboveGroundC + belowGroundC + soilC'})])], undefined, 'A'),
  stage(8, 'Pest & Disease Early Detection', 'PEST_DISEASE', 'Bark beetle, fungal, defoliation detection', [section('Detection', [f('detectionDate','Date','date',true), f('pestType','Pest Type','multiselect',false,{options:['Bark Beetle','Defoliator','Borer','Fungal']}), f('affectedArea','Affected Area (ha)','number',false,{unit:'ha'}), f('treatment','Treatment','textarea',false)])], undefined, 'M'),
  stage(9, 'Community Training & Engagement', 'COMMUNITY', 'Community forest management, training', [section('Community', [f('trainingDate','Date','date',true), f('participantCount','Participants','number',true), f('topic','Topic','text',true), f('communityName','Community','text',true)])], undefined, 'D'),
  stage(10, 'Compliance & Certification', 'COMPLIANCE', 'FSC, PEFC, Verra VCS compliance', [section('Compliance', [f('certId','Cert ID','text',true,{defaultValue:'Auto Gen'}), f('standard','Standard','dropdown',true,{options:['FSC','PEFC','Verra VCS','Gold Standard']}), f('auditDate','Audit Date','date',true), f('auditor','Auditor','text',true), f('compliance','Compliance','dropdown',true,{options:['Compliant','Non-compliant']})])], undefined, 'M'),
  stage(11, 'Traceability & Reporting', 'TRACEABILITY', 'Log tracking, chain of custody, impact report', [section('Traceability', [f('logId','Log ID','text',true,{defaultValue:'Auto Gen'}), f('species','Species','text',true), f('lengthM','Length (m)','number',false), f('diameterCm','Diameter (cm)','number',false), f('destination','Destination','text',false), f('cocCertId','Chain of Custody ID','text',false)])], undefined, 'M'),
]

// ═══════════════════════════════════════════════════════════════
// TIMBERCORE — Timber Legality & Traceability (10 stages)
// ═══════════════════════════════════════════════════════════════
export const TIMBERCORE_STAGES: StageDefinition[] = [
  stage(1, 'Concession & Land Registration', 'CONCESSION', 'Concession license, species, permit', [section('Concession', [f('concessionId','Concession ID','text',true,{defaultValue:'Auto Gen'}), f('concessionaire','Concessionaire','text',true), f('forestType','Forest Type','dropdown',true,{options:['Natural','Plantation']}), f('speciesLicensed','Species Licensed','multiselect',true), f('permitIssueDate','Permit Issue','date',true), f('permitExpiryDate','Permit Expiry','date',true)])], '1M5F_MUST', 'D'),
  stage(2, 'Harvest Planning & Boundary Mapping', 'HARVEST_PLANNING', 'Coupes, boundary, harvest plan', [section('Planning', [f('planningDate','Date','date',true), f('coupeId','Coupe ID','text',true), f('areaHa','Area (ha)','number',true), f('plannedVolume','Planned Volume (m³)','number',true), f('boundaryFile','Boundary File','file',true)])], undefined, 'D'),
  stage(3, 'Procurement & Supplier Management', 'PROCUREMENT', 'Log suppliers, contracts, ratings', [section('Suppliers', [f('supplierId','Supplier ID','text',true,{defaultValue:'Auto Gen'}), f('supplierName','Name','text',true), f('contact','Contact','text',false), f('products','Products','multiselect',false,{options:['Logs','Sawn Timber','Veneer','Plywood']}), f('rating','Rating','dropdown',false,{options:['Good','Average','Poor']})])], undefined, 'D'),
  stage(4, 'Timber Classification & Grading', 'CLASSIFICATION', 'Species, grade, dimensions, quality', [section('Classification', [f('classificationDate','Date','date',true), f('species','Species','text',true), f('grade','Grade','dropdown',true,{options:['Select','Common','Utility','Reject']}), f('lengthM','Length (m)','number',true), f('widthCm','Width (cm)','number',true), f('thicknessCm','Thickness (cm)','number',true)])], undefined, 'D'),
  stage(5, 'Digital Wood ID & Blockchain Traceability', 'DIGITAL_WOOD_ID', 'QR tag, GPS, hash chain for log tracking', [section('Digital ID', [f('logId','Log ID','text',true,{defaultValue:'Auto Gen'}), f('qrCode','QR Code','text',true), f('gpsLat','GPS Lat','number',false), f('gpsLng','GPS Lng','number',false), f('hashChainRef','Hash Chain Ref','text',false), f('harvestDate','Harvest Date','date',true)])], undefined, 'D'),
  stage(6, 'Production Planning', 'PRODUCTION_PLANNING', 'Sawing schedule, yield targets', [section('Planning', [f('planningDate','Date','date',true), f('inputVolumeM3','Input Volume (m³)','number',true), f('targetYieldPct','Target Yield (%)','number',true), f('productMix','Product Mix','textarea',true)])], undefined, 'D'),
  stage(7, 'Manufacturing & Quality Control', 'MANUFACTURING', 'Sawing, planing, QC, waste', [section('Manufacturing', [f('productionDate','Date','date',true), f('inputM3','Input (m³)','number',true), f('outputM3','Output (m³)','number',true), f('yieldPct','Yield (%)','autocalc',true,{autocalcFormula:'outputM3 / inputM3 × 100'}), f('wasteM3','Waste (m³)','number',false), f('qcPassed','QC Passed?','radio',true,{options:['Yes','No']})])], undefined, 'D'),
  stage(8, 'Inventory & Storage Management', 'INVENTORY_STORAGE', 'Stock levels, location, turnover', [section('Inventory', [f('inventoryDate','Date','date',true), f('productType','Product Type','text',true), f('quantityM3','Quantity (m³)','number',true), f('location','Location','text',true), f('batchId','Batch ID','text',false)])], undefined, 'D'),
  stage(9, 'Export & Shipment Management', 'EXPORT_SHIPMENT', 'Bill of lading, destination, container', [section('Export', [f('shipmentDate','Date','date',true), f('containerNo','Container No','text',true), f('destination','Destination','text',true), f('volumeM3','Volume (m³)','number',true), f('billOfLading','B/L No','text',true), f('certificateOrigin','Certificate of Origin','file',true)])], undefined, 'M'),
  stage(10, 'Compliance & Certification', 'COMPLIANCE', 'FSC, legality verification, CITES', [section('Compliance', [f('certId','Cert ID','text',true,{defaultValue:'Auto Gen'}), f('standard','Standard','dropdown',true,{options:['FSC','PEFC','CITES','Legality Verification']}), f('auditDate','Audit Date','date',true), f('auditor','Auditor','text',true), f('compliance','Compliance','dropdown',true,{options:['Compliant','Non-compliant']}), f('cocCertId','Chain of Custody','text',true)])], undefined, 'M'),
]

// ═══════════════════════════════════════════════════════════════
// MANGROVECORE — Mangrove Restoration (9 stages)
// ═══════════════════════════════════════════════════════════════
export const MANGROVECORE_STAGES: StageDefinition[] = [
  stage(1, 'Site Registration & Mapping', 'SITE_REG', 'Site ID, area, community, GIS boundary', [section('Site', [f('siteId','Site ID','text',true,{defaultValue:'Auto Gen'}), f('siteName','Site Name','text',true), f('community','Community/Owner','text',true), f('province','Province','dropdown',true), f('district','District','dropdown',true), f('siteAreaHa','Area (ha)','number',true,{unit:'ha'}), f('registrationDate','Date','date',true), f('gisBoundary','GIS Boundary','file',true)])], '1M5A_MUST', 'D'),
  stage(2, 'Inventory & Species Classification', 'INVENTORY_SPECIES', 'Species, density, biomass', [section('Inventory', [f('surveyDate','Date','date',true), f('speciesList','Species','textarea',true), f('treeDensity','Tree Density (per ha)','number',true), f('avgHeight','Avg Height (m)','number',false), f('avgDBH','Avg DBH (cm)','number',false), f('biomassTonnes','Biomass (t/ha)','number',false)])], undefined, 'D'),
  stage(3, 'Continuous Monitoring & Deforestation Alerts', 'MONITORING_DEFORESTATION', 'Satellite NDVI, loss detection', [section('Monitoring', [f('monitoringDate','Date','date',true), f('ndvi','NDVI','number',false), f('canopyCover','Canopy Cover (%)','number',false), f('deforestationDetected','Deforestation Detected?','radio',false,{options:['Yes','No']}), f('lostAreaHa','Lost Area (ha)','number',false,{conditionalShow:'deforestationDetected'})])], undefined, 'M'),
  stage(4, 'Forest Health, Fire & Pest Risk', 'HEALTH_FIRE_PEST', 'Health, fire risk, pest assessment', [section('Risk', [f('assessmentDate','Date','date',true), f('healthStatus','Health','dropdown',true,{options:['Healthy','Stressed','Degraded']}), f('fireRisk','Fire Risk','dropdown',true,{options:['Low','Medium','High']}), f('pestObserved','Pest?','radio',false,{options:['Yes','No']})])], undefined, 'M'),
  stage(5, 'Restoration Planting & Growth Monitoring', 'RESTORATION', 'Replanting, survival rate, growth', [section('Restoration', [f('plantingDate','Date','date',true), f('speciesPlanted','Species Planted','text',true), f('seedlingsPlanted','Seedlings Planted','number',true), f('survivalRatePct','Survival Rate (%)','number',false), f('growthRateCmYr','Growth Rate (cm/yr)','number',false)])], undefined, 'D'),
  stage(6, 'Carbon Stock & Biomass Estimation', 'CARBON_BIOMASS', 'Blue carbon, above/below ground, soil', [section('Carbon', [f('estimationDate','Date','date',true), f('aboveGroundC','Above Ground C (t/ha)','number',true,{carbonField:true}), f('belowGroundC','Below Ground C (t/ha)','number',false,{carbonField:true}), f('soilC','Soil C (t/ha)','number',true,{carbonField:true}), f('totalCarbonStock','Total (t/ha)','autocalc',true,{autocalcFormula:'aboveGroundC + belowGroundC + soilC'}), f('sequestrationRate','Sequestration Rate (tCO₂/ha/yr)','number',false)])], undefined, 'A'),
  stage(7, 'Community Impact & Engagement', 'COMMUNITY_IMPACT', 'Livelihoods, fishing, training', [section('Community', [f('engagementDate','Date','date',true), f('householdsBenefited','Households','number',true), f('livelihoodType','Livelihood Type','multiselect',false,{options:['Fishing','Crab Farming','Honey','Eco-tourism','Carbon Credits']}), f('trainingProvided','Training','textarea',false)])], undefined, 'D'),
  stage(8, 'Compliance & Certification', 'COMPLIANCE', 'Verra VCS, blue carbon, RAMSAR', [section('Compliance', [f('certId','Cert ID','text',true,{defaultValue:'Auto Gen'}), f('standard','Standard','dropdown',true,{options:['Verra VCS','Gold Standard','RAMSAR','National']}), f('auditDate','Audit Date','date',true), f('auditor','Auditor','text',true), f('compliance','Compliance','dropdown',true,{options:['Compliant','Non-compliant']})])], undefined, 'M'),
  stage(9, 'Integrated Reporting & Dashboards', 'REPORTING', 'Carbon credits, biodiversity, impact', [section('Reporting', [f('reportDate','Date','date',true), f('carbonCreditsIssued','Credits Issued (tCO₂e)','number',false), f('biodiversityScore','Biodiversity Score','number',false), f('communityImpactScore','Community Impact','number',false), f('reportUrl','Report URL','text',false)])], undefined, 'M'),
]

// ═══════════════════════════════════════════════════════════════
// FLORACORE — Floriculture (9 stages)
// ═══════════════════════════════════════════════════════════════
export const FLORACORE_STAGES: StageDefinition[] = [
  stage(1, 'Land Preparation', 'LAND_PREP', 'Beds, soil amendment, greenhouse prep', [section('Land Prep', [f('prepDate','Date','date',true), f('clearingMethod','Method','dropdown',true,{options:['Manual','Mechanical']}), f('implements','Implements','dropdown',false,{options:['Tractor','Rotavator','Hoe']}), f('soilAmendment','Soil Amendment?','radio',false,{options:['Yes','No']}), f('amendmentType','Amendment Type','dropdown',false,{conditionalShow:'soilAmendment',options:['Lime','Compost','Green Manure']}), f('bedsPrepared','Beds Prepared','number',true), f('bedDimensions','Bed Dimensions (m²)','number',false), f('photo','Photo','file',false)])], '1M5V_MUST', 'D'),
  stage(2, 'Planting & Propagation', 'PLANTING', 'Cuttings, seeds, tissue culture, planting', [section('Planting', [f('plantingDate','Date','date',true), f('propagationMethod','Method','dropdown',true,{options:['Seed','Cutting','Tissue Culture','Bulb','Grafting']}), f('variety','Variety','text',true), f('spacing','Spacing','text',true), f('quantity','Quantity Planted','number',true), f('seedlingCost','Seedling Cost','number',false,{costField:true})])], undefined, 'D'),
  stage(3, 'Irrigation & Nutrient Management', 'IRRIGATION_NUTRIENT', 'Drip/fertigation, NPK schedule', [section('Irrigation', [f('irrigDate','Date','date',true), f('system','System','dropdown',true,{options:['Drip','Sprinkler','Mist','Manual']}), f('waterL','Water (L)','number',false)]), section('Fertilizer', [f('fertDate','Date','date',true), f('product','Product','text',true), f('doseKg','Dose (kg)','number',true,{costField:true,carbonField:true}), f('cost','Cost','number',false,{costField:true})])], undefined, 'A'),
  stage(4, 'Crop Monitoring & Phenology', 'MONITORING', 'Growth stage, height, health', [section('Monitoring', [f('visitDate','Date','date',true), f('growthStage','Stage','dropdown',true,{options:['Vegetative','Bud Formation','Flowering','Harvest Ready']}), f('plantHeight','Height (cm)','number',false), f('leafCount','Leaf Count','number',false), f('health','Health','dropdown',false,{options:['Good','Fair','Poor']})])], undefined, 'M'),
  stage(5, 'Pest & Disease Management', 'PEST_DISEASE', 'Thrips, mites, botrytis, powdery mildew', [section('Scouting', [f('scoutDate','Date','date',true), f('pestType','Pest','multiselect',false,{options:['Thrips','Mites','Aphids','Whitefly','Nematodes']}), f('diseaseType','Disease','multiselect',false,{options:['Botrytis','Powdery Mildew','Rust','Root Rot','Virus']})]), section('Treatment', [f('treatmentDate','Date','date',true), f('treatmentType','Type','dropdown',true,{options:['Chemical','Bio','Cultural']}), f('product','Product','text',false), f('dose','Dose','text',false), f('pesticideKg','Amount (kg)','number',false,{carbonField:true,costField:true})])], undefined, 'A'),
  stage(6, 'Flowering & Harvesting', 'FLOWERING_HARVEST', 'Bloom tracking, harvest timing, yield', [section('Flowering', [f('bloomDate','Date','date',true), f('bloomCount','Bloom Count','number',true), f('quality','Quality','dropdown',true,{options:['Premium','Standard','Reject']}), f('harvestDate','Harvest Date','date',true), f('stemsHarvested','Stems Harvested','number',true), f('method','Method','dropdown',true,{options:['Manual','Mechanical']})])], undefined, 'M'),
  stage(7, 'Post-Harvest Handling & Grading', 'POST_HARVEST', 'Sorting, grading, bunching', [section('Grading', [f('gradeDate','Date','date',true), f('premium','Premium Stems','number',false), f('standard','Standard Stems','number',false), f('reject','Reject Stems','number',false), f('bunchSize','Bunch Size','number',true), f('bunchCount','Bunch Count','number',true)])], undefined, 'M'),
  stage(8, 'Cold Storage & Logistics', 'COLD_STORAGE', 'Cold chain, auction, export logistics', [section('Cold Storage', [f('entryDate','Date','date',true), f('temp','Temperature (°C)','number',true), f('humidity','Humidity (%)','number',false), f('durationHrs','Duration (hrs)','number',false)]), section('Logistics', [f('dispatchDate','Dispatch Date','date',false), f('destination','Destination','text',false), f('auctionCenter','Auction Center','text',false), f('transportMode','Transport','dropdown',false,{options:['Air','Truck','Refrigerated Van']})])], undefined, 'M'),
  stage(9, 'Certification & Quality Inspection', 'CERT_INSPECTION', 'Floriculture standards, MPS, GlobalG.A.P.', [section('Certification', [f('certId','Cert ID','text',true,{defaultValue:'Auto Gen'}), f('standard','Standard','dropdown',true,{options:['MPS','GlobalG.A.P.','Fair Trade','Rainforest Alliance']}), f('auditDate','Audit Date','date',true), f('auditor','Auditor','text',true), f('compliance','Compliance','dropdown',true,{options:['Compliant','Non-compliant']})]), section('Inspection', [f('inspectionId','ID','text',true,{defaultValue:'Auto Gen'}), f('inspectionDate','Date','date',true), f('inspector','Inspector','text',true), f('observations','Observations','textarea',false)])], undefined, 'M'),
]

// ─── Export all remaining verticals ────────────────────────────
export const ALL_REMAINING_VERTICALS = {
  cropcore: { stages: CROPCORE_STAGES, cropTypes: ['Rice', 'Maize', 'Wheat', 'Sorghum'], farm5xVariant: '1M5M / 1M5R' },
  orchardcore: { stages: ORCHARDCORE_STAGES, cropTypes: ['Avocado', 'Mango', 'Citrus', 'Apple'], farm5xVariant: '1M5O' },
  vegcore: { stages: VEGCORE_STAGES, cropTypes: ['Tomato', 'Cabbage', 'Onion', 'Pepper'], farm5xVariant: '1M5V' },
  floracore: { stages: FLORACORE_STAGES, cropTypes: ['Rose', 'Carnation', 'Lily', 'Orchid'], farm5xVariant: '1M5V' },
  aquacore: { stages: AQUACORE_STAGES, cropTypes: ['Shrimp', 'Tilapia', 'Catfish', 'Pangasius'], farm5xVariant: '1M5A' },
  forestcore: { stages: FORESTCORE_STAGES, cropTypes: ['Timber', 'Agroforestry', 'Bamboo'], farm5xVariant: '1M5F' },
  timbercore: { stages: TIMBERCORE_STAGES, cropTypes: ['Pine', 'Teak', 'Mahogany', 'Eucalyptus'], farm5xVariant: '1M5F' },
  mangrovecore: { stages: MANGROVECORE_STAGES, cropTypes: ['Mangrove Restoration', 'Blue Carbon'], farm5xVariant: '1M5A' },
} as const
