# Agrobase V3 — Plot-Level Traceability Mobile Screens Spec

> **Version:** 1.0.0  
> **Target:** Flutter 3.22+ (Dart 3.4+)  
> **Platforms:** Android 8.0+, iOS 14+  
> **Last Updated:** 2025-07-11

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Shared Types & API Contracts](#2-shared-types--api-contracts)
3. [Screen 1 — PlotListScreen](#3-screen-1--plotlistscreen)
4. [Screen 2 — PlotMapScreen](#4-screen-2--plotmapscreen)
5. [Screen 3 — PlotDetailScreen](#5-screen-3--plotdetailscreen)
6. [Screen 4 — GpsCollectionScreen](#6-screen-4--gpscollectionscreen)
7. [Screen 5 — VerificationScreen](#7-screen-5--verificationscreen)
8. [Screen 6 — EudrEvidenceScreen](#8-screen-6--eudrevidencescreen)
9. [Navigation & Routing](#9-navigation--routing)
10. [Offline Strategy](#10-offline-strategy)
11. [Tech Stack & Package Matrix](#11-tech-stack--package-matrix)

---

## 1. Architecture Overview

### 1.1 Layer Diagram

```
┌─────────────────────────────────────────────────┐
│                   UI Layer                       │
│  PlotList  PlotMap  PlotDetail  GPS  Verify  EUDR│
├─────────────────────────────────────────────────┤
│              State Management (Riverpod 2.0)     │
│  plotListProvider  plotDetailProvider  gpsProvider│
├─────────────────────────────────────────────────┤
│               Repository Layer                   │
│  PlotRepository (remote + local cache)           │
├──────────────────┬──────────────────────────────┤
│   Remote (Dio)   │     Local (Hive/Isar)        │
│  /api/plots/*    │  Offline box, pending queue  │
├──────────────────┴──────────────────────────────┤
│              Sync Engine                         │
│  GET/POST /api/mobile/sync  (delta token)       │
└─────────────────────────────────────────────────┘
```

### 1.2 Design Principles

- **Offline-first:** All reads serve from local cache first; network updates happen in background.
- **Optimistic UI:** Verification and GPS collection show immediate feedback; server sync is deferred.
- **Delta sync:** Mobile sync uses opaque base64 cursor token; no full re-fetch.
- **Server-wins conflicts:** When push conflicts occur, server data takes precedence. Conflict details are surfaced to the user.

---

## 2. Shared Types & API Contracts

### 2.1 Enum Definitions

```dart
enum PlotVerificationStatus {
  unverified,        // UNVERIFIED
  gpsVerified,       // GPS_VERIFIED
  satelliteVerified, // SATELLITE_VERIFIED
  fieldAudited,      // FIELD_AUDITED
  verified,          // VERIFIED
}

enum PlotRiskLevel { low, medium, high, unknown }

enum VerificationType { gps, satellite, drone, fieldAudit, combined }

enum VerificationResult { passed, failed, needsReview, pending }

enum PlotSeasonStatus { planned, planted, growing, harvested, completed, abandoned }

enum PlotDocType { landTitle, leaseAgreement, surveyReport, eudrCertificate, satelliteImage, complianceReport }

enum PlotType { production, nursery, processing, demo }
```

### 2.2 Model Classes

```dart
// --- PlotSummary (list item) ---
@HiveType(typeId: 0)
class PlotSummary {
  @HiveField(0) final String id;
  @HiveField(1) final String plotCode;
  @HiveField(2) final String name;
  @HiveField(3) final String farmerName;
  @HiveField(4) final double? areaHectares;
  @HiveField(5) final double? centroidLat;
  @HiveField(6) final double? centroidLng;
  @HiveField(7) final PlotVerificationStatus verificationStatus;
  @HiveField(8) final PlotRiskLevel eudrRiskLevel;
  @HiveField(9) final PlotType plotType;
  @HiveField(10) final int seasonCount;
  @HiveField(11) final int batchCount;
  @HiveField(12) final bool isActive;
  @HiveField(13) final String createdAt;
}

// --- PlotDetail (full detail) ---
class PlotDetail extends PlotSummary {
  final String? farmerId;
  final String? farmLandId;
  final String? description;
  final String? boundaryGeoJson;   // Raw JSON string of Feature
  final String? soilType;
  final double? elevationM;
  final double? slopePercent;
  final String? irrigationType;
  final String? verificationMethod;
  final double? verificationScore;
  final String? verifiedBy;
  final String? verifiedAt;
  final bool deforestationFree;
  final String? lastSatelliteCheck;
  final String? landOwnership;
  final List<String>? tags;
  final List<PlotSeasonDetail> seasons;
  final List<PlotVerificationDetail> recentVerifications;
  final List<PlotDocumentDetail> recentDocuments;
}

class PlotSeasonDetail {
  final String id;
  final String season;            // e.g. "2024A", "2024B"
  final String cropType;
  final String? variety;
  final String? plantingDate;
  final String? expectedHarvestDate;
  final String? actualHarvestDate;
  final double? areaPlantedHectares;
  final double? yieldKg;
  final String? qualityGrade;
  final PlotSeasonStatus status;
  final bool? eudrCompliant;
}

class PlotVerificationDetail {
  final String id;
  final VerificationType verificationType;
  final VerificationResult result;
  final String? verifiedBy;
  final String? verifiedAt;
  final double? boundaryMatchPercent;
  final double? accuracyMeters;
  final String? deforestCheckResult;  // "CLEAR" | "CONFIRMED" | "SUSPECTED" | null
  final String? notes;
}

class PlotDocumentDetail {
  final String id;
  final PlotDocType docType;
  final String? title;
  final String? fileUrl;
  final String? issuedBy;
  final String? issuedAt;
  final String? expiresAt;
  final bool isVerified;
}
```

### 2.3 API Response Shapes

#### `GET /api/plots` — List Plots

```json
{
  "plots": [
    {
      "id": "clx7a2b3k0001qx7n8m9o0p1q",
      "plotCode": "PLT-UG-000042",
      "name": "Okello Maize Field A",
      "farmerName": "James Okello",
      "areaHectares": 2.5,
      "centroidLat": 1.3733,
      "centroidLng": 32.2903,
      "verificationStatus": "GPS_VERIFIED",
      "eudrRiskLevel": "LOW",
      "plotType": "PRODUCTION",
      "seasonCount": 3,
      "batchCount": 2,
      "isActive": true,
      "createdAt": "2024-09-15T08:30:00.000Z"
    }
  ],
  "total": 347,
  "page": 1,
  "pageSize": 20
}
```

#### `GET /api/plots/stats` — Tenant Stats

```json
{
  "totalPlots": 347,
  "verifiedPlots": 89,
  "verificationRate": 26,
  "totalAreaHectares": 1823.45,
  "plotsByRisk": { "LOW": 210, "MEDIUM": 87, "HIGH": 32, "UNKNOWN": 18 },
  "plotsByStatus": {
    "UNVERIFIED": 142,
    "GPS_VERIFIED": 68,
    "SATELLITE_VERIFIED": 48,
    "FIELD_AUDITED": 31,
    "VERIFIED": 58
  },
  "plotsByCrop": { "Maize": 120, "Coffee": 85, "Cocoa": 62, "Sesame": 45, "Rice": 35 },
  "deforestationFreePlots": 285,
  "deforestationFreeRate": 82
}
```

#### `GET /api/plots/geojson` — Map Boundaries

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[32.291, 1.374], [32.292, 1.374], [32.292, 1.373], [32.291, 1.373], [32.291, 1.374]]]
      },
      "properties": {
        "id": "clx7a2b3k0001qx7n8m9o0p1q",
        "plotCode": "PLT-UG-000042",
        "name": "Okello Maize Field A",
        "farmerName": "James Okello",
        "verificationStatus": "GPS_VERIFIED",
        "eudrRiskLevel": "LOW",
        "areaHectares": 2.5
      }
    }
  ]
}
```

#### `GET /api/plots/:id` — Plot Detail

```json
{
  "id": "clx7a2b3k0001qx7n8m9o0p1q",
  "plotCode": "PLT-UG-000042",
  "name": "Okello Maize Field A",
  "farmerName": "James Okello",
  "areaHectares": 2.5,
  "centroidLat": 1.3733,
  "centroidLng": 32.2903,
  "verificationStatus": "GPS_VERIFIED",
  "eudrRiskLevel": "LOW",
  "plotType": "PRODUCTION",
  "seasonCount": 3,
  "batchCount": 2,
  "isActive": true,
  "createdAt": "2024-09-15T08:30:00.000Z",
  "farmerId": "farmer_001",
  "farmLandId": null,
  "description": "Main maize production field near Lira town",
  "boundaryGeoJson": "{\"type\":\"Feature\",\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[[32.291,1.374],[32.292,1.374],[32.292,1.373],[32.291,1.373],[32.291,1.374]]]},\"properties\":{}}",
  "soilType": "Sandy Loam",
  "elevationM": 1108,
  "slopePercent": 3.2,
  "irrigationType": "Rain-fed",
  "verificationMethod": "GPS",
  "verificationScore": 94.5,
  "verifiedBy": "user_abc123",
  "verifiedAt": "2024-10-02T14:20:00.000Z",
  "deforestationFree": true,
  "lastSatelliteCheck": "2024-11-15T00:00:00.000Z",
  "landOwnership": "Customary",
  "tags": ["priority", "organic-pilot"],
  "seasons": [
    {
      "id": "s1",
      "season": "2024A",
      "cropType": "Maize",
      "variety": "HBH 520",
      "plantingDate": "2024-03-15T00:00:00.000Z",
      "expectedHarvestDate": "2024-07-30T00:00:00.000Z",
      "actualHarvestDate": "2024-08-05T00:00:00.000Z",
      "areaPlantedHectares": 2.5,
      "yieldKg": 7500,
      "qualityGrade": "A",
      "status": "COMPLETED",
      "eudrCompliant": true
    }
  ],
  "recentVerifications": [
    {
      "id": "v1",
      "verificationType": "GPS",
      "result": "PASSED",
      "verifiedBy": "user_abc123",
      "verifiedAt": "2024-10-02T14:20:00.000Z",
      "boundaryMatchPercent": 94.5,
      "accuracyMeters": 2.8,
      "deforestCheckResult": "CLEAR",
      "notes": "Boundary matches existing survey. No visible deforestation."
    }
  ],
  "recentDocuments": [
    {
      "id": "d1",
      "docType": "SURVEY_REPORT",
      "title": "Land Survey Oct 2024",
      "fileUrl": "/uploads/docs/survey_oct2024.pdf",
      "issuedBy": "Uganda Lands Office",
      "issuedAt": "2024-10-01T00:00:00.000Z",
      "expiresAt": null,
      "isVerified": true
    }
  ]
}
```

#### `POST /api/plots/:id/verify` — Submit Verification

**Request:**
```json
{
  "verificationType": "GPS",
  "result": "PASSED",
  "boundaryMatchPercent": 94.5,
  "accuracyMeters": 2.8,
  "deforestCheckResult": "CLEAR",
  "notes": "Boundary matches. No deforestation visible."
}
```

**Response (201):**
```json
{
  "plot": {
    "id": "clx7a2b3k0001qx7n8m9o0p1q",
    "plotCode": "PLT-UG-000042",
    "name": "Okello Maize Field A",
    "farmerName": "James Okello",
    "verificationStatus": "GPS_VERIFIED",
    "eudrRiskLevel": "LOW",
    "...": "..."
  },
  "verification": {
    "id": "v2",
    "verificationType": "GPS",
    "result": "PASSED",
    "verifiedBy": "user_abc123",
    "verifiedAt": "2024-12-01T09:30:00.000Z",
    "boundaryMatchPercent": 94.5,
    "accuracyMeters": 2.8,
    "deforestCheckResult": "CLEAR",
    "notes": "Boundary matches. No deforestation visible."
  }
}
```

#### `GET /api/plots/:id/verify` — Verification History

```json
{
  "verifications": [
    {
      "id": "v1",
      "verificationType": "SATELLITE",
      "result": "PASSED",
      "verifiedBy": "system_satellite",
      "verifiedAt": "2024-11-15T00:00:00.000Z",
      "boundaryMatchPercent": null,
      "accuracyMeters": 10.0,
      "deforestCheckResult": "CLEAR",
      "notes": "NDVI analysis confirms vegetation cover"
    }
  ]
}
```

#### `GET /api/plots/:id/traceability` — Full Chain

```json
{
  "plot": {
    "id": "clx7a2b3k0001qx7n8m9o0p1q",
    "plotCode": "PLT-UG-000042",
    "name": "Okello Maize Field A",
    "farmerName": "James Okello",
    "verificationStatus": "GPS_VERIFIED",
    "eudrRiskLevel": "LOW",
    "plotType": "PRODUCTION",
    "seasonCount": 3,
    "batchCount": 2,
    "isActive": true,
    "createdAt": "2024-09-15T08:30:00.000Z"
  },
  "seasons": [
    {
      "season": "2024A",
      "cropType": "Maize",
      "batches": [
        {
          "batchId": "BATCH-2024A-001",
          "commodity": "Maize",
          "quantityKg": 7500,
          "status": "DELIVERED",
          "eventCount": 5,
          "events": [
            {
              "eventType": "HARVEST",
              "stage": "FIELD",
              "timestamp": "2024-08-05T10:00:00.000Z",
              "locationName": "Okello Field A",
              "actorName": "James Okello"
            },
            {
              "eventType": "DRYING",
              "stage": "POST_HARVEST",
              "timestamp": "2024-08-10T14:00:00.000Z",
              "locationName": "Lira Collection Center",
              "actorName": "John Ochan"
            },
            {
              "eventType": "TRANSPORT",
              "stage": "LOGISTICS",
              "timestamp": "2024-08-15T08:00:00.000Z",
              "locationName": "Lira → Kampala",
              "actorName": "Acme Logistics"
            },
            {
              "eventType": "RECEIPT",
              "stage": "WAREHOUSE",
              "timestamp": "2024-08-16T16:00:00.000Z",
              "locationName": "Kampala Central Warehouse",
              "actorName": "Grace Nakamya"
            },
            {
              "eventType": "GRADING",
              "stage": "QUALITY",
              "timestamp": "2024-08-17T11:00:00.000Z",
              "locationName": "Kampala QC Lab",
              "actorName": "Peter Musoke"
            }
          ]
        }
      ]
    }
  ]
}
```

#### `GET /api/plots/:id/eudr-evidence` — Evidence Pack

```json
{
  "plotId": "clx7a2b3k0001qx7n8m9o0p1q",
  "plotCode": "PLT-UG-000042",
  "plotName": "Okello Maize Field A",
  "generatedAt": "2024-12-01T10:00:00.000Z",
  "tenantId": "tenant_ug_001",
  "eudrReference": "EUDR-UG-2024-00042",
  "overallStatus": "PARTIAL",
  "completenessScore": 72,
  "evidenceCategories": [
    {
      "category": "GEOLOCATION",
      "label": "Geolocation Evidence",
      "status": "PRESENT",
      "itemCount": 3,
      "requiredItems": 3,
      "items": [
        { "id": "g1", "label": "GPS Boundary Polygon", "status": "VALID", "date": "2024-10-02T14:20:00.000Z", "details": "5 points, 2.5 ha" },
        { "id": "g2", "label": "GPS Accuracy Record", "status": "VALID", "date": "2024-10-02T14:20:00.000Z", "details": "±2.8m" },
        { "id": "g3", "label": "Boundary Verification", "status": "VALID", "date": "2024-10-02T14:20:00.000Z", "details": "94.5% match" }
      ]
    },
    {
      "category": "DEFORESTATION",
      "label": "Deforestation-Free Evidence",
      "status": "PARTIAL",
      "itemCount": 2,
      "requiredItems": 3,
      "items": [
        { "id": "df1", "label": "NDVI Current Analysis", "status": "VALID", "date": "2024-11-15T00:00:00.000Z", "details": "NDVI: 0.72" },
        { "id": "df2", "label": "Baseline Comparison", "status": "VALID", "date": "2024-11-15T00:00:00.000Z", "details": "Change: +0.03" }
      ]
    },
    {
      "category": "RISK_ASSESSMENT",
      "label": "Risk Assessment",
      "status": "PRESENT",
      "itemCount": 1,
      "requiredItems": 1,
      "items": [
        { "id": "r1", "label": "5-Factor Risk Score", "status": "VALID", "date": "2024-11-15T00:00:00.000Z", "details": "Score: 28/100 (LOW)" }
      ]
    },
    {
      "category": "LEGAL_DOCUMENTS",
      "label": "Legal Documents",
      "status": "PARTIAL",
      "itemCount": 1,
      "requiredItems": 2,
      "items": [
        { "id": "ld1", "label": "Survey Report", "status": "VALID", "date": "2024-10-01T00:00:00.000Z", "details": "Uganda Lands Office" }
      ]
    },
    {
      "category": "TRACEABILITY",
      "label": "Traceability Chain",
      "status": "PRESENT",
      "itemCount": 1,
      "requiredItems": 1,
      "items": [
        { "id": "t1", "label": "Season-Batch Chain", "status": "VALID", "date": "2024-08-17T11:00:00.000Z", "details": "3 seasons, 2 batches, 5 events" }
      ]
    },
    {
      "category": "VERIFICATION",
      "label": "Verification Audit Trail",
      "status": "PRESENT",
      "itemCount": 2,
      "requiredItems": 1,
      "items": [
        { "id": "va1", "label": "GPS Field Verification", "status": "VALID", "date": "2024-10-02T14:20:00.000Z", "details": "PASSED" },
        { "id": "va2", "label": "Satellite Verification", "status": "VALID", "date": "2024-11-15T00:00:00.000Z", "details": "PASSED" }
      ]
    }
  ],
  "riskAssessment": {
    "overallScore": 28,
    "riskLevel": "LOW",
    "forestProximity": { "score": 15, "details": "3.2 km from nearest forest edge" },
    "historicalDeforestation": { "score": 5, "details": "No deforestation detected in 5km radius (2020-2024)" },
    "countryRisk": { "score": 45, "details": "Uganda has moderate deforestation rate of 1.5%/yr", "country": "Uganda" },
    "plotSize": { "score": 10, "details": "2.5 ha — smallholder plot, lower risk" },
    "documentation": { "score": 65, "details": "Missing land title document" },
    "assessedAt": "2024-11-15T00:00:00.000Z"
  },
  "deforestationEvidence": {
    "deforestationFree": true,
    "confidence": 0.92,
    "currentNdvi": 0.72,
    "baselineNdvi": 0.69,
    "ndviChange": 0.03,
    "assessmentDate": "2024-11-15T00:00:00.000Z",
    "baselineDate": "2020-01-01T00:00:00.000Z",
    "severity": "NONE",
    "areaAffectedHectares": 0,
    "satelliteSource": "Sentinel-2",
    "lastSatelliteCheck": "2024-11-15T00:00:00.000Z",
    "recommendations": ["Continue annual monitoring"]
  },
  "geolocationEvidence": {
    "hasBoundary": true,
    "boundaryFormat": "GeoJSON Polygon",
    "areaHectares": 2.5,
    "centroid": { "lat": 1.3733, "lng": 32.2903 },
    "pointCount": 5,
    "coordinateSystem": "WGS84",
    "gpsVerificationDate": "2024-10-02T14:20:00.000Z",
    "gpsAccuracyMeters": 2.8,
    "boundaryMatchPercent": 94.5,
    "verificationStatus": "GPS_VERIFIED"
  },
  "documentEvidence": [
    {
      "id": "d1",
      "docType": "SURVEY_REPORT",
      "title": "Land Survey Oct 2024",
      "issuedBy": "Uganda Lands Office",
      "issuedAt": "2024-10-01T00:00:00.000Z",
      "expiresAt": null,
      "isVerified": true,
      "isExpired": false,
      "isRequired": true,
      "fileUrl": "/uploads/docs/survey_oct2024.pdf"
    }
  ],
  "traceabilityEvidence": {
    "hasLinkedBatches": true,
    "totalBatches": 2,
    "totalEvents": 8,
    "earliestEvent": "2024-03-15T00:00:00.000Z",
    "latestEvent": "2024-08-17T11:00:00.000Z",
    "chainComplete": true
  },
  "verificationAudit": [
    {
      "id": "va1",
      "verificationType": "GPS",
      "result": "PASSED",
      "verifiedBy": "user_abc123",
      "verifiedAt": "2024-10-02T14:20:00.000Z",
      "notes": "Boundary matches existing survey"
    }
  ],
  "recommendations": [
    "Upload land title or lease agreement to complete legal documents",
    "Annual deforestation monitoring recommended"
  ]
}
```

#### `POST /api/plots/:id/eudr-evidence` — Submit to EUDR

**Request:**
```json
{ "action": "submit-eudr" }
```

**Response (200):**
```json
{
  "success": true,
  "eudrReference": "EUDR-UG-2024-00042",
  "submittedAt": "2024-12-01T10:05:00.000Z",
  "status": "SUBMITTED"
}
```

#### `POST /api/mobile/sync` — Push Changes

**Request:**
```json
{
  "changes": [
    {
      "_entity": "plots",
      "_op": "update",
      "_clientTimestamp": "2024-12-01T09:30:00.000Z",
      "_deviceId": "dev_abc123",
      "data": {
        "id": "clx7a2b3k0001qx7n8m9o0p1q",
        "boundaryGeoJson": "{...new boundary...}"
      }
    }
  ],
  "deviceInfo": {
    "platform": "android",
    "appVersion": "1.0.0",
    "deviceId": "dev_abc123"
  }
}
```

**Response (200 or 409):**
```json
{
  "applied": 1,
  "conflicts": [],
  "errors": [],
  "serverToken": "eyJ0IjoiMjAyNC0xMi0wMVQxMDowNTowMC4wMDBaIn0"
}
```

---

## 3. Screen 1 — PlotListScreen

### 3.1 Purpose

Primary entry point for field agents. Displays a paginated, searchable, filterable list of all plots assigned to the agent's tenant. Enables quick actions (verify, navigate) via swipe gestures.

### 3.2 Widget Tree

```
Scaffold
├── AppBar
│   ├── title: "Plots" + plot count badge
│   └── actions: [MapToggleIconButton, StatsIconButton]
├── body: Column
│   ├── SearchBar (debounced 300ms)
│   ├── Horizontal FilterChips (scrollable)
│   │   ├── "All" (default selected)
│   │   ├── VerificationStatus chips: Unverified, GPS, Satellite, Audited, Verified
│   │   └── EUDR Risk chips: Low, Medium, High
│   ├── Plot count subtitle: "Showing 20 of 347 plots"
│   └── Expanded: RefreshIndicator
│       └── ListView.builder
│           └── PlotListTile (swipeable)
│               ├── leading: StatusCircleIndicator (color-coded)
│               ├── title: plot.name
│               ├── subtitle: plot.farmerName · plot.plotCode
│               ├── trailing: Row
│               │   ├── RiskLevelBadge
│               │   ├── AreaChip ("2.5 ha")
│               │   └── ChevronRight
│               └── background: SwipeActions
│                   ├── left: NavigateAction (icon: navigation)
│                   └── right: VerifyAction (icon: check_circle)
├── FloatingActionButton.extended
│   ├── icon: add
│   └── label: "New Plot" → (future: create plot flow)
└── BottomNavigationBar (if used)
```

### 3.3 Data Flow

| Source | API | Trigger |
|--------|-----|---------|
| Initial load | `GET /api/plots?page=1&pageSize=20` | Screen mount |
| Search | `GET /api/plots?search=okello` | Debounced search (300ms) |
| Filter | `GET /api/plots?verificationStatus=UNVERIFIED` | Chip tap |
| Pull-to-refresh | `GET /api/plots?page=1&pageSize=20` | Pull gesture |
| Pagination | `GET /api/plots?page=2&pageSize=20` | Scroll near bottom |

**State Provider:**

```dart
@riverpod
class PlotListNotifier extends _$PlotListNotifier {
  @override
  FutureOr<PlotListState> build() {
    return PlotListState.initial();
  }

  Future<void> load({bool refresh = false}) async { ... }
  void setSearch(String query) { ... }
  void setFilter(PlotVerificationStatus? status, PlotRiskLevel? risk) { ... }
  Future<void> loadNextPage() async { ... }
}

class PlotListState {
  final List<PlotSummary> plots;
  final int total;
  final int page;
  final bool isLoading;
  final bool hasMore;
  final String? searchQuery;
  final PlotVerificationStatus? statusFilter;
  final PlotRiskLevel? riskFilter;
}
```

### 3.4 Key Interactions & Navigation

| Interaction | Behavior |
|-------------|----------|
| Tap plot tile | `context.go('/plots/${plot.id}')` → PlotDetailScreen |
| Tap map icon (AppBar) | `context.go('/plots/map')` → PlotMapScreen |
| Tap stats icon (AppBar) | Show bottom sheet with `GET /api/plots/stats` data |
| Swipe right on tile | Reveal "Navigate" action → Opens OS map intent with `geo:lat,lng` |
| Swipe left on tile | Reveal "Verify" action → `context.go('/plots/${plot.id}/verify')` |
| Tap filter chip | Replace current filter, reset to page 1, reload |
| Long-press tile | Show plot quick-info bottom sheet (code, area, status) |
| Tap "New Plot" FAB | Navigate to GPS collection screen (future) |

### 3.5 Offline Behavior

- **Cache hit:** Hive `PlotSummary` box serves the last-fetched page immediately. Shows "Offline" banner.
- **Search offline:** Filter the cached list in-memory by `name`, `plotCode`, `farmerName`.
- **Sync pending:** After connectivity returns, a background sync pushes any pending changes and pulls deltas.
- **Visual indicator:** Yellow banner `"Viewing cached data — 347 plots (last synced 10 min ago)"`.

### 3.6 Mock Data

```dart
final mockPlots = [
  PlotSummary(
    id: '1', plotCode: 'PLT-UG-000042', name: 'Okello Maize Field A',
    farmerName: 'James Okello', areaHectares: 2.5,
    centroidLat: 1.3733, centroidLng: 32.2903,
    verificationStatus: PlotVerificationStatus.gpsVerified,
    eudrRiskLevel: PlotRiskLevel.low, plotType: PlotType.production,
    seasonCount: 3, batchCount: 2, isActive: true,
    createdAt: '2024-09-15T08:30:00.000Z',
  ),
  PlotSummary(
    id: '2', plotCode: 'PLT-UG-000043', name: 'Achieng Coffee Plot',
    farmerName: 'Mary Achieng', areaHectares: 1.8,
    centroidLat: 0.3131, centroidLng: 32.5814,
    verificationStatus: PlotVerificationStatus.unverified,
    eudrRiskLevel: PlotRiskLevel.unknown, plotType: PlotType.production,
    seasonCount: 1, batchCount: 0, isActive: true,
    createdAt: '2024-10-20T11:00:00.000Z',
  ),
  PlotSummary(
    id: '3', plotCode: 'PLT-GH-000018', name: 'Kofi Cocoa Block B',
    farmerName: 'Kofi Mensah', areaHectares: 4.2,
    centroidLat: 6.6833, centroidLng: -1.6333,
    verificationStatus: PlotVerificationStatus.verified,
    eudrRiskLevel: PlotRiskLevel.low, plotType: PlotType.production,
    seasonCount: 5, batchCount: 3, isActive: true,
    createdAt: '2024-03-10T09:00:00.000Z',
  ),
  PlotSummary(
    id: '4', plotCode: 'PLT-KE-000027', name: 'Wanjiku Tea Estate',
    farmerName: 'Grace Wanjiku', areaHectares: 8.0,
    centroidLat: -0.4167, centroidLng: 36.9500,
    verificationStatus: PlotVerificationStatus.fieldAudited,
    eudrRiskLevel: PlotRiskLevel.medium, plotType: PlotType.production,
    seasonCount: 4, batchCount: 6, isActive: true,
    createdAt: '2024-01-22T07:30:00.000Z',
  ),
];
```

---

## 4. Screen 2 — PlotMapScreen

### 4.1 Purpose

Full-screen map view showing all plot boundaries as colored polygons. Enables spatial awareness, quick plot identification by tapping, and one-tap GPS collection from the field.

### 4.2 Widget Tree

```
Scaffold (extendBodyBehindAppBar: true)
├── SliverAppBar (transparent, floating)
│   ├── leading: BackButton
│   ├── title: "Plot Map"
│   └── actions: [FilterIconButton, LegendIconButton, LayerToggleIconButton]
├── body: Stack
│   ├── FlutterMap (or MapLibreGL)
│   │   ├── TileLayer (OpenStreetMap)
│   │   ├── PolygonLayer
│   │   │   └── Polygon (per plot)
│   │   │       ├── points: [LatLng...]
│   │   │       ├── color: _statusColor(plot.verificationStatus)
│   │   │       ├── borderColor: _riskBorderColor(plot.eudrRiskLevel)
│   │   │       ├── strokeWidth: 2.0
│   │   │       └── onTap: _showPlotPopup
│   │   ├── MarkerLayer (for plots without polygons → centroid markers)
│   │   └── CurrentLocationLayer (blue dot)
│   ├── MapBottomSheet (draggable)
│   │   └── PlotMapPopup (appears on polygon tap)
│   │       ├── plot.name, plot.farmerName, plot.plotCode
│   │       ├── StatusBadge, RiskBadge, AreaChip
│   │       ├── "View Details" button → PlotDetailScreen
│   │       └── "Start Verification" button → VerificationScreen
│   ├── FilterPanel (slide-in from right)
│   │   ├── VerificationStatus filter
│   │   └── EUDR Risk Level filter
│   └── LegendPanel (bottom-left overlay)
│       ├── Unverified: gray
│       ├── GPS Verified: blue
│       ├── Satellite Verified: green
│       ├── Field Audited: orange
│       └── Verified: dark green
└── FloatingActionButton (Collect GPS)
    ├── icon: gps_fixed
    └── onPressed → GpsCollectionScreen
```

### 4.3 Data Flow

| Source | API | Trigger |
|--------|-----|---------|
| Plot boundaries | `GET /api/plots/geojson` | Screen mount |
| Filtered boundaries | `GET /api/plots/geojson?verificationStatus=UNVERIFIED` | Filter change |
| Current location | `geolocator.getCurrentPosition()` | Screen mount + continuous |

**State Provider:**

```dart
@riverpod
class PlotMapNotifier extends _$PlotMapNotifier {
  @override
  FutureOr<PlotMapState> build() {
    return PlotMapState.initial();
  }

  Future<void> loadBoundaries({PlotVerificationStatus? status, PlotRiskLevel? risk}) async { ... }
}

class PlotMapState {
  final Map<String, PlotGeoJsonFeature> features;  // id → feature
  final bool isLoading;
  final PlotVerificationStatus? statusFilter;
  final PlotRiskLevel? riskFilter;
  final LatLngBounds? viewBounds;
}
```

### 4.4 Key Interactions & Navigation

| Interaction | Behavior |
|-------------|----------|
| Tap polygon | Show `PlotMapPopup` bottom sheet with plot summary |
| Tap "View Details" in popup | `context.go('/plots/${plot.id}')` → PlotDetailScreen |
| Tap "Start Verification" in popup | `context.go('/plots/${plot.id}/verify')` → VerificationScreen |
| Tap "Collect GPS" FAB | `context.go('/plots/gps-collect')` → GpsCollectionScreen |
| Long-press map | Drop a pin, show coordinates (debug/surveyor aid) |
| Tap filter icon | Slide in `FilterPanel` from right |
| Pinch/zoom | Native map zoom; polygons re-render with `viewportDetector` for performance |
| Tap current location button | `mapController.move(currentLatLng, 16.0)` |
| Tap layer toggle | Switch between OSM and satellite tile layer (if available) |

### 4.5 Performance Notes

- **Large feature sets:** For tenants with 1000+ plots, use `viewportDetector` to only render visible polygons. GeoJSON is stored locally in a Hive box keyed by plot ID.
- **Tile caching:** `CachedNetworkTileProvider` wraps the OSM tile layer for offline map tiles.
- **Polygon simplification:** Apply Douglas-Peucker simplification (tolerance ~0.00001°) for zoom levels < 14 to reduce vertex count.

### 4.6 Offline Behavior

- **Cached tiles:** Map tiles cached on disk via `cached_network_image` pattern; limited to ~50MB.
- **Cached boundaries:** Last GeoJSON `FeatureCollection` stored in Hive; rendered immediately.
- **GPS collection:** Works fully offline (uses device GPS only).
- **Popup actions:** "View Details" works if plot detail is cached; "Start Verification" works offline with pending upload.

### 4.7 Mock Data

```dart
final mockGeoJson = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [[32.291, 1.374], [32.292, 1.374], [32.292, 1.373], [32.291, 1.373], [32.291, 1.374]]
        ]
      },
      "properties": {
        "id": "1",
        "plotCode": "PLT-UG-000042",
        "name": "Okello Maize Field A",
        "farmerName": "James Okello",
        "verificationStatus": "GPS_VERIFIED",
        "eudrRiskLevel": "LOW",
        "areaHectares": 2.5
      }
    }
  ]
};
```

---

## 5. Screen 3 — PlotDetailScreen

### 5.1 Purpose

Comprehensive view of a single plot. Serves as the hub for all plot-related actions: viewing seasons, documents, traceability chain, and navigating to verification/EUDR screens.

### 5.2 Widget Tree

```
Scaffold
├── SliverAppBar (pinned, expandedHeight: 200)
│   └── FlexibleSpaceBar
│       ├── background: MiniMap (non-interactive, shows boundary)
│       └── title: plot.name
├── body: CustomScrollView (slivers)
│   ├── StatusStepperSliver
│   │   └── Horizontal Stepper (5 steps)
│   │       ├── [✓] Unverified → [✓] GPS → [ ] Satellite → [ ] Field Audit → [ ] Verified
│   │       └── Current step highlighted, completed steps with checkmarks
│   ├── MetricsCardsSliver (horizontal scroll)
│   │   ├── MetricCard("Area", "2.5 ha", icon: crop_square)
│   │   ├── MetricCard("Elevation", "1,108 m", icon: terrain)
│   │   ├── MetricCard("Slope", "3.2%", icon: landscape)
│   │   ├── MetricCard("Soil", "Sandy Loam", icon: layers)
│   │   └── MetricCard("Seasons", "3", icon: calendar_today)
│   ├── InfoSectionSliver ("Plot Information")
│   │   ├── InfoRow("Plot Code", plot.plotCode)
│   │   ├── InfoRow("Farmer", plot.farmerName)
│   │   ├── InfoRow("Irrigation", plot.irrigationType)
│   │   ├── InfoRow("Land Ownership", plot.landOwnership)
│   │   └── InfoRow("Tags", TagChips)
│   ├── SeasonsSectionSliver ("Seasons")
│   │   └── ListView.builder (season cards)
│   │       └── SeasonCard
│   │           ├── season, cropType, variety
│   │           ├── StatusBadge (PLANTED, HARVESTED, etc.)
│   │           ├── yieldKg, qualityGrade, areaPlantedHectares
│   │           └── EudrCompliantIndicator (check/x icon)
│   ├── TraceabilitySectionSliver ("Traceability Chain")
│   │   └── TimelineView
│   │       ├── PlotNode → SeasonNode → BatchNode → EventNodes
│   │       └── Each node shows: type, date, actor, location
│   ├── DocumentsSectionSliver ("Documents")
│   │   └── ListView.builder (document cards)
│   │       └── DocumentCard
│   │           ├── docType icon + title
│   │           ├── issuedBy, issuedAt
│   │           ├── VerifiedBadge / ExpiredBadge
│   │           └── Tap → Open file URL (or cached local file)
│   └── VerificationHistorySliver ("Verification History")
│       └── ListView.builder (verification cards)
│           └── VerificationCard
│               ├── verificationType badge + result badge
│               ├── date, verifiedBy
│               ├── boundaryMatchPercent, accuracyMeters
│               └── notes
└── BottomActionRow (sticky above BottomNav)
    ├── "Verify Plot" OutlinedButton → VerificationScreen
    ├── "EUDR Evidence" FilledButton → EudrEvidenceScreen
    └── "Navigate" IconButton → OS map intent
```

### 5.3 Data Flow

| Source | API | Trigger |
|--------|-----|---------|
| Plot detail | `GET /api/plots/:id` | Screen mount |
| Traceability chain | `GET /api/plots/:id/traceability` | Scroll into view (lazy) |
| Pull-to-refresh | Re-fetch plot detail | Pull gesture |

**State Provider:**

```dart
@riverpod
Future<PlotDetail> plotDetail(Ref ref, String plotId) async {
  final repo = ref.read(plotRepositoryProvider);
  return repo.getPlotDetail(plotId);
}

@riverpod
Future<PlotTraceabilityChain> traceabilityChain(Ref ref, String plotId) async {
  final repo = ref.read(plotRepositoryProvider);
  return repo.getTraceabilityChain(plotId);
}
```

### 5.4 Key Interactions & Navigation

| Interaction | Behavior |
|-------------|----------|
| Tap mini map | Expand to full `PlotMapScreen` centered on this plot |
| Tap season card | Expand with harvest details, input usage |
| Tap document card | Open file in system viewer, or download to local cache |
| Tap "Verify Plot" button | `context.go('/plots/$plotId/verify')` |
| Tap "EUDR Evidence" button | `context.go('/plots/$plotId/eudr')` |
| Tap "Navigate" button | `launchUrl(Uri.parse('geo:$lat,$lng'))` |
| Tap traceability event node | Show event detail bottom sheet |
| Pull-to-refresh | Invalidate both `plotDetailProvider` and `traceabilityChainProvider` |

### 5.5 Offline Behavior

- Full `PlotDetail` cached in Hive. Served immediately from cache; network fetch updates in background.
- Traceability chain fetched lazily; if offline, shows "Traceability data not available offline — connect to sync" placeholder.
- Documents: If `fileUrl` was previously downloaded, open from local cache. Otherwise show "Download required" with a download button that queues the request.
- Verification history: Served from cached `recentVerifications` in the plot detail.

### 5.6 Mock Data

See Section 2.3 — `GET /api/plots/:id` response and `GET /api/plots/:id/traceability` response.

---

## 6. Screen 4 — GpsCollectionScreen

### 6.1 Purpose

Full-screen GPS walk-around boundary collection. Field agents walk the perimeter of a plot, dropping GPS points at each corner. Provides real-time accuracy feedback and visual polygon construction.

### 6.2 Widget Tree

```
Scaffold (extendBodyBehindAppBar: true, fullscreenDialog: true)
├── AppBar (transparent, floating)
│   ├── leading: CloseButton (with "Discard?" confirmation dialog)
│   └── title: "Collect GPS Boundary"
├── body: Stack
│   ├── FlutterMap (locked to follow GPS)
│   │   ├── TileLayer (OSM)
│   │   ├── PolylineLayer (collected points connected)
│   │   ├── PolygonLayer (filled polygon if ≥ 3 points, closing line dashed)
│   │   ├── MarkerLayer
│   │   │   ├── PointMarkers (numbered: ①②③...)
│   │   │   └── CurrentLocationMarker (pulsing blue dot)
│   │   └── CircleLayer (accuracy circle around current position)
│   ├── GpsInfoPanel (top-left overlay, semi-transparent)
│   │   ├── AccuracyRow: icon + "Accuracy: 2.8 m" (color-coded: green <5, yellow <10, red ≥10)
│   │   ├── PointCountRow: "Points: 5" (minimum 3 required)
│   │   ├── AreaRow: "Est. Area: 2.5 ha" (live-calculated)
│   │   └── SatelliteCountRow: "Satellites: 12" (from geolocator)
│   ├── UndoButton (top-right, only visible when points > 0)
│   │   └── icon: undo, tooltip: "Undo last point"
│   └── ClosePolygonButton (bottom center, appears when ≥ 3 points)
│       └── icon: check_polygon + "Close & Save"
├── BottomSheet (when confirming save)
│   ├── PlotNameFormField
│   ├── FarmerSearchField (optional, links to farmer)
│   ├── SummaryCard (point count, estimated area, avg accuracy)
│   └── SaveButton / CancelButton
└── SnackBar (success/error feedback after save)
```

### 6.3 Data Flow

| Source | API / Source | Trigger |
|--------|-------------|---------|
| GPS position | `geolocator.getPositionStream(locationSettings)` | Continuous stream |
| Accuracy | `Position.accuracy` from geolocator | Each position update |
| Satellite count | `geolocator.getCurrentPosition().then(Geolocator.isLocationServiceEnabled)` | On mount |
| Area calculation | Shoelace formula on collected points | Each point added |
| Save boundary | `POST /api/plots` with `boundaryGeoJson` | "Save" button |
| Update existing | `PUT /api/plots/:id` with `boundaryGeoJson` | If editing existing plot |

**State Provider:**

```dart
@riverpod
class GpsCollectionNotifier extends _$GpsCollectionNotifier {
  @override
  GpsCollectionState build() {
    return GpsCollectionState.initial();
  }

  void startListening() { ... }   // Subscribe to geolocator stream
  void addPoint(LatLng point) { ... }
  void undoLastPoint() { ... }
  void clearPoints() { ... }
  Future<void> save({String? plotId, String? name, String? farmerId}) async { ... }
}

class GpsCollectionState {
  final List<LatLong> points;
  final double? currentAccuracy;
  final int? satelliteCount;
  final bool isListening;
  final bool isSaving;
  final double? estimatedAreaHectares;
  final String? error;
  final String? plotId;  // null = new plot, non-null = editing existing
}
```

### 6.4 Key Interactions & Navigation

| Interaction | Behavior |
|-------------|----------|
| Tap "Add Point" button (or tap map) | Drop a GPS point at current location, increment counter |
| Tap "Undo" | Remove last point, update polygon |
| Tap "Close & Save" (≥ 3 points) | Show save confirmation bottom sheet |
| Tap "Save" in sheet | POST/PUT boundary GeoJSON; pop to PlotDetailScreen or PlotListScreen |
| Tap "Cancel" in sheet | Dismiss sheet, return to collection |
| Tap back/close | Show `AlertDialog("Discard collected points?")` with Discard/Keep |
| Accuracy drops below 10m | Show yellow warning banner `"GPS accuracy is low (${accuracy}m). Try moving to an open area."` |
| Accuracy drops below 25m | Show red banner, disable "Add Point" button |
| Device rotation | Map re-orients; no action needed (flutter_map handles it) |

### 6.5 GPS Settings

```dart
const locationSettings = LocationSettings(
  accuracy: LocationAccuracy.high,      // ~3-5m on Android
  distanceFilter: 2,                    // Minimum 2m movement before update
  timeLimit: Duration(seconds: 30),     // Timeout for position requests
);
```

### 6.6 GeoJSON Construction

When saving, collected `LatLng` points are wrapped into a GeoJSON Feature:

```dart
String buildBoundaryGeoJson(List<LatLng> points) {
  final ring = [...points.map((p) => [p.longitude, p.latitude]), [points.first.longitude, points.first.latitude]];
  return jsonEncode({
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [ring],
    },
    "properties": {
      "collectedAt": DateTime.now().toUtc().toIso8601String(),
      "pointCount": points.length,
      "source": "field_gps",
    }
  });
}
```

### 6.7 Offline Behavior

- **Fully offline:** GPS collection uses device hardware only. No network required.
- **Save queue:** `POST /api/plots` with boundary is queued in local pending-actions box. Uploaded on next sync.
- **Map tiles:** Cached OSM tiles serve the base map. If no cache, a blank map with just the polygon overlay still works.

### 6.8 Mock Data

```dart
final mockCollectedPoints = [
  LatLng(1.3740, 32.2910),
  LatLng(1.3740, 32.2920),
  LatLng(1.3730, 32.2920),
  LatLng(1.3730, 32.2910),
  LatLng(1.3735, 32.2915),  // Extra point for irregular shape
];
// Estimated area: ~2.5 ha
// Average accuracy: 3.2m
```

---

## 7. Screen 5 — VerificationScreen

### 7.1 Purpose

Pre-filled verification form for field agents to submit plot verifications. Auto-detects GPS accuracy, allows boundary comparison, deforestation visual check, photo evidence, and notes.

### 7.2 Widget Tree

```
Scaffold
├── AppBar
│   ├── leading: BackButton
│   └── title: "Verify Plot — ${plot.plotCode}"
├── body: Form (with GlobalKey<FormState>)
│   └── SingleChildScrollView
│       ├── PlotHeaderCard
│       │   ├── plot.name, plot.farmerName
│       │   ├── plot.plotCode, plot.areaHectares + "ha"
│       │   └── CurrentStatusBadge
│       ├── VerificationTypeSelector
│       │   ├── ChoiceChip("GPS")       (default, recommended for field agents)
│       │   ├── ChoiceChip("Satellite")
│       │   ├── ChoiceChip("Drone")
│       │   └── ChoiceChip("Field Audit")
│       ├── GpsAccuracyCard (auto-populated, read-only)
│       │   ├── "Current GPS Accuracy"
│       │   ├── Large accuracy display: "2.8 m" (with color indicator)
│       │   ├── Progress bar (green if <5m, yellow <10m, red ≥10m)
│       │   └── "Satellites: 12" subtext
│       ├── BoundaryMatchCard
│       │   ├── "Boundary Match %"
│       │   ├── Slider (0-100, default 100 for new GPS collection)
│       │   ├── Preview button: Show overlay of new vs existing boundary on mini map
│       │   └── Auto-calculated hint: "If you just collected GPS, this should be ~95%+"
│       ├── DeforestationCheckSection
│       │   ├── SectionTitle: "Deforestation Check"
│       │   ├── RadioGroup
│       │   │   ├── "✅ CLEAR — No deforestation observed" (default)
│       │   │   ├── "⚠️ SUSPECTED — Possible clearing detected"
│       │   │   └── "🔴 CONFIRMED — Deforestation observed"
│       │   └── HelperText: "Compare current vegetation to satellite baseline"
│       ├── ResultSelector
│       │   ├── RadioGroup
│       │   │   ├── "PASSED" (green)
│       │   │   ├── "FAILED" (red)
│       │   │   └── "NEEDS_REVIEW" (orange)
│       │   └── Validation: At least one of boundary/deforestation must be filled
│       ├── PhotoEvidenceSection
│       │   ├── "Evidence Photos" title
│       │   ├── GridView (max 3 photos)
│       │   │   ├── PhotoThumbnail (with delete button)
│       │   │   └── AddPhotoButton (camera icon)
│       │   └── Source: `image_picker` (camera) or `file_picker` (gallery)
│       ├── NotesField
│       │   └── TextFormField (multiline, max 500 chars, counter)
│       └── SubmitButton (full-width, elevated)
│           ├── label: "Submit Verification"
│           └── disabled until form valid + GPS accuracy < 15m
└── LoadingOverlay (during submission)
```

### 7.3 Data Flow

| Source | API / Source | Trigger |
|--------|-------------|---------|
| Plot detail (pre-fill) | `GET /api/plots/:id` | Screen mount |
| GPS accuracy | `geolocator.getCurrentPosition()` | Screen mount + periodic |
| Submit verification | `POST /api/plots/:id/verify` | Submit button |
| Photo upload | `POST /api/attachments` (multipart) | Photo added (optional) |

**State Provider:**

```dart
@riverpod
class VerificationFormNotifier extends _$VerificationFormNotifier {
  @override
  VerificationFormState build(String plotId) {
    return VerificationFormState.initial();
  }

  void setVerificationType(VerificationType type) { ... }
  void setResult(VerificationResult result) { ... }
  void setBoundaryMatch(double percent) { ... }
  void setDeforestCheck(String? result) { ... }
  void addPhoto(File photo) { ... }
  void removePhoto(int index) { ... }
  void setNotes(String notes) { ... }
  Future<void> submit() async { ... }
}

class VerificationFormState {
  final VerificationType verificationType;
  final VerificationResult result;
  final double? gpsAccuracy;
  final double boundaryMatchPercent;
  final String? deforestCheckResult;
  final List<File> photos;
  final String notes;
  final bool isSubmitting;
  final String? error;
}
```

### 7.4 Key Interactions & Navigation

| Interaction | Behavior |
|-------------|----------|
| Tap verification type chip | Select type; GPS is pre-selected and recommended |
| Watch accuracy display | Updates every 2 seconds from GPS stream |
| Drag boundary match slider | Set match percentage; show preview overlay if < 80% |
| Tap deforestation radio | Select CLEAR/SUSPECTED/CONFIRMED; auto-sets risk hint |
| Tap result radio | Select PASSED/FAILED/NEEDS_REVIEW |
| Tap photo add button | Open camera via `image_picker`; max 3 photos |
| Tap photo thumbnail | Full-screen photo viewer |
| Tap delete on photo | Remove from list |
| Tap "Submit Verification" | Validate form → show loading → POST to API → show success snackbar → pop back to PlotDetailScreen |
| Form invalid on submit | Show validation errors inline (red text, shake animation) |
| GPS accuracy > 15m on submit | Block submission, show snackbar "GPS accuracy too low (${accuracy}m). Move to open area and retry." |

### 7.5 Request Body Construction

```dart
Map<String, dynamic> buildVerifyRequest(VerificationFormState state, List<String>? photoUrls) {
  return {
    "verificationType": state.verificationType.name.toUpperCase(),  // "GPS"
    "result": state.result.name.toUpperCase(),                      // "PASSED"
    "boundaryMatchPercent": state.boundaryMatchPercent,
    "accuracyMeters": state.gpsAccuracy,
    "deforestCheckResult": state.deforestCheckResult,               // "CLEAR"
    "notes": state.notes,
    "evidence": photoUrls?.isNotEmpty == true
        ? jsonEncode({"photos": photoUrls})
        : null,
  };
}
```

### 7.6 Offline Behavior

- **Pre-fill from cache:** Plot detail loaded from Hive. Form is fully functional offline.
- **Photo capture:** Works offline; photos stored in app temp directory.
- **Pending submission:** Form data + photo files queued in local pending-actions box. On next sync, photos are uploaded first (via multipart), then the verification POST is sent with the resulting URLs.
- **UI indicator:** "Offline — verification will be submitted when connected" banner.

### 7.7 Mock Data

```dart
final mockVerificationForm = VerificationFormState(
  verificationType: VerificationType.gps,
  result: VerificationResult.passed,
  gpsAccuracy: 2.8,
  boundaryMatchPercent: 94.5,
  deforestCheckResult: 'CLEAR',
  photos: [],
  notes: 'Boundary matches existing survey. No visible deforestation. Good crop health observed.',
  isSubmitting: false,
  error: null,
);
```

---

## 8. Screen 6 — EudrEvidenceScreen

### 8.1 Purpose

Evidence pack viewer for EUDR due diligence. Shows completeness progress, categorized evidence items, risk assessment breakdown, and a submit-to-EUDR button. Used by compliance officers and field agents.

### 8.2 Widget Tree

```
Scaffold
├── AppBar
│   ├── leading: BackButton
│   ├── title: "EUDR Evidence — ${plot.plotCode}"
│   └── actions: [ShareIconButton, RefreshIconButton]
├── body: CustomScrollView (slivers)
│   ├── CompletenessHeaderSliver
│   │   ├── CircularProgressIndicator (72%)
│   │   ├── StatusText: "72% Complete — PARTIAL"
│   │   ├── EudrReferenceBadge: "EUDR-UG-2024-00042" (or "Not yet submitted")
│   │   └── GeneratedAtText: "Generated Dec 1, 2024"
│   ├── RiskSummaryCard (if riskAssessment != null)
│   │   ├── OverallRiskBadge: "LOW RISK (28/100)"
│   │   ├── RiskFactorBars (horizontal stacked bar chart)
│   │   │   ├── Forest Proximity:   ████████░░ 15/100  (green)
│   │   │   ├── Historical Deforest: ██░░░░░░░░  5/100  (green)
│   │   │   ├── Country Risk:       █████████░ 45/100  (yellow)
│   │   │   ├── Plot Size:          █░░░░░░░░░ 10/100  (green)
│   │   │   └── Documentation:      ███████░░░ 65/100  (yellow)
│   │   └── DeforestationStatusCard
│   │       ├── "Deforestation-Free: ✅ Yes"
│   │       ├── "Confidence: 92%"
│   │       ├── "NDVI: 0.72 (baseline: 0.69, change: +0.03)"
│   │       └── "Severity: NONE"
│   ├── EvidenceAccordionsSliver
│   │   └── ExpansionTile (per evidence category)
│   │       ├── Geolocation Evidence (GEOLOCATION)
│   │       │   ├── StatusIcon + "3/3 items — PRESENT"
│   │       │   └── children: EvidenceItemTiles
│   │       │       ├── ✓ GPS Boundary Polygon — VALID — 5 pts, 2.5 ha
│   │       │       ├── ✓ GPS Accuracy Record — VALID — ±2.8m
│   │       │       └── ✓ Boundary Verification — VALID — 94.5% match
│   │       ├── Deforestation Evidence (DEFORESTATION)
│   │       │   ├── StatusIcon + "2/3 items — PARTIAL"
│   │       │   └── children: EvidenceItemTiles
│   │       │       ├── ✓ NDVI Current — VALID — 0.72
│   │       │       ├── ✓ Baseline Comparison — VALID — +0.03
│   │       │       └── ✗ High-Res Satellite Image — MISSING
│   │       ├── Risk Assessment (RISK_ASSESSMENT)
│   │       │   ├── StatusIcon + "1/1 items — PRESENT"
│   │       │   └── children: EvidenceItemTiles
│   │       │       └── ✓ 5-Factor Risk Score — VALID — Score: 28/100
│   │       ├── Legal Documents (LEGAL_DOCUMENTS)
│   │       │   ├── StatusIcon + "1/2 items — PARTIAL"
│   │       │   └── children: EvidenceItemTiles
│   │       │       ├── ✓ Survey Report — VALID — Uganda Lands Office
│   │       │       └── ✗ Land Title — MISSING
│   │       ├── Traceability (TRACEABILITY)
│   │       │   ├── StatusIcon + "1/1 items — PRESENT"
│   │       │   └── children: EvidenceItemTiles
│   │       │       └── ✓ Season-Batch Chain — VALID — 3 seasons, 2 batches
│   │       └── Verification Audit (VERIFICATION)
│   │           ├── StatusIcon + "2/1 items — PRESENT"
│   │           └── children: EvidenceItemTiles
│   │               ├── ✓ GPS Field Verification — VALID — PASSED
│   │               └── ✓ Satellite Verification — VALID — PASSED
│   ├── RecommendationsSliver
│   │   └── ListView (recommendation cards with warning/info icons)
│   │       ├── "⚠ Upload land title or lease agreement to complete legal documents"
│   │       └── "ℹ Annual deforestation monitoring recommended"
│   └── SubmitSectionSliver
│       ├── SummaryText: "This evidence pack is 72% complete. Missing: Land Title, High-Res Satellite Image."
│       ├── SubmitEudrButton
│       │   ├── label: "Submit to EUDR"
│       │   ├── enabled only if completenessScore >= 80 && overallStatus != 'NON_COMPLIANT'
│       │   └── onPressed → POST /api/plots/:id/eudr-evidence { action: 'submit-eudr' }
│       └── DisabledHelperText (if < 80%): "Complete missing evidence items before submitting"
└── BottomNavigationBar (optional: "Back to Plot" button)
```

### 8.3 Data Flow

| Source | API | Trigger |
|--------|-----|---------|
| Evidence pack | `GET /api/plots/:id/eudr-evidence` | Screen mount |
| Refresh | Same API | Pull-to-refresh or refresh icon |
| Submit to EUDR | `POST /api/plots/:id/eudr-evidence { action: 'submit-eudr' }` | Submit button |
| Plot stats (header context) | `GET /api/plots/stats` | Already loaded in list screen |

**State Provider:**

```dart
@riverpod
Future<EvidencePack> evidencePack(Ref ref, String plotId) async {
  final repo = ref.read(plotRepositoryProvider);
  return repo.getEvidencePack(plotId);
}

@riverpod
class EudrSubmitNotifier extends _$EudrSubmitNotifier {
  @override
  EudrSubmitState build() => EudrSubmitState.initial();

  Future<void> submit(String plotId) async { ... }
}

class EudrSubmitState {
  final bool isSubmitting;
  final bool isSubmitted;
  final String? eudrReference;
  final String? error;
}
```

### 8.4 Key Interactions & Navigation

| Interaction | Behavior |
|-------------|----------|
| Tap accordion header | Expand/collapse category items |
| Tap evidence item | Show detail bottom sheet (full details, date, description) |
| Tap "Submit to EUDR" | Show confirmation dialog → POST → success snackbar with EUDR reference → update button to "Submitted ✓" |
| Tap share icon | Share evidence pack summary as text (or generate PDF in future) |
| Pull-to-refresh | Re-fetch evidence pack from API |
| Tap missing item (status: MISSING) | Navigate to appropriate action screen (e.g., upload document → PlotDetailScreen documents section) |

### 8.5 Completeness Threshold Rules

| Score | Status | Can Submit? |
|-------|--------|-------------|
| 90-100 | COMPLETE | ✅ Yes |
| 70-89 | PARTIAL | ✅ Yes (with warning) |
| 40-69 | INCOMPLETE | ❌ No — show "Complete missing items" |
| 0-39 | NON_COMPLIANT | ❌ No — show "Critical evidence missing" |

### 8.6 Risk Factor Color Mapping

```dart
Color riskColor(int score) {
  if (score <= 25) return Colors.green;      // Low risk
  if (score <= 50) return Colors.amber;      // Medium risk
  if (score <= 75) return Colors.orange;     // High risk
  return Colors.red;                          // Critical risk
}
```

### 8.7 Offline Behavior

- **Cached pack:** Last evidence pack stored in Hive; displayed immediately with a "Cached data" banner.
- **Submit blocked offline:** The submit button is disabled when offline. Show snackbar "Connect to the internet to submit to EUDR."
- **Risk bars:** Rendered from cached data; no network required.
- **Recommendations:** Shown from cached pack.

### 8.8 Mock Data

See Section 2.3 — `GET /api/plots/:id/eudr-evidence` response (full example).

---

## 9. Navigation & Routing

### 9.1 GoRouter Configuration

```dart
final goRouter = GoRouter(
  initialLocation: '/plots',
  routes: [
    GoRoute(
      path: '/plots',
      builder: (context, state) => const PlotListScreen(),
    ),
    GoRoute(
      path: '/plots/map',
      builder: (context, state) => const PlotMapScreen(),
    ),
    GoRoute(
      path: '/plots/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return PlotDetailScreen(plotId: id);
      },
    ),
    GoRoute(
      path: '/plots/:id/verify',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return VerificationScreen(plotId: id);
      },
    ),
    GoRoute(
      path: '/plots/:id/eudr',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return EudrEvidenceScreen(plotId: id);
      },
    ),
    GoRoute(
      path: '/plots/gps-collect',
      builder: (context, state) {
        final plotId = state.uri.queryParameters['plotId'];  // optional: editing existing
        return GpsCollectionScreen(existingPlotId: plotId);
      },
    ),
  ],
);
```

### 9.2 Deep Link Support

| Deep Link | Target Screen |
|-----------|---------------|
| `agrobase://plots` | PlotListScreen |
| `agrobase://plots/:id` | PlotDetailScreen |
| `agrobase://plots/:id/verify` | VerificationScreen |
| `agrobase://plots/:id/eudr` | EudrEvidenceScreen |

### 9.3 Navigation Flow Diagram

```
PlotListScreen ──────────┬──→ PlotDetailScreen ──┬──→ VerificationScreen
                        │                       ├──→ EudrEvidenceScreen
                        │                       └──→ PlotMapScreen (centered)
                        ├──→ PlotMapScreen ──────┬──→ PlotDetailScreen (tap popup)
                        │                       ├──→ VerificationScreen (tap popup)
                        │                       └──→ GpsCollectionScreen (FAB)
                        └──→ GpsCollectionScreen ─→ PlotDetailScreen (after save)
```

---

## 10. Offline Strategy

### 10.1 Architecture

```
┌────────────────────────────────────────────┐
│                 Flutter App                  │
│                                              │
│  ┌──────────┐   ┌─────────────────────────┐ │
│  │  Hive DB  │   │  Pending Actions Queue  │ │
│  │           │   │  (Isar for queries)     │ │
│  │ • plots   │   │                         │ │
│  │ • details │   │  • verify_actions       │ │
│  │ • geojson │   │  • boundary_saves       │ │
│  │ • evidence│   │  • photo_uploads        │ │
│  └────┬──────┘   └──────────┬──────────────┘ │
│       │                      │                │
│       │    ┌─────────────────┘                │
│       │    │                                  │
│  ┌────▼────▼──────────────────────────────┐  │
│  │         Sync Orchestrator               │  │
│  │  • ConnectivityListener (connectivity+) │  │
│  │  • Background sync every 5 min          │  │
│  │  • Immediate sync on connectivity gain  │  │
│  └────────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### 10.2 Hive Box Schema

| Box Name | Type | Key | TTL |
|----------|------|-----|-----|
| `plot_summaries` | `PlotSummary` | `plot.id` | 7 days |
| `plot_details` | `PlotDetail` | `plot.id` | 7 days |
| `geojson_features` | `String` (raw JSON) | `plot.id` | 7 days |
| `evidence_packs` | `String` (raw JSON) | `plot.id` | 7 days |
| `pending_actions` | `PendingAction` | auto-increment ID | Until synced |
| `sync_meta` | `String` | `"lastSyncToken"` | Forever |
| `cached_photos` | `File` path | `actionId` | Until uploaded |

### 10.3 Pending Action Model

```dart
@HiveType(typeId: 10)
class PendingAction {
  @HiveField(0) final String id;
  @HiveField(1) final String entity;       // "plots", "verifications", "documents"
  @HiveField(2) final String operation;     // "create", "update", "verify"
  @HiveField(3) final String entityId;      // Plot ID
  @HiveField(4) final Map<String, dynamic> data;
  @HiveField(5) final List<String> filePaths;  // Local photo paths to upload first
  @HiveField(6) final String clientTimestamp;
  @HiveField(7) final int retryCount;
  @HiveField(8) final String? lastError;
}
```

### 10.4 Sync Flow

1. **On connectivity gain:** `SyncOrchestrator` checks `pending_actions` box.
2. **Photo upload first:** For each action with `filePaths`, upload via multipart to `POST /api/attachments`.
3. **Action submission:** Replace `filePaths` with returned URLs in `data`, then POST/PUT to the appropriate API.
4. **Handle response:** On success, remove from `pending_actions`. On conflict (409), store conflict for user review.
5. **Pull sync:** After push, call `GET /api/mobile/sync?token=$lastToken` to get server changes.
6. **Merge:** Update Hive boxes with any changed plots from the server.

### 10.5 Screen-Specific Offline Matrix

| Screen | Read Offline? | Write Offline? | Sync Strategy |
|--------|:---:|:---:|---|
| PlotListScreen | ✅ (cached list) | N/A | Background pull |
| PlotMapScreen | ✅ (cached GeoJSON) | N/A | Background pull |
| PlotDetailScreen | ✅ (cached detail) | N/A | Background pull |
| GpsCollectionScreen | ✅ (GPS only) | ✅ (queue POST) | Push on connect |
| VerificationScreen | ✅ (cached plot) | ✅ (queue POST) | Push on connect |
| EudrEvidenceScreen | ✅ (cached pack) | ❌ (requires network) | Pull on connect |

---

## 11. Tech Stack & Package Matrix

### 11.1 Core Dependencies

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| **State** | `flutter_riverpod` | ^2.5.0 | State management (Riverpod 2.0) |
| **State** | `riverpod_annotation` | ^2.3.0 | Code-gen providers |
| **Navigation** | `go_router` | ^14.0.0 | Declarative routing + deep links |
| **HTTP** | `dio` | ^5.4.0 | HTTP client with interceptors |
| **Map** | `flutter_map` | ^7.0.0 | Map rendering (OpenStreetMap tiles) |
| **Map** | `latlong2` | ^0.9.0 | LatLng calculations |
| **GPS** | `geolocator` | ^12.0.0 | Device location |
| **GPS** | `geolocator_apple` | ^2.3.0 | iOS GPS permissions |
| **GPS** | `geolocator_android` | ^4.6.0 | Android GPS permissions |
| **Offline** | `hive` | ^2.2.3 | Local key-value storage |
| **Offline** | `hive_flutter` | ^1.1.0 | Hive Flutter adapter |
| **Offline** | `connectivity_plus` | ^6.0.0 | Network state detection |
| **UI** | `flutter_slidable` | ^3.0.0 | Swipe actions on list tiles |
| **Camera** | `image_picker` | ^1.1.0 | Photo capture |
| **HTTP Cache** | `cached_network_image` | ^3.3.0 | Tile & image caching |
| **Serialization** | `json_annotation` | ^4.9.0 | JSON code-gen |
| **Serialization** | `freezed_annotation` | ^2.4.0 | Immutable model code-gen |

### 11.2 Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `build_runner` | ^2.4.0 | Code generation runner |
| `json_serializable` | ^6.8.0 | JSON serialization |
| `freezed` | ^2.5.0 | Immutable classes with union types |
| `hive_generator` | ^2.0.1 | Hive type adapters |
| `riverpod_generator` | ^2.4.0 | Riverpod provider code-gen |
| `flutter_test` | SDK | Testing |
| `mockito` | ^5.4.0 | Mocking for unit tests |
| `integration_test` | SDK | Integration testing |

### 11.3 Dio Interceptor Stack

```dart
final dio = Dio(BaseOptions(
  baseUrl: 'https://api.agrobase.io',  // per-tenant subdomain
  connectTimeout: Duration(seconds: 10),
  receiveTimeout: Duration(seconds: 30),
  headers: {
    'Content-Type': 'application/json',
    'X-App-Version': '1.0.0',
    'X-Platform': Platform.isAndroid ? 'android' : 'ios',
  },
))..interceptors.addAll([
  AuthInterceptor(tokenProvider),         // Adds Bearer token
  TenantInterceptor(tenantIdProvider),    // Adds X-Tenant-ID header
  OfflineInterceptor(connectivityProvider), // Returns cached data when offline
  SyncTokenInterceptor(syncTokenProvider),  // Tracks server sync token
  LoggingInterceptor(),                   // Dev-only request/response logging
  ErrorInterceptor(),                     // Converts DioErrors to app errors
]);
```

### 11.4 Recommended Project Structure

```
lib/
├── main.dart
├── app.dart
├── routing/
│   └── app_router.dart
├── models/
│   ├── plot_summary.dart
│   ├── plot_detail.dart
│   ├── plot_season.dart
│   ├── plot_verification.dart
│   ├── plot_document.dart
│   ├── evidence_pack.dart
│   ├── plot_stats.dart
│   └── traceability_chain.dart
├── providers/
│   ├── plot_list_provider.dart
│   ├── plot_detail_provider.dart
│   ├── plot_map_provider.dart
│   ├── gps_collection_provider.dart
│   ├── verification_provider.dart
│   └── eudr_evidence_provider.dart
├── repositories/
│   ├── plot_repository.dart
│   └── sync_repository.dart
├── services/
│   ├── api_client.dart (Dio setup)
│   ├── gps_service.dart
│   ├── offline_sync_service.dart
│   └── photo_upload_service.dart
├── screens/
│   ├── plot_list/
│   │   ├── plot_list_screen.dart
│   │   ├── widgets/plot_list_tile.dart
│   │   └── widgets/filter_chips.dart
│   ├── plot_map/
│   │   ├── plot_map_screen.dart
│   │   └── widgets/plot_popup.dart
│   ├── plot_detail/
│   │   ├── plot_detail_screen.dart
│   │   └── widgets/
│   ├── gps_collection/
│   │   ├── gps_collection_screen.dart
│   │   └── widgets/gps_info_panel.dart
│   ├── verification/
│   │   ├── verification_screen.dart
│   │   └── widgets/
│   └── eudr_evidence/
│       ├── eudr_evidence_screen.dart
│       └── widgets/risk_factor_bar.dart
├── theme/
│   └── app_theme.dart
└── utils/
    ├── geo_utils.dart          // Area calc, centroid, GeoJSON builders
    ├── color_utils.dart         // Status/risk color mapping
    └── formatters.dart          // Date, area, number formatting
```

### 11.5 Color System

```dart
// Verification status colors
const kStatusColors = {
  PlotVerificationStatus.unverified: Color(0xFF9E9E9E),      // Grey
  PlotVerificationStatus.gpsVerified: Color(0xFF2196F3),     // Blue
  PlotVerificationStatus.satelliteVerified: Color(0xFF4CAF50),// Green
  PlotVerificationStatus.fieldAudited: Color(0xFFFF9800),    // Orange
  PlotVerificationStatus.verified: Color(0xFF1B5E20),        // Dark Green
};

// EUDR risk level colors
const kRiskColors = {
  PlotRiskLevel.low: Color(0xFF4CAF50),      // Green
  PlotRiskLevel.medium: Color(0xFFFF9800),   // Orange
  PlotRiskLevel.high: Color(0xFFF44336),     // Red
  PlotRiskLevel.unknown: Color(0xFF9E9E9E),  // Grey
};

// Evidence status colors
const kEvidenceStatusColors = {
  'PRESENT': Color(0xFF4CAF50),
  'PARTIAL': Color(0xFFFF9800),
  'MISSING': Color(0xFFF44336),
  'EXPIRED': Color(0xFF9C27B0),
};
```

### 11.6 Testing Strategy

| Test Type | Target | Tool |
|-----------|--------|------|
| Unit | Providers, Repositories, Utils | `flutter_test` + `mockito` |
| Widget | Individual screen widgets | `flutter_test` + `golden_toolkit` |
| Integration | Full screen flows (list → detail → verify) | `integration_test` |
| E2E | GPS collection + verification + sync | `patrol` or `maestro` |

**Key test scenarios:**
1. PlotListScreen: Load, search, filter, paginate, pull-to-refresh
2. PlotMapScreen: Render boundaries, tap popup, filter
3. GpsCollectionScreen: Mock GPS stream, add/undo points, save
4. VerificationScreen: Form validation, GPS accuracy gate, submit
5. EudrEvidenceScreen: Completeness display, accordion expand, submit gate
6. Offline: Disable network, perform actions, re-enable, verify sync

---

*End of Specification Document*