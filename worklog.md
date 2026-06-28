---
Task ID: 1
Agent: Main
Task: Fix schema.prisma merge conflicts and implement Plot-Level Traceability

Work Log:
- Resolved 6 git merge conflicts in prisma/schema.prisma using Python resolver script
- Fixed corrupted TripTrackingEvent model (had TransportCharge fields)
- Restored missing TransportCharge model with full fields
- Validated schema (npx prisma validate)
- Pushed schema to SQLite DB, generated Prisma client
- Created 4 new Plot models: Plot, PlotSeason, PlotVerification, PlotDocument
- Added plotId FK to ProductBatch and TraceEvent for plot-level traceability chain
- Added Tenant relations (TenantPlots) and FarmerProfile relations (FarmerPlots) and FarmLand relations (PlotFarmLand)
- Created src/lib/plots/types.ts with comprehensive type definitions
- Created src/lib/plots/engine.ts with PlotEngine static class (CRUD, verification, seasons, documents, traceability chain, stats, GeoJSON)
- Created 8 API routes: /api/plots, /[id], /[id]/verify, /[id]/seasons, /[id]/traceability, /[id]/documents, /stats, /geojson
- Registered 'plots' module in store.ts, Sidebar.tsx, and page.tsx
- Created PlotsView.tsx with 4 tabs: Overview (KPIs, verification pipeline, charts), All Plots (table with filters), Map View (placeholder), Verification (quick verify actions)
- Added Plot seed data (6 plots, 6 seasons, 6 verifications, 3 documents)
- Fixed missing bulk/schemas.ts file
- Fixed SQLite incompatible `mode: 'insensitive' in carbon/calculator.ts
- Fixed all missing tenantId in seed.ts across 12+ models
- Final build: SUCCESS (180+ routes, zero errors)

Stage Summary:
- Plot-Level Traceability feature fully implemented
- Schema: 144 models (added 4 Plot models + updated 2 existing)
- API: 8 new routes for plot management
- UI: PlotsView with overview dashboard, plot list, map placeholder, verification actions
- Seed data: 6 plots across Uganda with full verification/compliance data
- Build: Clean, zero errors