-- Per-branch custom prescription notepad template.
-- When `prescription_template_enabled` is false (the default), prescription PDFs
-- render with the existing Smart Dental Desk default layout. When true, the
-- generator overlays text onto the uploaded notepad image at the zone
-- coordinates stored in `prescription_template_config`.
--
-- `prescription_template_url`    — relative path to the uploaded notepad image
--                                   (uploads/prescription-templates/{branchId}/...)
-- `prescription_template_config` — JSON: { version, image:{width_px,height_px},
--                                  page_size, zones:{name,age,gender,date,
--                                  mobile,patient_id,body,signature?} }
ALTER TABLE "branches"
  ADD COLUMN "prescription_template_url"      VARCHAR(500),
  ADD COLUMN "prescription_template_config"   JSONB,
  ADD COLUMN "prescription_template_enabled"  BOOLEAN NOT NULL DEFAULT false;
