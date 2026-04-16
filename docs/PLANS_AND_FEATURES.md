# Plans & Features Reference

Single source of truth for the 4-tier subscription structure, feature flags, and enforcement points. All prices in INR, excluding GST. Last updated 2026-04-16.

---

## Tiers at a glance

| | **Free** | **Starter** | **Professional** | **Enterprise** |
|---|---|---|---|---|
| **Price** | ₹0 forever | ₹999/mo | ₹1,999/mo | ₹2,999/mo |
| Branches | 1 | 1 | 3 | 10 |
| Staff | 2 | 5 | 15 | 50 |
| AI quota | 0 | 0 | 100/mo | 500/mo |
| New patients | 20/mo | ∞ | ∞ | ∞ |
| Appointments | 20/mo | ∞ | ∞ | ∞ |
| Target user | Evaluation only | Solo dentist | Growing multi-dentist clinic | Multi-branch chain |

Monthly caps are rolling — count resets on the 1st of each month. Enforced on create; no retroactive block.

---

## Feature matrix

Each row is a feature flag in the `features` table keyed by the column on the left. ✓ = enabled on that plan.

| Feature key | Free | Starter | Pro | Enterprise | What it unlocks |
|---|:--:|:--:|:--:|:--:|---|
| `INVENTORY_MANAGEMENT` | ✓ | ✓ | ✓ | ✓ | Dental inventory + supply tracking |
| `APPOINTMENT_CONFIRMATIONS` |   | ✓ | ✓ | ✓ | Auto-send confirmation/cancellation/reschedule messages to patient |
| `SMS_REMINDERS` |   | ✓ | ✓ | ✓ | SMS appointment reminders |
| `WHATSAPP_INTEGRATION` |   |   | ✓ | ✓ | WhatsApp sending via shared platform number |
| `WHATSAPP_INBOX` |   |   |   | ✓ | Two-way WhatsApp inbox (requires clinic's own WABA number) |
| `DIGITAL_XRAY` |   |   | ✓ | ✓ | Digital X-ray upload + storage |
| `AI_CLINICAL_NOTES` |   |   | ✓ | ✓ | AI-generated SOAP notes; also gates revenue insights, appointment summaries, X-ray AI |
| `AI_PRESCRIPTION` |   |   | ✓ | ✓ | AI-powered prescription generation with safety checks |
| `AI_TREATMENT_PLAN` |   |   |   | ✓ | AI-assisted treatment planning + chart analysis |
| `AI_CAMPAIGN_CONTENT` |   |   | ✓ | ✓ | AI-generated campaign copy with A/B variants |
| `PATIENT_IMPORT` |   |   | ✓ | ✓ | Bulk CSV/Excel import + AI image extraction |
| `MARKETING_CAMPAIGNS` |   |   | ✓ | ✓ | Bulk campaigns, segmentation, drip sequences, A/B tests |
| `AUTOMATION_RULES` |   |   | ✓ | ✓ | Birthday, reactivation, follow-ups, payment reminders, treatment-plan reminders |
| `CUSTOM_PROVIDER_CONFIG` |   |   | ✓ | ✓ | Override default email/SMS/WhatsApp providers per clinic |

Features not flagged above are considered "core" and available to every plan: authentication, patient records, appointments, dental charts, prescriptions (manual), invoicing, payments, basic reports, branches/staff within limits, email OTP/password reset, staff invite emails.

---

## Core (always included)

Every clinic — including Free — gets these without a feature flag:

- Clinic, branch, staff, and patient management (within plan limits)
- Appointments + calendar
- Dental charting + tooth conditions
- Manual prescriptions (no AI)
- Clinical visits + treatment records
- Invoices, payments, installment plans
- Expense tracking
- Basic reports and dashboards
- Login OTP, password reset, staff invite emails
- Attachments + file uploads
- Referral codes

---

## Free plan — what's specifically blocked

Free is designed as a functional evaluation. Clinics can run the product end-to-end for a small patient load, but the growth/marketing toolkit is locked:

- **No outbound messaging to patients**: no SMS, no WhatsApp, no appointment confirmations
- **No marketing**: no campaigns, no automation rules, no AI campaign content
- **No AI**: clinical notes, prescriptions, treatment planning all disabled
- **No digital X-ray storage**
- **No CSV/AI patient import**
- **No custom provider overrides**
- **Hard caps**: 20 new patients/month, 20 appointments/month (rolling, resets monthly)

The only non-core feature Free has is `INVENTORY_MANAGEMENT` — included because a clinic can't realistically evaluate a dental SaaS without tracking basic supplies.

---

## Enforcement reference

Where each flag is enforced in the backend:

| Flag | File:line |
|---|---|
| `MARKETING_CAMPAIGNS` | `campaign.controller.ts` (class-level `@RequireFeature`) |
| `AUTOMATION_RULES` | `automation.controller.ts` (class-level `@RequireFeature`) |
| `AI_CAMPAIGN_CONTENT` | `ai.controller.ts` (campaign-content endpoint) |
| `AI_CLINICAL_NOTES` | `ai.controller.ts` (clinical-notes, revenue-insights, appointment-summary, xray-analysis, campaign-content) |
| `AI_PRESCRIPTION` | `ai.controller.ts` (prescription endpoint) |
| `AI_TREATMENT_PLAN` | `ai.controller.ts` (treatment-plan, chart-analysis) |
| `APPOINTMENT_CONFIRMATIONS` | `appointment-notification.service.ts` (gates send at runtime — silent skip, not a 403) |
| `PATIENT_IMPORT` | `patient.controller.ts` |
| `WHATSAPP_INTEGRATION` | `communication.service.ts` (WhatsApp sends) |
| `WHATSAPP_INBOX` | `communication/workers/whatsapp.worker.ts` (inbound replies) |
| `DIGITAL_XRAY` | `attachment.controller.ts` (X-ray type uploads) |
| `INVENTORY_MANAGEMENT` | `inventory.controller.ts` |
| `CUSTOM_PROVIDER_CONFIG` | `communication.controller.ts` (provider override endpoints) |
| `SMS_REMINDERS` | `communication.service.ts` (SMS sends) |

Global `FeatureGuard` reads the `@RequireFeature('KEY')` metadata and returns `403 Forbidden: Feature "KEY" is not available on your current plan` when the clinic's plan doesn't include the flag. Super-admin requests bypass all feature checks.

### Monthly caps

| Resource | Field on `plans` | Enforced in |
|---|---|---|
| Patients | `max_patients_per_month` | `patient.service.ts` — `create()` |
| Appointments | `max_appointments_per_month` | `appointment.service.ts` — `create()` + `createRecurring()` (batch-aware) |

Null value = unlimited. Cap check compares against `created_at` within the current calendar month (clinic's server timezone). When exceeded, returns `403 Forbidden` with an upgrade message naming the limit and the plan.

---

## Plan progression rationale

Each upgrade is designed to unlock a clear, single reason to pay:

- **Free → Starter (₹999)**: lifts the 20/20 cap + adds patient-facing messaging (SMS + appointment confirmations). The clinic can now run a normal daily workflow.
- **Starter → Professional (₹1,999)**: the growth tier. WhatsApp sends + marketing campaigns + automation + AI (prescriptions, notes, campaign content) + patient import + digital X-ray. This is the "most popular" anchor.
- **Professional → Enterprise (₹2,999)**: multi-branch scale. 10 branches, WhatsApp Inbox (own WABA), AI Treatment Planning, 5× AI quota, dedicated support.

The ₹1,000 jump from Starter to Professional is intentional — it clears the purchase objection for the feature set that drives revenue (marketing + AI).

---

## How plans + features are seeded

Seed is idempotent. On every backend boot, `DatabaseSeederService`:

1. Upserts the 4 plans by `name` — existing rows are untouched (so prices edited in super-admin UI stick)
2. Adds any missing feature keys from the features list
3. Adds any missing plan-feature mappings

To reseed cleanly in dev: truncate `plan_features`, `features`, `plans` (in that order) and restart.

Files:
- `dental-backend/prisma/schema.prisma` — `Plan`, `Feature`, `PlanFeature` models
- `dental-backend/src/database/database-seeder.service.ts` — idempotent boot seed
- `dental-backend/prisma/seed.ts` — manual `prisma db seed` runner (keep in sync)

---

## Super admin override

Super admins can:
- Edit plan prices + limits via the `/super-admin/plans` endpoints
- Toggle individual feature flags for any plan
- Grant a clinic a `ai_quota_override` independent of its plan
- Mark a clinic `is_complimentary` (bypasses payment enforcement)

Super-admin-scoped requests bypass `FeatureGuard` entirely (see `feature.guard.ts:32`).
