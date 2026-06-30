/**
 * LiveCore — Stage Definitions for Livestock & Dairy
 *
 * 20 stages covering the complete livestock/dairy production cycle,
 * extracted from the New Ecosystem Excel (Terra Graze sheet).
 *
 * Covers: Dairy, Beef, Poultry, Pig, Sheep, Goat production types.
 * Linked to Farm5x variant 1M5D (Improved forage as Must).
 *
 * Integration:
 *   Stage 7 (Waste & Manure) → Carbon calculator (manure CH4/N2O)
 *   Stage 8 (Carbon & Emissions) → IPCC Tier 2 enteric + manure model
 *   Stage 8 → Farm5x 1M5D eligibility check
 *   Stage 18 (Milking) → Traceability batch creation
 *   Stage 19 (Milk Quality) → Traceability event chain
 */

export interface LiveStageField {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'dropdown' | 'radio' | 'textarea' | 'file' | 'multiselect' | 'autocalc' | 'time'
  mandatory: boolean
  options?: string[]
  unit?: string
  defaultValue?: string
  conditionalShow?: string
  autocalcFormula?: string
  costField?: boolean
  carbonField?: boolean
}

export interface LiveStageSection {
  name: string
  fields: LiveStageField[]
}

export interface LiveStageDefinition {
  stageNumber: number
  stageName: string
  eventType: string
  description: string
  sections: LiveStageSection[]
  farm5xLink?: string
  dreamPhase?: 'D' | 'R' | 'E' | 'A' | 'M'
}

export const LIVECORE_STAGES: LiveStageDefinition[] = [
  // ─── 1. Farm & Animal Registration ───
  {
    stageNumber: 1,
    stageName: 'Farm & Animal Registration',
    eventType: 'FARM_REGISTRATION',
    description: 'Register the livestock farm with production type and location',
    dreamPhase: 'D',
    sections: [{
      name: 'Farm Registration',
      fields: [
        { name: 'farmId', label: 'Farm ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'farmerName', label: 'Farmer Name', type: 'text', mandatory: true },
        { name: 'location', label: 'Location', type: 'dropdown', mandatory: true, options: ['Province/District from Location Master'] },
        { name: 'farmAreaHa', label: 'Farm Area (Ha)', type: 'number', mandatory: false, unit: 'ha', defaultValue: 'Pasture/pen area' },
        { name: 'productionType', label: 'Production Type', type: 'multiselect', mandatory: true, options: ['Dairy', 'Beef', 'Poultry', 'Pig', 'Sheep', 'Goat'], defaultValue: 'Dairy' },
        { name: 'registrationDate', label: 'Registration Date', type: 'date', mandatory: true, defaultValue: 'Current Date' },
      ],
    }],
  },

  // ─── 2. Animal Inventory & Breeding Management ───
  {
    stageNumber: 2,
    stageName: 'Animal Inventory & Breeding Management',
    eventType: 'ANIMAL_INVENTORY',
    description: 'Track animal species, breed, count, and breeding events',
    dreamPhase: 'D',
    sections: [
      {
        name: 'Animal Inventory',
        fields: [
          { name: 'recordId', label: 'Record ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
          { name: 'animalSpecies', label: 'Animal Species', type: 'dropdown', mandatory: true, options: ['Cattle', 'Goat', 'Sheep', 'Chicken', 'Pig'], defaultValue: 'Cattle' },
          { name: 'breed', label: 'Breed', type: 'text', mandatory: false },
          { name: 'numberOfAnimals', label: 'Number of Animals', type: 'number', mandatory: true },
          { name: 'ageGroups', label: 'Age Groups', type: 'textarea', mandatory: false, defaultValue: 'e.g., Calves, Heifers, Cows' },
          { name: 'genderDistribution', label: 'Gender Distribution', type: 'text', mandatory: false, defaultValue: 'Males/Females counts' },
        ],
      },
      {
        name: 'Breeding Management',
        fields: [
          { name: 'breedingEventId', label: 'Breeding Event ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
          { name: 'dateOfBreeding', label: 'Date of Breeding', type: 'date', mandatory: true },
          { name: 'sireId', label: 'Sire ID/Flock', type: 'text', mandatory: false },
          { name: 'damId', label: 'Dam ID', type: 'text', mandatory: false },
          { name: 'expectedBirthDate', label: 'Expected Birth Date', type: 'date', mandatory: false },
          { name: 'actualBirthDate', label: 'Actual Birth Date', type: 'date', mandatory: false },
          { name: 'offspringCount', label: 'Offspring Count', type: 'number', mandatory: false },
        ],
      },
    ],
  },

  // ─── 3. Feed & Nutrition Management ───
  {
    stageNumber: 3,
    stageName: 'Feed & Nutrition Management',
    eventType: 'FEED_NUTRITION',
    description: 'Track feed type, quantity, cost, and conversion ratio',
    farm5xLink: '1M5D_MUST',
    dreamPhase: 'D',
    sections: [{
      name: 'Feed Management',
      fields: [
        { name: 'feedEventId', label: 'Feed Event ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'feedDate', label: 'Date', type: 'date', mandatory: true, defaultValue: 'Current Date' },
        { name: 'feedType', label: 'Feed Type', type: 'dropdown', mandatory: true, options: ['Forage', 'Concentrate', 'Mix', 'Formulated'], defaultValue: 'Forage' },
        { name: 'feedQuantityKg', label: 'Quantity (kg)', type: 'number', mandatory: true, unit: 'kg', costField: true },
        { name: 'costPerUnit', label: 'Cost per Unit', type: 'number', mandatory: false, unit: 'currency/kg', costField: true },
        { name: 'totalCost', label: 'Total Cost', type: 'autocalc', mandatory: false, autocalcFormula: 'feedQuantityKg × costPerUnit' },
        { name: 'feedConversionRatio', label: 'Feed Conversion Ratio', type: 'number', mandatory: false, unit: 'FCR' },
      ],
    }],
  },

  // ─── 4. Health & Veterinary Monitoring ───
  {
    stageNumber: 4,
    stageName: 'Health & Veterinary Monitoring',
    eventType: 'HEALTH_VET',
    description: 'Health checks, disease observation, and treatment administration',
    farm5xLink: '1M5D_R3',
    dreamPhase: 'M',
    sections: [{
      name: 'Health Check',
      fields: [
        { name: 'checkId', label: 'Check ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'checkDate', label: 'Date', type: 'date', mandatory: true, defaultValue: 'Current Date' },
        { name: 'species', label: 'Species', type: 'dropdown', mandatory: true, options: ['Cattle', 'Goat', 'Sheep', 'Chicken', 'Pig'], defaultValue: 'Cattle' },
        { name: 'animalIdGroup', label: 'Animal ID/Group', type: 'text', mandatory: false },
        { name: 'healthStatus', label: 'Health Status', type: 'dropdown', mandatory: true, options: ['Good', 'Fair', 'Poor'], defaultValue: 'Good' },
        { name: 'diseaseObserved', label: 'Disease Observed', type: 'multiselect', mandatory: false, options: ['Mastitis', 'Foot & Mouth', 'Brucellosis', 'Anthrax', 'Tick-borne', 'Newcastle', 'African Swine Fever'] },
        { name: 'treatmentAdministered', label: 'Treatment Administered', type: 'textarea', mandatory: false, defaultValue: 'Medication/vaccine details' },
        { name: 'nextCheckDate', label: 'Next Check Date', type: 'date', mandatory: false },
      ],
    }],
  },

  // ─── 5. Milk Production & Quality (Dairy) ───
  {
    stageNumber: 5,
    stageName: 'Milk Production & Quality (Dairy)',
    eventType: 'MILK_PRODUCTION',
    description: 'Daily milking records with yield, fat, protein, and quality grade',
    dreamPhase: 'M',
    sections: [{
      name: 'Milking',
      fields: [
        { name: 'milkingEventId', label: 'Milking Event ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'milkingDate', label: 'Date', type: 'date', mandatory: true },
        { name: 'animalId', label: 'Animal ID', type: 'text', mandatory: true, defaultValue: 'Cow/Goat ID' },
        { name: 'milkYieldL', label: 'Milk Yield (L)', type: 'number', mandatory: true, unit: 'L' },
        { name: 'fatContent', label: 'Fat Content (%)', type: 'number', mandatory: false, unit: '%' },
        { name: 'proteinContent', label: 'Protein Content (%)', type: 'number', mandatory: false, unit: '%' },
        { name: 'qualityGrade', label: 'Quality Grade', type: 'dropdown', mandatory: false, options: ['A', 'B', 'C'], defaultValue: 'A' },
        { name: 'storageTemp', label: 'Storage Temperature (°C)', type: 'number', mandatory: false, unit: '°C', defaultValue: 'Cold-chain compliance' },
        { name: 'bulkTankId', label: 'Bulk Tank ID', type: 'text', mandatory: false },
      ],
    }],
  },

  // ─── 6. Meat Production & Processing ───
  {
    stageNumber: 6,
    stageName: 'Meat Production & Processing',
    eventType: 'MEAT_PROCESSING',
    description: 'Slaughter, carcass weight, yield, and product categorization',
    sections: [{
      name: 'Slaughter & Processing',
      fields: [
        { name: 'processingEventId', label: 'Processing Event ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'processingDate', label: 'Date', type: 'date', mandatory: true },
        { name: 'species', label: 'Species', type: 'dropdown', mandatory: true, options: ['Cattle', 'Pig', 'Chicken', 'Sheep', 'Goat'], defaultValue: 'Cattle' },
        { name: 'numberProcessed', label: 'Number Processed', type: 'number', mandatory: true },
        { name: 'carcassWeightKg', label: 'Carcass Weight (kg)', type: 'number', mandatory: true, unit: 'kg' },
        { name: 'yieldPct', label: 'Yield (%)', type: 'number', mandatory: false, unit: '%', defaultValue: 'Edible portion' },
        { name: 'processingPlantId', label: 'Processing Plant ID', type: 'text', mandatory: false },
        { name: 'productCategories', label: 'Product Categories', type: 'multiselect', mandatory: true, options: ['Meat', 'Sausage', 'Offal', 'Bones', 'Leather'] },
        { name: 'coldStorageId', label: 'Cold Storage ID', type: 'text', mandatory: false },
      ],
    }],
  },

  // ─── 7. Waste & Manure Management ───
  {
    stageNumber: 7,
    stageName: 'Waste & Manure Management',
    eventType: 'WASTE_MANAGEMENT',
    description: 'Waste type, handling method, and treatment tracking',
    farm5xLink: '1M5D_R5',
    dreamPhase: 'A',
    sections: [{
      name: 'Waste Management',
      fields: [
        { name: 'wasteEventId', label: 'Waste Event ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'wasteDate', label: 'Date', type: 'date', mandatory: true },
        { name: 'wasteType', label: 'Waste Type', type: 'dropdown', mandatory: true, options: ['Manure', 'Slaughter Waste', 'Bedding'], defaultValue: 'Manure' },
        { name: 'wasteQuantityKg', label: 'Quantity (kg)', type: 'number', mandatory: false, unit: 'kg', carbonField: true },
        { name: 'handlingMethod', label: 'Handling Method', type: 'dropdown', mandatory: true, options: ['Composting', 'Biogas', 'Direct Field Application'], defaultValue: 'Composting' },
        { name: 'treatmentDurationDays', label: 'Treatment Duration (days)', type: 'number', mandatory: false, unit: 'days', defaultValue: 'If composting' },
      ],
    }],
  },

  // ─── 8. Carbon & Emissions Tracking ───
  {
    stageNumber: 8,
    stageName: 'Carbon & Emissions Tracking',
    eventType: 'CARBON_EMISSIONS',
    description: 'Enteric methane, manure emissions, and total CO2e per animal',
    farm5xLink: '1M5D_MUST',
    dreamPhase: 'A',
    sections: [{
      name: 'Emissions Monitoring',
      fields: [
        { name: 'monitoringId', label: 'Monitoring ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'monitoringDate', label: 'Date', type: 'date', mandatory: true },
        { name: 'emissionsSpecies', label: 'Species', type: 'dropdown', mandatory: true, options: ['Cattle', 'Goat', 'Sheep', 'Chicken', 'Pig'], defaultValue: 'Cattle' },
        { name: 'animalCount', label: 'Animal Count', type: 'number', mandatory: true },
        { name: 'entericMethaneKgDay', label: 'Enteric Methane (kg/day)', type: 'number', mandatory: false, unit: 'kg/day', carbonField: true },
        { name: 'manureEmissionsKgDay', label: 'Manure Emissions (kg/day)', type: 'number', mandatory: false, unit: 'kg/day', carbonField: true },
        { name: 'totalEmissionsKgCO2e', label: 'Total Emissions (kg CO2e)', type: 'autocalc', mandatory: false, autocalcFormula: '(enteric + manure) × 28 × animalCount' },
      ],
    }],
  },

  // ─── 9. Certification & Inspection ───
  {
    stageNumber: 9,
    stageName: 'Certification & Inspection',
    eventType: 'CERT_INSPECTION',
    description: 'Animal welfare, biosecurity, waste compliance, and climate-smart certification',
    dreamPhase: 'M',
    sections: [
      {
        name: 'Certification',
        fields: [
          { name: 'certAssessmentId', label: 'Cert Assessment ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
          { name: 'standard', label: 'Standard', type: 'dropdown', mandatory: true, options: ['G.R.S.', 'Global Animal Partnership', 'Organic', 'BAP'], defaultValue: 'G.R.S.' },
          { name: 'assessmentDate', label: 'Assessment Date', type: 'date', mandatory: true },
          { name: 'assessorName', label: 'Assessor Name', type: 'text', mandatory: true },
          { name: 'animalWelfare', label: 'Animal Welfare Practices', type: 'dropdown', mandatory: true, options: ['Compliant', 'Non-compliant'], defaultValue: 'Compliant' },
          { name: 'biosecurity', label: 'Biosecurity Measures', type: 'dropdown', mandatory: true, options: ['Compliant', 'Non-compliant'], defaultValue: 'Compliant' },
          { name: 'wasteCompliance', label: 'Waste Management Compliance', type: 'dropdown', mandatory: true, options: ['Compliant', 'Non-compliant'], defaultValue: 'Compliant' },
          { name: 'climateSmartPractices', label: 'Climate-Smart Practices', type: 'dropdown', mandatory: true, options: ['Methane reduction', 'Silvopasture', 'Both', 'None'], defaultValue: 'Methane reduction' },
          { name: 'outcome', label: 'Outcome', type: 'dropdown', mandatory: true, options: ['Passed', 'Failed'], defaultValue: 'Passed' },
          { name: 'totalScorePct', label: 'Total Score (%)', type: 'autocalc', mandatory: true, autocalcFormula: 'Average of 4 compliance fields' },
        ],
      },
      {
        name: 'Inspection',
        fields: [
          { name: 'inspectionId', label: 'Inspection ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
          { name: 'batchFarmId', label: 'Batch/Farm ID', type: 'text', mandatory: true },
          { name: 'inspectionDate', label: 'Inspection Date', type: 'date', mandatory: true },
          { name: 'inspector', label: 'Inspector', type: 'text', mandatory: true },
          { name: 'scope', label: 'Scope', type: 'dropdown', mandatory: true, options: ['Farm', 'Facility'], defaultValue: 'Farm' },
          { name: 'observations', label: 'Observations', type: 'textarea', mandatory: false },
          { name: 'nonConformance', label: 'Non-Conformance', type: 'radio', mandatory: true, options: ['Yes', 'No'], defaultValue: 'No' },
          { name: 'correctiveActions', label: 'Corrective Actions', type: 'textarea', mandatory: false, conditionalShow: 'nonConformance' },
          { name: 'followUpDate', label: 'Follow-Up Date', type: 'date', mandatory: false },
          { name: 'inspectionStatus', label: 'Status', type: 'dropdown', mandatory: true, options: ['Open', 'Closed', 'Pending'], defaultValue: 'Open' },
          { name: 'reportUpload', label: 'Report Upload', type: 'file', mandatory: false },
        ],
      },
    ],
  },

  // ─── 10. Staff Management ───
  {
    stageNumber: 10,
    stageName: 'Staff Management',
    eventType: 'STAFF_MANAGEMENT',
    description: 'Farm staff registration, roles, schedules, and employment dates',
    sections: [{
      name: 'Staff Management',
      fields: [
        { name: 'staffId', label: 'Staff ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'staffName', label: 'Name', type: 'text', mandatory: true },
        { name: 'role', label: 'Role', type: 'dropdown', mandatory: true, options: ['Milker', 'Feeder', 'Veterinarian', 'Manager', 'Cleaner'], defaultValue: 'Milker' },
        { name: 'contactNumber', label: 'Contact Number', type: 'text', mandatory: false },
        { name: 'schedule', label: 'Schedule', type: 'textarea', mandatory: false, defaultValue: 'Weekly rota' },
        { name: 'employmentDate', label: 'Employment Date', type: 'date', mandatory: false },
      ],
    }],
  },

  // ─── 11. Cow Master & Classification ───
  {
    stageNumber: 11,
    stageName: 'Cow Master & Classification',
    eventType: 'COW_MASTER',
    description: 'Individual cow registration with breed, type, and identification',
    sections: [{
      name: 'Cow Master',
      fields: [
        { name: 'cowId', label: 'Cow ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'tagNumber', label: 'Tag Number', type: 'text', mandatory: true, defaultValue: 'Unique ear tag' },
        { name: 'cowBreed', label: 'Breed', type: 'dropdown', mandatory: true, options: ['Holstein', 'Jersey', 'Friesian', 'Ankole', 'Local Crossbreed', 'Boran'], defaultValue: 'Holstein' },
        { name: 'coatColor', label: 'Coat Color', type: 'text', mandatory: false },
        { name: 'cowType', label: 'Type', type: 'dropdown', mandatory: true, options: ['Cow', 'Bull', 'Calf', 'Heifer'], defaultValue: 'Cow' },
        { name: 'cowDob', label: 'Date of Birth', type: 'date', mandatory: false },
        { name: 'cowGender', label: 'Gender', type: 'dropdown', mandatory: true, options: ['Female', 'Male'], defaultValue: 'Female' },
        { name: 'purchaseDate', label: 'Purchase Date', type: 'date', mandatory: false },
      ],
    }],
  },

  // ─── 12. Cow Shade & Housing ───
  {
    stageNumber: 12,
    stageName: 'Cow Shade & Housing',
    eventType: 'HOUSING',
    description: 'Shade/pen registration with dimensions, ventilation, and bedding',
    sections: [{
      name: 'Shade Management',
      fields: [
        { name: 'shadeId', label: 'Shade ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'shadeNumber', label: 'Shade Number', type: 'text', mandatory: true },
        { name: 'dimensionsSqm', label: 'Dimensions (m²)', type: 'number', mandatory: true, unit: 'm²' },
        { name: 'ventilationType', label: 'Ventilation Type', type: 'text', mandatory: false, defaultValue: 'Natural/Mechanical' },
        { name: 'beddingType', label: 'Bedding Type', type: 'dropdown', mandatory: false, options: ['Straw', 'Sand', 'Rubber Mat', 'None'], defaultValue: 'Straw' },
      ],
    }],
  },

  // ─── 13. Supplier Management ───
  {
    stageNumber: 13,
    stageName: 'Supplier Management',
    eventType: 'SUPPLIER_MGMT',
    description: 'Feed, chemical, and equipment supplier registry with ratings',
    sections: [{
      name: 'Supplier Management',
      fields: [
        { name: 'supplierId', label: 'Supplier ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'supplierName', label: 'Name', type: 'text', mandatory: true },
        { name: 'supplierPhone', label: 'Contact Number', type: 'text', mandatory: false },
        { name: 'productsSupplied', label: 'Products Supplied', type: 'multiselect', mandatory: false, options: ['Feed', 'Chemical', 'Equipment', 'Veterinary', 'Bedding'] },
        { name: 'rating', label: 'Rating', type: 'dropdown', mandatory: false, options: ['Good', 'Average', 'Poor'], defaultValue: 'Good' },
      ],
    }],
  },

  // ─── 14. Feed Item Management ───
  {
    stageNumber: 14,
    stageName: 'Feed Item Management',
    eventType: 'FEED_ITEM',
    description: 'Feed inventory with stock levels, unit price, and nutritional value',
    sections: [{
      name: 'Feed Items',
      fields: [
        { name: 'feedItemId', label: 'Feed Item ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'feedItemName', label: 'Name', type: 'text', mandatory: true },
        { name: 'quantityInStock', label: 'Quantity in Stock', type: 'number', mandatory: true, unit: 'kg', costField: true },
        { name: 'unitPrice', label: 'Unit Price', type: 'number', mandatory: true, unit: 'currency/kg', costField: true },
        { name: 'nutritionalValue', label: 'Nutritional Value', type: 'textarea', mandatory: false, defaultValue: 'Protein/Fat/Carb content' },
      ],
    }],
  },

  // ─── 15. Feed Schedule ───
  {
    stageNumber: 15,
    stageName: 'Feed Schedule',
    eventType: 'FEED_SCHEDULE',
    description: 'Daily feed schedule per cow with feed item, time, and amount',
    sections: [{
      name: 'Feed Schedule',
      fields: [
        { name: 'scheduleId', label: 'Schedule ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'scheduleCowId', label: 'Cow ID', type: 'text', mandatory: true },
        { name: 'scheduleFeedItemId', label: 'Feed Item ID', type: 'text', mandatory: true },
        { name: 'feedTime', label: 'Feed Time', type: 'time', mandatory: true },
        { name: 'feedDurationMin', label: 'Duration (minutes)', type: 'number', mandatory: false, unit: 'min' },
        { name: 'feedAmountKg', label: 'Feed Amount (kg)', type: 'number', mandatory: true, unit: 'kg', costField: true },
      ],
    }],
  },

  // ─── 16. Task Assignment ───
  {
    stageNumber: 16,
    stageName: 'Task Assignment',
    eventType: 'TASK_ASSIGNMENT',
    description: 'Assign tasks (milking, feeding, cleaning, veterinary) to staff',
    sections: [{
      name: 'Task Assignment',
      fields: [
        { name: 'assignmentId', label: 'Assignment ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'assignmentStaffId', label: 'Staff ID', type: 'text', mandatory: true },
        { name: 'assignmentCowId', label: 'Cow ID', type: 'text', mandatory: false },
        { name: 'taskType', label: 'Task Type', type: 'dropdown', mandatory: true, options: ['Milking', 'Feeding', 'Cleaning', 'Veterinary', 'Breeding'], defaultValue: 'Milking' },
        { name: 'taskDate', label: 'Task Date', type: 'date', mandatory: true },
        { name: 'taskStatus', label: 'Task Status', type: 'dropdown', mandatory: false, options: ['Pending', 'Completed', 'In Progress'], defaultValue: 'Pending' },
      ],
    }],
  },

  // ─── 17. Vaccination Management ───
  {
    stageNumber: 17,
    stageName: 'Vaccination Management',
    eventType: 'VACCINATION',
    description: 'Vaccination records per animal with dose, next due date, and effects',
    farm5xLink: '1M5D_R3',
    dreamPhase: 'M',
    sections: [{
      name: 'Vaccination',
      fields: [
        { name: 'vaccinationId', label: 'Vaccination ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'vaccCowId', label: 'Cow ID', type: 'text', mandatory: true },
        { name: 'vaccineName', label: 'Vaccine Name', type: 'text', mandatory: true },
        { name: 'vaccinationDate', label: 'Vaccination Date', type: 'date', mandatory: true },
        { name: 'dose', label: 'Dose', type: 'text', mandatory: true, unit: 'mg or ml' },
        { name: 'nextDueDate', label: 'Next Due Date', type: 'date', mandatory: false },
        { name: 'effectObserved', label: 'Effect Observed', type: 'textarea', mandatory: false },
      ],
    }],
  },

  // ─── 18. Milking & Production ───
  {
    stageNumber: 18,
    stageName: 'Milking & Production',
    eventType: 'MILKING_PRODUCTION',
    description: 'Daily milking records with yield, fat, protein, and bulk tank tracking',
    dreamPhase: 'M',
    sections: [{
      name: 'Milking & Production',
      fields: [
        { name: 'milkingProdEventId', label: 'Milking Event ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'milkingProdDate', label: 'Date', type: 'date', mandatory: true },
        { name: 'milkingCowId', label: 'Cow ID', type: 'text', mandatory: true },
        { name: 'milkingYieldL', label: 'Milk Yield (L)', type: 'number', mandatory: true, unit: 'L' },
        { name: 'milkingFatContent', label: 'Fat Content (%)', type: 'number', mandatory: false, unit: '%' },
        { name: 'milkingProteinContent', label: 'Protein Content (%)', type: 'number', mandatory: false, unit: '%' },
        { name: 'milkingBulkTankId', label: 'Bulk Tank ID', type: 'text', mandatory: false },
      ],
    }],
  },

  // ─── 19. Milk Quality Traceability ───
  {
    stageNumber: 19,
    stageName: 'Milk Quality Traceability',
    eventType: 'MILK_QUALITY_TRACE',
    description: 'Batch-level quality testing with lab results and report uploads',
    dreamPhase: 'M',
    sections: [{
      name: 'Quality Traceability',
      fields: [
        { name: 'milkBatchId', label: 'Batch ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'tankId', label: 'Tank ID', type: 'text', mandatory: true },
        { name: 'collectionDate', label: 'Collection Date', type: 'date', mandatory: true },
        { name: 'samplingTime', label: 'Sampling Time', type: 'time', mandatory: true },
        { name: 'qualityTestId', label: 'Quality Test ID', type: 'text', mandatory: true, defaultValue: 'Auto Gen' },
        { name: 'testParameter', label: 'Test Parameter', type: 'dropdown', mandatory: true, options: ['Fat Content', 'Protein', 'Antibiotics', 'Somatic Cell Count', 'Bacterial Count'], defaultValue: 'Fat Content' },
        { name: 'testResult', label: 'Test Result', type: 'text', mandatory: true },
        { name: 'labName', label: 'Lab Name', type: 'text', mandatory: false },
        { name: 'reportUpload', label: 'Report Upload', type: 'file', mandatory: false },
      ],
    }],
  },

  // ─── 20. Cost & Economics + DREAM Summary ───
  {
    stageNumber: 20,
    stageName: 'Cost, Economics & DREAM Summary',
    eventType: 'COST_DREAM_SUMMARY',
    description: 'Aggregated costs, revenue, ROI, DREAM pipeline status, and Farm5x carbon credits',
    dreamPhase: 'M',
    sections: [
      {
        name: 'Cost Summary (auto-aggregated)',
        fields: [
          { name: 'totalFeedCost', label: 'Total Feed Cost', type: 'number', mandatory: false, unit: 'currency', costField: true },
          { name: 'totalVetCost', label: 'Total Veterinary Cost', type: 'number', mandatory: false, unit: 'currency', costField: true },
          { name: 'totalLaborCost', label: 'Total Labor Cost', type: 'number', mandatory: false, unit: 'currency', costField: true },
          { name: 'totalInputCost', label: 'Total Input Cost', type: 'autocalc', mandatory: true, autocalcFormula: 'feed + vet + labor' },
        ],
      },
      {
        name: 'Revenue & Profitability',
        fields: [
          { name: 'milkRevenue', label: 'Milk Revenue', type: 'number', mandatory: false, unit: 'currency' },
          { name: 'meatRevenue', label: 'Meat Revenue', type: 'number', mandatory: false, unit: 'currency' },
          { name: 'totalRevenue', label: 'Total Revenue', type: 'autocalc', mandatory: true, autocalcFormula: 'milk + meat revenue' },
          { name: 'profitLoss', label: 'Profit/Loss', type: 'autocalc', mandatory: true, autocalcFormula: 'totalRevenue - totalInputCost' },
          { name: 'roi', label: 'ROI (%)', type: 'autocalc', mandatory: true, autocalcFormula: '(profitLoss / totalInputCost) × 100' },
        ],
      },
      {
        name: 'DREAM & Farm5x (1M5D)',
        fields: [
          { name: 'dreamData', label: 'D — Data Collected', type: 'radio', mandatory: false, options: ['Verified', 'Pending'], defaultValue: 'Pending' },
          { name: 'dreamRemote', label: 'R — Pasture NDVI (Sentinel-2)', type: 'radio', mandatory: false, options: ['Verified', 'Pending'], defaultValue: 'Pending' },
          { name: 'dreamEvent', label: 'E — Forage/Grazing Detected', type: 'radio', mandatory: false, options: ['Verified', 'Pending'], defaultValue: 'Pending' },
          { name: 'dreamAnalytics', label: 'A — IPCC Tier 2 (enteric + manure)', type: 'radio', mandatory: false, options: ['Verified', 'Pending'], defaultValue: 'Pending' },
          { name: 'dreamMonitor', label: 'M — Methane Intensity Tracked', type: 'radio', mandatory: false, options: ['Verified', 'Pending'], defaultValue: 'Pending' },
          { name: 'farm5xMandatory', label: 'Must: Improved Forage Adopted', type: 'radio', mandatory: false, options: ['Yes', 'No'], defaultValue: 'No' },
          { name: 'farm5xReduces', label: 'Reduces Adopted (count)', type: 'number', mandatory: false, defaultValue: '0' },
          { name: 'emissionsAvoided', label: 'Emissions Avoided (tCO2e)', type: 'autocalc', mandatory: false, autocalcFormula: '(baseline - actual) / 1000' },
          { name: 'verraEligible', label: 'Verra Credit Eligible', type: 'autocalc', mandatory: false, autocalcFormula: 'mandatory + ≥3 reduces' },
        ],
      },
    ],
  },
]

// ─── Helpers ───
export function getLiveStageByNumber(stageNumber: number): LiveStageDefinition | undefined {
  return LIVECORE_STAGES.find(s => s.stageNumber === stageNumber)
}

export function getLiveStageCount(): number {
  return LIVECORE_STAGES.length
}

export function getLiveTotalFieldCount(): number {
  return LIVECORE_STAGES.reduce((sum, stage) =>
    sum + stage.sections.reduce((s, sec) => s + sec.fields.length, 0), 0
  )
}
