# Dental SaaS Platform – Product Roadmap

This document defines all development phases, epics, and major stories.
All development must align with this roadmap.

---

# PHASE 1 – Backend Core + SaaS Skeleton

## Goal:
Build a multi-tenant, subscription-aware backend with full API contract.

---

## EPIC 1 – Infrastructure & Setup
- Initialize NestJS project
- Setup TypeScript strict mode
- Setup ESLint + Prettier
- Setup PostgreSQL + ORM
- Setup Redis + Queue
- Setup Swagger (OpenAPI)
- Setup global error handler

---

## EPIC 2 – Multi-Tenant Architecture
- Create Clinic entity
- Create Branch entity
- Tenant middleware
- Branch-scoped filtering
- Query auto-injection of clinic_id

---

## EPIC 3 – Authentication & RBAC
- User entity
- Role system (Admin, Dentist, Receptionist)
- JWT authentication
- Refresh tokens
- Role guard
- Branch-level permission guard

---

## EPIC 4 – Subscription & Feature Framework
- Plan entity
- Feature entity
- PlanFeature mapping
- Clinic subscription fields
- Feature guard decorator
- AI usage tracking structure

---

## EPIC 5 – Core Business Modules
- Staff CRUD
- Patient CRUD
- Appointment module
- Treatment module
- Billing module
- Inventory module
- Marketing module

---

## EPIC 6 – Testing & API Hardening
- Integration tests
- Seed script
- Postman export
- OpenAPI freeze

---

# PHASE 2 – Clinic Web Application

## Goal:
Build full clinic management system UI.

---

## EPIC 1 – Design System
- Color palette
- Typography scale
- Spacing system
- Component library
- Layout system

---

## EPIC 2 – Authentication UI
- Login
- Branch selection
- Role-based sidebar

---

## EPIC 3 – Dashboard
- Overview metrics
- Appointment calendar
- Quick actions

---

## EPIC 4 – Patient Management
- Patient list
- Patient profile
- Medical history
- Search & filters

---

## EPIC 5 – Appointments
- Calendar view
- Create / cancel / reschedule
- Dentist filtering

---

## EPIC 6 – Treatment & Dental Chart
- Interactive chart
- Treatment plan builder

---

## EPIC 7 – Billing & Reports
- Invoice generator
- Payment tracking
- Revenue charts

---

# PHASE 3 – Staff Mobile App

## Goal:
Operational mobile app for daily workflow.

---

## EPIC 1 – App Foundation
- Navigation setup
- Theme system
- Auth integration

---

## EPIC 2 – Dashboard
- Today’s appointments
- Quick stats

---

## EPIC 3 – Patient Module
- Add patient
- Search patient
- Profile view

---

## EPIC 4 – Appointment Handling
- View appointments
- Reschedule
- Cancel

---

## EPIC 5 – Treatment & Billing
- Quick treatment entry
- Quick invoice creation
- Mark payment

---

# PHASE 4 – Patient Portal

## Goal:
Self-service portal for patients.

---

## EPIC 1 – OTP Authentication
- OTP send/verify
- Token issuance

---

## EPIC 2 – Appointments
- View upcoming
- Self booking
- Cancel/reschedule

---

## EPIC 3 – Billing
- View invoices
- Online payment
- Download PDF

---

## EPIC 4 – Treatment & Reports
- View prescriptions
- View treatment history
- Download X-rays

---

## EPIC 5 – Support & Engagement
- FAQ
- Support ticket
- Notifications

---

# PHASE 5 – AI Layer

## Goal:
Enhance clinical workflow using LLMs.

---

## EPIC 1 – Clinical Assistant
- Notes generator
- Prescription generator
- Translation engine

---

## EPIC 2 – Visual Education
- Educational image generation
- Explanation PDF

---

## EPIC 3 – Revenue & Treatment Intelligence
- Treatment suggestion draft
- Follow-up detection
- Revenue opportunity insights

---

## EPIC 4 – Marketing AI
- Campaign generator
- Review request generator
- Patient segmentation suggestion

---

## EPIC 5 – Patient AI Chat
- Patient assistant chatbot
- Knowledge-based response system

---

# PHASE 6 – SaaS Infrastructure & Scaling

## EPIC 1 – Subscription Integration
- Razorpay subscription
- Upgrade/downgrade flow
- Trial management

---

## EPIC 2 – Super Admin Dashboard
- Clinic monitoring
- Revenue tracking
- AI usage analytics
- Suspension control

---

## EPIC 3 – Security Hardening
- Audit logs
- Rate limiting
- Backup automation
- Encryption enforcement

---

## EPIC 4 – DevOps & Deployment
- Dockerization
- CI/CD pipeline
- Staging environment
- Monitoring