# Dental SaaS Platform – AI Agent Instructions

## Project Overview
This is a multi-tenant Dental Clinic SaaS platform with:
- Web Application (Next.js)
- Mobile App (React Native)
- Backend API (NestJS)
- AI Service Layer (LLM-powered)

The system must support:
- Multi-clinic
- Multi-branch
- Role-based access
- Subscription plans
- Feature flags
- AI usage limits

---

## Core Architecture Rules

1. Every database table must include `clinic_id`.
2. Branch-scoped entities must include `branch_id`.
3. Never write queries without tenant filtering.
4. All endpoints must validate subscription status.
5. Use `@RequireFeature(FEATURE_KEY)` for restricted endpoints.
6. AI endpoints must increment AI usage count.
7. Do not bypass guards.

---

## Coding Standards

- TypeScript strict mode enabled.
- No use of `any`.
- All APIs must use DTO validation.
- Controllers contain no business logic.
- Services contain all business logic.
- Use standard API response format:

{
  "success": true,
  "data": {},
  "message": ""
}

---

## Subscription System Rules

- Each clinic has a plan.
- Plans define:
  - Branch limit
  - Staff limit
  - AI quota
  - Feature access
- Enforce limits before creating new entities.

---

## AI Integration Rules

- Never call LLM directly from frontend.
- All AI calls go through backend AI service.
- Validate LLM JSON outputs.
- Add disclaimer to AI-generated medical outputs.
- AI results must be editable by doctors.
- Never auto-save AI outputs without confirmation.

---

## UI Rules

Web:
- Clean layout
- Sidebar navigation
- Consistent spacing (4px grid)
- Border radius 8px
- Soft shadows
- Minimal clutter

Mobile:
- Large touch targets
- Bottom tab navigation
- Minimal nested flows

---

## Security Rules

- Use JWT authentication.
- Role-based guards required.
- Feature guards required.
- Validate input at all layers.
- Encrypt passwords using bcrypt.
- Log sensitive actions.

---

## Development Workflow

- Build module-by-module.
- Each feature must include unit tests.
- Swagger documentation required for all endpoints.
- Do not modify core architecture without approval.

---

## Never Do

- Do not bypass tenant filtering.
- Do not bypass subscription checks.
- Do not auto-enable premium features.
- Do not generate unsafe medical advice.
- Do not expose internal system data in responses.