# Dental SaaS — Post-MVP Roadmap (Phases 2.5 → 6)

> Created: 2026-03-13  
> Context: Phase 1 (Backend) and Phase 2 (Frontend MVP) are complete.  
> This document outlines the remaining phases to go from working prototype → production-ready SaaS → feature-complete product.

---

## Current State Assessment

### What's Already Done ✅
- Loading/skeleton states on all pages (Phase 2, Epic 13.2)
- Empty states with icons on all tables
- Error states (ErrorPage component + retry)
- Success/error toasts everywhere (Sonner)
- Form validation (React Hook Form + Zod on every form)
- Basic table pagination + sorting + search
- Audit Log UI (Phase 2, Epic 12)
- Backend rate limiting (Throttler — 100 req/min general, 5 req/min login)
- TanStack Query caching (30s stale, 60s dashboard refresh)
- Keyboard shortcuts (Alt+D/P/A/T/I/R/S)
- Cmd+K global search (patient name search + page navigation)
- Invoice print (react-to-print, A4 format)
- Prescription print (window.print + @media print CSS)
- Dental chart print support
- Backend Dockerfile (multi-stage, node:20-alpine)
- BullMQ queue infrastructure (scaffolded, test_queue only)
- CORS configured in main.ts

### What's Missing / Needs Work 🔲
- Column visibility toggles on tables
- Advanced column filtering (per-column)
- Row action menus (partial — only staff list has it)
- Data export (CSV/Excel/PDF) — no libs installed
- Notifications (in-app, email, SMS) — nothing built
- Print support for treatments, patient summary, reports
- Security headers (no Helmet)
- CSRF protection
- Frontend Dockerfile
- docker-compose.yml
- CI/CD pipeline (no GitHub Actions, no Vercel config)
- Frontend testing (no Jest/Vitest/Playwright)
- Monitoring (no Sentry, no structured logging)
- User profile self-edit
- Lazy loading for heavy pages
- Virtual scrolling for large tables

---

## Phase 2.5 — Frontend Hardening & UX Polish

> **Goal:** Make the UI reliable enough for daily clinic use (50-80 patients/day).

### Epic 1 — Advanced Table Features

Clinics live in tables. Receptionists scroll through 50+ rows daily. Improve the DataTable component and all list pages.

| Story | Status | Description |
|---|---|---|
| 1.1 – Column Visibility Toggle | DONE | Column hide/show dropdown via Settings2 icon in DataTable toolbar. DropdownMenu with checkbox items per column |
| 1.2 – Advanced Column Filtering | TODO | Per-column filter dropdowns (e.g., filter patients by gender, appointments by status directly in table header) |
| 1.3 – Row Actions Menu | DONE | 3-dot DropdownMenu on patients (view/edit/delete with ConfirmDialog), appointments (view/mark completed/no show/cancel), treatments (view/edit), inventory (edit). Uses MoreHorizontal icon |
| 1.4 – Table Export Button | DONE | Export dropdown (CSV/Excel) in DataTable toolbar. Wired to exportData() utility on patients, appointments, treatments, invoices, inventory, staff |
| 1.5 – Bulk Selection & Actions | PARTIAL | Checkbox column infrastructure via enableRowSelection prop, selection count in toolbar. Bulk action buttons not yet wired on pages |

**Pages affected:** patients, appointments, invoices, inventory, treatments, staff, audit-logs

### Epic 2 — Workflow & Navigation Polish

| Story | Status | Description |
|---|---|---|
| 2.1 – Breadcrumb Navigation | DONE | Custom Breadcrumbs component (Home icon + linked items + current page span). Added to 18 nested/detail pages |
| 2.2 – "Back" Button Consistency | DONE | Already existed on detail/edit pages from Phase 2 |
| 2.3 – Unsaved Changes Warning | TODO | Warn before navigating away from forms with unsaved changes (beforeunload + router events) |
| 2.4 – Appointment Calendar View | DONE | Already existed from Phase 2 |
| 2.5 – Prescription Creation Form | TODO | Full prescription creation dialog from patient profile — select medicines, set dosage/frequency/duration, add instructions. Use backend POST /prescriptions |

### Epic 3 — Data Export

| Story | Status | Description |
|---|---|---|
| 3.1 – CSV Export | DONE | papaparse installed. exportToCSV() in lib/export.ts. Pre-defined configs for patients, appointments, treatments, invoices, inventory, staff. Exports current data view |
| 3.2 – Excel Export | DONE | xlsx (SheetJS) + file-saver installed. exportToExcel() with formatted columns/headers. Same 6 list pages |
| 3.3 – PDF Report Export | TODO | Install `@react-pdf/renderer` or `jspdf`. Generate PDF for: invoice (already printable — convert to downloadable PDF), patient summary, monthly revenue report |
| 3.4 – Print Enhancements | TODO | Add print support for: patient summary profile, treatment plan (grouped by patient), reports page (each report tab printable) |

### Epic 4 — Performance Optimization

| Story | Status | Description |
|---|---|---|
| 4.1 – Route-Level Code Splitting | DONE | loading.tsx files created for 10 route segments: patients, appointments, treatments, invoices, inventory, staff, reports, audit-logs, settings, prescriptions |
| 4.2 – Virtual Scrolling | TODO | Install `@tanstack/react-virtual`. Virtualize tables with 100+ rows (audit logs, patients in large clinics) |
| 4.3 – Image & Asset Optimization | TODO | Lazy load avatars, optimize dental chart SVG rendering, use Next.js Image component where applicable |
| 4.4 – Query Optimization | TODO | Review TanStack Query cache keys — ensure list invalidation on mutations, prefetch on hover for detail pages, parallel queries where possible |

### Epic 5 — Frontend Testing

| Story | Status | Description |
|---|---|---|
| 5.1 – Setup Vitest + React Testing Library | DONE | vitest 4.1.0, @testing-library/react, @testing-library/jest-dom/vitest, jsdom env. vitest.config.ts + setup.tsx with mocks for next/navigation, next/link, next-themes |
| 5.2 – Component Unit Tests | PARTIAL | 20 tests passing across 3 suites: auth-store (9 tests), export utility (6 tests), breadcrumbs (5 tests). DataTable, DentalChart, InvoiceForm still TODO |
| 5.3 – E2E Tests with Playwright | TODO | Install Playwright. Write E2E flows: login → dashboard, patient CRUD, appointment booking, invoice creation + payment |

---

### Epic 6 — Notification System (Backend) ✅

| Story | Status | Description |
|---|---|---|
| 6.1 – Notification Module & Model | ✅ DONE | Notification Prisma model + migration. NotificationService (create, createMany, findByClinicAndUser, getUnreadCount, markAsRead, markAllAsRead). NotificationController with 4 endpoints |
| 6.2 – Notification Queue | ✅ DONE | BullMQ notification_queue with NotificationProducer + NotificationProcessor (WorkerHost pattern) |
| 6.3 – Appointment Reminders | ✅ DONE | @nestjs/schedule cron daily 8AM — queries next-day scheduled appointments, creates notifications for dentists |
| 6.4 – Payment & Overdue Alerts | ✅ DONE | Cron daily 9AM — overdue installments (due_date < today, status = pending), marks as overdue, notifies clinic admins |
| 6.5 – Low Inventory Alerts | ✅ DONE | Cron daily 7AM — raw SQL query for items where quantity <= reorder_level, groups by clinic, notifies admins |
| 6.6 – Real-Time Notifications (WebSocket) | DEFERRED | WebSocket gateway infrastructure deferred to later phase |

### Epic 7 — Notification System (Frontend) ✅

| Story | Status | Description |
|---|---|---|
| 7.1 – Notification Bell & Dropdown | ✅ DONE | Bell icon in topbar with unread count badge (auto-refresh 30s), dropdown shows recent 5, color-coded by type, click marks as read |
| 7.2 – Notification Center Page | ✅ DONE | /notifications page — type filter, read/unread filter, pagination, individual + bulk mark-as-read. Sidebar nav link added |
| 7.3 – Notification Preferences | DEFERRED | Per-user notification preferences planned for later |

### Epic 8 — Enhanced Audit & Activity ✅

| Story | Status | Description |
|---|---|---|
| 8.1 – Audit Log Detail View | ✅ DONE | Sheet side panel with MetadataViewer (recursive JSON renderer), entity deep links (ENTITY_ROUTE_MAP), action badges, full metadata display |
| 8.2 – User Activity Timeline | ✅ DONE | Staff edit page rewritten with 2-column layout: form (2/3) + Recent Activity card (1/3) showing last 20 actions with timestamps |
| 8.3 – Login History | ✅ DONE | Login events logged via fire-and-forget AuditLogService.log() in AuthService with email + role metadata |

### Epic 9 — Scheduling Enhancements ✅

| Story | Status | Description |
|---|---|---|
| 9.1 – Branch Working Hours | ✅ EXISTED | Already implemented — working_start_time, working_end_time, lunch break, slot_duration, buffer_minutes, advance_booking_days, working_days[] |
| 9.2 – Dentist Availability/Schedule | ✅ EXISTED | Available slots API with conflict checking + working hours validation. Slot visualization in booking form |
| 9.3 – Appointment Reschedule | ✅ EXISTED | Update endpoint supports date/time/status changes with audit logging |
| 9.4 – Recurring Appointments | ✅ DONE | recurrence_group_id UUID field + index on Appointment. Backend createRecurring (weekly/biweekly/monthly, 2-12 occurrences, skips conflicts). Frontend /appointments/recurring booking form |

---

## Phase 3 — Communication & Patient Engagement Platform ← NEXT

> **Goal:** Enable clinics to communicate with patients through Email, SMS, WhatsApp, and In-app notifications — for reminders, campaigns, greetings, follow-ups, referrals, and authentication. Best-in-class patient engagement platform for Indian dental clinics.
>
> **Architecture:** Channel-agnostic pipeline: Event → Communication Service (dedup, preference check, DND) → Template Engine → Queue (BullMQ, rate-limited) → Channel Provider (fallback chain) → Email/SMS/WhatsApp → Delivery Webhook → Update Logs
>
> **14 Epics, 83+ Stories** — see [Latest_Phase_3.md](Latest_Phase_3.md) for full story details.

### Epic 1 — Communication Infrastructure (8 stories)
Core messaging engine: module, queues (per-channel), message entity, logs, channel provider interface, message deduplication, channel fallback logic, circuit breaker.

### Epic 2 — Message Template System (6 stories)
Template entity with DLT/WhatsApp fields, rendering engine (placeholders + conditionals + formatters), CRUD API, 15+ default templates (seed), multilingual support (9 Indian languages), template categories for DLT routing.

### Epic 3 — Email Channel Integration (3 stories)
Email provider (@nestjs-modules/mailer, SMTP, Mailtrap dev, SendGrid/SES prod), BullMQ email worker, professional HTML email templates with clinic branding.

### Epic 4 — SMS Channel + DLT Compliance (4 stories)
SMS provider (MSG91, transactional + promotional routes), DLT template registration (TRAI mandatory), SMS worker with character count + splitting, delivery reports + cost tracking.

### Epic 5 — WhatsApp Business API (6 stories)
BSP integration (Gupshup/WATI), template approval workflow (Meta HSM), interactive messages (buttons/lists), media messages (images/PDFs/location), 24hr session messaging, webhook delivery tracking with read receipts.

### Epic 6 — Patient Preferences + TRAI Compliance (7 stories)
Preferences table (per-channel + per-type), API, enforcement before sending, DND/quiet hours (TRAI: no promos 9PM-9AM), consent audit trail, self-service opt-out link, NDNC registry check.

### Epic 7 — Clinic Communication Settings (2 stories)
Per-clinic channel enable/disable, provider configs (encrypted), fallback chain, rate limits, test connection.

### Epic 8 — Appointment & Payment Reminders (6 stories)
Appointment reminder scheduler (24hr + 2hr), notification creation, per-clinic template selection, installment due reminders, overdue payment notifications, payment confirmation receipts.

### Epic 9 — Campaign Management (10 stories)
Campaign entity, target segments (inactive/treatment/birthday/location/custom) with audience preview, scheduler, execution with rate limiting, analytics (delivery + attributed bookings), dormant patient auto-detection, reactivation drip sequences, A/B testing, cost tracking + ROI, throttling.

### Epic 10 — Greetings & Occasion Automation (6 stories)
Birthday greetings with offers, festival calendar (Diwali/Holi/Eid/Christmas/Pongal/Onam + custom), festival greeting automation, festival offer campaigns (one-click), patient anniversary greetings, custom occasion support.

### Epic 11 — Post-Treatment & Follow-Up Automation (6 stories)
Post-treatment care instructions (by procedure type), post-visit feedback collection (1-5 stars), Google review solicitation (if rating >= 4), no-show follow-up with reschedule, treatment plan completion reminders, prescription refill reminders.

### Epic 12 — Referral Program (5 stories)
Referral code generation, tracking (referrer → referred → first visit), referral invitation messaging, reward notifications + credits, referral analytics dashboard.

### Epic 13 — Authentication Messaging (3 stories)
Email verification, password reset, OTP messaging (email/SMS/WhatsApp).

### Epic 14 — Communication UI (10 stories)
Sidebar section, templates page (live preview), campaign creation wizard (5-step), campaign list + detail, automation rules config, message logs (filterable + expandable), communication settings, analytics dashboard, patient communication timeline tab, template preview with variable substitution.

**Implementation Order:** Epic 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 (UI built incrementally)

---

## Phase 4 — Production Readiness & Launch

> **Goal:** Harden security, set up deployment, monitoring, and prepare for real clinics.

### Epic 1 — Security Hardening

| Story | Status | Description |
|---|---|---|
| 1.1 – Helmet Security Headers | TODO | Install `helmet` in NestJS. Configure CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| 1.2 – CSRF Protection | TODO | Add CSRF token generation + validation for state-changing requests. Double-submit cookie pattern |
| 1.3 – Rate Limiting Verification | TODO | Verify Throttler is applied globally in main.ts (currently may only be per-module). Add IP-based rate limiting log |
| 1.4 – Secure Cookie Configuration | TODO | HTTPOnly, Secure, SameSite=Strict for auth tokens. Consider migrating from localStorage to secure cookies |
| 1.5 – Input Sanitization | TODO | Ensure HTML/script sanitization on all text fields (patient notes, medical history, etc.) to prevent stored XSS |
| 1.6 – Dependency Audit | TODO | Run `npm audit`, update vulnerable packages. Add `npm audit` to CI pipeline |

### Epic 2 — Monitoring & Logging

| Story | Status | Description |
|---|---|---|
| 2.1 – Sentry Integration (Backend) | TODO | Install `@sentry/nestjs`. Configure DSN, environment, release tracking. Catch unhandled exceptions + transaction tracing |
| 2.2 – Sentry Integration (Frontend) | TODO | Install `@sentry/nextjs`. Error boundary wrapping, breadcrumb tracking, user context from auth store |
| 2.3 – Structured Logging | TODO | Install `pino` or `winston`. Replace console.log with structured JSON logs. Log levels: error, warn, info, debug. Include request_id, clinic_id, user_id context |
| 2.4 – Health Check Enhancement | TODO | Expand /health endpoint: check DB connection, Redis connection, disk space, memory usage. Add /ready endpoint for Kubernetes |
| 2.5 – Uptime Monitoring | TODO | Configure external uptime monitor (UptimeRobot/BetterStack) for API + frontend health endpoints |

### Epic 3 — Deployment & Infrastructure

| Story | Status | Description |
|---|---|---|
| 3.1 – Frontend Dockerfile | TODO | Multi-stage Dockerfile for Next.js (standalone output mode). Optimize for production |
| 3.2 – Docker Compose | TODO | docker-compose.yml: backend + frontend + PostgreSQL + Redis. Volumes for DB data persistence. Environment variable management |
| 3.3 – Environment Configuration | TODO | Create .env.example for both backend/frontend. Document all required env vars. Validate env vars on startup |
| 3.4 – CI/CD Pipeline (GitHub Actions) | TODO | Workflow: lint → type-check → test → build → deploy. Separate pipelines for backend/frontend. Branch protection rules |
| 3.5 – Staging Environment | TODO | Deploy staging to Render/Railway. Auto-deploy from `develop` branch. Production from `main` |
| 3.6 – Database Migration Strategy | TODO | Automated migration in CI/CD. Rollback procedures documented. Seed data for staging |

### Epic 4 — Backup & Disaster Recovery

| Story | Status | Description |
|---|---|---|
| 4.1 – Database Backup Automation | TODO | pg_dump scheduled backup (daily). Compress + upload to S3/Cloudflare R2. 30-day retention policy |
| 4.2 – Backup Verification | TODO | Monthly restore test to verify backup integrity. Document restore procedure |
| 4.3 – Data Export for Compliance | TODO | Clinic admin can export all their clinic data (patients, invoices, records) for data portability. Required for compliance |

### Epic 5 — Pre-Launch Checklist

| Story | Status | Description |
|---|---|---|
| 5.1 – Landing Page | TODO | Public marketing page with features, pricing tiers, testimonials, CTA to register. SEO optimized |
| 5.2 – Terms of Service & Privacy Policy | TODO | Legal pages required for SaaS launch. HIPAA-inspired data handling policies for medical data |
| 5.3 – Onboarding Flow | TODO | First-login tutorial: guide new clinic through branch setup → add staff → add first patient → book appointment |
| 5.4 – Plan Selection during Registration | TODO | Allow selecting Starter/Professional/Enterprise plan during clinic registration. Show feature comparison table |
| 5.5 – Payment Integration (Razorpay) | TODO | Subscription billing via Razorpay. Plan upgrade/downgrade. Webhook for payment status |

---

## Phase 5 — AI Features

> **Goal:** Add AI-powered features that differentiate the product. Use plan-based AI quota.

### Epic 1 — AI Service Foundation

| Story | Status | Description |
|---|---|---|
| 1.1 – AI Service Module | TODO | NestJS module wrapping OpenAI/Anthropic API. Configurable model selection. Token tracking. Queue-based for long operations |
| 1.2 – AI Quota Enforcement | DONE | Backend AiUsageGuard tracks per-clinic usage against plan quota (already implemented) |

### Epic 2 — Clinical AI Features

| Story | Status | Description |
|---|---|---|
| 2.1 – Auto Clinical Notes | TODO | After marking appointment complete, AI generates structured clinical notes from treatment data. Dentist reviews + edits before saving |
| 2.2 – Prescription Suggestions | TODO | Based on diagnosis + treatment, suggest common prescriptions (medicine, dosage, duration). Dentist approves/modifies |
| 2.3 – Patient Education Generator | TODO | Generate patient-friendly explanations of procedures (e.g., "What is RCT?"). Shareable via print/WhatsApp |
| 2.4 – Follow-Up Message Generator | TODO | Draft follow-up SMS/WhatsApp messages for post-treatment care instructions |
| 2.5 – Smart Scheduling Suggestions | TODO | Based on treatment plan, suggest follow-up appointment dates. AI considers dentist availability + treatment gaps |

---

## Phase 6 — Mobile App (React Native)

> **Goal:** Dentist-focused mobile app for on-the-go access. Not a full admin app.

### Epic 1 — Setup & Auth

| Story | Status | Description |
|---|---|---|
| 1.1 – React Native Project Init | TODO | Expo + TypeScript. Shared API types with web frontend |
| 1.2 – Mobile Login | TODO | Login screen with clinic ID, email, password. Biometric auth (fingerprint/face) for return visits |
| 1.3 – Push Notifications | TODO | Firebase Cloud Messaging. Appointment reminders, new patient alerts |

### Epic 2 — Dentist Mobile Workflow

| Story | Status | Description |
|---|---|---|
| 2.1 – Today's Schedule Screen | TODO | List of today's appointments with patient name, time, procedure, status. Pull-to-refresh |
| 2.2 – Patient Quick View | TODO | Search patient, view profile summary, recent treatments, dental chart (simplified) |
| 2.3 – Treatment Update | TODO | Mark treatment status (in_progress → completed), add notes, update cost |
| 2.4 – Quick Prescription | TODO | Create prescription from mobile with auto-suggest medicines |
| 2.5 – Offline Support | TODO | Cache today's appointments + recent patients. Sync when online. Conflict resolution |

---

## Recommended Execution Order

```
Phase 2.5 — Frontend Hardening & Operational Features ✅ MOSTLY COMPLETE
  └─ Epic 1: Advanced Tables ✅
  └─ Epic 2: Workflow Polish (partial)
  └─ Epic 3: Data Export (partial)
  └─ Epic 4: Performance (partial)
  └─ Epic 5: Frontend Testing (partial)
  └─ Epic 6-7: Notifications (Backend + Frontend) ✅
  └─ Epic 8: Audit Enhancements ✅
  └─ Epic 9: Scheduling Enhancements ✅

Phase 3 — Communication & Patient Engagement (14 Epics, 83+ Stories) ← NEXT
  └─ Epic 1-2: Communication Infrastructure + Template System
  └─ Epic 3-5: Channel Integration (Email → SMS/DLT → WhatsApp/BSP)
  └─ Epic 6-7: Preferences + TRAI Compliance + Clinic Settings
  └─ Epic 8: Appointment & Payment Reminders
  └─ Epic 9: Campaign Management (segments, drip, A/B, ROI)
  └─ Epic 10: Greetings & Festival Automation
  └─ Epic 11: Post-Treatment Follow-Ups & Feedback
  └─ Epic 12: Referral Program
  └─ Epic 13: Authentication Messaging
  └─ Epic 14: Communication UI (built incrementally)

Phase 4 — Production Readiness & Launch
  └─ Epic 1: Security
  └─ Epic 2: Monitoring
  └─ Epic 3: Deployment
  └─ Epic 4: Backups
  └─ Epic 5: Pre-Launch

Phase 5 — AI Features
Phase 6 — Mobile App (React Native)
```

---

## Key Metrics for Launch Readiness

| Metric | Target |
|---|---|
| Backend test coverage | > 80% |
| Frontend component tests | Critical flows covered |
| E2E tests | Login, patient CRUD, booking, invoice+payment |
| Lighthouse performance score | > 80 |
| Security audit | 0 critical/high vulnerabilities |
| Mean page load time | < 2s |
| API response time (p95) | < 500ms |
| Uptime target | 99.5% |
