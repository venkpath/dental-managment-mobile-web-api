-- Insert system WhatsApp template for treatment plan reminders.
-- Template body uses {{1}} = patient first name, {{2}} = clinic name.
-- whatsapp_template_status is set to 'approved' — submit the template name
-- 'dental_treatment_plan_reminder' to Meta and update this row if not yet approved.
INSERT INTO "message_templates" (
  "id", "clinic_id", "channel", "category", "template_name",
  "subject", "body", "variables", "language",
  "is_active", "whatsapp_template_status",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  NULL,
  'whatsapp',
  'reminder',
  'dental_treatment_plan_reminder',
  'Treatment Plan Reminder',
  'Hi {{1}}, you have an incomplete treatment plan at {{2}}. Please book your next visit to continue your care.',
  '["patient_first_name", "clinic_name"]'::jsonb,
  'en',
  true,
  'approved',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "message_templates"
  WHERE "template_name" = 'dental_treatment_plan_reminder' AND "clinic_id" IS NULL
);

-- Back-fill template_id on all existing clinic automation rules and disable them.
-- Clinics onboarded before this migration had treatment_plan_reminder seeded with
-- template_id = NULL because the system template did not exist at seed time.
-- is_enabled is set to false because the WhatsApp template must be Meta-approved first.
UPDATE "automation_rules" ar
SET "template_id"  = mt."id",
    "channel"      = 'whatsapp',
    "is_enabled"   = false
FROM "message_templates" mt
WHERE mt."template_name" = 'dental_treatment_plan_reminder'
  AND mt."clinic_id"     IS NULL
  AND ar."rule_type"     = 'treatment_plan_reminder';
