import type {
  CostOfCultivationInput,
  CostOfCultivationResult,
  CostBreakdownCategory,
  CropCostProfile,
  OptimizationConstraint,
  OptimizationResult,
  ProfitabilityAnalysis,
} from './types'

// ─── Currency Map ─────────────────────────────────────────────────────

const COUNTRY_CURRENCY: Record<string, string> = {
  UG: 'UGX',
  GH: 'GHS',
  KE: 'KES',
  TZ: 'TZS',
  NG: 'NGN',
  ET: 'ETB',
  RW: 'RWF',
  BI: 'BIF',
}

// ─── Crop Cost Profiles (10+ profiles) ────────────────────────────────
// All costs are per hectare in local currency.
// Prices and yields reflect realistic smallholder data.

const CROP_PROFILES: CropCostProfile[] = [
  // ── Coffee Uganda ──
  {
    crop: 'Coffee',
    country: 'UG',
    currency: 'UGX',
    defaultYieldKgPerHa: 1200,
    defaultMarketPricePerKg: 8500,
    costBreakdown: [
      {
        category: 'Land Preparation',
        items: [
          { name: 'Clearing and lining', costPerHectare: 180000 },
          { name: 'Pitting (holes for planting)', costPerHectare: 250000 },
        ],
      },
      {
        category: 'Seed/Seedling',
        items: [
          { name: 'Coffee seedlings (1300/ha)', costPerHectare: 390000 },
        ],
      },
      {
        category: 'Fertilizer',
        items: [
          { name: 'NPK 17-17-17 (150kg)', costPerHectare: 375000 },
          { name: 'Urea (100kg top-dress)', costPerHectare: 200000 },
          { name: 'Organic manure (5 tonnes)', costPerHectare: 150000 },
        ],
      },
      {
        category: 'Pesticides/Herbicides/Fungicides',
        items: [
          { name: 'Herbicide (Glyphosate)', costPerHectare: 80000 },
          { name: 'Copper fungicide (CBD)', costPerHectare: 120000 },
          { name: 'Insecticide (Antestia)', costPerHectare: 60000 },
        ],
      },
      {
        category: 'Labor',
        items: [
          { name: 'Planting', costPerHectare: 150000 },
          { name: 'Weeding (4 rounds)', costPerHectare: 400000 },
          { name: 'Pruning (annual)', costPerHectare: 100000 },
          { name: 'Harvesting & picking', costPerHectare: 600000 },
          { name: 'Post-harvest processing', costPerHectare: 200000 },
        ],
      },
      {
        category: 'Transport',
        items: [
          { name: 'To processing center', costPerHectare: 100000 },
        ],
      },
      {
        category: 'Processing',
        items: [
          { name: 'Drying & sorting', costPerHectare: 150000 },
          { name: 'Milling/hulling', costPerHectare: 100000 },
        ],
      },
      {
        category: 'Certification',
        items: [
          { name: 'UCDA/RA/GGAP audit fee', costPerHectare: 75000 },
        ],
      },
      {
        category: 'Interest on Working Capital',
        items: [
          { name: 'Seasonal credit (20% p.a., 6 months)', costPerHectare: 200000 },
        ],
      },
    ],
  },

  // ── Coffee Ghana ──
  {
    crop: 'Coffee',
    country: 'GH',
    currency: 'GHS',
    defaultYieldKgPerHa: 1000,
    defaultMarketPricePerKg: 45,
    costBreakdown: [
      {
        category: 'Land Preparation',
        items: [
          { name: 'Land clearing', costPerHectare: 400 },
          { name: 'Shade tree establishment', costPerHectare: 200 },
        ],
      },
      {
        category: 'Seed/Seedling',
        items: [
          { name: 'Robusta seedlings', costPerHectare: 500 },
        ],
      },
      {
        category: 'Fertilizer',
        items: [
          { name: 'Compound fertilizer (NPK)', costPerHectare: 600 },
          { name: 'Organic manure', costPerHectare: 200 },
        ],
      },
      {
        category: 'Pesticides/Herbicides/Fungicides',
        items: [
          { name: 'Herbicide', costPerHectare: 150 },
          { name: 'Fungicide (berry disease)', costPerHectare: 200 },
        ],
      },
      {
        category: 'Labor',
        items: [
          { name: 'Planting & weeding', costPerHectare: 800 },
          { name: 'Harvesting', costPerHectare: 600 },
          { name: 'Post-harvest', costPerHectare: 300 },
        ],
      },
      {
        category: 'Transport',
        items: [
          { name: 'To buying center', costPerHectare: 250 },
        ],
      },
      {
        category: 'Processing',
        items: [
          { name: 'Drying', costPerHectare: 200 },
        ],
      },
      {
        category: 'Certification',
        items: [
          { name: 'Certification fee', costPerHectare: 150 },
        ],
      },
      {
        category: 'Interest on Working Capital',
        items: [
          { name: 'Credit cost', costPerHectare: 350 },
        ],
      },
    ],
  },

  // ── Coffee Kenya ──
  {
    crop: 'Coffee',
    country: 'KE',
    currency: 'KES',
    defaultYieldKgPerHa: 1500,
    defaultMarketPricePerKg: 600,
    costBreakdown: [
      {
        category: 'Land Preparation',
        items: [
          { name: 'Trenching and planting holes', costPerHectare: 15000 },
        ],
      },
      {
        category: 'Seed/Seedling',
        items: [
          { name: 'SL28/SL34/Ruiru 11 seedlings', costPerHectare: 20000 },
        ],
      },
      {
        category: 'Fertilizer',
        items: [
          { name: 'CAN (250kg)', costPerHectare: 12000 },
          { name: 'DAP (150kg)', costPerHectare: 10000 },
          { name: 'Organic manure', costPerHectare: 5000 },
        ],
      },
      {
        category: 'Pesticides/Herbicides/Fungicides',
        items: [
          { name: 'Copper oxychloride', costPerHectare: 4000 },
          { name: 'Insecticide', costPerHectare: 3000 },
          { name: 'Herbicide', costPerHectare: 2000 },
        ],
      },
      {
        category: 'Labor',
        items: [
          { name: 'Planting', costPerHectare: 10000 },
          { name: 'Weeding & mulching (4 rounds)', costPerHectare: 20000 },
          { name: 'Pruning', costPerHectare: 8000 },
          { name: 'Harvesting (selective picking)', costPerHectare: 40000 },
          { name: 'Post-harvest handling', costPerHectare: 10000 },
        ],
      },
      {
        category: 'Transport',
        items: [
          { name: 'To factory', costPerHectare: 5000 },
        ],
      },
      {
        category: 'Processing',
        items: [
          { name: 'Wet milling (factory charge)', costPerHectare: 15000 },
          { name: 'Drying & sorting', costPerHectare: 8000 },
        ],
      },
      {
        category: 'Certification',
        items: [
          { name: 'KTDA/RA/GGAP fees', costPerHectare: 5000 },
        ],
      },
      {
        category: 'Interest on Working Capital',
        items: [
          { name: 'SACCO/Coop loan interest', costPerHectare: 10000 },
        ],
      },
    ],
  },

  // ── Cocoa Ghana ──
  {
    crop: 'Cocoa',
    country: 'GH',
    currency: 'GHS',
    defaultYieldKgPerHa: 450,
    defaultMarketPricePerKg: 120,
    costBreakdown: [
      {
        category: 'Land Preparation',
        items: [
          { name: 'Clearing and shade management', costPerHectare: 600 },
        ],
      },
      {
        category: 'Seed/Seedling',
        items: [
          { name: 'Hybrid cocoa seedlings (1100/ha)', costPerHectare: 1100 },
        ],
      },
      {
        category: 'Fertilizer',
        items: [
          { name: 'Ammonium Sulphate (250kg)', costPerHectare: 700 },
          { name: 'NPK 15-15-15 (200kg)', costPerHectare: 500 },
          { name: 'Organic (cocoa pod husk compost)', costPerHectare: 100 },
        ],
      },
      {
        category: 'Pesticides/Herbicides/Fungicides',
        items: [
          { name: 'Fungicide (Black Pod — 6 sprays)', costPerHectare: 900 },
          { name: 'Insecticide (Mirids/CSSVD)', costPerHectare: 400 },
          { name: 'Weedicide (Glyphosate)', costPerHectare: 200 },
        ],
      },
      {
        category: 'Labor',
        items: [
          { name: 'Planting', costPerHectare: 500 },
          { name: 'Weeding (6 rounds)', costPerHectare: 900 },
          { name: 'Harvesting & pod breaking', costPerHectare: 1200 },
          { name: 'Fermentation & drying', costPerHectare: 400 },
        ],
      },
      {
        category: 'Transport',
        items: [
          { name: 'To buying center', costPerHectare: 300 },
        ],
      },
      {
        category: 'Processing',
        items: [
          { name: 'Fermentation sacks', costPerHectare: 100 },
          { name: 'Drying platform construction', costPerHectare: 200 },
        ],
      },
      {
        category: 'Certification',
        items: [
          { name: 'COCOBOD/LBC license', costPerHectare: 50 },
          { name: 'RA/UTZ certification', costPerHectare: 200 },
        ],
      },
      {
        category: 'Interest on Working Capital',
        items: [
          { name: 'MASLOC/COCOBOD loan interest', costPerHectare: 350 },
        ],
      },
    ],
  },

  // ── Maize Uganda ──
  {
    crop: 'Maize',
    country: 'UG',
    currency: 'UGX',
    defaultYieldKgPerHa: 2500,
    defaultMarketPricePerKg: 1200,
    costBreakdown: [
      {
        category: 'Land Preparation',
        items: [
          { name: 'Ploughing (oxen)', costPerHectare: 150000 },
          { name: 'Harrowing', costPerHectare: 80000 },
          { name: 'Ridging', costPerHectare: 100000 },
        ],
      },
      {
        category: 'Seed/Seedling',
        items: [
          { name: 'Hybrid maize seed (25kg)', costPerHectare: 150000 },
        ],
      },
      {
        category: 'Fertilizer',
        items: [
          { name: 'DAP (100kg)', costPerHectare: 250000 },
          { name: 'Urea (100kg top-dress)', costPerHectare: 200000 },
        ],
      },
      {
        category: 'Pesticides/Herbicides/Fungicides',
        items: [
          { name: 'Herbicide (pre-emergence)', costPerHectare: 60000 },
          { name: 'Pesticide (fall armyworm)', costPerHectare: 50000 },
        ],
      },
      {
        category: 'Labor',
        items: [
          { name: 'Planting', costPerHectare: 80000 },
          { name: 'Weeding (2 rounds)', costPerHectare: 200000 },
          { name: 'Harvesting', costPerHectare: 150000 },
          { name: 'Shelling & bagging', costPerHectare: 80000 },
        ],
      },
      {
        category: 'Transport',
        items: [
          { name: 'To market', costPerHectare: 100000 },
        ],
      },
      {
        category: 'Processing',
        items: [
          { name: 'Drying (tarpaulin)', costPerHectare: 30000 },
          { name: 'Milling (optional)', costPerHectare: 40000 },
        ],
      },
      {
        category: 'Certification',
        items: [
          { name: 'Organic certification (if applicable)', costPerHectare: 50000 },
        ],
      },
      {
        category: 'Interest on Working Capital',
        items: [
          { name: 'SACCO loan interest', costPerHectare: 120000 },
        ],
      },
    ],
  },

  // ── Maize Ghana ──
  {
    crop: 'Maize',
    country: 'GH',
    currency: 'GHS',
    defaultYieldKgPerHa: 2000,
    defaultMarketPricePerKg: 3.5,
    costBreakdown: [
      {
        category: 'Land Preparation',
        items: [
          { name: 'Ploughing', costPerHectare: 200 },
          { name: 'Ridging', costPerHectare: 100 },
        ],
      },
      {
        category: 'Seed/Seedling',
        items: [
          { name: 'Improved seed (Obatanpa)', costPerHectare: 300 },
        ],
      },
      {
        category: 'Fertilizer',
        items: [
          { name: 'NPK (100kg)', costPerHectare: 400 },
          { name: 'Sulphate of Ammonia (50kg)', costPerHectare: 150 },
        ],
      },
      {
        category: 'Pesticides/Herbicides/Fungicides',
        items: [
          { name: 'Herbicide', costPerHectare: 80 },
          { name: 'Insecticide (Stem borer)', costPerHectare: 60 },
        ],
      },
      {
        category: 'Labor',
        items: [
          { name: 'Planting & weeding', costPerHectare: 400 },
          { name: 'Harvesting', costPerHectare: 200 },
          { name: 'Shelling', costPerHectare: 100 },
        ],
      },
      {
        category: 'Transport',
        items: [
          { name: 'To market', costPerHectare: 120 },
        ],
      },
      {
        category: 'Processing',
        items: [
          { name: 'Drying', costPerHectare: 50 },
        ],
      },
      {
        category: 'Certification',
        items: [
          { name: 'Certification (optional)', costPerHectare: 100 },
        ],
      },
      {
        category: 'Interest on Working Capital',
        items: [
          { name: 'Credit cost', costPerHectare: 150 },
        ],
      },
    ],
  },

  // ── Maize Kenya ──
  {
    crop: 'Maize',
    country: 'KE',
    currency: 'KES',
    defaultYieldKgPerHa: 2200,
    defaultMarketPricePerKg: 40,
    costBreakdown: [
      {
        category: 'Land Preparation',
        items: [
          { name: 'Ploughing (tractor)', costPerHectare: 5000 },
          { name: 'Harrowing', costPerHectare: 3000 },
        ],
      },
      {
        category: 'Seed/Seedling',
        items: [
          { name: 'Hybrid seed (DK8033/Pan691 — 25kg)', costPerHectare: 6000 },
        ],
      },
      {
        category: 'Fertilizer',
        items: [
          { name: 'DAP (50kg)', costPerHectare: 5500 },
          { name: 'CAN (50kg top-dress)', costPerHectare: 3500 },
        ],
      },
      {
        category: 'Pesticides/Herbicides/Fungicides',
        items: [
          { name: 'Herbicide (Buctril/2,4-D)', costPerHectare: 1500 },
          { name: 'Insecticide (Armyworm)', costPerHectare: 1000 },
        ],
      },
      {
        category: 'Labor',
        items: [
          { name: 'Planting', costPerHectare: 4000 },
          { name: 'Weeding (2 rounds)', costPerHectare: 6000 },
          { name: 'Harvesting', costPerHectare: 3000 },
          { name: 'Shelling', costPerHectare: 2000 },
        ],
      },
      {
        category: 'Transport',
        items: [
          { name: 'To market/depot', costPerHectare: 2000 },
        ],
      },
      {
        category: 'Processing',
        items: [
          { name: 'Drying', costPerHectare: 1000 },
          { name: 'Milling', costPerHectare: 1500 },
        ],
      },
      {
        category: 'Certification',
        items: [
          { name: 'Organic/GGAP (optional)', costPerHectare: 2000 },
        ],
      },
      {
        category: 'Interest on Working Capital',
        items: [
          { name: 'MFI/SACCO loan', costPerHectare: 3000 },
        ],
      },
    ],
  },

  // ── Rice Uganda ──
  {
    crop: 'Rice',
    country: 'UG',
    currency: 'UGX',
    defaultYieldKgPerHa: 3000,
    defaultMarketPricePerKg: 2000,
    costBreakdown: [
      {
        category: 'Land Preparation',
        items: [
          { name: 'Ploughing (2 rounds)', costPerHectare: 300000 },
          { name: 'Puddling', costPerHectare: 150000 },
          { name: 'Bund construction', costPerHectare: 100000 },
        ],
      },
      {
        category: 'Seed/Seedling',
        items: [
          { name: 'NARO/NERICA rice seed (60kg)', costPerHectare: 240000 },
        ],
      },
      {
        category: 'Fertilizer',
        items: [
          { name: 'NPK (200kg)', costPerHectare: 500000 },
          { name: 'Urea (100kg top-dress)', costPerHectare: 200000 },
        ],
      },
      {
        category: 'Pesticides/Herbicides/Fungicides',
        items: [
          { name: 'Herbicide (pre-emergence)', costPerHectare: 80000 },
          { name: 'Insecticide (rice stem borer)', costPerHectare: 60000 },
          { name: 'Fungicide (blast)', costPerHectare: 50000 },
        ],
      },
      {
        category: 'Labor',
        items: [
          { name: 'Nursery & transplanting', costPerHectare: 200000 },
          { name: 'Weeding (2 rounds)', costPerHectare: 200000 },
          { name: 'Bird scaring (season)', costPerHectare: 150000 },
          { name: 'Harvesting', costPerHectare: 200000 },
          { name: 'Threshing', costPerHectare: 100000 },
        ],
      },
      {
        category: 'Irrigation',
        items: [
          { name: 'Water pump fuel/maintenance', costPerHectare: 200000 },
        ],
      },
      {
        category: 'Transport',
        items: [
          { name: 'To miller/market', costPerHectare: 120000 },
        ],
      },
      {
        category: 'Processing',
        items: [
          { name: 'Milling & polishing', costPerHectare: 200000 },
        ],
      },
      {
        category: 'Certification',
        items: [
          { name: 'Certification (optional)', costPerHectare: 50000 },
        ],
      },
      {
        category: 'Interest on Working Capital',
        items: [
          { name: 'Loan interest', costPerHectare: 150000 },
        ],
      },
    ],
  },

  // ── Rice Ghana ──
  {
    crop: 'Rice',
    country: 'GH',
    currency: 'GHS',
    defaultYieldKgPerHa: 3500,
    defaultMarketPricePerKg: 7,
    costBreakdown: [
      {
        category: 'Land Preparation',
        items: [
          { name: 'Ploughing & puddling', costPerHectare: 500 },
        ],
      },
      {
        category: 'Seed/Seedling',
        items: [
          { name: 'AGRA/Jasmine seed (40kg)', costPerHectare: 400 },
        ],
      },
      {
        category: 'Fertilizer',
        items: [
          { name: 'NPK (200kg)', costPerHectare: 600 },
          { name: 'Urea (100kg)', costPerHectare: 200 },
        ],
      },
      {
        category: 'Pesticides/Herbicides/Fungicides',
        items: [
          { name: 'Herbicide', costPerHectare: 100 },
          { name: 'Insecticide', costPerHectare: 80 },
        ],
      },
      {
        category: 'Labor',
        items: [
          { name: 'Transplanting', costPerHectare: 300 },
          { name: 'Weeding', costPerHectare: 200 },
          { name: 'Harvesting', costPerHectare: 250 },
          { name: 'Threshing', costPerHectare: 100 },
        ],
      },
      {
        category: 'Irrigation',
        items: [
          { name: 'Irrigation pump fuel', costPerHectare: 200 },
        ],
      },
      {
        category: 'Transport',
        items: [
          { name: 'To miller', costPerHectare: 100 },
        ],
      },
      {
        category: 'Processing',
        items: [
          { name: 'Milling', costPerHectare: 200 },
        ],
      },
      {
        category: 'Certification',
        items: [
          { name: 'Certification', costPerHectare: 50 },
        ],
      },
      {
        category: 'Interest on Working Capital',
        items: [
          { name: 'Credit', costPerHectare: 150 },
        ],
      },
    ],
  },

  // ── Rice Kenya ──
  {
    crop: 'Rice',
    country: 'KE',
    currency: 'KES',
    defaultYieldKgPerHa: 4000,
    defaultMarketPricePerKg: 80,
    costBreakdown: [
      {
        category: 'Land Preparation',
        items: [
          { name: 'Ploughing & puddling', costPerHectare: 8000 },
        ],
      },
      {
        category: 'Seed/Seedling',
        items: [
          { name: 'NIB/BW196 seed (40kg)', costPerHectare: 8000 },
        ],
      },
      {
        category: 'Fertilizer',
        items: [
          { name: 'DAP (100kg)', costPerHectare: 10000 },
          { name: 'CAN (100kg)', costPerHectare: 7000 },
        ],
      },
      {
        category: 'Pesticides/Herbicides/Fungicides',
        items: [
          { name: 'Herbicide (2,4-D)', costPerHectare: 2000 },
          { name: 'Insecticide', costPerHectare: 1500 },
        ],
      },
      {
        category: 'Labor',
        items: [
          { name: 'Nursery & transplanting', costPerHectare: 6000 },
          { name: 'Weeding', costPerHectare: 4000 },
          { name: 'Harvesting', costPerHectare: 5000 },
          { name: 'Threshing', costPerHectare: 3000 },
        ],
      },
      {
        category: 'Irrigation',
        items: [
          { name: 'NIB irrigation fee', costPerHectare: 5000 },
        ],
      },
      {
        category: 'Transport',
        items: [
          { name: 'To miller', costPerHectare: 3000 },
        ],
      },
      {
        category: 'Processing',
        items: [
          { name: 'Milling', costPerHectare: 4000 },
        ],
      },
      {
        category: 'Certification',
        items: [
          { name: 'Certification', costPerHectare: 1500 },
        ],
      },
      {
        category: 'Interest on Working Capital',
        items: [
          { name: 'Coop loan', costPerHectare: 3000 },
        ],
      },
    ],
  },

  // ── Tea Kenya ──
  {
    crop: 'Tea',
    country: 'KE',
    currency: 'KES',
    defaultYieldKgPerHa: 4000,
    defaultMarketPricePerKg: 50,
    costBreakdown: [
      {
        category: 'Land Preparation',
        items: [
          { name: 'Contour ploughing & terracing', costPerHectare: 12000 },
        ],
      },
      {
        category: 'Seed/Seedling',
        items: [
          { name: 'Tea clones (10,000 plants/ha)', costPerHectare: 15000 },
        ],
      },
      {
        category: 'Fertilizer',
        items: [
          { name: 'NPK 25-5-5 (250kg)', costPerHectare: 15000 },
          { name: 'Sulphate of Ammonia (150kg)', costPerHectare: 8000 },
        ],
      },
      {
        category: 'Pesticides/Herbicides/Fungicides',
        items: [
          { name: 'Herbicide (Roundup)', costPerHectare: 3000 },
          { name: 'Insecticide (red spider mite)', costPerHectare: 4000 },
          { name: 'Fungicide (tea blight)', costPerHectare: 3000 },
        ],
      },
      {
        category: 'Labor',
        items: [
          { name: 'Planting', costPerHectare: 10000 },
          { name: 'Plucking (weekly — annual cost)', costPerHectare: 60000 },
          { name: 'Pruning (3-year cycle amortized)', costPerHectare: 5000 },
          { name: 'Weeding', costPerHectare: 8000 },
        ],
      },
      {
        category: 'Transport',
        items: [
          { name: 'To factory (green leaf)', costPerHectare: 5000 },
        ],
      },
      {
        category: 'Processing',
        items: [
          { name: 'Factory processing fee (KTDA)', costPerHectare: 20000 },
        ],
      },
      {
        category: 'Certification',
        items: [
          { name: 'Rainforest Alliance', costPerHectare: 3000 },
        ],
      },
      {
        category: 'Interest on Working Capital',
        items: [
          { name: 'KTDA advance interest', costPerHectare: 5000 },
        ],
      },
    ],
  },

  // ── Tea Uganda ──
  {
    crop: 'Tea',
    country: 'UG',
    currency: 'UGX',
    defaultYieldKgPerHa: 3000,
    defaultMarketPricePerKg: 2000,
    costBreakdown: [
      {
        category: 'Land Preparation',
        items: [
          { name: 'Land preparation', costPerHectare: 200000 },
        ],
      },
      {
        category: 'Seed/Seedling',
        items: [
          { name: 'Tea clones', costPerHectare: 300000 },
        ],
      },
      {
        category: 'Fertilizer',
        items: [
          { name: 'NPK (200kg)', costPerHectare: 500000 },
        ],
      },
      {
        category: 'Pesticides/Herbicides/Fungicides',
        items: [
          { name: 'Herbicide', costPerHectare: 100000 },
          { name: 'Pesticide', costPerHectare: 80000 },
        ],
      },
      {
        category: 'Labor',
        items: [
          { name: 'Plucking (annual)', costPerHectare: 800000 },
          { name: 'Pruning', costPerHectare: 100000 },
          { name: 'Weeding', costPerHectare: 120000 },
        ],
      },
      {
        category: 'Transport',
        items: [
          { name: 'To factory', costPerHectare: 100000 },
        ],
      },
      {
        category: 'Processing',
        items: [
          { name: 'Factory processing', costPerHectare: 300000 },
        ],
      },
      {
        category: 'Certification',
        items: [
          { name: 'Certification', costPerHectare: 50000 },
        ],
      },
      {
        category: 'Interest on Working Capital',
        items: [
          { name: 'Credit', costPerHectare: 100000 },
        ],
      },
    ],
  },
]

// ─── Profile Lookup ───────────────────────────────────────────────────

function findProfile(crop: string, country: string): CropCostProfile | null {
  const normalizedCrop = crop.charAt(0).toUpperCase() + crop.slice(1).toLowerCase()
  const normalizedCountry = country.toUpperCase()

  return (
    CROP_PROFILES.find(
      (p) =>
        p.crop.toLowerCase() === normalizedCrop.toLowerCase() &&
        p.country === normalizedCountry
    ) ?? null
  )
}

function getCountryCode(country: string): string {
  const upper = country.toUpperCase()
  if (upper.length <= 3) return upper
  // Map full names
  const nameMap: Record<string, string> = {
    UGANDA: 'UG',
    GHANA: 'GH',
    KENYA: 'KE',
    TANZANIA: 'TZ',
    NIGERIA: 'NG',
    ETHIOPIA: 'ET',
    RWANDA: 'RW',
    BURUNDI: 'BI',
  }
  return nameMap[upper] ?? upper.substring(0, 2)
}

// ─── Cost Calculator ──────────────────────────────────────────────────

/**
 * Calculate the full cost of cultivation for a given crop, country, and area.
 */
export function calculateCostOfCultivation(
  input: CostOfCultivationInput
): CostOfCultivationResult {
  const countryCode = getCountryCode(input.country)
  const profile = findProfile(input.crop, input.country)

  if (!profile) {
    throw new Error(
      `No cost profile found for ${input.crop} in ${input.country}. ` +
        `Available profiles: ${CROP_PROFILES.map((p) => `${p.crop} (${p.country})`).join(', ')}`
    )
  }

  const currency = profile.currency
  const area = input.areaHectares

  // Build breakdown with adjustments for practices
  const breakdown: CostBreakdownCategory[] = []
  let totalCost = 0

  for (const cat of profile.costBreakdown) {
    const items = cat.items.map((item) => {
      let costPerHa = item.costPerHectare

      // Adjustments for practices
      if (input.practices.organic) {
        // Remove synthetic fertilizers/pesticides costs for organic
        if (cat.category === 'Fertilizer' && item.name.toLowerCase().includes('npk')) {
          costPerHa = 0
        }
        if (cat.category === 'Fertilizer' && item.name.toLowerCase().includes('urea')) {
          costPerHa = 0
        }
        if (cat.category === 'Pesticides/Herbicides/Fungicides') {
          costPerHa = Math.round(costPerHa * 0.2) // 80% reduction for organic
        }
        // Increase organic manure
        if (cat.category === 'Fertilizer' && item.name.toLowerCase().includes('organic')) {
          costPerHa = Math.round(costPerHa * 1.5)
        }
        // Higher certification cost for organic
        if (cat.category === 'Certification') {
          costPerHa = Math.round(costPerHa * 1.3)
        }
      }

      // Mechanization reduces labor cost
      if (input.practices.mechanization) {
        if (cat.category === 'Labor' && item.name.toLowerCase().includes('weeding')) {
          costPerHa = Math.round(costPerHa * 0.6)
        }
        if (cat.category === 'Land Preparation') {
          costPerHa = Math.round(costPerHa * 0.8)
        }
      }

      // Irrigation: add irrigation cost if not in profile
      const totalItemCost = costPerHa * area

      return {
        name: item.name,
        costPerHectare: costPerHa,
        totalCost: totalItemCost,
        unit: item.unit,
        notes: item.unit,
      }
    })

    const subtotal = items.reduce((s, i) => s + i.totalCost, 0)
    totalCost += subtotal

    // Percentage will be filled after total is known
    breakdown.push({
      category: cat.category,
      items,
      subtotal,
      percentageOfTotal: 0, // filled below
    })
  }

  // Fill percentages
  for (const cat of breakdown) {
    cat.percentageOfTotal =
      totalCost > 0
        ? Math.round((cat.subtotal / totalCost) * 1000) / 10
        : 0
  }

  // Add irrigation category if irrigation is enabled and not in profile
  if (input.practices.irrigation) {
    const hasIrrigation = breakdown.some(
      (c) => c.category === 'Irrigation'
    )
    if (!hasIrrigation) {
      const irrigationCost = Math.round(totalCost * 0.08)
      const irrigationCategory: CostBreakdownCategory = {
        category: 'Irrigation',
        items: [
          {
            name: 'Water pump fuel/maintenance',
            costPerHectare: Math.round(irrigationCost / area),
            totalCost: irrigationCost,
            notes: 'Estimated based on 8% of total cost',
          },
        ],
        subtotal: irrigationCost,
        percentageOfTotal:
          Math.round((irrigationCost / (totalCost + irrigationCost)) * 1000) /
          10,
      }
      breakdown.push(irrigationCategory)
      totalCost += irrigationCost
    }
  }

  // Recalculate percentages after irrigation add
  for (const cat of breakdown) {
    cat.percentageOfTotal =
      totalCost > 0
        ? Math.round((cat.subtotal / totalCost) * 1000) / 10
        : 0
  }

  // Revenue projection
  const yieldKgPerHa = input.customYieldKgPerHa ?? profile.defaultYieldKgPerHa
  const pricePerKg =
    input.customMarketPricePerKg ?? profile.defaultMarketPricePerKg
  const totalYieldKg = yieldKgPerHa * area
  const totalRevenue = totalYieldKg * pricePerKg

  // Profitability
  const profitability = compareCostVsRevenue(totalCost, totalRevenue, totalYieldKg, pricePerKg)

  return {
    crop: input.crop,
    country: input.country,
    areaHectares: area,
    totalCost: Math.round(totalCost),
    costPerHectare: Math.round(totalCost / area),
    breakdown,
    revenueProjection: {
      expectedYieldKgPerHa: yieldKgPerHa,
      totalYieldKg: Math.round(totalYieldKg),
      marketPricePerKg: pricePerKg,
      totalRevenue: Math.round(totalRevenue),
      currency,
    },
    profitability,
    currency,
  }
}

// ─── Profitability Analysis ───────────────────────────────────────────

/**
 * Compare cost vs revenue and compute full profitability metrics.
 */
export function compareCostVsRevenue(
  totalCost: number,
  totalRevenue: number,
  totalYieldKg: number = 0,
  pricePerKg: number = 0
): ProfitabilityAnalysis {
  const grossProfit = totalRevenue - totalCost
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const roi = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0
  const costPerKg = totalYieldKg > 0 ? totalCost / totalYieldKg : 0
  const breakEvenYieldKg = pricePerKg > 0 ? totalCost / pricePerKg : 0
  const breakEvenPricePerKg = totalYieldKg > 0 ? totalCost / totalYieldKg : 0

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH'
  if (profitMargin > 50) riskLevel = 'LOW'
  else if (profitMargin > 20) riskLevel = 'MEDIUM'

  return {
    totalRevenue: Math.round(totalRevenue),
    totalCost: Math.round(totalCost),
    grossProfit: Math.round(grossProfit),
    netProfit: Math.round(grossProfit), // No tax calculation in this module
    profitMargin: Math.round(profitMargin * 10) / 10,
    roi: Math.round(roi * 10) / 10,
    breakEvenYieldKgPerHa: Math.round(breakEvenYieldKg),
    breakEvenPricePerKg: Math.round(breakEvenPricePerKg * 100) / 100,
    costPerKg: Math.round(costPerKg * 100) / 100,
    isProfitable: grossProfit > 0,
    riskLevel,
  }
}

// ─── Get Crop Cost Profile ────────────────────────────────────────────

/**
 * Retrieve the default cost profile for a crop-country combination.
 */
export function getCropCostProfile(
  crop: string,
  country: string
): CropCostProfile {
  const profile = findProfile(crop, country)
  if (!profile) {
    throw new Error(
      `No cost profile found for ${crop} in ${country}. ` +
        `Available: ${CROP_PROFILES.map((p) => `${p.crop} (${p.country})`).join(', ')}`
    )
  }
  return profile
}

/**
 * Get all available crop-country profiles.
 */
export function getAvailableProfiles(): Array<{
  crop: string
  country: string
  currency: string
  defaultYieldKgPerHa: number
  defaultMarketPricePerKg: number
}> {
  return CROP_PROFILES.map((p) => ({
    crop: p.crop,
    country: p.country,
    currency: p.currency,
    defaultYieldKgPerHa: p.defaultYieldKgPerHa,
    defaultMarketPricePerKg: p.defaultMarketPricePerKg,
  }))
}

// ─── Input Cost Optimization ──────────────────────────────────────────

/**
 * Given a budget, suggest optimal input allocation to maximize yield
 * while minimizing cost. Uses a heuristic approach based on yield
 * elasticity per cost category.
 */
export function optimizeInputCosts(
  crop: string,
  areaHectares: number,
  budget: number,
  _constraints?: OptimizationConstraint[]
): OptimizationResult {
  const fullResult = calculateCostOfCultivation({
    crop,
    country: getCountryCode(crop === 'Cocoa' ? 'GH' : 'UG'), // default country hint
    areaHectares,
    practices: { irrigation: false, mechanization: false, organic: false },
  })

  // If budget covers full cost, no optimization needed
  if (budget >= fullResult.totalCost) {
    return {
      originalBudget: fullResult.totalCost,
      optimizedBudget: fullResult.totalCost,
      savings: 0,
      savingsPercentage: 0,
      allocations: fullResult.breakdown.flatMap((cat) =>
        cat.items.map((item) => ({
          category: cat.category,
          item: item.name,
          originalAmount: item.totalCost,
          optimizedAmount: item.totalCost,
          change: 0,
          changePercentage: 0,
        }))
      ),
      projectedYieldImpact: 0,
      expectedYieldKgPerHa: fullResult.revenueProjection.expectedYieldKgPerHa,
      notes: ['Budget covers full cost of cultivation. No optimization needed.'],
    }
  }

  // Budget shortfall ratio
  const ratio = budget / fullResult.totalCost

  // Yield elasticity by category (how much yield loss per % cost reduction)
  // Higher elasticity = more important for yield = should be protected
  const categoryElasticity: Record<string, number> = {
    'Seed/Seedling': 0.9, // Critical — can't reduce much
    'Land Preparation': 0.5, // Important but has alternatives
    Fertilizer: 0.8, // High impact on yield
    'Pesticides/Herbicides/Fungicides': 0.7, // Moderate-high impact
    Labor: 0.6, // Important
    Irrigation: 0.75, // High impact if applicable
    Transport: 0.2, // Low yield impact
    Processing: 0.15, // Post-harvest, low yield impact
    Certification: 0.1, // No direct yield impact
    'Interest on Working Capital': 0.0, // No yield impact at all
  }

  const allocations: OptimizationResult['allocations'] = []
  let optimizedTotal = 0
  const notes: string[] = []

  // Calculate protected vs reducible budgets
  let protectedBudget = 0
  let reducibleBudget = 0
  const reducibleCategories: Array<{
    category: string
    budget: number
    elasticity: number
  }> = []

  for (const cat of fullResult.breakdown) {
    const elasticity = categoryElasticity[cat.category] ?? 0.3
    if (elasticity >= 0.8) {
      // Protect high-elasticity categories
      protectedBudget += cat.subtotal
    } else {
      reducibleCategories.push({
        category: cat.category,
        budget: cat.subtotal,
        elasticity,
      })
      reducibleBudget += cat.subtotal
    }
  }

  // Check if protected budget alone exceeds total budget
  if (protectedBudget > budget) {
    notes.push(
      'WARNING: Budget is insufficient even for critical inputs. ' +
        'Consider increasing budget or reducing area.'
    )
    // Even protected categories must be cut proportionally
    const cutRatio = budget / (protectedBudget + reducibleBudget)
    for (const cat of fullResult.breakdown) {
      for (const item of cat.items) {
        const optimized = Math.round(item.totalCost * cutRatio)
        allocations.push({
          category: cat.category,
          item: item.name,
          originalAmount: item.totalCost,
          optimizedAmount: optimized,
          change: optimized - item.totalCost,
          changePercentage: Math.round((cutRatio - 1) * 1000) / 10,
        })
        optimizedTotal += optimized
      }
    }
  } else {
    // Protected categories stay at full cost
    for (const cat of fullResult.breakdown) {
      const elasticity = categoryElasticity[cat.category] ?? 0.3
      if (elasticity >= 0.8) {
        for (const item of cat.items) {
          allocations.push({
            category: cat.category,
            item: item.name,
            originalAmount: item.totalCost,
            optimizedAmount: item.totalCost,
            change: 0,
            changePercentage: 0,
          })
          optimizedTotal += item.totalCost
        }
      }
    }

    // Distribute remaining budget to reducible categories by elasticity (inverse)
    const remainingBudget = budget - protectedBudget
    const totalElasticityInverse = reducibleCategories.reduce(
      (sum, c) => sum + (1 - c.elasticity),
      0
    )

    for (const rc of reducibleCategories) {
      // Lower elasticity = more reducible = gets less budget
      const weight = (1 - rc.elasticity) / totalElasticityInverse
      const categoryBudget = Math.round(remainingBudget * weight)

      const cat = fullResult.breakdown.find((b) => b.category === rc.category)
      if (!cat) continue

      const categoryRatio = categoryBudget / rc.budget
      for (const item of cat.items) {
        const optimized = Math.round(item.totalCost * categoryRatio)
        allocations.push({
          category: cat.category,
          item: item.name,
          originalAmount: item.totalCost,
          optimizedAmount: optimized,
          change: optimized - item.totalCost,
          changePercentage: Math.round((categoryRatio - 1) * 1000) / 10,
        })
        optimizedTotal += optimized
      }
    }

    notes.push('Protected critical inputs: Seed/Seedling, Fertilizer, Pesticides.')
    notes.push('Reduced: Transport, Processing, Certification, Interest costs.')
  }

  // Estimate yield impact
  // Rough estimate: 1% cost reduction in yield-sensitive inputs → 0.3% yield loss
  const yieldSensitiveReduction = allocations
    .filter(
      (a) =>
        (categoryElasticity[a.category] ?? 0.3) >= 0.6 &&
        a.changePercentage < 0
    )
    .reduce((sum, a) => sum + Math.abs(a.changePercentage), 0)

  const yieldImpact = -(yieldSensitiveReduction * 0.3)
  const expectedYield =
    fullResult.revenueProjection.expectedYieldKgPerHa *
    (1 + yieldImpact / 100)

  const savings = fullResult.totalCost - optimizedTotal

  return {
    originalBudget: fullResult.totalCost,
    optimizedBudget: optimizedTotal,
    savings,
    savingsPercentage:
      fullResult.totalCost > 0
        ? Math.round((savings / fullResult.totalCost) * 1000) / 10
        : 0,
    allocations,
    projectedYieldImpact: Math.round(yieldImpact * 10) / 10,
    expectedYieldKgPerHa: Math.round(expectedYield),
    notes,
  }
}