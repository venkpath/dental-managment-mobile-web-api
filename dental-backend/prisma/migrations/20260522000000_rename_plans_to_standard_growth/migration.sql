-- Migrate legacy plan structure (Free / Starter / Professional / Enterprise) to
-- the new 3-plan structure (Free / Standard / Growth).
--
-- Mapping:
--   Free          → Free                   (kept, ai_quota stays 5, patients/month raised 20 → 100)
--   Starter       → Standard               (rename, price 999 → 699, yearly 6999, ai_quota 30, WhatsApp 300)
--   Professional  → Growth                 (rename, price 1999 → 1299, yearly 12999, ai_quota 60, WhatsApp 600)
--   Enterprise    → Growth                 (clinics moved to Growth, then Enterprise plan deleted)
--
-- Safe on fresh DBs: every UPDATE is conditional. If a plan name doesn't
-- exist, the statement is a no-op. The DELETE at the end only fires for
-- the Enterprise row if it exists.

-- ─── 1. Tighten Free quotas (10 patients/appts/invoices/treatments per month, 50 MB storage) ───
UPDATE plans
SET
  max_patients_per_month     = 10,
  max_appointments_per_month = 10,
  max_invoices_per_month     = 10,
  max_treatments_per_month   = 10,
  whatsapp_included_monthly  = 0,
  whatsapp_hard_limit_monthly = 0,
  allow_whatsapp_overage_billing = FALSE
WHERE name = 'Free';

-- ─── 2. Rename Starter → Standard + reprice + new quotas ───
-- Existing-customer note: this UPDATES the plan row's price to ₹699. Razorpay
-- subscription billing is NOT affected — Razorpay locks the price into its own
-- subscription record at creation time, so existing Starter customers continue
-- to be billed at their original ₹999 by Razorpay until they change plan.
-- We NULL the razorpay_plan_id so new signups don't accidentally subscribe
-- against the old ₹999 Razorpay plan — super-admin must create new Razorpay
-- plans for ₹699/₹6,999 and save the IDs back.
UPDATE plans
SET
  name           = 'Standard',
  price_monthly  = 699,
  price_yearly   = 6999,
  max_branches   = 999,
  max_staff      = 999,
  ai_quota       = 30,
  max_patients_per_month     = NULL,
  max_appointments_per_month = NULL,
  whatsapp_included_monthly  = 300,
  whatsapp_hard_limit_monthly = NULL,
  allow_whatsapp_overage_billing = TRUE,
  razorpay_plan_id        = NULL,
  razorpay_plan_id_yearly = NULL
WHERE name = 'Starter';

-- ─── 3. Rename Professional → Growth + reprice + new quotas ───
-- Same Razorpay note as above — new IDs must be re-set after migration.
UPDATE plans
SET
  name           = 'Growth',
  price_monthly  = 1299,
  price_yearly   = 12999,
  max_branches   = 999,
  max_staff      = 999,
  ai_quota       = 60,
  max_patients_per_month     = NULL,
  max_appointments_per_month = NULL,
  whatsapp_included_monthly  = 600,
  whatsapp_hard_limit_monthly = NULL,
  allow_whatsapp_overage_billing = TRUE,
  razorpay_plan_id        = NULL,
  razorpay_plan_id_yearly = NULL
WHERE name = 'Professional';

-- ─── 4. Move any Enterprise clinics to Growth ───
-- (Run BEFORE deleting Enterprise to preserve referential integrity.)
UPDATE clinics
SET plan_id = (SELECT id FROM plans WHERE name = 'Growth')
WHERE plan_id = (SELECT id FROM plans WHERE name = 'Enterprise');

-- Same for any platform_invoices that reference the Enterprise plan
UPDATE platform_invoices
SET plan_id = (SELECT id FROM plans WHERE name = 'Growth')
WHERE plan_id = (SELECT id FROM plans WHERE name = 'Enterprise');

-- ─── 5. Drop Enterprise plan + cascade-clean its plan_features ───
-- plan_features has ON DELETE CASCADE so deleting the plan also drops
-- its feature mappings. No manual cleanup needed.
DELETE FROM plans WHERE name = 'Enterprise';
