# Phase 3 — Communication & Patient Engagement Platform

## Goal

Enable clinics to communicate with patients through **Email, SMS, WhatsApp, and In-app notifications** for appointment reminders, campaigns/promotions, greetings, follow-ups, referrals, and authentication messages — making dental clinics the best-in-class in patient engagement and retention.

## Architecture Overview

The system is **channel-agnostic** with a unified pipeline:

```
Application Event / Cron / Campaign Trigger
      ↓
Notification Service (dedup, preference check, DND check)
      ↓
Template Engine (render with variables, select language)
      ↓
Queue (BullMQ — rate limited, retries)
      ↓
Channel Provider (fallback chain: WhatsApp → SMS → Email)
      ↓
Email / SMS / WhatsApp
      ↓
Delivery Webhook → Update notification_logs
```

This ensures: scalability, retries, easy provider switching, regulatory compliance, and channel fallback.

---

## EPIC 1 — Communication Infrastructure

**Goal:** Build the core messaging engine used by reminders, campaigns, OTP, greetings, follow-ups, referrals.

### Story 1.1 — Communication Module

Create module: `src/modules/communications`

```
communications/
 ├── communications.module.ts
 ├── communications.service.ts
 ├── communications.controller.ts
 ├── dto/
 ├── providers/
 │   ├── channel-provider.interface.ts
 │   ├── email.provider.ts
 │   ├── sms.provider.ts
 │   └── whatsapp.provider.ts
 ├── workers/
 │   ├── email.worker.ts
 │   ├── sms.worker.ts
 │   └── whatsapp.worker.ts
 ├── templates/
 │   └── template-renderer.ts
 └── utils/
```

**Acceptance Criteria:** Module created, injectable service, queue integration ready.

### Story 1.2 — Communication Queue

Create BullMQ queues:
- `communication_email`
- `communication_sms`
- `communication_whatsapp`

Job types: `send_email`, `send_sms`, `send_whatsapp`

**Acceptance Criteria:** Jobs processed asynchronously, retries supported (3 attempts, exponential backoff), failures logged.

### Story 1.3 — Communication Message Entity

Create table: `communication_messages`

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| clinic_id | UUID | FK → Clinic |
| patient_id | UUID | FK → Patient (nullable for broadcast) |
| channel | ENUM | email, sms, whatsapp, in_app |
| template_id | UUID | FK → MessageTemplate (nullable) |
| category | ENUM | transactional, promotional |
| subject | String | For email |
| body | Text | Rendered message body |
| status | ENUM | queued, sent, delivered, read, failed, skipped |
| scheduled_at | DateTime | For scheduled sends |
| sent_at | DateTime | |
| created_at | DateTime | |

### Story 1.4 — Communication Logs

Create table: `communication_logs`

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| message_id | UUID | FK → CommunicationMessage |
| recipient | String | Phone/email |
| channel | ENUM | |
| provider | String | e.g., mailtrap, msg91, gupshup |
| status | ENUM | sent, delivered, read, failed, bounced |
| provider_message_id | String | External reference |
| sent_at | DateTime | |
| delivered_at | DateTime | |
| read_at | DateTime | For WhatsApp read receipts |
| failed_at | DateTime | |
| error_message | Text | |
| cost | Decimal | Per-message cost tracking |

**Purpose:** Debugging, analytics, billing, ROI tracking.

### Story 1.5 — Channel Provider Interface

Create provider abstraction:

```typescript
interface ChannelProvider {
  send(options: SendMessageOptions): Promise<SendResult>;
  getDeliveryStatus(providerMessageId: string): Promise<DeliveryStatus>;
}
```

Implementations: EmailProvider, SmsProvider, WhatsAppProvider

**Acceptance Criteria:** Providers interchangeable, no direct coupling, factory pattern for provider selection.

### Story 1.6 — Message Deduplication

Prevent duplicate messages:
- Hash of (patient_id + template_id + channel + date) checked before queueing
- Configurable dedup window (default: 24 hours)
- Skip with `status: skipped` and reason logged

### Story 1.7 — Channel Fallback Logic

If primary channel delivery fails, automatically try next channel:
- Configurable fallback chain per clinic (e.g., WhatsApp → SMS → Email)
- Only for non-time-sensitive messages (not OTP)
- Track original channel + fallback channel in logs

### Story 1.8 — Delivery Rate Monitoring & Circuit Breaker

- If a channel provider's failure rate > 20% in last 100 messages, pause that channel
- Alert clinic admin via in-app notification
- Auto-resume after configurable cooldown (default: 30 minutes)
- Dashboard indicator showing channel health

---

## EPIC 2 — Message Template System

**Goal:** Allow clinics to define reusable, multilingual message templates.

### Story 2.1 — Template Entity

Create table: `message_templates`

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| clinic_id | UUID | FK (nullable — null = system template) |
| channel | ENUM | email, sms, whatsapp, all |
| category | ENUM | reminder, greeting, campaign, transactional, follow_up, referral |
| template_name | String | |
| subject | String | For email |
| body | Text | With {{placeholders}} |
| variables | JSON | List of supported variables |
| language | String | Default: 'en'. Support: hi, ta, te, kn, mr, etc. |
| is_active | Boolean | |
| dlt_template_id | String | For SMS DLT compliance (nullable) |
| whatsapp_template_status | ENUM | draft, submitted, approved, rejected (nullable) |

### Story 2.2 — Template Rendering Engine

Support placeholders:
- Patient: `{{patient_name}}`, `{{patient_phone}}`, `{{patient_email}}`
- Appointment: `{{appointment_date}}`, `{{appointment_time}}`, `{{dentist_name}}`
- Clinic: `{{clinic_name}}`, `{{clinic_phone}}`, `{{clinic_address}}`, `{{clinic_google_maps_link}}`
- Financial: `{{amount}}`, `{{due_date}}`, `{{balance}}`
- Campaign: `{{offer_percentage}}`, `{{offer_treatment}}`, `{{offer_valid_until}}`
- Referral: `{{referral_code}}`, `{{referral_link}}`
- Conditional blocks: `{{#if has_pending_treatment}}...{{/if}}`
- Date formatting: `{{appointment_date | format:"DD MMM YYYY"}}`
- Currency formatting: `{{amount | currency:"INR"}}`

**Acceptance Criteria:** Dynamic variable replacement, missing variables handled gracefully, format helpers work.

### Story 2.3 — Template Management API

Endpoints:
- `POST /communication/templates` — create template
- `GET /communication/templates` — list (filter by channel, category, language)
- `GET /communication/templates/:id` — get template
- `PATCH /communication/templates/:id` — update template
- `DELETE /communication/templates/:id` — soft delete

### Story 2.4 — Default Templates (Seed)

Seed default templates for each channel:
- Appointment reminder (24hr, 2hr)
- Birthday greeting
- Festival greeting (Diwali, New Year, etc.)
- Campaign message
- Email verification
- Password reset
- Post-treatment care (extraction, RCT, filling, scaling)
- No-show follow-up
- Payment reminder
- Payment confirmation
- Referral invitation
- Feedback request
- Reactivation ("We miss you")

### Story 2.5 — Multilingual Template Support

- Patient model gets `preferred_language` field (default: 'en')
- Templates can have language variants (same template_name, different language)
- Rendering engine selects patient's preferred language, falls back to 'en'
- Support: English, Hindi, Tamil, Telugu, Kannada, Marathi, Malayalam, Bengali, Gujarati

### Story 2.6 — Template Categories & Tagging

- Category determines routing: `transactional` → can send anytime, `promotional` → DND rules apply
- Category maps to SMS DLT route (transactional sender ID vs promotional)
- Filterable in UI

---

## EPIC 3 — Email Channel Integration

**Goal:** Enable email communication via SMTP.

### Story 3.1 — Email Provider

Implement using:
- `@nestjs-modules/mailer` + Handlebars for HTML templates
- SMTP transport (configurable per clinic in future)
- Mailtrap for development/staging
- SendGrid/SES for production (configurable)

### Story 3.2 — Email Worker

BullMQ worker for `communication_email` queue:
1. Receive notification job
2. Render template with variables
3. Send via email provider
4. Update communication_logs (status, sent_at, provider_message_id)
5. Handle failures with retry + error logging

### Story 3.3 — HTML Email Templates

Professional HTML email layouts for:
- Appointment reminders (with clinic branding, appointment details card)
- Campaigns (hero image, CTA button, unsubscribe footer)
- Authentication (OTP, verification link, password reset)
- Greetings (festival-themed, birthday)
- Invoices/receipts (payment confirmation with summary)
- Care instructions (procedure-specific with icons)

All templates include: clinic logo, footer with contact info, unsubscribe link (for promotional).

---

## EPIC 4 — SMS Channel Integration + DLT Compliance

**Goal:** Enable SMS communication compliant with Indian TRAI regulations.

### Story 4.1 — SMS Provider Integration

Integrate with Indian SMS gateway:
- Primary: MSG91 (widely used in India, good DLT support)
- Alternative: Textlocal, Kaleyra, Twilio
- Support both **transactional** (SMSC route) and **promotional** (PROMO route) sender IDs
- Store clinic-level DLT registration: Entity ID, Sender ID (Header)

### Story 4.2 — DLT Template Registration

**TRAI mandate — SMS won't deliver without registered templates:**
- Store DLT template IDs mapped to `message_templates`
- Field: `dlt_template_id` on MessageTemplate
- Validate that only DLT-approved templates are sent via SMS
- Admin UI to input DLT template IDs after registering on DLT portal

### Story 4.3 — SMS Worker

BullMQ worker for `communication_sms` queue:
- Character count validation (160 chars GSM, 70 chars Unicode/Hindi)
- Long message splitting with part tracking
- DLT template ID inclusion in API call
- Transactional vs promotional route selection based on template category

### Story 4.4 — SMS Delivery Reports

- Process delivery receipts from SMS gateway (webhook/polling)
- Update communication_logs with delivery status
- Track DLT scrubbing failures (template mismatch, DND rejection)
- Cost tracking per SMS (transactional ~₹0.15-0.20, promotional ~₹0.20-0.25)

---

## EPIC 5 — WhatsApp Business API Integration

**Goal:** Enable WhatsApp communication — the #1 messaging channel in India.

### Story 5.1 — WhatsApp BSP Integration

Integrate with a Business Solution Provider:
- Primary: Gupshup (strong in India, good pricing)
- Alternative: WATI, Interakt, Twilio
- Store clinic-level BSP credentials: API key, Phone Number ID, WABA ID
- Support provider switching via channel provider interface

### Story 5.2 — WhatsApp Template Approval Workflow

**Meta requires pre-approved templates for outbound messaging (HSM templates):**
- Clinic creates template in our system
- System submits to Meta via BSP API for approval
- Track approval status: `draft → submitted → approved → rejected`
- Only allow sending via approved templates
- Show rejection reason, allow re-submission

### Story 5.3 — WhatsApp Interactive Messages

Use WhatsApp's interactive message types:
- **Quick Reply buttons:** "Confirm / Reschedule / Cancel" for appointment reminders
- **List messages:** Select appointment slot from options
- **CTA buttons:** Link to payment page, feedback form, clinic location

### Story 5.4 — WhatsApp Media Messages

Support sending:
- **Images:** Clinic branding, festival greeting images, dental X-rays
- **PDFs:** Invoices, prescriptions, treatment plans
- **Location:** Clinic address pin for new patients
- **Documents:** Post-treatment care instruction PDFs

### Story 5.5 — WhatsApp Session Messaging

- After a patient replies, a 24-hour session window opens
- Allow clinic staff to respond within the window via Communication UI (free-form, no template needed)
- Track session windows per patient
- Show active sessions in UI

### Story 5.6 — WhatsApp Webhook & Delivery Tracking

- Receive delivery receipts via webhook: sent → delivered → read → failed
- Update communication_logs with granular status + timestamps
- Track **read rates** (major differentiator over SMS)
- Handle incoming patient replies → route to session messaging

---

## EPIC 6 — Patient Communication Preferences + TRAI Compliance

**Goal:** Allow patients to control communication and ensure regulatory compliance.

### Story 6.1 — Communication Preferences Table

Create table: `patient_communication_preferences`

| Field | Type | Notes |
|---|---|---|
| patient_id | UUID | FK → Patient, unique |
| allow_email | Boolean | Default: true |
| allow_sms | Boolean | Default: true |
| allow_whatsapp | Boolean | Default: true |
| allow_marketing | Boolean | Default: true (promotional messages) |
| allow_reminders | Boolean | Default: true (appointment/payment reminders) |
| preferred_channel | ENUM | email, sms, whatsapp (default: whatsapp) |
| preferred_language | String | Default: 'en' |
| quiet_hours_start | Time | Default: null (use TRAI default 9 PM) |
| quiet_hours_end | Time | Default: null (use TRAI default 9 AM) |

### Story 6.2 — Preference API

Endpoints:
- `GET /patients/:id/communication-preferences`
- `PATCH /patients/:id/communication-preferences`

### Story 6.3 — Preference Enforcement

Before sending any message:
1. Check patient preferences for channel + message type
2. Check clinic channel settings (enabled?)
3. Skip if disabled, log with `status: skipped`, reason in metadata

### Story 6.4 — DND / Quiet Hours Enforcement

**TRAI regulation — no promotional messages between 9 PM and 9 AM:**
- Messages categorized as `transactional` (reminders, OTP) → exempt, send anytime
- Messages categorized as `promotional` (campaigns, offers, greetings) → queue to next valid window
- Respect patient-level custom quiet hours if set
- BullMQ delayed job with calculated delay

### Story 6.5 — Consent Audit Trail

Create table: `consent_audit_log`

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| patient_id | UUID | FK |
| field_changed | String | e.g., allow_marketing |
| old_value | String | |
| new_value | String | |
| changed_by | String | patient_self, clinic_staff, api |
| source | String | opt_out_link, settings_page, registration |
| ip_address | String | |
| created_at | DateTime | |

**Legally required** for TRAI/compliance audits.

### Story 6.6 — Patient Self-Service Opt-Out Link

- Every promotional message includes an unsubscribe link
- Generate unique opt-out URL per patient (signed JWT, no login required)
- Landing page shows current preferences with toggle switches
- Patient can opt out of specific channels or all marketing
- Changes logged in consent_audit_log

### Story 6.7 — NDNC Registry Check (Optional)

- Before first SMS to a new patient number, optionally check NDNC registry
- Flag numbers on the registry
- Allow override for transactional messages only
- Configurable per clinic (enable/disable)

---

## EPIC 7 — Clinic Communication Settings

**Goal:** Allow clinics to configure communication channels and providers.

### Story 7.1 — Clinic Communication Settings Table

Create table: `clinic_communication_settings`

| Field | Type | Notes |
|---|---|---|
| clinic_id | UUID | FK, unique |
| enable_email | Boolean | Default: true |
| enable_sms | Boolean | Default: false |
| enable_whatsapp | Boolean | Default: false |
| email_provider | String | mailtrap, sendgrid, ses |
| email_config | JSON | SMTP host, port, user, pass (encrypted) |
| sms_provider | String | msg91, textlocal |
| sms_config | JSON | API key, sender ID, DLT entity ID (encrypted) |
| whatsapp_provider | String | gupshup, wati |
| whatsapp_config | JSON | API key, phone number ID, WABA ID (encrypted) |
| fallback_chain | JSON | ["whatsapp", "sms", "email"] |
| default_reminder_channels | JSON | ["whatsapp", "sms"] |
| daily_message_limit | Int | Default: 1000 (plan-based) |
| send_rate_per_minute | Int | Default: 100 |

### Story 7.2 — Communication Settings API

Endpoints:
- `GET /clinic/communication-settings`
- `PATCH /clinic/communication-settings`
- `POST /clinic/communication-settings/test` — send test message to verify config

---

## EPIC 8 — Appointment & Payment Reminders

**Goal:** Automatically remind patients about appointments and payments.

### Story 8.1 — Appointment Reminder Scheduler

Cron jobs:
- **24-hour reminder:** Daily at 8 AM, query appointments for tomorrow
- **2-hour reminder:** Every 30 minutes, query appointments in next 2 hours
- Check patient preferences + clinic settings before creating messages
- Use clinic's selected reminder template

### Story 8.2 — Reminder Notification Creation

- Generate communication_message records for each qualifying appointment
- Select template based on channel + clinic preference
- Render with appointment variables
- Queue for delivery

### Story 8.3 — Reminder Template Selection

- Clinics can choose which template to use for reminders
- Different templates per channel (email = detailed, SMS = concise, WhatsApp = interactive with buttons)
- Fallback to system defaults if no custom template

### Story 8.4 — Installment Due Date Patient Reminder

- 3 days before installment due date, send reminder to patient
- "Your installment of ₹{{amount}} is due on {{due_date}}. Please visit or pay online."
- Leverage existing InstallmentItem model

### Story 8.5 — Overdue Payment Patient Notification

- When installment becomes overdue, notify patient (not just admin)
- Gentle, non-threatening tone
- Include clinic phone number for questions

### Story 8.6 — Payment Confirmation Receipt

- After any payment is recorded, send confirmation to patient
- Amount paid, remaining balance, next installment date
- Via patient's preferred channel

---

## EPIC 9 — Campaign Management

**Goal:** Enable clinics to run targeted marketing campaigns that drive revenue.

### Story 9.1 — Campaign Entity

Create table: `campaigns`

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| clinic_id | UUID | FK |
| name | String | |
| channel | ENUM | email, sms, whatsapp, all |
| template_id | UUID | FK → MessageTemplate |
| segment_type | ENUM | all, inactive, treatment_type, birthday_month, location, custom |
| segment_config | JSON | Filter criteria |
| status | ENUM | draft, scheduled, running, completed, paused, cancelled |
| scheduled_at | DateTime | |
| started_at | DateTime | |
| completed_at | DateTime | |
| total_recipients | Int | |
| sent_count | Int | |
| delivered_count | Int | |
| failed_count | Int | |
| read_count | Int | For WhatsApp |
| estimated_cost | Decimal | |
| actual_cost | Decimal | |
| created_by | UUID | FK → User |

### Story 9.2 — Campaign Target Segments

Support targeting:
- **All patients** — entire clinic patient base
- **Inactive patients** — no visit in X months (configurable: 3, 6, 12)
- **Treatment type** — patients who had specific procedures
- **Birthday month** — patients with birthdays in target month
- **Location** — filter by city/area (from patient address)
- **Custom** — combine multiple filters (AND logic)
- **Show audience count preview** before sending

### Story 9.3 — Campaign Scheduler

- BullMQ delayed jobs for scheduled campaigns
- Support: send now, schedule for specific date/time
- Respect DND/quiet hours (auto-delay promotional campaigns)

### Story 9.4 — Campaign Execution

- Create communication_messages for each patient in segment
- Respect patient preferences (skip opted-out patients)
- Rate limiting (configurable messages/minute)
- Progress tracking (X of Y sent)

### Story 9.5 — Campaign Analytics

Track per campaign:
- Sent, delivered, failed, read counts
- Delivery rate, read rate (WhatsApp)
- Cost (actual vs estimated)
- Appointments booked within 7 days of campaign (attributed bookings)

### Story 9.6 — Dormant Patient Auto-Detection

- Weekly cron identifies patients with no appointments in configurable periods
- Tier 1: 3 months inactive
- Tier 2: 6 months inactive
- Tier 3: 12+ months inactive
- Tag patients with dormancy tier for easy segmentation

### Story 9.7 — Reactivation Drip Sequence

Multi-step automated campaign:
- **Day 0:** Gentle reminder ("It's been a while since your last visit")
- **Day 7:** Mention specific pending treatments if any
- **Day 21:** Offer/discount ("Special offer for returning patients")
- If patient books at any step → stop the sequence
- Requires `campaign_sequence_steps` table + `patient_campaign_progress` tracking

### Story 9.8 — Campaign A/B Testing

- Create 2 template variants per campaign
- Split audience randomly (50/50 or custom)
- Track which variant has higher engagement
- Show winner in analytics
- Option to send winning variant to remaining audience

### Story 9.9 — Campaign Cost Tracking & ROI

- Track per-message cost by channel (SMS ~₹0.20, WhatsApp ~₹0.50-1.00)
- Calculate total campaign cost
- If campaign recipients book appointments within attribution window (7/14/30 days), attribute that revenue
- ROI = (attributed revenue - campaign cost) / campaign cost
- Show on campaign detail page

### Story 9.10 — Campaign Rate Limiting & Throttling

- Configurable send rate (e.g., 100 messages/minute)
- BullMQ rate limiter on communication queues
- Prevent burst-sending (BSP rate limits, deliverability issues)
- Stagger large campaigns (1000+ recipients) over hours
- Show estimated completion time

---

## EPIC 10 — Greetings & Occasion-Based Automation

**Goal:** Send automated greetings for birthdays, festivals, and special occasions — keeping clinics close to patients.

### Story 10.1 — Birthday Detection & Greeting

- Daily cron job checks patient birthdays (match month + day)
- Send greeting via patient's preferred channel
- Use customizable birthday template
- Clinics can attach offers ("10% off on your birthday month!")

### Story 10.2 — Festival Calendar & Event Registry

Create table: `clinic_events`

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| clinic_id | UUID | FK (nullable = system event) |
| event_name | String | e.g., Diwali, Holi, New Year |
| event_date | Date | |
| is_recurring | Boolean | Repeat annually |
| is_enabled | Boolean | Clinic can disable specific festivals |
| template_id | UUID | FK → MessageTemplate (nullable) |
| send_offer | Boolean | Attach promotional offer |
| offer_details | JSON | {percentage, treatment, valid_until} |

Pre-seeded festivals: Diwali, Holi, Eid, Christmas, New Year, Pongal, Onam, Ugadi, Navratri, Independence Day, Republic Day, Makar Sankranti, Dentist's Day (March 6).

### Story 10.3 — Festival Greeting Automation

- Cron job checks upcoming events (same day or day before based on clinic config)
- Send greeting to all opted-in patients
- Templates with festival-specific imagery (WhatsApp media messages)
- Include promotional offer if configured

### Story 10.4 — Festival Offer Campaigns

One-click campaign creation tied to festivals:
- "Diwali Special: 20% off Teeth Whitening"
- Pre-built campaign templates with offer placeholders: `{{offer_percentage}}`, `{{offer_treatment}}`, `{{offer_valid_until}}`
- Auto-create campaign from event with pre-filled template

### Story 10.5 — Patient Anniversary Greetings

- Track patient registration date
- Annual greeting: "Happy 1-year anniversary with {{clinic_name}}! Thank you for trusting us."
- Attach loyalty discount for milestone years (1, 2, 5, 10)

### Story 10.6 — Custom Occasion Greetings

- Clinics can add custom events (clinic anniversary, local festivals)
- Optional: Patient custom dates (wedding anniversary if stored)
- Fully configurable automation rules

---

## EPIC 11 — Post-Treatment & Follow-Up Automation

**Goal:** Automate post-visit communication for better clinical outcomes and patient retention.

### Story 11.1 — Post-Treatment Care Instructions

- When treatment status → `completed`, auto-send care instructions
- Template selection based on `treatment.procedure`:
  - Extraction: "Do not spit for 24 hours, avoid hot food..."
  - RCT: "Avoid chewing on treated side for 48 hours..."
  - Filling: "Avoid eating for 2 hours..."
  - Scaling: "Use soft brush for 3 days..."
- Via patient's preferred channel
- Delay: 1 hour after appointment completion

### Story 11.2 — Post-Visit Feedback Collection

- 3-4 hours after appointment marked `completed`, send feedback request
- "How was your experience? Rate 1-5 stars"
- WhatsApp: interactive quick reply buttons (star emojis)
- Email: link to simple rating form
- Store responses in `patient_feedback` table (patient_id, appointment_id, rating, comment, created_at)

### Story 11.3 — Google Review Solicitation

- If feedback rating >= 4 stars, send follow-up:
  - "Glad you had a great experience! Would you mind leaving us a Google review?"
  - Include direct link to clinic's Google Business Profile review page
- Clinic stores their `google_review_url` in settings
- Track: review requests sent, conversions (if trackable)
- **Direct revenue impact through SEO and reputation**

### Story 11.4 — No-Show Follow-Up Automation

- When appointment status → `no_show`, trigger message within 1 hour
- "We missed you today! Would you like to reschedule?"
- WhatsApp: quick reply buttons (Yes/No/Call Me)
- Track no-show rebooking rate (attributed appointments within 7 days)

### Story 11.5 — Treatment Plan Completion Reminders

- Weekly cron identifies patients with treatments in `planned` or `in_progress` status
- No related appointment in last N days (configurable, default 14)
- Send: "You have an incomplete treatment plan. Please book your next visit."
- Include treatment details (procedure, tooth number)

### Story 11.6 — Prescription Refill Reminders

- Based on PrescriptionItem.duration, calculate medication end date
- 2 days before end: "Your medication prescribed on {{date}} is about to finish. Please visit if symptoms persist."
- Track: reminders sent, follow-up appointments booked

---

## EPIC 12 — Referral Program

**Goal:** Enable patient referrals — the #1 growth channel for dental clinics.

### Story 12.1 — Referral Code Generation

Create table: `patient_referral_codes`

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| patient_id | UUID | FK → Patient |
| code | String | Unique, 6-8 chars, human-readable |
| is_active | Boolean | |
| created_at | DateTime | |

Auto-generate code on patient creation or first successful visit.

### Story 12.2 — Referral Tracking

Create table: `referrals`

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| clinic_id | UUID | FK |
| referrer_patient_id | UUID | FK → Patient |
| referred_patient_id | UUID | FK → Patient |
| referral_code | String | |
| status | ENUM | pending, completed (first visit done), rewarded |
| reward_type | ENUM | discount_percentage, discount_flat, credit |
| reward_value | Decimal | |
| reward_status | ENUM | pending, credited, redeemed |
| created_at | DateTime | |

Capture `referral_code` during patient registration. Link referred patient to referrer.

### Story 12.3 — Referral Invitation Message

- After a completed visit (especially if positive feedback), send:
  - "Loved your visit? Refer a friend! Both of you get {{reward}}."
  - Include referral code + shareable WhatsApp link
- Trigger: manual by clinic staff OR automatic after positive feedback

### Story 12.4 — Referral Reward Notification

- When referred patient completes their first appointment:
  - Notify referrer: "Your referral {{referred_name}} visited us! Your reward of ₹{{reward}} has been credited."
  - Create patient credit (store in `patient_credits` table or as invoice discount)

### Story 12.5 — Referral Analytics Dashboard

Track and display:
- Total referral codes distributed
- New patients via referrals
- Conversion rate (referred → first visit)
- Revenue attributed to referrals
- Top referrers leaderboard
- Show in Reports page or dedicated referral tab

---

## EPIC 13 — Authentication Messaging

**Goal:** Send authentication-related messages via configured channels.

### Story 13.1 — Email Verification

- On clinic registration / patient signup, send verification email
- Verification link with signed JWT (expires in 24 hours)
- HTML template with CTA button

### Story 13.2 — Password Reset Email

- Send password reset link on request
- Signed JWT with expiry (1 hour)
- HTML template with reset button + security notice

### Story 13.3 — OTP Messaging

- Send OTP for login verification or sensitive operations
- 6-digit code, expires in 10 minutes
- Channels: Email (immediate), SMS (immediate), WhatsApp (if enabled)
- Store OTP hash (not plaintext) with attempt tracking
- Rate limit: max 5 OTP requests per hour per user

---

## EPIC 14 — Communication UI

**Goal:** Build the frontend for managing all communication features.

### Story 14.1 — Communications Sidebar Section

Add new sidebar section: **Communications**
- Templates
- Campaigns
- Automation Rules
- Message Logs
- Settings

### Story 14.2 — Templates Page

- DataTable listing all templates (name, channel, category, language, status, actions)
- Create/edit template dialog with:
  - Channel select, category select, language select
  - Subject + body editor with variable insertion toolbar
  - **Live preview panel** with sample patient data substituted
  - WhatsApp: show chat bubble mockup
  - SMS: show character count + segment count
  - Email: render HTML preview

### Story 14.3 — Campaign Creation Wizard

Multi-step form:
1. **Campaign Details:** Name, channel select
2. **Template:** Select existing or create new, live preview
3. **Audience:** Define segment with filters, show **audience count preview**
4. **Schedule:** Send now or schedule (date/time picker), DND warning if applicable
5. **Review & Confirm:** Summary of all selections, estimated cost, send

### Story 14.4 — Campaign List & Detail Page

- DataTable: name, channel, status badge, recipients, sent/delivered/failed counts, scheduled date
- Detail page: real-time progress during execution, analytics charts (delivery funnel), recipient list with individual status, cost breakdown

### Story 14.5 — Automation Rules Page

Configure automation rules:
- Birthday greetings (enable/disable, template select)
- Festival greetings (event calendar, enable/disable per festival)
- Post-treatment care (enable/disable per procedure type)
- No-show follow-up (enable/disable, delay config)
- Dormant patient reactivation (enable/disable, dormancy thresholds)
- Treatment plan reminders (enable/disable, reminder interval)
- Payment reminders (enable/disable, days before due)
- Feedback collection (enable/disable, delay after appointment)

### Story 14.6 — Message Logs Page

- DataTable: recipient, channel, template, status badge, sent_at, cost
- Filters: channel, status, date range, patient search
- Click to expand: full message body, delivery timeline, error details
- Export to CSV

### Story 14.7 — Communication Settings Page

- Channel enable/disable toggles (email, SMS, WhatsApp)
- Provider configuration forms (API keys, SMTP settings)
- Test connection button per channel
- Fallback chain configuration (drag to reorder)
- Rate limiting settings
- DLT Entity ID / Sender ID for SMS
- WhatsApp Business Account ID

### Story 14.8 — Communication Analytics Dashboard

Dedicated analytics page:
- Messages sent by channel (pie chart)
- Delivery rates by channel (bar chart)
- Daily/weekly/monthly send volume (line chart)
- Top performing campaigns (table)
- Cost by channel (stacked bar)
- Time range filter

### Story 14.9 — Patient Communication Timeline

On patient detail page, add **"Communications" tab**:
- All messages sent to that patient across all channels
- Delivery status, timestamps, template used
- Read from communication_logs filtered by patient_id
- Timeline view (most recent first)

### Story 14.10 — Template Preview with Variable Substitution

When editing a template:
- Live preview panel on the right
- Sample patient data auto-filled into placeholders
- Email: rendered HTML
- SMS: plain text with character count
- WhatsApp: chat bubble mockup with interactive buttons preview

---

## Phase 3 Implementation Order

Build in this order:

1. **Epic 1** — Communication Infrastructure (core engine)
2. **Epic 2** — Template System (templates before channels)
3. **Epic 3** — Email Integration (easiest channel, validate pipeline)
4. **Epic 4** — SMS Channel + DLT (India-critical)
5. **Epic 5** — WhatsApp Business API (highest value channel)
6. **Epic 6** — Patient Preferences + TRAI Compliance
7. **Epic 7** — Clinic Communication Settings
8. **Epic 8** — Appointment & Payment Reminders
9. **Epic 9** — Campaign Management
10. **Epic 10** — Greetings & Occasion Automation
11. **Epic 11** — Post-Treatment Follow-Ups
12. **Epic 12** — Referral Program
13. **Epic 13** — Authentication Messaging
14. **Epic 14** — Communication UI (build incrementally alongside backend epics)

---

## Dependencies (External Setup Required by Clinic Owner)

| Dependency | What | When Needed | Notes |
|---|---|---|---|
| Mailtrap Account | Dev/staging email testing | Epic 3 | Free tier available |
| SendGrid / AWS SES | Production email | Epic 3 (production) | API key needed |
| MSG91 Account | SMS gateway | Epic 4 | Indian SMS provider |
| DLT Registration | TRAI mandatory for SMS | Epic 4 | Register on Jio/Airtel/Vi DLT portal with Entity ID |
| DLT Template Approval | Each SMS template must be registered | Epic 4 | 24-48 hours approval time |
| Gupshup / WATI Account | WhatsApp BSP | Epic 5 | Business Solution Provider |
| WhatsApp Business Account | Meta WABA | Epic 5 | Requires Facebook Business Manager |
| WhatsApp Template Approval | Each template submitted to Meta | Epic 5 | 24-48 hours approval |
| Google Business Profile | For review solicitation link | Epic 11 | Clinic's Google Maps listing |
