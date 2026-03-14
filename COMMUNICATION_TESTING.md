# Communication & Patient Engagement — Feature Testing Guide

This document covers **every scenario** where emails, SMS, or WhatsApp messages are sent to patients, along with step-by-step instructions for testing each one.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [SMTP / Provider Configuration](#smtp--provider-configuration)
3. [Message-Sending Scenarios Summary](#message-sending-scenarios-summary)
4. [Automated Cron Jobs (6 Scenarios)](#automated-cron-jobs)
5. [Event-Triggered Messages (2 Scenarios)](#event-triggered-messages)
6. [Manual API-Triggered Messages (2 Scenarios)](#manual-api-triggered-messages)
7. [Channel Preferences & Validation Rules](#channel-preferences--validation-rules)
8. [Queue & Delivery Architecture](#queue--delivery-architecture)
9. [Troubleshooting](#troubleshooting)
10. [Not Yet Implemented](#not-yet-implemented)

---

## Prerequisites

Before testing any communication feature, ensure:

1. **PostgreSQL** is running with the `dental_saas` database
2. **Redis** is running (required for BullMQ queues)
3. **Backend server** is running (`npm run start:dev` on port 3000)
4. **At least one clinic** exists with a valid subscription
5. **At least one patient** exists with email and/or phone number
6. **Automation rules are seeded** — they are seeded on first server start via `AutomationService.seedDefaults()`

---

## SMTP / Provider Configuration

### Gmail SMTP Setup (Email)

1. Go to **Google Account → Security → 2-Step Verification** → Enable it
2. Go to **App Passwords** → Generate a new app password for "Mail"
3. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)
4. In the frontend, go to **Communication → Settings tab**
5. Under **Email Configuration**, enter:
   ```
   Host:     smtp.gmail.com
   Port:     587
   Secure:   false
   User:     your-email@gmail.com
   Password: abcd efgh ijkl mnop   (app password, no spaces)
   From:     your-email@gmail.com
   ```
6. Click **Save Settings**
7. API equivalent:
   ```
   PATCH /communication/settings
   Header: x-clinic-id: <your-clinic-id>
   Body:
   {
     "enable_email": true,
     "email_config": {
       "host": "smtp.gmail.com",
       "port": 587,
       "secure": false,
       "user": "your-email@gmail.com",
       "pass": "abcdefghijklmnop",
       "from": "your-email@gmail.com"
     }
   }
   ```

### SMS Provider Setup (MSG91 / Textlocal)

```
PATCH /communication/settings
{
  "enable_sms": true,
  "sms_config": {
    "apiKey": "your-api-key",
    "senderId": "DENTAL",
    "dltEntityId": "123456",
    "route": "transactional"
  }
}
```

### WhatsApp Provider Setup (Gupshup / WATI)

```
PATCH /communication/settings
{
  "enable_whatsapp": true,
  "whatsapp_config": {
    "apiKey": "your-api-key",
    "phoneNumberId": "+919999999999",
    "wabaId": "waba_id",
    "apiBaseUrl": "https://api.gupshup.io"
  }
}
```

---

## Message-Sending Scenarios Summary

| # | Scenario | Trigger | Schedule | Channel | API Endpoint | Automation Rule |
|---|----------|---------|----------|---------|--------------|-----------------|
| 1 | Birthday Greeting | Cron | 8:30 AM daily | Configurable | — | `birthday_greeting` |
| 2 | Festival Greeting | Cron | 8:00 AM daily | Configurable | — | `festival_greeting` |
| 3 | Appointment Reminder | Cron | 7:30 AM daily | Configurable | — | `appointment_reminder_patient` |
| 4 | Payment Reminder | Cron | 9:30 AM daily | Configurable | — | `payment_reminder` |
| 5 | Dormant Reactivation | Cron | Mon 6:00 AM | Configurable | — | `dormant_reactivation` |
| 6 | Treatment Plan Reminder | Cron | 10:00 AM daily | Configurable | — | `treatment_plan_reminder` |
| 7 | Google Review Request | Event | On feedback submit | WhatsApp | `POST /feedback` | `feedback_collection` |
| 8 | Referral Success | Event | On referral complete | WhatsApp | `POST /referrals/complete` | Always (no rule) |
| 9 | Direct Message | API | On-demand | Any | `POST /communication/messages` | Manual |
| 10 | Campaign (Bulk) | API | On-demand | Any | `POST /campaigns/:id/execute` | Manual |

---

## Automated Cron Jobs

These run automatically on a schedule. Each requires its **automation rule to be enabled** for the clinic.

### 1. Birthday Greeting

- **Cron Schedule**: Daily at 8:30 AM (`0 30 8 * * *`)
- **Rule Name**: `birthday_greeting`
- **What it does**: Sends birthday wishes to patients whose DOB matches today
- **Required Data**:
  - Patient must have `date_of_birth` set (month + day matches today)
  - Patient must have email/phone depending on channel
- **Category**: Promotional

**How to Test:**
1. Enable the automation rule:
   ```
   PATCH /automation/rules/:ruleId
   { "is_enabled": true, "channels": ["email"] }
   ```
2. Create/update a patient with today's date as DOB (any year):
   ```
   PATCH /patients/:id
   { "date_of_birth": "1990-MM-DD" }   ← use today's month/day
   ```
3. Wait for 8:30 AM cron, **or** restart the server and manually call:
   ```
   POST /notifications/trigger-crons
   ```
   > Note: The notification trigger-crons endpoint triggers notification crons, not automation crons. To test automation crons immediately, you can temporarily change the cron schedule in `automation.cron.ts` to run every minute: `@Cron('*/1 * * * *')`.
4. Check the patient's email inbox
5. Verify in DB: `SELECT * FROM "CommunicationMessage" WHERE category='promotional' ORDER BY created_at DESC;`

---

### 2. Festival Greeting

- **Cron Schedule**: Daily at 8:00 AM
- **Rule Name**: `festival_greeting`
- **What it does**: Sends greetings on festival days (25 Indian festivals + 2 dental days pre-seeded)
- **Required Data**:
  - A `ClinicEvent` with `event_date` matching today and `is_enabled = true`
  - System-level events (clinic_id=null) apply to ALL clinics

**How to Test:**
1. Enable the rule:
   ```
   PATCH /automation/rules/:ruleId
   { "is_enabled": true, "channels": ["email"] }
   ```
2. Create an event for today:
   ```
   POST /clinic-events
   {
     "name": "Test Festival",
     "event_date": "2026-03-15",    ← use today's date
     "description": "Test greeting",
     "is_enabled": true
   }
   ```
3. Wait for 8:00 AM cron, or modify cron schedule temporarily for testing
4. All patients in the clinic should receive the greeting

---

### 3. Appointment Reminder (Patient)

- **Cron Schedule**: Daily at 7:30 AM (`0 30 7 * * *`)
- **Rule Name**: `appointment_reminder_patient`
- **What it does**: Reminds patients about **tomorrow's** appointments
- **Required Data**:
  - Patient must have an appointment with `status = 'scheduled'` and `date = tomorrow`
- **Default Config**: `{ reminder_24hr: true, reminder_2hr: true }`

**How to Test:**
1. Enable the rule:
   ```
   PATCH /automation/rules/:ruleId
   { "is_enabled": true, "channels": ["email", "sms"] }
   ```
2. Create an appointment for tomorrow:
   ```
   POST /appointments
   {
     "patient_id": "<patient-uuid>",
     "dentist_id": "<user-uuid>",
     "branch_id": "<branch-uuid>",
     "date": "2026-03-16",          ← tomorrow's date
     "start_time": "10:00",
     "end_time": "10:30",
     "status": "scheduled"
   }
   ```
3. Wait for 7:30 AM cron or modify schedule for testing
4. Patient should receive reminder with appointment details, dentist name, and branch address

---

### 4. Payment Reminder (Installments)

- **Cron Schedule**: Daily at 9:30 AM (`0 30 9 * * *`)
- **Rule Name**: `payment_reminder`
- **What it does**: Reminds patients about installments due in 3 days (configurable)
- **Required Data**:
  - Patient must have an active installment plan with a `pending` installment due in 3 days
- **Default Config**: `{ days_before_due: 3 }`

**How to Test:**
1. Enable the rule:
   ```
   PATCH /automation/rules/:ruleId
   { "is_enabled": true, "channels": ["email"] }
   ```
2. Create an invoice with installment plan where next installment is due in 3 days
3. Wait for 9:30 AM cron
4. Patient receives payment reminder with amount and due date

---

### 5. Dormant Patient Reactivation

- **Cron Schedule**: Every Monday at 6:00 AM (`0 0 6 * * 1`)
- **Rule Name**: `dormant_reactivation`
- **What it does**: Sends reactivation messages to patients with no appointments in past 6 months
- **Default Config**: `{ dormancy_months: 6, check_interval_days: 7 }`
- **Category**: Promotional

**How to Test:**
1. Enable the rule:
   ```
   PATCH /automation/rules/:ruleId
   { "is_enabled": true, "channels": ["email"] }
   ```
2. Ensure a patient exists with no appointments in the past 6 months (or create a patient with old/no appointment history)
3. Wait for Monday at 6:00 AM or modify schedule
4. Dormant patients receive reactivation message

---

### 6. Treatment Plan Reminder

- **Cron Schedule**: Daily at 10:00 AM (`0 0 10 * * *`)
- **Rule Name**: `treatment_plan_reminder`
- **What it does**: Reminds patients with incomplete treatments and no recent appointments
- **Required Data**:
  - Patient has treatment with `status = 'planned'` or `'in_progress'`
  - Patient has no appointments in the past 14 days (configurable)
- **Default Config**: `{ reminder_interval_days: 14 }`

**How to Test:**
1. Enable the rule
2. Create a treatment for a patient with status `planned` or `in_progress`
3. Ensure the patient has no appointments in the last 14 days
4. Wait for the 10:00 AM cron
5. Patient receives treatment plan follow-up reminder

---

## Event-Triggered Messages

These are triggered by specific actions in the system.

### 7. Google Review Request

- **Trigger**: Patient submits feedback with **rating ≥ 4**
- **Channel**: WhatsApp only
- **Rule Name**: `feedback_collection`
- **Required Config**:
  - Automation rule `feedback_collection` enabled
  - `min_rating_for_google_review` in rule config (default: 4)
  - `google_review_url` set in clinic's WhatsApp config
  - WhatsApp channel enabled

**How to Test:**
1. Enable the feedback collection rule:
   ```
   PATCH /automation/rules/:ruleId
   { "is_enabled": true, "config": { "min_rating_for_google_review": 4 } }
   ```
2. Set Google review URL in communication settings:
   ```
   PATCH /communication/settings
   {
     "enable_whatsapp": true,
     "whatsapp_config": {
       "google_review_url": "https://g.page/r/your-clinic/review"
     }
   }
   ```
3. Submit feedback with high rating:
   ```
   POST /feedback
   {
     "patient_id": "<patient-uuid>",
     "appointment_id": "<appointment-uuid>",
     "rating": 5,
     "comment": "Excellent service!",
     "source": "post_visit"
   }
   ```
4. Check: Patient should receive WhatsApp message with Google review link
5. Verify in DB: `SELECT google_review_requested FROM "PatientFeedback" WHERE id = '<feedback-id>';` should be `true`

---

### 8. Referral Success Notification

- **Trigger**: A new patient uses a referral code
- **Channel**: WhatsApp only
- **No automation rule required** — always sent
- **Recipient**: The **referrer** patient (not the new patient)

**How to Test:**
1. Ensure WhatsApp is enabled in communication settings
2. Get a patient's referral code (created when referral program is active)
3. Complete a referral:
   ```
   POST /referrals/complete
   {
     "patient_id": "<new-patient-uuid>",
     "referral_code": "REF-XXXXXX"
   }
   ```
4. The referrer patient receives a WhatsApp notification: "Your friend [name] has joined [clinic]!"
5. Verify in DB: Referral record created with `reward_status = 'pending'`

---

## Manual API-Triggered Messages

### 9. Direct Message Send (Ad-Hoc)

- **Endpoint**: `POST /communication/messages`
- **Use Case**: Send a one-off message to any patient from the UI

**How to Test:**
```
POST /communication/messages
Header: x-clinic-id: <clinic-uuid>
Header: Authorization: Bearer <jwt-token>

{
  "patient_id": "<patient-uuid>",
  "channel": "email",
  "category": "transactional",
  "subject": "Your Appointment Update",
  "body": "Dear Patient, your appointment has been confirmed for tomorrow at 10 AM.",
  "variables": {}
}
```

**Validations performed:**
- Patient exists in this clinic
- Email channel is enabled for clinic
- Patient has `allow_email = true` in preferences
- Patient has `allow_reminders = true` (for transactional) or `allow_marketing = true` (for promotional)
- Not in DND quiet hours (promotional only)
- Not a duplicate (same template + patient + channel within 24h)

**With Template:**
```json
{
  "patient_id": "<patient-uuid>",
  "channel": "email",
  "category": "promotional",
  "template_id": "<template-uuid>",
  "variables": { "patient_name": "John", "offer": "20% off cleaning" }
}
```

**Scheduled Message:**
```json
{
  "patient_id": "<patient-uuid>",
  "channel": "email",
  "category": "promotional",
  "body": "Special offer for you!",
  "scheduled_at": "2026-03-16T10:00:00Z"
}
```

---

### 10. Campaign Execution (Bulk Messages)

- **Endpoints**:
  - `POST /campaigns` — Create campaign
  - `POST /campaigns/audience-preview` — Preview target audience
  - `POST /campaigns/:id/execute` — Execute campaign
  - `GET /campaigns/:id/analytics` — View delivery analytics

**How to Test:**

**Step 1: Create a campaign**
```
POST /campaigns
{
  "name": "March Cleaning Offer",
  "channel": "email",
  "template_id": "<template-uuid>",
  "segment_type": "all",
  "segment_config": {}
}
```

**Segment Types:**
| Segment | Config Example | Description |
|---------|---------------|-------------|
| `all` | `{}` | All clinic patients |
| `inactive` | `{ "inactive_months": 6 }` | No appointment in X months |
| `treatment_type` | `{ "procedure": "Root Canal" }` | By procedure type |
| `birthday_month` | `{ "month": 3 }` | Patients born in month X |
| `location` | `{ "branch_id": "uuid" }` | Patients at a specific branch |
| `custom` | `{ "gender": "M", "branch_id": "uuid" }` | Combined filters |

**Step 2: Preview audience**
```
POST /campaigns/audience-preview
{
  "segment_type": "inactive",
  "segment_config": { "inactive_months": 3 }
}
```
Returns: `{ count: 45, sample: [...] }`

**Step 3: Execute the campaign**
```
POST /campaigns/<campaign-id>/execute
```
- Status changes: `draft → running → completed`
- Each patient in the segment receives the message
- Messages are queued in BullMQ for async delivery

**Step 4: Check analytics**
```
GET /campaigns/<campaign-id>/analytics
```
Returns: sent count, failed count, total recipients, estimated cost

---

## Channel Preferences & Validation Rules

Messages go through this validation chain before being sent:

### Validation Hierarchy (in order)

1. **Clinic Channel Enabled**: `enable_email`, `enable_sms`, `enable_whatsapp` must be `true`
2. **Patient Channel Preference**: `allow_email`, `allow_sms`, `allow_whatsapp` must be `true`
3. **Category Permission**:
   - Promotional → `allow_marketing = true`
   - Transactional → `allow_reminders = true`
4. **DND / Quiet Hours** (promotional only):
   - Default: 9:00 PM to 9:00 AM (TRAI compliance)
   - Promotional messages are **delayed** to next valid window
   - Transactional messages bypass DND
5. **Deduplication**: Same patient + same template + same channel within 24 hours → skipped

### Skip Reasons (message status = 'skipped')

| Reason Code | Meaning |
|-------------|---------|
| `channel_disabled_clinic` | Clinic has not enabled this channel |
| `patient_email_disabled` | Patient opted out of email |
| `patient_sms_disabled` | Patient opted out of SMS |
| `patient_whatsapp_disabled` | Patient opted out of WhatsApp |
| `patient_marketing_disabled` | Patient opted out of marketing messages |
| `patient_reminders_disabled` | Patient opted out of reminders |
| `no_recipient_info` | Patient has no email or phone on file |
| `dedup_duplicate` | Same message sent within 24 hours |

---

## Queue & Delivery Architecture

### Processing Pipeline

```
sendMessage() → validate → CommunicationProducer.enqueue() → BullMQ Queue → Worker → Provider.send()
```

### Queues

| Queue Name | Provider | External Service |
|------------|----------|-----------------|
| `communication_email` | EmailProvider (Nodemailer) | SMTP (Gmail, etc.) |
| `communication_sms` | SmsProvider | MSG91 / Textlocal |
| `communication_whatsapp` | WhatsAppProvider | Gupshup / WATI |

### Retry Policy

- **Max Attempts**: 3
- **Backoff**: Exponential (5s initial)
- **Dead Letter**: Failed jobs retained (500 max)
- **Scheduled Messages**: Delayed in queue until `scheduled_at` time

### Testing the Queue

```
POST /test-queue
{ "message": "Hello from test" }
```
Returns: `{ "jobId": "1" }` — confirms Redis/BullMQ connectivity

---

## Troubleshooting

### Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Messages not sending | Redis not running | Start Redis: `redis-server` |
| "Channel disabled" skip | Clinic hasn't enabled channel | `PATCH /communication/settings` → `enable_email: true` |
| "No recipient info" skip | Patient missing email/phone | Update patient record |
| Email SMTP auth error | Wrong password | Use Gmail **App Password**, not regular password |
| Crons not running | Rule disabled | Enable via `PATCH /automation/rules/:id` |
| Duplicate message skipped | Same template sent in 24h | Wait 24h or use different template |
| DND delay | Promotional sent during quiet hours | Send as transactional, or wait for DND window to end |
| Festival greeting not sent | No event for today | Create a `ClinicEvent` with today's date |

### Checking Message Delivery Status

```sql
-- All recent messages for a clinic
SELECT id, channel, status, category, skip_reason, created_at
FROM "CommunicationMessage"
WHERE clinic_id = '<clinic-uuid>'
ORDER BY created_at DESC
LIMIT 20;

-- Message stats
SELECT status, COUNT(*) FROM "CommunicationMessage"
WHERE clinic_id = '<clinic-uuid>'
GROUP BY status;
```

### Checking Automation Rule Status

```sql
SELECT rule_type, is_enabled, channels, config
FROM "AutomationRule"
WHERE clinic_id = '<clinic-uuid>';
```

---

## Not Yet Implemented

These automation rule types are defined but have **no triggers** yet:

| Rule | Intended Trigger | Status |
|------|-----------------|--------|
| `post_treatment_care` | After treatment completion | Stub only — no event handler |
| `no_show_followup` | After appointment no-show | Stub only — no event handler |

These are seeded as disabled rules. They will be activated in a future phase when event-driven triggers are added.

---

## Quick-Start Checklist for Testing Emails

- [ ] Redis running
- [ ] Backend server running
- [ ] Gmail 2FA enabled + App Password generated
- [ ] SMTP configured via `PATCH /communication/settings`
- [ ] `enable_email: true` in communication settings
- [ ] At least one patient with a valid email address
- [ ] Patient preferences: `allow_email: true`, `allow_marketing: true`, `allow_reminders: true`
- [ ] Automation rules enabled for the scenarios you want to test
- [ ] Send a test message: `POST /communication/messages` with `channel: "email"`
- [ ] Check inbox and verify delivery
