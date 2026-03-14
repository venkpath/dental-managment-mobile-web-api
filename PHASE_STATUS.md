# Phase Status Tracker

## PHASE 1 – Backend Core + SaaS Skeleton

### EPIC 1 – Infrastructure & Setup

| Story | Status | Notes |
|---|---|---|
| 1.1 – Initialize Backend Project | DONE | NestJS project with TypeScript strict mode, ESLint, Prettier, folder structure, global response wrapper, exception filter, health endpoint |
| 1.2 – Setup PostgreSQL + Prisma | DONE | Prisma ORM, PrismaService (singleton), global PrismaModule, Clinic & User base models, initial migration |
| 1.3 – Setup Redis + Queue | DONE | BullMQ + ioredis, global QueueModule, queue-names registry, test queue with producer/processor/controller |
| 1.4 – Setup Swagger (OpenAPI) | DONE | OpenAPI 3, Swagger UI at /api/docs, JSON at /api/docs-json, JWT bearer auth configured, CLI plugin enabled, all endpoints documented |

### EPIC 2 – Multi-Tenant Architecture

| Story | Status | Notes |
|---|---|---|
| 2.1 – Clinic Entity | DONE | Full Clinic CRUD (POST/GET/GET:id/PATCH), DTOs with validation, Swagger docs, unit tests, migration |
| 2.2 – Branch Entity | DONE | Branch CRUD (POST/GET/GET:id/PATCH), FK to Clinic with cascade, includes clinic info in list/detail, DTOs (clinic_id immutable on update), unit tests, migration |
| 2.3 – User Entity Update | DONE | Added branch_id (nullable FK), name, status fields to User model, full User CRUD with clinic scoping, password hashing, email uniqueness per clinic, unit tests, migration |
| 2.4 – Tenant Context Middleware | DONE | TenantContextMiddleware extracts x-clinic-id header (UUID validated), @CurrentClinic() param decorator, Express Request type extension, registered globally, unit tests |

### EPIC 3 – Authentication & RBAC

| Story | Status | Notes |
|---|---|---|
| 3.1 – Password Security | DONE | PasswordService with bcrypt (12 salt rounds), hash/verify methods, global PasswordModule, UserService updated to use bcrypt, unit tests |
| 3.2 – Login System | DONE | POST /auth/login with JWT, validates credentials via bcrypt, token payload (user_id, clinic_id, role, branch_id), inactive account check, Swagger docs, 7 unit tests |
| 3.3 – JWT Auth Guard | DONE | Global JwtAuthGuard (APP_GUARD), extracts Bearer token, verifies JWT, attaches user context to request, @Public() decorator for open routes, @CurrentUser() param decorator, 9 unit tests |
| 3.4 – Role Guard | DONE | @Roles() decorator with UserRole enum, global RolesGuard (APP_GUARD), validates role from JWT payload, throws ForbiddenException on mismatch, 6 unit tests |

### EPIC 4 – Subscription & Feature Framework

| Story | Status | Notes |
|---|---|---|
| 4.1 – Plan Entity | DONE | Plan model (UUID, name unique, price_monthly Decimal, max_branches, max_staff, ai_quota), Prisma migration, full CRUD (POST/GET/GET:id/PATCH), SuperAdmin-only, DTO validation, name uniqueness enforcement, Swagger docs, 9 unit tests |
| 4.2 – Feature Entity | DONE | Feature model (UUID, key unique UPPER_SNAKE_CASE, description), Prisma migration, POST/GET endpoints, SuperAdmin-only, key format validation via @Matches, uniqueness enforcement, Swagger docs, 4 unit tests |
| 4.3 – Super Admin Entity | DONE | Separate SuperAdmin model (UUID, unique email, bcrypt password, name, status), Prisma migration, POST /auth/super-admin/login (no clinic_id), JWT with type discriminator (user/super_admin), @SuperAdmin() decorator + global SuperAdminGuard, @CurrentSuperAdmin() param decorator, POST /super-admins, GET /super-admins/me, Plan & Feature controllers updated to @SuperAdmin(), 18 new unit tests (99 total) |
| 4.4 – PlanFeature Mapping | DONE | PlanFeature join model (UUID, plan_id FK, feature_id FK, is_enabled, unique constraint on plan+feature), Prisma migration, POST /plans/:id/features (upsert with feature validation), GET /plans/:id/features (includes feature details), AssignFeaturesDto with nested validation, SuperAdmin-only, 5 new unit tests (104 total) |
| 4.5 – Clinic Subscription Fields | DONE | Added plan_id (nullable FK to Plan, SetNull on delete), subscription_status (trial/active/expired/suspended, default trial), trial_ends_at (nullable DateTime), ai_usage_count (default 0) to Clinic model, Prisma migration, SubscriptionStatus enum, DTOs updated, findAll/findOne include plan details, date conversion for trial_ends_at, 104 tests passing |
| 4.6 – Feature Guard | DONE | @RequireFeature('FEATURE_KEY') decorator, global FeatureGuard (APP_GUARD), reads clinic plan via user's clinicId, checks plan_feature mapping for enabled feature, returns 403 if disabled/missing, super admins bypass feature checks, 7 unit tests (114 total) |
| 4.7 – Usage Tracking | DONE | @TrackAiUsage() decorator, global AiUsageGuard (APP_GUARD), reads clinic ai_usage_count + plan ai_quota, blocks with 403 if quota exceeded, increments count atomically on success, ai_quota=0 means unlimited, super admins bypass, 8 unit tests (122 total) |

### EPIC 5 – Core Clinical Modules

| Story | Status | Notes |
|---|---|---|
| 5.1 – Patient Management | DONE | Patient model (UUID, clinic_id FK, branch_id FK, first_name, last_name, phone, email, gender, date_of_birth, blood_group, medical_history JSON, allergies, notes, timestamps), Prisma migration, full CRUD (POST/GET/GET:id/PATCH/DELETE), clinic_id tenant scoping via x-clinic-id header + RequireClinicGuard, branch validation on create, search by phone/name (case-insensitive), filter by branch_id, Gender enum, DTOs with class-validator, Swagger docs, 15 unit tests (137 total) |
| 5.2 – Appointment Scheduling | DONE | Appointment model (UUID, clinic_id FK, branch_id FK, patient_id FK, dentist_id FK→User, appointment_date Date, start_time/end_time HH:mm, status enum scheduled/completed/cancelled/no_show, notes, timestamps), Prisma migration, full CRUD (POST/GET/GET:id/PATCH/DELETE), clinic_id tenant scoping, validates branch/patient/dentist belong to same clinic, time slot conflict detection for dentist (excludes cancelled, excludes self on update), filters by date/dentist/branch, AppointmentStatus enum, HH:mm regex validation, Swagger docs with conflict responses, 21 unit tests (158 total) |
| 5.3 – Treatment & Dental Chart | DONE | Treatment model (UUID, clinic_id FK, branch_id FK, patient_id FK, dentist_id FK→User, tooth_number FDI notation, diagnosis, procedure, status enum planned/in_progress/completed, cost Decimal(10,2), notes, timestamps), Prisma migration, POST/GET/PATCH treatments + GET patients/:id/treatments (dental chart), clinic_id tenant scoping, validates branch/patient/dentist belong to same clinic, dentist re-validation on update, filters by status/dentist/branch, TreatmentStatus enum, cost validation (min 0, max 2 decimals), Swagger docs, 18 unit tests (176 total) |
| 5.4 – Prescription | DONE | Prescription model (UUID, clinic_id FK, branch_id FK, patient_id FK, dentist_id FK→User, diagnosis, instructions, created_at) + PrescriptionItem model (UUID, prescription_id FK cascade, medicine_name, dosage, frequency, duration, notes), Prisma migration, POST /prescriptions (creates with nested items via Prisma create), GET /prescriptions/:id, GET /patients/:id/prescriptions, clinic_id tenant scoping, validates branch/patient/dentist belong to same clinic, nested PrescriptionItemDto with ArrayMinSize(1) + ValidateNested, all responses include items/patient/dentist/branch, Swagger docs, 11 unit tests (187 total) |
| 5.5 – Billing | DONE | Invoice model (UUID, clinic_id FK, branch_id FK, patient_id FK, invoice_number unique per clinic auto-generated INV-YYYYMMDD-XXXX, total_amount/tax_amount/discount_amount/net_amount Decimal(10,2), gst_number optional GSTIN validation, tax_breakdown JSON for CGST/SGST split, status pending/paid/partially_paid) + InvoiceItem (invoice_id FK, treatment_id optional FK→Treatment, item_type enum treatment/service/pharmacy, description, quantity, unit_price, total_price) + Payment (invoice_id FK, method cash/card/upi, amount, notes, installment_item_id optional FK→InstallmentItem, paid_at) + InstallmentPlan (invoice_id unique FK, total_amount, num_installments, notes) + InstallmentItem (installment_plan_id FK, installment_number, amount, due_date, status pending/paid/overdue, paid_at), Prisma migration, POST /invoices (tax % calc, discount, nested items with item_type), GET /invoices (filter by patient/branch/status), GET /invoices/:id (includes installment_plan), POST /payments (validates balance, auto-marks paid/partially_paid, links to installment items), POST /invoices/:id/installment-plan (create plan with items), DELETE /invoices/:id/installment-plan, India GST-ready, 17 unit tests (204 total) |
| 5.6 – Inventory | DONE | InventoryItem model (UUID, clinic_id FK, branch_id FK, name, category, quantity, unit, reorder_level, supplier, timestamps), Prisma migration, POST /inventory (create with branch validation), GET /inventory (filter by branch/name/category, case-insensitive search, low_stock filter), GET /inventory/:id, PATCH /inventory/:id (update quantity/name/category/unit/reorder_level/supplier), clinic_id tenant scoping, includes branch in responses, Swagger docs, 14 unit tests (218 total) |
| 5.7 – Attachments | DONE | Attachment model (UUID, clinic_id FK, branch_id FK, patient_id FK, file_url, type enum xray/report/document, uploaded_by FK→User, created_at), Prisma migration pending (DB offline), POST /attachments (validates branch/patient/uploader belong to clinic), GET /patients/:patientId/attachments (validates patient belongs to clinic), clinic_id tenant scoping, includes branch/patient/uploader in responses, AttachmentType enum, Swagger docs, 11 unit tests (229 total) |
| 5.8 – Audit Logs | DONE | AuditLog model (UUID, clinic_id, user_id nullable, action, entity, entity_id, metadata JSON, created_at), global AuditLogInterceptor registered in main.ts BEFORE ResponseInterceptor (correct ordering so tap() sees raw response with `id`), automatically logs create/update/delete on POST/PATCH/PUT/DELETE, extracts entity from URL (originalUrl) + ENTITY_MAP for singular names, skips GET/auth/health/no-clinic requests, captures IP + user-agent in metadata, strips sensitive fields (password), AuditLogService with log() and findByClinic() (filter by entity/entity_id/action/user_id, paginated), GET /audit-logs endpoint with QueryAuditLogDto, @Global() AuditLogModule, Swagger docs, 19 unit tests (248 total) |
| 5.9 – Dental Tooth Chart | DONE | Tooth model (UUID, fdi_number unique, name, quadrant, position) + ToothSurface model (UUID, name unique, code unique) + PatientToothCondition model (UUID, clinic_id FK, branch_id FK, patient_id FK, tooth_id FK, surface_id nullable FK, condition, severity, notes, diagnosed_by FK→User named relation, timestamps), seed script adds 32 FDI teeth + 5 surfaces (Mesial/Distal/Buccal/Lingual/Occlusal), GET /teeth + GET /tooth-surfaces (reference data), GET /patients/:id/tooth-chart (returns teeth+surfaces+conditions), POST /patient-tooth-condition (validates branch/patient/tooth/surface/dentist), PATCH /patient-tooth-condition/:id (validates surface on update), clinic_id tenant scoping, Swagger docs, 17 unit tests (265 total) |

### EPIC 6 – Testing & API Hardening

| Story | Status | Notes |
|---|---|---|
| 6.1 – Global Validation Hardening | DONE | ValidationPipe already configured globally in main.ts (whitelist: true, forbidNonWhitelisted: true, transform: true), enhanced GlobalExceptionFilter to detect BadRequestException and return standardized VALIDATION_ERROR format (`{ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request payload", details: [...] } }`), non-validation HttpExceptions keep existing format, unknown errors return 500, 10 unit tests (275 total) |
| 6.2 – Pagination Framework | DONE | Reusable PaginationQueryDto (page, limit with validation), PaginatedResult<T> interface + paginate() helper, ResponseInterceptor auto-detects paginated responses and includes meta in API envelope, integrated into 5 modules: patients, appointments, invoices, inventory (with low_stock post-filter + manual slice), audit-logs, all query DTOs extend PaginationQueryDto, services use count + skip/take pattern, all unit tests updated for PaginatedResult format, 275 tests passing |
| 6.3 – Global Response Interceptor | DONE | Standardized all API responses: success → `{success: true, data: ...}` (with optional `meta` for paginated), errors → `{success: false, error: {code, message}}` with HTTP status code mapping (NOT_FOUND, FORBIDDEN, UNAUTHORIZED, CONFLICT, etc.), validation errors → `{success: false, error: {code: "VALIDATION_ERROR", message, details: [...]}}`, unmapped status codes fallback to `HTTP_<code>`, ApiErrorResponse interface added, ResponseInterceptor spec (5 tests), filter spec updated (13 tests), 284 tests passing |
| 6.4 – Error Handling | DONE | Centralized Prisma error handling in GlobalExceptionFilter: P2002 → UNIQUE_CONSTRAINT_VIOLATION (409, extracts target fields), P2025 → RECORD_NOT_FOUND (404, extracts cause), P2003 → FOREIGN_KEY_VIOLATION (400, extracts field_name), unknown Prisma codes → DATABASE_ERROR (500), all error types return standardized `{success: false, error: {code, message}}` format, 7 new Prisma error tests, 31 suites / 291 tests passing |
| 6.5 – Rate Limiting | DONE | @nestjs/throttler integrated, ThrottlerModule with default 100 req/min, ThrottlerGuard registered as global APP_GUARD, login endpoints (POST /auth/login, POST /auth/super-admin/login) overridden to 5 req/min via @Throttle decorator, 429 responses handled by existing GlobalExceptionFilter (TOO_MANY_REQUESTS code), Swagger 429 responses documented on login endpoints, 31 suites / 291 tests passing |
| 6.6 – Transaction Safety | DONE | Prisma interactive transactions (`$transaction`) for: invoice creation (generateInvoiceNumber + create with nested items atomically, prevents duplicate invoice numbers), payment processing (aggregate balance check + create payment + auto-mark paid atomically, prevents race conditions on concurrent payments), prescription creation (create with nested items in transaction), `generateInvoiceNumber` accepts `TransactionClient` param, test mocks updated with `$transaction` pass-through, 31 suites / 291 tests passing |
| 6.7 – Integration Tests | DONE | Two integration test suites: (1) Patient→Appointment→Treatment→Invoice→Payment full dental workflow (register patient, book appointment, record treatment, generate invoice, process UPI payment), plus validation edge cases (time validation, overpayment rejection, treatment ID validation); (2) Clinic Isolation multi-tenant security (10 tests verifying cross-clinic access prevention for patients, appointments, treatments, invoices, payments, branch scoping, listing isolation); (3) Feature Guard & AI Quota enforcement (8+10 tests covering feature gating with plan checks, super admin bypass, disabled features, AI quota atomic increment, concurrent request handling, unlimited quota). 33 suites / 322 tests passing |
| 6.8 – Seed Script & Indexes | DONE | Extended seed script with: test clinic (Smile Dental Clinic, Bangalore, Professional plan, active subscription), 1 branch (Main Branch), 5 test users (1 admin Dr. Priya Sharma, 2 dentists Dr. Rahul Verma + Dr. Anjali Patel, 1 receptionist Meera Nair, 1 staff Suresh Kumar), plan-feature mappings (Starter: inventory only, Professional: 4 features, Enterprise: all 6 features), all with idempotent upsert logic. Database indexes already comprehensive: patients (clinic_id, phone, clinic_id+branch_id, first_name+last_name), appointments (clinic_id, appointment_date, dentist_id+appointment_date), invoices (clinic_id+invoice_number unique, clinic_id, status), audit_logs (clinic_id, created_at, entity+entity_id, user_id). 33 suites / 322 tests passing |

### Epic 7 – Reporting & Analytics

| Story | Status | Notes |
|---|---|---|
| 7.1 – Dashboard Summary | DONE | GET /reports/dashboard-summary endpoint, ReportsModule (controller + service), returns today_appointments (count by date range), today_revenue (payment aggregate by paid_at), pending_invoices (count by status, includes partially_paid), low_inventory_count (raw SQL for quantity <= reorder_level column comparison), all metrics scoped by clinic_id (multi-tenant), parallel Promise.all queries for performance, RequireClinicGuard + x-clinic-id header, Swagger docs, 9 unit tests (34 suites / 331 total) |
| 7.2 – Revenue Reports | DONE | GET /reports/revenue endpoint, RevenueQueryDto (start_date, end_date required + optional branch_id, dentist_id filters), returns total_revenue (actual payments collected including partial), paid_invoices (count), pending_invoices (count), partially_paid_invoices (count), outstanding_amount (remaining balance on paid + partially_paid invoices), tax_collected (sum of tax_amount incl. partially_paid), discount_given (sum of discount_amount incl. partially_paid), dentist filter via items→treatment→dentist_id relation, all scoped by clinic_id, parallel Promise.all, 6 unit tests (34 suites / 337 total) |
| 7.3 – Appointment Analytics | DONE | GET /reports/appointments endpoint, AppointmentAnalyticsQueryDto (start_date, end_date required + optional branch_id, dentist_id), returns total_appointments, completed, cancelled, no_show counts, filters by appointment_date range, dentist_id direct on appointments model, all scoped by clinic_id, parallel Promise.all (4 count queries), 6 unit tests (34 suites / 343 total) |
| 7.4 – Dentist Performance | DONE | GET /reports/dentist-performance endpoint, DentistPerformanceQueryDto (start_date, end_date required + optional branch_id), returns array of per-dentist metrics: dentist_id, dentist_name, appointments_handled, treatments_performed, revenue_generated (sum of treatment cost), single raw SQL query with correlated subqueries for efficiency, filters active dentists by clinic_id+role, optional branch_id filter on all subqueries, BigInt→Number conversion, ordered by revenue DESC, 6 unit tests (34 suites / 349 total) |
| 7.5 – Patient Analytics | DONE | GET /reports/patients endpoint, PatientAnalyticsQueryDto (start_date, end_date required + optional branch_id), returns new_patients (created within date range), returning_patients (created before range but had appointment in range), total_patients (all clinic patients), all scoped by clinic_id, parallel Promise.all (3 count queries), 5 unit tests (34 suites / 354 total) |
| 7.6 – Treatment Analytics | DONE | GET /reports/treatments endpoint, TreatmentAnalyticsQueryDto (start_date, end_date required + optional branch_id, dentist_id), returns most_common_procedures (array of {procedure, count} ordered by count DESC) and procedure_counts (distinct procedure count), raw SQL GROUP BY procedure for efficient aggregation, optional branch/dentist filters, BigInt→Number conversion, all scoped by clinic_id, 6 unit tests (34 suites / 360 total) |
| 7.7 – Inventory Alerts | DONE | GET /reports/inventory-alerts endpoint, returns items where quantity <= reorder_level (raw SQL for column comparison), includes id, name, category, quantity, reorder_level, unit, branch_id, ordered by deficit (reorder_level - quantity) DESC, optional branch_id query param filter, all scoped by clinic_id, 5 unit tests (34 suites / 365 total) |

---

## PHASE 2 – Clinic Web Application (Next.js)

**Goal:** Build a modern, responsive clinic management web app that Indian dental clinic staff (admins, dentists, receptionists) use daily. Designed for speed — receptionists handle 50-80 walk-ins/day, dentists switch between patients every 15-30 mins.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, Tailwind CSS 4, shadcn/ui v4 (base-nova style), TanStack Query v5, Zustand v5, React Hook Form v7 + Zod, Recharts v3, date-fns v4

---

### EPIC 1 – Project Setup & Design System

| Story | Status | Notes |
|---|---|---|
| 1.1 – Initialize Next.js Project | DONE | Next.js 16.1.6 with App Router, TypeScript strict, Tailwind CSS 4 (`@import "tailwindcss"` syntax), ESLint, path aliases (@/*), folder structure (app/, components/, lib/, hooks/, stores/, types/, services/), .env.local with API base URL |
| 1.2 – API Client & Auth Interceptor | DONE | Axios instance with base URL, request interceptor attaches JWT Bearer token + x-clinic-id header from Zustand store, response interceptor unwraps backend envelope ({success, data, meta}), 401 auto-redirect to /login, TypeScript response types matching backend |
| 1.3 – Design Tokens & Theme | DONE | Dental brand palette with teal/cyan primary (oklch 0.55 0.15 200), light/dark mode via next-themes, CSS variables in globals.css, custom success/warning/sidebar colors, 0.5rem border-radius, Inter font via next/font, chart colors |
| 1.4 – Core UI Components (shadcn/ui) | DONE | shadcn/ui v4 (base-nova style) with @base-ui/react primitives: Button, Input, Label, Select, Dialog, Sheet, DropdownMenu, Avatar, Badge, Card, Table, Tabs, Tooltip, Skeleton, Calendar, Popover, Command, Checkbox, RadioGroup, Textarea, Switch, Progress, Separator, ScrollArea |
| 1.5 – Layout Shell | DONE | Collapsible sidebar (240px→64px) with role-filtered nav, sticky topbar with branch selector + theme toggle + user dropdown, mobile sidebar via Sheet, responsive layout |
| 1.6 – Reusable Patterns | DONE | PageHeader, DataTable (TanStack Table v8 with sorting/pagination/empty state/loading skeletons), SearchInput (debounced 300ms), StatCard (icon/label/value/trend/loading), ConfirmDialog (destructive variant), LoadingPage/ErrorPage states, SortableHeader helper |
| 1.7 – Auth Store & Route Protection | DONE | Zustand v5 auth store with persist middleware (localStorage key: dental-auth-storage), fields: token/user/clinicId/branchId/isAuthenticated, methods: setAuth/setClinicId/setBranchId/logout/hasRole, middleware.ts redirects / to /dashboard, dashboard layout redirects unauthenticated to /login |

### EPIC 2 – Authentication & Onboarding

| Story | Status | Notes |
|---|---|---|
| 2.1 – Login Page | DONE | Modern split-screen layout with left branding panel (gradient, decorative circles, stats), icon-prefixed inputs (Building2/Mail/Lock), clinic ID helper text, remember details checkbox, rate limit (429) error handling, supports both result.user object and JWT fallback decoding |
| 2.2 – Clinic Registration Page | DONE | 2-step form with numbered step indicators. Step 1: clinic info (name, email, address, city, phone). Step 2: admin account. Success screen prominently shows Clinic ID with copy-to-clipboard button, amber warning box to save/share ID, summary card with clinic name/admin email/trial info |
| 2.3 – Branch Selector | DONE | Post-login branch selection component in topbar, auto-selects single branch, "All Branches" option for admins, stores branch_id in Zustand |
| 2.4 – Forgot Password Flow | DONE | Email input page with "Coming Soon" graceful handling |

### EPIC 3 – Dashboard

| Story | Status | Notes |
|---|---|---|
| 3.1 – Summary Metrics Cards | DONE | 4 stat cards: Today's Appointments, Today's Revenue (₹ formatted), Pending Invoices (amber if >5), Low Stock Items (red if >0). Data from GET /reports/dashboard-summary, skeleton loading, auto-refresh 60s, click navigates to module |
| 3.2 – Today's Appointment Timeline | DONE | Appointment list with time slots, patient avatars, dentist name, status badges (scheduled/completed/cancelled/no_show), scroll area |
| 3.3 – Revenue Chart (7-Day) | DONE | Stats grid with Total Revenue (hero), Paid/Pending/Partially Paid/Outstanding/Tax/Discounts cards. Partially Paid and Outstanding cards shown conditionally when > 0 |
| 3.4 – Quick Actions Panel | DONE | Role-aware action grid: New Patient, Book Appointment, Create Invoice, View Reports |
| 3.5 – Low Stock & Alerts Sidebar | DONE | Inventory alerts with red styling, item names and remaining quantities |

### EPIC 4 – Patient Management

| Story | Status | Notes |
|---|---|---|
| 4.1 – Patient List Page | DONE | DataTable with search (phone/name), gender filter, pagination, avatar + name column, click navigates to profile |
| 4.2 – Add/Edit Patient Form | DONE | Full form with Indian phone validation (+91 10-digit), blood group dropdown (A+/A-/B+/B-/AB+/AB-/O+/O-), age auto-calc from DOB, branch select, medical history, allergies, Zod validation |
| 4.3 – Patient Profile Page | DONE | Tabbed layout: Overview (info card, medical history, allergies), Appointments tab, Treatments tab, Prescriptions tab, Dental Chart tab (integrated PatientDentalChart component) |
| 4.4 – Patient Quick Search | TODO | Cmd+K search palette (future enhancement) |

### EPIC 5 – Appointment Management

| Story | Status | Notes |
|---|---|---|
| 5.1 – Appointment List View | DONE | DataTable with date/dentist/status/branch filters, status badges, pagination, "Book Appointment" CTA |
| 5.2 – Appointment Calendar View | TODO | Weekly/daily calendar grid (future enhancement) |
| 5.3 – Book Appointment Form | DONE | Form with patient select, dentist select, date picker (no past dates), 15-min time slot intervals, auto end_time (+30min), branch select, notes, conflict validation via backend |
| 5.4 – Appointment Detail & Status Actions | DONE | Detail page with Mark Completed/No Show/Cancel actions, "Start Treatment" quick action (navigates to treatment form pre-filled) |
| 5.5 – Appointment Reminders UI | TODO | Visual indicators and browser notifications (future enhancement) |

### EPIC 6 – Treatment Management

| Story | Status | Notes |
|---|---|---|
| 6.1 – Treatment List Page | DONE | DataTable with status (planned/in_progress/completed) and dentist filters, color-coded badges, tooth #, procedure, cost (₹), pagination |
| 6.2 – Add/Edit Treatment Form | DONE | Form with FDI tooth selector (all 32 teeth with names), procedure dropdown (RCT, Extraction, Filling, Crown, Bridge, Scaling, Implant, Orthodontics, Denture, Teeth Whitening, Other), status radio, cost (₹), diagnosis, notes |
| 6.3 – Treatment Plan View | TODO | Patient-centric grouped view (future enhancement) |
| 6.4 – Prescription Form | TODO | Prescription creation dialog (future enhancement) |

### EPIC 7 – Interactive Dental Chart

| Story | Status | Notes |
|---|---|---|
| 7.1 – Tooth Chart SVG Component | DONE | Interactive SVG with all 32 adult teeth in dental arch layout (upper 18→11, 21→28 / lower 38→31, 41→48), clickable teeth, hover tooltips, selected tooth highlighting, anatomically proportional sizing (molars > premolars > canines > incisors), custom SVG paths per tooth type with realistic root shapes |
| 7.2 – Tooth Condition Overlay | DONE | Color-coded overlays: Cavity=red, Filled=blue, Crown=gold, Missing=gray X pattern, RCT=purple, Implant=teal, Fracture=orange, Decay=red. Surface-level highlighting (Mesial/Distal/Buccal/Lingual/Occlusal as colored sections), condition dot indicators, color legend |
| 7.3 – Tooth Detail Panel | DONE | Side panel with tooth info, existing conditions list (severity badges), "Add Condition" dialog (condition dropdown with color dots, severity, surface, notes), "Add Treatment" quick action pre-fills tooth_number |
| 7.4 – Dental Chart in Patient Profile | DONE | Wrapper component that fetches teeth/surfaces/conditions, full DentalChart + ToothDetailPanel, fullscreen toggle, print support, summary stats (teeth affected/conditions/healthy), dedicated route /patients/[id]/dental-chart |

### EPIC 8 – Billing & Invoicing

| Story | Status | Notes |
|---|---|---|
| 8.1 – Invoice List Page | DONE | DataTable with invoice # (font-mono), patient name, total/discount/net amounts (₹), status badges (pending=amber, paid=green, partially_paid=blue), status filter (includes Partially Paid), row click to detail, pagination |
| 8.2 – Create Invoice Form | DONE | Multi-card form: patient/branch/GST selection, dynamic line items array with item_type (treatment/service/pharmacy), "Add from treatments" dropdown (pulls patient treatments with status label), "Add from pharmacy" dropdown (pulls inventory items), type badges (Tx=blue, Svc=gray, Rx=green), column headers for Type/Description/Qty/Unit Price/Total, discount (₹), tax % with live calculation, subtotal/discount/tax/net summary, Zod validation |
| 8.3 – Invoice Detail & Print | DONE | Full invoice view with clinic header, patient details, invoice # + date, GST number, itemized table (#, description, type badge, qty, unit price, total), subtotal/discount/tax/CGST+SGST breakdown/net total, paid amount (green) + balance due (amber, always visible when > 0), installment plan section (create/view/delete plan, table with #/due date/amount/status badges/paid on/pay action, dialog to create 2-12 installments with auto-split + editable amounts/dates), payment history table with notes column, print via react-to-print with @media print CSS (A4 format, sidebar/topbar hidden) |
| 8.4 – Payment Recording | DONE | Dialog from invoice detail: amount pre-filled with balance, payment method select (Cash/Card/UPI), notes field, installment item linking (auto-fills when paying via installment plan Pay button), validates positive amount, auto-marks invoice as partially_paid or paid based on cumulative payments, auto-refreshes invoice + shows updated payment history, success toast |
| 8.5 – Payment Summary Widget | DONE | Today's collections card in dashboard sidebar: total revenue from reports API, payment method breakdown (Cash/Card/UPI) with icons + colored backgrounds, fetches all invoices (not just paid) to include partial payments in today's breakdown, 60s stale time |

### EPIC 9 – Inventory Management

| Story | Status | Notes |
|---|---|---|
| 9.1 – Inventory List Page | DONE | DataTable with item name (Package icon), category badges, quantity with low-stock alert (red text + AlertTriangle icon when ≤ reorder level), reorder level, supplier, branch, search input, "Low Stock Only" toggle (Switch component), row click to edit, pagination |
| 9.2 – Add/Edit Inventory Item | DONE | Forms with dental-specific categories (Consumables, Instruments, Equipment, Medication, PPE, Impression Materials, Restorative, Endodontic, Orthodontic, Other), units (pcs/boxes/packs/bottles/tubes/rolls/kg/litres/ml/pairs), quantity, reorder level, supplier, branch select. Edit page fetches existing item and pre-fills form |
| 9.3 – Low Stock Alerts Dashboard | DONE | Integrated into Reports page Inventory tab: table of items below reorder level with category, current qty (red), reorder level. Also shown on dashboard AlertsSidebar |

### EPIC 10 – Reports & Analytics

| Story | Status | Notes |
|---|---|---|
| 10.1 – Reports Landing Page | DONE | Single-page tabbed layout with date range picker (from/to inputs + quick selectors: Today/Last 7 days/This month), summary stat cards (Total Revenue, Appointments, New Patients, Low Stock Items), 6 tabs for each report type |
| 10.2 – Revenue Report | DONE | Revenue tab: Total Revenue, Paid Invoices, Pending Invoices, Partially Paid Invoices (shown when > 0), Tax Collected metrics in grid, Discounts Given, Outstanding Amount (shown when > 0), all ₹ formatted |
| 10.3 – Appointment Analytics | DONE | Appointments tab: Total/Completed/Cancelled/No Show metrics grid, Recharts PieChart with status distribution (color-coded: completed=green, cancelled=red, no_show=amber, scheduled=indigo) |
| 10.4 – Dentist Performance | DONE | Dentists tab: Recharts BarChart comparing appointments handled vs treatments performed per dentist, detailed table with dentist name, appointments, treatments, revenue (₹) |
| 10.5 – Patient Analytics | DONE | Patients tab: New Patients, Returning Patients, Total Patients as large metrics in styled cards |
| 10.6 – Treatment Analytics | DONE | Treatments tab: Horizontal BarChart of most common procedures by count, total procedure count |

### EPIC 11 – Staff & Settings

| Story | Status | Notes |
|---|---|---|
| 11.1 – Staff List Page | DONE | DataTable with avatar + name/email, role badges (Admin=purple, Dentist=teal, Receptionist=blue, Staff=gray with Shield icon), branch, status badge, joined date, search input, role filter dropdown, dropdown menu actions (edit/remove), confirm dialog for removal, prevents self-deletion |
| 11.2 – Add/Edit Staff Form | DONE | Add form: name, email, password (min 6 chars), role dropdown, branch dropdown (empty = all branches), Zod validation. Edit form: name, email, role, branch, status (active/inactive), no password change (separate flow) |
| 11.3 – Clinic Settings Page | DONE | Clinic info editor (name, email, phone, location) with PATCH, subscription info card (status badge, plan name, clinic ID, trial end date), branches table listing all branches |
| 11.4 – User Profile & Preferences | TODO | Self-edit profile, password change (future enhancement) |

### EPIC 12 – Audit Log Viewer

| Story | Status | Notes |
|---|---|---|
| 12.1 – Audit Log Page | DONE | DataTable with timestamp (Clock icon + formatted), action badges (create=green, update=blue, delete=red, login=purple, logout=gray), entity (capitalized), entity ID (truncated mono), user ID (truncated mono or "System"), metadata preview (truncated JSON), entity filter dropdown (13 entity types incl. auth/attachment/notification), action filter dropdown (5 action types), pagination 30/page |

### EPIC 13 – Responsiveness & Polish

| Story | Status | Notes |
|---|---|---|
| 13.1 – Tablet Optimization | DONE | All pages use responsive grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/4), sidebar collapses on lg breakpoint, mobile sidebar via Sheet, tables in bordered containers with horizontal scroll, forms stack on mobile |
| 13.2 – Loading & Error States | DONE | Skeleton loaders on all data-fetching pages via DataTable loading prop, LoadingPage component (spinner), ErrorPage component (message + retry button), empty states with icons and descriptions on all tables |
| 13.3 – Toast Notifications System | DONE | Sonner toaster (bottom-right, rich colors, close button, 3s duration), success/error toasts on all CRUD operations consistently |
| 13.4 – Keyboard Shortcuts | DONE | useKeyboardShortcuts hook: Alt+D=Dashboard, Alt+P=Patients, Alt+A=Appointments, Alt+T=Treatments, Alt+I=Invoices, Alt+R=Reports, Alt+S=Settings. Skips when typing in inputs/textareas. Integrated in dashboard layout |
| 13.5 – Performance Optimization | DONE | TanStack Query with staleTime 30s for lists, refetchOnWindowFocus disabled, retry 1, auto-refresh 60s on dashboard summary, paginated queries with proper cache keys |

---

### Phase 2 Summary

**Total Routes: 23** (including 7 dynamic routes)
- Auth: /login, /register, /forgot-password
- Dashboard: /dashboard
- Patients: /patients, /patients/new, /patients/[id], /patients/[id]/edit, /patients/[id]/dental-chart
- Appointments: /appointments, /appointments/new, /appointments/[id]
- Treatments: /treatments, /treatments/new
- Invoices: /invoices, /invoices/new, /invoices/[id]
- Inventory: /inventory, /inventory/new, /inventory/[id]/edit
- Reports: /reports
- Staff: /staff, /staff/new, /staff/[id]/edit
- Settings: /settings
- Audit Logs: /audit-logs

**Key Libraries:** Next.js 16.1.6, Tailwind CSS 4, shadcn/ui v4 (base-nova), TanStack Query v5, TanStack Table v8, Zustand v5, React Hook Form v7, Zod, Recharts v3, date-fns v4, sonner v2, next-themes, react-to-print, lucide-react

---

## PHASE 2.5 — Frontend Hardening & UX Polish

**Goal:** Make the UI reliable enough for daily clinic use (50-80 patients/day).

### Epic 1 — Advanced Table Features

| Story | Status | Notes |
|---|---|---|
| 1.1 – Column Visibility Toggle | DONE | DataTable column hide/show dropdown via Settings2 icon, DropdownMenu with checkbox items per column |
| 1.2 – Advanced Column Filtering | TODO | Per-column filter dropdowns on table headers |
| 1.3 – Row Actions Menu | DONE | 3-dot DropdownMenu on patients (view/edit/delete), appointments (view/status changes), treatments (view/edit), inventory (edit), invoices (already had view). ConfirmDialog for destructive actions |
| 1.4 – Table Export Button | DONE | Export dropdown (CSV/Excel) integrated into DataTable toolbar on all 6 list pages |
| 1.5 – Bulk Selection & Actions | PARTIAL | Checkbox column infrastructure added (enableRowSelection prop, selection count display), bulk action buttons on pages not yet wired |

### Epic 2 — Workflow & Navigation Polish

| Story | Status | Notes |
|---|---|---|
| 2.1 – Breadcrumb Navigation | DONE | Custom Breadcrumbs component (Home icon + linked items + current page span), added to 18 nested/detail pages |
| 2.2 – Back Button Consistency | DONE | Already existed on detail/edit pages from Phase 2 |
| 2.3 – Unsaved Changes Warning | TODO | beforeunload + router warning on dirty forms |
| 2.4 – Appointment Calendar View | DONE | Already existed from Phase 2 (Epic 5.2) |
| 2.5 – Prescription Creation Form | TODO | Full prescription dialog from patient profile |

### Epic 3 — Data Export

| Story | Status | Notes |
|---|---|---|
| 3.1 – CSV Export | DONE | papaparse installed, exportToCSV() utility, pre-defined configs for patients/appointments/treatments/invoices/inventory/staff |
| 3.2 – Excel Export | DONE | xlsx (SheetJS) + file-saver installed, exportToExcel() utility with formatted columns/headers, same 6 pages |
| 3.3 – PDF Report Export | TODO | @react-pdf/renderer or jspdf — invoices, patient summary, revenue report |
| 3.4 – Print Enhancements | TODO | Print support for patient summary, treatment plan, reports page |

### Epic 4 — Performance Optimization

| Story | Status | Notes |
|---|---|---|
| 4.1 – Route-Level Code Splitting | DONE | loading.tsx files created for 10 route segments (patients, appointments, treatments, invoices, inventory, staff, reports, audit-logs, settings, prescriptions) |
| 4.2 – Virtual Scrolling | TODO | @tanstack/react-virtual for 100+ row tables |
| 4.3 – Image & Asset Optimization | TODO | Lazy avatars, optimize SVG, Next.js Image |
| 4.4 – Query Optimization | TODO | Cache key review, prefetch on hover, parallel queries |

### Epic 5 — Frontend Testing

| Story | Status | Notes |
|---|---|---|
| 5.1 – Setup Vitest + RTL | DONE | vitest 4.1.0, @testing-library/react, @testing-library/jest-dom/vitest, jsdom env, vitest.config.ts, setup.tsx with mocks for next/navigation, next/link, next-themes |
| 5.2 – Component Unit Tests | PARTIAL | 20 tests passing: auth-store (9), export utility (6), breadcrumbs (5). DataTable, DentalChart, InvoiceForm still TODO |
| 5.3 – E2E Tests (Playwright) | TODO | Login, patient CRUD, appointment booking, invoice + payment |

---

## PHASE 3 — Operational Features ✅

**Goal:** Real-world clinic features — notifications, scheduling, activity tracking.

### Epic 1 — Notification System (Backend) ✅

| Story | Status | Notes |
|---|---|---|
| 1.1 – Notification Module & Model | ✅ DONE | Prisma model, migration, CRUD service, controller (GET list, unread-count, PATCH read, read-all) |
| 1.2 – Notification Queue | ✅ DONE | BullMQ notification_queue, producer + processor pattern |
| 1.3 – Appointment Reminders | ✅ DONE | @nestjs/schedule cron daily 8AM — next-day appointment reminders for dentists |
| 1.4 – Payment & Overdue Alerts | ✅ DONE | Cron daily 9AM — overdue installments, marks as overdue, notifies admins |
| 1.5 – Low Inventory Alerts | ✅ DONE | Cron daily 7AM — items where quantity <= reorder_level, notifies admins |
| 1.6 – Real-Time Notifications (WebSocket) | DEFERRED | Planned for later phase — requires WebSocket gateway infrastructure |

### Epic 2 — Notification System (Frontend) ✅

| Story | Status | Notes |
|---|---|---|
| 2.1 – Notification Bell & Dropdown | ✅ DONE | Bell icon in topbar with unread count badge, recent 5 dropdown, auto-refresh 30s |
| 2.2 – Notification Center Page | ✅ DONE | /notifications page with type filter, read status filter, pagination, mark-as-read |
| 2.3 – Notification Preferences | DEFERRED | Per-user preferences planned for later |

### Epic 3 — Enhanced Audit & Activity ✅

| Story | Status | Notes |
|---|---|---|
| 3.1 – Audit Log Detail View | ✅ DONE | Redesigned Sheet sidebar: hero section with action icon + badge + entity name + timestamp, IDs card (Entity ID, User ID, Log ID) with click-to-copy, "View" deep link to entity pages, smart MetadataViewer separates simple key-values (2-col grid) from complex objects (styled JSON blocks), underscore-to-space label formatting, wider panel (sm:max-w-xl) |
| 3.2 – User Activity Timeline | ✅ DONE | Staff edit page — 2-column layout with recent activity card (last 20 actions) |
| 3.3 – Login History | ✅ DONE | Login events logged via AuditLogService with `await` (immediate, not fire-and-forget), email + role + IP + user-agent metadata |

### Epic 4 — Scheduling Enhancements ✅

| Story | Status | Notes |
|---|---|---|
| 4.1 – Branch Working Hours | ✅ EXISTED | Already implemented — working hours, lunch break, slot duration, buffer, advance booking, working days |
| 4.2 – Dentist Availability | ✅ EXISTED | Available slots API with slot visualization in booking form |
| 4.3 – Appointment Reschedule | ✅ EXISTED | Update endpoint supports date/time/status changes |
| 4.4 – Recurring Appointments | ✅ DONE | recurrence_group_id field, backend createRecurring (weekly/biweekly/monthly), frontend booking form with proper display names in Select dropdowns (patient/dentist/branch show name, not UUID) |

### Bug Fixes & Improvements (Post Phase 3)

| Fix | Status | Notes |
|---|---|---|
| Audit Log Interceptor — CRUD entries not recorded | ✅ FIXED | Root cause: NestJS interceptor ordering. `ResponseInterceptor` (useGlobalInterceptors) wrapped response in `{success, data}` envelope before `AuditLogInterceptor` (APP_INTERCEPTOR in module) could read `id`. Fix: moved AuditLogInterceptor to main.ts registered BEFORE ResponseInterceptor, added fallback to check `data.id` for robustness, added `ENTITY_MAP` for singular entity names, `request.originalUrl` instead of `request.path`, IP + user-agent metadata capture, try/catch in tap() |
| Login Audit Delay | ✅ FIXED | Changed from fire-and-forget to `await` so login appears immediately in audit logs |
| Recurring Appointment Select Display | ✅ FIXED | Patient/Doctor/Branch Select components showed UUID after selection. Added lookup maps and explicit children in `<SelectValue>` for display names |
| TypeScript Compilation Errors (19 errors) | ✅ FIXED | prisma.config.ts directUrl removal, import type for JwtPayload (TS1272), enum string literals in integration specs, missing item_type in invoice spec |

---

## PHASE 4 — Production Readiness & Launch

**Goal:** Security, deployment, monitoring — ready for real clinics.

### Epic 1 — Security Hardening

| Story | Status | Notes |
|---|---|---|
| 1.1 – Helmet Security Headers | TODO | CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| 1.2 – CSRF Protection | TODO | Double-submit cookie pattern |
| 1.3 – Rate Limiting Verification | TODO | Verify Throttler global application, IP-based logging |
| 1.4 – Secure Cookie Configuration | TODO | HTTPOnly, Secure, SameSite=Strict for auth |
| 1.5 – Input Sanitization | TODO | HTML/script sanitization on text fields (prevent stored XSS) |
| 1.6 – Dependency Audit | TODO | npm audit + integrate in CI |

### Epic 2 — Monitoring & Logging

| Story | Status | Notes |
|---|---|---|
| 2.1 – Sentry (Backend) | TODO | @sentry/nestjs, DSN, error + transaction tracing |
| 2.2 – Sentry (Frontend) | TODO | @sentry/nextjs, error boundary, breadcrumbs, user context |
| 2.3 – Structured Logging | TODO | pino/winston, JSON logs, request_id + clinic_id context |
| 2.4 – Health Check Enhancement | TODO | DB, Redis, disk, memory checks. /ready endpoint |
| 2.5 – Uptime Monitoring | TODO | UptimeRobot/BetterStack for API + frontend |

### Epic 3 — Deployment & Infrastructure

| Story | Status | Notes |
|---|---|---|
| 3.1 – Frontend Dockerfile | TODO | Multi-stage, Next.js standalone output |
| 3.2 – Docker Compose | TODO | backend + frontend + PostgreSQL + Redis, volumes |
| 3.3 – Environment Configuration | TODO | .env.example files, env var validation on startup |
| 3.4 – CI/CD Pipeline (GitHub Actions) | TODO | lint → type-check → test → build → deploy |
| 3.5 – Staging Environment | TODO | Render/Railway, auto-deploy from develop branch |
| 3.6 – Database Migration Strategy | TODO | Automated migration in CI, rollback procedures |

### Epic 4 — Backup & Disaster Recovery

| Story | Status | Notes |
|---|---|---|
| 4.1 – Database Backup Automation | TODO | pg_dump daily to S3/R2, 30-day retention |
| 4.2 – Backup Verification | TODO | Monthly restore test, documented procedure |
| 4.3 – Data Export for Compliance | TODO | Clinic admin full data export (data portability) |

### Epic 5 — Pre-Launch

| Story | Status | Notes |
|---|---|---|
| 5.1 – Landing Page | TODO | Marketing page: features, pricing, CTA to register |
| 5.2 – Terms & Privacy Policy | TODO | Legal pages, medical data handling policies |
| 5.3 – Onboarding Flow | TODO | First-login tutorial: branch → staff → patient → appointment |
| 5.4 – Plan Selection at Registration | TODO | Plan picker during registration, feature comparison |
| 5.5 – Payment Integration (Razorpay) | TODO | Subscription billing, webhooks, upgrade/downgrade |

---

## PHASE 5 — AI Features

**Goal:** AI-powered clinical features using plan-based quota (already built).

### Epic 1 — AI Service Foundation

| Story | Status | Notes |
|---|---|---|
| 1.1 – AI Service Module | TODO | NestJS module wrapping OpenAI/Anthropic, token tracking, queue-based |
| 1.2 – AI Quota Enforcement | DONE | AiUsageGuard already tracks per-clinic usage against plan quota |

### Epic 2 — Clinical AI Features

| Story | Status | Notes |
|---|---|---|
| 2.1 – Auto Clinical Notes | TODO | AI generates structured notes from treatment data, dentist reviews |
| 2.2 – Prescription Suggestions | TODO | Suggest medicines/dosage based on diagnosis + treatment |
| 2.3 – Patient Education Generator | TODO | Patient-friendly procedure explanations, shareable |
| 2.4 – Follow-Up Message Generator | TODO | Draft post-treatment care SMS/WhatsApp messages |
| 2.5 – Smart Scheduling Suggestions | TODO | AI suggests follow-up dates based on treatment plan + availability |

---

## PHASE 6 — Mobile App (React Native)

**Goal:** Dentist-focused mobile app for on-the-go access.

### Epic 1 — Setup & Auth

| Story | Status | Notes |
|---|---|---|
| 1.1 – React Native Init | TODO | Expo + TypeScript, shared API types |
| 1.2 – Mobile Login | TODO | Clinic ID + email + password, biometric auth |
| 1.3 – Push Notifications | TODO | Firebase Cloud Messaging |

### Epic 2 — Dentist Mobile Workflow

| Story | Status | Notes |
|---|---|---|
| 2.1 – Today's Schedule | TODO | Today's appointments list, pull-to-refresh |
| 2.2 – Patient Quick View | TODO | Search, profile summary, recent treatments |
| 2.3 – Treatment Update | TODO | Mark status, add notes, update cost |
| 2.4 – Quick Prescription | TODO | Create prescription with auto-suggest |
| 2.5 – Offline Support | TODO | Cache today's data, sync when online |
