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

## AWS EC2 Deployment

### Server Info

- **Host:** EC2 instance (Ubuntu)
- **Domain:** api.smartdentaldesk.com
- **Process Manager:** PM2
- **Reverse Proxy:** Nginx with SSL (Certbot/Let's Encrypt)
- **Project Path:** `~/dental-managment-mobile-web-api/dental-backend`

### Environment Variables

Set these in your `.env` file on the EC2 server:

```
CORS_ORIGIN=https://smartdentaldesk.com,https://www.smartdentaldesk.com
```

### Deploy (Quick Copy-Paste)

```bash
cd ~/dental-managment-mobile-web-api/dental-backend && \
git pull origin main && \
npm install && \
npx prisma generate && \
NODE_OPTIONS="--max-old-space-size=2048" npm run build && \
pm2 restart dental-backend
```

### Deploy (Step-by-Step)

```bash
# 1. Go to project
cd ~/dental-managment-mobile-web-api/dental-backend

# 2. Pull latest code
git pull origin main

# 3. Install dependencies (if any changed)
npm install

# 4. Prisma (if schema changed)
npx prisma generate
npx prisma migrate deploy

# 5. Build (with increased memory for small instances)
NODE_OPTIONS="--max-old-space-size=2048" npm run build

# 6. Restart backend
pm2 restart dental-backend

# 7. Check logs
pm2 logs dental-backend --lines 50
```

### Useful PM2 Commands

| Command | Description |
|---|---|
| `pm2 status` | Check running processes |
| `pm2 logs dental-backend --lines 50` | View recent logs |
| `pm2 restart dental-backend` | Restart the backend |
| `pm2 stop dental-backend` | Stop the backend |
| `pm2 monit` | Real-time monitoring dashboard |

### Nginx Config

- Config location: `/etc/nginx/sites-available/` (or `/etc/nginx/conf.d/`)
- Proxies `api.smartdentaldesk.com` to `localhost:3000`
- SSL managed by Certbot (auto-renews)
- Test config: `sudo nginx -t`
- Reload after changes: `sudo systemctl reload nginx`

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



curl -s -X POST "https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>/register" \
  -H "Authorization: Bearer <WHATSAPP_ACCESS_TOKEN>" \
  -d "messaging_product=whatsapp" \
  -d "pin=123456"



  The card type you've entered isn't supported. Try a different card.
