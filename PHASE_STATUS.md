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

### EPIC 5 – Core Business Modules
Status: NOT STARTED

### EPIC 6 – Testing & API Hardening
Status: NOT STARTED
