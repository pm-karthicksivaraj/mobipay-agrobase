# Agrobase SaaS Pricing, Architecture & Infrastructure Plan

**Prepared for:** MobiPay AgroSys Limited — Founder & Engineering Review
**Scope:** Multi-tenant SaaS pricing model, terms of service framework, full architecture (data, workflow, payment flows), and cloud infrastructure cost comparison
**Date:** June 2026

---

## 1. Pricing model — what we charge, and on what basis

The core principle: **different actor types create value differently, so they should be charged differently.** A flat per-tenant fee leaves money on the table from high-volume actors (exporters, banks) and overcharges low-volume ones (small cooperatives).

### 1.1 Pricing by actor type

| Actor type | Pricing basis | Billing trigger |
|---|---|---|
| NGO / development programme | Recurring subscription (per module bundle) | Monthly or annual, billed in advance |
| Cooperative | Recurring subscription (tiered by member count) | Monthly, billed in advance |
| Agribusiness (e.g. Nile Breweries) | Subscription + per-farmer activity fee | Monthly base + usage-based add-on, billed in arrears for usage |
| Trader / exporter | Transaction fee on marketplace activity + optional subscription for premium access | Per transaction, deducted at settlement |
| Input supplier | Listing fee + transaction commission | Per listing (flat) + per completed sale (%) |
| Processing company | Subscription (traceability/intake module) + per-batch fee | Monthly + per processing batch logged |
| Microfinance institution / bank | Per-query fee for credit score API + origination fee on loans facilitated | Per API call (metered) + % of loan value disbursed |
| Individual farmer (direct) | Freemium core + paid add-ons (advisory, premium marketplace access) | Monthly micro-subscription via mobile money |

### 1.2 Marketplace — how we earn without owning inventory

This is the piece worth being precise about, since it's structurally different from the subscription streams.

**MobiPay never takes title to goods.** We are not a buyer or reseller — we are the platform that connects a seller (farmer, cooperative) to a buyer (trader, exporter, processor) and **we get paid at the moment money changes hands, not the moment goods change hands.**

The revenue components on every marketplace transaction:

1. **Platform/transaction fee** — a percentage (recommend 1.5–3%) of the transaction value, deducted automatically at settlement. This is the core marketplace revenue line.
2. **Payment processing fee** — a smaller percentage (0.5–1%) covering the cost of moving money through mobile money or bank rails. This can be passed through near-cost or marked up slightly.
3. **Listing fee (optional)** — a flat fee for input suppliers or exporters to list products/sourcing requests prominently. Useful for B2B-heavy categories where transaction volume alone won't generate enough revenue.
4. **Premium placement / featured listing fee** — sellers or buyers pay extra for visibility (top of search, featured badge).
5. **Verified buyer/seller fee** — a one-time or annual fee for compliance-verified status (EUDR-ready, GAP-certified) — valuable because it lets a buyer filter by verified-compliant sellers only.

**When do we actually get paid?** At settlement — not at order placement, and not at delivery. The flow (see diagram above) is:

1. Buyer pays the full order value into an **escrow account** (held by MobiPay's payment partner or a regulated trust account — MobiPay does not custody funds directly without the appropriate licensing).
2. Seller delivers the goods.
3. Buyer confirms receipt (or funds auto-release after a defined grace period, e.g. 5–7 days, to prevent buyers withholding confirmation indefinitely).
4. The **settlement engine** deducts MobiPay's platform fee and payment processing fee from the escrowed amount.
5. The **net amount** is released to the seller via mobile money or bank transfer.

This is the same structural pattern used by Jumia, Alibaba's trade assurance, and most B2B agri-marketplaces — the platform is a paid intermediary at the payment layer, never a counterparty in the trade itself.

### 1.3 Indicative pricing — first cut

| Stream | Suggested rate |
|---|---|
| NGO/programme subscription | $500–$2,000/month, tiered by module count and farmer volume |
| Cooperative subscription | $50–$200/month, tiered by member count |
| Agribusiness subscription | $2,000–$8,000/month base + $0.50–$2 per farmer activity logged |
| Marketplace transaction fee | 1.5–3% of transaction value |
| Payment processing fee | 0.5–1% of transaction value |
| Listing fee | $5–$50 per listing, depending on category |
| Credit score API query | $0.50–$2.00 per query |
| Loan origination fee | 1–3% of disbursed loan value |
| Verified compliance status fee | $20–$100/year per verified plot or batch |

---

## 2. Terms and conditions — framework

This is not a substitute for legal drafting — MobiPay should have this reviewed by counsel in each operating country — but the commercial terms below are the structure to put in front of a lawyer.

### 2.1 Subscription terms (NGOs, cooperatives, agribusiness)
- **Billing cycle**: monthly or annual, in advance. Annual commitments should carry a discount (10–15%) to improve cash flow predictability.
- **Module changes**: tenants can upgrade modules immediately (prorated charge); downgrades take effect at the next billing cycle (no mid-cycle refunds).
- **Data ownership**: the tenant owns the data they input; MobiPay has a license to process it for service delivery, aggregated analytics, and (with consent) credit scoring/third-party sharing.
- **Termination**: either party may terminate with 30 days' notice; tenant data is exportable for 90 days post-termination, then deleted per data protection law.
- **SLA**: uptime commitment (recommend 99.5% for paid tiers), defined support response times by tier.

### 2.2 Marketplace terms (traders, exporters, input suppliers)
- **Escrow terms**: funds are held until delivery confirmation or auto-release after the grace period; disputes pause auto-release pending resolution.
- **Fee disclosure**: platform fee and payment processing fee disclosed upfront on every transaction — no surprise deductions at settlement.
- **Dispute resolution**: a defined process (claim window, evidence submission, MobiPay mediation) before funds are released or returned.
- **Liability**: MobiPay is a facilitator, not a party to the underlying sale contract — quality, delivery, and compliance disputes are between buyer and seller, with MobiPay providing the traceability/evidence record but not guaranteeing the goods.
- **Compliance representations**: sellers attest to the accuracy of compliance data (EUDR, GAP status); MobiPay is not liable for fraudulent attestations but should have a verification/audit mechanism for high-value or flagged transactions.

### 2.3 Financial institution terms (banks, MFIs)
- **Data access scope**: explicit, farmer-consented scope of data shared (credit score output, not raw transaction history, unless separately agreed).
- **Query-based billing**: metered API usage, invoiced monthly in arrears, with a defined dispute window for contested queries.
- **No guarantee of creditworthiness**: MobiPay provides a score based on defined inputs; lending decisions and associated risk remain with the financial institution.

### 2.4 Data protection commitments (applies to all tenants)
- Compliance with Uganda's Data Protection and Privacy Act, Ghana's Data Protection Act, and Kenya's Data Protection Act, as applicable per tenant's operating country.
- Farmer consent is explicit, revocable, and tracked per data-sharing purpose (e.g. consent to share with Bank X is separate from consent to receive SMS advisories).
- Data breach notification commitments per local law (typically 72 hours).

---

## 3. Full multi-tenant architecture — data, workflow, and payment flows

*(see the two diagrams above for the visual reference)*

### 3.1 Data flow
Field data originates at the mobile app layer (farmer registration, cultivation logs, harvest records, marketplace listings), captured offline-first and synced when connectivity is available. Every request passes through a **tenant-scoped API gateway**, which validates both the tenant's identity and which modules that tenant is entitled to before any request reaches a service — this is the enforcement point for the SaaS model, not just a security gate.

Validated changes are published to a shared **event bus**, every event tagged with `tenant_id`. Downstream services (compliance engine, credit scoring, marketplace/settlement) consume events independently, each writing back to a **tenant-isolated data layer** using row-level security keyed by `tenant_id`. MobiPay's super admin sits above all tenants with a **federated view** — able to query and monitor across every country and tenant without each tenant being able to see another's data.

### 3.2 Workflow — onboarding a new tenant
This is the operational workflow that makes "just create a new tenant" actually true in practice:

1. Super admin creates a new tenant record (name, country, tenant type — NGO/cooperative/exporter/etc.).
2. Super admin assigns a **module bundle** from the catalog (e.g. Training + Survey for an NGO; Marketplace + Compliance for an exporter).
3. The billing engine auto-generates a subscription plan matching the assigned modules and tenant tier.
4. Tenant admin account is provisioned; tenant admin can then onboard their own users (farmers, agents, staff) within their tenant scope.
5. First invoice is generated per the agreed billing cycle; module access activates on payment confirmation (or on a defined trial period, if offered).
6. Ongoing: module changes, billing changes, and usage are all visible to both the tenant admin (their own data) and the super admin (cross-tenant view).

### 3.3 Payment flow — by revenue type
- **Subscription revenue**: charged automatically per billing cycle via mobile money, card, or bank transfer integrated into the billing engine; failed payments trigger a grace period then module suspension.
- **Marketplace revenue**: captured at settlement, as described in Section 1.2 — MobiPay's fee is deducted from the escrowed transaction amount, never invoiced separately to the seller.
- **Credit score API revenue**: metered per query, invoiced monthly in arrears to the financial institution tenant.
- **Loan origination revenue**: deducted from the disbursed loan amount at the point of disbursement, per the agreement with the partner MFI/bank.

---

## 4. Infrastructure cost — monthly CapEx/OpEx estimate

These are **indicative, planning-stage estimates** for a platform at early-to-mid scale (roughly 300k farmers, growing into Ghana/Kenya, with marketplace and compliance workloads live). Actual costs should be validated with a proof-of-concept load test before committing to a provider.

### 4.1 Estimated monthly cloud spend by growth stage

| Stage | Description | Estimated monthly cost (USD) |
|---|---|---|
| MVP / Phase 1 | Core services, single region, Uganda only, low traffic | $800–$1,500 |
| Growth / Phase 3–4 | Multi-service, compliance engine, satellite processing, marketplace live | $3,000–$7,000 |
| Multi-country scale | 3 countries live, full traceability + blockchain anchoring, high mobile sync volume | $8,000–$18,000 |

These ranges include compute (Kubernetes cluster), managed database, object storage, event streaming, CDN, monitoring/logging, and reasonable data transfer — they exclude third-party API costs (satellite imagery provider, SMS gateway, mobile money transaction fees) which are typically usage-based and billed separately.

### 4.2 AWS vs GCP vs Azure — comparison for this workload

| Factor | AWS | GCP | Azure |
|---|---|---|---|
| Managed Kubernetes | EKS — mature, widest ecosystem | GKE — generally regarded as the most polished/easiest to operate | AKS — solid, strong if already in Microsoft ecosystem |
| Managed PostgreSQL + PostGIS | RDS for PostgreSQL — full PostGIS support | Cloud SQL for PostgreSQL — full PostGIS support | Azure Database for PostgreSQL — full PostGIS support |
| Geospatial / satellite tooling | Strong via partner ecosystem (no native Earth Observation product) | Google Earth Engine — significant advantage for satellite/deforestation analysis, directly relevant to EUDR monitoring | Azure Planetary Computer — also strong geospatial offering, newer |
| Event streaming (Kafka) | MSK (managed Kafka) | Confluent Cloud or self-managed on GKE | Event Hubs (Kafka-compatible) or self-managed |
| Africa region presence | Cape Town region (closest to East Africa) | No dedicated Africa region — routes via Europe | No dedicated Africa region in East Africa — routes via Europe/UAE |
| Pricing transparency | Complex but well-documented, many cost calculators | Generally considered most cost-predictable, sustained-use discounts automatic | Comparable to AWS in complexity |
| Mobile money / fintech partner ecosystem | Largest ecosystem of African fintech integrations and case studies | Smaller footprint in African fintech specifically | Smaller footprint in African fintech specifically |
| Best fit for this platform | Strongest overall ecosystem maturity + closest regional presence (Cape Town) | Strongest fit if satellite/EUDR monitoring via Earth Engine is a priority — meaningfully reduces build effort there | Reasonable if there's an existing Microsoft/Azure relationship, otherwise no compelling edge for this specific workload |

**Recommendation**: **AWS** is the safer default given its Cape Town region (lowest latency for East African users) and the largest base of African fintech/mobile-money integration patterns to draw from. However, if the satellite/EUDR deforestation monitoring workload turns out to be a major engineering lift, it is worth pricing out a **hybrid approach** — core platform on AWS, satellite/Earth Observation processing on GCP via Google Earth Engine, which has no real equivalent in AWS or Azure's native tooling. This hybrid pattern is common in agri-tech specifically for this reason.

### 4.3 CapEx vs OpEx framing

Cloud infrastructure of this kind is structurally **OpEx, not CapEx** — there is no large upfront infrastructure purchase. The "capital" investment is primarily:
- **Engineering build cost** (the team and time to build the platform — this is the real capital outlay, not the cloud bill)
- **Initial cloud spend during the build phase** (Phase 1–2, before any tenants are paying) — budget $800–$3,000/month during this period, before marketplace and multi-country workloads add cost
- **Third-party licensing/API setup costs** (satellite imagery provider contracts, blockchain infrastructure if not self-hosted, payment gateway integration fees) — typically one-time setup fees plus usage-based ongoing cost

The cloud bill becomes self-funding once subscription and transaction revenue covers it — at the Phase 3–4 stage ($3,000–$7,000/month), even a modest 10–15 paying enterprise tenants at the subscription rates in Section 1.3 covers infrastructure cost with margin to spare.

---

## 5. Summary

The pricing model charges each actor type on the basis that matches how they extract value — subscription for steady platform access, transaction fees for marketplace activity, metered fees for credit scoring API access. The marketplace specifically earns through an escrow-and-settlement model: MobiPay is paid at the moment of settlement, taking a platform fee and processing fee out of funds already collected from the buyer, without ever holding inventory or taking trade risk.

The multi-tenant architecture enforces this pricing model technically, not just commercially — module entitlement and billing are the same system, so assigning a tenant a module bundle is what generates their invoice. Infrastructure cost scales with usage (OpEx), starting under $1,500/month and growing into the $8,000–$18,000/month range only once the platform is generating revenue at multi-country scale to cover it.

---

*MobiPay AgroSys Limited | Internal Technical & Commercial Document | June 2026*
