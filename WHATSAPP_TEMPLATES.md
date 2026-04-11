# WhatsApp Meta Templates — Smart Dental Desk

All templates are submitted to Meta for approval before use.  
**UTILITY** templates are approved within minutes. **MARKETING** templates may take up to 24 hours.

---

## 1. dental_appointment_confirmation
- **Category:** UTILITY
- **Trigger:** Automatically when staff books a new appointment
- **Timing:** Instant
- **Header:** Appointment Confirmed
- **Body:**
  ```
  Hi {{1}}, your appointment at {{2}} is confirmed for {{3}} at {{4}} with {{5}}.
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Clinic name |
  | {{3}} | Appointment date |
  | {{4}} | Appointment time |
  | {{5}} | Dentist name |

---

## 2. dental_appointment_reminder
- **Category:** UTILITY
- **Trigger:** Cron job — runs daily, finds appointments 24 hrs away
- **Timing:** 24 hours before appointment
- **Header:** Appointment Reminder
- **Body:**
  ```
  Hi {{1}}, this is a reminder for your appointment at {{2}} tomorrow on {{3}} at {{4}} with {{5}}. Please arrive 5 minutes early.
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Clinic name |
  | {{3}} | Appointment date |
  | {{4}} | Appointment time |
  | {{5}} | Dentist name |

---

## 3. dental_appointment_cancel
- **Category:** UTILITY
- **Trigger:** Automatically when staff cancels an appointment
- **Timing:** Instant
- **Header:** Appointment Cancelled
- **Body:**
  ```
  Hi {{1}}, your appointment at {{2}} scheduled for {{3}} at {{4}} has been cancelled. Please call us to reschedule at your convenience.
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Clinic name |
  | {{3}} | Appointment date |
  | {{4}} | Appointment time |

---

## 4. dental_appointment_rescheduled
- **Category:** UTILITY
- **Trigger:** Automatically when staff reschedules an appointment (date/time changes)
- **Timing:** Instant
- **Header:** Appointment Rescheduled
- **Body:**
  ```
  Hi {{1}}, your appointment at {{2}} has been rescheduled to {{3}} at {{4}} with {{5}}. See you then!
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Clinic name |
  | {{3}} | New appointment date |
  | {{4}} | New appointment time |
  | {{5}} | Dentist name |

---

## 5. dental_post_treatment_care
- **Category:** UTILITY
- **Trigger:** Automatically when appointment is marked as Completed
- **Timing:** 1 hour after completion
- **Header:** Post Treatment Care
- **Body:**
  ```
  Hi {{1}}, thank you for visiting {{2}} today. Please follow the care instructions provided by {{3}}. Rest well and avoid hard foods for 24 hours. Contact us if you experience any discomfort.
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Clinic name |
  | {{3}} | Dentist name |

---

## 6. dental_installment_due
- **Category:** UTILITY
- **Trigger:** Cron job — runs daily, finds installments due in 3 days
- **Timing:** 3 days before installment due date
- **Header:** Installment Due Reminder
- **Body:**
  ```
  Hi {{1}}, your installment payment of {{2}} for invoice {{3}} at {{4}} is due on {{5}}. Please make the payment on time to avoid any inconvenience.
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Installment amount |
  | {{3}} | Invoice number |
  | {{4}} | Clinic name |
  | {{5}} | Due date |

---

## 7. dental_payment_overdue
- **Category:** UTILITY
- **Trigger:** Cron job — runs daily at 11 AM, finds all past-due installments
- **Timing:** Daily until payment is made
- **Header:** Payment Overdue
- **Body:**
  ```
  Hi {{1}}, your payment of {{2}} for invoice {{3}} at {{4}} was due on {{5}}. Please make the payment at your earliest convenience to avoid further delays.
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Overdue amount |
  | {{3}} | Invoice number |
  | {{4}} | Clinic name |
  | {{5}} | Original due date |

---

## 8. dental_payment_received
- **Category:** UTILITY
- **Trigger:** Automatically when staff records a payment on an invoice
- **Timing:** Instant — includes PDF receipt link
- **Header:** Payment Received
- **Body:**
  ```
  Hi {{1}},

  We have received your payment of {{2}} for invoice {{3}} at {{4}}.

  Your receipt is ready. View & download:
  {{5}}

  Please call us {{6}} for any queries.
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Amount paid (e.g. Rs.1000) |
  | {{3}} | Invoice number |
  | {{4}} | Clinic name |
  | {{5}} | Receipt PDF link (S3 redirect URL) |
  | {{6}} | Clinic phone number |

---

## 9. dental_invoice_ready
- **Category:** UTILITY
- **Trigger:** Manual — staff clicks "Send via WhatsApp" on the invoice page
- **Timing:** On demand (resend option)
- **Header:** Invoice Ready
- **Body:**
  ```
  Hello {{1}}, your payment receipt has been generated at {{2}}. Invoice No: {{3}}, Amount: {{4}}. View & Download: {{5}}. For queries reach us at {{6}}.
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient full name |
  | {{2}} | Clinic name |
  | {{3}} | Invoice number |
  | {{4}} | Net amount |
  | {{5}} | Invoice PDF link |
  | {{6}} | Clinic phone |

---

## 10. dental_birthday_greeting
- **Category:** MARKETING
- **Trigger:** Cron job — runs daily at 8:30 AM, matches patients whose birthday is today
- **Timing:** Morning of patient's birthday
- **Header:** Happy Birthday!
- **Body:**
  ```
  Hi {{1}}, wishing you a very Happy Birthday! May this special day bring you lots of joy and smiles. We look forward to keeping your smile healthy at {{2}}. Have a wonderful day!
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Clinic name |

---

## 11. dental_festival_greeting
- **Category:** MARKETING
- **Trigger:** Cron job — runs daily at 8 AM, matched against Clinic Events you create in the system
- **Timing:** Day of the festival (you must create the event in Clinic Events)
- **Header:** Season's Greetings!
- **Body:**
  ```
  Hi {{1}}, warm wishes to you and your family on the occasion of {{2}}! May this festive season bring happiness and good health. With warm regards from the {{3}} team.
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Festival name (from Clinic Event) |
  | {{3}} | Clinic name |
- **Note:** You must add festival dates under **Communication → Clinic Events** for this to fire.

---

## 12. dental_noshow_followup
- **Category:** UTILITY
- **Trigger:** Automatically when appointment is marked as No Show
- **Timing:** 1 hour after no-show status is set
- **Header:** We Missed You Today
- **Body:**
  ```
  Hi {{1}}, we noticed you missed your appointment at {{2}} today. We understand things come up. Please call us to reschedule at your convenience. We are here to help!
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Clinic name |

---

## 13. dental_reactivation
- **Category:** MARKETING
- **Trigger:** Cron job — runs every 7 days, finds patients with no visit in 6+ months
- **Timing:** Every week for dormant patients
- **Header:** We Miss Your Smile!
- **Body:**
  ```
  Hi {{1}}, it has been a while since your last visit to {{2}}. Regular dental checkups are important for your oral health. Book your appointment today and get back on track with your dental care!
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Clinic name |

---

## 14. dental_treatment_reminder
- **Category:** UTILITY
- **Trigger:** Cron job — runs every 14 days, finds patients with incomplete treatment plans
- **Timing:** Every 2 weeks for patients with pending treatment steps
- **Header:** Treatment Plan Reminder
- **Body:**
  ```
  Hi {{1}}, this is a gentle reminder that you have pending steps in your treatment plan at {{2}}. Completing your treatment on time ensures the best results for your dental health. Please call us to schedule your next visit.
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Clinic name |

---

## 15. dental_feedback_request
- **Category:** UTILITY
- **Trigger:** Automatically when appointment is marked as Completed
- **Timing:** 4 hours after completion
- **Header:** Share Your Experience
- **Body:**
  ```
  Hi {{1}}, thank you for visiting {{2}}. We hope your experience was wonderful! We would love to hear your feedback to help us serve you better. Your opinion truly matters to us.
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Clinic name |

---

## 16. dental_clinic_offer
- **Category:** MARKETING
- **Trigger:** Manual — used only when creating a Campaign or Broadcast
- **Timing:** Staff triggers manually from Communication → Campaigns
- **Header:** Special Offer for You!
- **Body:**
  ```
  Hi {{1}}, here is a special offer from {{2}}. {{3}} Don't miss out — call us or visit us today!
  ```
- **Footer:** SmartDentalDesk
- **Variables:**
  | # | Value |
  |---|---|
  | {{1}} | Patient first name |
  | {{2}} | Clinic name |
  | {{3}} | Offer details |

---

## Summary Table

| # | Template | Category | Trigger | Timing |
|---|---|---|---|---|
| 1 | dental_appointment_confirmation | UTILITY | New appointment booked | Instant |
| 2 | dental_appointment_reminder | UTILITY | Cron | 24 hrs before |
| 3 | dental_appointment_cancel | UTILITY | Appointment cancelled | Instant |
| 4 | dental_appointment_rescheduled | UTILITY | Appointment rescheduled | Instant |
| 5 | dental_post_treatment_care | UTILITY | Marked Completed | 1 hr after |
| 6 | dental_installment_due | UTILITY | Cron | 3 days before due |
| 7 | dental_payment_overdue | UTILITY | Cron daily 11 AM | Past due date |
| 8 | dental_payment_received | UTILITY | Payment recorded | Instant + PDF |
| 9 | dental_invoice_ready | UTILITY | Manual resend | On demand |
| 10 | dental_birthday_greeting | MARKETING | Cron daily 8:30 AM | Birthday |
| 11 | dental_festival_greeting | MARKETING | Cron daily 8 AM | Festival day |
| 12 | dental_noshow_followup | UTILITY | Marked No Show | 1 hr after |
| 13 | dental_reactivation | MARKETING | Cron every 7 days | 6+ months inactive |
| 14 | dental_treatment_reminder | UTILITY | Cron every 14 days | Pending treatment |
| 15 | dental_feedback_request | UTILITY | Marked Completed | 4 hrs after |
| 16 | dental_clinic_offer | MARKETING | Manual campaign | On demand |
