# Indian Dental Clinic — Complete Patient Workflow

This document describes the end-to-end patient journey in an Indian dental clinic, mapped to the system's modules.

---

## The Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. PATIENT REGISTRATION                                        │
│  Receptionist creates patient record (name, phone, DOB, etc.)   │
│  → Module: Patients                                             │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. APPOINTMENT BOOKING                                         │
│  Receptionist books slot (date, time, dentist)                  │
│  Status: Scheduled                                              │
│  → Module: Appointments                                         │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. PATIENT ARRIVES — EXAMINATION                               │
│  Dentist opens appointment → clicks "Start Treatment"           │
│  Dentist examines patient's teeth                               │
│  Records findings on the interactive Dental Chart               │
│  (e.g., Tooth #36 has cavity, Tooth #37 has decay)              │
│  → Module: Dental Chart (Tooth Conditions)                      │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. TREATMENT PLAN & EXECUTION                                  │
│  Dentist creates Treatment records:                             │
│    • Tooth #36 → Root Canal Treatment → ₹5,000 → Planned       │
│    • Tooth #37 → Composite Filling → ₹1,500 → Planned          │
│                                                                  │
│  Treatment = the CLINICAL PROCEDURE on a tooth                  │
│  - What tooth (FDI number)                                      │
│  - What procedure (RCT, Filling, Crown, etc.)                   │
│  - What diagnosis (why it's needed)                             │
│  - What cost (₹)                                                │
│  - What status (planned → in_progress → completed)              │
│                                                                  │
│  Multi-visit treatments (e.g., RCT = 3 visits):                 │
│    Visit 1: Status → in_progress (pulp cleaning)                │
│    Visit 2: Status → in_progress (canal shaping)                │
│    Visit 3: Status → completed (filling + crown)                │
│  → Module: Treatments                                           │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. PRESCRIPTION (Post-Treatment)                               │
│  Dentist writes medicines for the patient to take home:         │
│    • Amoxicillin 500mg — 1 tablet, 3× daily, 5 days            │
│    • Ibuprofen 400mg — 1 tablet, after meals, 3 days            │
│    • Metronidazole 400mg — 1 tablet, 3× daily, 5 days          │
│                                                                  │
│  Prescription = MEDICINES to take home                          │
│  - NOT a procedure, has no cost on the invoice                  │
│  - Given after treatment or after consultation                  │
│  - Patient buys medicines from a pharmacy                       │
│                                                                  │
│  Can also be standalone (no treatment needed):                  │
│    e.g., Patient has gum infection → antibiotics only           │
│  → Module: Prescriptions                                        │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. INVOICE & PAYMENT                                           │
│  Receptionist creates invoice from completed treatments:        │
│    Line Item 1: Root Canal (Tooth #36) — ₹5,000                │
│    Line Item 2: Composite Filling (#37) — ₹1,500               │
│    ─────────────────────────────────                            │
│    Subtotal:                          ₹6,500                    │
│    Discount:                         -₹500                      │
│    Tax (GST 18%):                    +₹1,080                    │
│      → CGST 9%: ₹540                                           │
│      → SGST 9%: ₹540                                           │
│    ─────────────────────────────────                            │
│    Net Total:                         ₹7,080                    │
│                                                                  │
│  Payment methods: Cash / Card / UPI (Google Pay, PhonePe)       │
│  Partial payments supported (pay ₹4,000 now, rest next visit)   │
│  Invoice auto-marks "Paid" when full amount received            │
│  → Module: Invoices & Payments                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. APPOINTMENT COMPLETION                                      │
│  Dentist/Receptionist marks appointment as "Completed"          │
│  Follow-up appointment booked if needed (multi-visit treatment) │
│  → Module: Appointments                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Treatment vs Prescription

| Aspect | Treatment | Prescription |
|--------|-----------|--------------|
| **What** | Clinical procedure on a tooth | Medicines to take home |
| **Created by** | Dentist | Dentist |
| **When** | During/after examination | After treatment or standalone |
| **Has cost?** | Yes (₹) — billed on invoice | No — patient buys from pharmacy |
| **Linked to** | Patient + Tooth + Invoice | Patient only |
| **Example** | "Root Canal on #36 — ₹5,000" | "Amoxicillin 500mg, 3× daily, 5 days" |
| **Status tracking** | planned → in_progress → completed | Created once (no status changes) |

---

## Common Scenarios

### Scenario 1: Simple Filling
```
Appointment → Examine → Treatment (Filling, completed same day) → Prescription (painkillers) → Invoice → Payment → Done
```

### Scenario 2: Root Canal (Multi-Visit)
```
Visit 1: Appointment → Treatment (RCT, in_progress) → Prescription (antibiotics) → Partial Invoice
Visit 2: Appointment → Treatment (RCT, in_progress) → No prescription
Visit 3: Appointment → Treatment (RCT + Crown, completed) → Invoice (remaining) → Payment → Done
```

### Scenario 3: Consultation Only
```
Appointment → Examine (dental chart) → Prescription (antibiotics for infection) → No invoice (or consultation fee) → Done
```

### Scenario 4: Scaling + Polishing (No specific tooth)
```
Appointment → Treatment (Scaling, no tooth_number, completed) → No prescription → Invoice → Payment → Done
```

---

## System Navigation Flow (Current)

```
Appointment Detail Page
├── [Mark Completed] [No Show] [Cancel]          ← Status actions
├── [Start Treatment]                             ← Opens treatment form (patient + dentist pre-filled)
├── [Write Prescription]                          ← Opens prescription form (patient + dentist pre-filled)
└── [View Patient]                                ← Opens patient profile

Patient Profile (Tabbed)
├── Appointments tab                              ← Click → appointment detail
├── Treatments tab                                ← View treatments for this patient
├── Prescriptions tab
│   └── [New Prescription]                        ← Opens prescription form (patient pre-filled)
└── Dental Chart tab
    ├── Click tooth → Side panel opens
    │   ├── [Add Condition]                       ← Record finding
    │   └── [Add Treatment for Tooth #X]          ← Opens treatment form (patient + tooth pre-filled)
    └── [Open Full Chart]                         ← Fullscreen dental chart

Treatment Form
├── Patient, Dentist, Branch selects
├── Interactive Dental Chart for tooth selection   ← Click tooth on chart (or use dropdown)
├── Procedure, Diagnosis, Cost, Status
└── [Create] → redirects back
```

---

## India-Specific Details

- **GST**: 18% split as CGST 9% + SGST 9% (intra-state). Inter-state: IGST 18%.
- **GSTIN**: 15-character alphanumeric (clinic's GST registration number).
- **FDI Tooth Numbering**: International standard used in India (not Palmer/Universal).
- **Payment Methods**: Cash, Card (Visa/Mastercard/RuPay), UPI (Google Pay, PhonePe, Paytm).
- **Blood Groups**: A+, A−, B+, B−, AB+, AB−, O+, O− (tracked for surgical procedures).
- **Phone**: +91 followed by 10 digits.
- **Currency**: ₹ (Indian Rupee), formatted as ₹1,00,000 (lakh system).
