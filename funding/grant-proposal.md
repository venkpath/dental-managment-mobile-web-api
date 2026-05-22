# Smart Dental Desk — Grant Funding Proposal
**AI-Enabled Dental Practice Management & Patient Engagement Platform**

> Pre-seed / Seed round — Canadian healthcare AI commercialization
> Prepared: 2026-05-22 · Version 1.0
> *(Placeholders marked `[TBD]` — fill before submission.)*

---

## 1. Executive Summary

Smart Dental Desk is a production-ready, AI-enabled dental practice management platform that automates clinical documentation, reduces no-shows, and surfaces operational insights — built on a country-agnostic architecture ready for Canadian commercialization.

The platform combines a NestJS multi-tenant backend, a Next.js web application, and a React Native mobile app for clinicians on the go. It is already deployed with paying clinics in a pilot market (India) and is structurally ready to onboard Canadian dental practices via a pluggable insurance/regulatory strategy layer (CDCP and Sun Life Canada providers already seeded).

Seven AI features are live in production — including AI-assisted clinical notes, prescription generation with safety checks, treatment plan synthesis, dental chart analysis, and a rules-based patient insights engine — all powered by Anthropic Claude and OpenAI APIs with prompt-cache cost optimization.

**Funding ask:** `[CAD $TBD]` over `[TBD months]` to (a) complete Canadian regulatory adaptation (PIPEDA, PHIPA, CDA standards), (b) execute a 3-clinic pilot in Ontario/British Columbia, and (c) launch commercialization.

---

## 2. Primary Objectives

Aligned with the program's commercialization and productivity criteria:

| # | Objective | Measurable Target | Status |
|---|-----------|------------------|--------|
| 1 | Reduce dental administrative workload | **40%** reduction vs. baseline | MVP shipped, pilot data pending |
| 2 | Reduce appointment no-shows | **30%** reduction | AI Insights + WhatsApp reminders live |
| 3 | Improve clinic operational efficiency | **25%** improvement | Dashboards + automation cron in production |
| 4 | Automate clinical documentation | Voice + AI-generated SOAP notes | 5 of 7 modules live; voice in roadmap |
| 5 | Deploy AI patient-engagement systems | Campaigns + WhatsApp + insights | Live in production |
| 6 | Commercialize scalable Canadian healthcare AI | First Canadian clinic by `[Q+TBD]` | Architecture ready; pilot pending |

---

## 3. Problem Statement

Canadian dental practices face four compounding pressures:

1. **Administrative overload.** Front-desk staff spend 30–45% of their shift on appointment management, recall calls, insurance pre-authorization paperwork, and post-visit follow-up — work that is repetitive and rules-based.
2. **No-show economics.** Industry estimates put no-show cost at CAD $150–$250 per missed slot. A typical 3-operatory clinic loses CAD `[$TBD]`/year to no-shows alone.
3. **Clinical documentation burden.** Dentists spend an average of 30 minutes per day re-typing the same SOAP-note phrasings and prescriptions; mid-career clinicians cite documentation as a top-3 burnout driver (CDA practice surveys).
4. **Fragmented software stack.** Most existing PMS tools (Dentrix, ABELDent, ClearDent) were architected pre-2010, run on local servers, lack first-class AI, and charge enterprise prices that lock out independent practices.

The opportunity: a cloud-native, AI-first platform that ships as a single integrated product — patient management + clinical + billing + insurance + AI + patient engagement — at a price point accessible to single-chair clinics.

---

## 4. Solution Overview

Smart Dental Desk is a fully integrated SaaS platform delivered across three surfaces:

### 4.1 Web application (clinic operations)
Full-featured Next.js application covering:
- Patient master + medical history + dental chart
- Appointment scheduling with conflict detection and recall automation
- Clinical visit / consultation flows (SOAP notes, examinations, diagnoses)
- Treatment plans with phases, urgency tiers, alternatives, and cost projections
- Prescriptions with drug-interaction safety checks
- Inventory + medicine stock management
- Invoicing, payments, GST/tax, expense tracking
- Insurance empanelment, pre-authorization, claims, reimbursement allocation
- Multi-channel patient communication: Email, SMS, WhatsApp, in-app
- Marketing campaigns + referral tracking + feedback collection

### 4.2 Mobile application (clinician-facing)
React Native (Expo) app — patient lookup, appointment view, treatment notes, prescriptions, billing, and WhatsApp inbox from the dentist's phone.

### 4.3 AI feature suite (live in production)
1. **AI Clinical Notes** — generates structured SOAP notes from short prompts; populates the same `ClinicalVisit` model as manual entry.
2. **AI Treatment Plan** — generates multi-phase treatment plans with urgency, alternatives, and cost.
3. **AI Prescription** with safety checks — patient-allergy, age, pregnancy, and drug-interaction aware; inventory-aware (prescribes from clinic stock first).
4. **AI Dental Chart Analyzer** — Claude/GPT-4 vision: analyzes uploaded dental charts and X-ray images (assistive, not diagnostic).
5. **AI Revenue Insights** — surfaces revenue anomalies and growth levers from billing data.
6. **AI Appointment Summary** — post-visit summarization.
7. **AI Campaign Content Generator** — drafts multi-language patient campaigns.

A nightly batch computes **Patient Insight Scores** (no-show risk, recall due, churn risk, conversion likelihood) using rules-based scoring in PostgreSQL — zero AI cost on page load, with LLM reserved for on-click "explain" actions.

### 4.4 Integrations live today
- Razorpay (will be paired with Stripe/Moneris for Canada)
- WhatsApp Cloud API (Meta-approved, embedded signup in progress)
- Email (transactional + campaign)
- File uploads (S3-compatible)
- OpenAI + Anthropic Claude

---

## 5. AI Relevance — Real AI, Not Basic Automation

The program asks for "real AI, not basic automation." Our AI surface:

| Capability | Underlying technique | Why this is real AI |
|---|---|---|
| Clinical note generation | LLM (Claude Sonnet/Opus + OpenAI GPT-4) with structured JSON output schemas | Context-aware generation across patient history, allergies, current complaints — not template substitution |
| Treatment plan synthesis | LLM chain-of-thought with phase/urgency/alternative reasoning | Generates multi-row `TreatmentPlan` + `TreatmentPlanItem` records with internal consistency |
| Prescription safety | LLM + structured inventory lookup + drug-interaction rules | Combines symbolic medical knowledge with retrieval-augmented generation |
| Dental chart vision | LLM vision (Claude vision, GPT-4V) | Image understanding on radiographs and intraoral photos |
| Voice-to-consultation (roadmap) | OpenAI Whisper + LLM extraction | Speech recognition → structured EHR fields |
| Patient insights scoring | Rules-based ML-lite scoring in DB; LLM for explanations | Hybrid: deterministic scoring for cost control, LLM for reasoning |
| Cost optimization | Anthropic prompt caching (90% token-cost reduction on repeated patient context) | Production-grade engineering, not a demo |

**Deliberate exclusion of fake AI.** We do not claim ML-trained no-show predictors, inventory forecasters, or revenue anomaly classifiers — those require training infrastructure and data scale we do not yet have. Where these features appear in the product, they are honestly labeled as rules-based scoring or LLM-explained heuristics.

---

## 6. Productivity & Operational Impact

| Metric | Baseline (typical Canadian solo practice) | With Smart Dental Desk (target) | Mechanism |
|---|---|---|---|
| Front-desk admin hours/day | 4–5 hrs | 2.5–3 hrs (**40% reduction**) | Recall automation, WhatsApp/SMS reminders, AI-generated communication |
| No-show rate | 12–18% | 8–12% (**30% reduction**) | Multi-channel reminders + no-show risk scoring + auto-fill from waitlist |
| Documentation time per patient | 8–10 min | 3–5 min (**50% reduction**) | AI clinical notes + voice (roadmap) |
| Prescription error rate | Industry baseline | Safety-checked at point of write | Allergy/interaction/age guardrails |
| Insurance claim turnaround | 14–21 days | `[TBD pilot data]` | Pre-auth workflow + claim status tracking + reimbursement allocation |
| Patient lifetime value | Baseline | +15–25% target | Recall + churn-risk surfacing + conversion of pending plans |

Targets above will be validated in the Canadian pilot (Section 9).

---

## 7. Technical Readiness — MVP, Pilot, and Feasibility

### 7.1 Current development phases (completed)
| Phase | Scope | Status |
|---|---|---|
| Phase 1 | NestJS + Prisma + PostgreSQL backend; multi-tenant; RBAC; subscriptions; AI quota | ✅ 100% (365+ tests) |
| Phase 2 | Next.js web app — full CRUD, dental chart, invoices, reports, AI features | ✅ 100% |
| Phase 2.5 | Frontend hardening — column visibility, exports, virtual scrolling, Vitest + Playwright | ✅ 100% |
| Phase 3 | Communication — email, in-app, campaigns, automation crons, feedback, WhatsApp | ✅ ~85% |
| Phase 4 | Production readiness — Docker, CI/CD, Helmet, CSRF, backup, payments, landing page | ✅ 100% |
| Phase 5 | AI features — 7 features in production, feature-guarded with quota enforcement | ✅ 100% |
| Phase 6 | React Native (Expo) mobile app | ✅ Complete |
| Phase 7 | Insurance & EHS module — 11 Prisma models, country-agnostic strategy pattern | ✅ Backend complete; frontend in progress |

### 7.2 Architecture highlights
- **Country-agnostic insurance/regulatory layer.** A `CountryStrategy` pattern in the insurance module means Canada plugs in as a new strategy class without schema changes. Canadian providers (CDCP, Sun Life Canada) are already seeded.
- **Multi-tenant by design.** Every entity is scoped by `clinic_id` with row-level enforcement; supports single clinics through multi-branch chains.
- **Feature flags + plan-gated AI quotas.** Each AI feature is gated by both subscription plan and per-clinic quota; no surprise bills.
- **Production hardening.** Helmet, CSRF, rate limiting, automated DB backup, structured logging, observability hooks.

### 7.3 Security & compliance posture
Current state is production-grade for India. For Canadian deployment we will complete:
- PIPEDA & PHIPA alignment (data residency, consent, breach notification)
- Canadian-region cloud hosting (AWS Canada Central or Azure Canada Central)
- SOC 2 Type I (Year 1) → Type II (Year 2)
- Penetration testing + remediation of open code-review findings (15 items currently tracked — full list in internal `code_review_critical_issues` register, all non-blocking but slated for hardening sprint)

---

## 8. Collaboration & Consortium Plan

The program rewards consortium structure. Proposed partners:

| Partner type | Role | Status |
|---|---|---|
| **Academic** — Canadian dental school (Schulich / U of T / UBC) | Clinical validation, research publication, resident training program | `[Outreach planned]` |
| **Clinical** — Multi-location DSO or independent dentist association | Pilot deployment, real-world data, advisory board | `[Identifying 3 candidates]` |
| **Technology** — Canadian cloud + AI infra partner | Hosting, Canadian data residency, MLOps support | `[AWS / Azure CSP engagement]` |
| **Regulatory** — Privacy/compliance consultancy | PIPEDA/PHIPA audit + ongoing compliance | `[Quote in progress]` |
| **Advisor** — Practicing Canadian dentist + dental industry vet | Product-market-fit oversight, intro pipeline | `[1 identified, 2 in pipeline]` |

Letters of intent / collaboration MOUs to be appended in Annex A.

---

## 9. Commercialization Plan

### 9.1 Pricing (initial Canadian model)
Mirrors the validated 3-tier structure already running in India, repriced for Canada:

| Plan | India price (validated) | Canada price (proposed) | Positioning |
|---|---|---|---|
| Free | ₹0 | CAD $0 | Try-before-buy; 1 doctor cap |
| Standard | ₹699/mo (~CAD $11) | CAD `$49–69`/mo `[TBD]` | Solo/duo practice |
| Growth | ₹1,299/mo (~CAD $21) | CAD `$99–149`/mo `[TBD]` | Multi-op + automation + own WhatsApp Business |
| Enterprise (sales-led) | Custom | Custom | DSO / multi-branch chains |

Pricing rationale: existing Canadian competitors charge CAD $200–500+/op/month. Our cloud-native cost structure plus AI quota model allows aggressive entry pricing.

### 9.2 Go-to-market sequencing
**Year 1 (post-funding):**
- Q1: Canadian regulatory adaptation + Canadian cloud deployment
- Q2: 3-clinic pilot (Ontario + BC), KPI measurement
- Q3: Public launch — dentist association partnerships, content + SEO, conference presence (ODA, BCDA, Pacific Dental Conference)
- Q4: First 50 paying Canadian clinics

**Year 2:**
- 250 Canadian clinics
- DSO partnership pilots
- US adjacent-market exploration (US insurance strategies already in skeleton — Delta Dental, MetLife seeded)

### 9.3 Revenue model
- SaaS subscription (primary)
- WhatsApp / SMS / AI usage overages (Standard + Growth)
- Enterprise / DSO contracts (custom)
- Future: marketplace fees (lab partners, imaging), insurance claim service fees

### 9.4 Unit economics (target)
- CAC: CAD `$[TBD]` (founder-led + content/SEO + association partnerships)
- ACV: CAD `$[TBD]` (blended)
- Gross margin: 80%+ (cloud SaaS with capped AI quota)
- Payback period target: `[TBD months]`
- LTV/CAC target: 4x by Year 2

---

## 10. Team

| Role | Name | Background |
|---|---|---|
| Founder / CEO | `[Name]` | `[Background]` |
| Co-founder / Tech lead | Prasanth V | Full-stack engineer; built the entire platform; 2026 Anthropic Claude-API caching specialist |
| Clinical advisor | `[Name]` | `[Practicing dentist, X years]` |
| Canadian market lead | `[To recruit post-funding]` | |
| Compliance advisor | `[To engage]` | PIPEDA / PHIPA specialist |

Hiring plan post-funding: Canadian customer success lead, second backend engineer, sales/partnerships lead. Detailed org chart in Annex B.

---

## 11. Funding Ask & Use of Funds

**Total ask:** CAD `$[TBD]` over `[TBD] months`

Indicative allocation (refine to grant program rules):

| Bucket | % | Notes |
|---|---|---|
| Engineering (Canadian features, compliance, hardening) | 35% | 2 FTE + contractors |
| Pilot operations + clinical validation | 20% | 3-clinic pilot, data collection, study publication |
| Go-to-market (marketing, content, conferences, sales) | 20% | Year 1 acquisition engine |
| Compliance + security (SOC 2, PIPEDA audit, pen test) | 10% | Independent assessors |
| Infrastructure (Canadian cloud, observability) | 5% | AWS/Azure Canada |
| Working capital + contingency | 10% | |

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Slow regulatory adaptation | Med | High | Engage PIPEDA/PHIPA consultant from month 1; pilot under research-collaboration agreement |
| Canadian market entry slower than projected | Med | Med | India revenue cushion + lean ops; partnership-led entry (associations, DSOs) |
| AI cost escalation | Low | Med | Prompt caching live (90% reduction); per-plan quotas; deterministic rules-based for hot paths |
| Competition from incumbents adding AI | High | Med | Cloud-native + integrated suite vs. their bolt-on AI; speed advantage |
| Founder bandwidth | Med | High | Hire Canadian market lead + second engineer in month 1 |
| Data breach / security incident | Low | High | SOC 2, pen test, on-call rotation, breach playbook, cyber insurance |

---

## 13. Milestones & KPIs (12-month)

| Month | Milestone |
|---|---|
| M1 | Canadian cloud deployment live; PIPEDA gap analysis complete |
| M2 | 3 pilot LOIs signed; consortium partners onboarded |
| M3 | First pilot clinic live in Ontario |
| M4–5 | All 3 pilots running; weekly KPI measurement |
| M6 | Mid-program report: validated reduction in admin time + no-shows |
| M7 | Public Canadian launch |
| M8–10 | First 25 paying clinics |
| M11 | SOC 2 Type I complete |
| M12 | 50 paying Canadian clinics; year-2 expansion plan submitted |

KPI dashboard updated monthly; quarterly review with grant program officer.

---

## 14. Annexes (to attach before submission)

- **A.** Letters of intent / collaboration MOUs
- **B.** Detailed org chart + hiring plan
- **C.** Technical architecture diagrams (extract from `ARCHITECTURE.md`)
- **D.** Security & compliance checklist (extract from `SECURITY-CHECKLIST.md`)
- **E.** Product screenshots (web + mobile)
- **F.** Existing AI feature demo links
- **G.** Pilot clinic profiles
- **H.** Detailed financial model (3-year P&L, cap table, runway)

---

*Prepared by the Smart Dental Desk team. For follow-up: pvprasanth474@gmail.com.*
