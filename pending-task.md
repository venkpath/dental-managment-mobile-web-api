# Dental SaaS Platform — Project Status & Pending Tasks

**Last Updated: 2026-03-20**

## Codebase Stats

| Metric | Count |
|--------|-------|
| Backend source files | 214 (.ts) |
| Frontend source files | 145+ (.ts/.tsx) |
| Backend test files | 35 (.spec.ts) |
| Prisma models | 36 |
| Database migrations | 29 |
| Backend modules | 26 |
| Frontend routes/pages | 34 |

---

## Phase-by-Phase Status

### Phase 1 — Backend Core + SaaS Skeleton: 100% DONE
All 8 epics, 365+ unit tests passing:
- Multi-tenant architecture (clinic + branch scoping via x-clinic-id)
- JWT auth + RBAC (Admin/Dentist/Receptionist/Staff) + SuperAdmin
- Plan/Feature/Subscription framework with feature guard + AI usage quota
- Full CRUD for: Patients, Appointments, Treatments, Prescriptions, Invoices/Payments/Installments, Inventory, Attachments, Audit Logs, Dental Tooth Chart
- Reports: Dashboard summary, revenue, appointments, dentist performance, patient analytics, treatment analytics, inventory alerts
- Pagination, validation, error handling, rate limiting, transaction safety, integration tests, seed data

### Phase 2 — Frontend Web App: 100% DONE
All 13 epics:
- Dashboard with metrics + charts
- Full CRUD UI for all entities (patients, appointments, treatments, prescriptions, invoices, inventory, staff)
- Interactive dental chart, appointment calendar, invoice printing, prescription printing
- Keyboard shortcuts, Cmd+K search, notification bell + center
- Settings page, audit log viewer

### Phase 2.5 — Frontend Hardening: ~85% DONE

| Feature | Status |
|---------|--------|
| Column visibility toggle | DONE |
| Row actions menu (3-dot) | DONE |
| CSV + Excel export | DONE |
| Breadcrumb navigation | DONE |
| Route-level code splitting | DONE |
| Notification system (backend crons + frontend bell) | DONE |
| Audit log detail view + login history | DONE |
| Recurring appointments | DONE |
| Branch scheduling settings | DONE |
| Vitest setup + 20 tests | DONE |
| Per-column filtering | DONE |
| Unsaved changes warning | DONE |
| Prescription creation from patient profile | DONE |
| Country dropdown (all address forms) | DONE |
| DOB optional + Age field for patients | DONE |
| Virtual scrolling for large tables | DONE |
| E2E tests (Playwright) — 5 spec files | DONE |
| PDF export | TODO |
| Print enhancements | TODO |

### Phase 3 — Communication & Patient Engagement: ~75% DONE

**Fully built and working:**

| Component | Backend | Frontend |
|-----------|---------|----------|
| Communication infrastructure (send, queue, dedup, DND, preferences) | DONE | — |
| Message Template CRUD + 15 seeded defaults + renderer | DONE | DONE (stacked card dialog, live preview) |
| Patient preferences (per-channel, quiet hours, consent audit) | DONE | DONE |
| Clinic settings (provider config, channel toggles, test email) | DONE | Tab exists |
| 6 automation crons (fully implemented): | | |
| — Birthday greetings (8:30 AM daily) | DONE | — |
| — Festival greetings (8 AM daily) | DONE | — |
| — Appointment reminders to patients (7:30 AM daily) | DONE | — |
| — Payment reminders (9:30 AM daily, 3 days before due) | DONE | — |
| — Dormant patient detection (Mon 6 AM weekly) | DONE | — |
| — Treatment plan reminders (10 AM daily) | DONE | — |
| 3 notification crons (in-app, fully implemented): | | |
| — Appointment reminders to dentists (8 AM) | DONE | — |
| — Payment overdue alerts to admins (9 AM) | DONE | — |
| — Low inventory alerts to admins (7 AM) | DONE | — |
| Automation rules (9 types, enable/disable/configure per clinic) | DONE | DONE (template dropdown, config editor) |
| Campaign CRUD + execution engine + stats | DONE | DONE (wizard with audience preview, schedule) |
| Messages tab — log viewer with expandable details | DONE | DONE |
| Events tab — calendar view + CRUD | DONE | DONE |
| Feedback (create, list, stats, Google review trigger) | DONE | DONE |
| Referrals (code gen, complete, stats, deactivate) | DONE | DONE |
| Cron jobs admin UI (manual trigger) | DONE | DONE |
| Patient preferences tab in patient profile | DONE | DONE |

**Remaining in Phase 3:**

| Item | Priority |
|------|----------|
| SMS provider (MSG91 + DLT compliance) | LOW (needs API keys) |
| WhatsApp provider (Gupshup/WATI BSP) | LOW (needs API keys) |
| Authentication messaging (email verify, password reset, OTP) | LOW |
| A/B testing for campaigns | LOW |
| Campaign ROI tracking | LOW |

### Phase 4 — Production Readiness: PARTIALLY DONE
- Helmet, CSRF guard, input sanitization — DONE (verified in codebase)
- Docker Compose — DONE
- CI/CD (GitHub Actions) — DONE
- Backup automation — DONE
- Razorpay payment integration — DONE
- Landing page + onboarding flow — TODO

### Phase 5 — AI Features: NOT STARTED (quota guard exists)
Auto clinical notes, prescription suggestions, patient education, smart scheduling

### Phase 6 — Mobile App (React Native): NOT STARTED
Dentist mobile workflow, push notifications, offline support

---

## Current Pending Items (Ranked)

### Immediate — In Progress
1. **PDF export** — patient summary, treatments, reports, invoices
2. **Print enhancements** — treatments/reports/patient summary print-friendly layouts

### Medium Priority
3. Landing page + onboarding flow
4. SMS/WhatsApp provider integration (needs API keys from clinic)
5. Authentication messaging (email verify, password reset, OTP)

### Lower Priority / Larger Effort
6. A/B testing for campaigns
7. Campaign ROI tracking
8. Phase 5 — AI Features
9. Phase 6 — Mobile App

---

## Key Architectural Decisions
- **Backend:** NestJS + Prisma + PostgreSQL + BullMQ/Redis + @nestjs/schedule
- **Frontend:** Next.js 16 App Router + TanStack Query v5 + shadcn/ui v4 + Zustand
- **Auth:** JWT Bearer + x-clinic-id header (multi-tenant)
- **Testing:** Vitest (unit) + Playwright (E2E)
- **Deployment plan:** Neon (Postgres) + Upstash (Redis) + Render (backend) + Vercel (frontend) — all free tier
- All 9 automation crons are fully implemented — they query real data, resolve patient channel preferences, and call communicationService.sendMessage()
