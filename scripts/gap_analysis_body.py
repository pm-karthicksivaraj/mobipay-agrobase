#!/usr/bin/env python3
"""
Agrobase V3 Platform Gap Analysis — Strategic Architecture Review
Comprehensive audit of business model, revenue, tech stack, features, and ecosystem.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm, mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether,
    CondPageBreak, Image, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.platypus import SimpleDocTemplate
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ─── Font Registration ─────────────────────────────────────────────────────────
FONT_DIR = '/usr/share/fonts'

pdfmetrics.registerFont(TTFont('Inter', f'{FONT_DIR}/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Inter-Bold', f'{FONT_DIR}/truetype/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Inter-Italic', f'{FONT_DIR}/truetype/liberation/LiberationSerif-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Inter-BoldItalic', f'{FONT_DIR}/truetype/liberation/LiberationSerif-BoldItalic.ttf'))
registerFontFamily('Inter', normal='Inter', bold='Inter-Bold', italic='Inter-Italic', boldItalic='Inter-BoldItalic')

pdfmetrics.registerFont(TTFont('Playfair', f'{FONT_DIR}/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Playfair-Bold', f'{FONT_DIR}/truetype/liberation/LiberationSerif-Bold.ttf'))

# ─── Cascade Palette ───────────────────────────────────────────────────────────
PAGE_BG       = colors.HexColor('#f7f7f6')
SECTION_BG    = colors.HexColor('#eae9e8')
CARD_BG       = colors.HexColor('#e9e8e4')
TABLE_STRIPE  = colors.HexColor('#eeedec')
HEADER_FILL   = colors.HexColor('#564d34')
COVER_BLOCK   = colors.HexColor('#6d654d')
BORDER        = colors.HexColor('#c5bca1')
ICON          = colors.HexColor('#8d7d4c')
ACCENT        = colors.HexColor('#8a7128')
ACCENT_2      = colors.HexColor('#4fb1d1')
TEXT_PRIMARY   = colors.HexColor('#191817')
TEXT_MUTED     = colors.HexColor('#87857d')
SEM_SUCCESS   = colors.HexColor('#418557')
SEM_WARNING   = colors.HexColor('#8f7746')
SEM_ERROR     = colors.HexColor('#b05249')
SEM_INFO      = colors.HexColor('#4f7eae')

# ─── Page Dimensions ───────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
MARGIN = 1.0 * inch
CONTENT_W = PAGE_W - 2 * MARGIN

# ─── Styles ────────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

s_h1 = ParagraphStyle('H1', fontName='Inter-Bold', fontSize=26, leading=32,
    spaceBefore=28, spaceAfter=14, textColor=TEXT_PRIMARY)
s_h2 = ParagraphStyle('H2', fontName='Inter-Bold', fontSize=18, leading=24,
    spaceBefore=22, spaceAfter=10, textColor=TEXT_PRIMARY)
s_h3 = ParagraphStyle('H3', fontName='Inter-Bold', fontSize=14, leading=19,
    spaceBefore=16, spaceAfter=8, textColor=HEADER_FILL)
s_body = ParagraphStyle('Body', fontName='Inter', fontSize=11, leading=16,
    spaceBefore=3, spaceAfter=6, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY)
s_body_indent = ParagraphStyle('BodyIndent', parent=s_body, leftIndent=18)
s_bullet = ParagraphStyle('Bullet', parent=s_body, leftIndent=24, bulletIndent=12,
    spaceBefore=2, spaceAfter=2)
s_callout = ParagraphStyle('Callout', fontName='Inter-Italic', fontSize=11.5,
    leading=17, leftIndent=24, rightIndent=18, textColor=ACCENT,
    borderLeftWidth=3, borderLeftColor=ACCENT, borderPadding=8,
    spaceBefore=10, spaceAfter=10)
s_table_header = ParagraphStyle('TH', fontName='Inter-Bold', fontSize=9.5,
    leading=13, textColor=colors.white, alignment=TA_LEFT)
s_table_cell = ParagraphStyle('TC', fontName='Inter', fontSize=9.5,
    leading=13, textColor=TEXT_PRIMARY, wordWrap='CJK')
s_table_cell_sm = ParagraphStyle('TCSm', fontName='Inter', fontSize=8.5,
    leading=12, textColor=TEXT_PRIMARY, wordWrap='CJK')
s_caption = ParagraphStyle('Caption', fontName='Inter-Italic', fontSize=9,
    leading=12, textColor=TEXT_MUTED, spaceBefore=4, spaceAfter=10,
    alignment=TA_CENTER)
s_toc_h1 = ParagraphStyle('TOCH1', fontName='Inter-Bold', fontSize=12,
    leading=20, leftIndent=0, textColor=TEXT_PRIMARY)
s_toc_h2 = ParagraphStyle('TOCH2', fontName='Inter', fontSize=11,
    leading=18, leftIndent=18, textColor=TEXT_MUTED)

# ─── Helpers ───────────────────────────────────────────────────────────────────
from reportlab.platypus.tableofcontents import TableOfContents

class MyDocTemplate(SimpleDocTemplate):
    def __init__(self, *args, **kwargs):
        SimpleDocTemplate.__init__(self, *args, **kwargs)
        self.page_count_offset = 0

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph):
            style = flowable.style.name
            if style == 'H1':
                self.notify('TOCEntry', (0, flowable.getPlainText(), self.page))
            elif style == 'H2':
                self.notify('TOCEntry', (1, flowable.getPlainText(), self.page))

def h1(text):
    return Paragraph(text, s_h1)

def h2(text):
    return Paragraph(text, s_h2)

def h3(text):
    return Paragraph(text, s_h3)

def p(text):
    return Paragraph(text, s_body)

def bullet(text):
    return Paragraph(f"<bullet>&bull;</bullet> {text}", s_bullet)

def callout(text):
    return Paragraph(text, s_callout)

def sp(h=6):
    return Spacer(1, h)

def hr():
    return HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceBefore=8, spaceAfter=8)

def make_table(headers, rows, col_widths=None):
    """Build a safe table with Paragraph wrapping."""
    header_row = [Paragraph(h, s_table_header) for h in headers]
    data = [header_row]
    for row in rows:
        data.append([Paragraph(str(c), s_table_cell) for c in row])

    if col_widths is None:
        n = len(headers)
        col_widths = [CONTENT_W / n] * n

    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Inter-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    t.setStyle(TableStyle(style_cmds))
    return t


# ─── FOOTER ────────────────────────────────────────────────────────────────────
def footer_arabic(canvas, doc):
    canvas.saveState()
    canvas.setFont('Inter', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(PAGE_W / 2, 0.45 * inch, str(doc.page))
    canvas.restoreState()

def footer_roman(canvas, doc):
    canvas.saveState()
    roman = {1:'i',2:'ii',3:'iii',4:'iv',5:'v',6:'vi',7:'vii',8:'viii'}
    pg = roman.get(doc.page, str(doc.page))
    canvas.setFont('Inter', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(PAGE_W / 2, 0.45 * inch, pg)
    canvas.restoreState()

def no_footer(canvas, doc):
    pass


# ─── BUILD STORY ───────────────────────────────────────────────────────────────
story = []

# ─── TABLE OF CONTENTS ────────────────────────────────────────────────────────
toc = TableOfContents()
toc.levelStyles = [s_toc_h1, s_toc_h2]
story.append(Paragraph("Table of Contents", ParagraphStyle('TOCTitle',
    fontName='Inter-Bold', fontSize=20, leading=26, textColor=TEXT_PRIMARY,
    spaceBefore=0, spaceAfter=18)))
story.append(toc)
story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════════
# CHAPTER 1: EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
story.append(h1("1. Executive Summary"))
story.append(p(
    "Agrobase V3 represents MobiPay AgroSys Limited's ambitious upgrade from a legacy Core PHP 7 and MySQL "
    "codebase to a modern technology stack built on Next.js 16, TypeScript, Prisma ORM, and Tailwind CSS. "
    "The platform serves a multi-tenant SaaS ecosystem across three East and West African markets: Uganda, "
    "Ghana, and Kenya. It targets diverse stakeholders including cooperatives, exporters, microfinance "
    "institutions, banks, NGOs, and government agencies managing over 2,000 smallholder farmers per major "
    "tenant such as EKIBBO, a prominent coffee exporter. The current V3 codebase contains 62 Prisma models, "
    "46 API route files, 31 module view components, and 43 shadcn/ui interface components, forming the "
    "foundational skeleton of a comprehensive agricultural management platform."
))
story.append(p(
    "Despite this impressive architectural foundation, a rigorous platform-owner perspective reveals "
    "significant structural gaps across twelve critical dimensions. This gap analysis document systematically "
    "identifies and prioritizes every deficiency, from the absence of a mobile application and the lack of "
    "proper Role-Based Access Control (RBAC) implementation, to missing satellite-based geospatial intelligence, "
    "incomplete payment gateway integrations, and the absence of a cooperative ERP module. The analysis also "
    "addresses business model sustainability, revenue stream diversification, data migration strategies from "
    "V1 to V3, and the signature differentiators that will position Agrobase as the definitive agritech "
    "platform in Sub-Saharan Africa."
))
story.append(p(
    "The document is structured to serve as both a strategic roadmap and a technical specification for the "
    "engineering team. Each gap is categorized by severity (Critical, High, Medium, Low), estimated "
    "implementation complexity, and dependencies on other components. The analysis draws directly from the "
    "existing codebase inventory, the EKIBBO customer feedback regarding EUDR compliance and certification "
    "management, and the competitive landscape of African agritech platforms. The total identified gaps "
    "span across 12 major categories with over 85 individual action items, reflecting the gap between a "
    "functional prototype and a production-grade, revenue-generating platform ecosystem."
))

story.append(sp(6))

# Summary KPI table
story.append(h3("Current State Snapshot"))
story.append(make_table(
    ["Dimension", "Current Status", "Target State", "Gap Severity"],
    [
        ["Business Model", "Unclear monetization, no pricing tiers", "Freemium SaaS with 3 tiers + per-feature billing", "Critical"],
        ["Mobile Application", "None (web-only)", "Flutter app for Android + iOS with offline sync", "Critical"],
        ["RBAC / Security", "Plain-text passwords, no API auth, no tenant isolation", "bcrypt + JWT + middleware + row-level security", "Critical"],
        ["Payment Gateways", "Simulated 1s timeout", "mPay, aIntel, core banking, mobile money, escrow", "Critical"],
        ["Satellite Intelligence", "None", "Sentinel-2 + Landsat NDVI, deforestation alerts, plot verification", "High"],
        ["Cooperative ERP", "Basic group management", "Full ERP: accounting, inventory, member equity, dividends", "High"],
        ["Data Migration", "No migration tooling", "Automated V1-to-V3 migration with field mapping", "High"],
        ["Carbon Tracking", "Basic CBAM report model only", "Full lifecycle carbon tracking per crop stage", "High"],
    ],
    [CONTENT_W*0.17, CONTENT_W*0.26, CONTENT_W*0.35, CONTENT_W*0.12]
))
story.append(Paragraph("Table 1: Current platform state versus target state across critical dimensions", s_caption))
story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════════
# CHAPTER 2: BUSINESS MODEL & REVENUE ARCHITECTURE GAPS
# ═══════════════════════════════════════════════════════════════════════════════
story.append(h1("2. Business Model and Revenue Architecture Gaps"))

story.append(h2("2.1 Current Monetization Deficiencies"))
story.append(p(
    "The existing Agrobase V3 codebase includes a Subscription model with three plan tiers (BASIC, STANDARD, "
    "ENTERPRISE) and a ModuleEntitlement model for feature gating. However, these models are entirely "
    "structural: there is no billing engine, no payment collection integration, no usage metering, and no "
    "pricing page. The subscription system exists as database schemas only, with zero business logic "
    "connecting entitlement checks to actual user-facing restrictions or revenue collection. This represents "
    "the single most critical business gap: the platform has no mechanism to generate revenue."
))
story.append(p(
    "For a multi-tenant SaaS platform operating across three countries with vastly different payment "
    "ecosystems, the revenue architecture must account for mobile money dominance in Uganda (MTN Mobile "
    "Money, Airtel Money), Ghana (MTN MoMo, Vodafone Cash), and Kenya (M-Pesa, Airtel Money). The current "
    "codebase has no integration with any of these payment rails, nor does it have a unified payment "
    "abstraction layer that could accommodate them. The existing Payment model and PaymentAccount model "
    "track internal transactions but have no connection to external payment service providers."
))

story.append(h2("2.2 Proposed Revenue Architecture"))
story.append(p(
    "A robust revenue model for Agrobase V3 should incorporate multiple complementary streams designed to "
    "serve the diverse stakeholder base. The primary revenue stream should be a tiered SaaS subscription "
    "with three clearly differentiated plans: a Community tier for small farmer groups and VSLAs offered "
    "at no cost to drive adoption, a Professional tier for cooperatives and mid-size exporters priced "
    "per active farmer per month with a cap, and an Enterprise tier for large exporters like EKIBBO, "
    "banks, and MFIs with custom pricing, dedicated support, and SLA guarantees. Each tier should have "
    "clearly defined module access, API rate limits, storage quotas, and user seat limits."
))
story.append(p(
    "Beyond subscriptions, the platform should generate transaction-based revenue through the marketplace "
    "module. The current MarketMatch model has a placeholder for platform fees, but there is no actual "
    "fee calculation, escrow management, or settlement logic. A 1.5-3% platform fee on every marketplace "
    "transaction, combined with premium listing fees for input dealers and bulk buyers, could generate "
    "significant transaction volume revenue. Additionally, compliance-as-a-service represents a high-value "
    "revenue stream: EKIBBO and similar exporters would pay premium subscription fees for EUDR geolocation "
    "verification, CBAM carbon reporting, and certification management. Each certification audit cycle, "
    "document generation, and compliance report could be monetized individually."
))
story.append(p(
    "A third revenue stream should come from data and intelligence products. The credit scoring module, "
    "satellite imagery analytics, and market price intelligence represent valuable data products that "
    "banks, MFIs, and commodity buyers would purchase on a per-report or subscription basis. The platform "
    "should also explore white-label licensing opportunities where large agricultural organizations deploy "
    "Agrobase under their own brand for their farmer networks, paying a licensing fee per farmer or per "
    "organization annually."
))

story.append(h2("2.3 Missing Pricing and Billing Infrastructure"))
story.append(p(
    "The current codebase lacks several essential billing infrastructure components that must be built "
    "before any revenue can be collected. There is no Stripe or equivalent payment processor integration, "
    "no invoice generation system, no automated billing cycles with retry logic for failed payments, no "
    "proration calculations for mid-cycle plan changes, and no dunning management for overdue accounts. "
    "For African markets specifically, there is no mobile money payment integration, no USSD-based payment "
    "collection for farmers without smartphones, and no multi-currency support with real-time exchange rate "
    "handling across Ugandan Shillings (UGX), Ghanaian Cedis (GHS), and Kenyan Shillings (KES)."
))
story.append(p(
    "The billing engine must also support feature-level entitlement enforcement at the API middleware level, "
    "not just at the UI visibility level. Currently, the module entitlement toggles in the Settings page "
    "are purely cosmetic: they update the database but no middleware checks these entitlements before "
    "serving API responses. A proper implementation requires a middleware layer that intercepts every API "
    "request, checks the requesting tenant's active subscription and module entitlements, and returns "
    "403 Forbidden for unauthorized module access. This also requires a caching layer (Redis or in-memory) "
    "to avoid database queries on every request for entitlement checks."
))

story.append(make_table(
    ["Revenue Stream", "Current Status", "Required Investment", "Est. Revenue Potential"],
    [
        ["SaaS Subscription", "Schema only, no billing engine", "Stripe + mobile money + invoicing", "Primary: $5-50/farmer/month"],
        ["Marketplace Fees", "Match model exists, no fee logic", "Escrow + settlement + fee calc", "1.5-3% of GMV"],
        ["Compliance-as-a-Service", "4 compliance models, no monetization", "Audit workflows + report generation", "$500-5000/exporter/year"],
        ["Data Products", "Credit scoring model exists", "API products + export + reports", "$2-20/report"],
        ["White-label Licensing", "Not implemented", "Branding + custom domain + SLA", "$10K-100K/enterprise/year"],
        ["Training & Onboarding", "Training model exists, no paid content", "Course builder + certificates", "$50-500/cooperative"],
    ],
    [CONTENT_W*0.18, CONTENT_W*0.28, CONTENT_W*0.28, CONTENT_W*0.20]
))
story.append(Paragraph("Table 2: Revenue stream analysis with current status and potential", s_caption))
story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════════
# CHAPTER 3: TECHNOLOGY STACK GAPS
# ═══════════════════════════════════════════════════════════════════════════════
story.append(h1("3. Technology Stack Gaps"))

story.append(h2("3.1 Missing Mobile Application (Flutter)"))
story.append(p(
    "The most visible technology gap is the complete absence of a mobile application. In Sub-Saharan Africa, "
    "mobile penetration exceeds 80% while smartphone penetration reaches approximately 50-60% in urban areas "
    "and 25-35% in rural agricultural communities. The existing USSD, IVR, and SMS channel simulators in the "
    "codebase acknowledge this reality, but simulators are not production channels. A Flutter-based mobile "
    "application is essential for reaching field agents, extension officers, and progressive farmers who "
    "operate primarily through mobile devices."
))
story.append(p(
    "The Flutter app should be developed as a shared-codebase application targeting both Android and iOS "
    "from a single codebase. Critical features for the mobile application include offline-first data "
    "synchronization using a local SQLite database with conflict resolution, camera integration for farm "
    "documentation and geo-tagged photo evidence, GPS-based farm boundary mapping with the device's "
    "location services, push notifications for market price alerts, loan approval updates, and training "
    "schedules, and biometric authentication (fingerprint) for field agents who operate in shared-device "
    "environments. The app should sync data with the Next.js backend via a REST API layer with JWT "
    "authentication and support background sync when connectivity is restored after field work in areas "
    "with poor network coverage."
))

story.append(h2("3.2 Database Architecture Gaps"))
story.append(p(
    "The current implementation uses SQLite as the development database, which is appropriate for prototyping "
    "but entirely unsuitable for a multi-tenant production platform. The production database must be "
    "PostgreSQL, which supports row-level security policies essential for tenant data isolation, advanced "
    "JSON querying for flexible metadata fields, full-text search for farmer and product searches, and "
    "spatial extensions (PostGIS) for the geospatial queries required by EUDR compliance, farm mapping, "
    "and satellite imagery correlation. The migration from SQLite to PostgreSQL must be planned carefully "
    "with Prisma's migration system, and all SQLite-specific query patterns (such as raw SQL in the "
    "dashboard stats API) must be rewritten."
))
story.append(p(
    "Additionally, the platform needs a proper caching layer. Current API routes query the database "
    "directly on every request with no caching. For a platform serving multiple countries with dashboard "
    "aggregations that run 10+ parallel queries (as seen in the dashboard API route), this will create "
    "severe performance bottlenecks at scale. Redis should be introduced for session caching, frequently "
    "accessed reference data (commodities, geographic hierarchies, module entitlements), and dashboard "
    "aggregation caching with time-based invalidation. An in-memory cache using Map or lru-cache can "
    "serve as a lightweight alternative during early production deployment."
))

story.append(h2("3.3 Infrastructure and DevOps Gaps"))
story.append(p(
    "The current project configuration sets React strict mode to false and ignores build errors in "
    "next.config.ts, which are development shortcuts that must be resolved before production deployment. "
    "There is no Docker containerization, no CI/CD pipeline configuration, no environment-specific "
    "configuration management (development, staging, production), no health check endpoints beyond a "
    "basic hello-world API route, no rate limiting on API endpoints, no request logging and monitoring "
    "infrastructure, and no backup and disaster recovery strategy for the database. For a platform "
    "handling financial transactions (VSLA savings, loans, marketplace payments), these infrastructure "
    "gaps represent unacceptable operational risk."
))
story.append(p(
    "The deployment architecture should include containerized deployments with Docker and Kubernetes "
    "orchestration, automated CI/CD through GitHub Actions or GitLab CI with lint, type-check, test, "
    "and deploy stages, environment-specific configuration using environment variables with validation, "
    "API rate limiting and request throttling middleware, structured logging with correlation IDs for "
    "request tracing across microservices, health check endpoints with dependency status (database, "
    "Redis, external APIs), and automated database backup with point-in-time recovery capability. "
    "Monitoring should include application performance monitoring (APM) via Datadog or New Relic, "
    "error tracking via Sentry, and uptime monitoring with alerting."
))

story.append(make_table(
    ["Stack Component", "Current", "Required for Production", "Priority"],
    [
        ["Mobile App", "None", "Flutter (Android + iOS), offline sync", "Critical"],
        ["Database", "SQLite (dev)", "PostgreSQL + PostGIS + Redis", "Critical"],
        ["Containerization", "None", "Docker + Docker Compose + K8s", "High"],
        ["CI/CD", "None", "GitHub Actions with lint/test/deploy", "High"],
        ["Monitoring", "None", "Sentry + APM + uptime alerts", "High"],
        ["API Gateway", "Caddy (basic)", "Rate limiting + auth middleware", "High"],
        ["File Storage", "None (model only)", "S3-compatible (MinIO/AWS S3)", "Medium"],
        ["Search", "DB query only", "Elasticsearch or Meilisearch", "Medium"],
        ["Queue/Workers", "None", "BullMQ or similar for async jobs", "Medium"],
    ],
    [CONTENT_W*0.18, CONTENT_W*0.18, CONTENT_W*0.38, CONTENT_W*0.12]
))
story.append(Paragraph("Table 3: Technology stack gap analysis", s_caption))
story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════════
# CHAPTER 4: RBAC, SECURITY, AND MULTI-TENANT ISOLATION
# ═══════════════════════════════════════════════════════════════════════════════
story.append(h1("4. RBAC, Security, and Multi-Tenant Isolation"))

story.append(h2("4.1 Critical Security Vulnerabilities"))
story.append(p(
    "The current Agrobase V3 codebase has severe security deficiencies that make it unsuitable for any "
    "production deployment. The most critical vulnerability is the storage and comparison of user passwords "
    "in plain text. The auth.ts file compares user-provided passwords directly against the database "
    "passwordHash field without any hashing algorithm. This means that any database breach, SQL injection "
    "attack, or unauthorized database access would expose every user's password in readable form. The "
    "registration endpoint (auth/register/route.ts) stores passwords directly without hashing. This must "
    "be immediately addressed by implementing bcrypt password hashing with a minimum cost factor of 12 "
    "in both the registration and authentication flows."
))
story.append(p(
    "The second critical vulnerability is the complete absence of API route protection. None of the 46 "
    "API routes implement authentication checks. Any unauthenticated request to any API endpoint returns "
    "data without verifying the user's identity. There is no Next.js middleware.ts file implementing route "
    "guards, no session validation on API handlers, and no token-based access control. This means that "
    "farmer personal data, financial records, VSLA savings balances, loan applications, and compliance "
    "reports are all accessible to anonymous users. A middleware layer must be implemented that validates "
    "the JWT session token on every API request and returns 401 Unauthorized for unauthenticated requests."
))

story.append(h2("4.2 Missing Tenant Data Isolation"))
story.append(p(
    "The multi-tenant architecture defined in the Prisma schema establishes a hierarchical tenant model "
    "with Super Admin at the top, followed by Country Admins for Uganda, Ghana, and Kenya, and then "
    "sub-tenants for NGOs, cooperatives, exporters, MFIs, and banks. However, this hierarchy exists "
    "only in the data model: no API route filters data by the requesting user's tenantId. When a user "
    "from the Uganda country admin tenant queries the farmers endpoint, they receive all farmers in the "
    "database regardless of country, cooperative, or organization affiliation. This is a fundamental "
    "multi-tenant data isolation failure."
))
story.append(p(
    "Proper tenant isolation requires implementing a comprehensive data filtering strategy across all "
    "API routes. Each request must be scoped to the requesting user's tenant and its descendant tenants "
    "in the hierarchy. For example, a Country Admin for Uganda should see data from all sub-tenants "
    "under the Uganda node, but not data from Ghana or Kenya tenants. A cooperative admin should see "
    "only data belonging to their cooperative. This requires a utility function that recursively "
    "collects all descendant tenant IDs from the tenant hierarchy and applies them as a WHERE clause "
    "filter on every database query. Prisma middleware or a repository pattern can automate this "
    "filtering to prevent developers from accidentally exposing cross-tenant data."
))

story.append(h2("4.3 Role-Based Access Control Design"))
story.append(p(
    "The User model defines nine roles (SUPER_ADMIN, COUNTRY_ADMIN, TENANT_ADMIN, AGENT, "
    "EXTENSION_OFFICER, CBT, CASUAL, FARMER, VSLA_MEMBER), but there is no implementation of "
    "role-based permissions beyond a basic role check in the auth callback. A proper RBAC system "
    "requires defining permissions as granular action-resource pairs (e.g., 'farmers:read', "
    "'farmers:write', 'vsla:approve_loans', 'compliance:manage') and mapping roles to permission "
    "sets. The current codebase has no Permission model, no role-permission mapping, and no middleware "
    "that checks permissions before allowing API operations."
))
story.append(p(
    "The following table defines the proposed RBAC matrix with data visibility rules for each role "
    "in the multi-tenant architecture. Each role should have scoped data access determined by their "
    "tenant position in the hierarchy, specific module access based on entitlements, and action "
    "permissions that restrict what operations they can perform within each module."
))

story.append(make_table(
    ["Role", "Data Visibility", "Key Permissions", "Module Access"],
    [
        ["Super Admin", "All tenants, all countries", "Full system configuration, tenant management, billing", "All modules"],
        ["Country Admin", "All tenants within assigned country", "Country-level reporting, tenant provisioning, compliance oversight", "All except billing config"],
        ["Tenant Admin", "Own tenant + child entities", "User management, module entitlements, API key management", "Entitled modules only"],
        ["Agent", "Assigned farmer groups + VSLA groups", "Farmer registration, farm visits, data collection", "Farmers, VSLA, Training, Surveys"],
        ["Extension Officer", "Assigned sub-county or parish", "Training delivery, farm visits, agronomic advisory", "Farmers, Training, Farm Visits"],
        ["CBT", "Assigned cooperative members", "Training assessment, certification tracking", "Training, Compliance"],
        ["Farmer", "Own profile + own group data", "View own data, submit surveys, marketplace listing", "Limited self-service"],
        ["VSLA Member", "Own VSLA group data", "View savings, request loans, meeting attendance", "VSLA (read-only for others)"],
        ["Bank/MFI User", "Partnered cooperatives' financial data", "Credit scores, loan portfolio, repayment tracking", "AgriTrack, Loans, Reports"],
    ],
    [CONTENT_W*0.12, CONTENT_W*0.24, CONTENT_W*0.32, CONTENT_W*0.22]
))
story.append(Paragraph("Table 4: Proposed RBAC matrix with data visibility and permissions", s_caption))
story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════════
# CHAPTER 5: PAYMENT AND FINANCIAL INTEGRATION GAPS
# ═══════════════════════════════════════════════════════════════════════════════
story.append(h1("5. Payment and Financial Integration Gaps"))

story.append(h2("5.1 Legacy Payment Gateway Integration"))
story.append(p(
    "The V1 Agrobase platform on Core PHP 7 already has working integrations with mPay and aIntel payment "
    "gateways, along with some core banking system connections. These integrations represent significant "
    "business value and existing partner relationships that must be preserved and enhanced in V3. The "
    "current V3 codebase, however, has completely discarded these integrations. The Payment API route "
    "simulates payment completion with a one-second setTimeout, and the PaymentAccount model has no "
    "connection to any external financial service provider."
))
story.append(p(
    "The migration of payment integrations from V1 to V3 requires a comprehensive payment abstraction "
    "layer that normalizes the API interfaces of mPay, aIntel, mobile money operators (MTN Mobile Money, "
    "Airtel Money, M-Pesa), and core banking systems behind a unified PaymentProvider interface. This "
    "abstraction layer should handle payment initiation, status polling, webhook callback processing, "
    "refund management, and reconciliation. Each provider implementation should be a separate module "
    "that conforms to the same interface, allowing new providers to be added without modifying the "
    "core payment logic. The payment flow must also support escrow-based transactions for the marketplace "
    "module, where buyer funds are held in escrow until delivery confirmation triggers automatic settlement "
    "to the seller's account minus the platform fee."
))

story.append(h2("5.2 MFI and Bank Stakeholder Use Cases"))
story.append(p(
    "Microfinance institutions and banks represent high-value stakeholders in the Agrobase ecosystem, "
    "but the current platform does not adequately serve their specific needs. These financial institutions "
    "require a dedicated banking portal with features that go beyond what the current AgriTrack (credit "
    "scoring) and Loans modules offer. Banks need real-time visibility into their agricultural loan "
    "portfolio with risk segmentation, cohort analysis for loan performance by season and crop type, "
    "and automated early warning systems for delinquent accounts. The existing credit scoring model "
    "provides a static 4-factor score, but banks need dynamic scoring that incorporates real-time data "
    "from VSLA savings patterns, marketplace transaction history, repayment behavior, and satellite-based "
    "crop health indicators."
))
story.append(p(
    "Specific features required for MFI and bank stakeholders include a loan origination system with "
    "configurable interest rate structures (flat rate, declining balance, amortized), group lending "
    "products where a farmer group collectively guarantees individual member loans, automated disbursement "
    "directly to input suppliers rather than cash disbursement to prevent fund diversion, digital "
    "collection channels through mobile money with automated repayment reminders via SMS and USSD, "
    "and comprehensive regulatory reporting for central bank compliance. The platform should also "
    "provide banks with a farmer financial identity that aggregates all financial interactions across "
    "VSLA savings, marketplace sales, institutional loans, and input purchases into a single financial "
    "profile that can be used for credit decisioning."
))

story.append(h2("5.3 Missing Financial Infrastructure"))
story.append(p(
    "Beyond payment processing, the platform lacks several critical financial infrastructure components. "
    "There is no double-entry accounting system for cooperatives, no general ledger, no chart of accounts, "
    "and no financial statement generation (balance sheet, income statement, cash flow statement). "
    "Cooperatives need these features to manage their member equity, share capital, revolving loan funds, "
    "and operating expenses. The VSLA module tracks savings and loans but has no integration with a "
    "formal accounting system, making it impossible for VSLA groups to transition from informal savings "
    "to formal financial management. The platform should implement a chart of accounts template aligned "
    "with International Financial Reporting Standards (IFRS) for small and medium enterprises, with "
    "country-specific adaptations for Uganda (Uganda Financial Reporting Standards), Ghana (GhIFS), "
    "and Kenya (IFRS for SMEs)."
))
story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════════
# CHAPTER 6: SATELLITE AND GEOSPATIAL INTELLIGENCE
# ═══════════════════════════════════════════════════════════════════════════════
story.append(h1("6. Satellite and Geospatial Intelligence Gaps"))

story.append(h2("6.1 The Satellite Imperative for African Agriculture"))
story.append(p(
    "Satellite-based earth observation represents the most transformative technology gap in the Agrobase "
    "platform. For a system that serves coffee exporters requiring EUDR compliance, carbon footprint "
    "tracking for CBAM reporting, and agricultural lenders needing crop performance verification, "
    "satellite imagery is not a luxury feature but a fundamental infrastructure requirement. Free "
    "satellite data from the Copernicus Sentinel-2 mission provides 10-meter resolution multispectral "
    "imagery with 5-day revisit frequency, covering all of Uganda, Ghana, and Kenya since 2015. "
    "Landsat 8 and 9 provide 30-meter resolution imagery with additional thermal bands, available "
    "from 2013 and 2021 respectively. The USGS Landsat archive and ESA Copernicus Open Access Hub "
    "provide free, programmatic access to over 7 years of historical imagery for all three target countries."
))
story.append(p(
    "The current FarmPolygon model stores GPS boundary coordinates for farms, which provides the "
    "geographic footprint needed to query satellite imagery for specific plots. However, there is no "
    "integration with any satellite data provider, no imagery processing pipeline, and no derived "
    "analytics. The EUDR compliance module stores geolocation data but cannot verify whether a farm's "
    "geographic coordinates fall within a deforested area because it has no access to historical "
    "land cover change data. Similarly, the CBAM carbon report model stores emission estimates but "
    "has no connection to actual vegetation indices or biomass estimates derived from satellite data."
))

story.append(h2("6.2 Required Satellite Capabilities"))
story.append(p(
    "The satellite intelligence module must deliver five core capabilities that map directly to the "
    "platform's compliance and business requirements. First, plot-level vegetation monitoring using "
    "Normalized Difference Vegetation Index (NDVI) calculations from Sentinel-2 bands 4 (red) and 8 "
    "(near-infrared) to track crop health throughout the growing season. This enables early detection "
    "of crop stress, pest infestation, and nutrient deficiency, providing actionable intelligence to "
    "extension officers and farmers via the mobile app. Historical NDVI trends over 5-7 years allow "
    "assessment of plot productivity and identification of consistently underperforming areas."
))
story.append(p(
    "Second, deforestation detection using land cover change analysis by comparing multi-temporal "
    "satellite imagery to identify areas where forest cover has been converted to agricultural land "
    "or other uses after the EUDR cutoff date of December 31, 2020. This is the single most critical "
    "requirement for EKIBBO's EUDR compliance: the EU regulation requires demonstrable proof that "
    "commodities were not grown on land deforested after this date. The platform must maintain a "
    "deforestation alert system that automatically flags any farm polygon overlapping with areas "
    "showing recent forest cover loss, triggering an investigation workflow."
))
story.append(p(
    "Third, carbon biomass estimation using satellite-derived vegetation metrics correlated with "
    "above-ground biomass models to estimate carbon stocks on farm plots. This feeds directly into "
    "CBAM reporting requirements and creates opportunities for carbon credit generation under Verra "
    "Verified Carbon Standard (VCS) and Gold Standard methodologies. Fourth, weather intelligence "
    "integration combining satellite-derived precipitation data (CHIRPS, GPM) with temperature data "
    "to provide farm-level weather advisories and crop calendar recommendations. Fifth, digital "
    "passport and plot verification using satellite imagery to create a visual timeline of each "
    "farm plot's land use history, providing the documentary evidence required for EUDR due diligence, "
    "Rainforest Alliance verification, and GLOBALG.A.P. audit compliance."
))

story.append(make_table(
    ["Capability", "Data Source", "Spatial Resolution", "Revisit", "Primary Use Case"],
    [
        ["Vegetation Health (NDVI)", "Sentinel-2 MSI", "10m", "5 days", "Crop monitoring, yield estimation"],
        ["Deforestation Detection", "Sentinel-2 + Landsat 8/9", "10-30m", "5-16 days", "EUDR compliance verification"],
        ["Carbon Biomass", "Sentinel-2 + ALOS PALSAR", "10-25m", "Varies", "CBAM reporting, carbon credits"],
        ["Precipitation", "CHIRPS / GPM IMERG", "5km / 10km", "Daily", "Weather advisory, crop calendar"],
        ["Land Cover Classification", "Sentinel-2 time-series", "10m", "Seasonal", "Plot verification, EUDR"],
        ["Soil Moisture", "Sentinel-1 SAR", "20m", "6 days", "Irrigation scheduling, drought alert"],
    ],
    [CONTENT_W*0.17, CONTENT_W*0.20, CONTENT_W*0.14, CONTENT_W*0.11, CONTENT_W*0.30]
))
story.append(Paragraph("Table 5: Satellite data sources and capabilities for Agrobase V3", s_caption))
story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════════
# CHAPTER 7: COMPLIANCE, CERTIFICATIONS, AND CARBON TRACKING
# ═══════════════════════════════════════════════════════════════════════════════
story.append(h1("7. Compliance, Certifications, and Carbon Tracking Gaps"))

story.append(h2("7.1 EUDR Compliance Depth Requirements"))
story.append(p(
    "The EU Deforestation Regulation (EUDR) which becomes fully enforceable requires operators placing "
    "commodities on the EU market to demonstrate that their products are deforestation-free and legally "
    "produced. For EKIBBO, a coffee exporter with over 2,000 farmers, this means every single shipment "
    "must be accompanied by a due diligence statement that traces the coffee back to the specific plot "
    "of land where it was grown, with geolocation coordinates (latitude and longitude) and evidence "
    "that no deforestation occurred on that plot after December 31, 2020. The current EudrCompliance "
    "model in the schema captures basic geolocation, risk assessment, and verification status, but the "
    "implementation lacks several critical components."
))
story.append(p(
    "The missing EUDR components include: (a) automated geolocation verification using satellite imagery "
    "to cross-reference farm coordinates against historical land cover maps, (b) a deforestation risk "
    "scoring algorithm that considers proximity to forest edges, historical land cover change rates, "
    "and regional deforestation hotspots, (c) document management for legal land tenure proof, farming "
    "permits, and environmental impact assessments, (d) an integrated due diligence workflow that guides "
    "exporters through the risk assessment, mitigation, and reporting process with audit trail, (e) "
    "polygon-level verification rather than point-level coordinates, as EUDR requires polygon boundaries "
    "not just GPS points, and (f) automated generation of EUDR-compliant due diligence statements in "
    "the format required by the EU Information System."
))

story.append(h2("7.2 CBAM Carbon Emission Tracking"))
story.append(p(
    "The Carbon Border Adjustment Mechanism (CBAM) requires importers of certain goods into the EU to "
    "report and eventually pay for the embedded greenhouse gas emissions in those products. For coffee "
    "exports, this means tracking carbon emissions at every stage of the value chain from farm-level "
    "cultivation through processing, transportation, and export. The current CbamReport model stores "
    "static emission estimates, but CBAM compliance requires a dynamic, stage-by-stage carbon accounting "
    "system that tracks actual emissions rather than estimates."
))
story.append(p(
    "The platform must implement a comprehensive carbon tracking framework that calculates emissions "
    "for each stage of the crop calendar: land preparation (fuel for machinery, soil carbon release), "
    "planting (seed production, transport), inputs application (fertilizer manufacturing emissions "
    "using IPCC Tier 2 emission factors, pesticide production), crop growth (nitrous oxide from "
    "soil, methane from flooded fields if applicable), harvesting (fuel, labor transport), "
    "post-harvest processing (drying energy, milling energy, hulling), transportation to port "
    "(distance-based fuel emissions using IPCC emission factors), and shipping to destination "
    "(vessel type, distance, fuel consumption). Each stage should allow both default IPCC emission "
    "factors and actual measured data where available, creating a hybrid calculation methodology "
    "that improves accuracy over time as more actual data is collected."
))

story.append(h2("7.3 Certification Management and Global Standards"))
story.append(p(
    "The platform currently has models for Rainforest Alliance and GLOBALG.A.P. certifications, "
    "but the implementation lacks the workflow depth required for real certification management. "
    "A proper certification management system must support the complete certification lifecycle: "
    "pre-assessment preparation, document compilation, audit scheduling, finding resolution, "
    "corrective action tracking, certificate issuance, surveillance audit scheduling, and renewal "
    "management. The system should also track multiple certifications per farm and per cooperative, "
    "with a unified compliance dashboard showing the status of all certifications across EUDR, CBAM, "
    "Rainforest Alliance, GLOBALG.A.P., Organic (EU, USDA NOP), Fairtrade, UTZ, and C.A.F.E. "
    "Practices."
))
story.append(p(
    "For Verra VCS and Gold Standard carbon credit projects, the platform needs a project methodology "
    "selection tool that matches the farming practices (agroforestry, soil carbon sequestration, "
    "reduced emissions from fertilizer management) to the appropriate methodology. It should track "
    "additionality, baseline scenarios, monitoring plans, and verification audit outcomes. The "
    "integration of IPCC standards for greenhouse gas inventory methodology, combined with Verra "
    "and Gold Standard requirements, positions Agrobase uniquely as the only platform in East and "
    "West Africa that provides end-to-end compliance from farm-level data collection through to "
    "international certification and carbon credit verification."
))
story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════════
# CHAPTER 8: COOPERATIVE ERP AND ECOSYSTEM GAPS
# ═══════════════════════════════════════════════════════════════════════════════
story.append(h1("8. Cooperative ERP and Ecosystem Gaps"))

story.append(h2("8.1 Missing Cooperative ERP Module"))
story.append(p(
    "Agricultural cooperatives in Uganda, Ghana, and Kenya function as multi-purpose business entities "
    "that combine farmer aggregation, input procurement, produce bulking, processing, marketing, "
    "savings mobilization, and credit provision under a single organizational structure. The current "
    "Agrobase V3 platform treats these functions as separate, disconnected modules: VSLA handles "
    "savings, Marketplace handles trading, Input Aggregation handles procurement, and Loans handles "
    "credit. There is no unified cooperative management module that integrates these functions into "
    "a coherent ERP system that reflects how cooperatives actually operate."
))
story.append(p(
    "A cooperative ERP module must include general ledger accounting with double-entry bookkeeping, "
    "accounts payable and receivable management, inventory management for inputs and produce, "
    "member equity tracking (share capital, retained earnings, patronage refunds), payroll management "
    "for cooperative staff, fixed asset register for processing equipment and transport vehicles, "
    "budget preparation and variance analysis, and financial statement generation. The ERP should be "
    "designed specifically for agricultural cooperative operations, with features like produce "
    "intake management (recording member deliveries with quality grading), bulk sale management "
    "(tracking sales to exporters with price determination based on quality and market conditions), "
    "and first and final payment calculations with transparent deduction breakdowns for inputs "
    "received, loans outstanding, and processing fees."
))

story.append(h2("8.2 How Cooperatives Actually Function"))
story.append(p(
    "Understanding the real operational workflow of an agricultural cooperative like EKIBBO's supplier "
    "cooperatives is essential for building the right software. A typical coffee cooperative in Uganda "
    "operates on an annual cycle: before the harvest season, the cooperative procures inputs (fertilizer, "
    "pruning equipment, processing chemicals) in bulk at discounted prices and distributes them to "
    "members on credit. During the harvest season (typically October to February for coffee in Uganda), "
    "members deliver cherries to cooperative collection centers where the produce is weighed, quality-graded, "
    "and recorded against the member's account. The cooperative aggregates the produce, processes it "
    "(washed, dried, hulled, graded), and sells it to exporters like EKIBBO at negotiated prices."
))
story.append(p(
    "After the sale, the cooperative calculates each member's payment based on the volume and quality "
    "of their deliveries, the final sale price achieved, and deductions for inputs received on credit, "
    "outstanding loans, processing fees, and cooperative reserves. A first payment (typically 60-70% of "
    "estimated value) is made shortly after delivery, and a final payment (the remainder after all costs "
    "are reconciled) is made after the bulk sale is completed. This entire workflow, from input "
    "procurement through to final member payment, must be managed within the ERP module with full "
    "traceability and audit capability. Currently, the Agrobase platform has pieces of this workflow "
    "scattered across different modules with no integration."
))

story.append(h2("8.3 Training, Inspection, and Extension Services"))
story.append(p(
    "The current Training and FarmVisits modules provide basic event management and visit logging, "
    "but they lack the systematic approach required for effective extension services and periodic "
    "inspections. A comprehensive extension services module should include a training curriculum "
    "management system with structured learning pathways for different farmer segments (new farmers, "
    "progressive farmers, lead farmers), assessment and certification of farmer competencies, "
    "scheduled periodic inspections with standardized checklists covering agronomic practices, "
    "post-harvest handling, quality standards, and compliance requirements. The inspection system "
    "should support mobile data collection with photo evidence, geotagged inspection points, and "
    "automated scoring against certification standards (Rainforest Alliance, GLOBALG.A.P.)."
))
story.append(p(
    "Retailer and buyer periodic inspections represent another workflow gap. The platform needs a "
    "separate inspection pipeline for external parties (exporters, certifiers, auditors) who conduct "
    "independent inspections of cooperatives and farms. These inspections should be scheduled, tracked, "
    "and their findings linked to corrective action plans. The results should feed into the compliance "
    "dashboard and certification renewal workflows. For EKIBBO specifically, the system must support "
    "pre-shipment inspections where quality inspectors verify that coffee lots meet the buyer's "
    "specifications before the shipment is authorized."
))
story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════════
# CHAPTER 9: DATA MIGRATION AND V1-to-V3 TRANSITION
# ═══════════════════════════════════════════════════════════════════════════════
story.append(h1("9. Data Migration and V1-to-V3 Transition"))

story.append(h2("9.1 Migration Architecture"))
story.append(p(
    "The migration from Agrobase V1 (Core PHP 7 + MySQL) to V3 (Next.js 16 + PostgreSQL) is a "
    "critical operational challenge that requires careful planning to avoid data loss, minimize "
    "downtime, and ensure business continuity for existing customers like EKIBBO who are already "
    "using the V1 platform. The current V3 codebase has no migration tooling whatsoever. There is "
    "no ETL (Extract, Transform, Load) pipeline, no data mapping document, no field-level "
    "transformation rules, and no validation framework to verify data integrity after migration."
))
story.append(p(
    "The migration architecture should follow a phased approach. Phase 1 involves a full audit of "
    "the V1 MySQL database schema to catalog every table, column, relationship, and data type, and "
    "create a comprehensive field mapping document that maps each V1 field to its V3 Prisma model "
    "equivalent. Phase 2 involves building a migration script that extracts data from the MySQL "
    "database, transforms it to match the V3 schema (handling data type conversions, default values "
    "for new required fields, and relationship reconstruction), and loads it into the PostgreSQL "
    "database. Phase 3 involves a validation framework that runs data integrity checks comparing "
    "record counts, aggregate values, and sample records between V1 and V3 to ensure completeness "
    "and accuracy of the migration."
))

story.append(h2("9.2 Migration Challenges and Risks"))
story.append(p(
    "Several specific challenges complicate the V1-to-V3 migration. The V1 platform likely uses "
    "auto-incrementing integer IDs, while the V3 Prisma schema uses String IDs (CUID format). "
    "The migration must maintain referential integrity by creating a mapping table that associates "
    "each V1 integer ID with its new V3 CUID, ensuring that all foreign key relationships are "
    "correctly translated. Password hashes from V1 (assuming they were properly hashed with a "
    "different algorithm) must be migrated in a way that allows existing users to log in without "
    "password resets, ideally by supporting both the old and new hashing algorithms during a "
    "transition period."
))
story.append(p(
    "Geographic data migration presents another challenge. The V3 platform introduces a 7-level "
    "geographic hierarchy (Region, SubRegion, District, Constituency, SubCounty, Parish, Village) "
    "that may not match the V1 data structure. The V1 platform may store location data as free-text "
    "fields or a flatter hierarchy, requiring geocoding and hierarchical assignment during migration. "
    "Multi-tenancy introduces an additional complexity: V1 may not have a proper tenant model, meaning "
    "that data must be assigned to appropriate tenants during migration based on organizational "
    "affiliation or geographic location. The migration must also handle duplicate data, orphaned "
    "records, and inconsistent data quality that inevitably accumulates in production systems "
    "over years of operation."
))

story.append(make_table(
    ["Data Domain", "V1 Source", "V3 Target", "Migration Risk"],
    [
        ["Farmers (~2000+ for EKIBBO)", "MySQL farmers table", "FarmerProfile + FarmLand + Cultivation", "High: ID mapping, geo hierarchy"],
        ["VSLA Groups", "MySQL vsla_groups", "VslaGroup + VslaMember + VslaSaving + VslaLoan", "High: financial data integrity"],
        ["Marketplace", "MySQL products + orders", "MarketProduct + MarketMatch + Sale", "Medium: status mapping"],
        ["Payments", "MySQL transactions", "Payment + PaymentAccount", "Critical: financial accuracy"],
        ["User Accounts", "MySQL users", "User (new CUID IDs)", "High: password hash migration"],
        ["Geographic Data", "Flat text or 2-3 levels", "7-level hierarchy", "Medium: geocoding required"],
        ["Compliance Records", "May not exist in V1", "EudrCompliance + CbamReport + Certifications", "Low: new data, manual entry"],
    ],
    [CONTENT_W*0.20, CONTENT_W*0.20, CONTENT_W*0.30, CONTENT_W*0.22]
))
story.append(Paragraph("Table 6: Data migration mapping between V1 and V3", s_caption))
story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════════
# CHAPTER 10: MISSING AND INCOMPLETE FEATURES
# ═══════════════════════════════════════════════════════════════════════════════
story.append(h1("10. Missing and Incomplete Application Features"))

story.append(h2("10.1 Feature Completeness Assessment"))
story.append(p(
    "While the V3 codebase contains 31 module view components, many of these are incomplete "
    "implementations with significant functional gaps. The exploration of the codebase reveals that "
    "several module views contain minimal functionality: PaymentsView, LoansView, ReportsView, "
    "TrainingView, CommunicationView, SurveysView, FeedbackView, ProcessingView, SalesView, "
    "DeliveriesView, and ConsignmentsView are all described as basic list-and-create views without "
    "the depth expected for a production platform. The following sections detail the specific gaps "
    "in each functional area."
))

story.append(h2("10.2 Traceability Module Gaps"))
story.append(p(
    "The TraceabilityView component (468 lines) is the most developed of the newer modules, featuring "
    "a visual supply chain with step tracking, lot management, and EUDR compliance badges. However, "
    "the traceability pipeline is incomplete. For a coffee exporter like EKIBBO, full traceability "
    "requires tracking from individual farm plots through cherry collection, wet processing, drying, "
    "hulling, grading, warehousing, and export shipment. The current implementation lacks lot "
    "aggregation logic (combining cherry deliveries from multiple farmers into processing lots), "
    "quality chain of custody documentation, temperature and humidity monitoring during storage and "
    "transport, integration with shipping logistics for container tracking, and Certificate of "
    "Origin generation. The digital passport feature, which should provide a QR-code-linked document "
    "showing the complete history of a coffee lot from farm to cup, exists as a UI concept but has "
    "no backend data model or generation logic."
))

story.append(h2("10.3 Cost of Cultivation Calculation"))
story.append(p(
    "The user specifically requested detailed cost of cultivation calculation, but the current platform "
    "has no cost of cultivation module at all. This is a critical gap for both farmers (who need to "
    "understand their production costs) and financial institutions (who need accurate cost data for "
    "credit assessment and insurance underwriting). A comprehensive cost of cultivation module should "
    "track all input costs (seeds, seedlings, fertilizers, pesticides, herbicides, labor, machinery, "
    "irrigation, land preparation), allocate these costs across crop stages (nursery, planting, "
    "maintenance, harvesting, post-harvest), calculate cost per unit area (per hectare, per acre) "
    "and cost per unit of output (per kilogram of clean coffee), compare actual costs against budgeted "
    "costs with variance analysis, and project profitability based on expected yields and market prices. "
    "This data feeds directly into the credit scoring model, the CBAM carbon tracking, and the "
    "cooperative ERP financial statements."
))

story.append(h2("10.4 Other Critical Missing Features"))
story.append(p(
    "Beyond the major modules detailed above, several additional features are missing from the platform. "
    "There is no warehouse management module for tracking inventory levels, storage conditions, lot "
    "aging, and stock movement. There is no logistics management for optimizing transport routes, "
    "tracking vehicle locations, and managing freight costs. There is no quality inspection module "
    "with standardized grading parameters for different commodities. There is no contract farming "
    "module for managing forward contracts between buyers and farmer groups. There is no HR module "
    "for managing cooperative staff, extension officers, and field agents. There is no API management "
    "portal for external developers to integrate with the platform, despite having an ApiKey model. "
    "There is no real notification system; the TopBar has three hardcoded notification items. There "
    "is no file upload handling despite having a FileAttachment model. And there are no PUT or DELETE "
    "API methods for updating or deleting existing records, only GET and POST."
))

story.append(make_table(
    ["Module", "Current State", "Missing Features", "Completeness"],
    [
        ["Dashboard", "KPI cards, basic charts", "Country comparison, trends, exportable reports", "40%"],
        ["Farmers", "Full CRUD with detail drawer", "Bulk import/export, document upload, family records", "65%"],
        ["VSLA", "4-tab with charts", "Social fund management, share transfer, annual audit", "60%"],
        ["Traceability", "Visual chain, lot tracking", "Lot aggregation, digital passport, IoT integration", "35%"],
        ["Compliance", "4-tab compliance hub", "Automated verification, document generation, workflows", "30%"],
        ["Marketplace", "Products, matches, dealers", "Escrow, settlement, price discovery, contracts", "40%"],
        ["Payments", "Basic list + create", "Real gateway, reconciliation, multi-currency", "15%"],
        ["Loans", "Applications + products", "Disbursement, collection, delinquency management", "25%"],
        ["Channel Simulators", "USSD/SMS/IVR UI", "Real provider integration, delivery tracking", "20%"],
        ["Settings", "Mock tenants, entitlements", "Real CRUD, branding, API management", "20%"],
    ],
    [CONTENT_W*0.14, CONTENT_W*0.22, CONTENT_W*0.38, CONTENT_W*0.12]
))
story.append(Paragraph("Table 7: Module completeness assessment across all major features", s_caption))
story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════════
# CHAPTER 11: COST OF CULTIVATION AND CARBON TRACKING
# ═══════════════════════════════════════════════════════════════════════════════
story.append(h1("11. Cost of Cultivation and Carbon Emission Tracking"))

story.append(h2("11.1 Detailed Cost of Cultivation Framework"))
story.append(p(
    "A comprehensive cost of cultivation module must be built from the ground up, as the current "
    "platform has no cost tracking infrastructure. This module serves multiple stakeholders: farmers "
    "need to understand their per-unit production costs to negotiate better prices, cooperatives need "
    "aggregate cost data for bulk procurement planning, financial institutions need cost data for "
    "credit risk assessment and loan sizing, and certification bodies require cost transparency as "
    "part of sustainability verification. The module should track costs across eleven standard "
    "categories defined by the Food and Agriculture Organization (FAO) cost of production framework: "
    "land rent or opportunity cost, seed and planting material costs, fertilizer and soil amendment "
    "costs, crop protection (pesticides, herbicides, fungicides) costs, labor costs (hired and family), "
    "machinery and equipment costs (ownership and operating), irrigation costs (water charges, pump "
    "fuel, maintenance), post-harvest handling costs (harvesting, transport, drying, storage), "
    "processing costs (milling, hulling, grading, packaging), marketing costs (transport to market, "
    "commissions, quality testing), and financing costs (interest on working capital loans)."
))
story.append(p(
    "The cost tracking should be implemented at the individual farm plot level and aggregated upward "
    "to the farmer, group, cooperative, and tenant levels. Each cost entry should be linked to a "
    "specific crop stage in the cultivation calendar (land preparation, planting, vegetative growth, "
    "flowering, fruit development, harvesting, post-harvest), enabling analysis of cost distribution "
    "across the production cycle. The module should support both actual cost recording (entered by "
    "farmers or agents) and standard cost budgets (pre-defined cost templates by crop and region), "
    "with variance analysis highlighting where actual costs exceed budgets by more than a configurable "
    "threshold. Integration with the input aggregation module allows automatic cost capture when inputs "
    "are procured through the platform, reducing manual data entry burden on farmers."
))

story.append(h2("11.2 Carbon Emission Tracking Per Crop Calendar Stage"))
story.append(p(
    "The CBAM compliance requirement demands a granular, stage-by-stage carbon emission tracking system "
    "that goes far beyond the current static CbamReport model. The system must calculate greenhouse "
    "gas emissions using IPCC Tier 2 methodology with country-specific emission factors for Uganda, "
    "Ghana, and Kenya. Each stage of the crop calendar produces different types and quantities of "
    "greenhouse gas emissions that must be tracked separately and aggregated into a total product "
    "carbon footprint. The platform must track carbon dioxide (CO2), methane (CH4), and nitrous "
    "oxide (N2O) emissions, converting each to CO2 equivalent using IPCC global warming potential "
    "factors (CH4: 28, N2O: 265)."
))
story.append(p(
    "The carbon tracking framework should implement emission calculation for each crop stage. During "
    "land preparation, emissions come from machinery fuel combustion (using IPCC Tier 1 emission "
    "factors for diesel: 2.68 kg CO2 per liter) and soil carbon release from tillage. During the "
    "growing season, nitrogen fertilizer application is the dominant emission source through both "
    "direct N2O emissions from soil (IPCC default: 1% of applied N) and indirect emissions from "
    "volatilization (10% of applied N as NH3, with 1% converted to N2O) and leaching (30% of "
    "applied N leached, with 0.75% converted to N2O). During harvesting, emissions come from "
    "transport and processing energy. Post-harvest processing (drying, milling) contributes "
    "significant emissions from energy consumption, particularly for coffee where sun-drying may "
    "be supplemented by mechanical drying. Transportation emissions are calculated using distance-based "
    "methodology with vehicle-type-specific emission factors."
))

story.append(make_table(
    ["Crop Stage", "Primary Emission Sources", "GHG Type", "IPCC Methodology"],
    [
        ["Land Preparation", "Machinery fuel, soil carbon release", "CO2, N2O", "Tier 1: fuel combustion factors"],
        ["Input Application", "Fertilizer manufacturing, N2O from soil", "CO2, N2O", "Tier 2: country-specific N factors"],
        ["Crop Growth", "Soil N2O, CH4 from flooded areas", "N2O, CH4", "Tier 2: climate-adjusted factors"],
        ["Harvesting", "Labor transport, machinery", "CO2", "Tier 1: distance x emission factor"],
        ["Post-Harvest", "Drying energy, milling, processing", "CO2", "Tier 2: energy consumption x grid factor"],
        ["Transport", "Truck/ship fuel to port", "CO2", "Tier 1: tonne-km methodology"],
        ["Storage", "Warehousing energy, spoilage waste", "CO2, CH4", "Tier 2: facility-specific factors"],
    ],
    [CONTENT_W*0.15, CONTENT_W*0.32, CONTENT_W*0.12, CONTENT_W*0.33]
))
story.append(Paragraph("Table 8: Carbon emission tracking framework by crop calendar stage", s_caption))
story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════════
# CHAPTER 12: SIGNATURE DIFFERENTIATORS
# ═══════════════════════════════════════════════════════════════════════════════
story.append(h1("12. Signature Differentiators and Unique Value Proposition"))

story.append(h2("12.1 What Makes Agrobase Unique"))
story.append(p(
    "In a crowded African agritech landscape populated by platforms like Twiga Foods, Apollo Agriculture, "
    "Thrive Agric, and Tulaa, Agrobase V3 must establish clear differentiators that justify customer "
    "adoption and premium pricing. The platform's unique value proposition rests on five pillars that "
    "no single competitor currently offers in an integrated package. First, the multi-standards "
    "compliance engine that simultaneously manages EUDR, CBAM, Rainforest Alliance, GLOBALG.A.P., "
    "Organic, and Fairtrade certifications from a single data source, eliminating the redundant data "
    "collection that currently burdens exporters like EKIBBO. Second, the satellite-powered farm "
    "intelligence system that provides free, historical, plot-level earth observation data for "
    "deforestation verification, crop health monitoring, and carbon estimation without requiring "
    "farmers to invest in expensive monitoring equipment."
))
story.append(p(
    "Third, the integrated cooperative ERP that unifies financial management, member administration, "
    "produce aggregation, quality management, and compliance reporting in a single platform, replacing "
    "the patchwork of spreadsheets, paper records, and disconnected software tools that cooperatives "
    "currently use. Fourth, the financial identity and credit infrastructure that builds a comprehensive "
    "financial profile for each farmer by aggregating data from VSLA savings behavior, marketplace "
    "transaction history, loan repayment performance, input purchase patterns, and crop production "
    "records, creating an alternative credit score that is more relevant for smallholder farmers "
    "than traditional banking metrics. Fifth, the multi-channel accessibility through web, mobile "
    "app, USSD, IVR, and SMS ensures that every stakeholder, from the most digitally literate "
    "exporter to the most remote smallholder farmer, can access the platform through their preferred "
    "channel."
))

story.append(h2("12.2 The 'Ultra Legend Agritech' Signature Touch"))
story.append(p(
    "The platform owner's vision for a signature product demands features that transcend functional "
    "utility and enter the realm of industry-defining innovation. The following signature features "
    "should be developed as the platform's defining capabilities that no competitor can easily "
    "replicate. The 'Digital Farm Passport' concept should create a unique, blockchain-anchored "
    "digital identity for every farm plot that contains its complete history: ownership records, "
    "land use changes (verified by satellite), crop rotation history, input application records, "
    "yield data, quality assessments, compliance status, and carbon footprint. This passport travels "
    "with the produce through the entire value chain, allowing any buyer, certifier, or regulator "
    "to scan a QR code and access the complete provenance story."
))
story.append(p(
    "The 'Predictive Compliance Intelligence' feature should use the accumulated compliance data "
    "across all tenants to predict which farms or cooperatives are at risk of failing upcoming "
    "audits, based on patterns in historical inspection findings, satellite-detected anomalies, "
    "and input application records. This moves compliance from reactive (fixing problems after "
    "audit failures) to proactive (identifying and resolving issues before audits). The 'Financial "
    "Inclusion Score' should combine traditional credit scoring with alternative data sources "
    "(mobile money transactions, airtime purchase patterns via telco partnerships, utility payment "
    "history) to create a financial identity for unbanked farmers, enabling them to access formal "
    "financial services for the first time. These signature features, combined with the platform's "
    "comprehensive module coverage and multi-country deployment, position Agrobase not as another "
    "agritech tool but as the operating system for African agricultural value chains."
))
story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════════
# CHAPTER 13: IMPLEMENTATION ROADMAP
# ═══════════════════════════════════════════════════════════════════════════════
story.append(h1("13. Implementation Roadmap and Priority Matrix"))

story.append(h2("13.1 Phased Delivery Plan"))
story.append(p(
    "The implementation of all identified gaps must follow a prioritized, phased approach that "
    "balances business impact, technical dependencies, and resource constraints. The roadmap is "
    "organized into four phases spanning approximately 18 months, with each phase delivering "
    "a coherent set of capabilities that can be deployed independently. Phase 1 (Months 1-3) "
    "focuses on critical security and infrastructure fixes that must be completed before any "
    "production deployment: bcrypt password hashing, JWT middleware on all API routes, tenant "
    "data isolation, PostgreSQL migration, RBAC implementation, and CI/CD pipeline setup. These "
    "are non-negotiable prerequisites that unblock all subsequent work."
))
story.append(p(
    "Phase 2 (Months 3-6) delivers the core business value: Flutter mobile application with "
    "offline sync, payment gateway integration (mPay, aIntel, mobile money), billing engine "
    "with subscription management, cooperative ERP foundation (accounting, member equity), "
    "and data migration tooling for V1-to-V3 transition. Phase 3 (Months 6-12) builds the "
    "differentiating features: satellite intelligence integration, EUDR automated verification, "
    "CBAM carbon tracking engine, cost of cultivation module, certification management workflows, "
    "and advanced credit scoring with alternative data. Phase 4 (Months 12-18) completes the "
    "ecosystem: signature features (Digital Farm Passport, Predictive Compliance), multi-channel "
    "production deployment (real USSD/IVR/SMS), API marketplace for third-party integrations, "
    "white-label licensing infrastructure, and carbon credit project management."
))

story.append(make_table(
    ["Phase", "Timeline", "Key Deliverables", "Dependencies"],
    [
        ["Phase 1: Foundation", "Months 1-3", "Security hardening, RBAC, PostgreSQL, CI/CD, tenant isolation", "None"],
        ["Phase 2: Core Business", "Months 3-6", "Flutter app, payments, billing, cooperative ERP, V1 migration", "Phase 1"],
        ["Phase 3: Intelligence", "Months 6-12", "Satellite, EUDR automation, CBAM engine, cost of cultivation", "Phase 2"],
        ["Phase 4: Ecosystem", "Months 12-18", "Digital Passport, API marketplace, white-label, carbon credits", "Phase 3"],
    ],
    [CONTENT_W*0.15, CONTENT_W*0.14, CONTENT_W*0.42, CONTENT_W*0.15]
))
story.append(Paragraph("Table 9: Four-phase implementation roadmap", s_caption))

story.append(sp(10))

story.append(h2("13.2 Critical Path and Dependencies"))
story.append(p(
    "Several dependencies create a critical path that must be carefully managed to avoid delays. "
    "The PostgreSQL migration is a prerequisite for PostGIS spatial queries, which are required "
    "for satellite imagery correlation with farm polygons. The RBAC implementation is a prerequisite "
    "for the banking portal, as financial institutions require strict access controls before they "
    "will trust the platform with sensitive loan portfolio data. The Flutter mobile app depends "
    "on the API authentication middleware being in place. The satellite intelligence module depends "
    "on the farm polygon data being accurate and complete, which requires the data migration from "
    "V1 to be finished first. The EUDR automated verification depends on both the satellite module "
    "and the deforestation detection pipeline. Understanding and managing these dependencies is "
    "essential for maintaining the roadmap timeline."
))
story.append(p(
    "The total estimated effort for closing all identified gaps across the 12 categories and 85 "
    "action items is approximately 24-30 person-months of development work, assuming a team of "
    "4-6 senior developers. This estimate includes development, testing, documentation, and "
    "deployment for each phase but does not include ongoing maintenance, customer support, or "
    "further feature development after Phase 4. The platform owner should consider the build versus "
    "buy decision for certain components: the billing engine could leverage existing SaaS billing "
    "platforms (Stripe Billing, Chargebee) rather than building from scratch, and the satellite "
    "imagery processing could leverage existing APIs (Sentinel Hub, Google Earth Engine) rather "
    "than building a custom processing pipeline. These decisions would reduce development time "
    "but introduce external dependencies and ongoing costs."
))

story.append(sp(20))
story.append(hr())
story.append(Paragraph(
    "This gap analysis document represents a comprehensive audit of the Agrobase V3 platform "
    "as of June 2026. It identifies 85+ action items across 12 critical dimensions, providing "
    "the strategic roadmap needed to transform the current prototype into a production-grade, "
    "revenue-generating agricultural management ecosystem serving Uganda, Ghana, and Kenya. "
    "The analysis reflects the perspective of a platform owner and chief architect focused on "
    "business sustainability, technical excellence, and market differentiation.",
    ParagraphStyle('Closing', parent=s_body, textColor=TEXT_MUTED, fontName='Inter-Italic',
                   spaceBefore=12)
))

# ─── BUILD PDF ──────────────────────────────────────────────────────────────────
OUTPUT_PATH = '/home/z/my-project/scripts/body_gap.pdf'

doc = MyDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=MARGIN,
    rightMargin=MARGIN,
    topMargin=MARGIN,
    bottomMargin=0.8*inch,
    title="Agrobase V3 Platform Gap Analysis",
    author="MobiPay AgroSys Limited",
    subject="Strategic Architecture Review - Gap Analysis",
)

doc.multiBuild(story, onLaterPages=footer_arabic, onFirstPage=footer_arabic)
print(f"Body PDF generated: {OUTPUT_PATH}")