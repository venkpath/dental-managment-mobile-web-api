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

### Epic 6 — Notification System (Backend) ✅

| Story | Status | Notes |
|---|---|---|
| 6.1 – Notification Module & Model | ✅ DONE | Prisma model, migration, CRUD service, controller (GET list, unread-count, PATCH read, read-all) |
| 6.2 – Notification Queue | ✅ DONE | BullMQ notification_queue, producer + processor pattern |
| 6.3 – Appointment Reminders | ✅ DONE | @nestjs/schedule cron daily 8AM — next-day appointment reminders for dentists |
| 6.4 – Payment & Overdue Alerts | ✅ DONE | Cron daily 9AM — overdue installments, marks as overdue, notifies admins |
| 6.5 – Low Inventory Alerts | ✅ DONE | Cron daily 7AM — items where quantity <= reorder_level, notifies admins |
| 6.6 – Real-Time Notifications (WebSocket) | DEFERRED | Planned for later phase — requires WebSocket gateway infrastructure |

### Epic 7 — Notification System (Frontend) ✅

| Story | Status | Notes |
|---|---|---|
| 7.1 – Notification Bell & Dropdown | ✅ DONE | Bell icon in topbar with unread count badge, recent 5 dropdown, auto-refresh 30s |
| 7.2 – Notification Center Page | ✅ DONE | /notifications page with type filter, read status filter, pagination, mark-as-read |
| 7.3 – Notification Preferences | DEFERRED | Per-user preferences planned for later |

### Epic 8 — Enhanced Audit & Activity ✅

| Story | Status | Notes |
|---|---|---|
| 8.1 – Audit Log Detail View | ✅ DONE | Redesigned Sheet sidebar: hero section with action icon + badge + entity name + timestamp, IDs card (Entity ID, User ID, Log ID) with click-to-copy, "View" deep link to entity pages, smart MetadataViewer separates simple key-values (2-col grid) from complex objects (styled JSON blocks), underscore-to-space label formatting, wider panel (sm:max-w-xl) |
| 8.2 – User Activity Timeline | ✅ DONE | Staff edit page — 2-column layout with recent activity card (last 20 actions) |
| 8.3 – Login History | ✅ DONE | Login events logged via AuditLogService with `await` (immediate, not fire-and-forget), email + role + IP + user-agent metadata |

### Epic 9 — Scheduling Enhancements ✅

| Story | Status | Notes |
|---|---|---|
| 9.1 – Branch Working Hours | ✅ EXISTED | Already implemented — working hours, lunch break, slot duration, buffer, advance booking, working days |
| 9.2 – Dentist Availability | ✅ EXISTED | Available slots API with slot visualization in booking form |
| 9.3 – Appointment Reschedule | ✅ EXISTED | Update endpoint supports date/time/status changes |
| 9.4 – Recurring Appointments | ✅ DONE | recurrence_group_id field, backend createRecurring (weekly/biweekly/monthly), frontend booking form with proper display names in Select dropdowns (patient/dentist/branch show name, not UUID) |

### Bug Fixes & Improvements (Phase 2.5)

| Fix | Status | Notes |
|---|---|---|
| Audit Log Interceptor — CRUD entries not recorded | ✅ FIXED | Root cause: NestJS interceptor ordering. `ResponseInterceptor` (useGlobalInterceptors) wrapped response in `{success, data}` envelope before `AuditLogInterceptor` (APP_INTERCEPTOR in module) could read `id`. Fix: moved AuditLogInterceptor to main.ts registered BEFORE ResponseInterceptor, added fallback to check `data.id` for robustness, added `ENTITY_MAP` for singular entity names, `request.originalUrl` instead of `request.path`, IP + user-agent metadata capture, try/catch in tap() |
| Login Audit Delay | ✅ FIXED | Changed from fire-and-forget to `await` so login appears immediately in audit logs |
| Recurring Appointment Select Display | ✅ FIXED | Patient/Doctor/Branch Select components showed UUID after selection. Added lookup maps and explicit children in `<SelectValue>` for display names |
| TypeScript Compilation Errors (19 errors) | ✅ FIXED | prisma.config.ts directUrl removal, import type for JwtPayload (TS1272), enum string literals in integration specs, missing item_type in invoice spec |

---

## PHASE 3 — Communication & Patient Engagement Platform ✓ COMPLETE

**Goal:** Enable clinics to communicate with patients through Email, SMS, WhatsApp, and In-app notifications — for reminders, campaigns, greetings, follow-ups, referrals, and authentication. Build a best-in-class patient engagement platform for Indian dental clinics.

**Architecture:** Channel-agnostic pipeline: Event → Communication Service (dedup, preference check, DND) → Template Engine → Queue (BullMQ, rate-limited) → Channel Provider (fallback chain) → Email/SMS/WhatsApp → Delivery Webhook → Update Logs

### Epic 1 — Communication Infrastructure

| Story | Status | Notes |
|---|---|---|
| 1.1 – Communication Module | DONE | CommunicationModule, CommunicationService, CommunicationController, 7 DTOs (send-message, query-message, update-preferences, update-clinic-settings, create/update/query-template), CommunicationProducer |
| 1.2 – Communication Queues | DONE | BullMQ queues: communication_email, communication_sms, communication_whatsapp. Registered via BullModule.registerQueue(). Workers: EmailWorker, SmsWorker, WhatsAppWorker. Retries with exponential backoff |
| 1.3 – Communication Message Entity | DONE | CommunicationMessage model: id, clinic_id, patient_id, template_id, channel, category, subject, body, recipient, status (queued/scheduled/sent/delivered/failed/skipped), skip_reason, scheduled_at, sent_at, metadata. Prisma migration applied |
| 1.4 – Communication Logs | DONE | CommunicationLog model: message_id FK, recipient, channel, provider, status, provider_message_id, sent_at, delivered_at, read_at, failed_at, error_message, cost. Separate from message record for delivery tracking |
| 1.5 – Channel Provider Interface | DONE | ChannelProvider interface with configure/send/isConfigured. Implementations: EmailProvider (nodemailer), SmsProvider (MSG91), WhatsAppProvider (stub). Per-clinic configuration via Map |
| 1.6 – Message Deduplication | DONE | checkDeduplication() — hashes patient_id + template_id + channel, checks within 24hr window, skips with 'dedup_duplicate' reason |
| 1.7 – Channel Fallback Logic | DONE | fallback_chain stored in ClinicCommunicationSettings. Runtime fallback implemented: workers call handleChannelFallback() on final retry failure, reads chain, re-queues to next enabled channel with correct recipient |
| 1.8 – Circuit Breaker | DONE | isCircuitOpen() checks last 100 messages per clinic+channel — if >=20% failed, skips with 'circuit_breaker_open'. getCircuitBreakerStatus() API endpoint at GET /communication/circuit-breaker. Constant: CIRCUIT_BREAKER_WINDOW=100, CIRCUIT_BREAKER_THRESHOLD=0.2 |

### Epic 2 — Message Template System

| Story | Status | Notes |
|---|---|---|
| 2.1 – Template Entity | DONE | MessageTemplate model: id, clinic_id (null=system), channel, category, template_name, subject, body, variables (string[]), language, is_active, dlt_template_id, whatsapp_template_status. Prisma migration applied |
| 2.2 – Template Rendering Engine | DONE | TemplateRenderer: {{variable}} placeholders, {{var \| format:"..."}} pipes (currency, date), {{#if var}}...{{/if}} conditionals, extractVariables() utility. Missing variables → empty string |
| 2.3 – Template Management API | DONE | TemplateController: POST/GET/PATCH/DELETE /communication/templates. Filters: channel, category, language, search. Pagination. System templates (clinic_id=null) read-only, clinic templates override system ones via findByName orderBy clinic_id desc |
| 2.4 – Default Templates (Seed) | DONE | seed-templates.ts with 20+ templates: Appointment Reminder (24hr, 2hr), Installment Due/Overdue/Payment Confirmation, Birthday/Festival/Anniversary Greetings, Post-Treatment Care (Extraction/RCT/Filling/Scaling), Feedback Request, Google Review, No-Show Follow-Up, Treatment Plan Reminder, Prescription Refill, Reactivation (Gentle/With Offer), General Campaign, Referral Invitation/Reward, Email Verification, Password Reset, OTP Verification. Seeded on startup via CommunicationModule.onModuleInit |
| 2.5 – Multilingual Support | DONE | language field on model (default 'en'), findByName() falls back to English. 18 Hindi templates seeded (appointment reminders, payment, birthday, festival, anniversary, post-treatment, feedback, no-show, treatment plan, prescription refill, reactivation, referral, OTP) |
| 2.6 – Template Categories & Tagging | DONE | Categories: reminder, greeting, campaign, transactional, follow_up, referral. DLT template ID field for SMS DLT routing |

### Epic 3 — Email Channel Integration

| Story | Status | Notes |
|---|---|---|
| 3.1 – Email Provider | DONE | EmailProvider with per-clinic nodemailer transporter, configure()/verify()/send(), connection timeout settings, SMTP env fallback (SMTP_HOST/PORT/USER/PASS/FROM/SECURE) for clinics without custom config |
| 3.2 – Email Worker | DONE | EmailWorker (BullMQ processor): renders template → sends via provider → creates CommunicationLog → updates message status. Retry on failure |
| 3.3 – HTML Email Templates | DONE | renderRichEmailHtml() — responsive HTML email with clinic logo, CTA button, bullet list conversion, preheader text, mobile-responsive @media query, footer customization. Uses TemplateRenderer for variable substitution |

### Epic 4 — SMS Channel + DLT Compliance

| Story | Status | Notes |
|---|---|---|
| 4.1 – SMS Provider Integration | DONE | SmsProvider with per-clinic MSG91 config (apiKey, senderId, dltEntityId, route). Env fallback (SMS_API_KEY/SENDER_ID/ENTITY_ID). Uses /api/v5/sms/send for standard + /api/v5/flow/ for flow-based sends. Phone normalization (strips +91) |
| 4.2 – DLT Template Registration | DONE | dlt_template_id field on MessageTemplate. DLT_TE_ID passed in MSG91 API call. Env fallback SMS_DEFAULT_DLT_TEMPLATE_ID for testing with a single DLT template. Variable aliasing (patient_first_name → name) for template compatibility |
| 4.3 – SMS Worker | DONE | SmsWorker (BullMQ processor): DLT template ID passthrough, creates CommunicationLog, status updates. Raw response logging for debugging |
| 4.4 – SMS Delivery Reports | DONE | CommunicationLog tracks delivery status. MSG91 delivery webhook at POST /communication/webhooks/sms/delivery — maps MSG91 status codes (1→delivered, 2→failed, etc.), updates CommunicationLog by provider_message_id, cascades to parent message status |

### Epic 5 — WhatsApp Business API

| Story | Status | Notes |
|---|---|---|
| 5.1 – WhatsApp BSP Integration | DONE | WhatsAppProvider with real Gupshup API calls via fetch() with URL-encoded form body to /msg endpoint. Per-clinic config (apiKey, phoneNumberId, wabaId, providerUrl). Supports text, template (HSM), interactive, and media message types |
| 5.2 – Template Approval Workflow | DONE | submitTemplate() POST to Gupshup template API, getTemplateStatus() GET status. Endpoints: POST /communication/whatsapp/templates/submit, GET /communication/whatsapp/templates/:templateName/status. Auto-syncs approval status to DB, activates/deactivates template |
| 5.3 – Interactive Messages | DONE | buildInteractivePayload() — supports quick reply buttons (max 3) and URL buttons with dynamic suffix. Sent as type=interactive via Gupshup API |
| 5.4 – Media Messages | DONE | buildMediaPayload() — supports image (with preview URL), document (with filename), video, audio, location (with name/address). Sent as type=image/document/video/audio/location |
| 5.5 – Session Messaging | DONE | 24-hour session window tracking via sessionWindows Map per clinic. trackIncomingMessage() records last message, isSessionOpen() checks window. Text messages sent in-session, template HSM messages sent outside session |
| 5.6 – Webhook & Delivery Tracking | DONE | handleWhatsAppWebhook() at POST /communication/webhooks/whatsapp — processes Gupshup events: message-event (delivery/read receipts with status mapping), message (incoming messages with session tracking) |

### Epic 6 — Patient Preferences + TRAI Compliance

| Story | Status | Notes |
|---|---|---|
| 6.1 – Communication Preferences Table | DONE | PatientCommunicationPreference model: patient_id (unique FK), allow_email/sms/whatsapp/marketing/reminders (booleans), preferred_channel, preferred_language, quiet_hours_start/end. Prisma migration applied |
| 6.2 – Preference API | DONE | GET/PATCH /communication/patients/:patientId/preferences. Validates patient belongs to clinic |
| 6.3 – Preference Enforcement | DONE | checkPatientPreferences() before every send — checks channel allow flag + category (marketing vs reminders). Skips with reason logged |
| 6.4 – DND / Quiet Hours Enforcement | DONE | checkDndHours() uses patient prefs → clinic settings → TRAI default (21:00-09:00 IST). Promotional messages auto-delayed to next valid window via getNextValidWindow(). Transactional exempt |
| 6.5 – Consent Audit Trail | DONE | ConsentAuditLog model: patient_id, field_changed, old_value, new_value, changed_by, source, ip_address. Logged on preference changes |
| 6.6 – Self-Service Opt-Out Link | DONE | HMAC-SHA256 signed opt-out tokens (90-day expiry, constant-time comparison). generateOptOutUrl() auto-appended to promotional messages. Public endpoints: POST /communication/opt-out (process), GET /communication/opt-out/verify. Consent audit trail logged with source='opt_out_link'. Supports per-channel or full marketing opt-out |
| 6.7 – NDNC Registry Check | DONE | checkNdncStatus() with configurable NDNC_API_URL/NDNC_API_KEY env vars, 5s timeout. Endpoint: GET /communication/ndnc-check/:phone |

### Epic 7 — Clinic Communication Settings

| Story | Status | Notes |
|---|---|---|
| 7.1 – Settings Table | DONE | ClinicCommunicationSettings model: clinic_id (unique FK), enable_email/sms/whatsapp, email_provider_config/sms_provider_config/whatsapp_provider_config (JSON), fallback_chain (string[]), daily_message_limit, send_rate_per_minute, dnd_start/dnd_end, google_review_url. Prisma migration applied |
| 7.2 – Settings API | DONE | GET/PATCH /communication/settings + POST /communication/settings/test-email + POST /communication/settings/verify-smtp. Feature-gated: CUSTOM_PROVIDER_CONFIG feature required for Professional/Enterprise plans to override env defaults. Lower plans use env defaults with 403 on config attempt. Response includes can_customize_providers boolean |

### Epic 8 — Appointment & Payment Reminders

| Story | Status | Notes |
|---|---|---|
| 8.1 – Appointment Reminder Scheduler | DONE | AutomationCronService — daily 7:30 AM cron, fetches tomorrow's scheduled appointments, resolves channel per patient preference, sends via CommunicationService.sendMessage() |
| 8.2 – Reminder Notification Creation | DONE | Generates CommunicationMessage, renders template with variables (patient_name, appointment_date/time, dentist_name, clinic_name, branch), queues for delivery |
| 8.3 – Reminder Template Selection | DONE | Per-rule template_id (set via Automation tab UI). Falls back to system template. DLT fallback via SMS_DEFAULT_DLT_TEMPLATE_ID env var |
| 8.4 – Installment Due Reminder | DONE | Daily 9:30 AM cron — checks installments due in 3 days, sends reminder with amount, due_date, clinic_name, invoice_number |
| 8.5 – Overdue Payment Notification | DONE | overduePaymentNotification() cron at 11 AM daily — queries overdue installments (past due_date, status pending), sends patient-facing message with amount/due_date/invoice_number via communication pipeline |
| 8.6 – Payment Confirmation Receipt | DONE | InvoiceService.addPayment() calls sendPaymentConfirmation() fire-and-forget after transaction. Sends confirmation with amount/invoice_number via first enabled channel |

### Epic 9 — Campaign Management

| Story | Status | Notes |
|---|---|---|
| 9.1 – Campaign Entity | DONE | Campaign model: name, channel, template_id, segment_type/segment_config (JSON), status (draft/scheduled/running/paused/completed/cancelled), scheduled_at, stats (sent/delivered/failed/read_count), total_cost. Prisma migration applied |
| 9.2 – Target Segments | DONE | resolveSegment() implements 6 segment types: all, inactive (configurable months), treatment_type (procedure search), birthday_month (raw SQL), location (branch_id), custom (gender/branch/created_after). Audience preview endpoint available |
| 9.3 – Campaign Scheduler | DONE | CampaignCronService: every 5 minutes checks for campaigns with status=scheduled and scheduled_at <= now, auto-executes them via CampaignService.execute() |
| 9.4 – Campaign Execution | DONE | execute() method: validates draft/scheduled status, resolves segment, loops patients × channels, calls sendMessage() per patient, tracks sent/failed counts, marks completed with stats. Supports channel=all (multi-channel). Reverts to draft on critical failure |
| 9.5 – Campaign Analytics | DONE | getAnalytics() groups messages by status for campaign, counts attributed bookings within 7-day window of campaign start, returns breakdown + estimated/actual cost |
| 9.6 – Dormant Patient Detection | DONE | Weekly Monday 6 AM cron — configurable dormancy_months (default 6), sends reactivation message via preferred channel |
| 9.7 – Reactivation Drip Sequence | DONE | createDripSequence() — multi-step campaigns with configurable delay_hours per step, stored in segment_config._drip_steps. executeDripStep() sends messages for a specific step index, updates campaign progress, marks completed after last step. Endpoints: POST /campaigns/drip-sequence, POST /campaigns/:id/drip-step/:step |
| 9.8 – A/B Testing | DONE | executeABTest() — random audience split, sends variant A (campaign template) and variant B (provided template), tracks via ab_variant metadata field. getABTestResults() — delivery rates per variant, auto-determines winner (>5% difference). Endpoints: POST /campaigns/:id/ab-test, GET /campaigns/:id/ab-results |
| 9.9 – Cost Tracking & ROI | DONE | COST_PER_MESSAGE map: SMS ₹0.25, WhatsApp ₹0.50, Email ₹0.02. estimateCost() per-channel breakdown. calculateROI() — attributed revenue (bookings × ₹2000 avg) minus cost. Campaign analytics now returns roi field. Endpoint: POST /campaigns/estimate-cost |
| 9.10 – Rate Limiting & Throttling | DONE | daily_message_limit + send_rate_per_minute on settings. Runtime enforcement: sendMessage() checks daily sent count against daily_message_limit, skips with 'daily_limit_exceeded' reason |

### Epic 10 — Greetings & Occasion Automation

| Story | Status | Notes |
|---|---|---|
| 10.1 – Birthday Greeting | DONE | Daily 8:30 AM cron — matches patient DOB month+day, sends via preferred channel, customizable template via automation rule, variables: patient_name/first_name, clinic_name |
| 10.2 – Festival Calendar | DONE | ClinicEvent model: event_name, event_date, is_enabled, is_recurring, template_id FK, offer_details, clinic_id (null=global). Prisma migration applied. Events tab in frontend for CRUD |
| 10.3 – Festival Greeting Automation | DONE | Daily 8 AM cron — checks ClinicEvent for today's date, sends to all patients of matching clinic (or all clinics if global), variables: patient_name, festival_name, clinic_name |
| 10.4 – Festival Offer Campaigns | DONE | createFromFestivalEvent() — looks up ClinicEvent, finds Festival Greeting template, creates draft campaign with offer details in segment_config. Endpoint: POST /campaigns/from-event/:eventId |
| 10.5 – Patient Anniversary Greeting | DONE | patientAnniversaryGreeting() cron at 9 AM daily — matches patient created_at month+day (excluding patients < 1 year old), sends via preferred channel with anniversary_years variable. Uses 'anniversary_greeting' automation rule |
| 10.6 – Custom Occasion Greetings | DONE | Clinic-defined events supported via ClinicEvent with clinic_id FK. Frontend Events tab allows creating custom events |

### Epic 11 — Post-Treatment & Follow-Up Automation

| Story | Status | Notes |
|---|---|---|
| 11.1 – Post-Treatment Care Instructions | DONE | postTreatmentCare() cron at 6 PM daily. Queries treatments completed today, sends care instructions per procedure via template. 4 seed templates (Extraction/RCT/Filling/Scaling) |
| 11.2 – Post-Visit Feedback Collection | DONE | feedbackCollection() cron at 7 PM daily. Queries yesterday's completed appointments, checks for existing feedback, sends request via communication pipeline |
| 11.3 – Google Review Solicitation | DONE | googleReviewSolicitation() cron at 8 PM daily. Queries positive feedback (>= min_rating_for_google_review) from yesterday, sends review request with google_review_url, marks feedback as google_review_requested |
| 11.4 – No-Show Follow-Up | DONE | noShowFollowUp() cron at 10:30 AM daily. Queries yesterday's no_show appointments, sends follow-up message with dentist_name/clinic_name via communication pipeline |
| 11.5 – Treatment Plan Reminders | DONE | Daily 10 AM cron — finds patients with incomplete treatments (planned/in_progress) and no recent appointment (configurable interval, default 14 days), sends reminder |
| 11.6 – Prescription Refill Reminders | DONE | prescriptionRefillReminder() cron at 8 AM daily. Parses PrescriptionItem duration ("7 days"/"2 weeks"/"1 month") via parseDurationToDays(), calculates medication end date, sends reminder configurable advance_days (default 2) before end. Uses 'prescription_refill' automation rule |

### Epic 12 — Referral Program

| Story | Status | Notes |
|---|---|---|
| 12.1 – Referral Code Generation | DONE | PatientReferralCode model: code (unique per clinic), patient_id FK, is_active. ReferralService generates unique 6-8 char codes. ReferralController + ReferralModule |
| 12.2 – Referral Tracking | DONE | Referral model: referrer_patient_id, referred_patient_id, referral_code_id FK, status (pending/completed/rewarded), reward_type, reward_value, reward_credited_at. Full lifecycle tracking |
| 12.3 – Referral Invitation Message | DONE | "Referral Invitation" seed template with referral_code variable. Frontend Referrals tab for management |
| 12.4 – Referral Reward Notification | DONE | "Referral Reward Notification" seed template. Reward crediting in ReferralService on referred patient's first visit |
| 12.5 – Referral Analytics | DONE | getDetailedAnalytics() — conversion rate, top referrers with reward_value sum, monthly trend (last 6 months via raw SQL), attributed revenue from paid invoices of referred patients. Endpoint: GET /referrals/analytics with date range filters |

### Epic 13 — Authentication Messaging

| Story | Status | Notes |
|---|---|---|
| 13.1 – Email Verification | DONE | sendVerificationEmail() — JWT token (24hr expiry), finds Email Verification template, sends via CommunicationService. verifyEmail() — validates JWT, activates user. Endpoints: POST /auth/send-verification, POST /auth/verify-email |
| 13.2 – Password Reset Email | DONE | requestPasswordReset() — JWT token (1hr expiry), sends Password Reset template. Prevents email enumeration (always returns success). resetPassword() — validates token, updates password hash. Endpoints: POST /auth/forgot-password, POST /auth/reset-password |
| 13.3 – OTP Messaging | DONE | sendOtp() — 6-digit random OTP, in-memory store with 10min expiry, 3 attempt max, sends via CommunicationService using OTP Verification template. verifyOtp() — constant-time comparison, auto-expire on attempts. Endpoints: POST /auth/send-otp, POST /auth/verify-otp |

### Epic 14 — Communication UI

| Story | Status | Notes |
|---|---|---|
| 14.1 – Sidebar Section | DONE | "Communication" route in sidebar. 9-tab layout: Templates, Messages, Campaigns, Automation, Events, Feedback, Referrals, Settings, Cron Jobs |
| 14.2 – Templates Page | DONE | templates-tab.tsx — DataTable with CRUD dialog, variable insertion, channel/language filters. Live preview dialog with channel-specific rendering (email HTML, SMS bubble with char count, WhatsApp bubble mockup) |
| 14.3 – Campaign Wizard | DONE | campaigns-tab.tsx — 5-step wizard (Details → Audience → Template → Channel → Review) with cost estimation on review step. Progress bar, back/next navigation, template selection filtered by channel |
| 14.4 – Campaign List & Detail | DONE | campaigns-tab.tsx — Clickable campaign cards with detail view showing delivery funnel (recipients → sent → delivered), cost & ROI section (₹ cost/revenue/ROI%), A/B test results with winner highlight, campaign metadata |
| 14.5 – Automation Rules Page | DONE | automation-tab.tsx — Toggle rules for birthday, festival, post-treatment, no-show, dormant, payment, feedback. Template picker per rule |
| 14.6 – Message Logs Page | DONE | messages-tab.tsx — DataTable with channel/status/date filters. Missing CSV export |
| 14.7 – Communication Settings | DONE | settings-tab.tsx — Channel toggles, provider config with feature gating (Pro/Enterprise), test email, quiet hours, rate limits |
| 14.8 – Analytics Dashboard | DONE | analytics-tab.tsx — Key metrics (total/delivered/failed/skipped), delivery rate & failure rate progress bars, by-channel breakdown with percentage bars, by-status badges, by-category tags, CSS bar chart for daily volume (last 30 days) with hover tooltips, date range filter |
| 14.9 – Patient Communication Timeline | DONE | patient-timeline.tsx — Vertical timeline with channel icons, status indicators, template badges, message body preview. Channel filter (all/email/sms/whatsapp), pagination. Integrated as "Communication" tab in patient profile page |
| 14.10 – Template Preview | DONE | template-preview.tsx — Channel-specific preview dialog: email (header + subject + HTML body), SMS (bubble mockup + char count + segment count + GSM-7/Unicode detection), WhatsApp (green chat bubble with timestamp). Variable substitution with sample values. Preview button added to templates list |

**Implementation Order:** Epic 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 (UI built incrementally alongside backend epics)

### Phase 3 Summary

| Epic | DONE | PARTIAL | TODO | Total |
|---|---|---|---|---|
| 1 – Communication Infrastructure | 8 | 0 | 0 | 8 |
| 2 – Template System | 6 | 0 | 0 | 6 |
| 3 – Email Integration | 3 | 0 | 0 | 3 |
| 4 – SMS Integration | 4 | 0 | 0 | 4 |
| 5 – WhatsApp Integration | 6 | 0 | 0 | 6 |
| 6 – Patient Preferences | 7 | 0 | 0 | 7 |
| 7 – Clinic Settings | 2 | 0 | 0 | 2 |
| 8 – Reminders & Notifications | 6 | 0 | 0 | 6 |
| 9 – Campaigns & Bulk Messaging | 10 | 0 | 0 | 10 |
| 10 – Greetings & Events | 6 | 0 | 0 | 6 |
| 11 – Follow-ups & Re-engagement | 6 | 0 | 0 | 6 |
| 12 – Referral Program | 5 | 0 | 0 | 5 |
| 13 – Auth Messaging | 3 | 0 | 0 | 3 |
| 14 – Communication UI | 10 | 0 | 0 | 10 |
| **TOTAL** | **82** | **0** | **0** | **82** |

**Phase 3 Progress: 100% DONE ✓**

---

## PHASE 4 — Production Readiness & Launch

**Goal:** Security, deployment, monitoring — ready for real clinics.

### Epic 1 — Security Hardening

| Story | Status | Notes |
|---|---|---|
| 1.1 – Helmet Security Headers | DONE | helmet middleware in main.ts — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, referrer-policy |
| 1.2 – CSRF Protection | DONE | Custom CsrfGuard (double-submit cookie pattern). CsrfController provides GET /csrf/token. Registered as global APP_GUARD |
| 1.3 – Rate Limiting Verification | DONE | ThrottlerModule global with 'default' (60s/100) and 'strict' (60s/10) throttler profiles, custom error message |
| 1.4 – Secure Cookie Configuration | DONE | JWT set in httpOnly secure cookie on login (maxAge 24h, sameSite strict, secure in production). JwtAuthGuard reads from cookie as fallback |
| 1.5 – Input Sanitization | DONE | SanitizeInputPipe — global pipe using sanitize-html, strips all HTML/script tags from request bodies recursively |
| 1.6 – Dependency Audit | DONE | npm scripts "audit" and "audit:fix" in package.json, integrated in CI pipeline |

### Epic 2 — Monitoring & Logging

| Story | Status | Notes |
|---|---|---|
| 2.1 – Sentry (Backend) | DONE | @sentry/nestjs + @sentry/profiling-node. sentry.config.ts with initSentry(), SentryModule registered first in app.module |
| 2.2 – Sentry (Frontend) | DONE | @sentry/nextjs — client/server/edge configs, global-error.tsx with captureException, withSentryConfig in next.config.ts |
| 2.3 – Structured Logging | DONE | nestjs-pino LoggerModule — pino-pretty for dev, JSON for production. Redacts auth headers/cookies. bufferLogs in main.ts |
| 2.4 – Health Check Enhancement | DONE | @nestjs/terminus — /health (simple), /health/detailed (DB + memory heap + memory RSS + disk), /health/ready (DB only) |
| 2.5 – Uptime Monitoring | DONE | docs/uptime-monitoring.md — UptimeRobot/BetterStack configuration guide |

### Epic 3 — Deployment & Infrastructure

| Story | Status | Notes |
|---|---|---|
| 3.1 – Frontend Dockerfile | DONE | Multi-stage build (deps → builder → runner), standalone output, non-root user (nextjs:1001), port 3001 |
| 3.2 – Docker Compose | DONE | docker-compose.yml — postgres:16-alpine, redis:7-alpine, backend, frontend. Health checks, named volumes, env mapping |
| 3.3 – Environment Configuration | DONE | .env.example for backend, frontend, root (docker-compose). env-validation.ts checks required/recommended vars on startup |
| 3.4 – CI/CD Pipeline (GitHub Actions) | DONE | backend-ci.yml + frontend-ci.yml — lint → type-check → test → audit → build → docker build |
| 3.5 – Staging Environment | DONE | deploy.yml — staging auto-deploy from develop, production from main with manual approval + environment protection |
| 3.6 – Database Migration Strategy | DONE | docs/database-migration-strategy.md — prisma migrate dev/deploy, rollback procedures, naming conventions |

### Epic 4 — Backup & Disaster Recovery

| Story | Status | Notes |
|---|---|---|
| 4.1 – Database Backup Automation | DONE | BackupService with @Cron daily 2AM, pg_dump gzipped, 30-day retention. BackupController (super_admin only) POST/GET /backup |
| 4.2 – Backup Verification | DONE | docs/backup-restore.md — restore procedures, monthly verification checklist, disaster recovery timeline |
| 4.3 – Data Export for Compliance | DONE | DataExportService exports all clinic data (clinic, branches, users, patients, appointments, treatments, prescriptions, invoices, inventory). GET /data-export (Admin) returns StreamableFile JSON |

### Epic 5 — Pre-Launch

| Story | Status | Notes |
|---|---|---|
| 5.1 – Landing Page | DONE | Already complete — 676-line landing page with Navbar, Hero, Features, Pricing, Testimonials, Footer |
| 5.2 – Terms & Privacy Policy | DONE | /terms and /privacy pages under (marketing) route group — India jurisdiction, Razorpay billing, medical data, TRAI compliance |
| 5.3 – Onboarding Flow | DONE | OnboardingWizard component — 4-step first-login tutorial (branch → staff → patient → appointment). Modal overlay, progress bar, localStorage persistence. Integrated in dashboard layout |
| 5.4 – Plan Selection at Registration | DONE | Already complete — 569-line register page with multi-step flow and plan selection (planOptions array, step state, feature comparison) |
| 5.5 – Payment Integration (Razorpay) | DONE | razorpay npm package + razorpay.config.ts. PaymentService: createSubscription, handleWebhook (signature verification, subscription.activated/charged/cancelled, payment.failed), cancelSubscription. PaymentController: POST /payment/subscribe, POST /payment/webhook (@Public), POST /payment/cancel. PaymentModule registered in app.module |

### Phase 4 Summary

| Epic | DONE | PARTIAL | TODO | Total |
|---|---|---|---|---|
| 1 – Security Hardening | 6 | 0 | 0 | 6 |
| 2 – Monitoring & Logging | 5 | 0 | 0 | 5 |
| 3 – Deployment & Infrastructure | 6 | 0 | 0 | 6 |
| 4 – Backup & Disaster Recovery | 3 | 0 | 0 | 3 |
| 5 – Pre-Launch | 5 | 0 | 0 | 5 |
| **TOTAL** | **25** | **0** | **0** | **25** |

**Phase 4 Progress: 100% DONE ✓**

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
