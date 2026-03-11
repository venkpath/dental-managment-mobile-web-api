# DentalCare SaaS - Dental Clinic Management Platform

Multi-tenant dental clinic management platform built for the Indian market. Web + Mobile + API.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS, Prisma v7, PostgreSQL, BullMQ |
| Frontend | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui |
| Auth | JWT (dual: user + super_admin tokens) |
| State | Zustand (client), React Query (server) |
| Validation | class-validator (backend), Zod (frontend) |

## Prerequisites

- **Node.js** >= 20
- **PostgreSQL** (local or remote — connection string in `.env`)
- **Redis** (optional, for BullMQ job queues)

## Project Structure

```
dental-managment-web-mobile-api/
├── dental-backend/          # NestJS API server (port 3000)
│   ├── prisma/              # Schema & migrations
│   └── src/
│       ├── modules/         # Feature modules (auth, clinic, patient, etc.)
│       ├── common/          # Guards, decorators, interceptors, filters
│       ├── config/          # App config, Swagger setup
│       └── database/        # Prisma service (global)
├── dental-frontend/         # Next.js web app (port 3001)
│   └── src/
│       ├── app/             # Pages (auth, dashboard routes)
│       ├── components/      # UI components (shadcn + custom)
│       ├── services/        # API client wrappers
│       ├── stores/          # Zustand auth store
│       ├── hooks/           # Custom hooks
│       ├── lib/             # Utils, API client, formatters
│       └── types/           # TypeScript interfaces
└── PHASE_STATUS.md          # Epic/story progress tracker
```

## Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd dental-managment-web-mobile-api

# Install backend dependencies
cd dental-backend
npm install

# Install frontend dependencies
cd ../dental-frontend
npm install
```

### 2. Configure Backend Environment

Create `dental-backend/.env`:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/dental_saas

# JWT
JWT_SECRET=your-strong-secret-key-here
JWT_EXPIRES_IN=1d

# Server
PORT=3000
NODE_ENV=development

# Redis (for BullMQ queues - optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
CORS_ORIGIN=http://localhost:3001

# Super Admin
SUPER_ADMIN_SECRET=your-super-admin-secret
```

### 3. Setup Database

```bash
cd dental-backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed data
npx prisma db seed
```

### 4. Configure Frontend Environment

Create `dental-frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

### 5. Start Development Servers

**Terminal 1 — Backend (port 3000):**
```bash
cd dental-backend
npm run start:dev
```

**Terminal 2 — Frontend (port 3001):**
```bash
cd dental-frontend
npm run dev -- -p 3001
```

### 6. Access the Application

| URL | Description |
|-----|-------------|
| http://localhost:3001/register | Register a new clinic |
| http://localhost:3001/login | Login to dashboard |
| http://localhost:3001/dashboard | Main dashboard |
| http://localhost:3000/api/v1/health | Backend health check |
| http://localhost:3000/api/docs | Swagger API docs |

## Registration Flow

1. Go to `/register`
2. **Step 1**: Enter clinic details (name, email, address, city, phone)
3. **Step 2**: Create admin account (name, email, password)
4. Clinic is created with a **14-day free trial**
5. Go to `/login`, enter your **Clinic ID** (shown after registration), email, and password

## API Architecture

- **Global prefix**: `/api/v1`
- **Auth**: JWT Bearer token in `Authorization` header
- **Multi-tenancy**: `x-clinic-id` header for tenant scoping
- **Response envelope**: `{ success: true, data: {...} }` or `{ success: false, error: {...} }`
- **Guards chain**: ThrottlerGuard → JwtAuthGuard → RolesGuard → SuperAdminGuard → FeatureGuard → AiUsageGuard
- **Public endpoints**: Decorated with `@Public()` (bypasses JWT)

## Key Modules

| Module | Endpoints | Description |
|--------|-----------|-------------|
| Auth | `/auth/login`, `/auth/register` | Login + clinic registration |
| Clinics | `/clinics` | Clinic CRUD (public for onboarding) |
| Users | `/users` | Staff management (clinic-scoped) |
| Branches | `/branches` | Multi-branch support |
| Patients | `/patients` | Patient records with dental charts |
| Appointments | `/appointments` | Scheduling with status workflow |
| Treatments | `/treatments` | Procedures with FDI tooth numbering |
| Prescriptions | `/prescriptions` | Medicine prescriptions |
| Invoices | `/invoices` | GST-ready billing (CGST/SGST) |
| Inventory | `/inventory` | Stock management with low-stock alerts |
| Reports | `/reports/*` | Dashboard, revenue, analytics |
| Tooth Chart | `/tooth-charts` | FDI dental charting system |
| Audit Logs | `/audit-logs` | Activity tracking |

## Running Tests

```bash
cd dental-backend

# Run all tests
npx jest --no-coverage

# Run specific test suite
npx jest --no-coverage --testPathPatterns "reports"
```

## Available Scripts

### Backend (`dental-backend/`)
| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start dev server with watch mode |
| `npm run build` | Build for production |
| `npm run start:prod` | Start production server |
| `npx prisma studio` | Open Prisma database GUI |
| `npx prisma migrate dev` | Create new migration |
| `npx prisma generate` | Regenerate Prisma client |

### Frontend (`dental-frontend/`)
| Command | Description |
|---------|-------------|
| `npm run dev -- -p 3001` | Start dev server on port 3001 |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |



SUPER_ADMIN_EMAIL (default: admin@dental-saas.com)
SUPER_ADMIN_PASSWORD (default: Admin@123)
SUPER_ADMIN_NAME (default: Platform Admin)