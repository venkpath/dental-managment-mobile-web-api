# Dental SaaS – Backend API

Multi-tenant dental clinic management backend built with NestJS.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** NestJS
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Queue:** BullMQ (Redis-backed)
- **Cache/Queue Store:** Redis
- **API Docs:** Swagger (OpenAPI 3)
- **Linting:** ESLint + Prettier

## Prerequisites

- Node.js >= 18
- npm >= 9
- PostgreSQL >= 14
- Redis >= 6

## Getting Started

### 1. Install dependencies

```bash
cd dental-backend
npm install
```

### 2. Configure environment

Copy the example environment file and adjust values as needed:

```bash
cp .env.example .env
```

Update `DATABASE_URL` in `.env` with your PostgreSQL credentials:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/dental_saas?schema=public"
```

### 3. Setup the database

Create the database:

```bash
createdb dental_saas
```

Run migrations:

```bash
npm run prisma:migrate
```

Generate the Prisma client (if not already generated):

```bash
npm run prisma:generate
```

### 4. Start Redis

Ensure Redis is running locally on port 6379 (default). You can configure the host and port in `.env`:

```
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 5. Run in development mode

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`.

### 6. Verify the server is running

```bash
curl http://localhost:3000/api/v1/health
```

Expected response:

```json
{
  "success": true,
  "data": { "status": "ok" },
  "message": "Request successful"
}
```

### 7. API Documentation

Swagger UI is available at:

```
http://localhost:3000/api/docs
```

OpenAPI JSON export:

```
http://localhost:3000/api/docs-json
```

## Available Scripts

| Script | Description |
|---|---|
| `npm run start` | Start the application |
| `npm run start:dev` | Start in watch mode |
| `npm run start:debug` | Start in debug mode |
| `npm run build` | Compile TypeScript |
| `npm run lint` | Lint and fix code |
| `npm run format` | Format code with Prettier |
| `npm test` | Run unit tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations (dev) |
| `npm run prisma:migrate:deploy` | Run migrations (production) |
| `npm run prisma:studio` | Open Prisma Studio GUI |

## Project Structure

```
src/
  modules/          # Feature modules
    health/         # Health check module
    test-queue/     # Test queue module (temporary)
  common/           # Shared utilities
    decorators/     # Custom decorators
    filters/        # Exception filters
    guards/         # Auth & feature guards
    interceptors/   # Response interceptors
    interfaces/     # Shared interfaces
    middleware/     # Custom middleware
    queue/          # BullMQ queue infrastructure
    utils/          # Utility functions
  config/           # Configuration files
  database/         # Prisma service & module
  app.module.ts     # Root module
  main.ts           # Application entry point
prisma/
  schema.prisma     # Database schema
  migrations/       # Migration files
```

## Database Schema

### Clinic
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR(255) | Clinic name |
| created_at | TIMESTAMP | Auto-set |
| updated_at | TIMESTAMP | Auto-updated |

### User
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| email | VARCHAR(255) | Indexed |
| password_hash | VARCHAR(255) | Bcrypt hash |
| role | VARCHAR(50) | Admin, Dentist, Receptionist |
| clinic_id | UUID | FK -> clinics.id |
| created_at | TIMESTAMP | Auto-set |
| updated_at | TIMESTAMP | Auto-updated |

Unique constraint: `(email, clinic_id)`

## API Response Format

All endpoints return a standard response:

```json
{
  "success": true,
  "data": {},
  "message": "Request successful"
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "message": "Error description"
}
```
