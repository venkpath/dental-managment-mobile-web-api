# System Architecture – Dental SaaS

---

# Overview

The platform consists of:

- Web Application (Next.js)
- Mobile App (React Native)
- Backend API (NestJS)
- AI Service Layer
- PostgreSQL Database
- Redis Queue
- Object Storage (S3)

---

# Multi-Tenant Model

Tenant = Clinic

Hierarchy:

Clinic
 └── Branch
     └── Staff
     └── Patients
     └── Appointments
     └── Treatments
     └── Billing

All tables must include:
- clinic_id
- branch_id (where applicable)

---

# Subscription Model

Clinic has:
- plan_id
- subscription_status
- trial_ends_at
- ai_usage_count

Feature access enforced via:
- @RequireFeature decorator
- PlanFeature mapping

---

# API Standards

- Versioned endpoints
- Standard response wrapper
- DTO validation required
- Swagger documentation required

---

# AI Architecture

Frontend → Backend AI Service → LLM API

Rules:
- Structured JSON outputs
- Usage tracking
- No direct frontend calls
- Doctor approval required

---

# Security

- JWT authentication
- Role-based access
- Feature-based access
- Rate limiting
- Password hashing
- Audit logging

# Infrastructure Strategy

Stage 1 (0–20 clinics)
- Free-tier managed Postgres
- Free-tier backend hosting
- Serverless Redis
- Managed object storage
- AI via API

Stage 2 (20–80 clinics)
- Paid small instance backend
- Upgraded DB plan
- Monitoring enabled
- Daily automated backups

Stage 3 (100+ clinics)
- Dedicated production server
- Performance optimization
- Auto-scaling