# WhatsApp Meta Templates — Smart Dental Desk

All templates submitted to Meta for approval before use.  
**UTILITY** templates approve within minutes. **MARKETING** templates may take up to 24 hours.

---

## Appointment Templates

### 1. dental_appointment_confirmation
- **Category:** UTILITY
- **Trigger:** Instantly when a new appointment is booked
- **Body:**
  ```
  Hi {{1}}, your appointment is confirmed.
  Doctor: {{2}}
  Date: {{3}}
  Time: {{4}}
  Clinic: {{5}}
  Call us at {{6}} for any queries.
  ```
- **Variables:** `{{1}}`=Patient name `{{2}}`=Doctor `{{3}}`=Date `{{4}}`=Time `{{5}}`=Clinic `{{6}}`=Phone

---

### 2. dental_appointment_reminder
- **Category:** UTILITY
- **Trigger:** Cron — daily 7:30 AM, finds appointments tomorrow
- **Body:**
  ```
  Hi {{1}}, this is a reminder for your appointment tomorrow.
  Date: {{2}}
  Time: {{3}}
  Clinic: {{4}}
  Doctor: {{5}}
  Please arrive 5 minutes early. Call us at {{6}} for any queries.
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Date `{{3}}`=Time `{{4}}`=Clinic `{{5}}`=Doctor `{{6}}`=Phone

---

### 3. dental_appointment_cancel
- **Category:** UTILITY
- **Trigger:** Instantly when appointment is cancelled
- **Body:**
  ```
  Hi {{1}}, your appointment at {{2}} scheduled for {{3}} at {{4}} has been cancelled.
  Please call us at {{5}} to reschedule at your convenience.
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Clinic `{{3}}`=Date `{{4}}`=Time `{{5}}`=Phone

---

### 4. dental_appointment_rescheduled
- **Category:** UTILITY
- **Trigger:** Instantly when appointment date/time changes
- **Body:**
  ```
  Hi {{1}}, your appointment has been rescheduled.
  Previous Time: {{2}}
  New Time: {{3}}
  Clinic: {{4}}
  Please call us at {{5}} for any queries.
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Previous date+time `{{3}}`=New date+time `{{4}}`=Clinic `{{5}}`=Phone

---

## Treatment & Care Templates

### 5. dental_post_treatment_care
- **Category:** UTILITY
- **Trigger:** Cron — daily 6 PM, finds treatments completed today
- **Body:**
  ```
  Hi {{1}}, here are your care instructions after your {{2}} at {{3}}.
  Follow your doctor {{4}}'s advice carefully.
  Call us at {{5}} if you experience any discomfort.
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Procedure `{{3}}`=Clinic `{{4}}`=Doctor `{{5}}`=Phone

---

### 6. dental_noshow_followup
- **Category:** UTILITY
- **Trigger:** Cron — daily 10:30 AM, finds yesterday's no-show appointments
- **Body:**
  ```
  Hi {{1}}, we noticed you missed your appointment at {{2}} today.
  We understand things come up. Please call us at {{3}} to reschedule at your convenience.
  We are here to help!
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Clinic `{{3}}`=Phone

---

### 7. dental_treatment_reminder
- **Category:** UTILITY
- **Trigger:** Cron — every 14 days, finds patients with pending treatment steps
- **Body:**
  ```
  Hi {{1}}, this is a gentle reminder that you have pending steps in your treatment plan at {{2}}.
  Completing your treatment on time ensures the best results. Please call us to schedule your next visit.
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Clinic

---

## Payment & Invoice Templates

### 8. dental_payment_received
- **Category:** UTILITY
- **Trigger:** Instantly when a payment is recorded on an invoice
- **Body:**
  ```
  Hi {{1}},

  We have received your payment of {{2}} for invoice {{3}} at {{4}}.

  Your receipt is ready. View & download:
  {{5}}

  Please call us at {{6}} for any queries.
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Amount (e.g. Rs.1000) `{{3}}`=Invoice no. `{{4}}`=Clinic `{{5}}`=Receipt PDF link `{{6}}`=Phone

---

### 9. dental_invoice_ready
- **Category:** UTILITY
- **Trigger:** Manual — staff clicks "Send via WhatsApp" on the invoice page
- **Body:**
  ```
  Hello {{1}}, your invoice has been generated at {{2}}.
  Invoice No: {{3}}, Amount: {{4}}.
  View & Download: {{5}}.
  For queries reach us at {{6}}.
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Clinic `{{3}}`=Invoice no. `{{4}}`=Amount `{{5}}`=Invoice PDF link `{{6}}`=Phone

---

### 10. dental_installment_due
- **Category:** UTILITY
- **Trigger:** Cron — daily 9:30 AM, finds installments due in 3 days
- **Body:**
  ```
  Hi {{1}}, your installment of {{2}} is due on {{3}} at {{4}}.
  Please make the payment on time. Contact us at {{5}} for any queries.
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Amount `{{3}}`=Due date `{{4}}`=Clinic `{{5}}`=Phone

---

### 11. dental_payment_overdue
- **Category:** UTILITY
- **Trigger:** Cron — daily 11 AM, finds all past-due installments
- **Body:**
  ```
  Hi {{1}}, your installment of {{2}} due on {{3}} is overdue.
  Please contact {{4}} at {{5}} to make the payment at your earliest convenience.
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Amount `{{3}}`=Due date `{{4}}`=Clinic `{{5}}`=Phone

---

## Engagement & Retention Templates

### 12. dental_reactivation
- **Category:** MARKETING
- **Trigger:** Cron — every Monday 6 AM, finds patients with no visit in 6+ months
- **Body:**
  ```
  Hi {{1}}, it has been a while since your last visit to {{2}}.
  Regular dental checkups are important for your oral health.
  Book your appointment today and get back on track with your dental care!
  Call us at {{3}}.
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Clinic `{{3}}`=Phone

---

### 13. dental_feedback_request
- **Category:** UTILITY
- **Trigger:** Cron — daily 7 PM, finds yesterday's completed appointments
- **Body:**
  ```
  Hi {{1}}, thank you for visiting {{2}}.
  We hope your experience was wonderful! We would love to hear your feedback
  to help us serve you better. Your opinion truly matters to us.
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Clinic

---

## Greeting & Festival Templates

### 14. dental_birthday_greeting
- **Category:** MARKETING
- **Trigger:** Cron — daily 8:30 AM, matches patients whose birthday is today
- **Body:**
  ```
  Hi {{1}}, wishing you a very Happy Birthday! May this special day bring
  you lots of joy and smiles. We look forward to keeping your smile healthy
  at {{2}}. Have a wonderful day!
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Clinic

---

### 15. dental_festival_greeting
- **Category:** MARKETING
- **Trigger:** Cron — daily 8 AM, fires for Clinic Events that have no occasion_message set
- **Used for:** Diwali, Holi, Christmas, Eid, Navratri, Ganesh Chaturthi, Onam, Pongal, Ugadi, Raksha Bandhan, Janmashtami, New Year, Valentine's Day, Mother's Day, Father's Day, Easter
- **Setup:** Set once as the default template in Automation → Festival Greeting rule. No per-event config needed.
- **Body:**
  ```
  Hi {{1}}, warm wishes to you and your family on the occasion of {{2}}!
  May this festive season bring happiness and good health.
  With warm regards from the {{3}} team.
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Festival name `{{3}}`=Clinic

---

### 16. dental_national_day_greeting
- **Category:** MARKETING
- **Trigger:** Cron — daily 8 AM, fires for Clinic Events that have occasion_message set + this template selected per event
- **Used for:** Independence Day, Republic Day, Women's Day, Children's Day, Teacher's Day
- **Setup:** In Clinic Events → edit each event → set Occasion Message → select this template
- **Body:**
  ```
  Hi {{1}}, the team at {{2}} wishes you a very Happy {{3}}!
  May this special occasion bring joy, pride, and good health
  to you and your loved ones.
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Clinic `{{3}}`=Occasion label from DB
- **Example occasion labels:** "80th Independence Day 🇮🇳", "77th Republic Day", "International Women's Day"
- **Yearly update needed:** Independence Day and Republic Day only (the number changes)

---

### 17. dental_health_awareness
- **Category:** UTILITY
- **Trigger:** Cron — daily 8 AM, fires for Clinic Events that have occasion_message set + this template selected per event
- **Used for:** World Health Day, World Dentist Day, World Oral Health Day
- **Setup:** In Clinic Events → edit each event → set Occasion Message (e.g. "World Oral Health Day") → select this template
- **Body:**
  ```
  Hi {{1}}, on this {{2}}, {{3}} reminds you that your oral health is our priority.
  Regular dental checkups help prevent issues before they start.
  Book your next visit today!
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Health day name from DB `{{3}}`=Clinic
- **Yearly update:** Not needed — health day names do not change year to year

---

## Campaign Template

### 18. dental_clinic_offer
- **Category:** MARKETING
- **Trigger:** Manual — used only for Campaigns/Broadcasts
- **Body:**
  ```
  Hi {{1}}, here is a special offer from {{2}}. {{3}} Don't miss out — call us or visit us today!
  ```
- **Variables:** `{{1}}`=Patient `{{2}}`=Clinic `{{3}}`=Offer details

---

## Summary Table

| # | Template | Category | Trigger | Timing |
|---|---|---|---|---|
| 1 | dental_appointment_confirmation | UTILITY | New appointment | Instant |
| 2 | dental_appointment_reminder | UTILITY | Cron 7:30 AM | 1 day before |
| 3 | dental_appointment_cancel | UTILITY | Cancelled | Instant |
| 4 | dental_appointment_rescheduled | UTILITY | Rescheduled | Instant |
| 5 | dental_post_treatment_care | UTILITY | Cron 6 PM | Day of completion |
| 6 | dental_noshow_followup | UTILITY | Cron 10:30 AM | Day after no-show |
| 7 | dental_treatment_reminder | UTILITY | Cron every 14 days | Pending treatment |
| 8 | dental_payment_received | UTILITY | Payment recorded | Instant + PDF |
| 9 | dental_invoice_ready | UTILITY | Manual resend | On demand |
| 10 | dental_installment_due | UTILITY | Cron 9:30 AM | 3 days before due |
| 11 | dental_payment_overdue | UTILITY | Cron 11 AM | Daily until paid |
| 12 | dental_reactivation | MARKETING | Cron Monday 6 AM | 6+ months inactive |
| 13 | dental_feedback_request | UTILITY | Cron 7 PM | Day after completion |
| 14 | dental_birthday_greeting | MARKETING | Cron 8:30 AM | Birthday |
| 15 | dental_festival_greeting | MARKETING | Cron 8 AM | Cultural festivals |
| 16 | dental_national_day_greeting | MARKETING | Cron 8 AM | National days |
| 17 | dental_health_awareness | UTILITY | Cron 8 AM | Health awareness days |
| 18 | dental_clinic_offer | MARKETING | Manual campaign | On demand |

---

## Festival Template Decision Guide

```
Clinic Event fires today
        │
        ├── occasion_message set on event?
        │        │
        │       YES → which template is selected on the event?
        │        │
        │        ├── dental_health_awareness
        │        │      {{1}} patient  {{2}} health day name  {{3}} clinic
        │        │      → World Health Day, World Dentist Day, World Oral Health Day
        │        │
        │        └── dental_national_day_greeting
        │               {{1}} patient  {{2}} clinic  {{3}} occasion label
        │               → Independence Day, Republic Day, Women's Day, etc.
        │
        └── NO occasion_message
               → dental_festival_greeting  (set once in Automation rule)
               → {{1}} patient  {{2}} festival name  {{3}} clinic
               → Diwali, Holi, Christmas, Eid, Navratri, Onam, etc.
```

---

## Yearly Staff Checklist (every January)

| Task | Event | What to update |
|---|---|---|
| Update occasion label | Independence Day | "80th" → "81st Independence Day 🇮🇳" |
| Update occasion label | Republic Day | "77th" → "78th Republic Day" |
| Everything else | All other events | Nothing — auto-updated by Jan 1 cron |
