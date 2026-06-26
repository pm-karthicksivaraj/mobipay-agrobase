# Task 3-d: Phase 3 API Routes + Schema Updates

## Summary of Changes

### Task 1: Prisma Schema Updates

**File Modified:** `/home/z/my-project/prisma/schema.prisma`

**New Models Added (10):**
1. `SatelliteImage` — satellite imagery metadata
2. `NdvTimeSeries` — NDVI/EVI vegetation index time series
3. `RainfallRecord` — CHIRPS rainfall data points
4. `DeforestationAlert` — deforestation detection alerts linked to EUDR
5. `CarbonFootprint` — cultivation carbon emission calculations
6. `CbamCalculation` — CBAM cost calculations linked to CbamReport
7. `ProductBatch` — traceability product batches
8. `TraceEvent` — batch trace events (timeline)
9. `FarmPassport` — farmer digital passport
10. `CostOfCultivation` — cultivation cost breakdowns
11. `EudrDocument` — EUDR document management
12. `EudrAuditLog` — EUDR compliance audit trail

**Reverse Relations Added:**
- `Tenant`: 10 new relations (satelliteImages, ndvTimeSeries, rainfallRecords, deforestationAlerts, carbonFootprints, cbamCalculations, productBatches, traceEvents, farmPassports, costOfCultivations)
- `FarmerProfile`: productBatches, farmPassport
- `CbamReport`: cbamCalculation
- `EudrCompliance`: deforestationAlerts, documents, auditLogs

**Schema Validation Fixes:**
- `DeforestationAlert.baselineDate`: Changed from `@default(new Date(...))` to `@default(dbgenerated("'2020-12-31 00:00:00'"))` for SQLite compatibility
- `CbamCalculation.cbamReportId`: Added `@unique` for one-to-one relation
- `FarmPassport.farmerId`: Added `@unique` for one-to-one relation

### Task 2: API Routes Created (15 files)

#### Satellite Intelligence (4 routes)
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/satellite/analyze` | POST | Plot analysis with NDVI, land cover, deforestation, rainfall, advisory |
| `/api/satellite/ndvi` | GET | NDVI/EVI time series with trend analysis |
| `/api/satellite/rainfall` | GET | Rainfall data with anomaly, dry spell, heavy rain detection |
| `/api/satellite/deforestation` | GET, POST | List deforestation alerts, trigger deforestation check |

#### EUDR Compliance (3 routes, 1 upgraded)
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/compliance/eudr` | GET, POST, PATCH | Upgraded: tenant isolation via farmer, PATCH handler, ?action=expiring |
| `/api/compliance/eudr/documents` | GET, POST, DELETE | Document management (upload, list, remove) |
| `/api/compliance/eudr/verify` | POST | Verification workflow (verify, reject, renew) with required doc checks |

#### Carbon / CBAM (3 routes)
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/carbon/footprint` | GET, POST | Carbon footprint calculation (IPCC Tier 2) |
| `/api/carbon/cbam` | GET, POST | CBAM cost calculation with EU carbon price |
| `/api/carbon/benchmarks` | GET | Emission benchmarks with percentile ranking |

#### Traceability (5 routes)
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/traceability/batches` | GET, POST, PATCH | Product batch management with auto trace events |
| `/api/traceability/batches/[id]/events` | GET, POST | Batch timeline events |
| `/api/traceability/passport` | GET, POST | Farm passport generation and retrieval |
| `/api/traceability/passport/[passportId]/verify` | GET | Passport verification with certification status and warnings |
| `/api/traceability/cost-of-cultivation` | GET, POST | Cost of cultivation calculation with benchmarks |

### Key Design Decisions
- All routes use `getTenantContext()` + `buildTenantFilter()` for tenant isolation
- EUDR routes filter through `farmer.tenantId` relation (EudrCompliance has no direct tenantId)
- Satellite routes include realistic mock data (Uganda bimodal rainfall, NDVI seasonal patterns)
- Carbon calculations use simplified IPCC Tier 2 methodology with configurable inputs
- CBAM uses commodity-specific embedded emission factors with organic and country adjustments
- Trace events auto-created on batch creation and updates
- Farm passport auto-includes all certifications and warnings about expiring ones