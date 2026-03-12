# Bug 4: Appointment Scheduling Improvements

## Problem Statement

The appointment scheduling system is fully manual with no smart scheduling features. All 45 time slots (09:00–20:00, every 15 min) are shown regardless of existing bookings. Past times are not hidden. There are no configurable clinic/branch working hours, slot durations, or dentist availability settings. The user wants a configurable scheduling system.

---

## Current Architecture

### Database (Prisma Schema)

**Appointment model** (`prisma/schema.prisma` lines 182–207):
```prisma
model Appointment {
  id               String   @id @default(uuid()) @db.Uuid
  clinic_id        String   @db.Uuid
  branch_id        String   @db.Uuid
  patient_id       String   @db.Uuid
  dentist_id       String   @db.Uuid
  appointment_date DateTime @db.Date
  start_time       String   @db.VarChar(5)      // HH:mm format
  end_time         String   @db.VarChar(5)      // HH:mm format
  status           String   @default("scheduled") @db.VarChar(20)
  notes            String?  @db.Text
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt
  // Relations: clinic, branch, patient, dentist
}
```

**Branch model** — has NO scheduling fields at all. Just: id, clinic_id, name, phone, address, city, state, timestamps.

### Backend Service (`src/modules/appointment/appointment.service.ts`)

| Method | Purpose |
|--------|---------|
| `create(clinicId, dto)` | Validates start < end, checks dentist time conflicts only, creates |
| `findAll(clinicId, query)` | Filters by date/range/status/dentist/branch, paginated |
| `findOne(clinicId, id)` | Single appointment with includes |
| `update(clinicId, id, dto)` | Can update status, dentist, date/time, notes (NOT branch/patient) |
| `remove(clinicId, id)` | Hard delete |
| `checkTimeConflict()` | Private — queries overlapping appointments for same dentist on same date |

**Conflict check logic:**
```typescript
// Only checks dentist conflicts. No patient double-booking check.
where: {
  dentist_id: dentistId,
  appointment_date: new Date(date),
  status: { not: 'cancelled' },
  AND: [
    { start_time: { lt: endTime } },
    { end_time: { gt: startTime } },
  ],
}
```

### Backend DTOs

**CreateAppointmentDto**: branch_id, patient_id, dentist_id, appointment_date (YYYY-MM-DD), start_time (HH:mm), end_time (HH:mm), notes?

**UpdateAppointmentDto**: PartialType of Create minus branch/patient, plus status enum (scheduled/completed/cancelled/no_show)

**QueryAppointmentDto**: date?, start_date?, end_date?, status?, dentist_id?, branch_id?, page, limit

### Backend Controller (`src/modules/appointment/appointment.controller.ts`)

5 endpoints: POST `/appointments`, GET `/appointments`, GET `/appointments/:id`, PATCH `/appointments/:id`, DELETE `/appointments/:id`. All guarded by `RequireClinicGuard`.

### Frontend — New Appointment Form (`appointments/new/page.tsx`)

- 45 hardcoded time slots from 09:00 to 20:00 (15-min intervals)
- When start_time selected → end_time auto-set to start + 30 min
- No occupied slots grayed out
- No past-time filtering for today
- No branch working hours awareness
- Fields: patient_id (searchable select), dentist_id (select), branch_id (select), appointment_date (date input, min=today), start_time, end_time, notes

### Frontend — Calendar Component (`appointments/_components/appointment-calendar.tsx`)

- Week/day view toggle, hours 08:00–19:00
- Click empty → create appointment at that time
- Click appointment → navigate to detail
- No drag-to-reschedule, no dentist-specific filtering

### Frontend — Detail Page (`appointments/[id]/page.tsx`)

- Displays appointment details read-only
- When status === 'scheduled': shows "Mark Completed", "No Show", "Cancel" buttons
- No inline edit/reschedule

---

## Required Changes

### 1. Add Scheduling Settings to Branch Model

**New Prisma migration — add fields to Branch:**
```prisma
model Branch {
  // ... existing fields ...
  
  // Scheduling settings
  working_start_time   String?  @db.VarChar(5)  // e.g., "09:00"
  working_end_time     String?  @db.VarChar(5)  // e.g., "18:00"
  lunch_start_time     String?  @db.VarChar(5)  // e.g., "13:00"
  lunch_end_time       String?  @db.VarChar(5)  // e.g., "14:00"
  slot_duration        Int?     @default(15)     // minutes (15, 30, 45, 60)
  default_appt_duration Int?    @default(30)     // minutes
  buffer_minutes       Int?     @default(0)      // buffer between appointments
  advance_booking_days Int?     @default(30)     // how far ahead can book
}
```

**Also add a branch settings endpoint:** `PATCH /branches/:id/settings` to update these scheduling fields from a settings UI.

### 2. New Availability Endpoint

**Create a new endpoint:** `GET /appointments/available-slots?dentist_id=X&date=YYYY-MM-DD&branch_id=Y`

**Logic:**
1. Fetch branch scheduling settings (working hours, slot duration, lunch break)
2. Generate all possible slots within working hours excluding lunch
3. Fetch all non-cancelled appointments for that dentist + date
4. Subtract occupied slots (including buffer_minutes around each appointment)
5. If date is today, filter out past times (current time + buffer)
6. Return array of `{ start_time: string, end_time: string, available: boolean }`

### 3. Frontend — Smart Time Slot Selection

**In `appointments/new/page.tsx`:**
1. When dentist + date are both selected, call the available-slots endpoint
2. Replace the hardcoded 45-slot array with dynamic slots from the API
3. Gray out / disable unavailable slots (with tooltip showing "Booked: Patient Name, 09:00–09:30")
4. Past times for today should not appear at all
5. Slot duration and default appointment duration should come from branch settings
6. End time should auto-calculate from branch's `default_appt_duration` setting, not hardcoded 30

### 4. Auto-Complete Appointments (Optional Enhancement)

Currently status changes are fully manual. Options:
- **Cron job approach**: Run a scheduled job (e.g., every hour) that finds all `scheduled` appointments whose `end_time` has passed and auto-marks them `completed`
- **Simple approach**: On the list/detail page, show a visual indicator "Past due" for scheduled appointments whose time has passed, but keep manual completion
- **Recommended**: Start with the "Past due" visual indicator + a "Complete all past" bulk action button. Add cron later if needed.

### 5. Calendar Improvements (Nice-to-have)

- Show working hours as a shaded region vs non-working (gray background)
- Show lunch break as a different shading
- Dentist filter in calendar view
- Visual collision warning when editing/creating

---

## Implementation Order

1. **Database**: Add scheduling fields to Branch model → create migration
2. **Backend**: Update Branch DTO/service to support settings CRUD
3. **Backend**: Create `GET /appointments/available-slots` endpoint
4. **Frontend**: Add Branch Settings form (in branch edit or a dedicated settings page)
5. **Frontend**: Update new appointment form to use available-slots API
6. **Frontend**: Disable past times for today, gray out booked slots
7. **Frontend**: Use branch settings for slot duration and default appointment duration
8. **Frontend/Backend**: Add "Past due" indicator and optional auto-complete

---

## Files to Modify

| File | Changes |
|------|---------|
| `dental-backend/prisma/schema.prisma` | Add 8 scheduling fields to Branch model |
| `dental-backend/prisma/migrations/` | New migration for Branch scheduling fields |
| `dental-backend/src/modules/branch/dto/` | Add scheduling settings to update DTO |
| `dental-backend/src/modules/branch/branch.service.ts` | Handle settings update |
| `dental-backend/src/modules/appointment/appointment.service.ts` | Add `getAvailableSlots()` method, validate against branch working hours in `create()` |
| `dental-backend/src/modules/appointment/appointment.controller.ts` | Add `GET /appointments/available-slots` endpoint |
| `dental-backend/src/modules/appointment/dto/` | Add `QueryAvailableSlotsDto` |
| `dental-frontend/src/services/appointments.service.ts` | Add `getAvailableSlots()` API call |
| `dental-frontend/src/app/(dashboard)/appointments/new/page.tsx` | Dynamic slots, gray-out booked, hide past |
| `dental-frontend/src/app/(dashboard)/appointments/_components/appointment-calendar.tsx` | Reflect branch working hours in grid |
| `dental-frontend/src/types/index.ts` | Add `AvailableSlot` interface, update `Branch` type with scheduling fields |

---

## Key Design Decisions

- **Scheduling settings live on Branch**, not Clinic — different branches may have different hours
- **Slot generation is server-side** — the backend calculates available slots to ensure consistency
- **Time format stays as `HH:mm` strings** — no DateTime conversion needed on existing data
- **Buffer minutes apply between appointments** — e.g., 5-min buffer means 09:30 end → next available at 09:35
- **Patient double-booking is allowed** — a patient can have multiple appointments on the same day (with different dentists)
- **Dentist double-booking is NOT allowed** — enforced by the existing conflict check
