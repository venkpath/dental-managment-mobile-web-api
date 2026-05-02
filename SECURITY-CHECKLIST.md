# Security Checklist — Smart Dental Desk

**Purpose:** Things to fix + things to publish so you can confidently answer "is our data safe?" from prospective clinics.

**Stack:** AWS (backend) · Neon Postgres (DB) · S3 (reports/files) · Vercel (frontend)

---

## Part A — Code/Infra fixes (do these FIRST)

### Critical (block production claims until done)

- [ ] **JWT secret hardening** — `dental-backend/src/config/app.config.ts:6`
  - Remove default `'change-me-...'`, throw on startup if `JWT_SECRET` missing in production
  - Rotate the existing secret; force all users to re-login

- [ ] **Encryption key hardening** — `dental-backend/src/common/utils/encryption.util.ts:25`
  - Remove `'development-only-key-change-in-prod'` default
  - Require `ENCRYPTION_KEY` env var in production; reject any value containing `dev`/`test`/`change`

- [ ] **Move auth token from localStorage → httpOnly cookie** — `dental-frontend/src/stores/auth-store.ts:57-65`
  - Backend: set cookie with `HttpOnly; Secure; SameSite=Lax`
  - Frontend: remove localStorage persistence, rely on cookie
  - This is the single biggest XSS exposure — fix it first

- [ ] **Sanitize template preview XSS** — `dental-frontend/src/app/(dashboard)/communication/_components/template-preview.tsx:105-108`
  - Replace `dangerouslySetInnerHTML` with React render, OR wrap with `DOMPurify.sanitize()`

- [ ] **Remove hardcoded admin credentials** — `dental-backend/src/database/database-seeder.service.ts:95-97`
  - Read from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars
  - On first run, generate random password, print once to logs, force change on first login

- [ ] **Stop emailing plaintext passwords** — `dental-backend/src/modules/auth/auth.service.ts:271`
  - Send a one-time password-reset link instead (24-hour expiry)

- [ ] **Move all service credentials to env vars** — `dental-backend/src/config/app.config.ts:32-36`
  - WhatsApp phone, admin email, Razorpay keys → `.env` only
  - Verify `.env` is in `.gitignore` and not committed

### High priority (do within 1 week)

- [ ] **Add @Roles decorators to patient endpoints** — `dental-backend/src/modules/patient/patient.controller.ts`
  - POST, PATCH, DELETE all need explicit role checks

- [ ] **Tighten rate limits on sensitive endpoints**
  - Auth: 5 req/min per IP
  - Payment: 10 req/min per IP
  - Communication (WhatsApp/email send): 20 req/min per clinic

- [ ] **Add max page size to pagination** — `dental-backend/src/common/dto/pagination-query.dto.ts`
  - `@Max(100)` on the `limit` field — prevents `?limit=999999` DoS

- [ ] **Webhook signature validation** — `dental-backend/src/modules/payment/payment.service.ts:220-235`
  - Verify Razorpay signature; cross-check `clinic_id` against order record, not just payload

- [ ] **Replace `as any` casts** — start with `invoice.service.ts`, `ai.service.ts`, `payment.controller.ts`
  - Each cast is a place runtime errors slip through

- [ ] **2FA for admin + doctor roles** — TOTP (Google Authenticator) at minimum

### Medium priority (within 1 month)

- [ ] **Audit log table** — track who accessed which patient record, when, from what IP
  - Healthcare buyers will ask. DPDP Act effectively requires it.

- [ ] **Database backup verification** — document Neon's RPO (recovery point) and RTO (recovery time); test a restore once

- [ ] **Timezone fix** — `dental-backend/src/modules/appointment/appointment.service.ts:20`
  - Use `date-fns-tz` properly; handle DST

- [ ] **Promise error handling** — auth.service.ts:275-276, appointment.service.ts:118, communication.service.ts:317
  - Replace silent `.catch(log)` with retry queue or proper error bubbling

---

## Part B — Customer-facing artifacts (do AFTER Part A critical items)

### Documents to publish

- [ ] **Public `/security` page** on smartdentaldesk.com — covers infra, encryption, access control, data ownership (use the talking points below)

- [ ] **Security one-pager PDF** — emailable to prospects
  - 1 page, sections: "Where your data lives", "How it's protected", "Who can access it", "What happens if you leave"

- [ ] **Privacy Policy** — covers patient data handling, retention, sharing (none), cookies

- [ ] **Data Processing Agreement (DPA) template** — corporate dental chains will require this before signing

- [ ] **DPDP Act 2023 compliance**
  - Publish grievance officer email
  - Add explicit patient consent capture on first visit form
  - Document data retention period (e.g., 7 years per medical record norms)
  - Add data export + data deletion endpoints (patient right under DPDP)

### Talking points for sales conversations

**"Where does our data live?"**
- Backend on AWS Mumbai region (data stays in India)
- Database on Neon Postgres with encryption at rest
- Reports/files in S3 with private access — only signed time-limited URLs

**"Is it encrypted?"**
- In transit: TLS 1.2+ (HTTPS everywhere)
- At rest: AES-256 (AWS + Neon both)
- Passwords: bcrypt-hashed; we cannot read them

**"Who can see our data?"**
- Multi-tenant isolation — your clinic's data is invisible to other clinics
- Role-based access: Admin / Doctor / Staff each see only what they need
- Audit log records every patient record access (once Part A item is done)

**"What if your service goes down?"**
- AWS multi-AZ deployment
- Neon: automated backups, point-in-time recovery to any moment in last 7 days
- RPO: <1 hour. RTO: <4 hours.

**"What if we want to leave?"**
- Full data export available any time (CSV + PDF reports)
- On termination, data deleted within 30 days (or retained per your local medical record law if you prefer)
- We never sell or share patient data with third parties

**"Are you HIPAA / GDPR / DPDP compliant?"**
- DPDP Act 2023 (India): yes — consent capture, grievance officer, data export/delete supported
- HIPAA (US): not formally certified but architecture follows HIPAA technical safeguards (encryption, access control, audit logs); BAA available on request
- GDPR (EU): data subject rights (export/delete) supported; DPA available

---

## Part C — Ongoing hygiene

- [ ] Quarterly: rotate JWT secret, encryption keys, third-party API keys
- [ ] Quarterly: review who has admin access; remove ex-staff
- [ ] Monthly: review audit log for unusual access patterns
- [ ] Monthly: check Neon + AWS billing for anomalies (sign of compromise)
- [ ] On every dependency update: run `npm audit` and address high/critical CVEs
- [ ] Annual: third-party penetration test (~₹50k-1L from Indian firms; gives you a report to show enterprise buyers)

---

## Suggested order of attack (next 2 weeks)

**Day 1-2:** Critical items #1, #2, #3 (JWT + encryption + cookie migration)
**Day 3:** Critical items #4, #5, #6, #7 (XSS, hardcoded creds, plaintext password, env vars)
**Day 4-5:** High priority — role decorators, rate limits, pagination cap, webhook verification
**Day 6-7:** Audit log table + 2FA for admin
**Day 8-10:** Write `/security` page + one-pager PDF + privacy policy
**Day 11-14:** DPDP compliance items + DPA template

After Day 7, you can honestly answer customer security questions. After Day 14, you can hand them documents.
