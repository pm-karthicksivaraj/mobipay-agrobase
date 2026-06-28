---
Task ID: 4
Agent: Main
Task: Fix all partial/missing/blocker items + Flutter Plot screens + PostgreSQL local setup

Work Log:
- Fixed seed.ts: added missing tenantId to PlotSeason (6 records), PlotVerification (6 records), PlotDocument (3 records) createMany calls
- Fixed plots/engine.ts: removed non-existent complianceNotes field from updateSeason method
- Added Carbon Credits seed data: 2 CarbonProjects, 4 CarbonCredits (ISSUED/RETIRED/PENDING/VERIFIED), 2 CarbonVerifications
- Added MFI seed data: 2 MfiPartners (Pride Microfinance, UCCU SACCO), 2 MfiLoanProducts, 8 MfiLoans across all statuses
- Added ProductBatch seed data: 4 batches linked to plots (ARABICA_COFFEE, MAIZE, ROBUSTA_COFFEE, COFFEE)
- Updated .env for local PostgreSQL (DATABASE_URL=postgresql://localhost:5432/agrobase_v3)
- Created scripts/setup-pg.sql with step-by-step PostgreSQL setup guide for macOS + Navicat
- Created Flutter PlotsPage: 3-tab layout (All Plots / Map / Stats), search, verification status filter, pull-to-refresh, KPI stats
- Created Flutter PlotDetailPage: 3-tab layout (Details / Seasons / History), verification badge, EUDR risk, season cards, verification timeline, document list
- Updated Flutter router: added Plots branch to navigation (9 tabs total), added /plots/:id route
- Updated Flutter API client: changed default base URL to http://10.0.2.2:3000 for local dev
- TypeScript check: 0 errors, Next.js build: passes cleanly

Stage Summary:
- All seed blockers fixed — seed will run successfully against PostgreSQL
- Build compiles cleanly (tsc --noEmit + next build)
- Flutter app now has Plot management screens (list + detail + stats)
- Code pushed to GitHub (commit 65d646e)
- User can now set up local PG, push schema, seed, and test both Web + Mobile

---
Task ID: 2
Agent: Main
Task: Priority 1 — EUDR DDS Integration for Plot-Level Evidence Packs + Real Leaflet Map

Work Log:
- Installed leaflet, react-leaflet, @types/leaflet packages
- Created src/lib/eudr/evidence-pack.ts (796 lines) — EvidencePackEngine with:
  - generateForPlot(): assembles 6-category evidence pack (Geolocation, Deforestation, Risk Assessment, Legal Documents, Traceability, Verification Audit)
  - submitFromPlot(): bridges Plot → EUDR Engine for due diligence submission
  - buildGeolocationEvidence(): extracts boundary, area, GPS accuracy from Plot + FarmLand
  - buildDeforestationEvidence(): runs real Satellite NDVI analysis vs EUDR Dec 2020 baseline
  - buildRiskAssessment(): runs 5-factor EUDR risk scoring (forest proximity, historical deforestation, country risk, plot size, documentation)
  - Completeness scoring (0-100) with weighted categories
  - Status determination (COMPLETE/PARTIAL/INCOMPLETE/NON_COMPLIANT)
  - Actionable recommendations engine
- Created src/app/api/plots/[id]/eudr-evidence/route.ts — GET (generate pack) + POST (submit to EUDR)
- Created src/components/plots/PlotMap.tsx (357 lines) — Full Leaflet map component:
  - OpenStreetMap tiles (free, no API key)
  - GeoJSON polygon rendering from /api/plots/geojson
  - Color modes: Verification Status + EUDR Risk Level
  - Interactive popups with plot details, risk badges, area
  - Hover highlighting, click-to-select
  - Auto-fit bounds to all plots
  - Legend overlay, plot count badge
  - PlotMiniMap sub-component for detail panel
- Created src/components/plots/EudrEvidencePanel.tsx (409 lines):
  - Completeness score with progress bar
  - 5 expandable evidence category accordions
  - Risk factor breakdown bars (5 factors with scores and details)
  - NDVI comparison cards (current vs baseline)
  - Verification audit trail
  - Recommendations list
  - Submit to EUDR button + Export JSON download
- Updated PlotsView.tsx:
  - Replaced map placeholder with real PlotMap component (dynamic import, SSR-safe)
  - Added 'EUDR Evidence' tab with evidence panel
  - Plot selection from map click navigates to detail

Stage Summary:
- EUDR Evidence Pack engine fully bridges Plot ↔ EUDR Engine ↔ Satellite Orchestrator ↔ Risk Scoring
- Real interactive Leaflet map replaces placeholder (OpenStreetMap, color-coded polygons)
- EUDR Evidence tab shows comprehensive compliance data with actionable recommendations
- Zero TypeScript errors, zero new lint errors

---
Task ID: 3
Agent: Main
Task: Priority 2 — Flutter Mobile Plot Screens + Mobile API Endpoints

Work Log:
- Created docs/mobile/plot-screens-spec.md (1,832 lines) — Comprehensive Flutter spec:
  - 6 screen specifications (PlotList, PlotMap, PlotDetail, GpsCollection, Verification, EudrEvidence)
  - Widget trees, data flow tables, Riverpod providers
  - Navigation & routing with GoRouter
  - Offline-first strategy with Hive
  - API response examples for all endpoints
  - Tech stack recommendations (flutter_map, geolocator, dio, riverpod)
- Created 4 mobile-optimized API endpoints:
  - GET/POST /api/mobile/plots — Lightweight list (shortened field names) + GPS creation with validation
  - GET /api/mobile/plots/[id] — Full detail with sync metadata
  - POST /api/mobile/plots/[id]/verify — Field verification with evidence
  - GET/POST /api/mobile/plots/[id]/eudr-evidence — Evidence pack + EUDR submission

Stage Summary:
- Complete Flutter screens spec ready for mobile team handoff
- Mobile API layer with lightweight payloads and sync metadata
- All new endpoints TypeScript-verified (0 errors)
