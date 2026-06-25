---
Task ID: 1
Agent: Main Agent
Task: Build remaining 19 modules, NextAuth, theme persistence, USSD/IVR/SMS simulators, EKIBBO compliance

Work Log:
- Read EKIBBO feedback PDF - identified 12 key requirements (3-tier access, farm visits, impact assessment, compliance, multi-point GPS, attachments, etc.)
- Updated Prisma schema with 11 new models: FarmVisit, ImpactAssessment, FileAttachment, FarmPolygon, EudrCompliance, CbamReport, RainforestCertification, GlobalGapCertification, UssdSession, IvrCampaign, SmsBroadcast
- Added backward relations to FarmerProfile (6 new relations) and FarmLand (polygonPoints)
- Pushed schema to DB and generated Prisma client
- Set up NextAuth.js v4 with CredentialsProvider, JWT strategy, multi-tenant roles, session sync to Zustand
- Built LoginPage with demo auto-fill, auth guard in page.tsx
- Built 20 new module views via 3 parallel subagent tasks: TraceabilityView, SurveysView, InputAggregationView, PurchasesView, ConsignmentsView, SalesView, DeliveriesView, CompaniesView, UsersView, FeedbackView, ApprovalsView, ProcessingView, ComplianceView, ImpactAssessmentView, FarmVisitsView, ProfileView, ChannelSimulatorView, CcrpView, CohortsView, ProgramsView
- Created 25 API routes for all new modules
- Updated Zustand store with 4 new module keys (farm-visits, impact-assessment, channel-sim, compliance)
- Rewrote Sidebar with 31 modules organized in 6 groups
- Rewrote TopBar with sign-out, all module titles, user sync
- Rewrote page.tsx with lazy imports for all 31 modules, auth guard
- Created comprehensive seed script (50 farmers, EKIBBO tenant, compliance records, channel data)
- Fixed runtime errors: Budget icon → Wallet, SurveysView questions reduce, PurchasesView charges/taxes/netAmount, SalesView totalAmount
- Browser-verified: Login, Dashboard, Farmers, Compliance Hub (EUDR/CBAM/Rainforest/GGN), Channel Simulator (USSD/IVR/SMS), Sales, Purchases, Traceability, Impact Assessment all load without errors

Stage Summary:
- All 31 module views built and wired into SPA router
- NextAuth.js authentication with 3 demo users (admin, extension officer, farmer)
- EKIBBO compliance modules: EUDR, CBAM, Rainforest Alliance, GLOBALG.A.P.
- USSD/IVR/SMS channel simulators
- Farm Visits and Impact Assessment modules per EKIBBO feedback
- Dark/light theme persistence via next-themes
- 25 new API routes + 50 seeded farmers + 9 tenants
- 0 lint errors (except pre-existing VslaView issue)