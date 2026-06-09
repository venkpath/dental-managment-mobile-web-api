# AI Patient Insights — How the Scoring Logic Works

> This document explains when each insight category flags a patient, how intervals
> are defined, and how the three categories are cleanly separated by time window.

---

## How Scores Are Computed

Scores are **not computed live on page load**. They are pre-calculated and stored
in the `patient_insight_scores` table. The calculation runs:

- **Automatically** every night at 2:00 AM (nightly cron job)
- **Manually** whenever a user clicks the "Recompute" button on the AI Insights page

Each run fetches the last 20 appointments, last 10 treatments, and last 5 invoices
per patient, then applies the rules below. Results are upserted (insert or update)
so every patient always has one current row.

---

## Category 1 — Likely to Miss Appointment

### When does a patient appear here?

Two conditions must **both** be true:

1. The patient has at least **one upcoming, non-cancelled appointment**
2. Their no-show score is **≥ 35** (Medium or High risk)

### How the score is calculated

| Past behaviour | Points |
|---|---|
| 1 past no-show | +20 |
| 2 past no-shows | +35 |
| 3 or more past no-shows | +50 |
| 3 or more past cancellations | +15 |
| A no-show within the last 90 days | +15 |
| Maximum possible | 100 |

**Risk levels:** Medium = 35–64 · High = 65+

### Examples

| Patient | Past history | Future appointment? | Score | Shown? |
|---|---|---|---|---|
| Ravi | 0 no-shows | Yes | 0 | ❌ No |
| Priya | 1 no-show (8 months ago) | Yes | 20 | ❌ No — below 35 |
| Anand | 2 no-shows | Yes | 35 | ✅ Medium |
| Deepa | 3 no-shows + recent no-show | Yes | 65 | ✅ High |
| Kumar | 5 no-shows, no future appt | No | 0 | ❌ No — no upcoming appointment |

### Key rule

> A patient with **no upcoming appointment** can never appear here, regardless of
> how many times they have skipped in the past. There is nothing to send a reminder
> about.

---

## Category 2 — Due for a Check-up

### When does a patient appear here?

Three conditions must all be true:

1. The patient has at least **one completed treatment** on record
2. The recall due date for their last completed procedure is **within the next 14 days
   or already past**
3. They have **no future appointment** booked

### How the interval is defined — fixed or dynamic?

**The interval itself is fixed.** It is a hardcoded rule in the backend based on
the procedure name. It does not change from day to day.

| Procedure keywords | Recall interval |
|---|---|
| Scaling / cleaning / polishing / prophylaxis | 180 days |
| Filling / composite / amalgam / restoration | 180 days |
| Checkup / examination / review | 180 days |
| Crown / bridge / cap | 90 days |
| Implant | 90 days |
| Orthodontic / aligners / braces / Invisalign | 30 days |
| Extraction / removal | 30 days |
| Root canal / endodontic | 365 days |
| Whitening / bleaching | 365 days |
| Anything else | 180 days (default) |

**What the nightly job actually does** is re-run the same fixed formula with
today's date:

```
due_date  = last_treatment_date + interval_days
days_left = due_date − today
```

So the interval never changes — only today's date advances by one day each night.
A patient who had scaling on 1 Jan will always have a due date of 30 Jun (180 days
later). On 16 Jun they enter the 14-day window and start appearing. On 30 Jun they
are overdue.

### Examples

| Patient | Last treatment | Interval | Completed on | Due date | Today | Shown? |
|---|---|---|---|---|---|---|
| Meena | Scaling | 180d | 1 Jan | 30 Jun | 25 Jun | ✅ Yes — due in 5 days |
| Suresh | Crown | 90d | 1 Apr | 30 Jun | 5 Jul | ✅ Yes — overdue 5 days |
| Lakshmi | Ortho | 30d | 1 Jun | 1 Jul | 6 Jul | ✅ Yes — overdue 5 days |
| Arun | Scaling | 180d | 1 Jan | 30 Jun | 1 Jun | ❌ No — 29 days away, outside 14-day window |
| Nisha | Scaling | 180d | 1 Jan | 30 Jun | 5 Jul | ❌ No — already has a future appt booked |

### Key rules

> 1. Only **completed** treatments drive a recall. A planned, cancelled, or
>    in-progress treatment is ignored — it was never actually performed.
> 2. If the patient has already booked an appointment (for any reason), they
>    disappear from this list automatically on the next compute run.
> 3. The **14-day window** means the system alerts you just before it is due,
>    not only after it has passed.
> 4. The longest recall interval in the system is **365 days** (root canal /
>    whitening). No patient in this category will have been absent for more
>    than roughly 1 year.

---

## Category 3 — Inactive Patients

### When does a patient appear here?

Three conditions must all be true:

1. The patient has at least **one completed appointment** (i.e. they are an
   existing patient, not a new lead)
2. They have **no future appointment** booked
3. Their inactivity score is **≥ 35** (Medium or High)

### How the score is calculated

| Days since last completed visit | Points |
|---|---|
| More than 548 days (≈ 18 months) | +50 |
| More than 730 days (≈ 2 years) | +70 |
| No invoices on record at all | +10 extra |
| Maximum possible | 100 |

**Risk levels:** Medium = 35–64 · High = 65+

### Examples

| Patient | Last completed visit | Invoices? | Future appt? | Score | Shown? |
|---|---|---|---|---|---|
| New patient | Never visited | — | No | 0 | ❌ No — never flags new patients |
| Vijay | 185 days ago | Yes | No | 0 | ❌ No — below threshold |
| Rajesh | 365 days ago | Yes | No | 0 | ❌ No — still within recall range |
| Shalini | 550 days ago | Yes | No | 50 | ✅ Medium |
| Geetha | 550 days ago | No invoices | No | 60 | ✅ Medium |
| Kumar | 735 days ago | Yes | No | 70 | ✅ High |
| Mohan | 800 days ago | Yes | Yes (booked) | 0 | ❌ No — has upcoming appt |

### Key rules

> 1. **Never flags new patients.** A patient who has never had a completed
>    visit is a lead, not an inactive patient.
> 2. The threshold starts at **18 months** — well past the longest recall
>    interval (365 days) — so there is no overlap with Due for a Check-up.
> 3. The right action here is re-engagement (special offer, "we miss you"
>    message), not a routine recall reminder.

---

## How the Three Categories Are Separated by Time

```
Patient's last completed visit (days ago)
─────────────────────────────────────────────────────────────────────►

  0        90       180      270      365      548 (18m)   730 (2y)
  │         │        │        │        │            │           │
  │◄───────────────── Due for a Check-up ──────────►│           │
  │         (procedure interval exceeded, max 365d)  │           │
  │                                                  │           │
  │                                                  │◄── Inactive Patients ──►
  │                                                  (18 months+)
  │
  Likely to Miss Appointment is independent of time —
  it only fires when a FUTURE appointment exists.
```

The two passive categories (Due for Check-up and Inactive) operate in separate
non-overlapping windows. A patient flagged for recall is at most ~1 year absent.
A patient flagged as Inactive has been gone for 18+ months.

**List exclusivity:** If a patient scores medium/high on Inactive (18+ months),
they are excluded from the Due for a Check-up list even if recall_due is still
true in the database. Staff see them in one place only — Inactive wins.

---

## Why Different Actions Matter

| Category | Time away | Staff action | Message tone |
|---|---|---|---|
| Likely to Miss Appointment | Has upcoming appt | Send reminder before the visit | "Don't forget your appointment tomorrow" |
| Due for a Check-up | Up to ~1 year | Book a recall visit | "It's time for your 6-month cleaning" |
| Inactive Patients | 18 months+ | Re-engagement campaign | "We miss you — here's a special offer to come back" |

Separating the thresholds ensures the right message goes to the right patient.
A patient 6 months overdue for scaling does not need a win-back offer.
A patient missing for 2 years should not receive a routine recall reminder.

---

## Summary Table

| Category | Requires future appt? | Requires past visit/treatment? | Disappears when appt is booked? | Time window |
|---|---|---|---|---|
| Likely to Miss Appointment | ✅ Yes — mandatory | No | N/A | Has upcoming appt |
| Due for a Check-up | ❌ No | ✅ Completed treatment | ✅ Yes | Procedure interval exceeded (max ~365d) |
| Inactive Patients | ❌ No | ✅ Completed appointment | ✅ Yes | 18 months+ since last visit |

---

## The Single Rule That Resolves Two Categories

When a patient books an appointment (for any reason), they automatically
disappear from **Due for a Check-up** and **Inactive Patients** on the next
compute run, and they may now appear in **Likely to Miss Appointment** instead
if their no-show history warrants it.

> Booking = the one action that instantly de-risks two of the three categories.
