/**
 * CoffeeCore — Stage Definitions for Coffee & Cocoa
 *
 * 12 stages covering the complete coffee/cocoa production cycle,
 * extracted from the New Ecosystem Excel (Terra Bean sheet).
 *
 * Each stage defines:
 *   - stageNumber: order in the production cycle
 *   - stageName: human-readable name
 *   - eventType: machine-readable event type
 *   - description: what this stage covers
 *   - sections: grouped fields with type + mandatory + options
 *   - farm5xLink: which Farm5x practice (if any) this stage can trigger
 *   - costFields: which fields contribute to auto-calc input cost
 *   - carbonFields: which fields contribute to auto-calc carbon emissions
 *
 * Used by:
 *   - /api/crop-stages (POST validates against these definitions)
 *   - Flutter Practice Logger (renders form per stage)
 *   - Web admin (stage timeline view)
 *   - DREAM pipeline (which stages trigger which DREAM phases)
 */

export interface StageField {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'dropdown' | 'radio' | 'textarea' | 'file' | 'multiselect' | 'autocalc'
  mandatory: boolean
  options?: string[]
  unit?: string
  defaultValue?: string
  conditionalShow?: string  // field name that must be "Yes" to show this field
  autocalcFormula?: string  // for display: "quantity × price"
  costField?: boolean       // contributes to inputCostTotal
  carbonField?: boolean     // contributes to carbonKgCO2e
}

export interface StageSection {
  name: string
  fields: StageField[]
}

export interface StageDefinition {
  stageNumber: number
  stageName: string
  eventType: string
  description: string
  sections: StageSection[]
  farm5xLink?: string  // Farm5x practice code this stage can trigger
  dreamPhase?: 'D' | 'R' | 'E' | 'A' | 'M'  // which DREAM phase this stage advances
}

// ════════════════════════════════════════════════════════════
// COFFEECORE — 12 STAGES
// ════════════════════════════════════════════════════════════

export const COFFEECORE_STAGES: StageDefinition[] = [
  // ─── Stage 1: Nursery & Pre-Harvest Management ───
  {
    stageNumber: 1,
    stageName: 'Nursery & Pre-Harvest Management',
    eventType: 'NURSERY',
    description: 'Nursery preparation, seedling management, and pre-harvest operations for coffee/cocoa',
    dreamPhase: 'D',
    sections: [
      {
        name: 'Nursery Preparation',
        fields: [
          { name: 'nurseryId', label: 'Nursery ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
          { name: 'nurseryCapacity', label: 'Nursery Capacity (#plants)', type: 'number', mandatory: true },
          { name: 'sowingDate', label: 'Sowing Date', type: 'date', mandatory: true },
          { name: 'germinationRate', label: 'Germination Rate (%)', type: 'number', mandatory: false, unit: '%' },
          { name: 'seedlingHealthStatus', label: 'Seedling Health Status', type: 'dropdown', mandatory: false, options: ['Good', 'Fair', 'Poor'], defaultValue: 'Good' },
          { name: 'transplantDate', label: 'Transplant Date', type: 'date', mandatory: true },
        ],
      },
      {
        name: 'Nursery Operations',
        fields: [
          { name: 'wateringSchedule', label: 'Watering Schedule', type: 'textarea', mandatory: true, defaultValue: 'Frequency, volume' },
          { name: 'fertilizerApplication', label: 'Fertilizer Application', type: 'textarea', mandatory: false, defaultValue: 'Type, dose, timing' },
          { name: 'pestDiseaseChecks', label: 'Pest/Disease Checks', type: 'textarea', mandatory: false, defaultValue: 'Findings, actions' },
          { name: 'photoUrl', label: 'Photo Documentation', type: 'file', mandatory: false },
        ],
      },
    ],
  },

  // ─── Stage 2: Land Preparation & Planting ───
  {
    stageNumber: 2,
    stageName: 'Land Preparation & Planting',
    eventType: 'LAND_PREP_PLANTING',
    description: 'Land clearing, preparation, and planting of coffee/cocoa seedlings',
    farm5xLink: '1M5C_MUST',  // Shade tree planting can happen at this stage
    dreamPhase: 'D',
    sections: [
      {
        name: 'Land Preparation',
        fields: [
          { name: 'eventDate', label: 'Date of Event', type: 'date', mandatory: true, defaultValue: 'Current Date' },
          { name: 'activity', label: 'Activity', type: 'dropdown', mandatory: true, options: ['Debushing', 'Plowing', 'Leveling'], defaultValue: 'Plowing' },
          { name: 'implementsUsed', label: 'Implements Used', type: 'dropdown', mandatory: false, options: ['Bullock', 'Tractor', 'Rotovator', 'Manual'] },
          { name: 'compostApplied', label: 'Compost Applied?', type: 'radio', mandatory: false, options: ['Yes', 'No'], defaultValue: 'No' },
          { name: 'compostType', label: 'Compost Type', type: 'text', mandatory: false, conditionalShow: 'compostApplied' },
          { name: 'photoUrl', label: 'Photo Capture', type: 'file', mandatory: false },
        ],
      },
      {
        name: 'Planting',
        fields: [
          { name: 'plantingDate', label: 'Planting Date', type: 'date', mandatory: true },
          { name: 'plantingMethod', label: 'Planting Method', type: 'dropdown', mandatory: true, options: ['Hole Planting', 'Transplanting'], defaultValue: 'Hole Planting' },
          { name: 'seedlingAge', label: 'Seedling Age (Days)', type: 'number', mandatory: true, unit: 'days' },
          { name: 'plantsPerHa', label: 'Plants per Ha', type: 'number', mandatory: false },
          { name: 'spacing', label: 'Spacing (cm)', type: 'text', mandatory: false, defaultValue: 'Row × plant spacing' },
        ],
      },
      {
        name: 'Shade Tree Planting (Farm5x Must)',
        fields: [
          { name: 'shadeTreeSpecies', label: 'Shade Tree Species', type: 'text', mandatory: false, defaultValue: 'Banana, Albizzia, Grevillea' },
          { name: 'shadeTreeCount', label: 'Trees Planted', type: 'number', mandatory: false },
          { name: 'targetCanopyCover', label: 'Target Canopy Cover (%)', type: 'number', mandatory: false, unit: '%', defaultValue: '30' },
        ],
      },
    ],
  },

  // ─── Stage 3: Crop Monitoring & Alerts ───
  {
    stageNumber: 3,
    stageName: 'Crop Monitoring & Alerts',
    eventType: 'CROP_MONITORING',
    description: 'Field visits for growth monitoring, stress/pest detection, and advisory alerts',
    dreamPhase: 'M',
    sections: [
      {
        name: 'Field Visit',
        fields: [
          { name: 'visitDate', label: 'Visit Date', type: 'date', mandatory: true, defaultValue: 'Current Date' },
          { name: 'growthStage', label: 'Growth Stage', type: 'dropdown', mandatory: true, options: ['Vegetative', 'Flowering', 'Cherry Development', 'Ripening', 'Dormant'] },
          { name: 'plantHeight', label: 'Plant Height (cm)', type: 'number', mandatory: false, unit: 'cm' },
          { name: 'canopyCover', label: 'Canopy Cover (%)', type: 'number', mandatory: false, unit: '%' },
          { name: 'leafColorIndex', label: 'Leaf Color Index', type: 'dropdown', mandatory: false, options: ['Green', 'Yellow', 'Red'], defaultValue: 'Green' },
          { name: 'soilMoistureStatus', label: 'Soil Moisture Status', type: 'dropdown', mandatory: false, options: ['Dry', 'Adequate', 'Wet'], defaultValue: 'Adequate' },
        ],
      },
      {
        name: 'Stress & Pests',
        fields: [
          { name: 'pestInfestation', label: 'Pest Infestation?', type: 'radio', mandatory: false, options: ['Yes', 'No'], defaultValue: 'No' },
          { name: 'pestType', label: 'Pest Type', type: 'multiselect', mandatory: false, conditionalShow: 'pestInfestation', options: ['Coffee Berry Borer', 'Antestia Bug', 'Leaf Miner', 'Stem Borer', 'Aphids'] },
          { name: 'diseaseSymptoms', label: 'Disease Symptoms?', type: 'radio', mandatory: false, options: ['Yes', 'No'], defaultValue: 'No' },
          { name: 'diseaseType', label: 'Disease Type', type: 'multiselect', mandatory: false, conditionalShow: 'diseaseSymptoms', options: ['Coffee Leaf Rust', 'Coffee Berry Disease', 'Anthracnose', 'Root Rot', 'Cercospora'] },
          { name: 'recommendation', label: 'Recommendation', type: 'textarea', mandatory: false, defaultValue: 'Action items' },
          { name: 'alertTriggered', label: 'Alert Triggered?', type: 'radio', mandatory: false, options: ['Yes', 'No'], defaultValue: 'No' },
        ],
      },
    ],
  },

  // ─── Stage 4: Fertilizer & Nutrient Management ───
  {
    stageNumber: 4,
    stageName: 'Fertilizer & Nutrient Management',
    eventType: 'FERTILIZER',
    description: 'Soil testing, nutrient planning, and fertilizer application',
    farm5xLink: '1M5C_R5',  // Soil testing + liming is a Farm5x Reduce
    dreamPhase: 'A',
    sections: [
      {
        name: 'Nutrient Planning',
        fields: [
          { name: 'soilTestDate', label: 'Soil Test Date', type: 'date', mandatory: false },
          { name: 'soilPH', label: 'pH', type: 'number', mandatory: false, unit: 'pH' },
          { name: 'soilN', label: 'N (%)', type: 'number', mandatory: false, unit: '%' },
          { name: 'soilP', label: 'P (ppm)', type: 'number', mandatory: false, unit: 'ppm' },
          { name: 'soilK', label: 'K (ppm)', type: 'number', mandatory: false, unit: 'ppm' },
        ],
      },
      {
        name: 'Application',
        fields: [
          { name: 'applicationDate', label: 'Application Date', type: 'date', mandatory: true, defaultValue: 'Current Date' },
          { name: 'fertilizerType', label: 'Fertilizer Type', type: 'dropdown', mandatory: true, options: ['Chemical', 'Organic', 'Green Manure'], defaultValue: 'Chemical' },
          { name: 'product', label: 'Product', type: 'text', mandatory: true, defaultValue: 'e.g. NPK 17-17-17' },
          { name: 'doseKgHa', label: 'Dose (kg/Ha)', type: 'number', mandatory: true, unit: 'kg/ha' },
          { name: 'appliedQtyKg', label: 'Applied Qty (kg)', type: 'number', mandatory: true, unit: 'kg', costField: true, carbonField: true },
          { name: 'costPerUnit', label: 'Cost per Unit', type: 'number', mandatory: true, unit: 'currency/kg', costField: true },
          { name: 'totalCost', label: 'Total Cost', type: 'autocalc', mandatory: true, autocalcFormula: 'appliedQtyKg × costPerUnit' },
        ],
      },
    ],
  },

  // ─── Stage 5: Pest & Disease Management ───
  {
    stageNumber: 5,
    stageName: 'Pest & Disease Management',
    eventType: 'PEST_DISEASE',
    description: 'Pest scouting, disease identification, and treatment application',
    farm5xLink: '1M5C_R3',  // IPM is a Farm5x Reduce
    dreamPhase: 'A',
    sections: [
      {
        name: 'Scouting',
        fields: [
          { name: 'scoutingDate', label: 'Scouting Date', type: 'date', mandatory: true, defaultValue: 'Current Date' },
          { name: 'pestIdentified', label: 'Pest Identified?', type: 'radio', mandatory: false, options: ['Yes', 'No'], defaultValue: 'No' },
          { name: 'pestType', label: 'Pest Type', type: 'multiselect', mandatory: false, conditionalShow: 'pestIdentified', options: ['Berry Borer', 'Antestia', 'Leaf Miner', 'Mealybug', 'Scale Insect'] },
          { name: 'pestDensity', label: 'Pest Density', type: 'text', mandatory: false, unit: '#/sq m' },
          { name: 'diseaseIdentified', label: 'Disease Identified?', type: 'radio', mandatory: false, options: ['Yes', 'No'], defaultValue: 'No' },
          { name: 'diseaseType', label: 'Disease Type', type: 'multiselect', mandatory: false, conditionalShow: 'diseaseIdentified', options: ['Leaf Rust', 'Berry Disease', 'Anthracnose', 'Bacterial Blight'] },
          { name: 'severityLevel', label: 'Severity Level', type: 'dropdown', mandatory: false, options: ['Low', 'Medium', 'High'], defaultValue: 'Medium' },
        ],
      },
      {
        name: 'Treatment',
        fields: [
          { name: 'treatmentDate', label: 'Treatment Date', type: 'date', mandatory: true },
          { name: 'treatmentType', label: 'Treatment Type', type: 'dropdown', mandatory: true, options: ['Chemical', 'Bio', 'Mechanical', 'Cultural'], defaultValue: 'Chemical' },
          { name: 'product', label: 'Product', type: 'text', mandatory: false },
          { name: 'dose', label: 'Dose', type: 'text', mandatory: false, unit: 'kg or L' },
          { name: 'pesticideKg', label: 'Pesticicide Applied (kg)', type: 'number', mandatory: false, unit: 'kg', costField: true, carbonField: true },
          { name: 'equipmentUsed', label: 'Equipment Used', type: 'dropdown', mandatory: false, options: ['Knapsack', 'Power Sprayer', 'Motorized'], defaultValue: 'Knapsack' },
        ],
      },
    ],
  },

  // ─── Stage 6: Harvest & Post-Harvest Traceability ───
  {
    stageNumber: 6,
    stageName: 'Harvest & Post-Harvest Traceability',
    eventType: 'HARVEST',
    description: 'Harvest planning, yield recording, post-harvest QC, and traceability batch creation',
    dreamPhase: 'M',
    sections: [
      {
        name: 'Harvest Planning',
        fields: [
          { name: 'plannedHarvestDate', label: 'Planned Harvest Date', type: 'date', mandatory: true },
          { name: 'estimatedYieldKgHa', label: 'Estimated Yield (kg/Ha)', type: 'number', mandatory: false, unit: 'kg/ha' },
          { name: 'actualHarvestDate', label: 'Actual Harvest Date', type: 'date', mandatory: true },
          { name: 'harvestMethod', label: 'Harvest Method', type: 'dropdown', mandatory: true, options: ['Manual', 'Mechanical', 'Selective Picking'], defaultValue: 'Manual' },
          { name: 'fieldMoisture', label: 'Field Moisture (%)', type: 'number', mandatory: false, unit: '%' },
        ],
      },
      {
        name: 'Yield Recording',
        fields: [
          { name: 'sampleWeightKg', label: 'Sample Weight (kg)', type: 'number', mandatory: true, unit: 'kg' },
          { name: 'sampleAreaSqm', label: 'Sample Area (sq m)', type: 'number', mandatory: true, unit: 'sq m' },
          { name: 'sampleYield', label: 'Sample Yield (kg)', type: 'autocalc', mandatory: true, autocalcFormula: 'sampleWeightKg' },
          { name: 'estimatedYieldTHa', label: 'Estimated Yield (t/Ha)', type: 'autocalc', mandatory: true, autocalcFormula: 'sampleWeightKg / sampleAreaSqm × 10000 / 1000' },
        ],
      },
      {
        name: 'Post-Harvest QC',
        fields: [
          { name: 'moistureContent', label: 'Moisture Content (%)', type: 'number', mandatory: false, unit: '%' },
          { name: 'defectiveBeans', label: 'Defective Beans (%)', type: 'number', mandatory: false, unit: '%' },
          { name: 'foreignMatter', label: 'Foreign Matter (%)', type: 'number', mandatory: false, unit: '%' },
        ],
      },
      {
        name: 'Traceability Batch',
        fields: [
          { name: 'batchId', label: 'Batch ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
          { name: 'processingStage', label: 'Processing Stage', type: 'dropdown', mandatory: true, options: ['Harvested', 'Depulped', 'Fermented', 'Dried', 'Graded', 'Packaged'], defaultValue: 'Harvested' },
          { name: 'location', label: 'Location', type: 'dropdown', mandatory: true, options: ['Farm', 'Processing Plant', 'Cold Storage', 'Warehouse'], defaultValue: 'Farm' },
          { name: 'actor', label: 'Actor', type: 'dropdown', mandatory: true, options: ['Farmer', 'Processor', 'Cooperative'], defaultValue: 'Farmer' },
          { name: 'notes', label: 'Notes', type: 'textarea', mandatory: false },
        ],
      },
    ],
  },

  // ─── Stage 7: Certification & Smart Contracts ───
  {
    stageNumber: 7,
    stageName: 'Certification & Smart Contracts',
    eventType: 'CERTIFICATION',
    description: 'Certification audit, compliance status, and buyer-farmer smart contracts',
    dreamPhase: 'M',
    sections: [
      {
        name: 'Certification',
        fields: [
          { name: 'certificationId', label: 'Certification ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
          { name: 'standard', label: 'Standard', type: 'dropdown', mandatory: true, options: ['USDA Organic', 'GlobalG.A.P.', 'Fair Trade', 'Rainforest Alliance', '4C', 'UTZ'], defaultValue: 'Organic' },
          { name: 'auditDate', label: 'Audit Date', type: 'date', mandatory: true },
          { name: 'auditorName', label: 'Auditor Name', type: 'text', mandatory: true },
          { name: 'complianceStatus', label: 'Compliance Status', type: 'dropdown', mandatory: true, options: ['Compliant', 'Non-compliant'], defaultValue: 'Compliant' },
          { name: 'auditReport', label: 'Audit Report', type: 'file', mandatory: false },
        ],
      },
      {
        name: 'Smart Contracts',
        fields: [
          { name: 'contractId', label: 'Contract ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
          { name: 'buyer', label: 'Buyer', type: 'text', mandatory: true },
          { name: 'quantityKg', label: 'Quantity (kg)', type: 'number', mandatory: true, unit: 'kg' },
          { name: 'pricePerKg', label: 'Price (currency/kg)', type: 'number', mandatory: true, unit: 'currency/kg' },
          { name: 'totalValue', label: 'Total Value', type: 'autocalc', mandatory: true, autocalcFormula: 'quantityKg × pricePerKg' },
        ],
      },
    ],
  },

  // ─── Stage 8: Marketplace & Sales ───
  {
    stageNumber: 8,
    stageName: 'Marketplace & Sales',
    eventType: 'SALES',
    description: 'Batch listing, buyer requests, and sale transactions',
    sections: [
      {
        name: 'Listing',
        fields: [
          { name: 'listingId', label: 'Listing ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
          { name: 'batchId', label: 'Batch ID', type: 'text', mandatory: true },
          { name: 'listingDate', label: 'Listing Date', type: 'date', mandatory: true, defaultValue: 'Current Date' },
          { name: 'availableQtyKg', label: 'Available Quantity (kg)', type: 'number', mandatory: true, unit: 'kg' },
          { name: 'pricePerKg', label: 'Price (currency/kg)', type: 'number', mandatory: true, unit: 'currency/kg' },
          { name: 'priceValidUntil', label: 'Price Valid Until', type: 'date', mandatory: false },
        ],
      },
      {
        name: 'Sale Transaction',
        fields: [
          { name: 'transactionId', label: 'Transaction ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
          { name: 'dateOfSale', label: 'Date of Sale', type: 'date', mandatory: true },
          { name: 'quantitySoldKg', label: 'Quantity Sold (kg)', type: 'number', mandatory: true, unit: 'kg' },
          { name: 'totalAmount', label: 'Total Amount', type: 'autocalc', mandatory: true, autocalcFormula: 'quantitySoldKg × pricePerKg' },
        ],
      },
    ],
  },

  // ─── Stage 9: Certification Assessment ───
  {
    stageNumber: 9,
    stageName: 'Certification Assessment',
    eventType: 'CERT_ASSESSMENT',
    description: 'Multi-standard certification assessment across compliance dimensions',
    sections: [
      {
        name: 'Assessment Info',
        fields: [
          { name: 'assessmentId', label: 'Assessment ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
          { name: 'certificationStandard', label: 'Certification Standard', type: 'dropdown', mandatory: true, options: ['USDA Organic', 'GlobalG.A.P.', 'Fair Trade', '4C', 'UTZ', 'Rainforest Alliance', 'Halal'] },
          { name: 'assessmentDate', label: 'Assessment Date', type: 'date', mandatory: true, defaultValue: 'Current Date' },
          { name: 'assessorName', label: 'Assessor Name', type: 'text', mandatory: true },
          { name: 'farmManagementPlanDoc', label: 'Farm Management Plan Document', type: 'file', mandatory: true },
        ],
      },
      {
        name: 'Compliance Check',
        fields: [
          { name: 'documentationCompleteness', label: 'Documentation Completeness', type: 'dropdown', mandatory: true, options: ['Compliant', 'Non-compliant'], defaultValue: 'Compliant' },
          { name: 'traceabilitySystem', label: 'Traceability System in Place', type: 'dropdown', mandatory: true, options: ['Compliant', 'Non-compliant'], defaultValue: 'Compliant' },
          { name: 'workerRegistration', label: 'Worker Registration Complete', type: 'dropdown', mandatory: true, options: ['Compliant', 'Non-compliant'], defaultValue: 'Compliant' },
          { name: 'envProtection', label: 'Environmental Protection Measures', type: 'dropdown', mandatory: true, options: ['Compliant', 'Non-compliant'], defaultValue: 'Compliant' },
          { name: 'soilErosionPrevention', label: 'Soil Erosion Prevention', type: 'dropdown', mandatory: true, options: ['Compliant', 'Non-compliant'], defaultValue: 'Compliant' },
        ],
      },
    ],
  },

  // ─── Stage 10: Inspection & Audit ───
  {
    stageNumber: 10,
    stageName: 'Inspection & Audit',
    eventType: 'INSPECTION',
    description: 'Field/plant/warehouse inspections, non-conformance tracking, corrective actions',
    sections: [
      {
        name: 'Inspection',
        fields: [
          { name: 'inspectionId', label: 'Inspection ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
          { name: 'batchId', label: 'Batch ID', type: 'text', mandatory: true },
          { name: 'inspectionDate', label: 'Inspection Date', type: 'date', mandatory: true, defaultValue: 'Current Date' },
          { name: 'inspectorName', label: 'Inspector Name', type: 'text', mandatory: true },
          { name: 'inspectionType', label: 'Inspection Type', type: 'dropdown', mandatory: true, options: ['Field', 'Processing Plant', 'Warehouse', 'Cold Storage'], defaultValue: 'Field' },
          { name: 'inspectionScope', label: 'Inspection Scope', type: 'textarea', mandatory: true },
          { name: 'observations', label: 'Observations', type: 'textarea', mandatory: false },
        ],
      },
      {
        name: 'Non-Conformance',
        fields: [
          { name: 'nonConformanceIdentified', label: 'Non-Conformance Identified?', type: 'radio', mandatory: true, options: ['Yes', 'No'], defaultValue: 'No' },
          { name: 'nonConformanceDetails', label: 'Non-Conformance Details', type: 'textarea', mandatory: false, conditionalShow: 'nonConformanceIdentified' },
          { name: 'correctiveActions', label: 'Corrective Actions Required', type: 'textarea', mandatory: false, conditionalShow: 'nonConformanceIdentified' },
          { name: 'actionDueDate', label: 'Action Due Date', type: 'date', mandatory: false, conditionalShow: 'nonConformanceIdentified' },
          { name: 'followUpDate', label: 'Follow-Up Inspection Date', type: 'date', mandatory: false, conditionalShow: 'nonConformanceIdentified' },
        ],
      },
    ],
  },

  // ─── Stage 11: Cost & Economics Tracking ───
  {
    stageNumber: 11,
    stageName: 'Cost & Economics Tracking',
    eventType: 'COST_ECONOMICS',
    description: 'Aggregated input costs, revenue, profit/loss, and ROI per cultivation cycle',
    sections: [
      {
        name: 'Cost Summary (auto-aggregated from stages 1-10)',
        fields: [
          { name: 'totalSeedCost', label: 'Total Seed/Seedling Cost', type: 'number', mandatory: false, unit: 'currency', costField: true },
          { name: 'totalFertilizerCost', label: 'Total Fertilizer Cost', type: 'number', mandatory: false, unit: 'currency', costField: true },
          { name: 'totalPesticideCost', label: 'Total Pesticide Cost', type: 'number', mandatory: false, unit: 'currency', costField: true },
          { name: 'totalFuelCost', label: 'Total Fuel Cost', type: 'number', mandatory: false, unit: 'currency', costField: true },
          { name: 'totalLaborCost', label: 'Total Labor Cost', type: 'number', mandatory: false, unit: 'currency', costField: true },
          { name: 'totalInputCost', label: 'Total Input Cost', type: 'autocalc', mandatory: true, autocalcFormula: 'seed + fertilizer + pesticide + fuel + labor' },
        ],
      },
      {
        name: 'Revenue & Profitability',
        fields: [
          { name: 'totalYieldKg', label: 'Total Yield (kg)', type: 'number', mandatory: false, unit: 'kg' },
          { name: 'avgPricePerKg', label: 'Avg Price/kg', type: 'number', mandatory: false, unit: 'currency/kg' },
          { name: 'totalRevenue', label: 'Total Revenue', type: 'autocalc', mandatory: true, autocalcFormula: 'totalYieldKg × avgPricePerKg' },
          { name: 'profitLoss', label: 'Profit/Loss', type: 'autocalc', mandatory: true, autocalcFormula: 'totalRevenue - totalInputCost' },
          { name: 'roi', label: 'ROI (%)', type: 'autocalc', mandatory: true, autocalcFormula: '(profitLoss / totalInputCost) × 100' },
          { name: 'costPerKg', label: 'Cost per kg', type: 'autocalc', mandatory: true, autocalcFormula: 'totalInputCost / totalYieldKg' },
        ],
      },
    ],
  },

  // ─── Stage 12: DREAM MRV & Carbon Summary ───
  {
    stageNumber: 12,
    stageName: 'DREAM MRV & Carbon Summary',
    eventType: 'DREAM_SUMMARY',
    description: 'DREAM pipeline status, Farm5x adoption summary, carbon credits, and Verra eligibility',
    dreamPhase: 'M',
    sections: [
      {
        name: 'DREAM Pipeline Status',
        fields: [
          { name: 'dreamData', label: 'D — Data Collected', type: 'radio', mandatory: false, options: ['Verified', 'Pending'], defaultValue: 'Pending' },
          { name: 'dreamRemote', label: 'R — Remote Sensing', type: 'radio', mandatory: false, options: ['Verified', 'Pending'], defaultValue: 'Pending' },
          { name: 'dreamEvent', label: 'E — Event Detection', type: 'radio', mandatory: false, options: ['Verified', 'Pending'], defaultValue: 'Pending' },
          { name: 'dreamAnalytics', label: 'A — Analytics (IPCC)', type: 'radio', mandatory: false, options: ['Verified', 'Pending'], defaultValue: 'Pending' },
          { name: 'dreamMonitor', label: 'M — Monitoring', type: 'radio', mandatory: false, options: ['Verified', 'Pending'], defaultValue: 'Pending' },
          { name: 'dreamComplete', label: 'DREAM Complete', type: 'autocalc', mandatory: false, autocalcFormula: 'All 5 phases verified' },
        ],
      },
      {
        name: 'Farm5x Adoption',
        fields: [
          { name: 'farm5xVariant', label: 'Variant', type: 'text', mandatory: false, defaultValue: '1M5C (Coffee) or 1M5K (Cocoa)' },
          { name: 'mandatoryAdopted', label: 'Must Practice Adopted', type: 'radio', mandatory: false, options: ['Yes', 'No'], defaultValue: 'No' },
          { name: 'reducesAdopted', label: 'Reduces Adopted (count)', type: 'number', mandatory: false, defaultValue: '0' },
          { name: 'eligibleForCredits', label: 'Eligible for Carbon Credits', type: 'autocalc', mandatory: false, autocalcFormula: 'mandatory + ≥3 reduces' },
          { name: 'emissionReductionPct', label: 'Emission Reduction (%)', type: 'number', mandatory: false, unit: '%' },
        ],
      },
      {
        name: 'Carbon Summary',
        fields: [
          { name: 'totalEmissionsKgCO2e', label: 'Total Emissions (kg CO2e)', type: 'number', mandatory: false, unit: 'kg CO2e' },
          { name: 'baselineEmissionsKgCO2e', label: 'Baseline Emissions (kg CO2e)', type: 'number', mandatory: false, unit: 'kg CO2e' },
          { name: 'emissionsAvoided', label: 'Emissions Avoided (tCO2e)', type: 'autocalc', mandatory: false, autocalcFormula: '(baseline - actual) / 1000' },
          { name: 'verraProjectId', label: 'Verra Project ID', type: 'text', mandatory: false },
          { name: 'creditsIssued', label: 'Credits Issued (tCO2e)', type: 'number', mandatory: false, unit: 'tCO2e' },
        ],
      },
    ],
  },
]

// ─── Helper: get stage by number ───
export function getStageByNumber(stageNumber: number): StageDefinition | undefined {
  return COFFEECORE_STAGES.find(s => s.stageNumber === stageNumber)
}

// ─── Helper: get all cost fields across stages ───
export function getAllCostFields(): { stage: number; fields: string[] }[] {
  return COFFEECORE_STAGES.map(stage => ({
    stage: stage.stageNumber,
    fields: stage.sections.flatMap(s => s.fields.filter(f => f.costField).map(f => f.name)),
  })).filter(s => s.fields.length > 0)
}

// ─── Helper: get all carbon fields across stages ───
export function getAllCarbonFields(): { stage: number; fields: string[] }[] {
  return COFFEECORE_STAGES.map(stage => ({
    stage: stage.stageNumber,
    fields: stage.sections.flatMap(s => s.fields.filter(f => f.carbonField).map(f => f.name)),
  })).filter(s => s.fields.length > 0)
}

// ─── Helper: total field count ───
export function getTotalFieldCount(): number {
  return COFFEECORE_STAGES.reduce((sum, stage) =>
    sum + stage.sections.reduce((s, sec) => s + sec.fields.length, 0), 0
  )
}
